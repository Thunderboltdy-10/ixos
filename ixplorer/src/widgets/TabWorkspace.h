#pragma once

#include <QFileInfo>
#include <QStackedWidget>
#include <QTabBar>
#include <QToolButton>
#include <QWidget>

namespace Ixplorer {

class ExplorerPane;

class TabWorkspace : public QWidget {
    Q_OBJECT
public:
    explicit TabWorkspace(QWidget *parent = nullptr);

    ExplorerPane *currentPane() const;
    ExplorerPane *paneAt(int index) const;
    int addTab(const QString &path);
    void closeTab(int index);
    void navigateCurrentTab(const QString &path);
    void revealPathInCurrentTab(const QString &path);
    void revealPathInNewTab(const QString &path);
    int currentTabIndex() const;

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
    void onTabChanged(int index);
    void onTabCloseRequested(int index);
    void onNewTabClicked();

    QTabBar *m_tabBar;
    QToolButton *m_addTabButton;
    QStackedWidget *m_stack;
};

} // namespace Ixplorer
