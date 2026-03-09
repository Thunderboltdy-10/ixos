# Ixplorer

Native file explorer/workspace built with C++ and Qt 6 Widgets. Dark-themed three-column layout: sidebar, tabbed file browser, and Ixos detail rail.

## Prerequisites

- **Qt 6.10.2** — installed at `C:\Qt\6.10.2\mingw_64`
- **CMake** — at `C:\Qt\Tools\CMake_64\bin`
- **Ninja** — at `C:\Qt\Tools\Ninja`
- **MinGW 13.1.0** — at `C:\Qt\Tools\mingw1310_64`

## Quick Build & Run (one command)

```powershell
powershell -ExecutionPolicy Bypass -File ixplorer\build_and_run.ps1
```

Flags:
- `-SkipBuild` — just launch, skip rebuild
- `-Deploy` — run `windeployqt` to copy all Qt DLLs (first time only)

The script sets PATH, CMAKE_PREFIX_PATH, builds, and runs — no manual env setup needed.

> **Note:** CMake is configured to auto-run `windeployqt` as a post-build step, so Qt DLLs are always copied next to the exe.

## Manual Build (if needed)

```powershell
$env:PATH = "C:\Qt\Tools\mingw1310_64\bin;C:\Qt\Tools\CMake_64\bin;C:\Qt\Tools\Ninja;C:\Qt\6.10.2\mingw_64\bin;" + $env:PATH
$env:CMAKE_PREFIX_PATH = "C:\Qt\6.10.2\mingw_64"
cd ixplorer
cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build
.\build\Ixplorer.exe
```

## Qt Creator

Open `ixplorer/CMakeLists.txt` → select MinGW 64-bit kit → Build → Run.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+T | New tab |
| Ctrl+W | Close tab |
| F5 | Refresh |
| Alt+Left | Back |
| Alt+Right | Forward |
| Alt+Up | Parent directory |
