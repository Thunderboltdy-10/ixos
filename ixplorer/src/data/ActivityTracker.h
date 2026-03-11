#pragma once

#include <QObject>
#include <QHash>
#include <QPair>
#include <QString>
#include <QTimer>
#include <QVariantMap>
#include <QVector>

namespace Ixplorer {

enum class ActivityAction : int {
    FileOpened,
    FileRevealed,
    FileModified,
    FilePinned,
    FileUnpinned,
    SearchQuery,
    ResultShown,
    ResultClicked,
    TabOpened,
    TabClosed,
    TabSwitched,
    SessionStart,
    SessionEnd,
    DirectoryChanged,
    FilePreviewOpened,
    WorkstreamSwitched
};

struct ActivityEvent {
    QString id;
    QString fileId;
    QString filePath;
    qint64 timestamp = 0;
    ActivityAction action = ActivityAction::FileOpened;
    QString queryHash;
    QString workstreamId;
    QVariantMap metadata;
};

struct RecentFileEntry {
    QString fileId;
    QString filePath;
    int touchCount = 0;
    qint64 lastTouched = 0;
};

class ActivityTracker : public QObject {
    Q_OBJECT
public:
    explicit ActivityTracker(QObject *parent = nullptr);

    void setStoragePath(const QString &path);
    QString storagePath() const;

    bool load();
    bool save();

    void clear();

    void logEvent(
        ActivityAction action,
        const QString &path = QString(),
        const QVariantMap &metadata = QVariantMap(),
        const QString &query = QString(),
        const QString &workstreamId = QString());
    void logFileOpen(const QString &path, const QString &queryContext = QString(), const QString &workstreamId = QString());
    void logSearch(const QString &query, const QString &directory, const QString &workstreamId = QString());
    void logResultClick(const QString &path, const QString &query = QString(), const QString &workstreamId = QString());
    void logTabSwitch(const QString &path, const QString &workstreamId = QString());
    void logDirectoryChange(const QString &path, const QString &workstreamId = QString());

    QVector<ActivityEvent> getActivity(qint64 sinceMs = 0, int limit = 200) const;
    QVector<RecentFileEntry> getRecentFiles(int limit = 8) const;
    QVector<QPair<QString, int>> getCoOccurrences(const QString &path, int windowMins = 30) const;
    const QVector<ActivityEvent> &events() const;

    static QString hashForPath(const QString &path);
    static QString hashForQuery(const QString &query);

signals:
    void activityLogged(const Ixplorer::ActivityEvent &event);
    void activitySaved(const QString &path);

private:
    void appendEvent(ActivityEvent event);
    void pruneEvents();
    void rebuildIndices();
    void scheduleAutosave();

    QVector<ActivityEvent> m_events;
    QHash<QString, QVector<int>> m_fileEventIndex;
    QHash<QString, QVector<int>> m_queryEventIndex;
    QString m_storagePath;
    QTimer *m_autosaveTimer = nullptr;
    bool m_dirty = false;
    int m_insertionsSinceRebuild = 0;
};

} // namespace Ixplorer

Q_DECLARE_METATYPE(Ixplorer::ActivityEvent)
Q_DECLARE_METATYPE(Ixplorer::RecentFileEntry)
