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
