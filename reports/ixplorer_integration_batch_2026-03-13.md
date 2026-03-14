# Ixplorer Integration Batch Report (2026-03-13)

## Scope
Deep integration pass across Workstreams, Today/Resumption, Predictive Bundles, Relationship semantics, Search action rail, Command palette, and risk-aware orchestration.

## Implemented

### 1) Temporal graph workstreams (`IXP-100/101/102`)
- Replaced session-only clustering with a decayed heterogeneous relation graph over file activity.
- Edge components: co-open frequency, temporal adjacency, repeated same-session use, query co-occurrence, pin affinity.
- Added incremental cluster extraction from graph neighborhoods with cohesion/confidence/member-count metrics.
- Added relation cache API for downstream features: `WorkstreamManager::relatedForPath(...)`.

Files:
- `ixplorer/src/data/WorkstreamManager.h`
- `ixplorer/src/data/WorkstreamManager.cpp`

### 2) Multi-timescale resumption packets (`IXP-200/201/202`)
- Candidate ranking now uses short/medium/long temporal masses with decays plus unfinishedness/frequency/interruption regularity/co-occurrence.
- Resumption packet schema expanded with:
  - `lastMeaningfulActions`
  - `recentSearches`
  - `likelyNextActions`
  - `groupingEvidence`
- Supporting files now prefer workstream-local relationship signals.

Files:
- `ixplorer/src/data/ResumptionEngine.h`
- `ixplorer/src/data/ResumptionEngine.cpp`

### 3) Predictive context bundles (`IXP-300/301`)
- Predictor upgraded from simple Markov-only pathing to blended baseline:
  - transition probability
  - co-open prior
  - frecency
  - workstream prior
  - personal boost
- Bundle items now carry per-feature scores and explanation reason.

Files:
- `ixplorer/src/data/BundlePredictor.h`
- `ixplorer/src/data/BundlePredictor.cpp`

### 4) Relationship semantics + explanation (`IXP-400/401/403`)
- Relationship edges now carry semantic/evidence/confidence metadata.
- Relationship view filters weak edges and exposes semantic tooltips.
- MainWindow graph generation switched to workstream-local relationship signals.

Files:
- `ixplorer/src/data/RelationshipView.h`
- `ixplorer/src/data/RelationshipView.cpp`
- `ixplorer/src/app/MainWindow.cpp`

### 5) Search rail action surface + witness/stability gate (`IXP-501/502/701/702`)
- Top hit auto-open now risk-gated by witness quality + stability penalty + score gap.
- Added result actions directly in rail detail:
  - open here
  - open beside
  - add to workstream
  - compare
  - reveal graph
  - copy path
  - pin for today
- Added telemetry fields for witness and stability into orchestrator context.

Files:
- `ixplorer/src/widgets/IxosRail.h`
- `ixplorer/src/widgets/IxosRail.cpp`
- `ixplorer/src/app/MainWindow.cpp`

### 6) Risk-aware orchestration (`IXP-601/603 partial)
- Introduced risk-adjusted utility gate in orchestrator decisions.
- Added confidence/loss-budget controls for auto-open vs suggest vs escalate behavior.

Files:
- `ixplorer/src/data/Orchestrator.h`
- `ixplorer/src/data/Orchestrator.cpp`

### 7) Home/dashboard UI integration (frontend-design guided)
- Upgraded dashboard visual hierarchy and atmosphere.
- Resumption section now renders packet primary/support context and next-action hints.
- Workstream cards now surface query/cohesion context.

Files:
- `ixplorer/src/widgets/HomeDashboardPane.cpp`
- `ixplorer/src/widgets/AppSidebar.cpp`
- `ixplorer/resources/styles/ixplorer_dark.qss`

## Verification

| Check | Command | Result |
|---|---|---|
| Build | `C:\Qt\Tools\CMake_64\bin\cmake.exe --build ixplorer/build --config Release` (with `C:\Qt\Tools\Ninja` on `PATH`) | PASS |
| Runtime smoke | `Start-Process C:\Users\pablo\Downloads\Ixos\ixplorer\build\Ixplorer.exe -PassThru` + 4s alive check | PASS |

## Before/After Snapshot

| Area | Before | After |
|---|---|---|
| Workstreams | Session split + simple top folders/files | Decayed relation graph + incremental clustering + cohesion/confidence metrics |
| Resumption | Basic recency/frequency packet | Multi-timescale scoring + richer packet schema and evidence |
| Bundle prediction | Single transition model | Transition + co-open + frecency + workstream prior blend |
| Relationship graph | Generic weighted edges | Semantic/evidence/confidence edges with confidence filtering |
| Search interaction | Mostly open/double-click flow | Full action surface directly on results |
| Auto-open gate | heuristic score/gap | witness + stability + risk-aware gating |
