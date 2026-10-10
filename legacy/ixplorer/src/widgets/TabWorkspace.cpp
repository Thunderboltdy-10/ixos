#include "widgets/TabWorkspace.h"

#include "theme/IconFont.h"
#include "theme/Colors.h"
#include "utils/FileOperations.h"
#include "utils/FileOpenPolicy.h"
#include "widgets/BreadcrumbBar.h"
#include "widgets/DocumentPane.h"
#include "widgets/ExplorerPane.h"
#include "widgets/HomeDashboardPane.h"

#include <QDesktopServices>
#include <QDir>
#include <QFileInfo>
#include <QFileIconProvider>
#include <QHBoxLayout>
#include <QHoverEvent>
#include <QMenu>
#include <QStyle>
#include <QTimer>
#include <QUrl>
#include <QVBoxLayout>

namespace Ixplorer {

namespace {

QString tabLabelForPath(const QString &path) {
    if (path == QStringLiteral("ixplorer://home")) {
        return QStringLiteral("Home");
    }
    const QFileInfo info(path);
    if (info.exists() && info.fileName().isEmpty()) {
        return QDir::toNativeSeparators(path);
    }

    const QString name = info.fileName();
    if (!name.isEmpty()) {
        return name;
    }

    const QDir dir(path);
    return dir.dirName().isEmpty() ? QDir::toNativeSeparators(path) : dir.dirName();
}

void openExternally(const QString &path) {
    QDesktopServices::openUrl(QUrl::fromLocalFile(path));
}

QToolButton *makeTabCloseButton(QTabBar *tabBar, TabWorkspace *workspace) {
    auto *button = new QToolButton(tabBar);
    button->setObjectName("TabCloseButton");
    QColor iconColor = Colors::qc(Colors::FgMuted);
    button->setIcon(Icons::makeIconFromFont(Icons::Close, 12, iconColor));
    button->setAutoRaise(true);
    button->setCursor(Qt::PointingHandCursor);
    button->setStyleSheet(
        "QToolButton { border: none; background: transparent; padding: 2px; border-radius: 4px; }"
        "QToolButton:hover { background: rgba(255,255,255,0.12); }"
    );
    QObject::connect(button, &QToolButton::clicked, workspace, [tabBar, workspace, button]() {
        for (int index = 0; index < tabBar->count(); ++index) {
            if (tabBar->tabButton(index, QTabBar::RightSide) == button) {
                workspace->closeTab(index);
                return;
            }
        }
    });
    return button;
}

} // namespace

TabWorkspace::TabWorkspace(QWidget *parent)
    : QWidget(parent)
    , m_tabBar(new QTabBar(this))
    , m_addTabButton(new QToolButton(this))
    , m_breadcrumb(new BreadcrumbBar(this))
    , m_stack(new QStackedWidget(this)) {
    auto *layout = new QVBoxLayout(this);
    layout->setContentsMargins(0, 0, 0, 0);
    layout->setSpacing(0);

    m_tabBar->setTabsClosable(true);
    m_tabBar->setMovable(true);
    m_tabBar->setExpanding(false);
    m_tabBar->setDrawBase(false);
    m_tabBar->setUsesScrollButtons(true);
    m_tabBar->setElideMode(Qt::ElideRight);
    m_tabBar->setDocumentMode(true);
    m_tabBar->setContextMenuPolicy(Qt::CustomContextMenu);
    m_tabBar->setAttribute(Qt::WA_Hover, true);
    m_tabBar->installEventFilter(this);

    // Tab styling handled by ixplorer_dark.qss — no inline overrides

    m_addTabButton->setObjectName("TabAddButton");
    m_addTabButton->setIcon(Icons::makeIconFromFont(Icons::Plus, 16));
    m_addTabButton->setFixedSize(32, 32);
    m_addTabButton->setCursor(Qt::PointingHandCursor);
    m_addTabButton->setAutoRaise(true);
    m_addTabButton->setToolTip("New tab");

    layout->addWidget(m_stack, 1);

    connect(m_tabBar, &QTabBar::currentChanged, this, &TabWorkspace::onTabChanged);
    connect(m_tabBar, &QTabBar::tabMoved, this, &TabWorkspace::onTabMoved);
    connect(m_tabBar, &QTabBar::tabCloseRequested, this, &TabWorkspace::onTabCloseRequested);
    connect(m_tabBar, &QWidget::customContextMenuRequested, this, &TabWorkspace::showContextMenu);
    connect(m_addTabButton, &QToolButton::clicked, this, &TabWorkspace::onNewTabClicked);
    connect(m_breadcrumb, &BreadcrumbBar::navigateRequested, this, &TabWorkspace::navigateCurrentTab);
}

void TabWorkspace::setCurrentPath(const QString &path) {
    m_breadcrumb->setPath(path);
}

void TabWorkspace::showHomeDashboard() {
    for (int index = 0; index < m_stack->count(); ++index) {
        if (qobject_cast<HomeDashboardPane *>(m_stack->widget(index)) != nullptr) {
            m_tabBar->setCurrentIndex(index);
            return;
        }
    }
    addTab(QStringLiteral("ixplorer://home"));
}

int TabWorkspace::tabCount() const {
    return m_tabBar->count();
}

QVector<TabState> TabWorkspace::captureTabState() const {
    QVector<TabState> tabs;
    tabs.reserve(m_stack->count());
    for (int index = 0; index < m_stack->count(); ++index) {
        TabState tab;
        if (auto *pane = qobject_cast<ExplorerPane *>(m_stack->widget(index))) {
            tab.path = pane->currentPath();
            tab.isDocument = false;
            tab.viewMode = static_cast<int>(pane->viewMode());
        } else if (auto *document = qobject_cast<DocumentPane *>(m_stack->widget(index))) {
            tab.path = document->filePath();
            tab.isDocument = true;
            tab.isPreview = document->isPreviewTab();
        } else if (qobject_cast<HomeDashboardPane *>(m_stack->widget(index)) != nullptr) {
            tab.path = QStringLiteral("ixplorer://home");
            tab.isDocument = false;
        }
        if (!tab.path.isEmpty()) {
            tabs.append(tab);
        }
    }
    return tabs;
}

void TabWorkspace::restoreTabState(const QVector<TabState> &tabs, int activeTabIndex) {
    while (m_stack->count() > 0) {
        QWidget *widget = m_stack->widget(0);
        m_stack->removeWidget(widget);
        if (widget != nullptr) {
            widget->deleteLater();
        }
    }
    while (m_tabBar->count() > 0) {
        QWidget *rightButton = m_tabBar->tabButton(0, QTabBar::RightSide);
        QWidget *leftButton = m_tabBar->tabButton(0, QTabBar::LeftSide);
        m_tabBar->removeTab(0);
        if (rightButton != nullptr) {
            rightButton->deleteLater();
        }
        if (leftButton != nullptr) {
            leftButton->deleteLater();
        }
    }
    m_previewTabIndex = -1;

    for (const TabState &tab : tabs) {
        if (tab.path.isEmpty()) {
            continue;
        }
        if (tab.isDocument) {
            const int index = addDocumentTab(tab.path, tab.isPreview, true);
            if (tab.isPreview) {
                m_previewTabIndex = index;
            }
        } else {
            const int index = addTab(tab.path);
            if (auto *pane = paneAt(index)) {
                pane->setViewMode(static_cast<ExplorerPane::ViewMode>(tab.viewMode));
            }
        }
    }

    if (m_tabBar->count() == 0) {
        addTab("ixplorer://home");
        return;
    }

    m_tabBar->setCurrentIndex(qBound(0, activeTabIndex, m_tabBar->count() - 1));
}

ExplorerPane *TabWorkspace::currentPane() const {
    return qobject_cast<ExplorerPane *>(m_stack->currentWidget());
}

DocumentPane *TabWorkspace::currentDocument() const {
    return qobject_cast<DocumentPane *>(m_stack->currentWidget());
}

HomeDashboardPane *TabWorkspace::currentDashboard() const {
    return qobject_cast<HomeDashboardPane *>(m_stack->currentWidget());
}

ExplorerPane *TabWorkspace::paneAt(int index) const {
    return qobject_cast<ExplorerPane *>(m_stack->widget(index));
}

int TabWorkspace::addTab(const QString &path) {
    if (path == QStringLiteral("ixplorer://home") || path.isEmpty()) {
        return addDashboardTab();
    }
    const QFileInfo info(path);
    if (info.exists() && info.isFile()) {
        const int index = addDocumentTab(info.absoluteFilePath(), false);
        return index >= 0 ? index : currentTabIndex();
    }
    return addExplorerTab(info.exists() ? info.absoluteFilePath() : path);
}

bool TabWorkspace::previewPath(const QString &path) {
    const QFileInfo info(path);
    if (!info.exists() || !info.isFile()) {
        return false;
    }

    if (!shouldAutoOpenInWorkspace(info)) {
        return false;
    }

    const int existingIndex = findDocumentTab(info.absoluteFilePath());
    if (existingIndex >= 0) {
        m_tabBar->setCurrentIndex(existingIndex);
        return true;
    }

    if (m_previewTabIndex >= 0) {
        auto *previewPane = qobject_cast<DocumentPane *>(m_stack->widget(m_previewTabIndex));
        if (!previewPane || !previewPane->isPreviewTab() || !previewPane->canReusePreviewTab()) {
            m_previewTabIndex = -1;
        }
    }

    if (m_previewTabIndex >= 0 && m_previewTabIndex < m_stack->count()) {
        auto *pane = new DocumentPane(info.absoluteFilePath(), true, this);
        replaceWidgetAt(m_previewTabIndex, pane, info.absoluteFilePath());
        m_tabBar->setCurrentIndex(m_previewTabIndex);
        return true;
    }

    m_previewTabIndex = addDocumentTab(info.absoluteFilePath(), true);
    return m_previewTabIndex >= 0;
}

void TabWorkspace::closeTab(int index) {
    if (index < 0 || index >= m_tabBar->count() || m_tabBar->count() <= 1) {
        return;
    }

    auto *document = qobject_cast<DocumentPane *>(m_stack->widget(index));
    if (document && !document->canClose()) {
        return;
    }

    auto *widget = m_stack->widget(index);
    m_tabBar->removeTab(index);
    if (widget) {
        m_stack->removeWidget(widget);
        widget->deleteLater();
    }

    if (m_previewTabIndex == index) {
        m_previewTabIndex = -1;
    } else if (m_previewTabIndex > index) {
        --m_previewTabIndex;
    }

    updateSignalsForCurrentWidget();
    updateAdaptiveTabWidth();
}

void TabWorkspace::navigateCurrentTab(const QString &path) {
    if (auto *pane = currentPane()) {
        pane->setPath(path);
        return;
    }

    const QFileInfo info(path);
    const QString targetPath = info.exists() && info.isFile() ? info.absolutePath() : path;
    replaceWidgetAt(currentTabIndex(), new ExplorerPane(targetPath, this), targetPath);
    if (auto *pane = currentPane(); pane && info.exists() && info.isFile()) {
        pane->selectPath(info.absoluteFilePath());
    }
}

void TabWorkspace::revealPathInCurrentTab(const QString &path) {
    if (auto *pane = currentPane()) {
        pane->selectPath(path);
        return;
    }

    const QFileInfo info(path);
    const QString targetPath = info.exists() && info.isFile() ? info.absolutePath() : path;
    replaceWidgetAt(currentTabIndex(), new ExplorerPane(targetPath, this), targetPath);
    if (auto *pane = currentPane()) {
        pane->selectPath(path);
    }
}

void TabWorkspace::revealPathInNewTab(const QString &path) {
    const QFileInfo info(path);
    const QString directory = info.isDir() ? info.absoluteFilePath() : info.absolutePath();
    const int index = addExplorerTab(directory);
    if (auto *pane = paneAt(index)) {
        pane->selectPath(path);
    }
}

int TabWorkspace::currentTabIndex() const {
    return m_tabBar->currentIndex();
}

bool TabWorkspace::canGoBackCurrent() const {
    if (auto *pane = currentPane()) {
        return pane->canGoBack();
    }
    return false;
}

bool TabWorkspace::canGoForwardCurrent() const {
    if (auto *pane = currentPane()) {
        return pane->canGoForward();
    }
    return false;
}

bool TabWorkspace::canGoUpCurrent() const {
    if (auto *pane = currentPane()) {
        return pane->canGoUp();
    }
    if (auto *document = currentDocument()) {
        return document->canGoUp();
    }
    return false;
}

void TabWorkspace::goBackCurrent() {
    if (auto *pane = currentPane()) {
        pane->goBack();
    }
}

void TabWorkspace::goForwardCurrent() {
    if (auto *pane = currentPane()) {
        pane->goForward();
    }
}

void TabWorkspace::goUpCurrent() {
    if (auto *pane = currentPane()) {
        pane->goUp();
        return;
    }

    if (auto *document = currentDocument()) {
        navigateCurrentTab(QFileInfo(document->filePath()).absolutePath());
    }
}

void TabWorkspace::refreshCurrent() {
    if (auto *pane = currentPane()) {
        pane->refresh();
        return;
    }
    if (auto *document = currentDocument()) {
        document->reload();
    }
}

void TabWorkspace::setCurrentViewMode(int mode) {
    if (auto *pane = currentPane()) {
        pane->setViewMode(static_cast<ExplorerPane::ViewMode>(mode));
    }
}

int TabWorkspace::currentViewMode() const {
    if (auto *pane = currentPane()) {
        return static_cast<int>(pane->viewMode());
    }
    return static_cast<int>(ExplorerPane::ViewMode::Details);
}

bool TabWorkspace::currentSupportsViewMode() const {
    return currentPane() != nullptr;
}

void TabWorkspace::setIntelligence(WorkstreamManager *wm, ResumptionEngine *re, ActivityTracker *at) {
    m_wm = wm;
    m_re = re;
    m_at = at;
}

int TabWorkspace::addDashboardTab() {
    auto *pane = new HomeDashboardPane(this);
    pane->setIntelligence(m_wm, m_re, m_at);
    connectDashboardTab(pane);

    const int insertIndex = m_tabBar->count();
    m_stack->addWidget(pane);
    m_tabBar->addTab("Home");

    m_tabBar->setTabIcon(insertIndex, Icons::makeIconFromFont(Icons::Home, 16));
    m_tabBar->setTabButton(insertIndex, QTabBar::RightSide, makeTabCloseButton(m_tabBar, this));

    updateTabMetadata(insertIndex, "ixplorer://home");
    m_tabBar->setCurrentIndex(insertIndex);
    updateAdaptiveTabWidth();
    return insertIndex;
}

int TabWorkspace::addExplorerTab(const QString &path) {
    auto *pane = new ExplorerPane(path, this);
    connectExplorerTab(pane);

    const int insertIndex = m_tabBar->count();
    m_stack->addWidget(pane);
    m_tabBar->addTab(tabLabelForPath(path));
    
    QFileIconProvider iconProvider;
    m_tabBar->setTabIcon(insertIndex, iconProvider.icon(QFileIconProvider::Folder));
    m_tabBar->setTabButton(insertIndex, QTabBar::RightSide, makeTabCloseButton(m_tabBar, this));
    
    updateTabMetadata(insertIndex, path);
    m_tabBar->setCurrentIndex(insertIndex);
    updateAdaptiveTabWidth();
    return insertIndex;
}

int TabWorkspace::addDocumentTab(const QString &path, bool preview, bool launchDeferred) {
    const int existingIndex = findDocumentTab(path);
    if (existingIndex >= 0) {
        if (!preview) {
            if (auto *document = qobject_cast<DocumentPane *>(m_stack->widget(existingIndex))) {
                document->setPreviewMode(false);
            }
            if (m_previewTabIndex == existingIndex) {
                m_previewTabIndex = -1;
            }
        }
        m_tabBar->setCurrentIndex(existingIndex);
        return existingIndex;
    }

    const FileOpenPolicy policy = resolveFileOpenPolicy(QFileInfo(path));
    if (!policy.opensInApp()) {
        openExternally(path);
        emit statusMessage(policy.detail);
        return currentTabIndex();
    }

    auto *pane = new DocumentPane(path, preview, this, launchDeferred);

    connectDocumentTab(pane);

    const int index = m_tabBar->count();
    m_stack->addWidget(pane);
    m_tabBar->addTab(tabLabelForPath(path));
    
    QFileIconProvider iconProvider;
    m_tabBar->setTabIcon(index, iconProvider.icon(QFileInfo(path)));
    m_tabBar->setTabButton(index, QTabBar::RightSide, makeTabCloseButton(m_tabBar, this));
    
    updateTabMetadata(index, path);
    m_tabBar->setCurrentIndex(index);
    updateAdaptiveTabWidth();
    return index;
}

int TabWorkspace::findDocumentTab(const QString &path) const {
    const QString canonical = QFileInfo(path).absoluteFilePath();
    for (int i = 0; i < m_stack->count(); ++i) {
        if (auto *document = qobject_cast<DocumentPane *>(m_stack->widget(i))) {
            if (document->filePath().compare(canonical, Qt::CaseInsensitive) == 0) {
                return i;
            }
        }
    }
    return -1;
}

bool TabWorkspace::eventFilter(QObject *watched, QEvent *event) {
    return QWidget::eventFilter(watched, event);
}

void TabWorkspace::showContextMenu(const QPoint &pos) {
    int index = m_tabBar->tabAt(pos);
    if (index < 0) return;

    QMenu menu(this);
    
    QAction *closeAction = menu.addAction("Close");
    connect(closeAction, &QAction::triggered, this, [this, index]() { closeTab(index); });
    
    QAction *closeOthersAction = menu.addAction("Close Others");
    connect(closeOthersAction, &QAction::triggered, this, [this, index]() {
        for (int i = m_tabBar->count() - 1; i >= 0; --i) {
            if (i != index) closeTab(i);
        }
    });
    
    QAction *closeRightAction = menu.addAction("Close Tabs to Right");
    connect(closeRightAction, &QAction::triggered, this, [this, index]() {
        for (int i = m_tabBar->count() - 1; i > index; --i) {
            closeTab(i);
        }
    });
    
    menu.addSeparator();
    
    QAction *duplicateAction = menu.addAction("Duplicate Tab");
    connect(duplicateAction, &QAction::triggered, this, [this, index]() {
        if (auto *pane = paneAt(index)) {
            addTab(pane->currentPath());
        } else if (auto *doc = qobject_cast<DocumentPane*>(m_stack->widget(index))) {
            addTab(doc->filePath());
        }
    });
    
    menu.exec(m_tabBar->mapToGlobal(pos));
}

void TabWorkspace::replaceWidgetAt(int index, QWidget *widget, const QString &path) {
    if (index < 0 || index >= m_stack->count()) {
        widget->deleteLater();
        return;
    }

    auto *existingDocument = qobject_cast<DocumentPane *>(m_stack->widget(index));
    if (existingDocument && !existingDocument->canClose()) {
        widget->deleteLater();
        return;
    }

    auto *oldWidget = m_stack->widget(index);
    m_stack->removeWidget(oldWidget);
    oldWidget->deleteLater();

    m_stack->insertWidget(index, widget);
    if (auto *pane = qobject_cast<ExplorerPane *>(widget)) {
        connectExplorerTab(pane);
    } else if (auto *document = qobject_cast<DocumentPane *>(widget)) {
        connectDocumentTab(document);
    }
    updateTabMetadata(index, path);
    m_stack->setCurrentIndex(index);
    m_tabBar->setCurrentIndex(index);
}

void TabWorkspace::connectExplorerTab(ExplorerPane *pane) {
    connect(pane, &ExplorerPane::pathChanged, this, [this, pane](const QString &p) {
        const int idx = m_stack->indexOf(pane);
        if (idx >= 0) {
            updateTabMetadata(idx, p);
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
    connect(pane, &ExplorerPane::fileActivated, this, [this](const QFileInfo &selected) {
        emit fileActivated(selected);
        addTab(selected.absoluteFilePath());
    });
    connect(pane, &ExplorerPane::openInNewTabRequested, this, [this](const QString &path) {
        addTab(path);
    });
    connect(pane, &ExplorerPane::statusMessage, this, &TabWorkspace::statusMessage);
}

void TabWorkspace::connectDocumentTab(DocumentPane *pane) {
    connect(pane, &DocumentPane::pathChanged, this, [this, pane](const QString &p) {
        const int idx = m_stack->indexOf(pane);
        if (idx >= 0) {
            updateTabMetadata(idx, p);
        }
        if (m_stack->currentWidget() == pane) {
            emit pathChanged(p);
        }
    });
    connect(pane, &DocumentPane::selectionChanged, this, [this, pane](const QFileInfo &info, int count, quint64 bytes) {
        if (m_stack->currentWidget() == pane) {
            emit selectionChanged(info, count, bytes);
        }
    });
    connect(pane, &DocumentPane::statusMessage, this, &TabWorkspace::statusMessage);
    connect(pane, &DocumentPane::surfaceToneChanged, this, [this, pane](const QColor &color) {
        if (m_stack->currentWidget() == pane) {
            emit surfaceToneChanged(color);
        }
    });
    connect(pane, &DocumentPane::openExternallyRequested, this, [this](const QString &path) {
        openExternally(path);
        emit statusMessage(QStringLiteral("Opened %1 externally.")
                               .arg(QFileInfo(path).fileName()));
    });
}

void TabWorkspace::connectDashboardTab(HomeDashboardPane *pane) {
    connect(pane, &HomeDashboardPane::pathActivated, this, [this](const QString &path) {
        addTab(path);
    });
    connect(pane, &HomeDashboardPane::workstreamActivated, this, [this](const QString &id) {
        emit workstreamActivated(id);
    });
    connect(pane, &HomeDashboardPane::searchRequested, this, [this](const QString &query) {
        emit searchRequested(query);
    });
    connect(pane, &HomeDashboardPane::statusMessage, this, &TabWorkspace::statusMessage);
}

void TabWorkspace::updateSignalsForCurrentWidget() {
    if (auto *pane = currentPane()) {
        emit pathChanged(pane->currentPath());
        emit navigationStateChanged(pane->canGoBack(), pane->canGoForward(), pane->canGoUp());
        emit surfaceToneChanged(QColor(18, 20, 24));
        return;
    }

    if (auto *document = currentDocument()) {
        const QFileInfo info(document->filePath());
        emit pathChanged(document->displayPath());
        emit navigationStateChanged(false, false, document->canGoUp());
        emit selectionChanged(info, 1, static_cast<quint64>(info.size()));
        emit surfaceToneChanged(document->surfaceTone());
        return;
    }
    
    if (auto *dashboard = currentDashboard()) {
        emit pathChanged(dashboard->currentPath());
        emit navigationStateChanged(false, false, false);
        emit surfaceToneChanged(QColor(18, 20, 24));
        return;
    }

    emit selectionCleared();
    emit surfaceToneChanged(QColor(18, 20, 24));
}

void TabWorkspace::updateTabMetadata(int index, const QString &path) {
    if (index < 0 || index >= m_tabBar->count()) {
        return;
    }

    m_tabBar->setTabText(index, tabLabelForPath(path));
    m_tabBar->setTabToolTip(index, QDir::toNativeSeparators(path));
}

void TabWorkspace::onTabChanged(int index) {
    if (index >= 0 && index < m_stack->count()) {
        m_stack->setCurrentIndex(index);
        emit currentTabChanged(index);
        QTimer::singleShot(0, this, [this]() {
            updateSignalsForCurrentWidget();
        });

        if (auto *document = currentDocument()) {
            QTimer::singleShot(50, document, [document]() {
                document->focusPrimaryControl();
            });
        }
    }
}

void TabWorkspace::onTabMoved(int from, int to) {
    if (from == to || from < 0 || to < 0 || from >= m_stack->count() || to >= m_stack->count()) {
        return;
    }

    QWidget *widget = m_stack->widget(from);
    if (!widget) {
        return;
    }

    const int currentIndex = m_tabBar->currentIndex();
    setUpdatesEnabled(false);
    m_stack->removeWidget(widget);
    m_stack->insertWidget(to, widget);
    if (currentIndex >= 0 && currentIndex < m_stack->count()) {
        m_stack->setCurrentIndex(currentIndex);
    }
    setUpdatesEnabled(true);

    if (m_previewTabIndex == from) {
        m_previewTabIndex = to;
    } else if (m_previewTabIndex > from && m_previewTabIndex <= to) {
        --m_previewTabIndex;
    } else if (m_previewTabIndex < from && m_previewTabIndex >= to) {
        ++m_previewTabIndex;
    }

    if (m_tabBar->currentIndex() == to || m_tabBar->currentIndex() == from) {
        updateSignalsForCurrentWidget();
    }
}

void TabWorkspace::onTabCloseRequested(int index) {
    closeTab(index);
}

void TabWorkspace::onNewTabClicked() {
    addTab("ixplorer://home");
}

void TabWorkspace::updateAdaptiveTabWidth() {
    const int count = m_tabBar->count();
    if (count <= 0) return;
    const int available = m_tabBar->width() - 40; // Leave room for add button
    const int dynamicMax = qBound(80, available / count, 240);
    m_tabBar->setStyleSheet(
        QStringLiteral("QTabBar::tab { max-width: %1px; }").arg(dynamicMax)
    );
}

} // namespace Ixplorer
