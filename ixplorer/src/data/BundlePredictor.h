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

private:
    ActivityTracker *m_activityTracker = nullptr;
    PersonalRanker *m_personalRanker = nullptr;
    WorkstreamManager *m_workstreamManager = nullptr;
};

} // namespace Ixplorer

Q_DECLARE_METATYPE(Ixplorer::BundleItem)
Q_DECLARE_METATYPE(Ixplorer::BundlePrediction)
