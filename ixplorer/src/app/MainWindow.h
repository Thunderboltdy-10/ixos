#pragma once

#include "data/SessionState.h"

#include <QColor>
#include <QCloseEvent>
#include <QMainWindow>
#include <QSplitter>
#include <QTimer>

namespace Ixplorer {

class ActivityTracker;
class AppSidebar;
class BundlePredictor;
class CommandPalette;
class ExplorerToolbar;
class InterruptionDetector;
class IxosRail;
class Orchestrator;
class PersonalRanker;
class ResumptionEngine;
class StatusStrip;
class TabWorkspace;
class WorkstreamManager;

class MainWindow : public QMainWindow {
    Q_OBJECT
public:
    explicit MainWindow(QWidget *parent = nullptr);

    void navigateTo(const QString &path);

protected:
    void closeEvent(QCloseEvent *event) override;
    void keyPressEvent(QKeyEvent *event) override;

private:
    void setupLayout();
    void setupConnections();
    void setupShortcuts();
    void initializeIntelligence();
    void openCommandPalette();
    void handlePaletteCommand(const QString &commandId);
    void onPathChanged(const QString &path);
    void applyShellTone(const QColor &color);
    void setRailVisible(bool visible);
    void toggleRailVisible();
    void markSessionDirty();
    void saveSession(bool cleanExit);
    void restoreSession();
    void refreshToday();
    void refreshWorkstreams();
    void refreshIntelligenceSurface();
    void switchWorkstream(const QString &id);
    void openPathsBundle(const QStringList &paths, const QString &workstreamId);
    QString activeSearchRoot() const;

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
    QString m_lastSearchQuery;
    int m_lastSearchMode = 1;
    bool m_sessionDirty = false;
    SessionStateStore m_sessionStore;
    SessionState *m_runtimeSession = nullptr;
    SessionStateSnapshot m_sessionSnapshot;
    QTimer *m_sessionAutosaveTimer = nullptr;
    QTimer *m_orchestratorTimer = nullptr;
    ActivityTracker *m_activityTracker = nullptr;
    PersonalRanker *m_personalRanker = nullptr;
    WorkstreamManager *m_workstreamManager = nullptr;
    ResumptionEngine *m_resumptionEngine = nullptr;
    InterruptionDetector *m_interruptionDetector = nullptr;
    BundlePredictor *m_bundlePredictor = nullptr;
    Orchestrator *m_orchestrator = nullptr;
};

} // namespace Ixplorer
