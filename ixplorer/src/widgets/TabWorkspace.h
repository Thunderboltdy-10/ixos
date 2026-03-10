#pragma once

#include <QFileInfo>
#include <QStackedWidget>
#include <QTabBar>
#include <QToolButton>
#include <QWidget>

namespace Ixplorer {

class DocumentPane;
class ExplorerPane;

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

signals:
    void currentTabChanged(int index);
    void pathChanged(const QString &path);
    void navigationStateChanged(bool canGoBack, bool canGoForward, bool canGoUp);
    void selectionChanged(const QFileInfo &info, int selectedCount, quint64 selectedBytes);
    void selectionCleared();
    void fileActivated(const QFileInfo &info);
    void openInNewTabRequested(const QString &path);
    void statusMessage(const QString &message);

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

    QTabBar *m_tabBar;
    QToolButton *m_addTabButton;
    QStackedWidget *m_stack;
    int m_previewTabIndex = -1;
};

} // namespace Ixplorer
