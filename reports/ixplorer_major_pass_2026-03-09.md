# Ixplorer Major Implementation Pass
Date: 2026-03-09

## Scope
- Turn the Qt-based Ixplorer scaffold into a usable Windows-first file workspace.
- Replace the right-rail search stub with real Ixos search backed by the Rust core.
- Tighten the browse -> search -> inspect flow so search results can drive the center workspace naturally.

## Integration Boundary
- Boundary chosen: native Qt UI + local `ixos` child process.
- Contract used:
  - `ixos search <query> --dir <path> --json --progressive --show-scores --evidence --context 3 --limit <n> --search-mode <auto|flash|pro>`
- Reason:
  - Existing repo surface already streams lexical and semantic JSON events with evidence.
  - Preserves current Ixos search semantics and fallback behavior without adding a second Rust API.

## Main Changes
| Area | Before | After |
|---|---|---|
| Top toolbar search | Placeholder field / weak coupling | Primary Ixos folder search entry with explicit mode selector, search CTA, and shortcuts |
| Right rail | Always-open placeholder widgets | Default-closed, toggleable Ixos panel with real search state, richer result cards, and closer-to-desktop match detail |
| Center workspace | Basic browse shell with global toolbar history | Per-tab navigation history, folder filtering, view-mode toggle, better selection/status sync |
| File operations | Rename/new folder/delete only | Copy, cut, paste, duplicate, open-with, reveal, properties, copy-name/path, and new text document |
| Search -> workspace flow | None | Toolbar search opens the rail; clicking a result can locate it in-place, open it, or open a new tab |
| Status/toolbar coherence | Loose sync | Toolbar nav reflects current tab state; status bar shows item count, selection, and live status text |

## Validation
- `cargo build --release`
  - PASS
- `.\target\release\ixos.exe search MainWindow --dir .\ixplorer\src --json --progressive --show-scores --evidence --context 3 --limit 5 --search-mode auto`
  - PASS
  - Verified streamed lexical lines, semantic lines, evidence payloads, and terminal `complete` event.
- `C:\Qt\Tools\CMake_64\bin\cmake.exe --build C:\Users\pablo\Downloads\Ixos\ixplorer\build`
  - PASS
- Ixplorer startup smoke
  - PASS
  - App launched and remained alive for 4 seconds before intentional stop.

## Known Gaps
- GUI interaction coverage is still manual/smoke-level; no automated Qt test coverage was added in this pass.
- Some edge behaviors still need direct manual QA:
  - drag/drop move semantics across folders/drives
  - cut/paste into same directory
  - open-with behavior on non-Windows platforms
  - deep long-path and permissions edge cases
- Search packaging still assumes a locally resolvable `ixos` binary (`target/release`, `target/debug`, app-adjacent, or PATH).
