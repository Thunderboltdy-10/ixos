#pragma once

#include <QObject>
#include <QHash>
#include <QPair>
#include <QString>
#include <QTimer>
#include <QVector>

namespace Ixplorer {

class ActivityTracker;

struct Workstream {
    QString id;
    QString name;
    qint64 createdAt = 0;
    qint64 lastActive = 0;
    QVector<QPair<QString, int>> topFolders;
    QVector<QPair<QString, int>> topFiles;
    QVector<QPair<QString, float>> topQueries;
    bool isAuto = true;
    bool isPinned = false;
    QString description;
    float cohesion = 0.0f;
    float confidence = 0.0f;
    int memberCount = 0;
};

struct RelationshipSignal {
    QString path;
    float score = 0.0f;
    float coOpen = 0.0f;
    float temporal = 0.0f;
    float sameSession = 0.0f;
    float queryCoOccurrence = 0.0f;
    float pinAffinity = 0.0f;
    QString reason;
    QString workstreamId;
};

class WorkstreamManager : public QObject {
    Q_OBJECT
public:
    explicit WorkstreamManager(QObject *parent = nullptr);

    void setActivityTracker(ActivityTracker *tracker);

    void setStoragePath(const QString &path);
    QString storagePath() const;

    bool load();
    bool save();
    void rebuild();

    QVector<Workstream> workstreams() const;
    Workstream workstreamForId(const QString &id) const;
    QVector<Workstream> workstreamsForPath(const QString &path) const;
    QVector<RelationshipSignal> relatedForPath(
        const QString &path,
        int limit = 8,
        const QString &workstreamId = QString()) const;
    QString graphSignature() const;
    int replaySourceEventCount() const;
    qint64 lastRebuildTimestamp() const;

    QString currentWorkstreamId() const;
    Workstream currentWorkstream() const;
    bool setCurrentWorkstream(const QString &id);
    bool renameWorkstream(const QString &id, const QString &name);
    bool setPinned(const QString &id, bool pinned);
    void upsertWorkstream(const Workstream &workstream);

signals:
    void workstreamsChanged();
    void currentWorkstreamChanged(const QString &id);

private:
    ActivityTracker *m_activityTracker = nullptr;
    QVector<Workstream> m_workstreams;
    QHash<QString, QVector<RelationshipSignal>> m_relatedCache;
    QHash<QString, QString> m_pathWorkstreamCache;
    QString m_currentWorkstreamId;
    QString m_storagePath;
    QString m_graphSignature;
    int m_replaySourceEventCount = 0;
    qint64 m_lastRebuildTimestamp = 0;
    bool m_dirty = false;
};

} // namespace Ixplorer

Q_DECLARE_METATYPE(Ixplorer::Workstream)
Q_DECLARE_METATYPE(Ixplorer::RelationshipSignal)
