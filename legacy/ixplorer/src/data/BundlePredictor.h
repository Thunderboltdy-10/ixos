#pragma once

#include <QObject>
#include <QString>
#include <QVector>

namespace Ixplorer {

class ActivityTracker;
class PersonalRanker;
class WorkstreamManager;

struct BundleItem {
    QString path;
    float score = 0.0f;
    int supportCount = 0;
    float frecency = 0.0f;
    float transition = 0.0f;
    float workstreamPrior = 0.0f;
    float coOpen = 0.0f;
    QString reason;
};

struct BundlePrediction {
    QString anchorPath;
    QString primaryPath;
    QVector<BundleItem> items;
    float confidence = 0.0f;
    QString reason;
    QString workstreamId;
};

class BundlePredictor : public QObject {
    Q_OBJECT
public:
    explicit BundlePredictor(QObject *parent = nullptr);

    void setActivityTracker(ActivityTracker *tracker);
    void setPersonalRanker(PersonalRanker *ranker);
    void setWorkstreamManager(WorkstreamManager *manager);

    BundlePrediction predictForPath(const QString &currentPath, int limit = 4, qint64 nowMs = 0) const;

    // IXP-302: Online feedback loop — adaptive weight learning
    void recordFeedback(bool accepted);
    struct FeatureWeights {
        float transition = 0.34f;
        float coOpen = 0.26f;
        float frecency = 0.20f;
        float workstreamPrior = 0.15f;
        float personal = 0.05f;
    };
    FeatureWeights currentWeights() const { return m_weights; }
    int feedbackCount() const { return m_feedbackCount; }

    // IXP-303: Ablation framework
    struct AblationMask {
        bool enableTransition = true;
        bool enableCoOpen = true;
        bool enableFrecency = true;
        bool enableWorkstreamPrior = true;
        bool enablePersonal = true;
    };
    void setAblationMask(const AblationMask &mask) { m_ablation = mask; }
    AblationMask ablationMask() const { return m_ablation; }

private:
    ActivityTracker *m_activityTracker = nullptr;
    PersonalRanker *m_personalRanker = nullptr;
    WorkstreamManager *m_workstreamManager = nullptr;

    // IXP-302: EMA-adapted weights
    FeatureWeights m_weights;
    int m_feedbackCount = 0;
    static constexpr float kEmaAlpha = 0.15f;

    // IXP-303: Ablation mask
    AblationMask m_ablation;
};

} // namespace Ixplorer

Q_DECLARE_METATYPE(Ixplorer::BundleItem)
Q_DECLARE_METATYPE(Ixplorer::BundlePrediction)
