# Ixplorer Intelligence Integration Pass

- Date: 2026-03-11
- Scope:
  - Integrate the new Ixplorer intelligence data layer into the shell.
  - Make Ixos search behave faster by default in the CLI/Ixplorer path.
  - Stabilize embedded document behavior and prefer native in-app previews where they are more reliable than foreign-window hosting.

## Code changes

- Search:
  - Updated `src/main.rs` so the CLI/Ixplorer `auto` path performs lexical preflight before eager semantic indexing. This keeps default Auto search fast when lexical already has clear hits.
  - Updated `ixplorer/src/search/IxosCliSearchProvider.cpp` to terminate in-flight searches more gracefully instead of hard-killing every process immediately.

- Embedded document surface:
  - Expanded `ixplorer/src/utils/FileOpenPolicy.*` into a richer policy with confidence and host-mode hints.
  - Updated `ixplorer/src/widgets/DocumentPane.*` to use reliable internal viewers for code/text, images, media, and web-style documents; only host associated desktop windows for the remaining compatible cases; and attempt host-window recovery before falling back to the “Hosted app closed” state.
  - Connected `TabWorkspace::surfaceToneChanged` into `MainWindow` so the embedded surface and shell tint stay aligned.

- Intelligence layer:
  - Registered the new Ixplorer intelligence files in `ixplorer/CMakeLists.txt`.
  - Integrated `ActivityTracker`, `SessionState`, `PersonalRanker`, `WorkstreamManager`, `ResumptionEngine`, `BundlePredictor`, `InterruptionDetector`, and `Orchestrator` into `MainWindow`.
  - Added tab capture/restore helpers to `ixplorer/src/widgets/TabWorkspace.*`.
  - Added Today + Workstreams sections to `ixplorer/src/widgets/AppSidebar.*` and wired them to file resume/workstream switching.
  - Added command-palette context scoring plus workstream/resume commands in `ixplorer/src/widgets/CommandPalette.*` and `ixplorer/src/app/MainWindow.cpp`.

- Layout polish:
  - Increased toolbar/sidebar/tab-row spacing to separate breadcrumb/path/search/sidebar content more naturally.
  - Refined the Ixos rail behavior so selection no longer opens every result, while high-confidence top hits can still auto-open.

## Verification

- `cargo build --release`
  - PASS
- `C:\Qt\Tools\CMake_64\bin\cmake.exe --build ixplorer/build --config Release` with `C:\Qt\Tools\Ninja` on `PATH`
  - PASS
- `cargo check --manifest-path ixos-search/src-tauri/Cargo.toml`
  - PASS
- `npm run build` in `ixos-search/ui`
  - PASS
- `cargo test --lib resumption_snapshot_ranks_recent_repeat_work`
  - PASS
- `cargo test --lib test_build_graph_returns_related_neighbor`
  - PASS
- `Start-Process C:\Users\pablo\Downloads\Ixos\ixplorer\build\Ixplorer.exe -PassThru` + 4s alive check
  - PASS (`RUNNING PID=60344`, then intentionally stopped)

## Remaining manual QA

- Validate real hosted-app behavior for Office/PDF/browser-backed associations across resize, tab reuse, and close/reopen.
- Validate workstream switching + session restore across multiple real folders/files.
- Validate Today/workstream palette flows in a real GUI run rather than build-only verification.

## Continuation Update - Visible Orchestration + Release Hardening

- Date: 2026-03-11
- Additional scope:
  - Surface interruption recovery, resume context, and predicted-next context in the existing right rail instead of leaving those systems mostly dormant.
  - Reduce sidebar clutter and move intelligence-heavy affordances out of the left navigation.
  - Re-verify the desktop packaging path with fresh bundle cleanup.

### Additional code changes

- Ixplorer shell / intelligence surfacing:
  - Extended `ixplorer/src/widgets/IxosRail.*` with a context surface that now shows one of:
    - interrupted-session recovery
    - resume context
    - predicted next bundle
  - Kept the explanation/details surface anchored at the bottom of the same right rail and preserved first-result auto-open behavior.
  - Wired `ixplorer/src/app/MainWindow.*` to:
    - bind `InterruptionDetector` to live session state
    - run a 200 ms orchestration loop
    - surface recovery/resume/bundle actions into the rail
    - open context bundles directly from the rail
  - Simplified `ixplorer/src/widgets/AppSidebar.cpp` so the left sidebar stays calmer and the old resume block no longer dominates the navigation hierarchy.
  - Added command-palette actions that let the user pin the active file into Favorites and explicitly add the active file to the current workstream.

- Desktop release hardening:
  - Added `scripts/clean-tauri-output.js`.
  - Updated root `package.json` so `npm run tauri:build` / `tauri:build:prod` clean stale Tauri output before packaging.
  - Updated `.github/workflows/release.yml` to clean prior Tauri bundle outputs before `tauri-action`.

### Additional verification

- `C:\Qt\Tools\CMake_64\bin\cmake.exe --build ixplorer/build --config Release`
  - PASS
- `cargo check --manifest-path ixos-search/src-tauri/Cargo.toml`
  - PASS
- `cargo build --release`
  - PASS
- `npm run build` in `ixos-search/ui`
  - PASS
- `npm run tauri:build`
  - PASS
- `Start-Process C:\Users\pablo\Downloads\Ixos\ixplorer\build\Ixplorer.exe -PassThru` + 4s alive check
  - PASS

### Remaining manual QA after continuation

- Validate that code/text files now embed the real default editor window on this machine instead of falling back to the internal read-only viewer.
- Validate recovery/resume/predicted rail states in a realistic workflow so their timing and intrusiveness can be tuned from real use rather than build-only evidence.
- Validate one real GitHub tag-triggered release to confirm CI packaging includes only the intended shipped model set and materialized desktop env values.
