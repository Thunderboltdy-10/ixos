#include "app/MainWindow.h"
#include "widgets/AppSidebar.h"
#include "widgets/ExplorerPane.h"
#include "widgets/ExplorerToolbar.h"
#include "widgets/IxosRail.h"
#include "widgets/StatusStrip.h"
#include "widgets/TabWorkspace.h"

#include <QDesktopServices>
#include <QDir>
#include <QFileInfo>
#include <QKeyEvent>
#include <QProcess>
#include <QShortcut>
#include <QUrl>
#include <QVBoxLayout>

namespace Ixplorer {

namespace {

void revealInSystemExplorer(const QString &path) {
#ifdef Q_OS_WIN
    QProcess::startDetached("explorer", {"/select,", QDir::toNativeSeparators(path)});
#elif defined(Q_OS_MACOS)
    QProcess::startDetached("open", {"-R", path});
#else
    QProcess::startDetached("xdg-open", {QFileInfo(path).absolutePath()});
#endif
}

} // namespace

MainWindow::MainWindow(QWidget *parent)
    : QMainWindow(parent)
    , m_toolbar(new ExplorerToolbar(this))
    , m_sidebar(new AppSidebar(this))
    , m_workspace(new TabWorkspace(this))
    , m_rail(new IxosRail(this))
    , m_statusStrip(new StatusStrip(this))
    , m_splitter(new QSplitter(Qt::Horizontal, this)) {
    setWindowTitle("Ixplorer");
    resize(1440, 860);
    setMinimumSize(1100, 700);

    setupLayout();
    setupConnections();
    setupShortcuts();

    m_workspace->addTab(QDir::homePath());
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
    m_splitter->setSizes({232, 930, 320});

    vbox->addWidget(m_splitter, 1);
    vbox->addWidget(m_statusStrip);

    setCentralWidget(central);
}

void MainWindow::setupConnections() {
    connect(m_sidebar, &AppSidebar::locationSelected, this, &MainWindow::navigateTo);

    connect(m_toolbar, &ExplorerToolbar::navigateRequested, this, &MainWindow::navigateTo);
    connect(m_toolbar, &ExplorerToolbar::searchRequested, m_rail, &IxosRail::submitToolbarSearch);
    connect(m_toolbar, &ExplorerToolbar::viewModeChanged, this, [this](int mode) {
        if (auto *pane = m_workspace->currentPane()) {
            pane->setViewMode(static_cast<ExplorerPane::ViewMode>(mode));
        }
    });

    connect(m_toolbar, &ExplorerToolbar::backRequested, this, [this]() {
        if (auto *pane = m_workspace->currentPane()) {
            pane->goBack();
        }
    });
    connect(m_toolbar, &ExplorerToolbar::forwardRequested, this, [this]() {
        if (auto *pane = m_workspace->currentPane()) {
            pane->goForward();
        }
    });
    connect(m_toolbar, &ExplorerToolbar::upRequested, this, [this]() {
        if (auto *pane = m_workspace->currentPane()) {
            pane->goUp();
        }
    });
    connect(m_toolbar, &ExplorerToolbar::refreshRequested, this, [this]() {
        if (auto *pane = m_workspace->currentPane()) {
            pane->refresh();
        }
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
        if (auto *pane = m_workspace->currentPane()) {
            onPathChanged(pane->currentPath());
            m_toolbar->setViewMode(static_cast<int>(pane->viewMode()));
        }
    });

    connect(m_workspace, &TabWorkspace::openInNewTabRequested, this, [this](const QString &path) {
        m_workspace->addTab(path);
    });

    connect(m_rail, &IxosRail::revealPathInWorkspaceRequested, this, [this](const QString &path) {
        m_workspace->revealPathInCurrentTab(path);
    });
    connect(m_rail, &IxosRail::openPathInNewTabRequested, this, [this](const QString &path) {
        m_workspace->revealPathInNewTab(path);
        const QFileInfo info(path);
        if (info.exists() && !info.isDir()) {
            QDesktopServices::openUrl(QUrl::fromLocalFile(info.absoluteFilePath()));
        }
    });
    connect(m_rail, &IxosRail::openFileRequested, this, [this](const QString &path) {
        const QFileInfo info(path);
        if (!info.exists()) {
            return;
        }

        m_workspace->revealPathInCurrentTab(path);
        if (info.isDir()) {
            return;
        }

        QDesktopServices::openUrl(QUrl::fromLocalFile(info.absoluteFilePath()));
    });
    connect(m_rail, &IxosRail::revealPathRequested, this, [](const QString &path) {
        revealInSystemExplorer(path);
    });
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
        if (auto *pane = m_workspace->currentPane()) {
            pane->refresh();
        }
    });

    auto *back = new QShortcut(QKeySequence("Alt+Left"), this);
    connect(back, &QShortcut::activated, this, [this]() {
        if (auto *pane = m_workspace->currentPane()) {
            pane->goBack();
        }
    });

    auto *forward = new QShortcut(QKeySequence("Alt+Right"), this);
    connect(forward, &QShortcut::activated, this, [this]() {
        if (auto *pane = m_workspace->currentPane()) {
            pane->goForward();
        }
    });

    auto *up = new QShortcut(QKeySequence("Alt+Up"), this);
    connect(up, &QShortcut::activated, this, [this]() {
        if (auto *pane = m_workspace->currentPane()) {
            pane->goUp();
        }
    });
}

void MainWindow::onPathChanged(const QString &path) {
    m_toolbar->setCurrentPath(path);
    m_sidebar->highlightCurrent(path);
    m_sidebar->recordRecentLocation(path);
    m_statusStrip->setPath(path);
    m_rail->setSearchRoot(path);

    if (auto *pane = m_workspace->currentPane()) {
        m_statusStrip->setItemCount(pane->itemCount());
        m_toolbar->setNavigationState(pane->canGoBack(), pane->canGoForward(), pane->canGoUp());
        m_toolbar->setViewMode(static_cast<int>(pane->viewMode()));
    }
}

} // namespace Ixplorer
