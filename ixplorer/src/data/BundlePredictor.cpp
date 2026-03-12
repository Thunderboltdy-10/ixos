#include "data/BundlePredictor.h"

#include <QDateTime>
#include <QFileInfo>
#include <QHash>

#include <algorithm>

#include "data/ActivityTracker.h"
#include "data/PersonalRanker.h"
#include "data/WorkstreamManager.h"

namespace Ixplorer {

namespace {

constexpr qint64 kTransitionWindowMs = 5LL * 60LL * 1000LL;
constexpr qint64 kNavigationIdleWindowMs = 60LL * 1000LL;

bool isFileEvent(const ActivityEvent &event) {
    return !event.filePath.isEmpty();
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

    QHash<QString, QHash<QString, int>> transitions;
    QHash<QString, int> outgoingCounts;
    QHash<QString, int> fileOpenCounts;
    QSet<QString> vocabulary;

    for (int i = 1; i < events.size(); ++i) {
        const ActivityEvent &previous = events.at(i - 1);
        const ActivityEvent &current = events.at(i);

        if (!isFileEvent(previous) || !isFileEvent(current)) {
            continue;
        }
        vocabulary.insert(previous.filePath);
        vocabulary.insert(current.filePath);
        fileOpenCounts[current.filePath] += 1;
        if (current.timestamp - previous.timestamp > kTransitionWindowMs) {
            continue;
        }
        transitions[previous.filePath][current.filePath] += 1;
        outgoingCounts[previous.filePath] += 1;
    }

    const QHash<QString, int> outgoing = transitions.value(currentPath);
    if (outgoing.isEmpty()) {
        return prediction;
    }

    QString bestNextPath;
    float bestProbability = 0.0f;
    const float vocabularySize = static_cast<float>(qMax(1, vocabulary.size()));
    for (auto it = outgoing.cbegin(); it != outgoing.cend(); ++it) {
        const float probability =
            static_cast<float>(it.value() + 1) /
            static_cast<float>(outgoingCounts.value(currentPath) + vocabularySize);
        if (probability > bestProbability) {
            bestProbability = probability;
            bestNextPath = it.key();
        }
    }

    if (bestNextPath.isEmpty() || bestProbability <= 0.4f) {
        return prediction;
    }

    const ActivityEvent &lastEvent = events.last();
    if (!lastEvent.filePath.isEmpty() &&
        lastEvent.filePath != currentPath &&
        now - lastEvent.timestamp <= kNavigationIdleWindowMs) {
        return prediction;
    }

    prediction.primaryPath = bestNextPath;
    prediction.confidence = bestProbability;
    prediction.reason = QStringLiteral("Predicted from recent open transitions");
    if (m_workstreamManager != nullptr) {
        prediction.workstreamId = m_workstreamManager->currentWorkstreamId();
    }

    const QVector<QPair<QString, int>> coOccurrences = m_activityTracker->getCoOccurrences(bestNextPath, 30);
    for (const auto &pair : coOccurrences) {
        if (pair.first.isEmpty() || pair.first == bestNextPath) {
            continue;
        }
        const float support = fileOpenCounts.value(bestNextPath) > 0
            ? static_cast<float>(pair.second) / static_cast<float>(fileOpenCounts.value(bestNextPath))
            : 0.0f;
        if (support <= 0.3f) {
            continue;
        }

        float score = support;
        if (m_personalRanker != nullptr) {
            score += 0.25f * m_personalRanker->getBoost(pair.first);
        }
        prediction.items.append(BundleItem{pair.first, score, pair.second});
        if (prediction.items.size() >= limit) {
            break;
        }
    }

    std::sort(prediction.items.begin(), prediction.items.end(), [](const BundleItem &lhs, const BundleItem &rhs) {
        return lhs.score > rhs.score;
    });

    if (prediction.items.size() < 2) {
        prediction = BundlePrediction();
        prediction.anchorPath = currentPath;
    }
    return prediction;
}

} // namespace Ixplorer
