#include "data/BundlePredictor.h"

#include <QDateTime>
#include <QDir>
#include <QFileInfo>
#include <QHash>

#include <algorithm>
#include <cmath>

#include "data/ActivityTracker.h"
#include "data/PersonalRanker.h"
#include "data/WorkstreamManager.h"

namespace Ixplorer {

namespace {

constexpr qint64 kTransitionWindowMs = 6LL * 60LL * 1000LL;
constexpr qint64 kNavigationIdleWindowMs = 60LL * 1000LL;
constexpr qint64 kFeatureLookbackMs = 10LL * 24LL * 60LL * 60LL * 1000LL;

bool isFileEvent(const ActivityEvent &event) {
    return !event.filePath.isEmpty();
}

QString normalizePath(const QString &path) {
    QFileInfo info(path);
    const QString canonical = info.exists() ? info.absoluteFilePath() : QDir::cleanPath(path);
    return QDir::fromNativeSeparators(canonical).toLower();
}

float expDecay(qint64 ageMs, qint64 tauMs) {
    if (ageMs <= 0) {
        return 1.0f;
    }
    return static_cast<float>(std::exp(-static_cast<double>(ageMs) / static_cast<double>(tauMs)));
}

QString explainBundleItem(const BundleItem &item) {
    QVector<QPair<QString, float>> parts{
        qMakePair(QStringLiteral("transition"), item.transition),
        qMakePair(QStringLiteral("co-open"), item.coOpen),
        qMakePair(QStringLiteral("workstream prior"), item.workstreamPrior),
        qMakePair(QStringLiteral("frecency"), item.frecency),
    };
    std::sort(parts.begin(), parts.end(), [](const auto &lhs, const auto &rhs) {
        return lhs.second > rhs.second;
    });

    QStringList summary;
    for (const auto &part : std::as_const(parts)) {
        if (part.second < 0.18f) {
            continue;
        }
        summary.append(part.first);
        if (summary.size() >= 2) {
            break;
        }
    }
    return summary.isEmpty()
        ? QStringLiteral("weak contextual relation")
        : summary.join(QStringLiteral(" + "));
}

} // namespace

BundlePredictor::BundlePredictor(QObject *parent)
    : QObject(parent) {
}

void BundlePredictor::setActivityTracker(ActivityTracker *tracker) {
    m_activityTracker = tracker;
}

void BundlePredictor::setPersonalRanker(PersonalRanker *ranker) {
    m_personalRanker = ranker;
}

void BundlePredictor::setWorkstreamManager(WorkstreamManager *manager) {
    m_workstreamManager = manager;
}

BundlePrediction BundlePredictor::predictForPath(const QString &currentPath, int limit, qint64 nowMs) const {
    BundlePrediction prediction;
    prediction.anchorPath = currentPath;

    if (m_activityTracker == nullptr || currentPath.isEmpty()) {
        return prediction;
    }

    const qint64 now = nowMs > 0 ? nowMs : QDateTime::currentMSecsSinceEpoch();
    const QVector<ActivityEvent> events = m_activityTracker->events();
    if (events.size() < 2) {
        return prediction;
    }

    const QString current = normalizePath(currentPath);
    if (current.isEmpty()) {
        return prediction;
    }

    QHash<QString, QHash<QString, int>> transitions;
    QHash<QString, int> outgoingCounts;
    QHash<QString, float> frecency;
    QHash<QString, int> openCounts;
    QHash<QString, float> coOpenMap;
    QSet<QString> vocabulary;
    QHash<QString, float> workstreamPrior;

    if (m_workstreamManager != nullptr) {
        const Workstream active = m_workstreamManager->currentWorkstream();
        prediction.workstreamId = active.id;
        const int maxTop = active.topFiles.isEmpty() ? 1 : qMax(1, active.topFiles.first().second);
        for (const auto &entry : active.topFiles) {
            const QString path = normalizePath(entry.first);
            if (path.isEmpty()) {
                continue;
            }
            workstreamPrior[path] = std::max(workstreamPrior.value(path),
                                             static_cast<float>(entry.second) / static_cast<float>(maxTop));
        }
    }

    for (int i = 1; i < events.size(); ++i) {
        const ActivityEvent &previous = events.at(i - 1);
        const ActivityEvent &current = events.at(i);

        if (!isFileEvent(previous) || !isFileEvent(current)) {
            continue;
        }

        const QString prevPath = normalizePath(previous.filePath);
        const QString nextPath = normalizePath(current.filePath);
        if (prevPath.isEmpty() || nextPath.isEmpty()) {
            continue;
        }

        vocabulary.insert(prevPath);
        vocabulary.insert(nextPath);
        openCounts[nextPath] += 1;
        if (now - current.timestamp <= kFeatureLookbackMs) {
            frecency[nextPath] += expDecay(now - current.timestamp, 10LL * 60LL * 60LL * 1000LL);
        }

        if (current.timestamp - previous.timestamp <= kTransitionWindowMs) {
            transitions[prevPath][nextPath] += 1;
            outgoingCounts[prevPath] += 1;
        }
    }

    const QHash<QString, int> outgoing = transitions.value(current);
    if (outgoing.isEmpty()) {
        return prediction;
    }

    const QVector<QPair<QString, int>> coOccurrences = m_activityTracker->getCoOccurrences(currentPath, 45);
    const int maxCoOpen = coOccurrences.isEmpty() ? 1 : qMax(1, coOccurrences.first().second);
    for (const auto &pair : coOccurrences) {
        const QString related = normalizePath(pair.first);
        if (related.isEmpty() || related == current) {
            continue;
        }
        coOpenMap[related] = std::max(coOpenMap.value(related),
                                      static_cast<float>(pair.second) / static_cast<float>(maxCoOpen));
    }

    const ActivityEvent &lastEvent = events.last();
    if (!lastEvent.filePath.isEmpty() &&
        normalizePath(lastEvent.filePath) != current &&
        now - lastEvent.timestamp <= kNavigationIdleWindowMs) {
        return prediction;
    }

    const float vocabularySize = static_cast<float>(qMax(1, vocabulary.size()));
    float maxFrecency = 0.0f;
    for (auto it = frecency.cbegin(); it != frecency.cend(); ++it) {
        maxFrecency = qMax(maxFrecency, it.value());
    }

    QVector<BundleItem> ranked;
    QSet<QString> candidatePaths;
    for (auto it = outgoing.cbegin(); it != outgoing.cend(); ++it) {
        candidatePaths.insert(it.key());
    }
    for (auto it = coOpenMap.cbegin(); it != coOpenMap.cend(); ++it) {
        candidatePaths.insert(it.key());
    }
    for (auto it = workstreamPrior.cbegin(); it != workstreamPrior.cend(); ++it) {
        candidatePaths.insert(it.key());
    }

    for (const QString &candidate : std::as_const(candidatePaths)) {
        if (candidate == current) {
            continue;
        }
        const float transition =
            static_cast<float>(outgoing.value(candidate) + 1) /
            static_cast<float>(outgoingCounts.value(current) + vocabularySize);
        const float coOpen = coOpenMap.value(candidate, 0.0f);
        const float frecencyScore = maxFrecency > 0.0f
            ? std::clamp(frecency.value(candidate, 0.0f) / maxFrecency, 0.0f, 1.0f)
            : 0.0f;
        const float wsPrior = std::clamp(workstreamPrior.value(candidate, 0.0f), 0.0f, 1.0f);
        const float personal = m_personalRanker == nullptr ? 0.0f : std::min(1.0f, m_personalRanker->getBoost(candidate) / 0.15f);

        BundleItem item;
        item.path = candidate;
        item.transition = std::clamp(transition, 0.0f, 1.0f);
        item.coOpen = coOpen;
        item.frecency = frecencyScore;
        item.workstreamPrior = wsPrior;
        item.supportCount = openCounts.value(candidate, 0);
        item.score =
            0.34f * item.transition +
            0.26f * item.coOpen +
            0.20f * item.frecency +
            0.15f * item.workstreamPrior +
            0.05f * personal;
        item.reason = explainBundleItem(item);
        ranked.append(item);
    }

    std::sort(ranked.begin(), ranked.end(), [](const BundleItem &lhs, const BundleItem &rhs) {
        if (qFuzzyCompare(lhs.score, rhs.score)) {
            return lhs.path < rhs.path;
        }
        return lhs.score > rhs.score;
    });

    if (ranked.size() < 3) {
        return prediction;
    }

    const int maxItems = std::clamp(limit, 3, 7);
    if (ranked.size() > maxItems) {
        ranked.resize(maxItems);
    }

    prediction.primaryPath = ranked.first().path;
    prediction.items = ranked;
    const float top = ranked.first().score;
    const float second = ranked.size() > 1 ? ranked.at(1).score : 0.0f;
    prediction.confidence = std::clamp(0.65f * top + 0.35f * (top - second), 0.0f, 1.0f);
    prediction.reason = QStringLiteral("Next-context prediction from transitions, workstream priors, and co-open history");

    if (prediction.primaryPath == currentPath) {
        prediction = BundlePrediction();
        prediction.anchorPath = currentPath;
        return prediction;
    }

    return prediction;
}

} // namespace Ixplorer
