#include "data/InterruptionDetector.h"

#include <QDir>
#include <QSet>

#include <algorithm>
#include <utility>

#include "data/ResumptionEngine.h"
#include "data/SessionState.h"

namespace Ixplorer {

namespace {

float pathSimilarity(const QString &lhs, const QString &rhs) {
    const QStringList lhsParts = QDir::fromNativeSeparators(lhs).split(QLatin1Char('/'), Qt::SkipEmptyParts);
    const QStringList rhsParts = QDir::fromNativeSeparators(rhs).split(QLatin1Char('/'), Qt::SkipEmptyParts);
    const int maxComponents = qMax(lhsParts.size(), rhsParts.size());
    if (maxComponents == 0) {
        return 0.0f;
    }

    int shared = 0;
    const int cap = qMin(lhsParts.size(), rhsParts.size());
    for (int i = 0; i < cap; ++i) {
        if (lhsParts.at(i).compare(rhsParts.at(i), Qt::CaseInsensitive) != 0) {
            break;
        }
        shared += 1;
    }

    return 1.0f - static_cast<float>(shared) / static_cast<float>(maxComponents);
}

} // namespace

InterruptionDetector::InterruptionDetector(QObject *parent)
    : QObject(parent) {
}

void InterruptionDetector::setSessionState(SessionState *sessionState) {
    m_sessionState = sessionState;
}

void InterruptionDetector::setResumptionEngine(ResumptionEngine *resumptionEngine) {
    m_resumptionEngine = resumptionEngine;
}

RecoveryPacket InterruptionDetector::buildRecoveryPacket(int budget) const {
    RecoveryPacket packet;
    if (m_sessionState == nullptr) {
        return packet;
    }

    const SessionSnapshot snapshot = m_sessionState->snapshot();
    if (snapshot.hasCleanExit) {
        return packet;
    }

    packet.wasInterrupted = true;
    packet.workstreamId = snapshot.activeWorkstreamId;
    packet.reason = QStringLiteral("Resume where you left off?");

    QHash<QString, RecoveryItem> candidates;
    for (const TabState &tab : snapshot.tabs) {
        if (!tab.path.isEmpty()) {
            candidates.insert(tab.path, RecoveryItem{tab.path, 0.4f, QStringLiteral("open tab from interrupted session")});
        }
    }

    if (m_resumptionEngine != nullptr) {
        for (const ResumptionCandidate &candidate : m_resumptionEngine->rankCandidates(qMax(3, budget * 3), snapshot.activeWorkstreamId)) {
            RecoveryItem item{candidate.path, candidate.score, candidate.reason};
            if (!candidates.contains(candidate.path) || candidates.value(candidate.path).score < item.score) {
                candidates.insert(candidate.path, item);
            }
        }
    }

    QVector<RecoveryItem> remaining = candidates.values().toVector();
    QVector<RecoveryItem> selected;

    while (!remaining.isEmpty() && selected.size() < budget) {
        int bestIndex = 0;
        float bestScore = -1.0f;
        for (int i = 0; i < remaining.size(); ++i) {
            float diversityPenalty = 0.0f;
            for (const RecoveryItem &existing : std::as_const(selected)) {
                diversityPenalty = qMax(diversityPenalty, 1.0f - pathSimilarity(remaining.at(i).path, existing.path));
            }

            const float mmr = 0.7f * remaining.at(i).score - 0.3f * diversityPenalty;
            if (mmr > bestScore) {
                bestScore = mmr;
                bestIndex = i;
            }
        }

        selected.append(remaining.takeAt(bestIndex));
    }

    packet.items = selected;
    return packet;
}

} // namespace Ixplorer
