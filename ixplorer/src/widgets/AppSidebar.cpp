#include "widgets/AppSidebar.h"
#include "data/TodaySection.h"
#include "widgets/SidebarSection.h"
#include "theme/IconFont.h"
#include "theme/ThemedFileIconProvider.h"

#include <QDir>
#include <QFileIconProvider>
#include <QFileInfo>
#include <QLabel>
#include <QScrollArea>
#include <QSettings>
#include <QStyle>
#include <QStandardPaths>
#include <QStorageInfo>
#include <QVBoxLayout>
#include <utility>

namespace Ixplorer {

AppSidebar::AppSidebar(QWidget *parent)
    : QWidget(parent) {
    setObjectName("AppSidebar");
    setMinimumWidth(220);
    setMaximumWidth(280);

    auto *outerLayout = new QVBoxLayout(this);
    outerLayout->setContentsMargins(0, 0, 0, 0);
    outerLayout->setSpacing(0);

    auto *scroll = new QScrollArea(this);
    scroll->setWidgetResizable(true);
    scroll->setFrameShape(QFrame::NoFrame);
    scroll->setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);

    auto *content = new QWidget(scroll);
    auto *layout = new QVBoxLayout(content);
    layout->setContentsMargins(0, 10, 0, 10);
    layout->setSpacing(2);

    m_homeSection = new SidebarSection("Home", QIcon(), content);
    m_recentsSection = new SidebarSection("Recents", QIcon(), content);
    m_favoritesSection = new SidebarSection("Favorites", QIcon(), content);
    m_workstreamsSection = new SidebarSection("Workstreams", QIcon(), content);
    m_drivesSection = new SidebarSection("This PC", QIcon(), content);

    layout->addWidget(m_homeSection);
    // layout->addWidget(m_todaySectionWidget); // Removed as per request
    layout->addWidget(m_workstreamsSection); // Moved up for better notion-like UI
    layout->addWidget(m_favoritesSection);
    layout->addWidget(m_recentsSection);
    layout->addWidget(m_drivesSection);
    layout->addStretch();

    scroll->setWidget(content);
    outerLayout->addWidget(scroll);

    populatePlaces();
    populateDrives();

    auto relay = [this](const QString &path) { emit locationSelected(path); };
    connect(m_homeSection, &SidebarSection::itemClicked, this, relay);
    connect(m_favoritesSection, &SidebarSection::itemClicked, this, relay);
    connect(m_recentsSection, &SidebarSection::itemClicked, this, relay);
    connect(m_drivesSection, &SidebarSection::itemClicked, this, relay);
    connect(m_workstreamsSection, &SidebarSection::itemClicked, this, [this](const QString &id) {
        emit workstreamSelected(id);
    });
}

void AppSidebar::highlightCurrent(const QString &path) {
    // Keep highlights minimal: navigation only, no recents/favorites emphasis.
    m_homeSection->setHighlighted(path);
    m_favoritesSection->setHighlighted(QString());
    m_recentsSection->setHighlighted(QString());
    m_drivesSection->setHighlighted(path);
}

void AppSidebar::recordRecentLocation(const QString &path) {
    const QString normalized = QDir::toNativeSeparators(path);
    if (normalized.isEmpty() || !QFileInfo::exists(normalized)) {
        return;
    }

    m_recentLocations.removeAll(normalized);
    m_recentLocations.prepend(normalized);
    while (m_recentLocations.size() > 8) {
        m_recentLocations.removeLast();
    }

    persistRecents();
    refreshRecents();
}

void AppSidebar::setTodayPacket(const ResumptionPacket &) {
    // Feature disabled
}

void AppSidebar::setWorkstreams(const QVector<Workstream> &workstreams, const QString &currentId) {
    m_workstreamsSection->clearItems();
    if (workstreams.isEmpty()) {
        m_workstreamsSection->hide();
        return;
    }

    int shown = 0;
    for (const Workstream &workstream : workstreams) {
        const QString subtitle = workstream.name.isEmpty() ? QStringLiteral("Recent work") : workstream.name;
        m_workstreamsSection->addItem(subtitle, workstream.id, Icons::makeIconFromFont(Icons::Folder, 16, QColor(0xF6, 0xCA, 0x56)));
        ++shown;
        if (shown >= 4) {
            break;
        }
    }
    m_workstreamsSection->show();
    m_workstreamsSection->setHighlighted(currentId);
}

void AppSidebar::pinFavorite(const QString &path) {
    const QString normalized = QDir::toNativeSeparators(path);
    if (normalized.isEmpty()) {
        return;
    }
    m_pinnedFavorites.removeAll(normalized);
    m_pinnedFavorites.prepend(normalized);
    while (m_pinnedFavorites.size() > 8) {
        m_pinnedFavorites.removeLast();
    }
    persistPinnedFavorites();
    refreshFavorites();
}

void AppSidebar::populatePlaces() {
    const QString home = QDir::homePath();
    m_homeSection->addItem("Home", home, Icons::makeIconFromFont(Icons::Home, 16, QColor(0x8C, 0x99, 0xB2)));

    const QString desktop = QStandardPaths::writableLocation(QStandardPaths::DesktopLocation);
    if (!desktop.isEmpty()) {
        m_homeSection->addItem("Desktop", desktop, Icons::makeIconFromFont(Icons::Desktop, 16, QColor(0x3B, 0x86, 0xCB)));
    }

    const QString documents = QStandardPaths::writableLocation(QStandardPaths::DocumentsLocation);
    if (!documents.isEmpty()) {
        m_homeSection->addItem("Documents", documents, Icons::makeIconFromFont(Icons::Document, 16, QColor(0x40, 0xA0, 0xDB)));
    }

    const QString downloads = QStandardPaths::writableLocation(QStandardPaths::DownloadLocation);
    if (!downloads.isEmpty()) {
        m_homeSection->addItem("Downloads", downloads, Icons::makeIconFromFont(Icons::Download, 16, QColor(0x68, 0xB7, 0x82)));
    }

    loadPinnedFavorites();
    refreshFavorites();
    loadRecents();
    refreshRecents();
}

void AppSidebar::populateDrives() {
    const auto volumes = QStorageInfo::mountedVolumes();
    for (const auto &vol : volumes) {
        if (!vol.isValid() || !vol.isReady()) {
            continue;
        }
        const QString root = vol.rootPath();
        const QString name = vol.displayName().isEmpty() ? root : vol.displayName();
        m_drivesSection->addItem(name, root, Icons::makeIconFromFont(Icons::Device, 16, QColor(0xA0, 0xA0, 0xA5)));
    }
}

void AppSidebar::loadRecents() {
    QSettings settings;
    m_recentLocations = settings.value("sidebar/recentLocations").toStringList();
}

void AppSidebar::persistRecents() const {
    QSettings settings;
    settings.setValue("sidebar/recentLocations", m_recentLocations);
}

void AppSidebar::loadPinnedFavorites() {
    QSettings settings;
    m_pinnedFavorites = settings.value("sidebar/pinnedFavorites").toStringList();
}

void AppSidebar::persistPinnedFavorites() const {
    QSettings settings;
    settings.setValue("sidebar/pinnedFavorites", m_pinnedFavorites);
}

void AppSidebar::refreshFavorites() {
    m_favoritesSection->clearItems();

    ThemedFileIconProvider iconProvider;
    for (const QString &path : std::as_const(m_pinnedFavorites)) {
        const QFileInfo info(path);
        const QString label = info.fileName().isEmpty() ? path : info.fileName();
        const QIcon icon = info.exists() ? iconProvider.icon(info) : Icons::makeIconFromFont(Icons::Document, 16, QColor(0xA0, 0xA0, 0xA5));
        m_favoritesSection->addItem(label, path, icon);
    }

    const QString pictures = QStandardPaths::writableLocation(QStandardPaths::PicturesLocation);
    if (!pictures.isEmpty()) {
        m_favoritesSection->addItem("Pictures", pictures, Icons::makeIconFromFont(Icons::Image, 16, QColor(0x68, 0xB7, 0x82)));
    }
    const QString music = QStandardPaths::writableLocation(QStandardPaths::MusicLocation);
    if (!music.isEmpty()) {
        m_favoritesSection->addItem("Music", music, Icons::makeIconFromFont(Icons::Music, 16, QColor(0xE5, 0x6B, 0x9A)));
    }
    const QString videos = QStandardPaths::writableLocation(QStandardPaths::MoviesLocation);
    if (!videos.isEmpty()) {
        m_favoritesSection->addItem("Videos", videos, Icons::makeIconFromFont(Icons::Video, 16, QColor(0xAC, 0x7B, 0xE3)));
    }
}

void AppSidebar::refreshRecents() {
    m_recentsSection->clearItems();
    if (m_recentLocations.isEmpty()) {
        m_recentsSection->addItem("No recent locations", "", QIcon());
        return;
    }

    ThemedFileIconProvider iconProvider;
    for (const QString &path : m_recentLocations) {
        const QFileInfo info(path);
        const QString label = info.fileName().isEmpty() ? path : info.fileName();
        const QIcon icon = info.exists() ? iconProvider.icon(info) : Icons::makeIconFromFont(Icons::History, 16, QColor(0xA0, 0xA0, 0xA5));
        m_recentsSection->addItem(label, path, icon);
    }
}

} // namespace Ixplorer
