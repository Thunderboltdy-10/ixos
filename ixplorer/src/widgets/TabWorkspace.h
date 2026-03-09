#pragma once

#include <QWidget>
#include <QTabBar>
#include <QStackedWidget>
#include <QFileInfo>

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
    int currentTabIndex() const;

signals:
    void currentTabChanged(int index);
    void pathChanged(const QString &path);
    void fileSelected(const QFileInfo &info);
    void fileActivated(const QFileInfo &info);
    void openInNewTabRequested(const QString &path);

private:
    void onTabChanged(int index);
    void onTabCloseRequested(int index);
    void onNewTabClicked();

    QTabBar *m_tabBar;
    QStackedWidget *m_stack;
};

} // namespace Ixplorer
