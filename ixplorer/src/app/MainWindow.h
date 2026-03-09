#pragma once

#include <QMainWindow>
#include <QSplitter>

namespace Ixplorer {

class ExplorerToolbar;
class AppSidebar;
class TabWorkspace;
class IxosRail;
class StatusStrip;

class MainWindow : public QMainWindow {
    Q_OBJECT
public:
    explicit MainWindow(QWidget *parent = nullptr);

    void navigateTo(const QString &path);

protected:
    void keyPressEvent(QKeyEvent *event) override;

private:
    void setupLayout();
    void setupConnections();
    void setupShortcuts();
    void onPathChanged(const QString &path);

    ExplorerToolbar *m_toolbar;
    AppSidebar *m_sidebar;
    TabWorkspace *m_workspace;
    IxosRail *m_rail;
    StatusStrip *m_statusStrip;
    QSplitter *m_splitter;
};

} // namespace Ixplorer
