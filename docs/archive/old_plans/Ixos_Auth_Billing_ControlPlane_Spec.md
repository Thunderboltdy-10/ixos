# Ixos Control Plane (Auth + Billing + Device Leases) — Implementation Spec

_Last updated: 2026-01-24 (Europe/Madrid)._

This spec is written for an AI coding agent to implement **Clerk auth + Lemon Squeezy billing + Neon Postgres storage + Resend email** for Ixos, while keeping the product **local-first** (no user files/queries/embeddings uploaded).

## 0) Project reality check

- **Download is free.**
- **Using the desktop app (searching) requires an account** (Free tier allowed).
- **Upgrading to Pro should be possible from inside the desktop app** without opening an external browser: open an **in-app window** that renders the same pricing UI as the website.
- Website source of truth for UI style is **`ixos-site/`** (NOT `landing/`).
- The old `landing/` Next.js project contains API/webhook code that exists but is incorrectly wired. The agent must **salvage server logic** from `landing/` and migrate it into the correct place, without inheriting the old UI.

## 1) Goals

### Must-have

1. **Clerk identity**
   - Signup/login on the website is optional (nice-to-have).
   - Signup/login is mandatory in the desktop app before search is usable.

2. **Lemon Squeezy billing**
   - Website: “Buy Pro” available.
   - Desktop: clicking the upgrade banner opens the same pricing UI as `ixos-site/`.
   - Purchase completion updates entitlement within seconds (webhook → DB → entitlement refresh).

3. **Neon Postgres storage (support/debug + device leases)**
   - Store webhook events + processed state.
   - Store subscription status/plan.
   - Store device registrations and enforce **1 active device lease at a time**.

4. **Device switching workflow**
   - A user can switch devices.
   - Prevent two devices using Pro concurrently.
   - Transfer requires confirmation (email) + rate limits.

5. **Resend emails**
   - Send **device-transfer approval** emails.
   - Optionally send “New login / new device” and “Purchase confirmed” emails.
   - (Receipts can remain Lemon-managed.)

### Non-goals (for this phase)

- Do not build/ship actual Pro-only features yet.
- Do not implement model encryption/DRM yet.
- Do not change Ixos search engine behavior.

## 2) Repo layout assumptions (agent must verify)

- `ixos-site/` — Next.js website (canonical UI, Tailwind theme, marketing + pricing)
- `landing/` — old Next.js site (contains API/webhooks but incorrectly placed/wired)
- Desktop app is a Tauri v2 project with:
  - Rust backend in `src/` + `src-tauri/`
  - React/Vite frontend in `ui/`

The agent must:
- inspect repo and confirm actual paths
- avoid breaking existing build/test flows

## 3) Target architecture

### 3.1 The “control plane”

The website hosts a small backend that handles:
- payment webhooks
- entitlement computation
- device leases + transfer
- issuing signed entitlement tokens to the desktop app

**All user search operations remain local.**

### 3.2 Where server code should live

Prefer: implement backend endpoints in `ixos-site/` as Next.js route handlers:

- `ixos-site/src/app/api/...` (App Router)

Rationale: simplest deployment (Vercel) and keeps auth/billing endpoints close to pricing UI.

If the agent discovers constraints that require a separate API service, it may propose one, but should default to Next.js route handlers.

### 3.3 Desktop ↔ Control plane connection

- Desktop app uses Clerk to authenticate.
- Desktop app calls control-plane endpoints with Clerk identity.
- Control plane issues a **signed entitlement token** bound to the device.
- Desktop app shows tier label (“Free” / “Pro”) and exposes upgrade CTA.

## 4) Identity & auth requirements

### 4.1 Website

- Keep website signup/login optional.
- If present, it must match `ixos-site/` visual system.

### 4.2 Desktop app (mandatory)

- Before the search UI loads, show a login/signup screen.
- After login, show:
  - account email
  - plan badge (Free/Pro)
  - “Upgrade to Pro” banner (if Free)

### 4.3 Practical implementation path

Option A (preferred if feasible): use **Clerk React** inside `ui/`.
- Add `<ClerkProvider>` to desktop UI.
- Use Clerk’s prebuilt components (`<SignIn/>`, `<SignUp/>`) or custom UI.

Option B: open a dedicated in-app window that loads `ixos-site` /auth routes.
- App receives callback via deep link.

Agent should pick the option that works best with existing code.

## 5) Billing and entitlement model

### 5.1 Source of truth

- Lemon Squeezy is billing source of truth.
- Neon stores a derived view for fast entitlement checks and debugging.

### 5.2 Entitlements

- Free tier: can use app and search.
- Pro tier: reflected in UI; feature flags later.

### 5.3 1 active device lease

- Users may register multiple devices.
- Only **one device** may hold the active Pro lease at a time.

## 6) Database schema (Neon Postgres)

Use Prisma or Drizzle (agent chooses). Minimum tables:

### `users`
- `id` (uuid)
- `clerk_user_id` (unique)
- `email`
- timestamps

### `subscriptions`
- `id` (uuid)
- `user_id` (fk)
- `lemon_customer_id`
- `lemon_subscription_id` (unique)
- `status` (active, trialing, past_due, cancelled, expired)
- `plan` (free, pro, team_future)
- `current_period_end` (nullable)
- timestamps

### `devices`
- `id` (uuid)
- `user_id` (fk)
- `device_id` (unique, generated in app)
- `device_label` (OS + name)
- `device_public_key` (optional now; required if PoP is implemented)
- `last_seen_at`
- timestamps

### `leases`
- `id` (uuid)
- `user_id` (fk)
- `device_id` (fk)
- `status` (active, revoked, expired)
- `issued_at`
- `expires_at`
- `revoked_at`

### `webhook_events`
- `id` (uuid)
- `provider` (lemonsqueezy)
- `event_name`
- `raw_body` (text/json)
- `signature_valid` (bool)
- `processed_at` (nullable)
- `processing_error` (nullable)

### `email_events` (optional)
- `id`
- `to`
- `template`
- `provider_message_id`
- `status`
- timestamps

## 7) API surface (control plane endpoints)

All endpoints must be stable and callable by the desktop app.

### 7.1 Webhooks

- `POST /api/webhooks/lemonsqueezy`
  - Verify signature.
  - Store raw event.
  - Upsert subscription state.
  - Trigger entitlement recompute.

### 7.2 Desktop session/entitlement

- `POST /api/desktop/register-device`
  - Auth: Clerk
  - Body: `{ deviceId, deviceLabel, devicePublicKey? }`
  - Upsert device; update last_seen.

- `GET /api/desktop/entitlement`
  - Auth: Clerk
  - Query: `deviceId`
  - Returns: `{ plan, features, lease: { status, expiresAt }, ui: { showUpgrade: boolean } }`

- `POST /api/desktop/lease/claim`
  - Auth: Clerk
  - Body: `{ deviceId }`
  - If no active lease: issue lease and return token.
  - If active lease on another device: return conflict with that device label and a `transferToken`.

- `POST /api/desktop/lease/transfer/request`
  - Auth: Clerk
  - Body: `{ deviceId }`
  - Create a transfer request.
  - Send approval email via Resend.

- `POST /api/desktop/lease/transfer/approve`
  - Auth: signed link token OR Clerk + token
  - Approves transfer: revoke old lease, issue new.

- `POST /api/desktop/lease/refresh`
  - Auth: Clerk
  - Body: `{ deviceId }`
  - Returns a fresh signed entitlement token with updated `exp`.

### 7.3 Token signing

- Use server-side signing key (env secret).
- Token payload must include:
  - `clerk_user_id`
  - `device_id`
  - `plan`
  - `features[]` (empty/placeholder ok)
  - `exp`

Desktop verifies signature locally.

## 8) Desktop UI requirements

### 8.1 Gating

- If user is not authenticated: show auth screen.
- Only after auth: show search UI.

### 8.2 Account badge

- Sidebar (or top area): show user email + plan badge.

### 8.3 Upgrade banner

- In sidebar: “Upgrade to Pro” banner.
- Clicking opens an **in-app modal/window**.

### 8.4 Pricing UI reuse

- The pricing UI should use the **exact components/visual system from `ixos-site/`**.

Preferred implementation:
- Create a shared package (e.g., `packages/ui`) that exports:
  - Tailwind tokens/preset
  - Pricing section components
  - Basic layout primitives

Then:
- `ixos-site/` imports pricing components from `packages/ui`
- Desktop `ui/` imports the same pricing components from `packages/ui`

If monorepo refactor is too risky, the agent may copy the pricing components into desktop, but must keep style parity.

## 9) Checkout UX (inside the app)

- Clicking “Pro” starts Lemon checkout.
- Do not open external browser.
- Open a Tauri window that loads:
  - either a Lemon hosted checkout URL
  - or an `ixos-site` route that embeds/redirects to Lemon

After purchase:
- webhook updates DB
- desktop polls/refreshes entitlement and updates UI badge to Pro

## 10) Email workflows (Resend)

- Device transfer approval email:
  - “Approve transfer to DEVICE_NAME”
  - one-click approve link
  - include “If not you, revoke all devices” link

Optional emails:
- Purchase confirmation (non-receipt)
- New device login notification

## 11) Rate limits / anti-sharing controls

- Only 1 active Pro lease.
- Transfer cooldown: 12–24 hours.
- Transfer burst limit: e.g. 5 per month.
- Always email notify on transfer.

## 12) Implementation sequence

1. **Audit** existing `landing/` webhook/API code; map what’s salvageable.
2. Implement Neon schema + ORM.
3. Implement Lemon webhook verification + subscription upsert.
4. Implement Clerk auth verification for API routes.
5. Implement device register + lease claim/refresh.
6. Implement desktop UI gating + plan badge.
7. Implement in-app upgrade flow with pricing UI parity.
8. Implement transfer request/approve emails.
9. Add minimal tests + logs + admin debugging notes.

## 13) Testing and acceptance

### Acceptance checklist

- Desktop app cannot search unless authenticated.
- Free user sees “Free” badge and upgrade banner.
- After purchase, badge flips to “Pro” without reinstall.
- Logging in on second device triggers transfer workflow.
- Transfer email approval moves Pro lease to new device.
- Webhook events are stored and visible for debugging.

### Tests

- Unit tests: webhook signature verification, entitlement computation.
- Integration tests: subscription status changes update entitlements.
- Desktop E2E smoke test: login → shows Free/Pro badge.

## 14) UI parity constraint

Any new pages/components created for auth/pricing inside `ixos-site/` or desktop must match the **Ixos UI Unification Spec** and the canonical look of `ixos-site/`.

