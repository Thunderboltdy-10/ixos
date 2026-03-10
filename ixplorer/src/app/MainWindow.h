#pragma once

#include <QColor>
#include <QMainWindow>
#include <QSplitter>

namespace Ixplorer {

class AppSidebar;
class CommandPalette;
class ExplorerToolbar;
class IxosRail;
class StatusStrip;
class TabWorkspace;

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
    void openCommandPalette();
    void handlePaletteCommand(const QString &commandId);
    void onPathChanged(const QString &path);
    void applyShellTone(const QColor &color);
    void setRailVisible(bool visible);
    void toggleRailVisible();

    ExplorerToolbar *m_toolbar;
    AppSidebar *m_sidebar;
    TabWorkspace *m_workspace;
    IxosRail *m_rail;
    StatusStrip *m_statusStrip;
    CommandPalette *m_palette;
    QSplitter *m_splitter;
    QWidget *m_shellRoot = nullptr;
    QColor m_shellTone;
    int m_lastRailWidth = 360;
    bool m_railVisible = false;
};

} // namespace Ixplorer
