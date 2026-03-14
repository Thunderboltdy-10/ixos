# Ixplorer Reliability + Harness Batch (2026-03-13)

## Scope
- Formalized rail primary states (search, workstream context, relationship context, selection detail).
- Added relationship neighborhood rail mode and command routing.
- Added command telemetry persistence and summary metrics.
- Added orchestrator decision logging for replayable gate analysis.
- Added embed hosting reliability hardening (per-app profiles, recovery backoff, structured diagnostics).
- Added lease reliability hardening in ixos-search (silent refresh mode, adaptive backoff polling, startup timeout guard, stale cache self-heal).
- Added replay/eval script for resume/auto-open/stability/controller metrics.
- Restored Today sidebar packet wiring (resume/support actions are live again).
- Added workstream replay metadata persistence and harness visibility (`graph_signature`, `source_event_count`, `last_rebuild_at`).

## Verification Commands
1. `C:/Qt/Tools/CMake_64/bin/cmake.exe --build ixplorer/build --config Release`
- Result: PASS

2. Launch smoke:
- Command: `Ixplorer.exe` start + 4s liveness check
- Result: `IXPLORER_ALIVE`

3. `cargo check --manifest-path ixos-search/src-tauri/Cargo.toml -p ixos-app`
- Result: PASS

4. `npm --prefix ixos-search/ui run build`
- Result: PASS (`tsc && vite build`)

5. `python scripts/ixplorer_eval.py --output reports/ixplorer_eval_2026-03-13.md`
- Result: PASS (report generated)

## Artifacts
- `reports/ixplorer_eval_2026-03-13.md`
- `reports/ixplorer_reliability_and_harness_batch_2026-03-13.md`

## Notes
- Eval harness generated with zero data samples on this run (fresh telemetry files), but path wiring and report generation are validated.
- Command/search/orchestrator/embed telemetry files now auto-accumulate under local Ixplorer app data for replay runs.
