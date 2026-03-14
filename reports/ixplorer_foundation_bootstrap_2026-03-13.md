# Ixplorer Foundation Bootstrap Report (2026-03-13)

## Scope
This batch implemented two non-negotiable Ixplorer shell fixes and established the implementation tracker baseline.

## Fixes Completed

### 1) Home-tab restore fallback no longer depends on current tab
- Problem (before): `restoreSession()` appended a Home tab when the active restored tab was not a dashboard (`currentDashboard() == nullptr`), which could append an unnecessary Home tab and steal focus.
- Change (after): Session restore now checks the full restored tab set for any `ixplorer://home` tab and appends a fallback Home tab only when none exists.
- Additional correctness fix: `TabWorkspace::captureTabState()` now persists dashboard tabs as `ixplorer://home`, and `restoreTabState()` restores non-document tabs through `addTab()` so Home tabs round-trip correctly.
- Files:
  - `ixplorer/src/app/MainWindow.cpp`
  - `ixplorer/src/widgets/TabWorkspace.cpp`
  - `ixplorer/src/widgets/TabWorkspace.h`

### 2) "View Workstreams" CTA is now wired
- Problem (before): The rail button existed but had no signal/action binding.
- Change (after): Added `viewWorkstreamsRequested` signal in `IxosRail`; clicking CTA now routes through `MainWindow` to open/focus Home dashboard and refresh workstream list.
- Files:
  - `ixplorer/src/widgets/IxosRail.cpp`
  - `ixplorer/src/widgets/IxosRail.h`
  - `ixplorer/src/app/MainWindow.cpp`

## Verification

| Check | Command | Result |
|---|---|---|
| Build | `C:\Qt\Tools\CMake_64\bin\cmake.exe --build ixplorer/build --config Release` (with `C:\Qt\Tools\Ninja` on `PATH`) | PASS |
| Runtime smoke | `Start-Process C:\Users\pablo\Downloads\Ixos\ixplorer\build\Ixplorer.exe -PassThru` + 4s alive check | PASS |

## Before/After Summary

| Area | Before | After |
|---|---|---|
| Session restore Home fallback | Checked only active tab dashboard state; could append extra Home and steal focus | Checks whether any Home tab exists in restored state; adds fallback only when missing |
| Home-tab persistence | Dashboard tabs were not captured in `captureTabState` | Dashboard tabs are serialized as `ixplorer://home` and restored correctly |
| Rail CTA: View Workstreams | Dead button (no action) | Connected to concrete shell action via signal -> MainWindow routing |

## Notes
- This batch intentionally did not implement the lease/stall reliability fix; it is tracked as a separate investigation stream in `CODEX.md` with logging-first requirements.
