#include "widgets/TabWorkspace.h"
#include "widgets/ExplorerPane.h"

#include <QDir>
#include <QVBoxLayout>

namespace Ixplorer {

TabWorkspace::TabWorkspace(QWidget *parent)
    : QWidget(parent)
    , m_tabBar(new QTabBar(this))
    , m_stack(new QStackedWidget(this)) {
    auto *layout = new QVBoxLayout(this);
    layout->setContentsMargins(0, 0, 0, 0);
    layout->setSpacing(0);

    m_tabBar->setTabsClosable(true);
    m_tabBar->setMovable(true);
    m_tabBar->setExpanding(false);
    m_tabBar->setDrawBase(false);

    layout->addWidget(m_tabBar);
    layout->addWidget(m_stack, 1);

    connect(m_tabBar, &QTabBar::currentChanged, this, &TabWorkspace::onTabChanged);
    connect(m_tabBar, &QTabBar::tabCloseRequested, this, &TabWorkspace::onTabCloseRequested);

    // "+" button as the last tab
    int plusIdx = m_tabBar->addTab("+");
    m_tabBar->setTabButton(plusIdx, QTabBar::RightSide, nullptr);
    // We'll handle clicks on the "+" tab via currentChanged
}

ExplorerPane *TabWorkspace::currentPane() const {
    return qobject_cast<ExplorerPane *>(m_stack->currentWidget());
}

ExplorerPane *TabWorkspace::paneAt(int index) const {
    return qobject_cast<ExplorerPane *>(m_stack->widget(index));
}

int TabWorkspace::addTab(const QString &path) {
    auto *pane = new ExplorerPane(path, this);

    // Connect pane signals
    connect(pane, &ExplorerPane::pathChanged, this, [this, pane](const QString &p) {
        int idx = m_stack->indexOf(pane);
        if (idx >= 0) {
            QDir dir(p);
            m_tabBar->setTabText(idx, dir.dirName().isEmpty() ? p : dir.dirName());
        }
        if (m_stack->currentWidget() == pane)
            emit pathChanged(p);
    });

    connect(pane, &ExplorerPane::fileSelected, this, [this, pane](const QFileInfo &info) {
        if (m_stack->currentWidget() == pane)
            emit fileSelected(info);
    });

    connect(pane, &ExplorerPane::fileActivated, this, [this, pane](const QFileInfo &info) {
        if (m_stack->currentWidget() == pane)
            emit fileActivated(info);
    });

    m_stack->addWidget(pane);

    // Insert tab before the "+" tab
    int insertIdx = m_tabBar->count() - 1; // before "+"
    QDir dir(path);
    QString label = dir.dirName().isEmpty() ? path : dir.dirName();
    m_tabBar->insertTab(insertIdx, label);
    m_tabBar->setCurrentIndex(insertIdx);

    return insertIdx;
}

void TabWorkspace::closeTab(int index) {
    // Don't close the "+" tab, and keep at least one real tab
    int realTabCount = m_tabBar->count() - 1; // exclude "+"
    if (index >= realTabCount || realTabCount <= 1)
        return;

    auto *pane = paneAt(index);
    m_tabBar->removeTab(index);
    if (pane) {
        m_stack->removeWidget(pane);
        pane->deleteLater();
    }
}

void TabWorkspace::navigateCurrentTab(const QString &path) {
    auto *pane = currentPane();
    if (pane)
        pane->setPath(path);
}

int TabWorkspace::currentTabIndex() const {
    return m_tabBar->currentIndex();
}

void TabWorkspace::onTabChanged(int index) {
    int plusIdx = m_tabBar->count() - 1;
    if (index == plusIdx) {
        // Clicked the "+" tab — create new tab, then switch back
        int newIdx = addTab(QDir::homePath());
        m_tabBar->setCurrentIndex(newIdx);
        return;
    }

    if (index >= 0 && index < m_stack->count()) {
        m_stack->setCurrentIndex(index);
        emit currentTabChanged(index);

        auto *pane = currentPane();
        if (pane) {
            emit pathChanged(pane->currentPath());
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
