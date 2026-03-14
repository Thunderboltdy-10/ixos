#include "data/SessionState.h"

#include <QDateTime>
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QStandardPaths>

namespace Ixplorer {

namespace {

constexpr int kAutosaveIntervalMs = 60000;

QString ensureAppDataDir() {
    QString dir = QStandardPaths::writableLocation(QStandardPaths::AppLocalDataLocation);
    if (dir.isEmpty()) {
        dir = QDir::homePath() + QStringLiteral("/.ixplorer");
    }
    QDir().mkpath(dir);
    return dir;
}

QJsonObject toJson(const TabState &tab) {
    return QJsonObject{
        {QStringLiteral("path"), tab.path},
        {QStringLiteral("is_document"), tab.isDocument},
        {QStringLiteral("is_preview"), tab.isPreview},
        {QStringLiteral("launch_deferred"), tab.launchDeferred},
        {QStringLiteral("scroll_position"), tab.scrollPosition},
        {QStringLiteral("view_mode"), tab.viewMode},
        {QStringLiteral("history"), QJsonArray::fromStringList(tab.history)},
        {QStringLiteral("history_index"), tab.historyIndex},
    };
}

TabState tabFromJson(const QJsonObject &object) {
    TabState tab;
    tab.path = object.value(QStringLiteral("path")).toString();
    tab.isDocument = object.value(QStringLiteral("is_document")).toBool();
    tab.isPreview = object.value(QStringLiteral("is_preview")).toBool();
    tab.launchDeferred = object.value(QStringLiteral("launch_deferred")).toBool();
    tab.scrollPosition = object.value(QStringLiteral("scroll_position")).toInt();
    tab.viewMode = object.value(QStringLiteral("view_mode")).toInt();
    const QJsonArray history = object.value(QStringLiteral("history")).toArray();
    for (const QJsonValue &value : history) {
        tab.history.append(value.toString());
    }
    tab.historyIndex = object.value(QStringLiteral("history_index")).toInt();
    return tab;
}

QJsonObject toJson(const WorkstreamSessionState &state) {
    QJsonArray tabs;
    for (const TabState &tab : state.tabs) {
        tabs.append(toJson(tab));
    }

    return QJsonObject{
        {QStringLiteral("tabs"), tabs},
        {QStringLiteral("active_tab_index"), state.activeTabIndex},
        {QStringLiteral("search_query"), state.searchQuery},
        {QStringLiteral("search_root"), state.searchRoot},
    };
}

WorkstreamSessionState workstreamStateFromJson(const QJsonObject &object) {
    WorkstreamSessionState state;
    const QJsonArray tabs = object.value(QStringLiteral("tabs")).toArray();
    for (const QJsonValue &value : tabs) {
        state.tabs.append(tabFromJson(value.toObject()));
    }
    state.activeTabIndex = object.value(QStringLiteral("active_tab_index")).toInt();
    state.searchQuery = object.value(QStringLiteral("search_query")).toString();
    state.searchRoot = object.value(QStringLiteral("search_root")).toString();
    return state;
}

} // namespace

SessionState::SessionState(QObject *parent)
    : QObject(parent)
    , m_storagePath(ensureAppDataDir() + QStringLiteral("/session_v1.json"))
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

void SessionState::setStoragePath(const QString &path) {
    m_storagePath = path;
}

QString SessionState::storagePath() const {
    return m_storagePath;
}

bool SessionState::load() {
    QFile file(m_storagePath);
    if (!file.exists()) {
        restoreDefault();
        return true;
    }
    if (!file.open(QIODevice::ReadOnly)) {
        return false;
    }

    const QJsonDocument document = QJsonDocument::fromJson(file.readAll());
    const QJsonObject object = document.object();

    SessionSnapshot snapshot;
    snapshot.version = object.value(QStringLiteral("version")).toInt(1);
    snapshot.activeTabIndex = object.value(QStringLiteral("active_tab_index")).toInt();
    snapshot.sidebarWidth = object.value(QStringLiteral("sidebar_width")).toInt(248);
    snapshot.railWidth = object.value(QStringLiteral("rail_width")).toInt();
    snapshot.railVisible = object.value(QStringLiteral("rail_visible")).toBool();
    snapshot.lastSearchQuery = object.value(QStringLiteral("last_search_query")).toString();
    snapshot.lastSearchRoot = object.value(QStringLiteral("last_search_root")).toString();
    snapshot.lastSaveTimestamp = object.value(QStringLiteral("last_save_timestamp")).toVariant().toLongLong();
    snapshot.hasCleanExit = object.value(QStringLiteral("has_clean_exit")).toBool();
    snapshot.activeWorkstreamId = object.value(QStringLiteral("active_workstream_id")).toString();

    const QJsonArray tabs = object.value(QStringLiteral("tabs")).toArray();
    for (const QJsonValue &value : tabs) {
        snapshot.tabs.append(tabFromJson(value.toObject()));
    }

    const QJsonObject workstreamStates = object.value(QStringLiteral("workstream_states")).toObject();
    for (auto it = workstreamStates.begin(); it != workstreamStates.end(); ++it) {
        snapshot.workstreamStates.insert(it.key(), workstreamStateFromJson(it.value().toObject()));
    }

    m_snapshot = snapshot;
    m_dirty = false;
    emit snapshotChanged();
    return true;
}

bool SessionState::save() {
    m_snapshot.lastSaveTimestamp = QDateTime::currentMSecsSinceEpoch();

    QJsonArray tabs;
    for (const TabState &tab : m_snapshot.tabs) {
        tabs.append(toJson(tab));
    }

    QJsonObject workstreamStates;
    for (auto it = m_snapshot.workstreamStates.cbegin(); it != m_snapshot.workstreamStates.cend(); ++it) {
        workstreamStates.insert(it.key(), toJson(it.value()));
    }

    const QJsonObject root{
        {QStringLiteral("version"), m_snapshot.version},
        {QStringLiteral("tabs"), tabs},
        {QStringLiteral("active_tab_index"), m_snapshot.activeTabIndex},
        {QStringLiteral("sidebar_width"), m_snapshot.sidebarWidth},
        {QStringLiteral("rail_width"), m_snapshot.railWidth},
        {QStringLiteral("rail_visible"), m_snapshot.railVisible},
        {QStringLiteral("last_search_query"), m_snapshot.lastSearchQuery},
        {QStringLiteral("last_search_root"), m_snapshot.lastSearchRoot},
        {QStringLiteral("last_save_timestamp"), QString::number(m_snapshot.lastSaveTimestamp)},
        {QStringLiteral("has_clean_exit"), m_snapshot.hasCleanExit},
        {QStringLiteral("active_workstream_id"), m_snapshot.activeWorkstreamId},
        {QStringLiteral("workstream_states"), workstreamStates},
    };

    QFileInfo info(m_storagePath);
    QDir().mkpath(info.absolutePath());

    QFile file(m_storagePath);
    if (!file.open(QIODevice::WriteOnly | QIODevice::Truncate)) {
        return false;
    }

    file.write(QJsonDocument(root).toJson(QJsonDocument::Indented));
    m_dirty = false;
    emit stateSaved(m_storagePath);
    return true;
}

void SessionState::restoreDefault() {
    m_snapshot = SessionSnapshot();
    m_snapshot.tabs = QVector<TabState>{TabState{QDir::homePath(), false, false, false, 0, 0, QStringList{QDir::homePath()}, 0}};
    m_snapshot.hasCleanExit = true;
    m_dirty = false;
    emit snapshotChanged();
}

const SessionSnapshot &SessionState::snapshot() const {
    return m_snapshot;
}

void SessionState::setSnapshot(const SessionSnapshot &snapshot) {
    m_snapshot = snapshot;
    markDirty();
}

void SessionState::setTabs(const QVector<TabState> &tabs, int activeTabIndex) {
    m_snapshot.tabs = tabs;
    m_snapshot.activeTabIndex = activeTabIndex;
    markDirty();
}

void SessionState::setLayoutState(int sidebarWidth, int railWidth, bool railVisible) {
    m_snapshot.sidebarWidth = sidebarWidth;
    m_snapshot.railWidth = railWidth;
    m_snapshot.railVisible = railVisible;
    markDirty();
}

void SessionState::setLastSearch(const QString &query, const QString &rootPath) {
    m_snapshot.lastSearchQuery = query;
    m_snapshot.lastSearchRoot = rootPath;
    markDirty();
}

void SessionState::setActiveWorkstreamId(const QString &workstreamId) {
    m_snapshot.activeWorkstreamId = workstreamId;
    markDirty();
}

void SessionState::setWorkstreamState(const QString &workstreamId, const WorkstreamSessionState &state) {
    if (workstreamId.isEmpty()) {
        return;
    }
    m_snapshot.workstreamStates.insert(workstreamId, state);
    markDirty();
}

bool SessionState::hasWorkstreamState(const QString &workstreamId) const {
    return m_snapshot.workstreamStates.contains(workstreamId);
}

WorkstreamSessionState SessionState::workstreamState(const QString &workstreamId) const {
    return m_snapshot.workstreamStates.value(workstreamId);
}

void SessionState::markCleanExit(bool cleanExit) {
    m_snapshot.hasCleanExit = cleanExit;
    markDirty();
}

void SessionState::markDirty() {
    m_dirty = true;
    emit snapshotChanged();
}

SessionStateStore::SessionStateStore()
    : m_path(ensureAppDataDir() + QStringLiteral("/session_v1.json")) {
}

void SessionStateStore::setPath(const QString &path) {
    m_path = path;
}

QString SessionStateStore::path() const {
    return m_path;
}

SessionStateSnapshot SessionStateStore::load() const {
    SessionState state;
    state.setStoragePath(m_path);
    state.load();
    return state.snapshot();
}

bool SessionStateStore::save(const SessionStateSnapshot &snapshot) const {
    SessionState state;
    state.setStoragePath(m_path);
    state.setSnapshot(snapshot);
    return state.save();
}

} // namespace Ixplorer
