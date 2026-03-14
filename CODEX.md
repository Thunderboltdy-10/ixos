# CODEX.md

## Mission
Ixplorer is implemented as a filesystem-native work engine on top of Ixos foundations (staged search, Auto/Accurate routing, personal ranking, Today, Workstreams, and activity ledger), not as a parallel stack.

## Live Rules
- Track work by subsystem with one status per item: `TODO`, `PARTIAL`, `BLOCKED`, `DONE`.
- `DONE` requires implementation plus verification evidence.
- Update this file after each implementation batch.

## Status Legend
- `TODO`: not started.
- `PARTIAL`: baseline implemented, but not fully validated/completed.
- `BLOCKED`: external dependency or required runtime validation unavailable.
- `DONE`: implemented and verified.

## Non-Negotiable Foundation

### Shell Reliability / UX Correctness
- `DONE` [ISSUE] `IXP-001` Home fallback restore logic
  - Presence-based Home fallback, Home tab state round-trip, no focus theft from restored document tabs.
  - Files: `ixplorer/src/app/MainWindow.cpp`, `ixplorer/src/widgets/TabWorkspace.cpp`.
  - Evidence: `reports/ixplorer_foundation_bootstrap_2026-03-13.md`.

- `DONE` [ISSUE] `IXP-002` Dead rail CTA: View Workstreams
  - CTA wired to a concrete action path (rail -> MainWindow -> Home/workstream surface).
  - Files: `ixplorer/src/widgets/IxosRail.{h,cpp}`, `ixplorer/src/app/MainWindow.cpp`.
  - Evidence: `reports/ixplorer_foundation_bootstrap_2026-03-13.md`.

- `DONE` [ISSUE] `IXP-003` Embedded app hosting reliability baseline
  - Added per-app hosting profiles, hide-first capture, recovery with backoff, diagnostics logging, and host lifecycle hardening.
  - Files: `ixplorer/src/widgets/DocumentPane.{h,cpp}`.
  - Evidence: `reports/ixplorer_reliability_and_harness_batch_2026-03-13.md`.

- `DONE` [ISSUE] `IXP-004` Lease/stall reliability track (`ixos-search`)
  - Added startup/refresh logging, adaptive backoff refresh scheduling, bootstrap timeout guard, silent refresh, and corrupted entitlement cache self-heal.
  - Files: `ixos-search/src-tauri/src/commands/entitlement_manager.rs`, `ixos-search/ui/src/stores/authStore.ts`, `ixos-search/ui/src/components/auth/AuthGate.tsx`.
  - Evidence: `reports/ixplorer_reliability_and_harness_batch_2026-03-13.md`.

## Core Product Spine (Resumption + Bundles + Workstreams)

### Workstream Engine (Temporal Heterogeneous Graph)
- `DONE` [NEW] `IXP-100` Canonical graph schema baseline
- `DONE` [NEW] `IXP-101` Decayed weighted-edge updater
- `DONE` [NEW] `IXP-102` Incremental clustering baseline
  - Files: `ixplorer/src/data/WorkstreamManager.{h,cpp}`.
  - Evidence: `reports/ixplorer_integration_batch_2026-03-13.md`.

- `DONE` [NEW] `IXP-103` Workstream persistence and replayability baseline
  - Persisted replay metadata (`graph_signature`, `source_event_count`, `last_rebuild_at`) in `workstreams_v2.json`.
  - Eval harness reads workstream replay metadata.
  - Files: `ixplorer/src/data/WorkstreamManager.{h,cpp}`, `scripts/ixplorer_eval.py`.
  - Evidence: `reports/ixplorer_eval_2026-03-13.md`.

- `DONE` [NEW] `IXP-104` Workstream UI separation
  - Workstreams surfaced as dedicated task structure in sidebar/Home/rail and separate from Places/Quick Access filesystem navigation.
  - Files: `ixplorer/src/widgets/AppSidebar.cpp`, `ixplorer/src/widgets/HomeDashboardPane.cpp`, `ixplorer/src/widgets/IxosRail.cpp`.

### Today / Resumption Packets
- `DONE` [NEW] `IXP-200` Resumption packet schema v1
- `DONE` [NEW] `IXP-201` Multi-timescale memory features
- `DONE` [NEW] `IXP-202` Packet ranking scorer baseline
  - Files: `ixplorer/src/data/ResumptionEngine.{h,cpp}`.

- `DONE` [NEW] `IXP-203` Evaluation harness
  - Added replayable metrics script and markdown report output under `reports/`.
  - Files: `scripts/ixplorer_eval.py`, `reports/ixplorer_eval_2026-03-13.md`.

### Predictive Context Bundles (Active Work)
- `DONE` [NEW] `IXP-300` Baseline predictors
- `DONE` [NEW] `IXP-301` Candidate combiner (3-7 items)
  - Files: `ixplorer/src/data/BundlePredictor.{h,cpp}`.

- `PARTIAL` [NEW] `IXP-302` Online feedback loop
  - Behavioral signals feed activity/personal/workstream layers; explicit adaptive online weight-learning loop remains pending.

- `PARTIAL` [NEW] `IXP-303` Advanced sequence ablations
  - Policy-compliant baseline-first path implemented; advanced sequence-model ablations are intentionally deferred until baseline telemetry is populated.

## Explainability / Relationship Surfaces

### Relationship View (Workstream-local)
- `DONE` [NEW] `IXP-400` Edge semantics contract baseline
- `DONE` [NEW] `IXP-401` Sparse confidence-filtered rendering
- `DONE` [NEW] `IXP-402` Contextual trigger points
- `DONE` [NEW] `IXP-403` Rail integration
  - Files: `ixplorer/src/data/RelationshipView.{h,cpp}`, `ixplorer/src/widgets/IxosRail.{h,cpp}`, `ixplorer/src/app/MainWindow.cpp`.

## Search + Action Surfaces

### Search as Action Surface
- `DONE` [NEW] `IXP-500` Top bar / rail / center-pane contract
- `DONE` [NEW] `IXP-501` Confidence-based auto-open gate baseline
- `DONE` [NEW] `IXP-502` Result action surface
  - Actions include: open here, open beside, add to workstream, compare, reveal graph, copy path, pin for Today.
  - Files: `ixplorer/src/widgets/IxosRail.{h,cpp}`, `ixplorer/src/app/MainWindow.cpp`.

### Command Palette as Global Action Router
- `DONE` [NEW] `IXP-550` Typed command router
- `DONE` [NEW] `IXP-551` High-value command set
- `DONE` [NEW] `IXP-552` Command telemetry + success metrics
  - Files: `ixplorer/src/widgets/CommandPalette.{h,cpp}`, `ixplorer/src/data/CommandTelemetry.{h,cpp}`, `ixplorer/src/app/MainWindow.cpp`.

## Orchestration / Risk-Constrained Control

### Gate-by-Gate Controller
- `DONE` [NEW] `IXP-600` Decision points inventory
- `DONE` [NEW] `IXP-601` Logged-controller baseline logic
- `DONE` [NEW] `IXP-602` Replayable task harness baseline
- `PARTIAL` [NEW] `IXP-603` Confidence-sequence/selective behavior
  - Risk-aware utility gating is in place; formal confidence-sequence/martingale controller remains a follow-up.
  - Files: `ixplorer/src/data/Orchestrator.{h,cpp}`, `scripts/ixplorer_eval.py`.

## Ranking Trust and Stability

### Personal Ranking + Witness + Stability
- `DONE` [NEW] `IXP-700` Composite scoring integration
- `DONE` [NEW] `IXP-701` Witness gate for top1
- `DONE` [NEW] `IXP-702` Stability penalty
- `DONE` [NEW] `IXP-703` Counterfactual stability harness baseline
  - Near-query top1 flip-rate metric added in replay harness.
  - Files: `ixplorer/src/widgets/IxosRail.cpp`, `scripts/ixplorer_eval.py`.

## Embedded Working Surface

### Native Host-First Model
- `DONE` [NEW] `IXP-800` Foreign-window hosting hardening
- `DONE` [NEW] `IXP-801` Compatibility shims per app family baseline
- `DONE` [NEW] `IXP-802` Degradation policy baseline
- `PARTIAL` [NEW] `IXP-803` Full resize/focus/DPI QA matrix
  - Runtime matrix validation across external app families requires extended manual QA outside this batch.

## Rail State Discipline

### Contextual Right Rail
- `DONE` [NEW] `IXP-900` Primary state model
- `DONE` [NEW] `IXP-901` Dominance policy
- `DONE` [NEW] `IXP-902` Stay-silent behavior baseline
  - Files: `ixplorer/src/widgets/IxosRail.{h,cpp}`.

## UX Integrity / Navigation Discipline

### Coherent Information Architecture
- `DONE` [NEW] `IXP-950` Placement rules
- `DONE` [NEW] `IXP-951` Interaction quality pass
- `PARTIAL` [NEW] `IXP-952` Performance guardrails for new UI features
  - Build/runtime remains fast in this batch; explicit UI perf budget instrumentation is still open.

## Verification Evidence
- `C:\Qt\Tools\CMake_64\bin\cmake.exe --build ixplorer/build --config Release` (with `C:\Qt\Tools\Ninja` on `PATH`) -> PASS
- Ixplorer smoke launch (`Ixplorer.exe` alive after 4s) -> PASS
- `cargo check --manifest-path ixos-search/src-tauri/Cargo.toml -p ixos-app` -> PASS
- `npm --prefix ixos-search/ui run build` -> PASS
- `python scripts/ixplorer_eval.py --output reports/ixplorer_eval_2026-03-13.md` -> PASS

### Artifacts
- `reports/ixplorer_foundation_bootstrap_2026-03-13.md`
- `reports/ixplorer_integration_batch_2026-03-13.md`
- `reports/ixplorer_reliability_and_harness_batch_2026-03-13.md`
- `reports/ixplorer_eval_2026-03-13.md`

## Current Active Batch
- `COMPLETED` Batch `B-2026-03-13-B`
  1. Embed reliability hardening completed (`IXP-003`, `IXP-800/801/802`).
  2. Replay/eval harness completed baseline (`IXP-203`, `IXP-602`, `IXP-703`).
  3. Command telemetry + rail state machine completed (`IXP-552`, `IXP-900/901/902`).
  4. Today sidebar integration restored (resumption packet routing from sidebar to workspace).
