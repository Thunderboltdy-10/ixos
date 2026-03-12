#include "data/ResumptionEngine.h"

#include <QDateTime>
#include <QDir>
#include <QFileInfo>
#include <QHash>
#include <QSet>

#include <algorithm>
#include <cmath>

#include "data/ActivityTracker.h"
#include "data/PersonalRanker.h"
#include "data/SessionState.h"
#include "data/WorkstreamManager.h"

namespace Ixplorer {

namespace {

constexpr qint64 kRecencyTauMs = 60LL * 60LL * 1000LL;
constexpr qint64 kLookbackMs = 7LL * 24LL * 60LL * 60LL * 1000LL;

struct CandidateAggregate {
    QString path;
    qint64 lastTouched = 0;
    int openCount = 0;
    QVector<int> hourHistogram = QVector<int>(24, 0);
    QString lastQuery;
    QString workstreamId;
};

float expDecay(qint64 ageMs, qint64 tauMs) {
    if (ageMs <= 0) {
        return 1.0f;
    }
    return static_cast<float>(std::exp(-static_cast<double>(ageMs) / static_cast<double>(tauMs)));
}

bool tabSetContainsPath(const QVector<TabState> &tabs, const QString &path) {
    return std::any_of(tabs.cbegin(), tabs.cend(), [&path](const TabState &tab) {
        return tab.path == path;
    });
}

QString summarizeReason(const ResumptionCandidate &candidate) {
    QStringList reasons;
    if (candidate.unfinishedness >= 0.99f) {
        reasons.append(QStringLiteral("left open last session"));
    } else if (candidate.recency > 0.65f) {
        reasons.append(QStringLiteral("recently active"));
    }
    if (candidate.frequency > 0.5f) {
        reasons.append(QStringLiteral("frequently used"));
    }
    if (candidate.personalBoost > 0.5f) {
        reasons.append(QStringLiteral("personally important"));
    }
    if (candidate.interruption > 0.5f) {
        reasons.append(QStringLiteral("previous session ended abruptly"));
    }
    return reasons.isEmpty() ? QStringLiteral("best recent context match") : reasons.join(QStringLiteral(", "));
}

} // namespace

ResumptionEngine::ResumptionEngine(QObject *parent)
    : QObject(parent) {
}

void ResumptionEngine::setActivityTracker(ActivityTracker *tracker) {
    m_activityTracker = tracker;
}

void ResumptionEngine::setSessionStateStore(SessionStateStore *sessionStateStore) {
    m_sessionStateStore = sessionStateStore;
}

void ResumptionEngine::setPersonalRanker(PersonalRanker *personalRanker) {
    m_personalRanker = personalRanker;
}

void ResumptionEngine::setWorkstreamManager(WorkstreamManager *workstreamManager) {
    m_workstreamManager = workstreamManager;
}

QVector<ResumptionCandidate> ResumptionEngine::rankCandidates(int limit, const QString &preferredWorkstreamId) const {
    if (m_activityTracker == nullptr) {
        return {};
    }

    const qint64 now = QDateTime::currentMSecsSinceEpoch();
    const qint64 cutoff = now - kLookbackMs;
    const SessionStateSnapshot snapshot = m_sessionStateStore == nullptr
        ? SessionStateSnapshot()
        : m_sessionStateStore->load();

    QHash<QString, CandidateAggregate> aggregates;
    for (const ActivityEvent &event : m_activityTracker->events()) {
        if (event.filePath.isEmpty() || event.timestamp < cutoff) {
            continue;
        }

        CandidateAggregate &aggregate = aggregates[event.filePath];
        aggregate.path = event.filePath;
        aggregate.lastTouched = qMax(aggregate.lastTouched, event.timestamp);
        aggregate.openCount += 1;
        aggregate.hourHistogram[event.timestamp > 0 ? QDateTime::fromMSecsSinceEpoch(event.timestamp).time().hour() : 0] += 1;
        if (!event.metadata.value(QStringLiteral("query")).toString().isEmpty()) {
            aggregate.lastQuery = event.metadata.value(QStringLiteral("query")).toString();
        } else if (!event.metadata.value(QStringLiteral("query_context")).toString().isEmpty()) {
            aggregate.lastQuery = event.metadata.value(QStringLiteral("query_context")).toString();
        }
        if (!event.workstreamId.isEmpty()) {
            aggregate.workstreamId = event.workstreamId;
        }
    }

    QVector<ResumptionCandidate> candidates;
    candidates.reserve(aggregates.size());

    const int currentHour = QDateTime::currentDateTime().time().hour();
    for (auto it = aggregates.cbegin(); it != aggregates.cend(); ++it) {
        const CandidateAggregate &aggregate = it.value();
        if (!preferredWorkstreamId.isEmpty() &&
            !aggregate.workstreamId.isEmpty() &&
            aggregate.workstreamId != preferredWorkstreamId) {
            continue;
        }

        const bool openAtEnd = tabSetContainsPath(snapshot.tabs, aggregate.path) ||
            (!snapshot.activeWorkstreamId.isEmpty() &&
             tabSetContainsPath(snapshot.workstreamStates.value(snapshot.activeWorkstreamId).tabs, aggregate.path));
        const bool recentlySaved = snapshot.lastSaveTimestamp > 0 &&
            (snapshot.lastSaveTimestamp - aggregate.lastTouched) <= 10000 &&
            snapshot.lastSaveTimestamp >= aggregate.lastTouched;

        const QVector<QPair<QString, int>> coOccurrences = m_activityTracker->getCoOccurrences(aggregate.path, 30);
        const int strongestCoOccurrence = coOccurrences.isEmpty() ? 0 : coOccurrences.first().second;
        const int maxHistogram = *std::max_element(aggregate.hourHistogram.cbegin(), aggregate.hourHistogram.cend());

        ResumptionCandidate candidate;
        candidate.path = aggregate.path;
        candidate.recency = expDecay(now - aggregate.lastTouched, kRecencyTauMs);
        candidate.unfinishedness = openAtEnd ? 1.0f : (recentlySaved ? 0.5f : 0.0f);
        candidate.frequency = std::min(1.0f, static_cast<float>(aggregate.openCount) / 10.0f);
        candidate.interruption = snapshot.hasCleanExit ? 0.0f : 1.0f;
        candidate.temporalRegularity = maxHistogram > 0
            ? static_cast<float>(aggregate.hourHistogram[currentHour]) / static_cast<float>(maxHistogram)
            : 0.0f;
        candidate.coOccurrence = std::min(1.0f, static_cast<float>(strongestCoOccurrence) / 10.0f);
        candidate.personalBoost = m_personalRanker == nullptr
            ? 0.0f
            : std::min(1.0f, m_personalRanker->getBoost(aggregate.path) / 0.15f);
        candidate.lastQuery = aggregate.lastQuery;
        candidate.workstreamId = aggregate.workstreamId.isEmpty()
            ? snapshot.activeWorkstreamId
            : aggregate.workstreamId;

        candidate.score =
            0.30f * candidate.recency +
            0.20f * candidate.unfinishedness +
            0.15f * candidate.frequency +
            0.10f * candidate.interruption +
            0.10f * candidate.temporalRegularity +
            0.10f * candidate.coOccurrence +
            0.05f * candidate.personalBoost;
        candidate.reason = summarizeReason(candidate);
        candidates.append(candidate);
    }

    std::sort(candidates.begin(), candidates.end(), [](const ResumptionCandidate &lhs, const ResumptionCandidate &rhs) {
        if (lhs.score == rhs.score) {
            return lhs.path < rhs.path;
        }
        return lhs.score > rhs.score;
    });

    if (limit > 0 && candidates.size() > limit) {
        candidates.resize(limit);
    }
    return candidates;
}

ResumptionPacket ResumptionEngine::buildPacket(const QString &preferredWorkstreamId) const {
    ResumptionPacket packet;
    const QVector<ResumptionCandidate> ranked = rankCandidates(5, preferredWorkstreamId);
    if (ranked.isEmpty()) {
        return packet;
    }

    const ResumptionCandidate &primary = ranked.first();
    packet.primaryPath = primary.path;
    packet.lastQuery = primary.lastQuery;
    packet.workstreamId = primary.workstreamId.isEmpty() && m_workstreamManager != nullptr
        ? m_workstreamManager->currentWorkstreamId()
        : primary.workstreamId;
    packet.confidence = primary.score;
    packet.reason = primary.reason;

    const qint64 now = QDateTime::currentMSecsSinceEpoch();
    QSet<QString> supporting;
    const QVector<QPair<QString, int>> coOccurrences = m_activityTracker == nullptr
        ? QVector<QPair<QString, int>>()
        : m_activityTracker->getCoOccurrences(primary.path, 30);
    for (const auto &pair : coOccurrences) {
        if (pair.first.isEmpty() || pair.first == primary.path) {
            continue;
        }
        const float recency = expDecay(now - QFileInfo(pair.first).lastModified().toMSecsSinceEpoch(), kRecencyTauMs);
        if (pair.second <= 0 || recency <= 0.0f) {
            continue;
        }
        if (supporting.contains(pair.first)) {
            continue;
        }
        supporting.insert(pair.first);
        packet.supportingPaths.append(pair.first);
        if (packet.supportingPaths.size() >= 5) {
            break;
        }
    }

    return packet;
}

} // namespace Ixplorer
