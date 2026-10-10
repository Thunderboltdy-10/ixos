# Ixplorer

Native Windows-first file workspace built with C++ and Qt 6 Widgets. The layout stays fixed as:

- top navigation/toolbar
- left sidebar
- center tabbed explorer workspace
- right Ixos search rail
- bottom status strip

This pass turns the shell prototype into a usable local explorer with real Ixos search integration.

## What Works

- Per-tab browse history with `Back`, `Forward`, `Up`, breadcrumbs, and refresh.
- Multi-select file browsing with rename, new folder, delete-to-trash, copy, cut, paste, duplicate, reveal, open with, and properties.
- Capability-based file opening: editable text/code tabs, in-app previews for supported files, and explicit external-open fallback for app-like content.
- A real right rail backed by `ixos search --json --progressive --show-scores --evidence`.
- Live top-bar search that feeds the rail, auto-opens the top in-app candidate into the center pane, and keeps result actions connected to workspace tabs.
- A command palette on `Ctrl+K` for search and primary workspace actions.
- Sidebar recents persistence and a denser, calmer desktop UI treatment.

## Search Boundary

Ixplorer does not link Rust directly. It uses a small Qt-side provider:

- Provider: `ixplorer/src/search/IxosCliSearchProvider.cpp`
- Contract: `target/release/ixos.exe search <query> --dir <path> --json --progressive --show-scores --evidence --context 3 --limit <n> --search-mode <auto|flash|pro>`

This keeps Ixplorer aligned with the existing Ixos search semantics and fallback behavior while keeping the UI native Qt.

## Prerequisites

- Qt 6.10.2 at `C:\Qt\6.10.2\mingw_64`
- CMake at `C:\Qt\Tools\CMake_64\bin`
- Ninja at `C:\Qt\Tools\Ninja`
- MinGW 13.1.0 at `C:\Qt\Tools\mingw1310_64`
- A built Ixos CLI binary at `target\release\ixos.exe`

## Quick Build And Run

```powershell
powershell -ExecutionPolicy Bypass -File ixplorer\build_and_run.ps1
```

Flags:

- `-SkipBuild`: launch only
- `-Deploy`: force `windeployqt`

## Manual Build

```powershell
$env:PATH = "C:\Qt\Tools\mingw1310_64\bin;C:\Qt\Tools\CMake_64\bin;C:\Qt\Tools\Ninja;C:\Qt\6.10.2\mingw_64\bin;" + $env:PATH
$env:CMAKE_PREFIX_PATH = "C:\Qt\6.10.2\mingw_64"
cargo build --release
cd ixplorer
cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build
.\build\Ixplorer.exe
```

## Key Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+T` | New tab |
| `Ctrl+W` | Close tab |
| `F5` | Refresh |
| `Alt+Left` | Back |
| `Alt+Right` | Forward |
| `Alt+Up` | Parent directory |
| `Ctrl+F` | Focus top search |
| `Ctrl+K` | Command palette |
| `F2` | Rename |
| `Delete` | Move to trash |
| `Ctrl+C / Ctrl+X / Ctrl+V` | Copy / cut / paste |
| `Ctrl+D` | Duplicate |
| `Ctrl+Shift+N` | New folder |
| `Alt+Enter` | Properties |

## Validation Notes

Current validation for this pass is:

- `cargo build --release`
- Qt rebuild of `ixplorer/build`
- CLI progressive search contract smoke
- Ixplorer launch/startup smoke

Full manual GUI interaction QA for drag/drop and edge-case clipboard flows is still pending.
