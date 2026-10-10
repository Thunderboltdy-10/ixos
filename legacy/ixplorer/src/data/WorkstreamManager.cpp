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
#include <QQueue>
#include <QSet>
#include <QStandardPaths>

#include <algorithm>
#include <cmath>
#include <utility>

#include "data/ActivityTracker.h"

namespace Ixplorer {

namespace {

constexpr qint64 kSessionGapMs = 25LL * 60LL * 1000LL;
constexpr qint64 kLookbackMs = 45LL * 24LL * 60LL * 60LL * 1000LL;
constexpr qint64 kEdgeDecayMs = 10LL * 24LL * 60LL * 60LL * 1000LL;
constexpr qint64 kTransitionTauMs = 3LL * 60LL * 1000LL;
constexpr int kMaxWorkstreams = 120;
constexpr int kMaxRelatedPerNode = 24;
constexpr int kMaxClusterSize = 14;
constexpr float kClusterEdgeThreshold = 0.16f;
const QChar kEdgeSep = QChar(0x1F);

struct NodeStats {
    int openCount = 0;
    qint64 firstSeen = 0;
    qint64 lastSeen = 0;
    float degree = 0.0f;
    float recency = 0.0f;
    bool pinned = false;
    QHash<QString, int> queryCounts;
};

struct EdgeStats {
    float coOpen = 0.0f;
    float temporal = 0.0f;
    float sameSession = 0.0f;
    float queryCoOccurrence = 0.0f;
    float pinAffinity = 0.0f;
    qint64 lastTouched = 0;
    QHash<QString, int> workstreamVotes;
};

QString ensureAppDataDir() {
    QString dir = QStandardPaths::writableLocation(QStandardPaths::AppLocalDataLocation);
    if (dir.isEmpty()) {
        dir = QDir::homePath() + QStringLiteral("/.ixplorer");
    }
    QDir().mkpath(dir);
    return dir;
}

QString normalizedPath(const QString &path) {
    if (path.isEmpty()) {
        return QString();
    }
    const QFileInfo info(path);
    const QString absolutePath = info.exists() ? info.absoluteFilePath() : QDir::cleanPath(path);
    return QDir::fromNativeSeparators(absolutePath);
}

bool isFileInteraction(const ActivityEvent &event) {
    if (event.filePath.isEmpty()) {
        return false;
    }
    switch (event.action) {
    case ActivityAction::FileOpened:
    case ActivityAction::ResultClicked:
    case ActivityAction::TabSwitched:
    case ActivityAction::FilePreviewOpened:
    case ActivityAction::FilePinned:
        return true;
    default:
        return false;
    }
}

QString canonicalQuery(const ActivityEvent &event) {
    const QString direct = event.metadata.value(QStringLiteral("query")).toString().trimmed().toLower();
    if (!direct.isEmpty()) {
        return direct;
    }
    return event.metadata.value(QStringLiteral("query_context")).toString().trimmed().toLower();
}

QString edgeKey(const QString &left, const QString &right) {
    if (left <= right) {
        return left + kEdgeSep + right;
    }
    return right + kEdgeSep + left;
}

QPair<QString, QString> splitEdgeKey(const QString &key) {
    const int idx = key.indexOf(kEdgeSep);
    if (idx <= 0 || idx >= key.size() - 1) {
        return qMakePair(QString(), QString());
    }
    return qMakePair(key.left(idx), key.mid(idx + 1));
}

float expDecay(qint64 ageMs, qint64 tauMs) {
    if (ageMs <= 0) {
        return 1.0f;
    }
    return static_cast<float>(std::exp(-static_cast<double>(ageMs) / static_cast<double>(tauMs)));
}

QJsonArray intPairArrayToJson(const QVector<QPair<QString, int>> &pairs) {
    QJsonArray array;
    for (const auto &pair : pairs) {
        array.append(QJsonObject{
            {QStringLiteral("value"), pair.first},
            {QStringLiteral("count"), pair.second},
        });
    }
    return array;
}

QVector<QPair<QString, int>> intPairArrayFromJson(const QJsonArray &array) {
    QVector<QPair<QString, int>> pairs;
    pairs.reserve(array.size());
    for (const QJsonValue &value : array) {
        const QJsonObject object = value.toObject();
        pairs.append(qMakePair(object.value(QStringLiteral("value")).toString(),
                               object.value(QStringLiteral("count")).toInt()));
    }
    return pairs;
}

QJsonArray floatPairArrayToJson(const QVector<QPair<QString, float>> &pairs) {
    QJsonArray array;
    for (const auto &pair : pairs) {
        array.append(QJsonObject{
            {QStringLiteral("value"), pair.first},
            {QStringLiteral("score"), pair.second},
        });
    }
    return array;
}

QVector<QPair<QString, float>> floatPairArrayFromJson(const QJsonArray &array) {
    QVector<QPair<QString, float>> pairs;
    pairs.reserve(array.size());
    for (const QJsonValue &value : array) {
        const QJsonObject object = value.toObject();
        pairs.append(qMakePair(object.value(QStringLiteral("value")).toString(),
                               static_cast<float>(object.value(QStringLiteral("score")).toDouble())));
    }
    return pairs;
}

QJsonObject toJson(const Workstream &workstream) {
    return QJsonObject{
        {QStringLiteral("id"), workstream.id},
        {QStringLiteral("name"), workstream.name},
        {QStringLiteral("created_at"), QString::number(workstream.createdAt)},
        {QStringLiteral("last_active"), QString::number(workstream.lastActive)},
        {QStringLiteral("top_folders"), intPairArrayToJson(workstream.topFolders)},
        {QStringLiteral("top_files"), intPairArrayToJson(workstream.topFiles)},
        {QStringLiteral("top_queries"), floatPairArrayToJson(workstream.topQueries)},
        {QStringLiteral("is_auto"), workstream.isAuto},
        {QStringLiteral("is_pinned"), workstream.isPinned},
        {QStringLiteral("description"), workstream.description},
        {QStringLiteral("cohesion"), workstream.cohesion},
        {QStringLiteral("confidence"), workstream.confidence},
        {QStringLiteral("member_count"), workstream.memberCount},
    };
}

Workstream fromJson(const QJsonObject &object) {
    Workstream workstream;
    workstream.id = object.value(QStringLiteral("id")).toString();
    workstream.name = object.value(QStringLiteral("name")).toString();
    workstream.createdAt = object.value(QStringLiteral("created_at")).toVariant().toLongLong();
    workstream.lastActive = object.value(QStringLiteral("last_active")).toVariant().toLongLong();
    workstream.topFolders = intPairArrayFromJson(object.value(QStringLiteral("top_folders")).toArray());
    workstream.topFiles = intPairArrayFromJson(object.value(QStringLiteral("top_files")).toArray());
    workstream.topQueries = floatPairArrayFromJson(object.value(QStringLiteral("top_queries")).toArray());
    workstream.isAuto = object.value(QStringLiteral("is_auto")).toBool(true);
    workstream.isPinned = object.value(QStringLiteral("is_pinned")).toBool(false);
    workstream.description = object.value(QStringLiteral("description")).toString();
    workstream.cohesion = static_cast<float>(object.value(QStringLiteral("cohesion")).toDouble());
    workstream.confidence = static_cast<float>(object.value(QStringLiteral("confidence")).toDouble());
    workstream.memberCount = object.value(QStringLiteral("member_count")).toInt();
    return workstream;
}

QVector<QPair<QString, int>> topIntPairs(const QHash<QString, float> &weights, int limit = 6) {
    QVector<QPair<QString, float>> pairs;
    pairs.reserve(weights.size());
    for (auto it = weights.cbegin(); it != weights.cend(); ++it) {
        pairs.append(qMakePair(it.key(), it.value()));
    }

    std::sort(pairs.begin(), pairs.end(), [](const auto &lhs, const auto &rhs) {
        if (qFuzzyCompare(lhs.second, rhs.second)) {
            return lhs.first < rhs.first;
        }
        return lhs.second > rhs.second;
    });

    if (pairs.size() > limit) {
        pairs.resize(limit);
    }

    QVector<QPair<QString, int>> output;
    output.reserve(pairs.size());
    for (const auto &pair : std::as_const(pairs)) {
        output.append(qMakePair(pair.first, qMax(1, static_cast<int>(std::round(pair.second)))));
    }
    return output;
}

QVector<QPair<QString, float>> topFloatPairs(const QHash<QString, float> &weights, int limit = 5) {
    QVector<QPair<QString, float>> pairs;
    pairs.reserve(weights.size());
    for (auto it = weights.cbegin(); it != weights.cend(); ++it) {
        pairs.append(qMakePair(it.key(), it.value()));
    }

    std::sort(pairs.begin(), pairs.end(), [](const auto &lhs, const auto &rhs) {
        if (qFuzzyCompare(lhs.second, rhs.second)) {
            return lhs.first < rhs.first;
        }
        return lhs.second > rhs.second;
    });

    if (pairs.size() > limit) {
        pairs.resize(limit);
    }
    return pairs;
}

QString workstreamNameFromContext(const QVector<QPair<QString, int>> &folders,
                                  const QVector<QPair<QString, float>> &queries) {
    if (!queries.isEmpty() && !queries.first().first.isEmpty()) {
        const QString query = queries.first().first;
        return query.size() > 36 ? query.left(33) + QStringLiteral("...") : query;
    }
    if (!folders.isEmpty()) {
        QFileInfo info(folders.first().first);
        const QString name = info.fileName();
        return name.isEmpty() ? folders.first().first : name;
    }
    return QStringLiteral("Recent work");
}

QString stableWorkstreamId(const QVector<QPair<QString, int>> &folders,
                           const QVector<QPair<QString, int>> &files,
                           qint64 startMs) {
    const QString seed = QStringLiteral("%1|%2|%3")
        .arg(folders.isEmpty() ? QStringLiteral("no-folder") : folders.first().first,
             files.isEmpty() ? QStringLiteral("no-file") : files.first().first,
             QString::number(startMs / (4LL * 60LL * 60LL * 1000LL)));
    const QByteArray hash = QCryptographicHash::hash(seed.toUtf8(), QCryptographicHash::Sha1).toHex();
    return QStringLiteral("graph:%1").arg(QString::fromLatin1(hash.left(14)));
}

float normalizeComponent(float value, float maxValue) {
    if (maxValue <= 0.0f) {
        return 0.0f;
    }
    return std::clamp(value / maxValue, 0.0f, 1.0f);
}

QString relationshipReason(const RelationshipSignal &signal) {
    QVector<QPair<QString, float>> parts{
        qMakePair(QStringLiteral("co-opened repeatedly"), signal.coOpen),
        qMakePair(QStringLiteral("opened in tight sequence"), signal.temporal),
        qMakePair(QStringLiteral("reused in same sessions"), signal.sameSession),
        qMakePair(QStringLiteral("retrieved by same queries"), signal.queryCoOccurrence),
        qMakePair(QStringLiteral("reinforced by pinning"), signal.pinAffinity),
    };
    std::sort(parts.begin(), parts.end(), [](const auto &lhs, const auto &rhs) {
        return lhs.second > rhs.second;
    });

    QStringList summary;
    for (const auto &part : std::as_const(parts)) {
        if (part.second < 0.18f) {
            continue;
        }
        summary.append(part.first);
        if (summary.size() >= 2) {
            break;
        }
    }
    return summary.isEmpty()
        ? QStringLiteral("weakly connected by nearby activity")
        : summary.join(QStringLiteral(" + "));
}

QString buildGraphSignature(const QVector<Workstream> &workstreams,
                           const QHash<QString, QVector<RelationshipSignal>> &relatedCache,
                           int sourceEventCount) {
    QStringList rows;
    rows.append(QStringLiteral("events:%1").arg(QString::number(sourceEventCount)));

    QVector<Workstream> sortedWorkstreams = workstreams;
    std::sort(sortedWorkstreams.begin(), sortedWorkstreams.end(), [](const Workstream &lhs, const Workstream &rhs) {
        return lhs.id < rhs.id;
    });
    for (const Workstream &workstream : std::as_const(sortedWorkstreams)) {
        QStringList topFiles;
        const int topLimit = qMin(3, workstream.topFiles.size());
        for (int i = 0; i < topLimit; ++i) {
            topFiles.append(normalizedPath(workstream.topFiles.at(i).first));
        }
        rows.append(QStringLiteral("ws:%1|%2|%3|%4|%5")
                        .arg(workstream.id,
                             QString::number(workstream.lastActive),
                             QString::number(workstream.cohesion, 'f', 4),
                             QString::number(workstream.memberCount),
                             topFiles.join(QStringLiteral(","))));
    }

    QStringList relatedKeys = relatedCache.keys();
    std::sort(relatedKeys.begin(), relatedKeys.end());
    for (const QString &path : std::as_const(relatedKeys)) {
        QVector<RelationshipSignal> related = relatedCache.value(path);
        std::sort(related.begin(), related.end(), [](const RelationshipSignal &lhs, const RelationshipSignal &rhs) {
            if (qFuzzyCompare(lhs.score, rhs.score)) {
                return lhs.path < rhs.path;
            }
            return lhs.score > rhs.score;
        });
        const int topLimit = qMin(4, related.size());
        for (int i = 0; i < topLimit; ++i) {
            const RelationshipSignal &signal = related.at(i);
            rows.append(QStringLiteral("rel:%1|%2|%3")
                            .arg(path,
                                 normalizedPath(signal.path),
                                 QString::number(signal.score, 'f', 4)));
        }
    }

    return QString::fromLatin1(QCryptographicHash::hash(rows.join(QStringLiteral("\n")).toUtf8(),
                                                        QCryptographicHash::Sha1)
                                   .toHex());
}

} // namespace

WorkstreamManager::WorkstreamManager(QObject *parent)
    : QObject(parent)
    , m_storagePath(ensureAppDataDir() + QStringLiteral("/workstreams_v2.json")) {
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
        m_relatedCache.clear();
        m_pathWorkstreamCache.clear();
        m_currentWorkstreamId.clear();
        m_graphSignature.clear();
        m_replaySourceEventCount = 0;
        m_lastRebuildTimestamp = 0;
        m_dirty = false;
        return true;
    }
    if (!file.open(QIODevice::ReadOnly)) {
        return false;
    }

    const QJsonObject root = QJsonDocument::fromJson(file.readAll()).object();
    m_currentWorkstreamId = root.value(QStringLiteral("current_workstream_id")).toString();
    m_graphSignature = root.value(QStringLiteral("graph_signature")).toString();
    m_replaySourceEventCount = root.value(QStringLiteral("source_event_count")).toInt(0);
    m_lastRebuildTimestamp = root.value(QStringLiteral("last_rebuild_at")).toVariant().toLongLong();
    m_workstreams.clear();
    m_relatedCache.clear();
    m_pathWorkstreamCache.clear();

    const QJsonArray workstreams = root.value(QStringLiteral("workstreams")).toArray();
    m_workstreams.reserve(workstreams.size());
    for (const QJsonValue &value : workstreams) {
        const Workstream workstream = fromJson(value.toObject());
        if (workstream.id.isEmpty()) {
            continue;
        }
        m_workstreams.append(workstream);
        for (const auto &filePair : workstream.topFiles) {
            const QString path = normalizedPath(filePair.first);
            if (!path.isEmpty() && !m_pathWorkstreamCache.contains(path)) {
                m_pathWorkstreamCache.insert(path, workstream.id);
            }
        }
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
        {QStringLiteral("version"), 2},
        {QStringLiteral("saved_at"), QString::number(QDateTime::currentMSecsSinceEpoch())},
        {QStringLiteral("graph_signature"), m_graphSignature},
        {QStringLiteral("source_event_count"), m_replaySourceEventCount},
        {QStringLiteral("last_rebuild_at"), QString::number(m_lastRebuildTimestamp)},
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
        const qint64 now = QDateTime::currentMSecsSinceEpoch();
        m_relatedCache.clear();
        m_pathWorkstreamCache.clear();
        m_workstreams = manualWorkstreams;
        m_graphSignature = buildGraphSignature(m_workstreams, m_relatedCache, 0);
        m_replaySourceEventCount = 0;
        m_lastRebuildTimestamp = now;
        m_dirty = true;
        emit workstreamsChanged();
        return;
    }

    std::sort(events.begin(), events.end(), [](const ActivityEvent &lhs, const ActivityEvent &rhs) {
        return lhs.timestamp < rhs.timestamp;
    });
    const qint64 now = QDateTime::currentMSecsSinceEpoch();
    const qint64 cutoff = now - kLookbackMs;
    int sourceEventCount = 0;

    QHash<QString, NodeStats> nodes;
    QHash<QString, EdgeStats> edges;
    QVector<ActivityEvent> session;

    auto flushSession = [&](const QVector<ActivityEvent> &sessionEvents) {
        if (sessionEvents.size() < 2) {
            return;
        }

        QHash<QString, int> touchCounts;
        QHash<QString, QSet<QString>> queryToFiles;
        QVector<ActivityEvent> fileEvents;
        fileEvents.reserve(sessionEvents.size());

        for (const ActivityEvent &event : sessionEvents) {
            const QString path = normalizedPath(event.filePath);
            if (!isFileInteraction(event) || path.isEmpty()) {
                continue;
            }

            touchCounts[path] += 1;
            fileEvents.append(event);

            const QString query = canonicalQuery(event);
            if (!query.isEmpty()) {
                queryToFiles[query].insert(path);
            }
        }

        const QStringList uniquePaths = touchCounts.keys();
        for (int i = 0; i < uniquePaths.size(); ++i) {
            for (int j = i + 1; j < uniquePaths.size(); ++j) {
                const QString &left = uniquePaths.at(i);
                const QString &right = uniquePaths.at(j);
                EdgeStats &edge = edges[edgeKey(left, right)];
                edge.coOpen += static_cast<float>(std::sqrt(static_cast<double>(touchCounts.value(left) * touchCounts.value(right))));
                edge.sameSession += 1.0f + 0.2f * static_cast<float>(qMax(0, qMin(touchCounts.value(left), touchCounts.value(right)) - 1));
                edge.lastTouched = qMax(edge.lastTouched, sessionEvents.last().timestamp);
            }
        }

        for (int i = 1; i < fileEvents.size(); ++i) {
            const QString prevPath = normalizedPath(fileEvents.at(i - 1).filePath);
            const QString currPath = normalizedPath(fileEvents.at(i).filePath);
            if (prevPath.isEmpty() || currPath.isEmpty() || prevPath == currPath) {
                continue;
            }
            const qint64 dt = qMax<qint64>(0, fileEvents.at(i).timestamp - fileEvents.at(i - 1).timestamp);
            if (dt > 20LL * 60LL * 1000LL) {
                continue;
            }
            EdgeStats &edge = edges[edgeKey(prevPath, currPath)];
            edge.temporal += expDecay(dt, kTransitionTauMs);
            edge.lastTouched = qMax(edge.lastTouched, fileEvents.at(i).timestamp);
        }

        for (auto it = queryToFiles.cbegin(); it != queryToFiles.cend(); ++it) {
            const QStringList members = it.value().values();
            if (members.size() < 2) {
                continue;
            }
            const float queryWeight = 1.0f / std::sqrt(static_cast<float>(members.size()));
            for (int i = 0; i < members.size(); ++i) {
                for (int j = i + 1; j < members.size(); ++j) {
                    EdgeStats &edge = edges[edgeKey(members.at(i), members.at(j))];
                    edge.queryCoOccurrence += queryWeight;
                    edge.lastTouched = qMax(edge.lastTouched, sessionEvents.last().timestamp);
                }
            }
        }

        for (int i = 0; i < fileEvents.size(); ++i) {
            const ActivityEvent &event = fileEvents.at(i);
            if (event.action != ActivityAction::FilePinned) {
                continue;
            }
            const QString pinnedPath = normalizedPath(event.filePath);
            if (pinnedPath.isEmpty()) {
                continue;
            }

            for (int j = qMax(0, i - 8); j < i; ++j) {
                const ActivityEvent &neighbor = fileEvents.at(j);
                const QString neighborPath = normalizedPath(neighbor.filePath);
                if (neighborPath.isEmpty() || neighborPath == pinnedPath) {
                    continue;
                }
                if (event.timestamp - neighbor.timestamp > 10LL * 60LL * 1000LL) {
                    continue;
                }
                EdgeStats &edge = edges[edgeKey(pinnedPath, neighborPath)];
                edge.pinAffinity += 1.0f;
                edge.lastTouched = qMax(edge.lastTouched, event.timestamp);
            }
        }
    };

    for (const ActivityEvent &event : events) {
        if (event.timestamp < cutoff) {
            continue;
        }
        sourceEventCount += 1;

        const QString path = normalizedPath(event.filePath);
        if (isFileInteraction(event) && !path.isEmpty()) {
            NodeStats &node = nodes[path];
            node.openCount += 1;
            node.firstSeen = node.firstSeen == 0 ? event.timestamp : qMin(node.firstSeen, event.timestamp);
            node.lastSeen = qMax(node.lastSeen, event.timestamp);
            node.recency += expDecay(now - event.timestamp, 18LL * 60LL * 60LL * 1000LL);
            node.pinned = node.pinned || event.action == ActivityAction::FilePinned;
            const QString query = canonicalQuery(event);
            if (!query.isEmpty()) {
                node.queryCounts[query] += 1;
            }
        }

        if (!session.isEmpty() && event.timestamp - session.last().timestamp > kSessionGapMs) {
            flushSession(session);
            session.clear();
        }
        session.append(event);
    }
    flushSession(session);

    float maxCoOpen = 0.0f;
    float maxTemporal = 0.0f;
    float maxSession = 0.0f;
    float maxQuery = 0.0f;
    float maxPin = 0.0f;
    for (auto it = edges.cbegin(); it != edges.cend(); ++it) {
        maxCoOpen = qMax(maxCoOpen, static_cast<float>(std::log1p(it.value().coOpen)));
        maxTemporal = qMax(maxTemporal, it.value().temporal);
        maxSession = qMax(maxSession, it.value().sameSession);
        maxQuery = qMax(maxQuery, it.value().queryCoOccurrence);
        maxPin = qMax(maxPin, it.value().pinAffinity);
    }

    m_relatedCache.clear();
    m_pathWorkstreamCache.clear();

    for (auto it = edges.cbegin(); it != edges.cend(); ++it) {
        const auto edgePaths = splitEdgeKey(it.key());
        const QString &left = edgePaths.first;
        const QString &right = edgePaths.second;
        if (left.isEmpty() || right.isEmpty()) {
            continue;
        }

        const EdgeStats &edge = it.value();
        const float coOpenNorm = normalizeComponent(static_cast<float>(std::log1p(edge.coOpen)), maxCoOpen);
        const float temporalNorm = normalizeComponent(edge.temporal, maxTemporal);
        const float sessionNorm = normalizeComponent(edge.sameSession, maxSession);
        const float queryNorm = normalizeComponent(edge.queryCoOccurrence, maxQuery);
        const float pinNorm = normalizeComponent(edge.pinAffinity, maxPin);
        const float ageDecay = expDecay(now - edge.lastTouched, kEdgeDecayMs);
        const float score = ageDecay *
            (0.30f * coOpenNorm + 0.24f * temporalNorm + 0.22f * sessionNorm + 0.14f * queryNorm + 0.10f * pinNorm);
        if (score < 0.05f) {
            continue;
        }

        RelationshipSignal leftToRight;
        leftToRight.path = right;
        leftToRight.score = score;
        leftToRight.coOpen = coOpenNorm;
        leftToRight.temporal = temporalNorm;
        leftToRight.sameSession = sessionNorm;
        leftToRight.queryCoOccurrence = queryNorm;
        leftToRight.pinAffinity = pinNorm;
        leftToRight.reason = relationshipReason(leftToRight);

        RelationshipSignal rightToLeft = leftToRight;
        rightToLeft.path = left;

        m_relatedCache[left].append(leftToRight);
        m_relatedCache[right].append(rightToLeft);
        nodes[left].degree += score;
        nodes[right].degree += score;
    }

    for (auto it = m_relatedCache.begin(); it != m_relatedCache.end(); ++it) {
        auto &links = it.value();
        std::sort(links.begin(), links.end(), [](const RelationshipSignal &lhs, const RelationshipSignal &rhs) {
            if (qFuzzyCompare(lhs.score, rhs.score)) {
                return lhs.path < rhs.path;
            }
            return lhs.score > rhs.score;
        });
        if (links.size() > kMaxRelatedPerNode) {
            links.resize(kMaxRelatedPerNode);
        }
    }

    QVector<QString> seedPaths = nodes.keys().toVector();
    int maxOpenCount = 1;
    for (auto it = nodes.cbegin(); it != nodes.cend(); ++it) {
        maxOpenCount = qMax(maxOpenCount, it.value().openCount);
    }

    std::sort(seedPaths.begin(), seedPaths.end(), [&nodes, maxOpenCount](const QString &lhs, const QString &rhs) {
        const NodeStats &left = nodes.value(lhs);
        const NodeStats &right = nodes.value(rhs);
        const float leftScore =
            0.60f * left.degree +
            0.25f * std::clamp(left.recency / 3.0f, 0.0f, 1.0f) +
            0.15f * (static_cast<float>(left.openCount) / static_cast<float>(maxOpenCount)) +
            (left.pinned ? 0.08f : 0.0f);
        const float rightScore =
            0.60f * right.degree +
            0.25f * std::clamp(right.recency / 3.0f, 0.0f, 1.0f) +
            0.15f * (static_cast<float>(right.openCount) / static_cast<float>(maxOpenCount)) +
            (right.pinned ? 0.08f : 0.0f);
        return leftScore > rightScore;
    });

    QVector<QVector<QString>> clusters;
    QSet<QString> assigned;
    for (const QString &seed : seedPaths) {
        if (assigned.contains(seed)) {
            continue;
        }
        QVector<QString> cluster;
        QQueue<QString> frontier;
        frontier.enqueue(seed);
        assigned.insert(seed);

        while (!frontier.isEmpty() && cluster.size() < kMaxClusterSize) {
            const QString current = frontier.dequeue();
            cluster.append(current);
            const auto neighbors = m_relatedCache.value(current);
            for (const RelationshipSignal &neighbor : neighbors) {
                const QString neighborPath = normalizedPath(neighbor.path);
                if (neighborPath.isEmpty() || assigned.contains(neighborPath)) {
                    continue;
                }
                const bool edgeStrong = neighbor.score >= kClusterEdgeThreshold;
                const bool pinStrong = nodes.value(neighborPath).pinned && neighbor.score >= 0.10f;
                if (!edgeStrong && !pinStrong) {
                    continue;
                }
                assigned.insert(neighborPath);
                frontier.enqueue(neighborPath);
                if (cluster.size() + frontier.size() >= kMaxClusterSize) {
                    break;
                }
            }
        }

        if (cluster.size() >= 2 || (cluster.size() == 1 && nodes.value(seed).pinned)) {
            clusters.append(cluster);
        }
    }

    QVector<Workstream> rebuilt;
    rebuilt.reserve(clusters.size());
    for (const QVector<QString> &cluster : clusters) {
        if (cluster.isEmpty()) {
            continue;
        }

        QHash<QString, float> fileWeights;
        QHash<QString, float> folderWeights;
        QHash<QString, float> queryWeights;
        qint64 createdAt = 0;
        qint64 lastActive = 0;
        float internalEdgeWeight = 0.0f;
        int internalEdgeCount = 0;

        for (const QString &path : cluster) {
            const NodeStats &node = nodes.value(path);
            const float fileWeight =
                0.50f * static_cast<float>(node.openCount) +
                0.35f * node.degree +
                0.15f * std::clamp(node.recency / 3.0f, 0.0f, 1.0f);
            fileWeights[path] += fileWeight;

            QFileInfo info(path);
            folderWeights[info.absolutePath()] += fileWeight;

            createdAt = createdAt == 0 ? node.firstSeen : qMin(createdAt, node.firstSeen);
            lastActive = qMax(lastActive, node.lastSeen);

            for (auto queryIt = node.queryCounts.cbegin(); queryIt != node.queryCounts.cend(); ++queryIt) {
                queryWeights[queryIt.key()] += static_cast<float>(queryIt.value());
            }
        }

        for (int i = 0; i < cluster.size(); ++i) {
            const auto neighbors = m_relatedCache.value(cluster.at(i));
            for (int j = i + 1; j < cluster.size(); ++j) {
                const QString right = cluster.at(j);
                auto it = std::find_if(neighbors.cbegin(), neighbors.cend(), [&right](const RelationshipSignal &signal) {
                    return normalizedPath(signal.path) == right;
                });
                if (it != neighbors.cend()) {
                    internalEdgeWeight += it->score;
                    internalEdgeCount += 1;
                }
            }
        }

        Workstream workstream;
        workstream.topFiles = topIntPairs(fileWeights, 8);
        workstream.topFolders = topIntPairs(folderWeights, 6);
        workstream.topQueries = topFloatPairs(queryWeights, 5);
        workstream.createdAt = createdAt;
        workstream.lastActive = lastActive;
        workstream.memberCount = cluster.size();
        workstream.cohesion = internalEdgeCount > 0
            ? std::clamp(internalEdgeWeight / static_cast<float>(internalEdgeCount), 0.0f, 1.0f)
            : 0.0f;
        workstream.confidence = std::clamp(
            0.65f * workstream.cohesion +
            0.35f * std::clamp(static_cast<float>(cluster.size()) / 8.0f, 0.0f, 1.0f),
            0.0f,
            1.0f);
        workstream.isAuto = true;
        workstream.name = workstreamNameFromContext(workstream.topFolders, workstream.topQueries);
        workstream.id = stableWorkstreamId(workstream.topFolders, workstream.topFiles, workstream.lastActive);
        workstream.description = workstream.topQueries.isEmpty()
            ? QStringLiteral("Connected by repeated same-session usage")
            : QStringLiteral("Frequent query: %1").arg(workstream.topQueries.first().first);

        if (existingById.contains(workstream.id)) {
            const Workstream &existing = existingById.value(workstream.id);
            if (!existing.name.isEmpty()) {
                workstream.name = existing.name;
            }
            if (!existing.description.isEmpty()) {
                workstream.description = existing.description;
            }
            workstream.isPinned = existing.isPinned;
        }

        for (const auto &pair : workstream.topFiles) {
            const QString normalized = normalizedPath(pair.first);
            if (!normalized.isEmpty() && !m_pathWorkstreamCache.contains(normalized)) {
                m_pathWorkstreamCache.insert(normalized, workstream.id);
            }
        }

        rebuilt.append(workstream);
    }

    // Disambiguate auto workstreams that share a name
    QHash<QString, int> nameCounts;
    for (const Workstream &ws : std::as_const(rebuilt)) {
        if (ws.isAuto) nameCounts[ws.name]++;
    }
    QHash<QString, int> nameOrdinal;
    for (Workstream &ws : rebuilt) {
        if (!ws.isAuto || nameCounts.value(ws.name) <= 1) continue;
        const QString disc = ws.topFolders.isEmpty()
            ? QString::number(++nameOrdinal[ws.name])
            : QFileInfo(ws.topFolders.first().first).fileName();
        ws.name = QStringLiteral("%1 (%2)").arg(ws.name, disc);
    }

    rebuilt.append(manualWorkstreams);
    std::sort(rebuilt.begin(), rebuilt.end(), [](const Workstream &lhs, const Workstream &rhs) {
        if (lhs.isPinned != rhs.isPinned) {
            return lhs.isPinned;
        }
        if (lhs.lastActive == rhs.lastActive) {
            return lhs.name < rhs.name;
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
    if (!m_currentWorkstreamId.isEmpty() &&
        std::none_of(m_workstreams.cbegin(), m_workstreams.cend(), [this](const Workstream &workstream) {
            return workstream.id == m_currentWorkstreamId;
        })) {
        m_currentWorkstreamId.clear();
    }
    if (m_currentWorkstreamId.isEmpty() && !m_workstreams.isEmpty()) {
        m_currentWorkstreamId = m_workstreams.first().id;
    }
    m_graphSignature = buildGraphSignature(m_workstreams, m_relatedCache, sourceEventCount);
    m_replaySourceEventCount = sourceEventCount;
    m_lastRebuildTimestamp = now;
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
    QString normalized = normalizedPath(path);
#ifdef Q_OS_WIN
    normalized = normalized.toLower();
#endif
    const QString mappedId = m_pathWorkstreamCache.value(normalized);
    for (const Workstream &workstream : m_workstreams) {
        if (!mappedId.isEmpty() && workstream.id == mappedId) {
            matches.append(workstream);
            continue;
        }
        const bool inFiles = std::any_of(workstream.topFiles.cbegin(), workstream.topFiles.cend(), [&normalized](const auto &pair) {
            return normalizedPath(pair.first) == normalized;
        });
        const QFileInfo info(normalized);
        const bool inFolders = std::any_of(workstream.topFolders.cbegin(), workstream.topFolders.cend(), [&info](const auto &pair) {
            return normalizedPath(pair.first) == normalizedPath(info.absolutePath());
        });
        if (inFiles || inFolders) {
            matches.append(workstream);
        }
    }
    return matches;
}

QVector<RelationshipSignal> WorkstreamManager::relatedForPath(
    const QString &path,
    int limit,
    const QString &workstreamId) const {
    QVector<RelationshipSignal> related;
    QString normalized = normalizedPath(path);
#ifdef Q_OS_WIN
    normalized = normalized.toLower();
#endif
    if (normalized.isEmpty()) {
        return related;
    }

    const QVector<RelationshipSignal> raw = m_relatedCache.value(normalized);
    related.reserve(raw.size());
    for (const RelationshipSignal &signal : raw) {
        if (!workstreamId.isEmpty()) {
            const QString signalWorkstream = signal.workstreamId.isEmpty()
                ? m_pathWorkstreamCache.value(normalizedPath(signal.path))
                : signal.workstreamId;
            if (!signalWorkstream.isEmpty() && signalWorkstream != workstreamId) {
                continue;
            }
        }
        related.append(signal);
        if (limit > 0 && related.size() >= limit) {
            break;
        }
    }
    return related;
}

QString WorkstreamManager::graphSignature() const {
    return m_graphSignature;
}

int WorkstreamManager::replaySourceEventCount() const {
    return m_replaySourceEventCount;
}

qint64 WorkstreamManager::lastRebuildTimestamp() const {
    return m_lastRebuildTimestamp;
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
            for (const auto &filePair : current.topFiles) {
                const QString key = normalizedPath(filePair.first);
                if (!key.isEmpty()) {
                    m_pathWorkstreamCache.insert(key, current.id);
                }
            }
            m_dirty = true;
            emit workstreamsChanged();
            return;
        }
    }

    m_workstreams.append(workstream);
    for (const auto &filePair : workstream.topFiles) {
        const QString key = normalizedPath(filePair.first);
        if (!key.isEmpty()) {
            m_pathWorkstreamCache.insert(key, workstream.id);
        }
    }
    m_dirty = true;
    emit workstreamsChanged();
}

} // namespace Ixplorer
