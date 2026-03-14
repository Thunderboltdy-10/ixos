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
constexpr qint64 kShortWindowMs = 90LL * 60LL * 1000LL;
constexpr qint64 kMediumWindowMs = 4LL * 24LL * 60LL * 60LL * 1000LL;
constexpr qint64 kLongWindowMs = 28LL * 24LL * 60LL * 60LL * 1000LL;
constexpr qint64 kLookbackMs = 35LL * 24LL * 60LL * 60LL * 1000LL;

struct CandidateAggregate {
    QString path;
    qint64 lastTouched = 0;
    qint64 firstTouched = 0;
    int openCount = 0;
    float shortMass = 0.0f;
    float mediumMass = 0.0f;
    float longMass = 0.0f;
    QVector<int> hourHistogram = QVector<int>(24, 0);
    QString lastQuery;
    QString workstreamId;
    QStringList actionTrail;
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
    if (candidate.shortTerm > 0.55f) {
        reasons.append(QStringLiteral("strong short-term continuity"));
    } else if (candidate.mediumTerm > 0.55f) {
        reasons.append(QStringLiteral("active over the last days"));
    } else if (candidate.longTerm > 0.55f) {
        reasons.append(QStringLiteral("long-term habit"));
    }
    if (candidate.unfinishedness >= 0.99f) {
        reasons.append(QStringLiteral("left open in session state"));
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
    if (candidate.coOccurrence > 0.45f) {
        reasons.append(QStringLiteral("shares strong context with adjacent files"));
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
        aggregate.firstTouched = aggregate.firstTouched == 0 ? event.timestamp : qMin(aggregate.firstTouched, event.timestamp);
        aggregate.lastTouched = qMax(aggregate.lastTouched, event.timestamp);
        aggregate.openCount += 1;
        if (now - event.timestamp <= kShortWindowMs) {
            aggregate.shortMass += expDecay(now - event.timestamp, 20LL * 60LL * 1000LL);
        }
        if (now - event.timestamp <= kMediumWindowMs) {
            aggregate.mediumMass += expDecay(now - event.timestamp, 20LL * 60LL * 60LL * 1000LL);
        }
        if (now - event.timestamp <= kLongWindowMs) {
            aggregate.longMass += expDecay(now - event.timestamp, 5LL * 24LL * 60LL * 60LL * 1000LL);
        }
        aggregate.hourHistogram[event.timestamp > 0 ? QDateTime::fromMSecsSinceEpoch(event.timestamp).time().hour() : 0] += 1;
        if (!event.metadata.value(QStringLiteral("query")).toString().isEmpty()) {
            aggregate.lastQuery = event.metadata.value(QStringLiteral("query")).toString();
        } else if (!event.metadata.value(QStringLiteral("query_context")).toString().isEmpty()) {
            aggregate.lastQuery = event.metadata.value(QStringLiteral("query_context")).toString();
        }
        if (!event.workstreamId.isEmpty()) {
            aggregate.workstreamId = event.workstreamId;
        }
        switch (event.action) {
        case ActivityAction::FileOpened:
            aggregate.actionTrail.append(QStringLiteral("opened"));
            break;
        case ActivityAction::ResultClicked:
            aggregate.actionTrail.append(QStringLiteral("opened from search"));
            break;
        case ActivityAction::FilePinned:
            aggregate.actionTrail.append(QStringLiteral("pinned"));
            break;
        case ActivityAction::TabSwitched:
            aggregate.actionTrail.append(QStringLiteral("returned"));
            break;
        default:
            break;
        }
    }

    QVector<ResumptionCandidate> candidates;
    candidates.reserve(aggregates.size());

    const int currentHour = QDateTime::currentDateTime().time().hour();
    for (auto it = aggregates.cbegin(); it != aggregates.cend(); ++it) {
        const CandidateAggregate &aggregate = it.value();
        const bool openAtEnd = tabSetContainsPath(snapshot.tabs, aggregate.path) ||
            (!snapshot.activeWorkstreamId.isEmpty() &&
             tabSetContainsPath(snapshot.workstreamStates.value(snapshot.activeWorkstreamId).tabs, aggregate.path));
        const bool recentlySaved = snapshot.lastSaveTimestamp > 0 &&
            (snapshot.lastSaveTimestamp - aggregate.lastTouched) <= 10000 &&
            snapshot.lastSaveTimestamp >= aggregate.lastTouched;

        const QVector<QPair<QString, int>> coOccurrences = m_activityTracker->getCoOccurrences(aggregate.path, 45);
        const int strongestCoOccurrence = coOccurrences.isEmpty() ? 0 : coOccurrences.first().second;
        const int maxHistogram = *std::max_element(aggregate.hourHistogram.cbegin(), aggregate.hourHistogram.cend());

        ResumptionCandidate candidate;
        candidate.path = aggregate.path;
        const qint64 tenureMs = qMax<qint64>(0, aggregate.lastTouched - aggregate.firstTouched);
        const float habitSpan = std::clamp(
            static_cast<float>(tenureMs) / static_cast<float>(7LL * 24LL * 60LL * 60LL * 1000LL),
            0.0f,
            1.0f);
        candidate.shortTerm = std::clamp(aggregate.shortMass / 6.0f, 0.0f, 1.0f);
        candidate.mediumTerm = std::clamp(aggregate.mediumMass / 8.0f, 0.0f, 1.0f);
        candidate.longTerm = std::clamp(0.8f * (aggregate.longMass / 10.0f) + 0.2f * habitSpan, 0.0f, 1.0f);
        candidate.recency = expDecay(now - aggregate.lastTouched, kRecencyTauMs);
        candidate.unfinishedness = openAtEnd ? 1.0f : (recentlySaved ? 0.5f : 0.0f);
        candidate.frequency = std::min(1.0f, static_cast<float>(aggregate.openCount) / 14.0f);
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
            0.25f * candidate.shortTerm +
            0.18f * candidate.mediumTerm +
            0.12f * candidate.longTerm +
            0.16f * candidate.unfinishedness +
            0.10f * candidate.frequency +
            0.08f * candidate.interruption +
            0.05f * candidate.temporalRegularity +
            0.04f * candidate.coOccurrence +
            0.02f * candidate.personalBoost;
        if (!preferredWorkstreamId.isEmpty() &&
            !candidate.workstreamId.isEmpty() &&
            candidate.workstreamId == preferredWorkstreamId) {
            candidate.score = std::clamp(candidate.score + 0.06f, 0.0f, 1.0f);
        }
        candidate.score = std::clamp(candidate.score, 0.0f, 1.0f);
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
    const QVector<ResumptionCandidate> ranked = rankCandidates(7, preferredWorkstreamId);
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
    packet.groupingEvidence.append(QStringLiteral("Primary chosen by multi-timescale score (%1)")
                                       .arg(QString::number(primary.score, 'f', 2)));
    packet.groupingEvidence.append(QStringLiteral("Short/Medium/Long = %1/%2/%3")
                                       .arg(QString::number(primary.shortTerm, 'f', 2),
                                            QString::number(primary.mediumTerm, 'f', 2),
                                            QString::number(primary.longTerm, 'f', 2)));

    const qint64 now = QDateTime::currentMSecsSinceEpoch();
    QSet<QString> supporting;
    if (m_workstreamManager != nullptr) {
        const QVector<RelationshipSignal> related = m_workstreamManager->relatedForPath(primary.path, 8, packet.workstreamId);
        for (const RelationshipSignal &signal : related) {
            if (signal.path.isEmpty() || signal.path == primary.path) {
                continue;
            }
            if (supporting.contains(signal.path)) {
                continue;
            }
            supporting.insert(signal.path);
            packet.supportingPaths.append(signal.path);
            packet.groupingEvidence.append(QStringLiteral("%1 (%2)")
                                               .arg(QFileInfo(signal.path).fileName(), signal.reason));
            if (packet.supportingPaths.size() >= 5) {
                break;
            }
        }
    }

    if (packet.supportingPaths.isEmpty() && m_activityTracker != nullptr) {
        const QVector<QPair<QString, int>> coOccurrences = m_activityTracker->getCoOccurrences(primary.path, 45);
        for (const auto &pair : coOccurrences) {
            if (pair.first.isEmpty() || pair.first == primary.path) {
                continue;
            }
            const float recency = expDecay(now - QFileInfo(pair.first).lastModified().toMSecsSinceEpoch(), kRecencyTauMs);
            if (pair.second <= 0 || recency <= 0.0f || supporting.contains(pair.first)) {
                continue;
            }
            supporting.insert(pair.first);
            packet.supportingPaths.append(pair.first);
            if (packet.supportingPaths.size() >= 5) {
                break;
            }
        }
    }

    if (m_activityTracker != nullptr) {
        const QVector<ActivityEvent> recent = m_activityTracker->getActivity(now - (3LL * 24LL * 60LL * 60LL * 1000LL), 220);
        QSet<QString> seenSearches;
        for (int i = recent.size() - 1; i >= 0; --i) {
            const ActivityEvent &event = recent.at(i);
            const QString query = event.metadata.value(QStringLiteral("query")).toString().trimmed();
            if (!query.isEmpty() && !seenSearches.contains(query)) {
                seenSearches.insert(query);
                packet.recentSearches.append(query);
                if (packet.recentSearches.size() >= 4) {
                    break;
                }
            }
        }

        QSet<QString> seenActions;
        for (int i = recent.size() - 1; i >= 0; --i) {
            const ActivityEvent &event = recent.at(i);
            if (event.filePath != primary.path && !packet.supportingPaths.contains(event.filePath)) {
                continue;
            }
            QString actionLabel;
            switch (event.action) {
            case ActivityAction::FileOpened:
                actionLabel = QStringLiteral("Opened %1").arg(QFileInfo(event.filePath).fileName());
                break;
            case ActivityAction::ResultClicked:
                actionLabel = QStringLiteral("Selected from search: %1").arg(QFileInfo(event.filePath).fileName());
                break;
            case ActivityAction::FilePinned:
                actionLabel = QStringLiteral("Pinned %1").arg(QFileInfo(event.filePath).fileName());
                break;
            case ActivityAction::TabSwitched:
                actionLabel = QStringLiteral("Returned to %1").arg(QFileInfo(event.filePath).fileName());
                break;
            default:
                break;
            }
            if (!actionLabel.isEmpty() && !seenActions.contains(actionLabel)) {
                seenActions.insert(actionLabel);
                packet.lastMeaningfulActions.append(actionLabel);
                if (packet.lastMeaningfulActions.size() >= 4) {
                    break;
                }
            }
        }
    }

    if (!packet.supportingPaths.isEmpty()) {
        packet.likelyNextActions.append(QStringLiteral("Open support set (%1 files)")
                                            .arg(QString::number(packet.supportingPaths.size())));
    }
    if (!packet.recentSearches.isEmpty()) {
        packet.likelyNextActions.append(QStringLiteral("Re-run recent query: \"%1\"").arg(packet.recentSearches.first()));
    }
    if (!packet.supportingPaths.isEmpty()) {
        packet.likelyNextActions.append(QStringLiteral("Compare %1 with %2")
                                            .arg(QFileInfo(packet.primaryPath).fileName(),
                                                 QFileInfo(packet.supportingPaths.first()).fileName()));
    }

    return packet;
}

} // namespace Ixplorer
