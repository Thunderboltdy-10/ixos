#include "app/MainWindow.h"
#include "widgets/ExplorerToolbar.h"
#include "widgets/AppSidebar.h"
#include "widgets/TabWorkspace.h"
#include "widgets/ExplorerPane.h"
#include "widgets/IxosRail.h"
#include "widgets/StatusStrip.h"

#include <QDir>
#include <QKeyEvent>
#include <QLocale>
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
    , m_splitter(new QSplitter(Qt::Horizontal, this)) {
    setWindowTitle("Ixplorer");
    resize(1440, 860);
    setMinimumSize(1100, 700);

    setupLayout();
    setupConnections();
    setupShortcuts();

    // Open default tab
    m_workspace->addTab(QDir::homePath());
}

void MainWindow::navigateTo(const QString &path) {
    m_workspace->navigateCurrentTab(path);
    m_toolbar->pushHistory(path);
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
    m_splitter->setStretchFactor(0, 0); // sidebar: fixed
    m_splitter->setStretchFactor(1, 1); // workspace: stretch
    m_splitter->setStretchFactor(2, 0); // rail: fixed
    m_splitter->setSizes({240, 920, 280});

    vbox->addWidget(m_splitter, 1);
    vbox->addWidget(m_statusStrip);

    setCentralWidget(central);
}

void MainWindow::setupConnections() {
    // Sidebar → navigate
    connect(m_sidebar, &AppSidebar::locationSelected, this, &MainWindow::navigateTo);

    // Toolbar → navigate
    connect(m_toolbar, &ExplorerToolbar::navigateRequested, this, &MainWindow::navigateTo);

    // Toolbar back/forward/up/refresh
    connect(m_toolbar, &ExplorerToolbar::backRequested, this, [this]() {
        QString path = m_toolbar->goBack();
        if (!path.isEmpty())
            m_workspace->navigateCurrentTab(path);
    });

    connect(m_toolbar, &ExplorerToolbar::forwardRequested, this, [this]() {
        QString path = m_toolbar->goForward();
        if (!path.isEmpty())
            m_workspace->navigateCurrentTab(path);
    });

    connect(m_toolbar, &ExplorerToolbar::upRequested, this, [this]() {
        auto *pane = m_workspace->currentPane();
        if (!pane) return;
        QDir dir(pane->currentPath());
        if (dir.cdUp())
            navigateTo(dir.absolutePath());
    });

    connect(m_toolbar, &ExplorerToolbar::refreshRequested, this, [this]() {
        auto *pane = m_workspace->currentPane();
        if (pane) pane->refresh();
    });

    // Workspace → sync panels
    connect(m_workspace, &TabWorkspace::pathChanged, this, &MainWindow::onPathChanged);

    connect(m_workspace, &TabWorkspace::fileSelected, this, [this](const QFileInfo &info) {
        m_rail->showFileDetails(info);
        QString selInfo;
        if (info.isDir()) {
            selInfo = QString("Folder: %1").arg(info.fileName());
        } else {
            QLocale locale;
            selInfo = QString("%1 — %2").arg(info.fileName(), locale.formattedDataSize(info.size()));
        }
        m_statusStrip->setSelectionInfo(selInfo);
    });

    connect(m_workspace, &TabWorkspace::currentTabChanged, this, [this](int) {
        auto *pane = m_workspace->currentPane();
        if (pane)
            onPathChanged(pane->currentPath());
    });
}

void MainWindow::setupShortcuts() {
    // Ctrl+T: new tab
    auto *newTab = new QShortcut(QKeySequence("Ctrl+T"), this);
    connect(newTab, &QShortcut::activated, this, [this]() {
        m_workspace->addTab(QDir::homePath());
    });

    // Ctrl+W: close tab
    auto *closeTab = new QShortcut(QKeySequence("Ctrl+W"), this);
    connect(closeTab, &QShortcut::activated, this, [this]() {
        m_workspace->closeTab(m_workspace->currentTabIndex());
    });

    // F5: refresh
    auto *refresh = new QShortcut(QKeySequence("F5"), this);
    connect(refresh, &QShortcut::activated, this, [this]() {
        auto *pane = m_workspace->currentPane();
        if (pane) pane->refresh();
    });

    // Alt+Left: back
    auto *back = new QShortcut(QKeySequence("Alt+Left"), this);
    connect(back, &QShortcut::activated, this, [this]() {
        QString path = m_toolbar->goBack();
        if (!path.isEmpty())
            m_workspace->navigateCurrentTab(path);
    });

    // Alt+Right: forward
    auto *forward = new QShortcut(QKeySequence("Alt+Right"), this);
    connect(forward, &QShortcut::activated, this, [this]() {
        QString path = m_toolbar->goForward();
        if (!path.isEmpty())
            m_workspace->navigateCurrentTab(path);
    });

    // Alt+Up: parent directory
    auto *up = new QShortcut(QKeySequence("Alt+Up"), this);
    connect(up, &QShortcut::activated, this, [this]() {
        auto *pane = m_workspace->currentPane();
        if (!pane) return;
        QDir dir(pane->currentPath());
        if (dir.cdUp())
            navigateTo(dir.absolutePath());
    });
}

void MainWindow::onPathChanged(const QString &path) {
    m_toolbar->setCurrentPath(path);
    m_toolbar->pushHistory(path);
    m_sidebar->highlightCurrent(path);
    m_statusStrip->setPath(path);

    auto *pane = m_workspace->currentPane();
    if (pane)
        m_statusStrip->setItemCount(pane->itemCount());
}

} // namespace Ixplorer
