# Ixplorer Native Hosting + Search Pivot (2026-03-10)

## Goal
- Replace faux in-app previews/editors with exact associated-app hosting inside the workspace where possible.
- Default Ixplorer search to cached mode and make result browsing reuse one center-pane surface.
- Tighten the touched UI so the toolbar, rail, and host surface feel deliberate instead of demo-like.

## Commands
- `cargo build --release`
- `$env:PATH='C:\Qt\Tools\Ninja;' + $env:PATH; & 'C:\Qt\Tools\Ninja\ninja.exe' -C ixplorer/build`
- `.\target\release\ixos.exe search 'research' --dir '.\ixplorer\src' --json --progressive --show-scores --evidence --context 1 --limit 3 --search-mode auto --cache-mode native-cache`
- PowerShell startup smoke:
  - `Start-Process C:\Users\pablo\Downloads\Ixos\ixplorer\build\Ixplorer.exe -PassThru`
  - wait 4s, assert process still running, then stop it

## Before / After
| Area | Before | After |
| --- | --- | --- |
| Document surface | Custom Qt preview/editor UI for text/images; Office/PDF stayed external | Ixplorer now attempts to host the exact Windows-associated app window directly inside the center pane |
| File-open policy | Narrow in-app allowlist with faux rendering | Broad associated-app hosting with denylist fallback for unsafe/app-like associations |
| Search cache default | Qt boundary did not force cached mode | Ixplorer search now calls Ixos with `--cache-mode native-cache` by default |
| Result browsing | Auto-open top result and explicit open could diverge into different tabs | Result selection/open reuses the same center preview surface by default; explicit new-tab remains separate |
| Toolbar/rail feel | Similar-looking controls and heavy result detail | Differentiated button treatment, hidden non-applicable view-mode control, and lighter focused-result detail |

## Validation
- `cargo build --release`: PASS
- `C:\Qt\Tools\Ninja\ninja.exe -C ixplorer/build`: PASS
- CLI boundary search with `--cache-mode native-cache`: PASS
- `Ixplorer.exe` startup smoke after 4 seconds: PASS

## Notes
- The host path is Windows-first and depends on whether the associated app exposes a stable top-level window that can be reparented.
- Browsers, terminals, installers, launchers, and similar app-like associations stay external by policy.
- Full interactive GUI QA for Word/PowerPoint/PDF/Photos-hosting still needs manual verification.
