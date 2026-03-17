#include "app/MainWindow.h"

#include "data/ActivityTracker.h"
#include "data/BundlePredictor.h"
#include "data/CommandTelemetry.h"
#include "data/InterruptionDetector.h"
#include "data/Orchestrator.h"
#include "data/PersonalRanker.h"
#include "data/RelationshipView.h"
#include "data/ResumptionEngine.h"
#include "data/WorkstreamManager.h"
#include "utils/FileOperations.h"
#include "widgets/AppSidebar.h"
#include "widgets/BreadcrumbBar.h"
#include "widgets/CommandPalette.h"
#include "widgets/DocumentPane.h"
#include "widgets/ExplorerPane.h"
#include "widgets/ExplorerToolbar.h"
#include "widgets/IxosRail.h"
#include "widgets/StatusStrip.h"
#include "widgets/TabWorkspace.h"
#include "widgets/ToastNotification.h"

#include <QDir>
#include <QDialog>
#include <QClipboard>
#include <QElapsedTimer>
#include <QFileInfo>
#include <QGuiApplication>
#include <QKeyEvent>
#include <QShortcut>
#include <QTimer>
#include <QVBoxLayout>
#include <QVariantAnimation>
#include <QEasingCurve>

namespace Ixplorer {

namespace {

QColor blendToward(const QColor &from, const QColor &to, qreal amount) {
    const qreal mix = qBound(0.0, amount, 1.0);
    return QColor::fromRgbF(from.redF() + ((to.redF() - from.redF()) * mix),
                            from.greenF() + ((to.greenF() - from.greenF()) * mix),
                            from.blueF() + ((to.blueF() - from.blueF()) * mix),
                            1.0);
}

int colorDistance(const QColor &left, const QColor &right) {
    return qAbs(left.red() - right.red()) +
           qAbs(left.green() - right.green()) +
           qAbs(left.blue() - right.blue());
}

} // namespace

MainWindow::MainWindow(QWidget *parent)
    : QMainWindow(parent)
    , m_toolbar(new ExplorerToolbar(this))
    , m_sidebar(new AppSidebar(this))
    , m_workspace(new TabWorkspace(this))
    , m_rail(new IxosRail(this))
    , m_statusStrip(new StatusStrip(this))
    , m_palette(new CommandPalette(this))
    , m_commandTelemetry(new CommandTelemetry(this))
    , m_splitter(new QSplitter(Qt::Horizontal, this))
    , m_runtimeSession(new SessionState(this))
    , m_sessionAutosaveTimer(new QTimer(this))
    , m_orchestratorTimer(new QTimer(this))
    , m_activityTracker(new ActivityTracker(this))
    , m_personalRanker(new PersonalRanker())
    , m_workstreamManager(new WorkstreamManager(this))
    , m_resumptionEngine(new ResumptionEngine(this))
    , m_interruptionDetector(new InterruptionDetector())
    , m_bundlePredictor(new BundlePredictor(this))
    , m_orchestrator(new Orchestrator(this)) {
    setWindowTitle("Ixplorer");
    resize(1440, 860);
    setMinimumSize(1100, 700);

    setupLayout();
    setupConnections();
    setupShortcuts();
    initializeIntelligence();
    restoreSession();
}

void MainWindow::navigateTo(const QString &path) {
    m_workspace->navigateCurrentTab(path);
}

void MainWindow::closeEvent(QCloseEvent *event) {
    if (m_activityTracker != nullptr && m_workstreamManager != nullptr) {
        m_activityTracker->logEvent(ActivityAction::SessionEnd, QString(), {}, {}, m_workstreamManager->currentWorkstreamId());
    }
    saveSession(true);
    QMainWindow::closeEvent(event);
}

void MainWindow::keyPressEvent(QKeyEvent *event) {
    QMainWindow::keyPressEvent(event);
}

void MainWindow::setupLayout() {
    m_shellRoot = new QWidget(this);
    m_shellRoot->setObjectName("ShellRoot");
    auto *vbox = new QVBoxLayout(m_shellRoot);
    vbox->setContentsMargins(0, 0, 0, 0);
    vbox->setSpacing(0);

    // Top container: Tabs + Toolbar
    m_topContainer = new QWidget(m_shellRoot);
    m_topContainer->setObjectName("TopContainer");
    auto *topLayout = new QVBoxLayout(m_topContainer);
    topLayout->setContentsMargins(0, 0, 0, 0);
    topLayout->setSpacing(0);

    // Tab row
    m_tabRowWidget = new QWidget(m_topContainer);
    m_tabRowWidget->setObjectName("TabBarRow");
    m_tabRowWidget->setStyleSheet("#TabBarRow { border-bottom: 1px solid rgba(255,255,255,0.08); }");
    auto *tabRow = new QHBoxLayout(m_tabRowWidget);
    tabRow->setContentsMargins(8, 4, 8, 0);
    tabRow->setSpacing(4);
    
    m_workspace->tabBar()->setParent(m_tabRowWidget);
    m_workspace->addTabButton()->setParent(m_tabRowWidget);
    
    tabRow->addWidget(m_workspace->tabBar());
    tabRow->addWidget(m_workspace->addTabButton());
    tabRow->addStretch(1);
    
    topLayout->addWidget(m_tabRowWidget);
    topLayout->addWidget(m_toolbar);
    
    vbox->addWidget(m_topContainer);

    m_splitter->setHandleWidth(1); 
    m_splitter->addWidget(m_sidebar);
    m_splitter->addWidget(m_workspace);
    m_splitter->addWidget(m_rail);
    m_splitter->setStretchFactor(0, 0);
    m_splitter->setStretchFactor(1, 1);
    m_splitter->setStretchFactor(2, 0);
    m_splitter->setCollapsible(0, false);
    m_splitter->setCollapsible(1, false);
    m_splitter->setCollapsible(2, true);
    m_splitter->setSizes({240, 840, 0}); 

    vbox->addWidget(m_splitter, 1);
    vbox->addWidget(m_statusStrip);

    setCentralWidget(m_shellRoot);
    applyShellTone(QColor(32, 32, 32));
}

void MainWindow::setupConnections() {
    connect(m_sidebar, &AppSidebar::locationSelected, this, &MainWindow::navigateTo);
    connect(m_sidebar, &AppSidebar::resumePathSelected, this, [this](const QString &path) {
        if (path.isEmpty()) {
            return;
        }
        m_workspace->addTab(path);
    });
    connect(m_sidebar, &AppSidebar::workstreamSelected, this, &MainWindow::switchWorkstream);

    connect(m_toolbar, &ExplorerToolbar::searchRequested, this, [this](const QString &query, int mode) {
        setRailVisible(true);
        m_lastSearchQuery = query;
        m_lastSearchMode = mode;
        markSessionDirty();
        m_rail->submitToolbarSearch(query, mode);
    });
    connect(m_toolbar, &ExplorerToolbar::searchDraftChanged, this, [this](const QString &query, int mode) {
        if (!query.isEmpty()) {
            setRailVisible(true);
        }
        m_lastSearchQuery = query;
        m_lastSearchMode = mode;
        markSessionDirty();
        m_rail->submitToolbarDraft(query, mode);
    });
    
    connect(m_statusStrip, &StatusStrip::toggleRailRequested, this, &MainWindow::toggleRailVisible);
    connect(m_toolbar, &ExplorerToolbar::toggleRailRequested, this, &MainWindow::toggleRailVisible);

    connect(m_toolbar, &ExplorerToolbar::navigateRequested, this, &MainWindow::navigateTo);
    connect(m_toolbar, &ExplorerToolbar::backRequested, this, [this]() {
        m_workspace->goBackCurrent();
    });
    connect(m_toolbar, &ExplorerToolbar::forwardRequested, this, [this]() {
        m_workspace->goForwardCurrent();
    });
    connect(m_toolbar, &ExplorerToolbar::upRequested, this, [this]() {
        m_workspace->goUpCurrent();
    });
    connect(m_toolbar, &ExplorerToolbar::refreshRequested, this, [this]() {
        m_workspace->refreshCurrent();
    });

    connect(m_workspace, &TabWorkspace::pathChanged, this, &MainWindow::onPathChanged);
    connect(m_workspace, &TabWorkspace::pathChanged, this, [this](const QString &path) {
        if (m_activityTracker != nullptr) {
            m_activityTracker->logDirectoryChange(path, m_workstreamManager->currentWorkstreamId());
        }
        markSessionDirty();
    });
    connect(m_workspace, &TabWorkspace::navigationStateChanged,
            m_toolbar, &ExplorerToolbar::setNavigationState);
    connect(m_workspace, &TabWorkspace::statusMessage, this, [this](const QString &message) {
        m_statusStrip->setStatusMessage(message);
        if (m_rail->hasActiveQuery()) {
            m_rail->setStatusMessage(message);
        }
        ToastNotification::showToast(this, message);
    });

    connect(m_workspace, &TabWorkspace::selectionChanged, this, [this](const QFileInfo &info, int selectedCount, quint64 selectedBytes) {
        m_rail->showFileDetails(info, selectedCount, selectedBytes);
        m_statusStrip->setSelectionInfo(info, selectedCount, selectedBytes);
    });
    connect(m_workspace, &TabWorkspace::selectionCleared, this, [this]() {
        m_rail->clearDetails();
        m_statusStrip->clearSelectionInfo();
    });
    connect(m_workspace, &TabWorkspace::currentTabChanged, this, [this](int) {
        const QString path = m_workspace->currentDocument() ? m_workspace->currentDocument()->displayPath()
                                                            : (m_workspace->currentPane() ? m_workspace->currentPane()->currentPath()
                                                                                          : QString());
        if (m_activityTracker != nullptr && !path.isEmpty()) {
            m_activityTracker->logTabSwitch(path, m_workstreamManager->currentWorkstreamId());
        }
        onPathChanged(path);
        markSessionDirty();
    });
    connect(m_workspace, &TabWorkspace::surfaceToneChanged, this, [this](const QColor &color) {
        applyShellTone(color);
    });
    connect(m_workspace, &TabWorkspace::workstreamActivated, this, [this](const QString &id) {
        switchWorkstream(id);
    });
    connect(m_workspace, &TabWorkspace::searchRequested, this, [this](const QString &query) {
        setRailVisible(true);
        m_toolbar->setSearchText(query);
        m_rail->submitToolbarSearch(query, 1);
    });
    connect(m_workspace, &TabWorkspace::fileActivated, this, [this](const QFileInfo &info) {
        if (m_activityTracker != nullptr) {
            m_activityTracker->logFileOpen(info.absoluteFilePath(), m_lastSearchQuery, m_workstreamManager->currentWorkstreamId());
        }
        if (m_personalRanker != nullptr) {
            m_personalRanker->markOpened(info.absoluteFilePath());
        }
        refreshToday();
        markSessionDirty();
    });

    connect(m_rail, &IxosRail::revealPathInWorkspaceRequested, this, [this](const QString &path) {
        m_workspace->revealPathInCurrentTab(path);
    });
    connect(m_rail, &IxosRail::openPathInNewTabRequested, this, [this](const QString &path) {
        if (m_activityTracker != nullptr) {
            m_activityTracker->logResultClick(path, m_lastSearchQuery, m_workstreamManager->currentWorkstreamId());
        }
        if (m_personalRanker != nullptr) {
            m_personalRanker->markOpened(path);
        }
        m_workspace->addTab(path);
        markSessionDirty();
    });
    connect(m_rail, &IxosRail::openFileRequested, this, [this](const QString &path) {
        if (m_activityTracker != nullptr) {
            m_activityTracker->logResultClick(path, m_lastSearchQuery, m_workstreamManager->currentWorkstreamId());
        }
        if (m_personalRanker != nullptr) {
            m_personalRanker->markOpened(path);
        }
        m_workspace->addTab(path);
        refreshToday();
        markSessionDirty();
    });
    connect(m_rail, &IxosRail::openBundleRequested, this, &MainWindow::openPathsBundle);
    connect(m_rail, &IxosRail::viewWorkstreamsRequested, this, [this]() {
        setRailVisible(false);
        m_workspace->showHomeDashboard();
        refreshWorkstreams();
        markSessionDirty();
    });
    connect(m_rail, &IxosRail::addPathToWorkstreamRequested, this, [this](const QString &path) {
        const QString currentWorkstreamId = m_workstreamManager->currentWorkstreamId();
        if (path.isEmpty() || currentWorkstreamId.isEmpty()) {
            return;
        }

        Workstream workstream = m_workstreamManager->workstreamForId(currentWorkstreamId);
        const QString folderPath = QFileInfo(path).absolutePath();
        auto bumpPair = [](QVector<QPair<QString, int>> &pairs, const QString &value) {
            for (auto &pair : pairs) {
                if (pair.first == value) {
                    pair.second += 1;
                    return;
                }
            }
            pairs.prepend(qMakePair(value, 1));
        };
        bumpPair(workstream.topFiles, path);
        if (!folderPath.isEmpty()) {
            bumpPair(workstream.topFolders, folderPath);
        }
        workstream.isAuto = false;
        if (workstream.description.isEmpty()) {
            workstream.description = QStringLiteral("Curated from Ixplorer actions");
        }
        m_workstreamManager->upsertWorkstream(workstream);
        m_workstreamManager->save();
        ToastNotification::showToast(this, QStringLiteral("Added to current workstream."));
    });
    connect(m_rail, &IxosRail::compareWithCurrentRequested, this, [this](const QString &path) {
        if (path.isEmpty()) {
            return;
        }
        const QString activePath = m_workspace->currentDocument() != nullptr
            ? m_workspace->currentDocument()->filePath()
            : QString();
        if (activePath.isEmpty() || activePath == path) {
            m_workspace->addTab(path);
            return;
        }
        m_workspace->addTab(path);
        ToastNotification::showToast(this, QStringLiteral("Opened candidate beside current file for comparison."));
    });
    connect(m_rail, &IxosRail::revealRelationshipRequested, this, [this](const QString &path) {
        revealRelationshipNeighborhood(path, false);
    });
    connect(m_rail, &IxosRail::pinForTodayRequested, this, [this](const QString &path) {
        if (path.isEmpty()) {
            return;
        }
        m_personalRanker->pin(path, true);
        m_sidebar->pinFavorite(path);
        if (m_activityTracker != nullptr) {
            m_activityTracker->logEvent(ActivityAction::FilePinned, path, {}, {}, m_workstreamManager->currentWorkstreamId());
        }
        refreshToday();
        ToastNotification::showToast(this, QStringLiteral("Pinned for Today and Favorites."));
    });
    connect(m_rail, &IxosRail::copyPathRequested, this, [](const QString &path) {
        if (path.isEmpty()) {
            return;
        }
        if (auto *clipboard = QGuiApplication::clipboard(); clipboard != nullptr) {
            clipboard->setText(QDir::toNativeSeparators(path));
        }
    });
    connect(m_rail, &IxosRail::autoOpenPathRequested, this, [this](const QString &path) {
        if (m_activityTracker != nullptr) {
            m_activityTracker->logResultClick(path, m_lastSearchQuery, m_workstreamManager->currentWorkstreamId());
        }
        m_workspace->previewPath(path);
        markSessionDirty();
    });
    connect(m_rail, &IxosRail::revealPathRequested, this, [](const QString &path) {
        FileOperations::revealInSystemExplorer(path);
    });
    connect(m_rail, &IxosRail::requestClose, this, [this]() {
        setRailVisible(false);
    });
    connect(m_rail, &IxosRail::searchTelemetryChanged, this, [this](bool hasResults,
                                                                     float topScore,
                                                                     float scoreGap,
                                                                     float lexicalConfidence,
                                                                     float witnessStrength,
                                                                     float stabilityPenalty,
                                                                     qint64 elapsedMs,
                                                                     qint64 maxLatencyMs,
                                                                     bool queryActive) {
        m_orchestrator->setSearchContext(hasResults,
                                         topScore,
                                         scoreGap,
                                         lexicalConfidence,
                                         witnessStrength,
                                         stabilityPenalty,
                                         elapsedMs,
                                         maxLatencyMs);
        m_orchestrator->setState(queryActive ? OrchestratorState::Searching : OrchestratorState::Idle);
        if (!queryActive) {
            refreshIntelligenceSurface();
        }
    });
    connect(m_rail, &IxosRail::searchSubmitted, this, [this](const QString &query, int mode) {
        m_toolbar->setSearchText(query);
        setRailVisible(true);
        m_lastSearchQuery = query;
        m_lastSearchMode = mode;
        if (m_activityTracker != nullptr) {
            m_activityTracker->logSearch(query, activeSearchRoot(), m_workstreamManager->currentWorkstreamId());
        }
        markSessionDirty();
    });

    connect(m_palette, &CommandPalette::searchRequested, this, [this](const QString &query) {
        setRailVisible(true);
        m_toolbar->setSearchText(query);
        m_toolbar->focusSearch();
        m_rail->submitToolbarSearch(query, 1);
        if (m_commandTelemetry != nullptr) {
            m_commandTelemetry->recordInvocation(
                QStringLiteral("search_query"),
                query,
                !query.trimmed().isEmpty(),
                0,
                activeSearchRoot(),
                m_workstreamManager->currentWorkstreamId());
        }
    });
    connect(m_palette, &CommandPalette::commandTriggered, this, &MainWindow::handlePaletteCommand);
    connect(m_palette, &CommandPalette::commandTriggeredWithArgs, this, &MainWindow::handlePaletteCommandWithArgs);
    connect(m_activityTracker, &ActivityTracker::activityLogged, this, [this](const ActivityEvent &) {
        if (m_workstreamManager != nullptr) {
            m_workstreamManager->rebuild();
            m_workstreamManager->save();
        }
        refreshToday();
    });
    connect(m_workstreamManager, &WorkstreamManager::workstreamsChanged, this, [this]() {
        refreshWorkstreams();
        markSessionDirty();
    });
    connect(m_workstreamManager, &WorkstreamManager::currentWorkstreamChanged, this, [this](const QString &) {
        refreshToday();
        refreshWorkstreams();
        markSessionDirty();
    });
}

void MainWindow::setupShortcuts() {
    auto *newTab = new QShortcut(QKeySequence("Ctrl+T"), this);
    connect(newTab, &QShortcut::activated, this, [this]() {
        m_workspace->addTab("ixplorer://home");
    });

    auto *closeTab = new QShortcut(QKeySequence("Ctrl+W"), this);
    connect(closeTab, &QShortcut::activated, this, [this]() {
        m_workspace->closeTab(m_workspace->currentTabIndex());
    });

    auto *refresh = new QShortcut(QKeySequence("F5"), this);
    connect(refresh, &QShortcut::activated, this, [this]() {
        m_workspace->refreshCurrent();
    });

    auto *back = new QShortcut(QKeySequence("Alt+Left"), this);
    connect(back, &QShortcut::activated, this, [this]() {
        m_workspace->goBackCurrent();
    });

    auto *forward = new QShortcut(QKeySequence("Alt+Right"), this);
    connect(forward, &QShortcut::activated, this, [this]() {
        m_workspace->goForwardCurrent();
    });

    auto *up = new QShortcut(QKeySequence("Alt+Up"), this);
    connect(up, &QShortcut::activated, this, [this]() {
        m_workspace->goUpCurrent();
    });

    auto *focusSearch = new QShortcut(QKeySequence::Find, this);
    connect(focusSearch, &QShortcut::activated, this, [this]() {
        setRailVisible(true);
        m_toolbar->focusSearch();
    });

    auto *openPalette = new QShortcut(QKeySequence("Ctrl+K"), this);
    connect(openPalette, &QShortcut::activated, this, &MainWindow::openCommandPalette);
}

void MainWindow::initializeIntelligence() {
    m_sessionAutosaveTimer->setInterval(60000);
    connect(m_sessionAutosaveTimer, &QTimer::timeout, this, [this]() {
        if (m_sessionDirty) {
            saveSession(false);
        }
    });
    m_sessionAutosaveTimer->start();

    m_workstreamManager->setActivityTracker(m_activityTracker);
    m_workstreamManager->rebuild();

    m_runtimeSession->setStoragePath(m_sessionStore.path());
    m_runtimeSession->load();

    m_resumptionEngine->setActivityTracker(m_activityTracker);
    m_resumptionEngine->setSessionStateStore(&m_sessionStore);
    m_resumptionEngine->setPersonalRanker(m_personalRanker);
    m_resumptionEngine->setWorkstreamManager(m_workstreamManager);

    m_bundlePredictor->setActivityTracker(m_activityTracker);
    m_bundlePredictor->setPersonalRanker(m_personalRanker);
    m_bundlePredictor->setWorkstreamManager(m_workstreamManager);

    m_orchestrator->setResumptionEngine(m_resumptionEngine);
    m_orchestrator->setBundlePredictor(m_bundlePredictor);
    m_orchestrator->setInterruptionDetector(m_interruptionDetector);
    m_interruptionDetector->setSessionState(m_runtimeSession);
    m_interruptionDetector->setResumptionEngine(m_resumptionEngine);

    m_workspace->setIntelligence(m_workstreamManager, m_resumptionEngine, m_activityTracker);

    m_orchestratorTimer->setInterval(200);
    connect(m_orchestratorTimer, &QTimer::timeout, this, [this]() {
        refreshIntelligenceSurface();
    });
    m_orchestratorTimer->start();

    if (m_activityTracker != nullptr) {
        m_activityTracker->logEvent(ActivityAction::SessionStart, QString(), {}, {}, m_workstreamManager->currentWorkstreamId());
    }
}

void MainWindow::openCommandPalette() {
    const QVector<Workstream> workstreams = m_workstreamManager->workstreams();
    const bool hasWorkstreams = !workstreams.isEmpty();
    const bool hasActiveWorkstream = !m_workstreamManager->currentWorkstreamId().isEmpty();
    const ResumptionPacket packet = m_resumptionEngine->buildPacket(m_workstreamManager->currentWorkstreamId());
    const bool hasResumePacket = !packet.primaryPath.isEmpty();
    const QString activePath = m_workspace->currentDocument() != nullptr
        ? m_workspace->currentDocument()->filePath()
        : QString();
    const bool hasActiveDocument = !activePath.isEmpty();

    QVector<CommandPaletteItem> commands = {
        {QStringLiteral("focus_search"), QStringLiteral("Focus Ixos Search"), QStringLiteral("Jump to the top search bar"), QStringLiteral("search find ixos top bar"), 0.92f, true},
        {QStringLiteral("search_current_folder"), QStringLiteral("Search Current Folder"), QStringLiteral("Run search scoped to the active folder"), QStringLiteral("search current folder local scope"), 0.90f, true},
        {QStringLiteral("toggle_rail"), QStringLiteral("Toggle Ixos Panel"), QStringLiteral("Show or hide the right intelligence rail"), QStringLiteral("rail panel sidebar"), 0.78f, true},
        {QStringLiteral("switch_workstream"), QStringLiteral("Switch Workstream"), QStringLiteral("Cycle to the next active workstream"), QStringLiteral("workstream context session"), hasWorkstreams ? 0.88f : 0.0f, hasWorkstreams},
        {QStringLiteral("open_bundle"), QStringLiteral("Open Today Bundle"), QStringLiteral("Open the current resume packet and supporting files"), QStringLiteral("today resume bundle continue"), hasResumePacket ? 0.9f : 0.0f, hasResumePacket},
        {QStringLiteral("reopen_last_packet"), QStringLiteral("Reopen Last Session"), QStringLiteral("Resume the highest-confidence recent context"), QStringLiteral("resume session packet"), hasResumePacket ? 0.86f : 0.0f, hasResumePacket},
        {QStringLiteral("add_to_workstream"), QStringLiteral("Add To Workstream"), QStringLiteral("Attach the active file to the current workstream"), QStringLiteral("workstream pin current file context"), (hasActiveWorkstream && hasActiveDocument) ? 0.82f : 0.0f, hasActiveWorkstream && hasActiveDocument},
        {QStringLiteral("pin_file"), QStringLiteral("Pin File"), QStringLiteral("Keep the active file in Favorites and personal signals"), QStringLiteral("favorite pin file"), hasActiveDocument ? 0.8f : 0.0f, hasActiveDocument},
        {QStringLiteral("new_tab"), QStringLiteral("New Explorer Tab"), QStringLiteral("Open a fresh workspace tab"), QStringLiteral("tab open workspace"), 0.58f, true},
        {QStringLiteral("close_tab"), QStringLiteral("Close Current Tab"), QStringLiteral("Close the active workspace tab"), QStringLiteral("close tab"), m_workspace->tabCount() > 1 ? 0.62f : 0.0f, m_workspace->tabCount() > 1},
        {QStringLiteral("refresh"), QStringLiteral("Refresh Current View"), QStringLiteral("Reload the current explorer or document"), QStringLiteral("refresh reload"), 0.55f, true},
        {QStringLiteral("go_up"), QStringLiteral("Open Parent Folder"), QStringLiteral("Go to the current tab's parent path"), QStringLiteral("parent up folder"), 0.48f, m_workspace->canGoUpCurrent()},
        {QStringLiteral("toggle_today"), QStringLiteral("Refresh Today"), QStringLiteral("Recompute resume suggestions for the current workstream"), QStringLiteral("today resume refresh"), hasActiveWorkstream || hasResumePacket ? 0.66f : 0.25f, true},
        {QStringLiteral("compare_related"), QStringLiteral("Compare With Related"), QStringLiteral("Open best related file for side-by-side comparison"), QStringLiteral("compare related graph bundle"), activePath.isEmpty() ? 0.0f : 0.74f, !activePath.isEmpty()},
        {QStringLiteral("show_relationships"), QStringLiteral("Show Relationships"), QStringLiteral("Visualize files commonly used with the current document"), QStringLiteral("graph relationship co occurrence related"), activePath.isEmpty() ? 0.0f : 0.72f, !activePath.isEmpty()},
        {QStringLiteral("reveal_neighborhood"), QStringLiteral("Reveal Neighborhood"), QStringLiteral("Open relationship context in the right rail"), QStringLiteral("neighborhood relation explain why"), activePath.isEmpty() ? 0.0f : 0.77f, !activePath.isEmpty()},
    };

    m_palette->setCommands(commands);
    m_palette->move(frameGeometry().center() - m_palette->rect().center());
    m_palette->show();
    m_palette->raise();
    m_palette->activateWindow();
}

void MainWindow::handlePaletteCommand(const QString &commandId) {
    QElapsedTimer timer;
    timer.start();

    bool success = false;
    QString telemetryArguments;
    const QString activePath = m_workspace->currentDocument() != nullptr
        ? m_workspace->currentDocument()->filePath()
        : QString();
    QString telemetryContextPath = activePath;
    if (telemetryContextPath.isEmpty()) {
        telemetryContextPath = activeSearchRoot();
    }

    if (commandId == QStringLiteral("focus_search")) {
        setRailVisible(true);
        m_toolbar->focusSearch();
        success = true;
    } else if (commandId == QStringLiteral("search_current_folder")) {
        setRailVisible(true);
        m_toolbar->focusSearch();
        m_rail->setSearchRoot(activeSearchRoot());
        success = true;
    } else if (commandId == QStringLiteral("toggle_rail")) {
        toggleRailVisible();
        success = true;
    } else if (commandId == QStringLiteral("new_tab")) {
        m_workspace->addTab(QDir::homePath());
        success = true;
    } else if (commandId == QStringLiteral("close_tab")) {
        if (m_workspace->tabCount() > 1) {
            m_workspace->closeTab(m_workspace->currentTabIndex());
            success = true;
        }
    } else if (commandId == QStringLiteral("refresh")) {
        m_workspace->refreshCurrent();
        success = true;
    } else if (commandId == QStringLiteral("go_up")) {
        if (m_workspace->canGoUpCurrent()) {
            m_workspace->goUpCurrent();
            success = true;
        }
    } else if (commandId == QStringLiteral("switch_workstream")) {
        const QVector<Workstream> workstreams = m_workstreamManager->workstreams();
        if (!workstreams.isEmpty()) {
            int currentIndex = -1;
            for (int index = 0; index < workstreams.size(); ++index) {
                if (workstreams.at(index).id == m_workstreamManager->currentWorkstreamId()) {
                    currentIndex = index;
                    break;
                }
            }
            const int nextIndex = workstreams.size() == 1 ? 0 : (currentIndex + 1) % workstreams.size();
            switchWorkstream(workstreams.at(nextIndex).id);
            success = true;
        }
    } else if (commandId == QStringLiteral("open_bundle") || commandId == QStringLiteral("reopen_last_packet")) {
        const ResumptionPacket packet = m_resumptionEngine->buildPacket(m_workstreamManager->currentWorkstreamId());
        if (!packet.primaryPath.isEmpty()) {
            m_workspace->addTab(packet.primaryPath);
            for (const QString &path : packet.supportingPaths) {
                m_workspace->addTab(path);
            }
            telemetryArguments = packet.primaryPath;
            success = true;
        }
    } else if (commandId == QStringLiteral("add_to_workstream")) {
        const QString currentWorkstreamId = m_workstreamManager->currentWorkstreamId();
        if (!activePath.isEmpty() && !currentWorkstreamId.isEmpty()) {
            Workstream workstream = m_workstreamManager->workstreamForId(currentWorkstreamId);
            const QString folderPath = QFileInfo(activePath).absolutePath();
            auto bumpPair = [](QVector<QPair<QString, int>> &pairs, const QString &value) {
                for (auto &pair : pairs) {
                    if (pair.first == value) {
                        pair.second += 1;
                        return;
                    }
                }
                pairs.prepend(qMakePair(value, 1));
            };
            bumpPair(workstream.topFiles, activePath);
            if (!folderPath.isEmpty()) {
                bumpPair(workstream.topFolders, folderPath);
            }
            workstream.isAuto = false;
            if (workstream.description.isEmpty()) {
                workstream.description = QStringLiteral("Curated from Ixplorer");
            }
            m_workstreamManager->upsertWorkstream(workstream);
            m_workstreamManager->save();
            ToastNotification::showToast(this, QStringLiteral("Added file to the current workstream."));
            telemetryArguments = activePath;
            success = true;
        }
    } else if (commandId == QStringLiteral("pin_file")) {
        if (!activePath.isEmpty()) {
            m_sidebar->pinFavorite(activePath);
            if (m_activityTracker != nullptr) {
                m_activityTracker->logEvent(ActivityAction::FilePinned, activePath, {}, {}, m_workstreamManager->currentWorkstreamId());
            }
            ToastNotification::showToast(this, QStringLiteral("Pinned file to Favorites."));
            telemetryArguments = activePath;
            success = true;
        }
    } else if (commandId == QStringLiteral("toggle_today")) {
        refreshToday();
        success = true;
    } else if (commandId == QStringLiteral("compare_related")) {
        if (!activePath.isEmpty()) {
            const QVector<RelationshipSignal> related = m_workstreamManager->relatedForPath(activePath, 1, m_workstreamManager->currentWorkstreamId());
            if (!related.isEmpty() && !related.first().path.isEmpty()) {
                m_workspace->addTab(related.first().path);
                ToastNotification::showToast(this, QStringLiteral("Opened related file for comparison."));
                telemetryArguments = related.first().path;
                success = true;
            } else {
                ToastNotification::showToast(this, QStringLiteral("No high-confidence related file available."));
            }
        }
    } else if (commandId == QStringLiteral("show_relationships")) {
        success = revealRelationshipNeighborhood(activePath, true);
    } else if (commandId == QStringLiteral("reveal_neighborhood")) {
        success = revealRelationshipNeighborhood(activePath, false);
    }

    if (m_commandTelemetry != nullptr) {
        m_commandTelemetry->recordInvocation(
            commandId,
            telemetryArguments,
            success,
            static_cast<int>(timer.elapsed()),
            telemetryContextPath,
            m_workstreamManager->currentWorkstreamId());
    }
}

void MainWindow::handlePaletteCommandWithArgs(const QString &commandId, const QString &arguments) {
    const QString args = arguments.trimmed();
    if (args.isEmpty()) {
        handlePaletteCommand(commandId);
        return;
    }

    QElapsedTimer timer;
    timer.start();
    bool success = false;

    if (commandId == QStringLiteral("focus_search") || commandId == QStringLiteral("search_current_folder")) {
        setRailVisible(true);
        m_toolbar->setSearchText(args);
        m_toolbar->focusSearch();
        m_rail->setSearchRoot(activeSearchRoot());
        m_rail->submitToolbarSearch(args, m_lastSearchMode);
        success = true;
    } else if (commandId == QStringLiteral("switch_workstream")) {
        const QVector<Workstream> workstreams = m_workstreamManager->workstreams();
        for (const Workstream &workstream : workstreams) {
            if (workstream.name.contains(args, Qt::CaseInsensitive) ||
                workstream.id.contains(args, Qt::CaseInsensitive)) {
                switchWorkstream(workstream.id);
                success = true;
                break;
            }
        }
    } else {
        handlePaletteCommand(commandId);
        return;
    }

    if (m_commandTelemetry != nullptr) {
        m_commandTelemetry->recordInvocation(
            commandId,
            args,
            success,
            static_cast<int>(timer.elapsed()),
            activeSearchRoot(),
            m_workstreamManager->currentWorkstreamId());
    }
}

bool MainWindow::revealRelationshipNeighborhood(const QString &path, bool openDialog) {
    if (path.isEmpty()) {
        return false;
    }

    const QVector<RelationshipSignal> related = m_workstreamManager->relatedForPath(
        path,
        12,
        m_workstreamManager->currentWorkstreamId());
    if (related.isEmpty()) {
        ToastNotification::showToast(this, QStringLiteral("No relationship neighborhood available yet."));
        return false;
    }

    QVector<RailRelationshipItem> items;
    items.reserve(related.size());
    for (const RelationshipSignal &signal : related) {
        if (signal.path.isEmpty()) {
            continue;
        }
        items.append(RailRelationshipItem{signal.path, signal.reason, signal.score});
    }
    if (items.isEmpty()) {
        ToastNotification::showToast(this, QStringLiteral("No relationship neighborhood available yet."));
        return false;
    }

    setRailVisible(true);
    m_rail->showRelationshipContext(path, items);

    if (!openDialog) {
        return true;
    }

    RelationshipGraph graph;
    graph.title = QFileInfo(path).fileName();
    graph.nodes.append(RelationshipNode{QStringLiteral("primary"), QFileInfo(path).fileName(), path, 1.0f, true});

    int index = 0;
    for (const RelationshipSignal &signal : related) {
        if (signal.path.isEmpty()) {
            continue;
        }
        const QString nodeId = QStringLiteral("n%1").arg(index++);
        const QString label = QFileInfo(signal.path).fileName().isEmpty() ? signal.path : QFileInfo(signal.path).fileName();
        graph.nodes.append(RelationshipNode{nodeId, label, signal.path, signal.score, false});
        graph.edges.append(RelationshipEdge{QStringLiteral("primary"), nodeId, signal.score, QStringLiteral("Workstream-local relation"), signal.reason, signal.score});
        if (index >= 12) {
            break;
        }
    }

    auto *dialog = new QDialog(this);
    dialog->setAttribute(Qt::WA_DeleteOnClose);
    dialog->setWindowTitle(QStringLiteral("Relationships"));
    dialog->resize(820, 560);
    auto *layout = new QVBoxLayout(dialog);
    auto *view = new RelationshipView(dialog);
    view->setGraph(graph);
    layout->addWidget(view);
    connect(view, &RelationshipView::pathActivated, dialog, [this, dialog](const QString &selectedPath) {
        m_workspace->addTab(selectedPath);
        dialog->accept();
    });
    dialog->show();
    dialog->raise();
    dialog->activateWindow();
    return true;
}

void MainWindow::onPathChanged(const QString &path) {
    const QFileInfo info(path);
    const QString navigationPath = info.exists() && info.isFile() ? info.absolutePath() : path;

    m_toolbar->breadcrumb()->setPath(path);
    m_sidebar->highlightCurrent(navigationPath);
    m_sidebar->recordRecentLocation(navigationPath);
    m_statusStrip->setPath(path);
    m_rail->setSearchRoot(navigationPath);

    if (m_workspace->currentSupportsViewMode() && m_workspace->currentPane()) {
        m_statusStrip->setItemCount(m_workspace->currentPane()->itemCount());
        m_toolbar->setNavigationState(m_workspace->canGoBackCurrent(),
                                      m_workspace->canGoForwardCurrent(),
                                      m_workspace->canGoUpCurrent());
    } else {
        m_statusStrip->setItemCount(1);
        m_toolbar->setNavigationState(false, false, m_workspace->canGoUpCurrent());
    }

    if (m_orchestrator != nullptr) {
        m_orchestrator->setActivePath(info.exists() && info.isFile() ? info.absoluteFilePath() : QString());
        m_orchestrator->setState(path.isEmpty() ? OrchestratorState::Idle : OrchestratorState::Working);
    }
    refreshIntelligenceSurface();
}

void MainWindow::applyShellTone(const QColor &color) {
    if (m_shellTone.isValid() && colorDistance(m_shellTone, color) < 25) {
        return;
    }
    m_shellTone = color;

    // Subtle tint from hosted content - keep the shell mostly neutral
    const QColor base = blendToward(QColor(32, 32, 32), color, 0.08);

    if (m_shellRoot) {
        m_shellRoot->setStyleSheet(QStringLiteral("#ShellRoot { background-color: %1; }")
                                       .arg(base.name(QColor::HexRgb)));
    }
    m_workspace->setStyleSheet(QStringLiteral("background-color: %1;").arg(base.name(QColor::HexRgb)));
}

void MainWindow::markSessionDirty() {
    m_sessionDirty = true;
}

void MainWindow::saveSession(bool cleanExit) {
    m_sessionSnapshot.tabs = m_workspace->captureTabState();
    m_sessionSnapshot.activeTabIndex = m_workspace->currentTabIndex();
    const QList<int> sizes = m_splitter->sizes();
    if (sizes.size() >= 3) {
        m_sessionSnapshot.sidebarWidth = sizes.at(0);
        m_sessionSnapshot.railWidth = sizes.at(2);
    }
    m_sessionSnapshot.railVisible = m_railVisible;
    m_sessionSnapshot.lastSearchQuery = m_lastSearchQuery;
    m_sessionSnapshot.lastSearchRoot = activeSearchRoot();
    m_sessionSnapshot.lastSaveTimestamp = QDateTime::currentMSecsSinceEpoch();
    m_sessionSnapshot.hasCleanExit = cleanExit;
    if (m_workstreamManager != nullptr) {
        m_sessionSnapshot.activeWorkstreamId = m_workstreamManager->currentWorkstreamId();
    }

    if (!m_sessionSnapshot.activeWorkstreamId.isEmpty()) {
        WorkstreamSessionState workstreamState;
        workstreamState.tabs = m_sessionSnapshot.tabs;
        workstreamState.activeTabIndex = m_sessionSnapshot.activeTabIndex;
        workstreamState.searchQuery = m_lastSearchQuery;
        workstreamState.searchRoot = m_sessionSnapshot.lastSearchRoot;
        m_sessionSnapshot.workstreamStates.insert(m_sessionSnapshot.activeWorkstreamId, workstreamState);
    }

    m_sessionStore.save(m_sessionSnapshot);
    if (m_runtimeSession != nullptr) {
        m_runtimeSession->setSnapshot(m_sessionSnapshot);
        m_runtimeSession->save();
    }
    m_sessionDirty = false;
}

void MainWindow::restoreSession() {
    m_sessionSnapshot = m_sessionStore.load();

    QVector<TabState> tabs = m_sessionSnapshot.tabs;
    int activeTabIndex = m_sessionSnapshot.activeTabIndex;

    if (!m_sessionSnapshot.activeWorkstreamId.isEmpty()) {
        m_workstreamManager->setCurrentWorkstream(m_sessionSnapshot.activeWorkstreamId);
        const WorkstreamSessionState scoped =
            m_sessionSnapshot.workstreamStates.value(m_sessionSnapshot.activeWorkstreamId);
        if (!scoped.tabs.isEmpty()) {
            tabs = scoped.tabs;
            activeTabIndex = scoped.activeTabIndex;
            m_lastSearchQuery = scoped.searchQuery;
        }
    }

    bool hasHomeTab = false;
    for (const TabState &tab : tabs) {
        if (QDir::fromNativeSeparators(tab.path) == QStringLiteral("ixplorer://home")) {
            hasHomeTab = true;
            break;
        }
    }
    if (!hasHomeTab) {
        TabState homeTab;
        homeTab.path = QStringLiteral("ixplorer://home");
        tabs.append(homeTab);
    }
    m_workspace->restoreTabState(tabs, activeTabIndex);

    m_lastSearchQuery = m_sessionSnapshot.lastSearchQuery.isEmpty() ? m_lastSearchQuery : m_sessionSnapshot.lastSearchQuery;
    if (!m_lastSearchQuery.isEmpty()) {
        m_toolbar->setSearchText(m_lastSearchQuery);
    }

    refreshWorkstreams();
    refreshToday();
    if (m_runtimeSession != nullptr) {
        m_runtimeSession->setSnapshot(m_sessionSnapshot);
    }
    setRailVisible(m_sessionSnapshot.railVisible);
    if (!m_sessionSnapshot.hasCleanExit) {
        const RecoveryPacket recovery = m_interruptionDetector->buildRecoveryPacket();
        if (recovery.wasInterrupted && !recovery.items.isEmpty()) {
            setRailVisible(true);
            m_rail->showRecoverySuggestion(recovery);
            ToastNotification::showToast(this, QStringLiteral("Recovered your last interrupted session."));
        }
    }
    refreshIntelligenceSurface();
    saveSession(false);
}

void MainWindow::refreshToday() {
    if (m_sidebar == nullptr || m_resumptionEngine == nullptr) {
        return;
    }
    const ResumptionPacket packet = m_resumptionEngine->buildPacket(m_workstreamManager->currentWorkstreamId());
    m_sidebar->setTodayPacket(packet);
    if (!m_rail->hasActiveQuery()) {
        m_rail->showResumeSuggestion(packet);
    }
}

void MainWindow::refreshWorkstreams() {
    if (m_sidebar == nullptr || m_workstreamManager == nullptr) {
        return;
    }
    m_sidebar->setWorkstreams(m_workstreamManager->workstreams(), m_workstreamManager->currentWorkstreamId());
}

void MainWindow::switchWorkstream(const QString &id) {
    const QString previousId = m_workstreamManager->currentWorkstreamId();
    if (id == previousId) {
        return;
    }

    if (!previousId.isEmpty()) {
        WorkstreamSessionState previousState;
        previousState.tabs = m_workspace->captureTabState();
        previousState.activeTabIndex = m_workspace->currentTabIndex();
        previousState.searchQuery = m_lastSearchQuery;
        previousState.searchRoot = activeSearchRoot();
        m_sessionSnapshot.workstreamStates.insert(previousId, previousState);
    }

    if (!m_workstreamManager->setCurrentWorkstream(id)) {
        return;
    }

    const WorkstreamSessionState scoped = m_sessionSnapshot.workstreamStates.value(id);
    if (!scoped.tabs.isEmpty()) {
        m_workspace->restoreTabState(scoped.tabs, scoped.activeTabIndex);
        m_lastSearchQuery = scoped.searchQuery;
        m_toolbar->setSearchText(m_lastSearchQuery);
    } else {
        const Workstream workstream = m_workstreamManager->workstreamForId(id);
        const QString fallbackPath = !workstream.topFolders.isEmpty() ? workstream.topFolders.first().first : QStringLiteral("ixplorer://home");
        m_workspace->restoreTabState({}, 0);
        m_workspace->navigateCurrentTab(fallbackPath);
        m_lastSearchQuery.clear();
        m_toolbar->setSearchText(QString());
    }

    if (m_activityTracker != nullptr) {
        m_activityTracker->logEvent(ActivityAction::WorkstreamSwitched, QString(), {}, {}, id);
    }
    refreshWorkstreams();
    refreshToday();
    refreshIntelligenceSurface();
    markSessionDirty();
}

void MainWindow::refreshIntelligenceSurface() {
    if (m_orchestrator == nullptr || m_rail == nullptr) {
        return;
    }

    const QString activePath = m_workspace->currentDocument() != nullptr
        ? m_workspace->currentDocument()->filePath()
        : QString();
    m_orchestrator->setActivePath(activePath);

    if (m_rail->hasActiveQuery()) {
        return;
    }

    const OrchestratorDecision decision = m_orchestrator->evaluate();
    switch (decision.action) {
    case OrchestratorDecision::Action::ShowRecovery:
        if (decision.payload.canConvert<RecoveryPacket>()) {
            if (decision.confidence > 0.6f) {
                setRailVisible(true);
            }
            m_rail->showRecoverySuggestion(decision.payload.value<RecoveryPacket>());
        }
        break;
    case OrchestratorDecision::Action::ShowPredictedBundle:
        if (decision.payload.canConvert<BundlePrediction>()) {
            if (decision.confidence > 0.45f) {
                setRailVisible(true);
            }
            m_rail->showPredictedBundle(decision.payload.value<BundlePrediction>());
        }
        break;
    case OrchestratorDecision::Action::ShowResumption:
        if (decision.payload.canConvert<ResumptionPacket>()) {
            if (decision.confidence > 0.45f) {
                setRailVisible(true);
            }
            m_rail->showResumeSuggestion(decision.payload.value<ResumptionPacket>());
        } else {
            m_rail->showResumeSuggestion(m_resumptionEngine->buildPacket(m_workstreamManager->currentWorkstreamId()));
        }
        break;
    default:
        if (!activePath.isEmpty()) {
            const BundlePrediction bundle = m_bundlePredictor->predictForPath(activePath);
            if (!bundle.primaryPath.isEmpty()) {
                m_rail->showPredictedBundle(bundle);
                break;
            }
        }
        m_rail->showResumeSuggestion(m_resumptionEngine->buildPacket(m_workstreamManager->currentWorkstreamId()));
        break;
    }
}

void MainWindow::openPathsBundle(const QStringList &paths, const QString &workstreamId) {
    if (!workstreamId.isEmpty() && workstreamId != m_workstreamManager->currentWorkstreamId()) {
        switchWorkstream(workstreamId);
    }

    bool openedPrimary = false;
    for (const QString &path : paths) {
        if (path.isEmpty()) {
            continue;
        }
        if (!openedPrimary) {
            m_workspace->addTab(path);
            openedPrimary = true;
        } else {
            m_workspace->previewPath(path);
        }
    }
    if (openedPrimary) {
        setRailVisible(true);
    }
}

QString MainWindow::activeSearchRoot() const {
    if (m_workspace->currentDocument() != nullptr) {
        return QFileInfo(m_workspace->currentDocument()->filePath()).absolutePath();
    }
    if (m_workspace->currentPane() != nullptr) {
        return m_workspace->currentPane()->currentPath();
    }
    return QDir::homePath();
}

void MainWindow::setRailVisible(bool visible) {
    if (m_railVisible == visible) {
        m_statusStrip->setRailVisible(visible);
        m_toolbar->setRailVisible(visible);
        return;
    }

    const QList<int> currentSizes = m_splitter->sizes();
    if (!currentSizes.isEmpty() && currentSizes.size() >= 3 && currentSizes.at(2) > 0) {
        m_lastRailWidth = currentSizes.at(2);
    }

    m_railVisible = visible;
    m_statusStrip->setRailVisible(visible);
    m_toolbar->setRailVisible(visible);

    const int targetRailWidth = visible ? qMax(320, m_lastRailWidth) : 0;
    const int startRailWidth = m_rail->width();

    if (visible) {
        m_rail->setVisible(true);
    }

    auto *anim = new QVariantAnimation(this);
    anim->setDuration(220);
    anim->setEasingCurve(QEasingCurve::OutExpo);
    anim->setStartValue(startRailWidth);
    anim->setEndValue(targetRailWidth);

    connect(anim, &QVariantAnimation::valueChanged, this, [this](const QVariant &value) {
        const int w = value.toInt();
        m_rail->setMaximumWidth(w);
        m_rail->setMinimumWidth(w);
        
        auto sizes = m_splitter->sizes();
        if (sizes.size() >= 3) {
            int total = m_splitter->width() - m_splitter->handleWidth() * 2;
            sizes[2] = w;
            sizes[1] = qMax(0, total - sizes[0] - w);
            m_splitter->setSizes(sizes);
        }
    });

    connect(anim, &QVariantAnimation::finished, this, [this, visible, targetRailWidth]() {
        if (!visible) {
            m_rail->setVisible(false);
        } else {
            m_rail->setMinimumWidth(320);
            m_rail->setMaximumWidth(16777215);
            auto sizes = m_splitter->sizes();
            if (sizes.size() >= 3) {
                sizes[2] = targetRailWidth;
                m_splitter->setSizes(sizes);
            }
        }
    });

    anim->start(QAbstractAnimation::DeleteWhenStopped);
}

void MainWindow::toggleRailVisible() {
    setRailVisible(!m_railVisible);
}

} // namespace Ixplorer
