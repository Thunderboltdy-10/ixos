#pragma once

#include <QObject>
#include <QString>
#include <QVector>

namespace Ixplorer {

class ActivityTracker;
class PersonalRanker;
class SessionStateStore;
class WorkstreamManager;

struct ResumptionCandidate {
    QString path;
    float score = 0.0f;
    float shortTerm = 0.0f;
    float mediumTerm = 0.0f;
    float longTerm = 0.0f;
    float recency = 0.0f;
    float unfinishedness = 0.0f;
    float frequency = 0.0f;
    float interruption = 0.0f;
    float temporalRegularity = 0.0f;
    float coOccurrence = 0.0f;
    float personalBoost = 0.0f;
    QString lastQuery;
    QString workstreamId;
    QString reason;
};

struct ResumptionPacket {
    QString primaryPath;
    QVector<QString> supportingPaths;
    QVector<QString> lastMeaningfulActions;
    QVector<QString> recentSearches;
    QVector<QString> likelyNextActions;
    QVector<QString> groupingEvidence;
    QString lastQuery;
    QString workstreamId;
    float confidence = 0.0f;
    QString reason;
};

class ResumptionEngine : public QObject {
    Q_OBJECT
public:
    explicit ResumptionEngine(QObject *parent = nullptr);

    void setActivityTracker(ActivityTracker *tracker);
    void setSessionStateStore(SessionStateStore *sessionStateStore);
    void setPersonalRanker(PersonalRanker *personalRanker);
    void setWorkstreamManager(WorkstreamManager *workstreamManager);

    QVector<ResumptionCandidate> rankCandidates(int limit = 5, const QString &preferredWorkstreamId = QString()) const;
    ResumptionPacket buildPacket(const QString &preferredWorkstreamId = QString()) const;

private:
    ActivityTracker *m_activityTracker = nullptr;
    SessionStateStore *m_sessionStateStore = nullptr;
    PersonalRanker *m_personalRanker = nullptr;
    WorkstreamManager *m_workstreamManager = nullptr;
};

} // namespace Ixplorer

Q_DECLARE_METATYPE(Ixplorer::ResumptionCandidate)
Q_DECLARE_METATYPE(Ixplorer::ResumptionPacket)
