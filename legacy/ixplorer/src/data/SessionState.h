#pragma once

#include <QObject>
#include <QHash>
#include <QString>
#include <QStringList>
#include <QTimer>
#include <QVector>

namespace Ixplorer {

struct TabState {
    QString path;
    bool isDocument = false;
    bool isPreview = false;
    bool launchDeferred = false;
    int scrollPosition = 0;
    int viewMode = 0;
    QStringList history;
    int historyIndex = 0;
};

struct WorkstreamSessionState {
    QVector<TabState> tabs;
    int activeTabIndex = 0;
    QString searchQuery;
    QString searchRoot;
};

struct SessionSnapshot {
    int version = 1;
    QVector<TabState> tabs;
    int activeTabIndex = 0;
    int sidebarWidth = 248;
    int railWidth = 0;
    bool railVisible = false;
    QString lastSearchQuery;
    QString lastSearchRoot;
    qint64 lastSaveTimestamp = 0;
    bool hasCleanExit = false;
    QString activeWorkstreamId;
    QHash<QString, WorkstreamSessionState> workstreamStates;
};

using SessionStateSnapshot = SessionSnapshot;

class SessionState : public QObject {
    Q_OBJECT
public:
    explicit SessionState(QObject *parent = nullptr);

    void setStoragePath(const QString &path);
    QString storagePath() const;

    bool load();
    bool save();
    void restoreDefault();

    const SessionSnapshot &snapshot() const;
    void setSnapshot(const SessionSnapshot &snapshot);

    void setTabs(const QVector<TabState> &tabs, int activeTabIndex);
    void setLayoutState(int sidebarWidth, int railWidth, bool railVisible);
    void setLastSearch(const QString &query, const QString &rootPath);
    void setActiveWorkstreamId(const QString &workstreamId);
    void setWorkstreamState(const QString &workstreamId, const WorkstreamSessionState &state);
    bool hasWorkstreamState(const QString &workstreamId) const;
    WorkstreamSessionState workstreamState(const QString &workstreamId) const;

    void markCleanExit(bool cleanExit);
    void markDirty();

signals:
    void snapshotChanged();
    void stateSaved(const QString &path);

private:
    SessionSnapshot m_snapshot;
    QString m_storagePath;
    QTimer *m_autosaveTimer = nullptr;
    bool m_dirty = false;
};

class SessionStateStore {
public:
    SessionStateStore();

    void setPath(const QString &path);
    QString path() const;

    SessionStateSnapshot load() const;
    bool save(const SessionStateSnapshot &snapshot) const;

private:
    QString m_path;
};

} // namespace Ixplorer

Q_DECLARE_METATYPE(Ixplorer::TabState)
Q_DECLARE_METATYPE(Ixplorer::WorkstreamSessionState)
Q_DECLARE_METATYPE(Ixplorer::SessionSnapshot)
