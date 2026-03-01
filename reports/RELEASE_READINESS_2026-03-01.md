# Desktop/UI + Release Readiness Report
Date: 2026-03-01

## Scope
- Restore missing desktop search functionality and UX parity against prior behavior.
- Keep shared desktop surface parity with landing by updating `@ixos/ixos-ui` components.
- Validate release pipeline readiness for tagged GitHub Actions releases.

## Command Evidence
- `npm run build`: PASS
- `cargo build --release`: PASS
- `cargo test`: PASS
- `npm run tauri:build`: PASS

## Key Fixes
| Area | Before | After |
|---|---|---|
| Match score display | Could exceed 100% (raw scores rendered directly) | Scores normalized to confidence ratios and rendered as percentages |
| Result right-column score | Decimal/raw style | Percent style with mode-aware accent |
| Context rendering | ANSI/control-character gibberish and no reliable line context | ANSI/control cleanup + line-numbered context blocks |
| Search result theming | Teal accents regardless of selected mode | Flash/Auto/Pro accents propagated through results/about panel/background field |
| Evidence panel | Narrow, overflow-prone | Wider, structured `About Match` panel with copy-path/copy-context actions |
| Dropdowns (quality/mode) | Misaligned, too translucent, interaction issues | Viewport-anchored, opaque, high-z floating menus |
| Idle search state | Blank when no query/results | Added idle dashboard with recent history + Pro Today/Workstreams snapshot |
| History persistence | Occasional stale/older history after relaunch | Serialized encrypted saves + local mirror fallback |
| Sidebar account row | Full email exposed, `Out` label | Display-name only and `Sign out` |
| Installer icon consistency | Potential drift between app icon and bundle icons | Regenerated Tauri icon set from canonical `ui/src/assets/ixos-icon.png` |
| Local release env validation | Failed unless vars exported manually in shell | Validator now hydrates from `.env/.env.local` in root, `src-tauri`, and `ui` |

## Release Validation Notes
- `npm run tauri:build` now succeeds without manual env export (if `.env.local` files are present and populated).
- Bundles generated on this machine:
  - `target/release/bundle/msi/Ixos_0.1.0_x64_en-US.msi`
  - `target/release/bundle/nsis/Ixos_0.1.0_x64-setup.exe`

## Remaining Warnings (Non-fatal)
- Tauri identifier warning: `com.ixos.app` ends with `.app` (naming hygiene warning).
- Updater metadata warning: `__TAURI_BUNDLE_TYPE` patch missing in binary for MSI/NSIS packages.

## Workflow Readiness Checks
- `.github/workflows/release.yml` includes the required env wiring for CI release builds:
  - `VITE_API_URL`
  - `VITE_CLERK_PUBLISHABLE_KEY`
  - `IXOS_JWT_PUBLIC_KEY`

## Recommended Pre-Tag Follow-up
1. Resolve Tauri identifier suffix warning by moving to a non-`.app` reverse-domain ID.
2. Investigate updater bundler metadata warning before depending on auto-updates for these installers.
3. Run a final manual smoke on macOS and Linux release jobs after these UI changes.
