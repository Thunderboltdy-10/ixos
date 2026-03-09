#include "widgets/TabWorkspace.h"
#include "widgets/ExplorerPane.h"

#include <QDir>
#include <QFileInfo>
#include <QHBoxLayout>
#include <QVBoxLayout>

namespace Ixplorer {

TabWorkspace::TabWorkspace(QWidget *parent)
    : QWidget(parent)
    , m_tabBar(new QTabBar(this))
    , m_addTabButton(new QToolButton(this))
    , m_stack(new QStackedWidget(this)) {
    auto *layout = new QVBoxLayout(this);
    layout->setContentsMargins(0, 0, 0, 0);
    layout->setSpacing(0);

    auto *tabRow = new QHBoxLayout();
    tabRow->setContentsMargins(0, 0, 0, 0);
    tabRow->setSpacing(0);

    m_tabBar->setTabsClosable(true);
    m_tabBar->setMovable(false);
    m_tabBar->setExpanding(false);
    m_tabBar->setDrawBase(false);

    m_addTabButton->setObjectName("TabAddButton");
    m_addTabButton->setText("+");
    m_addTabButton->setAutoRaise(true);
    m_addTabButton->setToolTip("New tab");

    tabRow->addWidget(m_tabBar, 1);
    tabRow->addWidget(m_addTabButton);
    layout->addLayout(tabRow);
    layout->addWidget(m_stack, 1);

    connect(m_tabBar, &QTabBar::currentChanged, this, &TabWorkspace::onTabChanged);
    connect(m_tabBar, &QTabBar::tabCloseRequested, this, &TabWorkspace::onTabCloseRequested);
    connect(m_addTabButton, &QToolButton::clicked, this, &TabWorkspace::onNewTabClicked);
}

ExplorerPane *TabWorkspace::currentPane() const {
    return qobject_cast<ExplorerPane *>(m_stack->currentWidget());
}

ExplorerPane *TabWorkspace::paneAt(int index) const {
    return qobject_cast<ExplorerPane *>(m_stack->widget(index));
}

int TabWorkspace::addTab(const QString &path) {
    const QFileInfo info(path);
    const QString initialPath = info.exists() && info.isFile() ? info.absolutePath() : path;
    auto *pane = new ExplorerPane(initialPath, this);

    connect(pane, &ExplorerPane::pathChanged, this, [this, pane](const QString &p) {
        const int idx = m_stack->indexOf(pane);
        if (idx >= 0) {
            const QDir dir(p);
            m_tabBar->setTabText(idx, dir.dirName().isEmpty() ? p : dir.dirName());
        }
        if (m_stack->currentWidget() == pane) {
            emit pathChanged(p);
        }
    });
    connect(pane, &ExplorerPane::navigationStateChanged, this, [this, pane](bool back, bool forward, bool up) {
        if (m_stack->currentWidget() == pane) {
            emit navigationStateChanged(back, forward, up);
        }
    });
    connect(pane, &ExplorerPane::selectionChanged, this, [this, pane](const QFileInfo &selected, int count, quint64 bytes) {
        if (m_stack->currentWidget() == pane) {
            emit selectionChanged(selected, count, bytes);
        }
    });
    connect(pane, &ExplorerPane::selectionCleared, this, [this, pane]() {
        if (m_stack->currentWidget() == pane) {
            emit selectionCleared();
        }
    });
    connect(pane, &ExplorerPane::fileActivated, this, [this, pane](const QFileInfo &selected) {
        if (m_stack->currentWidget() == pane) {
            emit fileActivated(selected);
        }
    });
    connect(pane, &ExplorerPane::openInNewTabRequested, this, &TabWorkspace::openInNewTabRequested);
    connect(pane, &ExplorerPane::statusMessage, this, &TabWorkspace::statusMessage);

    m_stack->addWidget(pane);

    const int insertIndex = m_tabBar->count();
    const QDir dir(initialPath);
    m_tabBar->addTab(dir.dirName().isEmpty() ? initialPath : dir.dirName());
    m_tabBar->setCurrentIndex(insertIndex);

    if (info.exists() && info.isFile()) {
        pane->selectPath(info.absoluteFilePath());
    }

    return insertIndex;
}

void TabWorkspace::closeTab(int index) {
    if (index < 0 || index >= m_tabBar->count() || m_tabBar->count() <= 1) {
        return;
    }

    auto *pane = paneAt(index);
    m_tabBar->removeTab(index);
    if (pane) {
        m_stack->removeWidget(pane);
        pane->deleteLater();
    }
}

void TabWorkspace::navigateCurrentTab(const QString &path) {
    if (auto *pane = currentPane()) {
        pane->setPath(path);
    }
}

void TabWorkspace::revealPathInCurrentTab(const QString &path) {
    if (auto *pane = currentPane()) {
        pane->selectPath(path);
    }
}

void TabWorkspace::revealPathInNewTab(const QString &path) {
    const QFileInfo info(path);
    const QString directory = info.isDir() ? info.absoluteFilePath() : info.absolutePath();
    const int index = addTab(directory);
    if (auto *pane = paneAt(index)) {
        pane->selectPath(path);
    }
}

int TabWorkspace::currentTabIndex() const {
    return m_tabBar->currentIndex();
}

void TabWorkspace::onTabChanged(int index) {
    if (index >= 0 && index < m_stack->count()) {
        m_stack->setCurrentIndex(index);
        emit currentTabChanged(index);

        if (auto *pane = currentPane()) {
            emit pathChanged(pane->currentPath());
            emit navigationStateChanged(pane->canGoBack(), pane->canGoForward(), pane->canGoUp());
        }
    }
}

void TabWorkspace::onTabCloseRequested(int index) {
    closeTab(index);
}

void TabWorkspace::onNewTabClicked() {
    addTab(QDir::homePath());
}

} // namespace Ixplorer
