#include "widgets/TabWorkspace.h"

#include "utils/FileOperations.h"
#include "utils/FileOpenPolicy.h"
#include "widgets/DocumentPane.h"
#include "widgets/ExplorerPane.h"

#include <QDesktopServices>
#include <QDir>
#include <QFileInfo>
#include <QHBoxLayout>
#include <QUrl>
#include <QVBoxLayout>

namespace Ixplorer {

namespace {

QString tabLabelForPath(const QString &path) {
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

} // namespace

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

DocumentPane *TabWorkspace::currentDocument() const {
    return qobject_cast<DocumentPane *>(m_stack->currentWidget());
}

ExplorerPane *TabWorkspace::paneAt(int index) const {
    return qobject_cast<ExplorerPane *>(m_stack->widget(index));
}

int TabWorkspace::addTab(const QString &path) {
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
        if (!pane->isHosted()) {
            pane->deleteLater();
            return false;
        }
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

int TabWorkspace::addExplorerTab(const QString &path) {
    auto *pane = new ExplorerPane(path, this);
    connectExplorerTab(pane);

    const int insertIndex = m_tabBar->count();
    m_stack->addWidget(pane);
    m_tabBar->addTab(tabLabelForPath(path));
    updateTabMetadata(insertIndex, path);
    m_tabBar->setCurrentIndex(insertIndex);
    return insertIndex;
}

int TabWorkspace::addDocumentTab(const QString &path, bool preview) {
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

    auto *pane = new DocumentPane(path, preview, this);
    if (!pane->isHosted()) {
        pane->deleteLater();
        openExternally(path);
        emit statusMessage(QStringLiteral("Opened %1 externally because its app window could not be embedded.")
                               .arg(QFileInfo(path).fileName()));
        return -1;
    }

    connectDocumentTab(pane);

    const int index = m_tabBar->count();
    m_stack->addWidget(pane);
    m_tabBar->addTab(tabLabelForPath(path));
    updateTabMetadata(index, path);
    m_tabBar->setCurrentIndex(index);
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
    connect(pane, &DocumentPane::openExternallyRequested, this, [this](const QString &path) {
        openExternally(path);
        emit statusMessage(QStringLiteral("Opened %1 externally.")
                               .arg(QFileInfo(path).fileName()));
    });
}

void TabWorkspace::updateSignalsForCurrentWidget() {
    if (auto *pane = currentPane()) {
        emit pathChanged(pane->currentPath());
        emit navigationStateChanged(pane->canGoBack(), pane->canGoForward(), pane->canGoUp());
        return;
    }

    if (auto *document = currentDocument()) {
        const QFileInfo info(document->filePath());
        emit pathChanged(document->displayPath());
        emit navigationStateChanged(false, false, document->canGoUp());
        emit selectionChanged(info, 1, static_cast<quint64>(info.size()));
        return;
    }

    emit selectionCleared();
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
        updateSignalsForCurrentWidget();

        if (auto *document = currentDocument()) {
            document->focusPrimaryControl();
        }
    }
}

void TabWorkspace::onTabCloseRequested(int index) {
    closeTab(index);
}

void TabWorkspace::onNewTabClicked() {
    addExplorerTab(QDir::homePath());
}

} // namespace Ixplorer
