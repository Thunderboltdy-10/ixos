#include "data/ActivityTracker.h"

#include <QCryptographicHash>
#include <QDateTime>
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QStandardPaths>
#include <QUuid>

#include <algorithm>
#include <cstdlib>
#include <utility>

namespace Ixplorer {

namespace {

constexpr int kMaxEvents = 10000;
constexpr qint64 kMaxAgeMs = 30LL * 24LL * 60LL * 60LL * 1000LL;
constexpr int kIndexRebuildInterval = 100;
constexpr int kAutosaveIntervalMs = 15000;

QString ensureAppDataDir() {
    QString dir = QStandardPaths::writableLocation(QStandardPaths::AppLocalDataLocation);
    if (dir.isEmpty()) {
        dir = QDir::homePath() + QStringLiteral("/.ixplorer");
    }
    QDir().mkpath(dir);
    return dir;
}

QString actionToString(ActivityAction action) {
    switch (action) {
    case ActivityAction::FileOpened:
        return QStringLiteral("file_opened");
    case ActivityAction::FileRevealed:
        return QStringLiteral("file_revealed");
    case ActivityAction::FileModified:
        return QStringLiteral("file_modified");
    case ActivityAction::FilePinned:
        return QStringLiteral("file_pinned");
    case ActivityAction::FileUnpinned:
        return QStringLiteral("file_unpinned");
    case ActivityAction::SearchQuery:
        return QStringLiteral("search_query");
    case ActivityAction::ResultShown:
        return QStringLiteral("result_shown");
    case ActivityAction::ResultClicked:
        return QStringLiteral("result_clicked");
    case ActivityAction::TabOpened:
        return QStringLiteral("tab_opened");
    case ActivityAction::TabClosed:
        return QStringLiteral("tab_closed");
    case ActivityAction::TabSwitched:
        return QStringLiteral("tab_switched");
    case ActivityAction::SessionStart:
        return QStringLiteral("session_start");
    case ActivityAction::SessionEnd:
        return QStringLiteral("session_end");
    case ActivityAction::DirectoryChanged:
        return QStringLiteral("directory_changed");
    case ActivityAction::FilePreviewOpened:
        return QStringLiteral("file_preview_opened");
    case ActivityAction::WorkstreamSwitched:
        return QStringLiteral("workstream_switched");
    }

    return QStringLiteral("file_opened");
}

ActivityAction actionFromString(const QString &value) {
    if (value == QStringLiteral("file_revealed")) {
        return ActivityAction::FileRevealed;
    }
    if (value == QStringLiteral("file_modified")) {
        return ActivityAction::FileModified;
    }
    if (value == QStringLiteral("file_pinned")) {
        return ActivityAction::FilePinned;
    }
    if (value == QStringLiteral("file_unpinned")) {
        return ActivityAction::FileUnpinned;
    }
    if (value == QStringLiteral("search_query")) {
        return ActivityAction::SearchQuery;
    }
    if (value == QStringLiteral("result_shown")) {
        return ActivityAction::ResultShown;
    }
    if (value == QStringLiteral("result_clicked")) {
        return ActivityAction::ResultClicked;
    }
    if (value == QStringLiteral("tab_opened")) {
        return ActivityAction::TabOpened;
    }
    if (value == QStringLiteral("tab_closed")) {
        return ActivityAction::TabClosed;
    }
    if (value == QStringLiteral("tab_switched")) {
        return ActivityAction::TabSwitched;
    }
    if (value == QStringLiteral("session_start")) {
        return ActivityAction::SessionStart;
    }
    if (value == QStringLiteral("session_end")) {
        return ActivityAction::SessionEnd;
    }
    if (value == QStringLiteral("directory_changed")) {
        return ActivityAction::DirectoryChanged;
    }
    if (value == QStringLiteral("file_preview_opened")) {
        return ActivityAction::FilePreviewOpened;
    }
    if (value == QStringLiteral("workstream_switched")) {
        return ActivityAction::WorkstreamSwitched;
    }
    return ActivityAction::FileOpened;
}

QJsonObject toJson(const ActivityEvent &event) {
    return QJsonObject{
        {QStringLiteral("id"), event.id},
        {QStringLiteral("file_id"), event.fileId},
        {QStringLiteral("file_path"), event.filePath},
        {QStringLiteral("timestamp"), QString::number(event.timestamp)},
        {QStringLiteral("action"), actionToString(event.action)},
        {QStringLiteral("query_hash"), event.queryHash},
        {QStringLiteral("workstream_id"), event.workstreamId},
        {QStringLiteral("metadata"), QJsonObject::fromVariantMap(event.metadata)},
    };
}

ActivityEvent fromJson(const QJsonObject &object) {
    ActivityEvent event;
    event.id = object.value(QStringLiteral("id")).toString();
    event.fileId = object.value(QStringLiteral("file_id")).toString();
    event.filePath = object.value(QStringLiteral("file_path")).toString();
    event.timestamp = object.value(QStringLiteral("timestamp")).toVariant().toLongLong();
    event.action = actionFromString(object.value(QStringLiteral("action")).toString());
    event.queryHash = object.value(QStringLiteral("query_hash")).toString();
    event.workstreamId = object.value(QStringLiteral("workstream_id")).toString();
    event.metadata = object.value(QStringLiteral("metadata")).toObject().toVariantMap();
    return event;
}

QString normalizedPath(const QString &path) {
    if (path.isEmpty()) {
        return QString();
    }
    QFileInfo info(path);
    const QString absolutePath = info.exists()
        ? info.absoluteFilePath()
        : QDir::cleanPath(path);
    return QDir::fromNativeSeparators(absolutePath).toLower();
}

} // namespace

ActivityTracker::ActivityTracker(QObject *parent)
    : QObject(parent)
    , m_storagePath(ensureAppDataDir() + QStringLiteral("/activity_v1.json"))
    , m_autosaveTimer(new QTimer(this)) {
    m_autosaveTimer->setInterval(kAutosaveIntervalMs);
    connect(m_autosaveTimer, &QTimer::timeout, this, [this]() {
        if (m_dirty) {
            save();
        }
    });
    m_autosaveTimer->start();
    load();
}

void ActivityTracker::setStoragePath(const QString &path) {
    m_storagePath = path;
}

QString ActivityTracker::storagePath() const {
    return m_storagePath;
}

bool ActivityTracker::load() {
    QFile file(m_storagePath);
    if (!file.exists()) {
        clear();
        return true;
    }
    if (!file.open(QIODevice::ReadOnly)) {
        return false;
    }

    const QJsonDocument document = QJsonDocument::fromJson(file.readAll());
    const QJsonArray eventsArray = document.object().value(QStringLiteral("events")).toArray();

    m_events.clear();
    m_events.reserve(eventsArray.size());
    for (const QJsonValue &value : eventsArray) {
        const ActivityEvent event = fromJson(value.toObject());
        if (!event.id.isEmpty()) {
            m_events.append(event);
        }
    }

    pruneEvents();
    rebuildIndices();
    m_dirty = false;
    return true;
}

bool ActivityTracker::save() {
    QFileInfo info(m_storagePath);
    QDir().mkpath(info.absolutePath());

    QJsonArray eventsArray;
    for (const ActivityEvent &event : m_events) {
        eventsArray.append(toJson(event));
    }

    const QJsonObject root{
        {QStringLiteral("version"), 1},
        {QStringLiteral("saved_at"), QString::number(QDateTime::currentMSecsSinceEpoch())},
        {QStringLiteral("events"), eventsArray},
    };

    QFile file(m_storagePath);
    if (!file.open(QIODevice::WriteOnly | QIODevice::Truncate)) {
        return false;
    }

    file.write(QJsonDocument(root).toJson(QJsonDocument::Indented));
    m_dirty = false;
    emit activitySaved(m_storagePath);
    return true;
}

void ActivityTracker::clear() {
    m_events.clear();
    m_fileEventIndex.clear();
    m_queryEventIndex.clear();
    m_insertionsSinceRebuild = 0;
    m_dirty = false;
}

void ActivityTracker::logEvent(
    ActivityAction action,
    const QString &path,
    const QVariantMap &metadata,
    const QString &query,
    const QString &workstreamId) {
    ActivityEvent event;
    event.id = QUuid::createUuid().toString(QUuid::WithoutBraces);
    event.filePath = path;
    event.fileId = hashForPath(path);
    event.timestamp = QDateTime::currentMSecsSinceEpoch();
    event.action = action;
    event.queryHash = hashForQuery(query);
    event.workstreamId = workstreamId;
    event.metadata = metadata;

    if (!query.isEmpty()) {
        event.metadata.insert(QStringLiteral("query"), query);
    }

    appendEvent(event);
}

void ActivityTracker::logFileOpen(const QString &path, const QString &queryContext, const QString &workstreamId) {
    QVariantMap metadata;
    if (!queryContext.isEmpty()) {
        metadata.insert(QStringLiteral("query_context"), queryContext);
    }
    logEvent(ActivityAction::FileOpened, path, metadata, queryContext, workstreamId);
}

void ActivityTracker::logSearch(const QString &query, const QString &directory, const QString &workstreamId) {
    QVariantMap metadata;
    metadata.insert(QStringLiteral("directory"), directory);
    logEvent(ActivityAction::SearchQuery, QString(), metadata, query, workstreamId);
}

void ActivityTracker::logResultClick(const QString &path, const QString &query, const QString &workstreamId) {
    logEvent(ActivityAction::ResultClicked, path, QVariantMap(), query, workstreamId);
}

void ActivityTracker::logTabSwitch(const QString &path, const QString &workstreamId) {
    logEvent(ActivityAction::TabSwitched, path, QVariantMap(), QString(), workstreamId);
}

void ActivityTracker::logDirectoryChange(const QString &path, const QString &workstreamId) {
    logEvent(ActivityAction::DirectoryChanged, path, QVariantMap(), QString(), workstreamId);
}

QVector<ActivityEvent> ActivityTracker::getActivity(qint64 sinceMs, int limit) const {
    QVector<ActivityEvent> filtered;
    filtered.reserve(limit > 0 ? qMin(limit, m_events.size()) : m_events.size());

    for (int i = m_events.size() - 1; i >= 0; --i) {
        const ActivityEvent &event = m_events.at(i);
        if (sinceMs > 0 && event.timestamp < sinceMs) {
            break;
        }
        filtered.append(event);
        if (limit > 0 && filtered.size() >= limit) {
            break;
        }
    }

    std::reverse(filtered.begin(), filtered.end());
    return filtered;
}

QVector<RecentFileEntry> ActivityTracker::getRecentFiles(int limit) const {
    QHash<QString, RecentFileEntry> aggregated;
    for (const ActivityEvent &event : std::as_const(m_events)) {
        if (event.filePath.isEmpty()) {
            continue;
        }

        RecentFileEntry &entry = aggregated[event.fileId];
        entry.fileId = event.fileId;
        entry.filePath = event.filePath;
        entry.touchCount += 1;
        entry.lastTouched = qMax(entry.lastTouched, event.timestamp);
    }

    QVector<RecentFileEntry> entries = aggregated.values().toVector();
    std::sort(entries.begin(), entries.end(), [](const RecentFileEntry &lhs, const RecentFileEntry &rhs) {
        if (lhs.lastTouched == rhs.lastTouched) {
            return lhs.touchCount > rhs.touchCount;
        }
        return lhs.lastTouched > rhs.lastTouched;
    });

    if (limit > 0 && entries.size() > limit) {
        entries.resize(limit);
    }
    return entries;
}

QVector<QPair<QString, int>> ActivityTracker::getCoOccurrences(const QString &path, int windowMins) const {
    const QString sourceId = hashForPath(path);
    if (sourceId.isEmpty()) {
        return {};
    }

    const QVector<int> sourceIndices = m_fileEventIndex.value(sourceId);
    if (sourceIndices.isEmpty()) {
        return {};
    }

    const qint64 windowMs = qMax(1, windowMins) * 60LL * 1000LL;
    const int maxSourceSamples = qMin(sourceIndices.size(), 1000);
    const int timelineStart = qMax(0, m_events.size() - 5000);

    QHash<QString, int> counts;
    QHash<QString, QString> latestPathForId;

    for (int sample = sourceIndices.size() - maxSourceSamples; sample < sourceIndices.size(); ++sample) {
        const ActivityEvent &sourceEvent = m_events.at(sourceIndices.at(sample));
        for (int i = timelineStart; i < m_events.size(); ++i) {
            const ActivityEvent &other = m_events.at(i);
            if (other.fileId.isEmpty() || other.fileId == sourceId) {
                continue;
            }
            if (std::abs(other.timestamp - sourceEvent.timestamp) > windowMs) {
                continue;
            }
            counts[other.fileId] += 1;
            latestPathForId[other.fileId] = other.filePath;
        }
    }

    QVector<QPair<QString, int>> pairs;
    pairs.reserve(counts.size());
    for (auto it = counts.cbegin(); it != counts.cend(); ++it) {
        pairs.append(qMakePair(latestPathForId.value(it.key()), it.value()));
    }

    std::sort(pairs.begin(), pairs.end(), [](const QPair<QString, int> &lhs, const QPair<QString, int> &rhs) {
        if (lhs.second == rhs.second) {
            return lhs.first < rhs.first;
        }
        return lhs.second > rhs.second;
    });
    return pairs;
}

const QVector<ActivityEvent> &ActivityTracker::events() const {
    return m_events;
}

QString ActivityTracker::hashForPath(const QString &path) {
    const QString normalized = normalizedPath(path);
    if (normalized.isEmpty()) {
        return QString();
    }

    return QString::fromLatin1(
        QCryptographicHash::hash(normalized.toUtf8(), QCryptographicHash::Sha1).toHex());
}

QString ActivityTracker::hashForQuery(const QString &query) {
    const QString normalized = query.simplified().toLower();
    if (normalized.isEmpty()) {
        return QString();
    }

    return QString::fromLatin1(
        QCryptographicHash::hash(normalized.toUtf8(), QCryptographicHash::Sha1).toHex());
}

void ActivityTracker::appendEvent(ActivityEvent event) {
    if (event.id.isEmpty()) {
        event.id = QUuid::createUuid().toString(QUuid::WithoutBraces);
    }
    if (!event.filePath.isEmpty() && event.fileId.isEmpty()) {
        event.fileId = hashForPath(event.filePath);
    }

    m_events.append(event);
    pruneEvents();
    m_dirty = true;
    m_insertionsSinceRebuild += 1;

    if (m_insertionsSinceRebuild >= kIndexRebuildInterval) {
        rebuildIndices();
        m_insertionsSinceRebuild = 0;
    } else {
        const int index = m_events.size() - 1;
        if (!event.fileId.isEmpty()) {
            m_fileEventIndex[event.fileId].append(index);
        }
        if (!event.queryHash.isEmpty()) {
            m_queryEventIndex[event.queryHash].append(index);
        }
    }

    emit activityLogged(event);
    scheduleAutosave();
}

void ActivityTracker::pruneEvents() {
    const qint64 cutoff = QDateTime::currentMSecsSinceEpoch() - kMaxAgeMs;
    QVector<ActivityEvent> kept;
    kept.reserve(qMin(m_events.size(), kMaxEvents));

    for (const ActivityEvent &event : std::as_const(m_events)) {
        if (event.timestamp >= cutoff) {
            kept.append(event);
        }
    }

    if (kept.size() > kMaxEvents) {
        kept = kept.mid(kept.size() - kMaxEvents);
    }

    if (kept.size() != m_events.size()) {
        m_events = kept;
        rebuildIndices();
        m_insertionsSinceRebuild = 0;
    }
}

void ActivityTracker::rebuildIndices() {
    m_fileEventIndex.clear();
    m_queryEventIndex.clear();

    for (int i = 0; i < m_events.size(); ++i) {
        const ActivityEvent &event = m_events.at(i);
        if (!event.fileId.isEmpty()) {
            m_fileEventIndex[event.fileId].append(i);
        }
        if (!event.queryHash.isEmpty()) {
            m_queryEventIndex[event.queryHash].append(i);
        }
    }
}

void ActivityTracker::scheduleAutosave() {
    if (!m_autosaveTimer->isActive()) {
        m_autosaveTimer->start();
    }
}

} // namespace Ixplorer
