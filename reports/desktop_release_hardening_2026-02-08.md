# Desktop Release Hardening - 2026-02-08

## Scope
- Production auth/entitlement reliability fixes
- Progressive search event dedupe transport fix
- Pro gating consistency across UI sections
- Overlay behavior + pricing event wiring
- Cache management safety/controls improvements
- Landing hero demo interactivity correction
- Terms route/link consistency

## Commands run
- `npm --prefix ui run build`
- `npm --prefix ixos-site run build`
- `cargo build`
- `cargo test -q`

## Key outputs
- UI build passed (TypeScript + Vite)
- Landing build passed (Next.js)
- Rust build passed
- Rust tests passed: `455 passed; 0 failed; 6 ignored`

## Key implementation points
- `ui/src/lib/api.ts`: production no longer falls back to localhost; uses explicit env or `https://ixos.app`.
- `src-tauri/src/commands/search.rs`: removed global `search-event` fallback emit; Channel is now the progressive transport.
- `ui/src/hooks/useTauriEvent.ts`: legacy global listener disabled by default; opt-in via `VITE_LEGACY_SEARCH_EVENT_BUS=1`.
- `ui/src/lib/proAccess.ts`: centralized Pro-access selector reused by sidebar/account/pricing/today/workstreams/related files.
- `ui/src/components/layout/AppShell.tsx`: added global `open-pricing` listener and outside-click overlay auto-close.
- `src-tauri/src/commands/storage.rs`: improved cache stats backend detection + LMDB-aware clear path; added `clear_all_embedding_cache`.
- `ui/src/components/settings/SearchSettings.tsx`: added `Clear All Cache` action and clearer cache safety messaging.
- `ixos-site/src/components/sections/HeroPipeline.tsx`: hero demo regains pointer interaction in hero stage and remains non-interactive in guided pipeline stage.
- `ixos-site/src/components/sections/Footer.tsx`: legal link now routes to `/terms`.

## Release guardrail
- Added `npm run tauri:build:prod` to enforce required env vars:
  - `VITE_API_URL`
  - `VITE_CLERK_PUBLISHABLE_KEY`
  - `IXOS_JWT_PUBLIC_KEY`

## Pass 2 hardening (entitlement + lifecycle + Firefox parity)

### Additional commands run
- `cargo fmt`
- `cargo clippy --all-targets --quiet`
- `node scripts/verify-desktop-build-env.js`
- `npm audit --audit-level=high --omit=dev`

### Additional implementation points
- `src-tauri/src/commands/search.rs`:
  - Enforced Pro capability/status checks in backend search command.
  - `searchMode=pro` now returns explicit Pro-required errors when unavailable.
  - `searchMode=auto` now degrades to `flash` for non-Pro/non-active entitlement states.
  - Added unit tests for mode resolution behavior.
- `ui/src/lib/proAccess.ts`:
  - Fallback Pro detection now requires token payload `plan == "pro"` (status-only fallback removed).
- `ui/src/components/search/SearchInput.tsx` and `ui/src/components/settings/SearchSettings.tsx`:
  - Non-Pro users are forced to Flash mode in UI config paths.
  - Auto/Pro selections are locked behind Pro entitlement in settings and dropdown UX.
- `ixos-site/src/app/api/desktop/lease/refresh/route.ts` and `ixos-site/src/app/api/desktop/lease/transfer/confirm/route.ts`:
  - Tokens now include `subscriptionEnd` during issuance to keep Pro token expiry bounded to subscription lifecycle.
- `ixos-site/src/components/effects/ArcNoiseBackground.tsx`:
  - Added Gecko/Firefox-specific blend fallback to match Chrome/Edge arc-noise visibility.
- `package.json`:
  - `tauri:build` now enforces required production env vars by default (same guard as `tauri:build:prod`).
- `benches/agent_search_comparison.rs`:
  - Fixed formatting bug blocking bench-target compilation during all-target clippy runs.

### Additional validation outputs
- `cargo clippy --all-targets --quiet`: pass (warnings only).
- `node scripts/verify-desktop-build-env.js`: correctly fails without required vars, confirming guardrail is active.
- `npm audit --audit-level=high --omit=dev`: reports high advisory on `next` (and moderate on `nodemailer`) requiring dependency upgrade planning.

## Pass 3 hardening (runtime entitlement recovery + startup race fix + demo polish)

### Additional commands run
- `cargo fmt --all`
- `cargo test -q`
- `cargo build --release`
- `npm --prefix ui run build`
- `npm --prefix ixos-site run build`
- `cargo clippy --all-targets --quiet`
- `node scripts/verify-desktop-build-env.js`

### Additional implementation points
- `src-tauri/src/commands/auth.rs`, `src-tauri/src/lib.rs`:
  - Added `set_entitlement_public_key` command to install JWT verification key at runtime after format/parse validation.
- `ixos-site/src/app/api/desktop/entitlement-key/route.ts`:
  - Added authenticated endpoint to return current entitlement verification public key.
- `ui/src/components/auth/AuthGate.tsx`:
  - Desktop auth bootstrap now syncs public key from control-plane and retries backend token set when key-missing errors occur.
  - Refresh/transfer token paths now use the same resilient backend token apply flow.
- `ui/src/components/settings/SearchSettings.tsx`, `ui/src/components/settings/AccountSettings.tsx`:
  - Entitlement refresh now executes real refresh/token sync instead of page reload.
  - Manual/poll refresh now re-applies token to Rust backend.
- `ui/src/components/search/SearchInput.tsx`, `ui/src/components/settings/SearchSettings.tsx`:
  - Removed startup auto-downgrade mutation to Flash that was resetting saved mode before entitlement status finished loading.
- `ui/src/stores/searchStore.ts`:
  - Added pre-search backend token sync attempt.
  - Improved auth error translations to distinguish missing token, device-transfer, and missing-key cases.
- `src-tauri/src/commands/search.rs`:
  - Emits immediate pre-index stream/status signals for faster visible feedback.
  - Skips eager semantic indexing for low-latency Flash/Auto non-Ask flows.
- `ixos-site/src/components/hero/IxosDemoWindow.tsx`, `ixos-site/src/components/hero/fakeSearch.ts`:
  - Fixed controlled->hero transition pause reset.
  - Added fallback result streaming when semantic thresholds produce sparse matches.
- `ixos-site/src/components/effects/ArcNoiseBackground.tsx`:
  - Strengthened Firefox fallback visibility with additional Gecko-safe texture layer.

### Additional validation outputs
- `cargo test -q`: PASS (`455 passed; 0 failed; 6 ignored`).
- `cargo build --release`: PASS.
- `npm --prefix ui run build`: PASS.
- `npm --prefix ixos-site run build`: PASS (routes include `/api/desktop/entitlement-key` and `/terms`).
- `cargo clippy --all-targets --quiet`: PASS (warnings only).
- `node scripts/verify-desktop-build-env.js`: FAIL without required vars in local shell (expected safeguard behavior).

## Pass 4 hardening (flash fallback + startup status race + smoke matrix)

### Additional commands run
- `cargo test -p ixos-app`
- `cargo test`
- `cargo build -p ixos-app --release`
- `python scripts/validate_registry.py`
- `python scripts/generate_capability_matrix.py`
- `python scripts/run_contract.py`
- `python scripts/run_perf_budget_stub.py`
- `python scripts/run_golden.py`
- `npm run tauri:build:prod`

### Additional implementation points
- `src-tauri/src/commands/search.rs`:
  - Missing backend entitlement token now falls back to Flash/Auto->Flash instead of blocking all search.
  - Pro mode remains hard-blocked without valid entitlement token/capability.
- `ui/src/components/auth/AuthGate.tsx`:
  - Invalid cached tokens are now purged when backend validation fails.
  - Pro status polling is gated on token presence and re-syncs token before status checks.
- `ui/src/lib/proAccess.ts`:
  - Active server lease is treated as authoritative for UI gating (except `timeSuspect` lock).
- `scripts/run_golden.py`:
  - Added Windows path normalization for `\\?\` / `//?/` prefixes to remove path-format false negatives.
- UI polish:
  - Dropdown overlays raised above suggestion layer and resized for readability.
  - Sidebar/account/settings button sizing normalized.
  - Firefox arc-noise overlay path unified and layered above particles.

### Additional validation outputs
- `cargo test -p ixos-app`: PASS (`17 passed; 0 failed`).
- `cargo test`: PASS (`455 passed; 0 failed; 6 ignored`).
- `cargo build -p ixos-app --release`: PASS.
- `python scripts/validate_registry.py`: PASS.
- `python scripts/generate_capability_matrix.py`: PASS.
- `python scripts/run_contract.py`: PASS.
- `python scripts/run_perf_budget_stub.py`: PASS.
- `python scripts/run_golden.py`: FAIL (remaining true retrieval mismatches only; see `reports/release_smoke_matrix_2026-02-08.md`).
- `npm run tauri:build:prod`: FAIL in local shell due missing required env vars (expected guardrail behavior).

## Pass 5 hardening (logo/icon replacement + Firefox intensity tuning + release verify stability)

### Additional commands run
- `cargo test`
- `cargo test -p ixos-app`
- `cargo build --release`
- `cargo fmt --all -- --check`
- `python scripts/run_golden.py`
- `npm run build`
- `cd ixos-site; npm run build`
- `npm run tauri:build` (with required env vars exported in local shell)
- `npx tauri icon logo-app-master.png -o src-tauri/icons`

### Additional implementation points
- `src-tauri/src/commands/auth.rs`:
  - Removed sticky JWT decoding-key `OnceLock` behavior and now parses current env key on each verification call, allowing runtime key refresh to take effect reliably.
- `ui/src/components/auth/AuthGate.tsx`:
  - Expanded retry conditions for backend token sync to include signature/issuer mismatch errors (not just missing-key parse errors).
- `ixos-site/src/components/effects/ArcNoiseBackground.tsx`:
  - Reduced Firefox-specific opacity to better match Chrome/Edge baseline strength.
- `ixos-site/src/components/sections/HeroPipeline.tsx`:
  - Delayed scroll-guided lock-in threshold so hero loop remains autonomous until deeper pipeline progression, reducing frozen behavior when returning upward.
- `ui/src/components/search/{QualitySwitcher,ModeSwitcher,AskModeSwitcher}.tsx`:
  - Narrowed dropdown width and slightly increased row height for denser, clearer one-line option readability.
- Full icon/logo replacement:
  - Regenerated all Tauri bundle icons from root `Logo.png` with high-coverage crop/scale.
  - Updated `ui/src/assets/ixos-icon.png`, `ixos-site/public/assets/icon.png`, `ixos-site/public/assets/logo-v2.png`, `ixos-site/public/assets/logo-v3.png`, and `ixos-site/src/app/favicon.ico`.
  - Updated landing logo references and metadata icons to use `logo-v3.png`.

### Additional validation outputs
- `cargo test`: PASS (`455 passed; 0 failed; 6 ignored`).
- `cargo test -p ixos-app`: PASS (`17 passed; 0 failed`).
- `cargo build --release`: PASS.
- `cargo fmt --all -- --check`: PASS.
- `python scripts/run_golden.py`: PASS.
- `npm run build`: PASS (`ui` production build).
- `cd ixos-site; npm run build`: PASS.
- `npm run tauri:build` (with env set): PASS; produced:
  - `target/release/bundle/msi/Ixos_0.1.0_x64_en-US.msi`
  - `target/release/bundle/nsis/Ixos_0.1.0_x64-setup.exe`
