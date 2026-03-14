#include "data/Orchestrator.h"

#include <QDateTime>
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QJsonDocument>
#include <QJsonObject>
#include <QStandardPaths>
#include <algorithm>

#include "data/BundlePredictor.h"
#include "data/InterruptionDetector.h"
#include "data/ResumptionEngine.h"

namespace Ixplorer {

namespace {

QString ensureAppDataDir() {
    QString dir = QStandardPaths::writableLocation(QStandardPaths::AppLocalDataLocation);
    if (dir.isEmpty()) {
        dir = QDir::homePath() + QStringLiteral("/.ixplorer");
    }
    QDir().mkpath(dir);
    return dir;
}

float latencyCost(qint64 elapsedMs, qint64 maxLatencyMs) {
    if (maxLatencyMs <= 0) {
        return 0.0f;
    }
    return std::clamp(static_cast<float>(elapsedMs) / static_cast<float>(maxLatencyMs), 0.0f, 1.0f);
}

float riskAdjustedUtility(float confidence, float lossCost, float riskBudget) {
    const float risk = std::clamp((1.0f - confidence) * lossCost, 0.0f, 1.0f);
    if (risk > riskBudget) {
        return -1.0f;
    }
    return confidence - risk * 0.8f;
}

} // namespace

Orchestrator::Orchestrator(QObject *parent)
    : QObject(parent)
    , m_decisionLogPath(ensureAppDataDir() + QStringLiteral("/orchestrator_decisions_v1.jsonl")) {
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
    float witnessStrength,
    float stabilityPenalty,
    qint64 elapsedMs,
    qint64 maxLatencyMs) {
    m_hasSearchResults = hasSearchResults;
    m_topScore = topScore;
    m_scoreGap = scoreGap;
    m_lexicalConfidence = lexicalConfidence;
    m_witnessStrength = witnessStrength;
    m_stabilityPenalty = stabilityPenalty;
    m_elapsedMs = elapsedMs;
    m_maxLatencyMs = maxLatencyMs;
}

OrchestratorDecision Orchestrator::evaluate() const {
    OrchestratorDecision best;
    float bestUtility = 0.05f;
    float searchConfidence = 0.0f;
    float escalateUtility = 0.0f;

    if (m_interruptionDetector != nullptr && (m_state == OrchestratorState::Idle || m_state == OrchestratorState::Returning)) {
        const RecoveryPacket packet = m_interruptionDetector->buildRecoveryPacket();
        const float confidence = packet.wasInterrupted && !packet.items.isEmpty() ? 0.92f : 0.0f;
        const float utility = riskAdjustedUtility(confidence, 0.30f, 0.35f);
        if (utility > bestUtility) {
            bestUtility = utility;
            best.action = OrchestratorDecision::Action::ShowRecovery;
            best.confidence = confidence;
            best.payload = QVariant::fromValue(packet);
            best.reason = packet.reason;
        }
    }

    if (m_resumptionEngine != nullptr && (m_state == OrchestratorState::Idle || m_state == OrchestratorState::Returning)) {
        const ResumptionPacket packet = m_resumptionEngine->buildPacket();
        const float confidence = std::clamp(packet.confidence, 0.0f, 1.0f);
        const float utility = riskAdjustedUtility(confidence, 0.28f, 0.32f);
        if (!packet.primaryPath.isEmpty() && utility > bestUtility) {
            bestUtility = utility;
            best.action = OrchestratorDecision::Action::ShowResumption;
            best.confidence = confidence;
            best.payload = QVariant::fromValue(packet);
            best.reason = packet.reason;
        }
    }

    if (m_bundlePredictor != nullptr && !m_activePath.isEmpty() && m_state != OrchestratorState::Searching) {
        const BundlePrediction bundle = m_bundlePredictor->predictForPath(m_activePath);
        const float confidence = std::clamp(bundle.confidence, 0.0f, 1.0f);
        const float utility = riskAdjustedUtility(confidence, 0.25f, 0.30f);
        if (!bundle.primaryPath.isEmpty() && utility > bestUtility) {
            bestUtility = utility;
            best.action = OrchestratorDecision::Action::ShowPredictedBundle;
            best.confidence = confidence;
            best.payload = QVariant::fromValue(bundle);
            best.reason = bundle.reason;
        }
    }

    if (m_hasSearchResults) {
        searchConfidence = std::clamp(
            0.52f * m_topScore +
            0.22f * std::clamp(m_scoreGap * 2.2f, 0.0f, 1.0f) +
            0.18f * m_witnessStrength -
            0.12f * m_stabilityPenalty,
            0.0f,
            1.0f);

        const float autoOpenUtility = riskAdjustedUtility(searchConfidence, 0.90f, 0.12f);
        if (autoOpenUtility > bestUtility && searchConfidence > 0.74f) {
            bestUtility = autoOpenUtility;
            best.action = OrchestratorDecision::Action::AutoOpenResult;
            best.confidence = searchConfidence;
            best.reason = QStringLiteral("Risk-aware gate accepted auto-open");
        } else {
            const float suggestUtility = riskAdjustedUtility(searchConfidence, 0.40f, 0.30f);
            if (suggestUtility > bestUtility && searchConfidence > 0.48f) {
                bestUtility = suggestUtility;
                best.action = OrchestratorDecision::Action::SuggestResult;
                best.confidence = searchConfidence;
                best.reason = QStringLiteral("Risk-aware gate suggests manual confirmation");
            }
        }
    }

    escalateUtility =
        (1.0f - std::clamp(m_lexicalConfidence, 0.0f, 1.0f)) *
        std::clamp(1.0f - latencyCost(m_elapsedMs, m_maxLatencyMs), 0.0f, 1.0f) *
        (0.35f + 0.15f * (1.0f - m_witnessStrength)) -
        latencyCost(m_elapsedMs, m_maxLatencyMs) * 0.3f;
    if (m_state == OrchestratorState::Searching && escalateUtility > bestUtility) {
        bestUtility = escalateUtility;
        best.action = OrchestratorDecision::Action::EscalateSearch;
        best.confidence = std::clamp(escalateUtility, 0.0f, 1.0f);
        best.reason = QStringLiteral("Escalate while confidence remains under calibrated target");
    }

    logDecision(best, bestUtility, searchConfidence, escalateUtility);
    return best;
}

void Orchestrator::logDecision(const OrchestratorDecision &decision,
                               float utility,
                               float searchConfidence,
                               float escalateUtility) const {
    const QString actionLabel = [&decision]() {
        switch (decision.action) {
        case OrchestratorDecision::Action::DoNothing:
            return QStringLiteral("do_nothing");
        case OrchestratorDecision::Action::ShowRecovery:
            return QStringLiteral("show_recovery");
        case OrchestratorDecision::Action::ShowResumption:
            return QStringLiteral("show_resumption");
        case OrchestratorDecision::Action::ShowPredictedBundle:
            return QStringLiteral("show_predicted_bundle");
        case OrchestratorDecision::Action::AutoOpenResult:
            return QStringLiteral("auto_open_result");
        case OrchestratorDecision::Action::SuggestResult:
            return QStringLiteral("suggest_result");
        case OrchestratorDecision::Action::ShowRelated:
            return QStringLiteral("show_related");
        case OrchestratorDecision::Action::EscalateSearch:
            return QStringLiteral("escalate_search");
        }
        return QStringLiteral("do_nothing");
    }();

    const QString signature = QStringLiteral("%1|%2|%3|%4|%5|%6|%7")
        .arg(actionLabel,
             QString::number(m_state == OrchestratorState::Searching ? 1 : 0),
             QString::number(m_topScore, 'f', 3),
             QString::number(m_scoreGap, 'f', 3),
             QString::number(m_witnessStrength, 'f', 3),
             QString::number(m_stabilityPenalty, 'f', 3),
             QString::number(m_elapsedMs));
    if (signature == m_lastDecisionSignature) {
        return;
    }
    m_lastDecisionSignature = signature;

    const QJsonObject record{
        {QStringLiteral("timestamp_ms"), QString::number(QDateTime::currentMSecsSinceEpoch())},
        {QStringLiteral("state"), static_cast<int>(m_state)},
        {QStringLiteral("action"), actionLabel},
        {QStringLiteral("confidence"), decision.confidence},
        {QStringLiteral("utility"), utility},
        {QStringLiteral("reason"), decision.reason},
        {QStringLiteral("has_search_results"), m_hasSearchResults},
        {QStringLiteral("top_score"), m_topScore},
        {QStringLiteral("score_gap"), m_scoreGap},
        {QStringLiteral("lexical_confidence"), m_lexicalConfidence},
        {QStringLiteral("witness_strength"), m_witnessStrength},
        {QStringLiteral("stability_penalty"), m_stabilityPenalty},
        {QStringLiteral("search_confidence"), searchConfidence},
        {QStringLiteral("elapsed_ms"), m_elapsedMs},
        {QStringLiteral("max_latency_ms"), m_maxLatencyMs},
        {QStringLiteral("escalate_utility"), escalateUtility},
        {QStringLiteral("active_path"), m_activePath},
    };

    QFileInfo info(m_decisionLogPath);
    QDir().mkpath(info.absolutePath());
    QFile file(m_decisionLogPath);
    if (file.open(QIODevice::WriteOnly | QIODevice::Append)) {
        file.write(QJsonDocument(record).toJson(QJsonDocument::Compact));
        file.write("\n");
    }
}

} // namespace Ixplorer
