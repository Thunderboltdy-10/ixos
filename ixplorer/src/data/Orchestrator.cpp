#include "data/Orchestrator.h"

#include <algorithm>

#include "data/BundlePredictor.h"
#include "data/InterruptionDetector.h"
#include "data/ResumptionEngine.h"

namespace Ixplorer {

namespace {

float latencyCost(qint64 elapsedMs, qint64 maxLatencyMs) {
    if (maxLatencyMs <= 0) {
        return 0.0f;
    }
    return std::clamp(static_cast<float>(elapsedMs) / static_cast<float>(maxLatencyMs), 0.0f, 1.0f);
}

} // namespace

Orchestrator::Orchestrator(QObject *parent)
    : QObject(parent) {
}

void Orchestrator::setResumptionEngine(ResumptionEngine *engine) {
    m_resumptionEngine = engine;
}

void Orchestrator::setBundlePredictor(BundlePredictor *predictor) {
    m_bundlePredictor = predictor;
}

void Orchestrator::setInterruptionDetector(InterruptionDetector *detector) {
    m_interruptionDetector = detector;
}

void Orchestrator::setState(OrchestratorState state) {
    m_state = state;
}

OrchestratorState Orchestrator::state() const {
    return m_state;
}

void Orchestrator::setActivePath(const QString &path) {
    m_activePath = path;
}

void Orchestrator::setSearchContext(
    bool hasSearchResults,
    float topScore,
    float scoreGap,
    float lexicalConfidence,
    qint64 elapsedMs,
    qint64 maxLatencyMs) {
    m_hasSearchResults = hasSearchResults;
    m_topScore = topScore;
    m_scoreGap = scoreGap;
    m_lexicalConfidence = lexicalConfidence;
    m_elapsedMs = elapsedMs;
    m_maxLatencyMs = maxLatencyMs;
}

OrchestratorDecision Orchestrator::evaluate() const {
    OrchestratorDecision best;
    float bestUtility = 0.1f;

    if (m_interruptionDetector != nullptr && (m_state == OrchestratorState::Idle || m_state == OrchestratorState::Returning)) {
        const RecoveryPacket packet = m_interruptionDetector->buildRecoveryPacket();
        const float utility = packet.wasInterrupted && !packet.items.isEmpty() ? 0.92f : 0.0f;
        if (utility > bestUtility) {
            bestUtility = utility;
            best.action = OrchestratorDecision::Action::ShowRecovery;
            best.confidence = utility;
            best.payload = QVariant::fromValue(packet);
            best.reason = packet.reason;
        }
    }

    if (m_resumptionEngine != nullptr && (m_state == OrchestratorState::Idle || m_state == OrchestratorState::Returning)) {
        const ResumptionPacket packet = m_resumptionEngine->buildPacket();
        const float utility = packet.confidence * 0.8f - 0.1f;
        if (!packet.primaryPath.isEmpty() && utility > bestUtility) {
            bestUtility = utility;
            best.action = OrchestratorDecision::Action::ShowResumption;
            best.confidence = packet.confidence;
            best.payload = QVariant::fromValue(packet);
            best.reason = packet.reason;
        }
    }

    if (m_bundlePredictor != nullptr && !m_activePath.isEmpty() && m_state != OrchestratorState::Searching) {
        const BundlePrediction bundle = m_bundlePredictor->predictForPath(m_activePath);
        const float utility = bundle.confidence * 0.6f - 0.15f;
        if (!bundle.primaryPath.isEmpty() && utility > bestUtility) {
            bestUtility = utility;
            best.action = OrchestratorDecision::Action::ShowPredictedBundle;
            best.confidence = bundle.confidence;
            best.payload = QVariant::fromValue(bundle);
            best.reason = bundle.reason;
        }
    }

    if (m_hasSearchResults) {
        if (m_topScore > 0.85f && m_scoreGap > 0.15f) {
            const float utility = m_topScore * 1.0f - 0.4f;
            if (utility > bestUtility) {
                bestUtility = utility;
                best.action = OrchestratorDecision::Action::AutoOpenResult;
                best.confidence = m_topScore;
                best.reason = QStringLiteral("Top result is decisively ahead");
            }
        }

        if (m_topScore > 0.70f && m_scoreGap > 0.10f) {
            const float utility = m_topScore * 0.7f - 0.2f;
            if (utility > bestUtility) {
                bestUtility = utility;
                best.action = OrchestratorDecision::Action::SuggestResult;
                best.confidence = m_topScore;
                best.reason = QStringLiteral("Top result looks strong but not auto-open safe");
            }
        }
    }

    const float escalateUtility =
        (1.0f - m_lexicalConfidence) *
        std::clamp(1.0f - latencyCost(m_elapsedMs, m_maxLatencyMs), 0.0f, 1.0f) *
        0.4f -
        latencyCost(m_elapsedMs, m_maxLatencyMs) * 0.3f;
    if (m_state == OrchestratorState::Searching && escalateUtility > bestUtility) {
        bestUtility = escalateUtility;
        best.action = OrchestratorDecision::Action::EscalateSearch;
        best.confidence = escalateUtility;
        best.reason = QStringLiteral("Escalate search while latency budget remains");
    }

    return best;
}

} // namespace Ixplorer
