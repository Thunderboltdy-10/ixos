Implementation Continuation Notes (2026-03-11)

These instructions extend the base "Ixplorer Intelligence Layer — Complete Implementation Plan" below and must be re-fetched on every continuation together with the `frontend-design` skill.

Additional non-negotiables from the user:

1. Ixplorer search / rail UX
- The explanation / evidence area must open inside the existing right rail, anchored at the bottom of that same panel. Do not create a separate side pane for explanations.
- The first result should be opened by default.
- Ixos search inside Ixplorer must feel fast by default. Cache-first and Auto mode remain the default expectation.

2. Embedded surface behavior
- For editable/code-like files, the embedded surface should show the actual default desktop editor/app (for example VS Code), not a stripped internal read-only viewer.
- The embedded app should behave like the normal app as much as possible, resizing naturally inside the host.
- The only intended differences for embedded windows are:
  - no normal desktop minimize / maximize / close buttons
  - no dragging within the embedded host area
- Keep the host-edge blending / gradient treatment so the embedded app and Ixplorer chrome feel native together.
- Do not regress reliability: if host recovery/fallback is needed, prefer pragmatic stability over decorative behavior.

3. Ixplorer shell polish direction
- The current sidebar/workstream/today treatment is considered too cluttered.
- Move the visual direction closer to Windows File Explorer / Notion style:
  - neater hierarchy
  - smaller, lighter navigation chrome
  - fewer card-like information blocks
  - tighter, more intentional information density
- The back / forward / up / refresh controls should be compact and should not sit inside an oversized parent container.
- Continue polishing spacing, pane balance, and the right-rail/result presentation.

4. Full-plan expectation
- Treat the entire plan below as the required scope, not a partial phase delivery.
- If a phase is not truly implemented or only scaffolded, continue until it is integrated or explicitly blocked by something real and evidenced.
- The user’s current perception is that only workstreams are clearly visible, so remaining intelligence features must become genuinely apparent in the UX.

5. Desktop release / deployment hardening
- Before stopping, audit the Ixos desktop app release path that is triggered by Git tags.
- Ensure there are no hidden UI/type/build issues, including OS-dependent problems that may not show on Windows alone.
- Verify the installer/model/env handling used in GitHub-triggered builds.
- Previous failures included:
  - models missing from installers
  - `.env.local`-style values not materialized correctly in CI/release builds
- Be careful with packaging decisions:
  - do not make lab/test/v1 models available in Git
  - do not commit private landing-page secrets from `.env.local`
  - evaluate whether model bundling belongs in the repo, the release workflow, or download-time provisioning, and choose deliberately

6. Verification expectation
- At the end of each serious pass, provide concrete test instructions for the user and keep repo memory (`PLAN.md`, `RUNLOG.md`, `DECISIONS.md`, reports) updated.

 Ixplorer Intelligence Layer — Complete Implementation Plan

 Context

 Ixplorer is a Qt/C++ file explorer and second-brain IDE hybrid. It currently has zero intelligence: no activity tracking, no session persistence, no workstreams, no personal ranking. All state is ephemeral — close the app and everything is gone except 8 recent locations in
 QSettings.

 Meanwhile, the Ixos Search desktop app (Tauri/React) already has basic versions of several features: ActivityLedger, WorkstreamManager (30-min gap clustering), TodayTab, PersonalRanker, CoOccurrenceAnalyzer, all backed by the shared Rust library.

 This plan adds 12 interconnected features to Ixplorer (priority) and enhances the Ixos Search app where features are shared. The implementation is phased so each phase delivers a working increment and provides the foundation for the next.

 ---
 Architecture Snapshot

 Ixplorer (Qt/C++17, CMake)
 ├── MainWindow → [ExplorerToolbar, AppSidebar, TabWorkspace, IxosRail, StatusStrip, CommandPalette]
 ├── Search: IxosCliSearchProvider spawns ixos.exe, parses JSON
 ├── Tabs: ExplorerPane (filesystem) + DocumentPane (preview/hosting)
 ├── Sidebar: SidebarSection widgets (Home, Favorites, Recents, Drives)
 ├── Theme: QSS dark theme, Colors.h, Segoe MDL2 Assets icons
 └── State: m_history per ExplorerPane, QSettings for recents only

 Ixos Search (Tauri v2 / React / Zustand)
 ├── Backend: Rust Tauri commands (activity, workstreams, search, personal_ranking)
 ├── Frontend: 6 Zustand stores, TodayTab, WorkstreamsList, ConnectionMap
 ├── Persistence: ChaCha20Poly1305 encrypted JSON
 └── Already has: ActivityLedger, WorkstreamManager, PersonalRanker, CoOccurrence

 Shared Rust Library (src/)
 ├── activity_ledger/: ActivityEvent, ActivityLedger, CoOccurrenceAnalyzer
 ├── workstreams/: Workstream, WorkstreamManager, auto_cluster_sessions()
 ├── ixos_rank/personal_ranker.rs: PersonalSignals, exponential decay (7-day τ)
 ├── ixos_rank/secure_ranker.rs: Composite scoring (semantic 0.4 + integrity 0.3 + temporal 0.1 + behavior 0.2)
 └── storage/personal_ranking.rs: ADS (Windows) / xattr (Unix) / fallback JSON

 ---
 Phase 0: Foundation Infrastructure

 Everything depends on activity data and persistent state. Build these first.

 0A — Activity Tracking Engine for Ixplorer

 Problem: Ixplorer has zero telemetry about what the user does. Features 1-7, 10-11 all require activity history.

 New files:
 - ixplorer/src/data/ActivityTracker.h / .cpp

 Data model:
 namespace Ixplorer {

 enum class ActivityAction : int {
     FileOpened, FileRevealed, FileModified, FilePinned, FileUnpinned,
     SearchQuery, ResultShown, ResultClicked,
     TabOpened, TabClosed, TabSwitched,
     SessionStart, SessionEnd, DirectoryChanged, FilePreviewOpened,
     WorkstreamSwitched
 };

 struct ActivityEvent {
     QString id;           // UUID
     QString fileId;       // hash of path for correlation
     QString filePath;
     qint64 timestamp;     // Unix ms
     ActivityAction action;
     QString queryHash;    // optional
     QString workstreamId; // optional
     QVariantMap metadata; // extensible
 };
 }

 ActivityTracker class:
 - logFileOpen(path, queryContext), logSearch(query, dir), logResultClick(path, query), logTabSwitch(path), logDirectoryChange(path)
 - getActivity(sinceMs, limit) → QVector<ActivityEvent>
 - getRecentFiles(limit) → QVector<RecentFileEntry> (path + touchCount + lastTouched)
 - getCoOccurrences(path, windowMins) → QVector<QPair<QString, int>> co-occurring files with counts
 - Rolling 30-day window, max 10,000 events (matching Rust MAX_EVENTS)
 - Index: QHash<QString, QVector<int>> for fileId→eventIndices and queryHash→eventIndices
 - Index rebuild every 100 insertions
 - Autosave to JSON at QStandardPaths::AppLocalDataLocation + "/ixplorer/activity_v1.json"

 Co-occurrence algorithm: For each timestamp of the source file, scan all other tracked files for activity within the window. O(n×m) bounded by max 1000 timestamps/file and 5000 timeline entries — matches the Rust CoOccurrenceAnalyzer design exactly.

 Integration (all in MainWindow::setupConnections()):

 ┌─────────────────────────────────────┬─────────────────────────────────────┐
 │               Signal                │               Handler               │
 ├─────────────────────────────────────┼─────────────────────────────────────┤
 │ TabWorkspace::pathChanged           │ ActivityTracker::logDirectoryChange │
 ├─────────────────────────────────────┼─────────────────────────────────────┤
 │ TabWorkspace::fileActivated         │ ActivityTracker::logFileOpen        │
 ├─────────────────────────────────────┼─────────────────────────────────────┤
 │ TabWorkspace::currentTabChanged     │ ActivityTracker::logTabSwitch       │
 ├─────────────────────────────────────┼─────────────────────────────────────┤
 │ IxosRail::searchSubmitted           │ ActivityTracker::logSearch          │
 ├─────────────────────────────────────┼─────────────────────────────────────┤
 │ IxosRail::openFileRequested         │ ActivityTracker::logResultClick     │
 ├─────────────────────────────────────┼─────────────────────────────────────┤
 │ IxosRail::openPathInNewTabRequested │ ActivityTracker::logResultClick     │
 └─────────────────────────────────────┴─────────────────────────────────────┘

 0B — Session Persistence Engine (Feature 10 MVP)

 Problem: Close Ixplorer, lose everything. Tabs, scroll positions, search state — all gone.

 New files:
 - ixplorer/src/data/SessionState.h / .cpp

 Data model:
 struct TabState {
     QString path;
     bool isDocument;      // ExplorerPane vs DocumentPane
     bool isPreview;
     int scrollPosition;
     int viewMode;         // Details/List
     QStringList history;
     int historyIndex;
 };

 struct SessionState {
     int version = 1;
     QVector<TabState> tabs;
     int activeTabIndex = 0;
     int sidebarWidth = 248;
     int railWidth = 0;
     bool railVisible = false;
     QString lastSearchQuery;
     QString lastSearchRoot;
     qint64 lastSaveTimestamp = 0;
     bool hasCleanExit = false;   // false on crash → interruption detection
     QString activeWorkstreamId;
 };

 Save triggers: App close (closeEvent), autosave every 60s via QTimer (only if dirty), workstream switch.

 Restore: On app start, load session JSON. Reconstruct tabs via TabWorkspace::addTab(). If corrupted/missing, fallback to single tab at QDir::homePath().

 Storage: QStandardPaths::AppLocalDataLocation + "/ixplorer/session_v1.json" — QJsonDocument serialization.

 Integration: MainWindow gets m_sessionState, saveSession(), loadSession(). Set hasCleanExit = true in closeEvent. On crash, flag remains false → Phase 3C interruption detection.

 0C — Extended CLI Bridge

 Problem: Ixplorer communicates with Ixos via ixos.exe subprocess. Workstreams and personal ranking live in Rust. Need new CLI subcommands.

 New CLI subcommands (in src/cli/commands.rs):
 ixos activity log --file <path> --action <action> [--query <query>]
 ixos activity recent --limit <n> --json
 ixos activity co-occurrence --file <path> --window <mins> --json
 ixos workstream list --json
 ixos workstream current --json
 ixos personal get --file <path> --json
 ixos personal open --file <path>

 These let Ixplorer consume the shared Rust intelligence via subprocess calls, matching the existing IxosCliSearchProvider pattern. The C++ ActivityTracker maintains a local mirror for low-latency access.

 ---
 Phase 1: Session Memory, Personal Ranking, Basic Workstreams

 The three foundational "memory" systems: where you were, what matters to you, what you're working on.

 1A — Full Session Memory (Feature 10)

 Enhance Phase 0B with per-workstream session scoping:

 struct SessionState {
     // ... existing fields ...
     QHash<QString, WorkstreamSessionState> workstreamStates;
 };

 struct WorkstreamSessionState {
     QVector<TabState> tabs;
     int activeTabIndex;
     QString searchQuery;
     QString searchRoot;
 };

 Behavior: When switching workstreams, save current tab/rail/search state keyed to old workstream ID. Load new workstream's state if it exists. Global session is the fallback.

 Ixos Search: Add WorkstreamUIState to the Zustand workstreamStore — persist openResultPaths, lastQuery, scrollPosition, selectedTab per workstream via the existing save_workstreams Tauri command.

 1B — Personal Ranking for Ixplorer (Feature 7 MVP)

 New files:
 - ixplorer/src/data/PersonalRanker.h / .cpp

 Algorithm — exact mirror of Rust personal_ranker.rs:
 - DECAY_TAU_SECONDS = 604800 (7-day half-life)
 - recencyFactor(lastOpen, now) = exp(-(now - lastOpen) / TAU)
 - updateOnOpen(signal, now): openScore = openScore * decay + 1.0
 - normalizedScore(score) = clamp(score / 20.0, 0.0, 1.0)

 Two sync strategies:
 1. Primary: Call ixos.exe personal open --file <path> to update NTFS ADS signals — keeps Ixplorer and Ixos Search in sync
 2. Fallback: Local QHash<QString, PersonalSignal> saved to personal_signals_v1.json

 Integration with search: After IxosCliSearchProvider returns results, apply personal boost:
 float personalBoost = m_personalRanker->getBoost(hit.path);  // [0, 0.15]
 hit.score = hit.score * 0.9f + personalBoost * 0.1f;
 // Re-sort results

 Ixos Search enhancements:
 - Add dwell_time tracking: focus on a result > 3s → implicit positive signal
 - Add tab_persistence signal: result stays open across sessions → boost
 - Extend PersonalSignals in Rust with dwell_score: f32 field

 1C — Basic Workstreams for Ixplorer (Feature 1 MVP)

 New files:
 - ixplorer/src/data/WorkstreamManager.h / .cpp

 Data model (matching Rust Workstream):
 struct Workstream {
     QString id;
     QString name;
     qint64 createdAt, lastActive;
     QVector<QPair<QString, int>> topFolders;  // (path, count)
     QVector<QPair<QString, int>> topFiles;
     bool isAuto, isPinned;
     QString description;
 };

 MVP clustering — time-gap detection matching auto_cluster_sessions():
 1. Sort events by timestamp
 2. Split where gap > 30 minutes
 3. For each session (≥2 events): count folder/file frequencies, auto-generate name from dominant folder
 4. Cap at 100 workstreams, prune oldest non-pinned

 Sidebar integration: New SidebarSection in AppSidebar between Recents and This PC:
 Workstreams
   > project-src - Mar 10         (click → switch workstream)
   > research-docs - Mar 9
   > ui-refactor - Mar 8

 Signals: AppSidebar::workstreamSelected(QString id) → MainWindow::switchWorkstream(id) → saves current session state, loads workstream's session state, updates all widgets.

 ---
 Phase 2: Today/Resume, Search Enhancement, Command Palette

 The "smart" layer — resumption intelligence, search as action, contextual commands.

 2A — Today / Resume System (Feature 2)

 New files:
 - ixplorer/src/data/ResumptionEngine.h / .cpp
 - ixplorer/src/widgets/TodaySection.h / .cpp

 Resumption packet:
 struct ResumptionPacket {
     QString primaryPath;              // Most likely file to resume
     QVector<QString> supportingPaths; // 2-5 related items
     QString lastQuery;
     QString workstreamId;
     float confidence;                 // [0, 1]
     QString reason;
 };

 Ranking algorithm — for each candidate file, compute:
 resumption_score =
     0.30 × recency         (exp decay, 1-hour τ — tighter than personal 7-day τ)
   + 0.20 × unfinishedness  (1.0 if tab was open at session end, 0.5 if dwell < 10s)
   + 0.15 × frequency       (min(1.0, openCount_7d / 10.0))
   + 0.10 × interruption    (1.0 if last session had no clean SessionEnd event)
   + 0.10 × temporal_regularity  (24-bin hour histogram: histogram[currentHour] / max)
   + 0.10 × co_occurrence   (normalized count from ActivityTracker)
   + 0.05 × personal_boost  (from PersonalRanker)

 Bundle expansion: After selecting top-1 primary file:
 1. Get co-occurrences of primary
 2. Filter to same workstream
 3. Rank by co-occurrence strength × recency
 4. Take top 2-5

 UI: Compact TodaySection at top of AppSidebar (above Home), shown only when confidence > 0.3:
 Resume
   > main.rs        (primary, bold)
   > lib.rs, mod.rs (supporting, muted)
   Last: "embedding cache"
 Click opens the primary file, restores the workstream, shows supporting items in IxosRail.

 Rust library enhancement — new function in src/activity_ledger/mod.rs:
 pub fn compute_resumption_ranking(
     &self,
     personal_signals_fn: impl Fn(&str) -> Option<PersonalSignals>,
     current_hour: u32,
 ) -> Vec<ResumptionCandidate>

 Ixos Search: Enhance existing TodayTab to use this same algorithm via new Tauri command get_resumption_ranking(limit).

 2B — Search as Action Surface (Feature 5)

 Modifications to IxosRail — add confidence-based action policy:

 struct SearchActionPolicy {
     enum Action { AutoOpen, Suggest, ShowInRail, Silent };
     Action action;
     float confidence;
 };

 Decision logic (after semantic results arrive):
 float topScore = results.first().score;
 float gap = results.size() > 1 ? topScore - results[1].score : topScore;

 if (topScore > 0.85f && gap > 0.15f) → AutoOpen
 if (topScore > 0.70f && gap > 0.10f) → Suggest (highlight + "Press Enter to open")
 else → ShowInRail (current behavior)

 - AutoOpen: emit autoOpenPathRequested(path) → TabWorkspace::previewPath()
 - Suggest: distinct visual treatment on first result, "Enter to open" hint
 - Thresholds stored in QSettings for calibration

 2C — Enhanced Command Palette (Feature 9)

 Modifications to CommandPalette.h/cpp — context-aware ranking:

 struct CommandPaletteItem {
     QString id, title, subtitle, keywords;
     float contextScore;  // NEW: dynamic, state-dependent
     bool available;      // NEW: can this run now?
 };

 New commands to register:

 ┌────────────────────┬─────────────────────┬──────────────────────────────────┐
 │         ID         │        Title        │          When relevant           │
 ├────────────────────┼─────────────────────┼──────────────────────────────────┤
 │ switch_workstream  │ Switch Workstream   │ Always (shows workstream picker) │
 ├────────────────────┼─────────────────────┼──────────────────────────────────┤
 │ open_bundle        │ Open Today Bundle   │ When workstream is active        │
 ├────────────────────┼─────────────────────┼──────────────────────────────────┤
 │ add_to_workstream  │ Add to Workstream   │ When files selected              │
 ├────────────────────┼─────────────────────┼──────────────────────────────────┤
 │ compare_files      │ Compare Files       │ When 2 files selected            │
 ├────────────────────┼─────────────────────┼──────────────────────────────────┤
 │ reopen_last_packet │ Reopen Last Session │ Always                           │
 ├────────────────────┼─────────────────────┼──────────────────────────────────┤
 │ pin_file           │ Pin File            │ When file selected               │
 ├────────────────────┼─────────────────────┼──────────────────────────────────┤
 │ toggle_today       │ Show Today          │ Always                           │
 └────────────────────┴─────────────────────┴──────────────────────────────────┘

 Ranking: Sort by contextScore × 0.4 + fuzzyMatchScore × 0.6. Context score computation:
 // Example: "search" is most useful when no results exist
 if (cmd.id == "search" && !hasSearchResults) cmd.contextScore = 0.8f;
 // "reveal in explorer" is most useful with a selection
 if (cmd.id == "reveal_in_explorer" && hasSelection) cmd.contextScore = 0.9f;
 // etc.

 ---
 Phase 3: Graph Workstreams, Relationships, Interruption Recovery

 The "intelligence" layer — workstreams become a living graph, relationships become visible, interruptions become recoverable.

 3A — Graph-Based Workstreams (Feature 1 Full)

 New file: src/workstreams/graph.rs (Rust library — shared)

 Data model:
 pub struct WorkstreamGraph {
     pub nodes: Vec<GraphNode>,         // files, folders, queries, sessions, workstreams
     pub edges: Vec<GraphEdge>,         // typed + weighted connections
     pub memberships: HashMap<String, Vec<WorkstreamMembership>>,  // soft membership
 }

 pub struct GraphNode {
     pub id: String,
     pub node_type: NodeType,  // File, Folder, Query, Session, Workstream, Entity
     pub label: String,
     pub path: Option<String>,
     pub last_seen: u64,
 }

 pub struct GraphEdge {
     pub source: String,
     pub target: String,
     pub edge_type: EdgeType,  // CoOpen, TemporalProximity, SemanticSimilarity, SharedFolder, SharedQuery, ManualPin
     pub weight: f32,          // [0, 1]
     pub last_updated: u64,
 }

 pub struct WorkstreamMembership {
     pub workstream_id: String,
     pub strength: f32,  // [0, 1] — soft membership
     pub last_evidence: u64,
 }

 Membership score — a file's affinity to a workstream:
 membership(node, workstream) =
     0.30 × recent_co_access(node, workstream_files)
   + 0.25 × semantic_affinity(node, workstream_centroid)
   + 0.20 × same_session_fraction(node, workstream_sessions)
   + 0.15 × pinned_evidence(node, workstream)
   + 0.10 × shared_output(node, workstream_queries)
   − inactivity_decay   // 1 − exp(−(now − last_evidence) / (7 days))

 Clustering — incremental label propagation (community detection):
 1. Each node starts with its own label
 2. Each iteration: adopt the label most common among weighted neighbors (weight = edge_weight × recency_factor)
 3. Converge when < 5% of nodes change label
 4. O(V+E) per iteration, typically < 10 iterations. For 1000 nodes / 5000 edges: ~50ms

 Incremental update (on new activity event):
 1. Ensure source file node exists in graph
 2. Find co-occurring files within 30-min window → add/strengthen CoOpen edges
 3. Files in same folder → add/strengthen SharedFolder edges
 4. Run 1-2 iterations on affected neighborhood only (not full graph)
 5. Recompute membership scores for changed nodes

 Storage: workstreams_graph_v1.json — estimated ~170KB for 500 nodes / 2000 edges.

 CLI: ixos workstream graph --json → exports neighborhood for Ixplorer consumption.

 3B — Relationship Visualization (Feature 4)

 New files:
 - ixplorer/src/widgets/RelationshipView.h / .cpp

 Implementation: QGraphicsView + QGraphicsScene with force-directed layout (Fruchterman-Reingold):
 For each iteration (max 100, with cooling):
     Repulsion: k²/distance for each node pair
     Attraction: distance²/k for each edge
     Apply displacement with temperature decay

 Only renders local neighborhood (1-2 hops from focus node). For a 50-node subgraph: ~2ms/iteration = 200ms total.

 Not permanent UI: Opened via command palette ("Show Relationships") or right-click context menu. Replaces the right rail content temporarily or opens as a modal dialog.

 Node interactions: Single-click shows details tooltip, double-click navigates to file.

 Queryable views:
 - "What supports this file?" → Show co-open/co-edit neighbors
 - "What's central in this workstream?" → Highlight by degree centrality
 - "What bridges two workstreams?" → Show nodes with high betweenness
 - "What was used together this week?" → Filter edges by last_updated > 7 days ago

 Ixos Search: Enhance existing ConnectionMap component. Replace the flat list with an interactive graph using React Three Fiber (already available in the project). Feed from extended get_co_occurrence Tauri command that returns typed edges.

 3C — Interruption Recovery (Feature 11)

 New files:
 - ixplorer/src/data/InterruptionDetector.h / .cpp

 Detection: On app start, check SessionState::hasCleanExit. If false → user was interrupted (crash, force-close, system restart).

 Recovery packet — MMR (Maximal Marginal Relevance) selection:
 recovery_items = greedy_submodular_select(
     candidates = tabs open at interruption,
     budget = 3,
     λ = 0.7  // favor relevance over diversity
 )

 While |selected| < budget:
     best = argmax over remaining:
         λ × resumption_score(c) − (1−λ) × max_similarity(c, selected)
     selected.add(best)

 Diversity via path similarity: 1 − (shared_path_components / max_path_components). Prevents showing 3 files from the same directory when a broader view would be more useful.

 UI: ToastNotification::showToast() (already exists) with "Resume where you left off?" + compact 1-3 items. Click opens the recovery bundle. Dismiss button to skip.

 Ixos Search: On window.focus, check if gap since last activity > 15 minutes. If so, compute recovery packet via Rust backend. Show at top of search results or Today tab.

 ---
 Phase 4: Predictive Bundles, Orchestration, UI Restructure

 The "proactive" layer — the app starts anticipating what you need.

 4A — Predictive Context Bundles (Feature 3)

 New files:
 - ixplorer/src/data/BundlePredictor.h / .cpp

 Stage 1 — Predict next main item (bigram transition model):
 transition_matrix: QHash<QString, QHash<QString, int>>  // from_file → to_file → count

 P(B|A) = (count(A→B) + 1) / (count(A) + |vocabulary|)   // Laplace smoothed

 Where A→B means "B was opened within 5 minutes after A"

 Build from ActivityTracker history. O(n) to construct, O(v) to predict where v = unique files.

 Stage 2 — Expand to bundle (association rules):
 Given predicted main file M:
     For each file F in co_occurrences(M, window=30min):
         support(F|M) = co_count(M,F) / count(M)
         if support > 0.3:
             add F to bundle with score = support × recency(F)
     Sort by score, take top 4

 Confidence gating (critical — prevents noise):
 - Top transition probability > 0.4 AND
 - Bundle has ≥ 2 items AND
 - User hasn't navigated elsewhere in last 60 seconds

 UI: When IxosRail has no active search, show "Suggested Next" section:
 Predicted
   main.rs   87%
   lib.rs
   types.h
   [Open Bundle]

 4B — Hidden Orchestration Layer (Feature 6)

 New files:
 - ixplorer/src/data/Orchestrator.h / .cpp

 State machine:
 enum class OrchestratorState { Idle, Searching, Reviewing, Working, Returning };

 struct OrchestratorDecision {
     enum Action { DoNothing, ShowResumption, ShowPredictedBundle,
                   AutoOpenResult, SuggestResult, ShowRelated, EscalateSearch };
     Action action;
     float confidence;
     QVariant payload;
 };

 Utility-based decision — for each action a:
 utility(a) = expected_usefulness(a) − cost(a)

 Usefulness:
   DoNothing       = 0.0
   ShowResumption  = resumption_confidence × 0.8
   ShowBundle      = bundle_confidence × 0.6
   AutoOpenResult  = search_confidence × 1.0   (high value, high risk)
   SuggestResult   = search_confidence × 0.7
   ShowRelated     = co_occurrence_strength × 0.5
   EscalateSearch  = (1 − lexical_confidence) × time_remaining × 0.4

 Cost (annoyance / disruption):
   DoNothing       = 0.0
   ShowResumption  = 0.1
   ShowBundle      = 0.15
   AutoOpenResult  = 0.4   (high annoyance if wrong)
   SuggestResult   = 0.2
   ShowRelated     = 0.1
   EscalateSearch  = latency_increase / max_latency × 0.3

 Choose: argmax utility(a) if utility > 0.1

 Search stopping rule:
 should_stop =
     top_result.score > 0.9 OR
     elapsed > max_latency OR
     score_improvement_rate < 0.01  // diminishing returns

 Integration: QTimer at 200ms tick. Reads state from ActivityTracker, IxosRail, TabWorkspace, ResumptionEngine, BundlePredictor. Emits actionDecided(OrchestratorDecision) → MainWindow routes to appropriate widget.

 4C — UI Placement / Interaction Model (Feature 12)

 Sidebar restructure (modifications to AppSidebar):
 1. TodaySection          ← NEW (compact, from Phase 2A, only when high confidence)
 2. Workstreams           ← NEW (from Phase 1C)
 3. Home / Places         ← existing
 4. Favorites             ← existing section, now populated from pinned files
 5. This PC / Drives      ← existing
 6. Recents               ← existing, moved to bottom, collapsed by default

 Toolbar restructure (modifications to ExplorerToolbar):
 - Left: Navigation buttons (back/forward/up/refresh) — unchanged
 - Center: Breadcrumb bar (move from TabWorkspace to toolbar) + unified search field
 - Right: Command palette trigger (Ctrl+K) + Rail toggle + View mode
 - This requires moving m_breadcrumb from TabWorkspace to ExplorerToolbar

 IxosRail modes — the right rail becomes a multi-mode intelligence surface:
 enum class RailMode { Search, FileDetails, PredictedBundle, RelationshipHints, ResumptionSuggestion };
 Each mode has its own widget inside a QStackedWidget within the rail. The Orchestrator controls which mode is active.

 ---
 Phase 5: Embedded Surface Enhancement + Full Integration

 Polish, cross-product sync, and production hardening.

 5A — Embedded Working Surface Policy (Feature 8)

 Enhance FileOpenPolicy from binary classification to rich taxonomy:
 enum class FileOpenAction { External, HostAssociatedApp, PreviewInApp, EditorHost };

 struct FileOpenPolicy {
     FileOpenAction action;
     DocumentPane::HostMode preferredMode;
     float confidence;  // How confident is this classification?
 };

 Learning from behavior: If user manually opens externally 3+ times for an extension → prefer External. If preview tab stays open > 30s → prefer PreviewInApp.

 Store overrides in QHash<QString, FileOpenPolicyOverride> keyed by extension, persisted in session state.

 DocumentPane lifecycle:
 - Debounce hosted window geometry updates (100ms, already exists via m_hostMonitor)
 - Focus tracking: on DocumentPane focus, ensure hosted HWND is visible
 - HWND validity tracking: auto-recover if external process crashes

 5B — Ixos Search Full Enhancements

 New Tauri commands:
 - get_resumption_ranking(limit) → ActivityLedger::compute_resumption_ranking()
 - get_predicted_bundle(current_path) → new BundlePredictor in Rust
 - get_workstream_graph(workstream_id) → WorkstreamGraph::get_neighborhood()

 Zustand store extensions:
 - bundleStore: predicted bundles, update on activity
 - Enhanced todayStore: proper ranking algorithm instead of flat recency

 5C — Graph Workstreams Integration

 Connect graph model to search pipeline:
 - New EvidenceType::WorkstreamAffinity in EvidenceChain
 - SecureRanker: add workstream membership as scoring signal (weight 0.05)
 - CLI: expose all graph operations for Ixplorer consumption

 ---
 Dependency Graph

 Phase 0A (ActivityTracker)
     ├──→ Phase 0B (SessionState)
     │       ├──→ Phase 1A (Full Session Memory)
     │       └──→ Phase 3C (Interruption Recovery)
     ├──→ Phase 1B (PersonalRanker)
     │       ├──→ Phase 2A (Today/Resume)
     │       │       └──→ Phase 4A (Predictive Bundles)
     │       └──→ Phase 2B (Search Action Surface)
     │               └──→ Phase 4B (Orchestrator)
     ├──→ Phase 1C (Basic Workstreams)
     │       ├──→ Phase 3A (Graph Workstreams)
     │       │       └──→ Phase 3B (Relationship Visualization)
     │       └──→ Phase 2C (Command Palette)
     ├──→ Phase 4C (UI Restructure) — after Phase 2A
     └──→ Phase 5A (Embedded Surface) — independent

 New Files Inventory

 ┌───────┬───────────────────────────────────────────────┬──────────┐
 │ Phase │                     File                      │ Language │
 ├───────┼───────────────────────────────────────────────┼──────────┤
 │ 0A    │ ixplorer/src/data/ActivityTracker.h/.cpp      │ C++      │
 ├───────┼───────────────────────────────────────────────┼──────────┤
 │ 0B    │ ixplorer/src/data/SessionState.h/.cpp         │ C++      │
 ├───────┼───────────────────────────────────────────────┼──────────┤
 │ 1B    │ ixplorer/src/data/PersonalRanker.h/.cpp       │ C++      │
 ├───────┼───────────────────────────────────────────────┼──────────┤
 │ 1C    │ ixplorer/src/data/WorkstreamManager.h/.cpp    │ C++      │
 ├───────┼───────────────────────────────────────────────┼──────────┤
 │ 2A    │ ixplorer/src/data/ResumptionEngine.h/.cpp     │ C++      │
 ├───────┼───────────────────────────────────────────────┼──────────┤
 │ 2A    │ ixplorer/src/widgets/TodaySection.h/.cpp      │ C++      │
 ├───────┼───────────────────────────────────────────────┼──────────┤
 │ 3A    │ src/workstreams/graph.rs                      │ Rust     │
 ├───────┼───────────────────────────────────────────────┼──────────┤
 │ 3B    │ ixplorer/src/widgets/RelationshipView.h/.cpp  │ C++      │
 ├───────┼───────────────────────────────────────────────┼──────────┤
 │ 3C    │ ixplorer/src/data/InterruptionDetector.h/.cpp │ C++      │
 ├───────┼───────────────────────────────────────────────┼──────────┤
 │ 4A    │ ixplorer/src/data/BundlePredictor.h/.cpp      │ C++      │
 ├───────┼───────────────────────────────────────────────┼──────────┤
 │ 4B    │ ixplorer/src/data/Orchestrator.h/.cpp         │ C++      │
 └───────┴───────────────────────────────────────────────┴──────────┘

 Modified Files (across all phases)

 ┌───────────────────────────────────────────────────┬────────────┬────────────────────────────────────────────────────────┐
 │                       File                        │   Phases   │                        Changes                         │
 ├───────────────────────────────────────────────────┼────────────┼────────────────────────────────────────────────────────┤
 │ ixplorer/CMakeLists.txt                           │ All        │ Add all new sources                                    │
 ├───────────────────────────────────────────────────┼────────────┼────────────────────────────────────────────────────────┤
 │ ixplorer/src/app/MainWindow.h/.cpp                │ All        │ New members, signal wiring, lifecycle                  │
 ├───────────────────────────────────────────────────┼────────────┼────────────────────────────────────────────────────────┤
 │ ixplorer/src/widgets/AppSidebar.h/.cpp            │ 1C, 2A, 4C │ Workstreams section, Today section, layout restructure │
 ├───────────────────────────────────────────────────┼────────────┼────────────────────────────────────────────────────────┤
 │ ixplorer/src/widgets/IxosRail.h/.cpp              │ 2B, 4A, 4C │ Modes, bundle view, action surface                     │
 ├───────────────────────────────────────────────────┼────────────┼────────────────────────────────────────────────────────┤
 │ ixplorer/src/widgets/CommandPalette.h/.cpp        │ 2C         │ Context scoring, new commands                          │
 ├───────────────────────────────────────────────────┼────────────┼────────────────────────────────────────────────────────┤
 │ ixplorer/src/widgets/ExplorerToolbar.h/.cpp       │ 4C         │ Breadcrumb integration                                 │
 ├───────────────────────────────────────────────────┼────────────┼────────────────────────────────────────────────────────┤
 │ ixplorer/src/widgets/TabWorkspace.h/.cpp          │ 0B, 1A     │ Session state extraction/restoration                   │
 ├───────────────────────────────────────────────────┼────────────┼────────────────────────────────────────────────────────┤
 │ ixplorer/src/utils/FileOpenPolicy.cpp             │ 5A         │ Enhanced classification                                │
 ├───────────────────────────────────────────────────┼────────────┼────────────────────────────────────────────────────────┤
 │ src/workstreams/mod.rs                            │ 3A         │ Graph integration, pub mod graph                       │
 ├───────────────────────────────────────────────────┼────────────┼────────────────────────────────────────────────────────┤
 │ src/activity_ledger/mod.rs                        │ 2A         │ compute_resumption_ranking()                           │
 ├───────────────────────────────────────────────────┼────────────┼────────────────────────────────────────────────────────┤
 │ src/ixos_rank/secure_ranker.rs                    │ 5C         │ Workstream affinity signal                             │
 ├───────────────────────────────────────────────────┼────────────┼────────────────────────────────────────────────────────┤
 │ src/cli/commands.rs                               │ 0C         │ New CLI subcommands                                    │
 ├───────────────────────────────────────────────────┼────────────┼────────────────────────────────────────────────────────┤
 │ ixos-search/src-tauri/src/commands/workstreams.rs │ 3A, 5B     │ Graph endpoints                                        │
 ├───────────────────────────────────────────────────┼────────────┼────────────────────────────────────────────────────────┤
 │ ixos-search/src-tauri/src/commands/activity.rs    │ 2A, 5B     │ Resumption endpoint                                    │
 ├───────────────────────────────────────────────────┼────────────┼────────────────────────────────────────────────────────┤
 │ ixos-search/ui/src/stores/todayStore.ts           │ 5B         │ Proper ranking algorithm                               │
 ├───────────────────────────────────────────────────┼────────────┼────────────────────────────────────────────────────────┤
 │ ixos-search/ui/src/stores/workstreamStore.ts      │ 1A, 5B     │ Per-workstream UI state                                │
 ├───────────────────────────────────────────────────┼────────────┼────────────────────────────────────────────────────────┤
 │ ixos-search/ui/src/components/today/TodayTab.tsx  │ 5B         │ Enhanced with resumption ranking                       │
 └───────────────────────────────────────────────────┴────────────┴────────────────────────────────────────────────────────┘

 Shared vs Product-Specific

 ┌───────────────────────┬────────────────────────────────┬───────────────────────────────────────┬─────────────────────────────┐
 │       Component       │          Rust Library          │            Ixplorer (C++)             │         Ixos Search         │
 ├───────────────────────┼────────────────────────────────┼───────────────────────────────────────┼─────────────────────────────┤
 │ Activity data model   │ ActivityLedger ✅              │ ActivityTracker (local mirror)        │ ActivityState ✅            │
 ├───────────────────────┼────────────────────────────────┼───────────────────────────────────────┼─────────────────────────────┤
 │ Workstream clustering │ auto_cluster_sessions ✅       │ WorkstreamManager (C++ impl)          │ WorkstreamsState ✅         │
 ├───────────────────────┼────────────────────────────────┼───────────────────────────────────────┼─────────────────────────────┤
 │ Graph workstreams     │ WorkstreamGraph NEW            │ Consumes via CLI JSON                 │ Consumes via Tauri cmd      │
 ├───────────────────────┼────────────────────────────────┼───────────────────────────────────────┼─────────────────────────────┤
 │ Personal signals      │ PersonalSignals (ADS/xattr) ✅ │ PersonalRanker (reads ADS + fallback) │ PersonalRanker ✅           │
 ├───────────────────────┼────────────────────────────────┼───────────────────────────────────────┼─────────────────────────────┤
 │ Resumption ranking    │ compute_resumption_ranking NEW │ ResumptionEngine (C++ impl)           │ Consumes via Tauri          │
 ├───────────────────────┼────────────────────────────────┼───────────────────────────────────────┼─────────────────────────────┤
 │ Bundle prediction     │ —                              │ BundlePredictor (C++ only)            │ Future                      │
 ├───────────────────────┼────────────────────────────────┼───────────────────────────────────────┼─────────────────────────────┤
 │ Orchestrator          │ —                              │ Orchestrator (C++ only)               │ Future                      │
 ├───────────────────────┼────────────────────────────────┼───────────────────────────────────────┼─────────────────────────────┤
 │ Session state         │ —                              │ SessionState (C++ only)               │ Zustand stores ✅           │
 ├───────────────────────┼────────────────────────────────┼───────────────────────────────────────┼─────────────────────────────┤
 │ Relationship viz      │ Graph data export              │ RelationshipView (QGraphicsView)      │ ConnectionMap (R3F)         │
 ├───────────────────────┼────────────────────────────────┼───────────────────────────────────────┼─────────────────────────────┤
 │ Interruption detect   │ —                              │ InterruptionDetector (C++)            │ window.focus detection (JS) │
 └───────────────────────┴────────────────────────────────┴───────────────────────────────────────┴─────────────────────────────┘

 Verification

 Per phase, verify by:
 - Phase 0: Build Ixplorer. Open/close app. Check activity_v1.json grows. Check session_v1.json restores tabs on relaunch.
 - Phase 1: Verify workstreams appear in sidebar after sufficient activity. Verify personal ranking boosts frequently-opened files in search results. Verify session state persists per workstream.
 - Phase 2: Search for a clear match → verify auto-open triggers. Open command palette → verify context-relevant commands rank higher. Launch app → verify Today section shows resume suggestion.
 - Phase 3: Verify graph clustering produces multiple soft memberships. Open relationship view → verify force-directed layout renders. Kill app process → verify interruption recovery toast on next launch.
 - Phase 4: Navigate to a file → verify "Suggested Next" appears in rail. Verify orchestrator doesn't show suggestions when user is actively typing/searching. Verify sidebar/toolbar/rail layout matches spec.
 - Phase 5: Verify file open policy learning works (open externally 3x → next time defaults to external). Verify Ixos Search TodayTab uses ranking algorithm.
 - Cross-product: Open a file in Ixplorer → verify personal signal appears in Ixos Search and vice versa.
 - Build: cd ixplorer && cmake --build build --config Release + cargo build --release
Addendum — 2026-03-11 user corrections and release constraints

These requirements are part of the implementation contract and must be re-read alongside this file after every compaction:

- The right-panel explanation/details surface must render at the bottom of the existing right section panel. It must not create a detached/second explanation pane.
- The first search result should open by default when appropriate, while still keeping the explanation/details visible in the same right rail surface.
- Embedded file handling is not acceptable if it falls back to a read-only internal code/image/text view when the expected behavior is the real default desktop app/editor. For code and similar editable formats, the embedded experience should show the actual default editor window (for example VS Code if that is the system default), not a non-editable faux preview.
- Embedded windows must feel native inside Ixplorer: same app surface as normal, naturally resizable, no desktop-style minimize/maximize/close controls inside the embedded pane, no dragging inside the embedded pane, and a background-edge fade/gradient that prevents hard visual clashes between the host shell and the embedded app.
- The sidebar must be redesigned toward a neater File Explorer / Notion-style information architecture. It should feel calmer and less cluttered. Resume/workstream information must not dominate the sidebar or read as an ugly stacked dashboard.
- The toolbar navigation controls must be visually smaller, lighter, and not wrapped in an oversized parent pill/container if that makes them feel heavy or disconnected from the rest of the shell.
- The work is not considered done if only partial “phase scaffolding” exists. The full plan is expected to be implemented, surfaced in the UI, and testable. Features that exist only in code but are not obvious to a new user should be treated as incomplete.
- Explanations of “how to test” must be provided, but lack of obvious user-facing discoverability is itself a bug signal and should lead to more UI surfacing rather than a documentation-only answer.
- Before the next desktop-app release tag, the GitHub-triggered build/release path must be audited carefully for hidden TypeScript/UI/build issues, including OS-dependent problems that may not reproduce on this Windows machine.
- Installer/release packaging must be audited specifically for:
  - model inclusion in installers/build artifacts
  - environment/config handling across GitHub-triggered builds
  - whether current decisions about bundling models are actually safe and appropriate
- Do not accidentally make lab/test models, v1 models, or unrelated large artifacts available in Git/GitHub release payloads unless explicitly intended.
- Do not expose or commit secret landing-page `.env.local` values or private backend keys. Audit the workflow/config path so GitHub builds work without relying on a local secret-bearing `.env.local`.
- The Tauri/UI env values under the desktop app may be non-secret; treat the landing-page secrets separately and preserve that distinction.
- Any future progress check should explicitly verify whether the user-visible surface actually exposes the promised plan features, not just whether the code compiles.
