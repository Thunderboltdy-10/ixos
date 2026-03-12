#include "data/WorkstreamManager.h"

#include <QCryptographicHash>
#include <QDateTime>
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QHash>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QSet>
#include <QStandardPaths>

#include <algorithm>
#include <utility>

#include "data/ActivityTracker.h"

namespace Ixplorer {

namespace {

constexpr qint64 kSessionGapMs = 30LL * 60LL * 1000LL;
constexpr int kMaxWorkstreams = 100;

QString ensureAppDataDir() {
    QString dir = QStandardPaths::writableLocation(QStandardPaths::AppLocalDataLocation);
    if (dir.isEmpty()) {
        dir = QDir::homePath() + QStringLiteral("/.ixplorer");
    }
    QDir().mkpath(dir);
    return dir;
}

QJsonArray pairArrayToJson(const QVector<QPair<QString, int>> &pairs) {
    QJsonArray array;
    for (const auto &pair : pairs) {
        array.append(QJsonObject{
            {QStringLiteral("value"), pair.first},
            {QStringLiteral("count"), pair.second},
        });
    }
    return array;
}

QVector<QPair<QString, int>> pairArrayFromJson(const QJsonArray &array) {
    QVector<QPair<QString, int>> pairs;
    pairs.reserve(array.size());
    for (const QJsonValue &value : array) {
        const QJsonObject object = value.toObject();
        pairs.append(qMakePair(object.value(QStringLiteral("value")).toString(),
                               object.value(QStringLiteral("count")).toInt()));
    }
    return pairs;
}

QJsonObject toJson(const Workstream &workstream) {
    return QJsonObject{
        {QStringLiteral("id"), workstream.id},
        {QStringLiteral("name"), workstream.name},
        {QStringLiteral("created_at"), QString::number(workstream.createdAt)},
        {QStringLiteral("last_active"), QString::number(workstream.lastActive)},
        {QStringLiteral("top_folders"), pairArrayToJson(workstream.topFolders)},
        {QStringLiteral("top_files"), pairArrayToJson(workstream.topFiles)},
        {QStringLiteral("is_auto"), workstream.isAuto},
        {QStringLiteral("is_pinned"), workstream.isPinned},
        {QStringLiteral("description"), workstream.description},
    };
}

Workstream fromJson(const QJsonObject &object) {
    Workstream workstream;
    workstream.id = object.value(QStringLiteral("id")).toString();
    workstream.name = object.value(QStringLiteral("name")).toString();
    workstream.createdAt = object.value(QStringLiteral("created_at")).toVariant().toLongLong();
    workstream.lastActive = object.value(QStringLiteral("last_active")).toVariant().toLongLong();
    workstream.topFolders = pairArrayFromJson(object.value(QStringLiteral("top_folders")).toArray());
    workstream.topFiles = pairArrayFromJson(object.value(QStringLiteral("top_files")).toArray());
    workstream.isAuto = object.value(QStringLiteral("is_auto")).toBool(true);
    workstream.isPinned = object.value(QStringLiteral("is_pinned")).toBool(false);
    workstream.description = object.value(QStringLiteral("description")).toString();
    return workstream;
}

QVector<QPair<QString, int>> topPairs(const QHash<QString, int> &counts, int limit = 5) {
    QVector<QPair<QString, int>> pairs;
    pairs.reserve(counts.size());
    for (auto it = counts.cbegin(); it != counts.cend(); ++it) {
        pairs.append(qMakePair(it.key(), it.value()));
    }

    std::sort(pairs.begin(), pairs.end(), [](const auto &lhs, const auto &rhs) {
        if (lhs.second == rhs.second) {
            return lhs.first < rhs.first;
        }
        return lhs.second > rhs.second;
    });

    if (pairs.size() > limit) {
        pairs.resize(limit);
    }
    return pairs;
}

QString workstreamNameFromFolders(const QVector<QPair<QString, int>> &folders) {
    if (folders.isEmpty()) {
        return QStringLiteral("Recent work");
    }
    QFileInfo info(folders.first().first);
    const QString name = info.fileName();
    return name.isEmpty() ? folders.first().first : name;
}

QString stableWorkstreamId(const QVector<QPair<QString, int>> &folders,
                           const QVector<QPair<QString, int>> &files,
                           qint64 startMs) {
    const QString seed = QStringLiteral("%1|%2|%3")
        .arg(folders.isEmpty() ? QStringLiteral("no-folder") : folders.first().first,
             files.isEmpty() ? QStringLiteral("no-file") : files.first().first,
             QString::number(startMs / (30LL * 60LL * 1000LL)));
    const QByteArray hash = QCryptographicHash::hash(seed.toUtf8(), QCryptographicHash::Sha1).toHex();
    return QStringLiteral("auto:%1").arg(QString::fromLatin1(hash.left(12)));
}

Workstream buildWorkstreamFromSession(const QVector<ActivityEvent> &session, const Workstream &existing) {
    QHash<QString, int> folderCounts;
    QHash<QString, int> fileCounts;
    QHash<QString, int> queryCounts;

    for (const ActivityEvent &event : session) {
        if (!event.filePath.isEmpty()) {
            QFileInfo info(event.filePath);
            folderCounts[info.absolutePath()] += 1;
            fileCounts[info.absoluteFilePath()] += 1;
        }
        const QString query = event.metadata.value(QStringLiteral("query")).toString();
        if (!query.isEmpty()) {
            queryCounts[query] += 1;
        }
    }

    Workstream workstream = existing;
    workstream.topFolders = topPairs(folderCounts);
    workstream.topFiles = topPairs(fileCounts);
    workstream.createdAt = session.first().timestamp;
    workstream.lastActive = session.last().timestamp;
    workstream.isAuto = true;
    workstream.name = workstream.name.isEmpty() ? workstreamNameFromFolders(workstream.topFolders) : workstream.name;
    workstream.id = workstream.id.isEmpty()
        ? stableWorkstreamId(workstream.topFolders, workstream.topFiles, workstream.createdAt)
        : workstream.id;
    if (workstream.description.isEmpty()) {
        workstream.description = queryCounts.isEmpty()
            ? QStringLiteral("Auto-clustered from recent activity")
            : QStringLiteral("Last query: %1").arg(topPairs(queryCounts, 1).first().first);
    }
    return workstream;
}

} // namespace

WorkstreamManager::WorkstreamManager(QObject *parent)
    : QObject(parent)
    , m_storagePath(ensureAppDataDir() + QStringLiteral("/workstreams_v1.json")) {
    load();
}

void WorkstreamManager::setActivityTracker(ActivityTracker *tracker) {
    m_activityTracker = tracker;
}

void WorkstreamManager::setStoragePath(const QString &path) {
    m_storagePath = path;
}

QString WorkstreamManager::storagePath() const {
    return m_storagePath;
}

bool WorkstreamManager::load() {
    QFile file(m_storagePath);
    if (!file.exists()) {
        m_workstreams.clear();
        m_currentWorkstreamId.clear();
        m_dirty = false;
        return true;
    }
    if (!file.open(QIODevice::ReadOnly)) {
        return false;
    }

    const QJsonObject root = QJsonDocument::fromJson(file.readAll()).object();
    m_currentWorkstreamId = root.value(QStringLiteral("current_workstream_id")).toString();
    m_workstreams.clear();

    const QJsonArray workstreams = root.value(QStringLiteral("workstreams")).toArray();
    m_workstreams.reserve(workstreams.size());
    for (const QJsonValue &value : workstreams) {
        m_workstreams.append(fromJson(value.toObject()));
    }
    m_dirty = false;
    emit workstreamsChanged();
    return true;
}

bool WorkstreamManager::save() {
    QJsonArray workstreams;
    for (const Workstream &workstream : m_workstreams) {
        workstreams.append(toJson(workstream));
    }

    const QJsonObject root{
        {QStringLiteral("version"), 1},
        {QStringLiteral("saved_at"), QString::number(QDateTime::currentMSecsSinceEpoch())},
        {QStringLiteral("current_workstream_id"), m_currentWorkstreamId},
        {QStringLiteral("workstreams"), workstreams},
    };

    QFileInfo info(m_storagePath);
    QDir().mkpath(info.absolutePath());

    QFile file(m_storagePath);
    if (!file.open(QIODevice::WriteOnly | QIODevice::Truncate)) {
        return false;
    }

    file.write(QJsonDocument(root).toJson(QJsonDocument::Indented));
    m_dirty = false;
    return true;
}

void WorkstreamManager::rebuild() {
    if (m_activityTracker == nullptr) {
        return;
    }

    QHash<QString, Workstream> existingById;
    QVector<Workstream> manualWorkstreams;
    for (const Workstream &workstream : std::as_const(m_workstreams)) {
        existingById.insert(workstream.id, workstream);
        if (!workstream.isAuto) {
            manualWorkstreams.append(workstream);
        }
    }

    QVector<ActivityEvent> events = m_activityTracker->events();
    if (events.isEmpty()) {
        m_workstreams = manualWorkstreams;
        m_dirty = true;
        emit workstreamsChanged();
        return;
    }

    std::sort(events.begin(), events.end(), [](const ActivityEvent &lhs, const ActivityEvent &rhs) {
        return lhs.timestamp < rhs.timestamp;
    });

    QVector<Workstream> rebuilt;
    QVector<ActivityEvent> session;
    for (const ActivityEvent &event : std::as_const(events)) {
        if (!session.isEmpty() && event.timestamp - session.last().timestamp > kSessionGapMs) {
            if (session.size() >= 2) {
                Workstream workstream = buildWorkstreamFromSession(session, Workstream());
                if (existingById.contains(workstream.id)) {
                    const Workstream &existing = existingById.value(workstream.id);
                    workstream.name = existing.name;
                    workstream.isPinned = existing.isPinned;
                    workstream.description = existing.description.isEmpty() ? workstream.description : existing.description;
                }
                rebuilt.append(workstream);
            }
            session.clear();
        }
        session.append(event);
    }

    if (session.size() >= 2) {
        Workstream workstream = buildWorkstreamFromSession(session, Workstream());
        if (existingById.contains(workstream.id)) {
            const Workstream &existing = existingById.value(workstream.id);
            workstream.name = existing.name;
            workstream.isPinned = existing.isPinned;
            workstream.description = existing.description.isEmpty() ? workstream.description : existing.description;
        }
        rebuilt.append(workstream);
    }

    rebuilt.append(manualWorkstreams);
    std::sort(rebuilt.begin(), rebuilt.end(), [](const Workstream &lhs, const Workstream &rhs) {
        if (lhs.isPinned != rhs.isPinned) {
            return lhs.isPinned;
        }
        return lhs.lastActive > rhs.lastActive;
    });

    if (rebuilt.size() > kMaxWorkstreams) {
        QVector<Workstream> kept;
        kept.reserve(kMaxWorkstreams);
        for (const Workstream &workstream : std::as_const(rebuilt)) {
            if (kept.size() < kMaxWorkstreams || workstream.isPinned) {
                kept.append(workstream);
            }
        }
        rebuilt = kept;
    }

    m_workstreams = rebuilt;
    m_dirty = true;
    emit workstreamsChanged();
}

QVector<Workstream> WorkstreamManager::workstreams() const {
    return m_workstreams;
}

Workstream WorkstreamManager::workstreamForId(const QString &id) const {
    for (const Workstream &workstream : m_workstreams) {
        if (workstream.id == id) {
            return workstream;
        }
    }
    return {};
}

QVector<Workstream> WorkstreamManager::workstreamsForPath(const QString &path) const {
    QVector<Workstream> matches;
    for (const Workstream &workstream : m_workstreams) {
        const bool inFiles = std::any_of(workstream.topFiles.cbegin(), workstream.topFiles.cend(), [&path](const auto &pair) {
            return pair.first == path;
        });
        const QFileInfo info(path);
        const bool inFolders = std::any_of(workstream.topFolders.cbegin(), workstream.topFolders.cend(), [&info](const auto &pair) {
            return pair.first == info.absolutePath();
        });
        if (inFiles || inFolders) {
            matches.append(workstream);
        }
    }
    return matches;
}

QString WorkstreamManager::currentWorkstreamId() const {
    return m_currentWorkstreamId;
}

Workstream WorkstreamManager::currentWorkstream() const {
    return workstreamForId(m_currentWorkstreamId);
}

bool WorkstreamManager::setCurrentWorkstream(const QString &id) {
    if (!id.isEmpty() && workstreamForId(id).id.isEmpty()) {
        return false;
    }
    m_currentWorkstreamId = id;
    m_dirty = true;
    emit currentWorkstreamChanged(id);
    return true;
}

bool WorkstreamManager::renameWorkstream(const QString &id, const QString &name) {
    for (Workstream &workstream : m_workstreams) {
        if (workstream.id == id) {
            workstream.name = name;
            m_dirty = true;
            emit workstreamsChanged();
            return true;
        }
    }
    return false;
}

bool WorkstreamManager::setPinned(const QString &id, bool pinned) {
    for (Workstream &workstream : m_workstreams) {
        if (workstream.id == id) {
            workstream.isPinned = pinned;
            m_dirty = true;
            emit workstreamsChanged();
            return true;
        }
    }
    return false;
}

void WorkstreamManager::upsertWorkstream(const Workstream &workstream) {
    for (Workstream &current : m_workstreams) {
        if (current.id == workstream.id) {
            current = workstream;
            m_dirty = true;
            emit workstreamsChanged();
            return;
        }
    }

    m_workstreams.append(workstream);
    m_dirty = true;
    emit workstreamsChanged();
}

} // namespace Ixplorer
