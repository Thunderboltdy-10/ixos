#include "widgets/AppSidebar.h"
#include "widgets/SidebarSection.h"
#include "theme/IconFont.h"

#include <QDir>
#include <QFileInfo>
#include <QLabel>
#include <QScrollArea>
#include <QSettings>
#include <QStyle>
#include <QStandardPaths>
#include <QStorageInfo>
#include <QVBoxLayout>

namespace Ixplorer {

AppSidebar::AppSidebar(QWidget *parent)
    : QWidget(parent) {
    setObjectName("AppSidebar");
    setMinimumWidth(248);

    auto *outerLayout = new QVBoxLayout(this);
    outerLayout->setContentsMargins(0, 0, 0, 0);
    outerLayout->setSpacing(0);

    auto *headerLabel = new QLabel("Ixplorer", this);
    headerLabel->setObjectName("AppSidebarHeader");
    QFont headerFont("Geist Mono");
    headerFont.setPixelSize(14);
    headerFont.setBold(true); // SemiBold
    headerLabel->setFont(headerFont);
    headerLabel->setContentsMargins(16, 16, 16, 8);
    outerLayout->addWidget(headerLabel);

    auto *scroll = new QScrollArea(this);
    scroll->setWidgetResizable(true);
    scroll->setFrameShape(QFrame::NoFrame);
    scroll->setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);

    auto *content = new QWidget(scroll);
    auto *layout = new QVBoxLayout(content);
    layout->setContentsMargins(0, 8, 0, 8);
    layout->setSpacing(0);

    m_homeSection = new SidebarSection("Home", Icons::makeIconFromFont(Icons::Home, 16), content);
    m_favoritesSection = new SidebarSection("Favorites", Icons::makeIconFromFont(Icons::Star, 16), content);
    m_recentsSection = new SidebarSection("Recents", Icons::makeIconFromFont(Icons::History, 16), content);
    m_drivesSection = new SidebarSection("This PC", Icons::makeIconFromFont(Icons::Device, 16), content);

    layout->addWidget(m_homeSection);
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
}

void AppSidebar::highlightCurrent(const QString &path) {
    m_homeSection->setHighlighted(path);
    m_favoritesSection->setHighlighted(path);
    m_recentsSection->setHighlighted(path);
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

void AppSidebar::populatePlaces() {
    const QString home = QDir::homePath();
    m_homeSection->addItem("Home", home, Icons::makeIconFromFont(Icons::Home, 16));

    const QString desktop = QStandardPaths::writableLocation(QStandardPaths::DesktopLocation);
    if (!desktop.isEmpty()) {
        m_homeSection->addItem("Desktop", desktop, Icons::makeIconFromFont(Icons::Desktop, 16));
    }

    const QString documents = QStandardPaths::writableLocation(QStandardPaths::DocumentsLocation);
    if (!documents.isEmpty()) {
        m_homeSection->addItem("Documents", documents, Icons::makeIconFromFont(Icons::Document, 16));
    }

    const QString downloads = QStandardPaths::writableLocation(QStandardPaths::DownloadLocation);
    if (!downloads.isEmpty()) {
        m_homeSection->addItem("Downloads", downloads, Icons::makeIconFromFont(Icons::Download, 16));
    }

    m_favoritesSection->addItem("Pictures", QStandardPaths::writableLocation(QStandardPaths::PicturesLocation), Icons::makeIconFromFont(Icons::Image, 16));
    m_favoritesSection->addItem("Music", QStandardPaths::writableLocation(QStandardPaths::MusicLocation), Icons::makeIconFromFont(Icons::Music, 16));
    m_favoritesSection->addItem("Videos", QStandardPaths::writableLocation(QStandardPaths::MoviesLocation), Icons::makeIconFromFont(Icons::Video, 16));

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
        m_drivesSection->addItem(name, root, Icons::makeIconFromFont(Icons::Device, 16));
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

void AppSidebar::refreshRecents() {
    m_recentsSection->clearItems();
    if (m_recentLocations.isEmpty()) {
        m_recentsSection->addItem("No recent locations", "", QIcon());
        return;
    }

    for (const QString &path : m_recentLocations) {
        const QFileInfo info(path);
        const QString label = info.fileName().isEmpty() ? path : info.fileName();
        m_recentsSection->addItem(label, path, Icons::makeIconFromFont(Icons::History, 16));
    }
}

} // namespace Ixplorer
