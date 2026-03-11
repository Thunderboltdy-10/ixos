#pragma once

#include "data/SessionState.h"

#include <QColor>
#include <QFileInfo>
#include <QStackedWidget>
#include <QTabBar>
#include <QToolButton>
#include <QWidget>

namespace Ixplorer {

class DocumentPane;
class ExplorerPane;
class BreadcrumbBar;

class TabWorkspace : public QWidget {
    Q_OBJECT
public:
    explicit TabWorkspace(QWidget *parent = nullptr);

    ExplorerPane *currentPane() const;
    DocumentPane *currentDocument() const;
    ExplorerPane *paneAt(int index) const;
    int addTab(const QString &path);
    bool previewPath(const QString &path);
    void closeTab(int index);
    void navigateCurrentTab(const QString &path);
    void revealPathInCurrentTab(const QString &path);
    void revealPathInNewTab(const QString &path);
    int currentTabIndex() const;
    bool canGoBackCurrent() const;
    bool canGoForwardCurrent() const;
    bool canGoUpCurrent() const;
    void goBackCurrent();
    void goForwardCurrent();
    void goUpCurrent();
    void refreshCurrent();
    void setCurrentViewMode(int mode);
    int currentViewMode() const;
    bool currentSupportsViewMode() const;
    void setCurrentPath(const QString &path);
    int tabCount() const;
    QVector<TabState> captureTabState() const;
    void restoreTabState(const QVector<TabState> &tabs, int activeTabIndex);

signals:
    void currentTabChanged(int index);
    void pathChanged(const QString &path);
    void navigateRequested(const QString &path);
    void navigationStateChanged(bool canGoBack, bool canGoForward, bool canGoUp);
    void selectionChanged(const QFileInfo &info, int selectedCount, quint64 selectedBytes);
    void selectionCleared();
    void fileActivated(const QFileInfo &info);
    void openInNewTabRequested(const QString &path);
    void statusMessage(const QString &message);
    void surfaceToneChanged(const QColor &color);

protected:
    bool eventFilter(QObject *watched, QEvent *event) override;

private:
    int addExplorerTab(const QString &path);
    int addDocumentTab(const QString &path, bool preview);
    int findDocumentTab(const QString &path) const;
    void replaceWidgetAt(int index, QWidget *widget, const QString &path);
    void connectExplorerTab(ExplorerPane *pane);
    void connectDocumentTab(DocumentPane *pane);
    void updateSignalsForCurrentWidget();
    void updateTabMetadata(int index, const QString &path);
    void onTabChanged(int index);
    void onTabCloseRequested(int index);
    void onNewTabClicked();
    void showContextMenu(const QPoint &pos);

    QTabBar *m_tabBar;

    QToolButton *m_addTabButton;
    BreadcrumbBar *m_breadcrumb;
    QStackedWidget *m_stack;
    int m_previewTabIndex = -1;
};

} // namespace Ixplorer
