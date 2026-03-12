#pragma once

#include <QObject>
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
    bool isAuto = true;
    bool isPinned = false;
    QString description;
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
    QString m_currentWorkstreamId;
    QString m_storagePath;
    bool m_dirty = false;
};

} // namespace Ixplorer

Q_DECLARE_METATYPE(Ixplorer::Workstream)
