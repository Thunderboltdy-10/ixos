# Security Hardening and Pro Recommendation Pass (2026-02-10)

## Scope
- Security-first implementation slice:
  - control-plane auth fallback hardening
  - Pro command gating hardening
  - landing strategy lock/perf stabilization
  - Pro move recommendation feature (v1)

## Commands
- `cargo test -q`
- `npm --prefix ui run build`
- `npm --prefix ixos-site run build`
- `python scripts/run_settings_matrix.py`
- `cargo run --quiet --bin ixos -- doctor --json`

## Results
- Rust tests: PASS (`466 passed; 0 failed; 6 ignored`)
- UI build: PASS
- Landing build: PASS
- Settings matrix: PASS (`reports/settings_matrix_2026-02-10.md`)
- Doctor: PASS (`8 pass; 0 warn; 0 fail; 2 info`)

## Implemented Changes
1. `ixos-site/src/lib/controlPlane.ts`
- If a bearer token is present and cannot be verified, request is rejected (`null`) instead of silently falling back to session auth.

2. `src-tauri/src/commands/personal_ranking.rs`
- Added entitlement and capability checks to all personal ranking commands.
- Personal ranking actions now require active Pro status and capability.

3. `ui/src/components/layout/AppShell.tsx`
- Replaced dead `shouldLock = false` path with real lock conditions:
  - plan is Pro
  - status not active/grace
  - status is expired or time-suspect

4. `ixos-site/src/components/sections/HeroPipeline.tsx`
- Low-powered desktop path now keeps pinned flow active with reduced FX.
- Added pin stabilization options (`pinType`, `pinReparent`).
- Reduced-FX mode now prioritizes stage progression over heavy transforms.

5. Pro move recommendation feature
- `src/activity_ledger/mod.rs`
  - added `MoveRecommendation` model
  - added repeated-evidence recommendation algorithm with low one-off weight
  - added unit tests for repetition threshold behavior
- `src-tauri/src/commands/activity.rs`
  - added `get_move_recommendations` command (Pro capability gated)
- `src-tauri/src/lib.rs`
  - registered `get_move_recommendations` command
- `ui/src/lib/types.ts`, `ui/src/lib/tauri.ts`, `ui/src/stores/todayStore.ts`, `ui/src/components/today/TodayTab.tsx`
  - added type/API/state/UI wiring for recommendation display

## Known Follow-ups
- Add explicit user feedback loop (accept/dismiss) for recommendations.
- Add dedicated auth/billing adversarial integration tests.
- Add landing low-end pin-lock regression scenarios to release gate.
