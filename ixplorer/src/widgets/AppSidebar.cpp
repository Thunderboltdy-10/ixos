#include "widgets/AppSidebar.h"
#include "widgets/SidebarSection.h"

#include <QDir>
#include <QScrollArea>
#include <QStandardPaths>
#include <QStorageInfo>
#include <QVBoxLayout>

namespace Ixplorer {

AppSidebar::AppSidebar(QWidget *parent)
    : QWidget(parent) {
    setObjectName("AppSidebar");
    setMinimumWidth(180);

    auto *outerLayout = new QVBoxLayout(this);
    outerLayout->setContentsMargins(0, 0, 0, 0);
    outerLayout->setSpacing(0);

    auto *scroll = new QScrollArea(this);
    scroll->setWidgetResizable(true);
    scroll->setFrameShape(QFrame::NoFrame);
    scroll->setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);

    auto *content = new QWidget(scroll);
    auto *layout = new QVBoxLayout(content);
    layout->setContentsMargins(0, 8, 0, 8);
    layout->setSpacing(0);

    m_homeSection = new SidebarSection("Home", content);
    m_favoritesSection = new SidebarSection("Favorites", content);
    m_recentsSection = new SidebarSection("Recents", content);
    m_drivesSection = new SidebarSection("This PC", content);

    layout->addWidget(m_homeSection);
    layout->addWidget(m_favoritesSection);
    layout->addWidget(m_recentsSection);
    layout->addWidget(m_drivesSection);
    layout->addStretch();

    scroll->setWidget(content);
    outerLayout->addWidget(scroll);

    populatePlaces();
    populateDrives();

    // Wire up all section signals
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

void AppSidebar::populatePlaces() {
    QString home = QDir::homePath();
    m_homeSection->addItem("Home", home, "\xF0\x9F\x8F\xA0");

    QString desktop = QStandardPaths::writableLocation(QStandardPaths::DesktopLocation);
    if (!desktop.isEmpty())
        m_homeSection->addItem("Desktop", desktop, "\xF0\x9F\x96\xA5");

    QString documents = QStandardPaths::writableLocation(QStandardPaths::DocumentsLocation);
    if (!documents.isEmpty())
        m_homeSection->addItem("Documents", documents, "\xF0\x9F\x93\x84");

    QString downloads = QStandardPaths::writableLocation(QStandardPaths::DownloadLocation);
    if (!downloads.isEmpty())
        m_homeSection->addItem("Downloads", downloads, "\xE2\xAC\x87");

    // Favorites: pre-populated with common locations
    m_favoritesSection->addItem("Pictures", QStandardPaths::writableLocation(QStandardPaths::PicturesLocation), "\xF0\x9F\x96\xBC");
    m_favoritesSection->addItem("Music", QStandardPaths::writableLocation(QStandardPaths::MusicLocation), "\xF0\x9F\x8E\xB5");
    m_favoritesSection->addItem("Videos", QStandardPaths::writableLocation(QStandardPaths::MoviesLocation), "\xF0\x9F\x8E\xAC");

    // Recents placeholder
    m_recentsSection->addItem("(no recent locations)", "", "");
}

void AppSidebar::populateDrives() {
    const auto volumes = QStorageInfo::mountedVolumes();
    for (const auto &vol : volumes) {
        if (!vol.isValid() || !vol.isReady())
            continue;
        QString root = vol.rootPath();
        QString name = vol.displayName().isEmpty() ? root : vol.displayName();
        QString label = name + " (" + root + ")";
        m_drivesSection->addItem(label, root, "\xF0\x9F\x92\xBE");
    }
}

} // namespace Ixplorer
