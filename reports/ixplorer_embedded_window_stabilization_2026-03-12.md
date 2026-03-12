# Ixplorer Embedded Window Stabilization Pass (2026-03-12)

## Scope
- Stabilize hosted associated-app embedding inside document panes.
- Ensure explicit file open creates/activates a pane tab rather than preview replacement.
- Enable drag reorder from top tab navigation while keeping embedded surface non-draggable.
- Restore reliable file-open policy behavior across extensions.

## Changed Files
- `ixplorer/src/widgets/DocumentPane.h`
- `ixplorer/src/widgets/DocumentPane.cpp`
- `ixplorer/src/utils/FileOpenPolicy.cpp`
- `ixplorer/src/widgets/TabWorkspace.h`
- `ixplorer/src/widgets/TabWorkspace.cpp`
- `ixplorer/src/app/MainWindow.cpp`

## Command Evidence
- Attempted build:
  - Command: `cmake --build build --config Release` (cwd: `ixplorer/`)
  - Result: failed in this execution environment (`cmake` not found on PATH).

## Key Behaviors Implemented
- Pane-hosted window ownership tracking prevents one external HWND from being embedded into multiple panes.
- Fresh window requirement for host capture avoids stealing already-open windows.
- VS Code-family launches now request dedicated windows (`--new-window`) to avoid grouping inside a single host.
- Heartbeat now enforces child-parent pinning and non-client style stripping continuously.
- Host teardown restores parent/style and closes handles safely to avoid persistent on-screen artifacts.
- Added host-frame wrapper with rounded border and shell-to-editor gradient/fade blending.
- File-open policy no longer force-embeds all extensions; now routes by type (in-app stable viewers, embedded associated app for code/text, external denylist for unsafe/system types).
- Tab bar is now draggable with backing pane reorder support.
- Explicit open actions now use full tab creation/activation path (`addTab`) instead of preview replacement.

## Manual Verification Checklist
1. Open a `.rs`/`.ts` file twice from search and explorer; each should open as a stable pane tab without window stealing.
2. Open two code files that default to VS Code; verify no ghost outlines persist after switching tabs.
3. Close and reopen a hosted pane; verify no cross-app overlay artifacts appear on desktop.
4. Drag tabs in top bar; verify pane content order follows tab order.
5. Open image/video/pdf files and confirm in-app viewers remain stable.
6. Open external-only formats (e.g., `.exe`, `.zip`); verify they open externally with no host crash.

## Follow-up Pass (2026-03-12, T2)
- Pivoted to fallback-first pane strategy for common formats to avoid dead “associated app not embedded” tabs.
- Fixed Today section visibility wiring bug in sidebar (`setTodayPacket` no longer force-hides content).
- Ensured startup opens a Home pane when restored active tab is not Home.
- Added sidebar section-body transparency/parent cleanup to reduce Home/Favorites background artifacts.
- Added optional Qt PDF path (`QPdfView` + `QPdfDocument`) guarded by `QT_PDF_LIB`.
- Added Home dashboard signal bridge (workstream/search) through `TabWorkspace` to `MainWindow`.

## Update: Hosted-App-First Correction (2026-03-12T3)

### What changed
- Reverted fallback-heavy file routing and restored associated-app hosting as default for regular files.
- Added app-specific launch argument handling for VS Code/Office/browser defaults.
- Added hosted process ownership tracking to prevent closing/reaping non-owned app windows.
- Reduced capture flash and tightened candidate matching/claiming to limit wrong-window embedding.
- Reframed rail/sidebar resume/recovery copy and neutralized amber-heavy emphasis.

### Verification status
- Local compile/test remains blocked in this shell because `cmake` is not available on PATH.
- Manual runtime validation is still required on the user machine for Office/PDF/reopen scenarios.

## Update: Host Loop Retune (2026-03-12T4b)
- Added hide-first candidate suppression in the host loop to reduce pre-embed plain-sight window flashes.
- Reduced style mutation pressure and moved to minimal WS_POPUP->WS_CHILD adaptation plus continuous geometry enforcement (`MoveWindow + RedrawWindow`).
- Removed association-command expansion fallback from launch path to avoid DDE/command-template file-open failures.
- Open policy now attempts UWP-hosted defaults too (removed `applicationframehost.exe` from hard denylist).
