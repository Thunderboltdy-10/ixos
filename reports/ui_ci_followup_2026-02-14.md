# UI/CI Follow-up Validation (2026-02-14)

## Scope
- Verify previous agent changes for landing, desktop UI, and backend bug fixes.
- Close remaining regressions blocking CI/local verification.

## Verified from existing changes
- Deep-search mode re-enable in progressive desktop search:
  - `src-tauri/src/commands/search.rs`
- Legacy cache-mode migration aliases restored:
  - `src/cli/config.rs`
- Release workflow Node runtime aligned to 22:
  - `.github/workflows/release.yml`
- Root lockfile now includes added 3D dependencies used by `ixos-site`:
  - `package-lock.json`

## Additional fixes applied in this pass
- Cache migration behavior tightened:
  - Preserve unknown cache mode values during load (do not silently rewrite to default).
  - Added regression test for unknown-value preservation.
  - File: `src/cli/config.rs`
- Desktop settings polish finish:
  - Unified Privacy/Shortcut panel styling with settings visual system.
  - Added explicit select styling hook (`.ixos-select`) to avoid white dropdown text/background issues.
  - Files:
    - `ui/src/components/settings/PrivacySettings.tsx`
    - `ui/src/components/settings/ShortcutSettings.tsx`
    - `ui/src/components/settings/SearchSettings.tsx`
    - `ui/src/styles/globals.css`
- Workstreams interaction hardening:
  - Prevent blur-save race when clicking rename Save/Cancel actions.
  - Guard and disable `Open Workstream` when no handler is wired.
  - File: `ui/src/components/workstreams/WorkstreamCard.tsx`
- UI TypeScript build reliability:
  - Scoped ambient types in desktop UI tsconfig to avoid workspace-wide implicit `@types/*` bleed.
  - File: `ui/tsconfig.json`

## Validation commands and outcomes

| Command | Result |
|---|---|
| `cargo test test_unknown_cache_mode_is_preserved_on_load -- --nocapture` | PASS |
| `cargo test test_cache_mode_aliases_are_normalized -- --nocapture` | PASS |
| `cargo test -p ixos-app parse_cache_mode_rejects_legacy_aliases -- --nocapture` | PASS |
| `npm ci --prefer-offline --no-audit` | PASS |
| `npm run --workspace ui build` | PASS |
| `cd ixos-site && npm run build` | PASS |

## Notes
- Next.js still warns about multiple lockfiles (`package-lock.json` at root and `ixos-site/package-lock.json`) but build succeeds.
- Vite emits bundle-size warnings for desktop UI (`>500kB`) and mixed dynamic/static import warning for Tauri API; no build failure.
