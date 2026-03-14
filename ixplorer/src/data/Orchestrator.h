#pragma once

#include <QObject>
#include <QString>
#include <QVariant>

namespace Ixplorer {

class BundlePredictor;
class InterruptionDetector;
class ResumptionEngine;

enum class OrchestratorState {
    Idle,
    Searching,
    Reviewing,
    Working,
    Returning
};

struct OrchestratorDecision {
    enum class Action {
        DoNothing,
        ShowRecovery,
        ShowResumption,
        ShowPredictedBundle,
        AutoOpenResult,
        SuggestResult,
        ShowRelated,
        EscalateSearch
    };

    Action action = Action::DoNothing;
    float confidence = 0.0f;
    QVariant payload;
    QString reason;
};

class Orchestrator : public QObject {
    Q_OBJECT
public:
    explicit Orchestrator(QObject *parent = nullptr);

    void setResumptionEngine(ResumptionEngine *engine);
    void setBundlePredictor(BundlePredictor *predictor);
    void setInterruptionDetector(InterruptionDetector *detector);

    void setState(OrchestratorState state);
    OrchestratorState state() const;

    void setActivePath(const QString &path);
    void setSearchContext(
        bool hasSearchResults,
        float topScore,
        float scoreGap,
        float lexicalConfidence,
        float witnessStrength,
        float stabilityPenalty,
        qint64 elapsedMs,
        qint64 maxLatencyMs);

    OrchestratorDecision evaluate() const;

signals:
    void actionDecided(const Ixplorer::OrchestratorDecision &decision);

private:
    void logDecision(const OrchestratorDecision &decision,
                     float utility,
                     float searchConfidence,
                     float escalateUtility) const;

    ResumptionEngine *m_resumptionEngine = nullptr;
    BundlePredictor *m_bundlePredictor = nullptr;
    InterruptionDetector *m_interruptionDetector = nullptr;
    OrchestratorState m_state = OrchestratorState::Idle;
    QString m_activePath;
    bool m_hasSearchResults = false;
    float m_topScore = 0.0f;
    float m_scoreGap = 0.0f;
    float m_lexicalConfidence = 0.0f;
    float m_witnessStrength = 0.0f;
    float m_stabilityPenalty = 0.0f;
    qint64 m_elapsedMs = 0;
    qint64 m_maxLatencyMs = 1000;
    QString m_decisionLogPath;
    mutable QString m_lastDecisionSignature;
};

} // namespace Ixplorer

Q_DECLARE_METATYPE(Ixplorer::OrchestratorDecision)
