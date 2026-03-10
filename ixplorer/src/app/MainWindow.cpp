#include "app/MainWindow.h"

#include "utils/FileOperations.h"
#include "widgets/AppSidebar.h"
#include "widgets/CommandPalette.h"
#include "widgets/DocumentPane.h"
#include "widgets/ExplorerPane.h"
#include "widgets/ExplorerToolbar.h"
#include "widgets/IxosRail.h"
#include "widgets/StatusStrip.h"
#include "widgets/TabWorkspace.h"

#include <QDir>
#include <QFileInfo>
#include <QKeyEvent>
#include <QShortcut>
#include <QVBoxLayout>

namespace Ixplorer {

MainWindow::MainWindow(QWidget *parent)
    : QMainWindow(parent)
    , m_toolbar(new ExplorerToolbar(this))
    , m_sidebar(new AppSidebar(this))
    , m_workspace(new TabWorkspace(this))
    , m_rail(new IxosRail(this))
    , m_statusStrip(new StatusStrip(this))
    , m_palette(new CommandPalette(this))
    , m_splitter(new QSplitter(Qt::Horizontal, this)) {
    setWindowTitle("Ixplorer");
    resize(1440, 860);
    setMinimumSize(1100, 700);

    setupLayout();
    setupConnections();
    setupShortcuts();

    m_workspace->addTab(QDir::homePath());
    setRailVisible(false);
}

void MainWindow::navigateTo(const QString &path) {
    m_workspace->navigateCurrentTab(path);
}

void MainWindow::keyPressEvent(QKeyEvent *event) {
    QMainWindow::keyPressEvent(event);
}

void MainWindow::setupLayout() {
    auto *central = new QWidget(this);
    auto *vbox = new QVBoxLayout(central);
    vbox->setContentsMargins(0, 0, 0, 0);
    vbox->setSpacing(0);

    vbox->addWidget(m_toolbar);

    m_splitter->setHandleWidth(1);
    m_splitter->addWidget(m_sidebar);
    m_splitter->addWidget(m_workspace);
    m_splitter->addWidget(m_rail);
    m_splitter->setStretchFactor(0, 0);
    m_splitter->setStretchFactor(1, 1);
    m_splitter->setStretchFactor(2, 0);
    m_splitter->setCollapsible(0, false);
    m_splitter->setCollapsible(1, false);
    m_splitter->setCollapsible(2, true);
    m_splitter->setSizes({232, 930, 0});

    vbox->addWidget(m_splitter, 1);
    vbox->addWidget(m_statusStrip);

    setCentralWidget(central);
}

void MainWindow::setupConnections() {
    connect(m_sidebar, &AppSidebar::locationSelected, this, &MainWindow::navigateTo);

    connect(m_toolbar, &ExplorerToolbar::navigateRequested, this, &MainWindow::navigateTo);
    connect(m_toolbar, &ExplorerToolbar::searchRequested, this, [this](const QString &query, int mode) {
        setRailVisible(true);
        m_rail->submitToolbarSearch(query, mode);
    });
    connect(m_toolbar, &ExplorerToolbar::searchDraftChanged, this, [this](const QString &query, int mode) {
        if (!query.isEmpty()) {
            setRailVisible(true);
        }
        m_rail->submitToolbarDraft(query, mode);
    });
    connect(m_toolbar, &ExplorerToolbar::viewModeChanged, this, [this](int mode) {
        m_workspace->setCurrentViewMode(mode);
    });
    connect(m_toolbar, &ExplorerToolbar::toggleRailRequested, this, &MainWindow::toggleRailVisible);
    connect(m_toolbar, &ExplorerToolbar::commandPaletteRequested, this, &MainWindow::openCommandPalette);

    connect(m_toolbar, &ExplorerToolbar::backRequested, this, [this]() {
        m_workspace->goBackCurrent();
    });
    connect(m_toolbar, &ExplorerToolbar::forwardRequested, this, [this]() {
        m_workspace->goForwardCurrent();
    });
    connect(m_toolbar, &ExplorerToolbar::upRequested, this, [this]() {
        m_workspace->goUpCurrent();
    });
    connect(m_toolbar, &ExplorerToolbar::refreshRequested, this, [this]() {
        m_workspace->refreshCurrent();
    });

    connect(m_workspace, &TabWorkspace::pathChanged, this, &MainWindow::onPathChanged);
    connect(m_workspace, &TabWorkspace::navigationStateChanged,
            m_toolbar, &ExplorerToolbar::setNavigationState);
    connect(m_workspace, &TabWorkspace::statusMessage, this, [this](const QString &message) {
        m_statusStrip->setStatusMessage(message);
        m_rail->setStatusMessage(message);
    });

    connect(m_workspace, &TabWorkspace::selectionChanged, this, [this](const QFileInfo &info, int selectedCount, quint64 selectedBytes) {
        m_rail->showFileDetails(info, selectedCount, selectedBytes);
        m_statusStrip->setSelectionInfo(info, selectedCount, selectedBytes);
    });
    connect(m_workspace, &TabWorkspace::selectionCleared, this, [this]() {
        m_rail->clearDetails();
        m_statusStrip->clearSelectionInfo();
    });
    connect(m_workspace, &TabWorkspace::currentTabChanged, this, [this](int) {
        onPathChanged(m_workspace->currentDocument() ? m_workspace->currentDocument()->displayPath()
                                                     : (m_workspace->currentPane() ? m_workspace->currentPane()->currentPath()
                                                                                   : QString()));
        m_toolbar->setViewMode(m_workspace->currentViewMode());
        m_toolbar->setViewModeEnabled(m_workspace->currentSupportsViewMode());
        m_toolbar->setWorkspaceMode(m_workspace->currentSupportsViewMode());
    });

    connect(m_rail, &IxosRail::revealPathInWorkspaceRequested, this, [this](const QString &path) {
        m_workspace->revealPathInCurrentTab(path);
    });
    connect(m_rail, &IxosRail::openPathInNewTabRequested, this, [this](const QString &path) {
        m_workspace->addTab(path);
    });
    connect(m_rail, &IxosRail::openFileRequested, this, [this](const QString &path) {
        if (!m_workspace->previewPath(path)) {
            m_workspace->addTab(path);
        }
    });
    connect(m_rail, &IxosRail::autoOpenPathRequested, this, [this](const QString &path) {
        m_workspace->previewPath(path);
    });
    connect(m_rail, &IxosRail::revealPathRequested, this, [](const QString &path) {
        FileOperations::revealInSystemExplorer(path);
    });
    connect(m_rail, &IxosRail::requestClose, this, [this]() {
        setRailVisible(false);
    });
    connect(m_rail, &IxosRail::searchSubmitted, this, [this](const QString &query, int mode) {
        m_toolbar->setSearchText(query);
        m_toolbar->setSearchMode(mode);
        setRailVisible(true);
    });

    connect(m_palette, &CommandPalette::searchRequested, this, [this](const QString &query) {
        setRailVisible(true);
        m_toolbar->setSearchText(query);
        m_toolbar->focusSearch();
        m_rail->submitToolbarSearch(query, 1);
    });
    connect(m_palette, &CommandPalette::commandTriggered, this, &MainWindow::handlePaletteCommand);
}

void MainWindow::setupShortcuts() {
    auto *newTab = new QShortcut(QKeySequence("Ctrl+T"), this);
    connect(newTab, &QShortcut::activated, this, [this]() {
        m_workspace->addTab(QDir::homePath());
    });

    auto *closeTab = new QShortcut(QKeySequence("Ctrl+W"), this);
    connect(closeTab, &QShortcut::activated, this, [this]() {
        m_workspace->closeTab(m_workspace->currentTabIndex());
    });

    auto *refresh = new QShortcut(QKeySequence("F5"), this);
    connect(refresh, &QShortcut::activated, this, [this]() {
        m_workspace->refreshCurrent();
    });

    auto *back = new QShortcut(QKeySequence("Alt+Left"), this);
    connect(back, &QShortcut::activated, this, [this]() {
        m_workspace->goBackCurrent();
    });

    auto *forward = new QShortcut(QKeySequence("Alt+Right"), this);
    connect(forward, &QShortcut::activated, this, [this]() {
        m_workspace->goForwardCurrent();
    });

    auto *up = new QShortcut(QKeySequence("Alt+Up"), this);
    connect(up, &QShortcut::activated, this, [this]() {
        m_workspace->goUpCurrent();
    });

    auto *focusSearch = new QShortcut(QKeySequence::Find, this);
    connect(focusSearch, &QShortcut::activated, this, [this]() {
        setRailVisible(true);
        m_toolbar->focusSearch();
    });

    auto *openPalette = new QShortcut(QKeySequence("Ctrl+K"), this);
    connect(openPalette, &QShortcut::activated, this, &MainWindow::openCommandPalette);
}

void MainWindow::openCommandPalette() {
    QVector<CommandPaletteItem> commands = {
        {QStringLiteral("focus_search"), QStringLiteral("Focus Ixos Search"), QStringLiteral("Jump to the top search bar"), QStringLiteral("search find ixos top bar")},
        {QStringLiteral("toggle_rail"), QStringLiteral("Toggle Ixos Panel"), QStringLiteral("Show or hide the right search rail"), QStringLiteral("rail panel sidebar")},
        {QStringLiteral("new_tab"), QStringLiteral("New Explorer Tab"), QStringLiteral("Open a fresh workspace tab"), QStringLiteral("tab open workspace")},
        {QStringLiteral("close_tab"), QStringLiteral("Close Current Tab"), QStringLiteral("Close the active workspace tab"), QStringLiteral("close tab")},
        {QStringLiteral("refresh"), QStringLiteral("Refresh Current View"), QStringLiteral("Reload the current explorer or document"), QStringLiteral("refresh reload")},
        {QStringLiteral("go_up"), QStringLiteral("Open Parent Folder"), QStringLiteral("Go to the current tab's parent path"), QStringLiteral("parent up folder")},
    };

    m_palette->setCommands(commands);
    m_palette->move(frameGeometry().center() - m_palette->rect().center());
    m_palette->show();
    m_palette->raise();
    m_palette->activateWindow();
}

void MainWindow::handlePaletteCommand(const QString &commandId) {
    if (commandId == QStringLiteral("focus_search")) {
        setRailVisible(true);
        m_toolbar->focusSearch();
        return;
    }
    if (commandId == QStringLiteral("toggle_rail")) {
        toggleRailVisible();
        return;
    }
    if (commandId == QStringLiteral("new_tab")) {
        m_workspace->addTab(QDir::homePath());
        return;
    }
    if (commandId == QStringLiteral("close_tab")) {
        m_workspace->closeTab(m_workspace->currentTabIndex());
        return;
    }
    if (commandId == QStringLiteral("refresh")) {
        m_workspace->refreshCurrent();
        return;
    }
    if (commandId == QStringLiteral("go_up")) {
        m_workspace->goUpCurrent();
    }
}

void MainWindow::onPathChanged(const QString &path) {
    const QFileInfo info(path);
    const QString navigationPath = info.exists() && info.isFile() ? info.absolutePath() : path;

    m_toolbar->setCurrentPath(path);
    m_toolbar->setViewModeEnabled(m_workspace->currentSupportsViewMode());
    m_toolbar->setWorkspaceMode(m_workspace->currentSupportsViewMode());
    m_sidebar->highlightCurrent(navigationPath);
    m_sidebar->recordRecentLocation(navigationPath);
    m_statusStrip->setPath(path);
    m_rail->setSearchRoot(navigationPath);

    if (m_workspace->currentSupportsViewMode() && m_workspace->currentPane()) {
        m_statusStrip->setItemCount(m_workspace->currentPane()->itemCount());
        m_toolbar->setNavigationState(m_workspace->canGoBackCurrent(),
                                      m_workspace->canGoForwardCurrent(),
                                      m_workspace->canGoUpCurrent());
        m_toolbar->setViewMode(m_workspace->currentViewMode());
    } else {
        m_statusStrip->setItemCount(1);
        m_toolbar->setNavigationState(false, false, m_workspace->canGoUpCurrent());
    }
}

void MainWindow::setRailVisible(bool visible) {
    if (m_railVisible == visible) {
        m_toolbar->setRailVisible(visible);
        return;
    }

    const QList<int> currentSizes = m_splitter->sizes();
    if (!currentSizes.isEmpty() && currentSizes.size() >= 3 && currentSizes.at(2) > 0) {
        m_lastRailWidth = currentSizes.at(2);
    }

    m_railVisible = visible;
    m_rail->setVisible(visible);
    m_toolbar->setRailVisible(visible);

    if (visible) {
        const int totalWidth = qMax(1200, width());
        const int sidebarWidth = currentSizes.size() >= 1 ? currentSizes.at(0) : 232;
        const int railWidth = qMax(360, m_lastRailWidth);
        const int workspaceWidth = qMax(560, totalWidth - sidebarWidth - railWidth);
        m_splitter->setSizes({sidebarWidth, workspaceWidth, railWidth});
        return;
    }

    const int sidebarWidth = currentSizes.size() >= 1 ? currentSizes.at(0) : 232;
    m_splitter->setSizes({sidebarWidth, qMax(720, width() - sidebarWidth), 0});
}

void MainWindow::toggleRailVisible() {
    setRailVisible(!m_railVisible);
}

} // namespace Ixplorer
