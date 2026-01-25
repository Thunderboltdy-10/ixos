# Ixos Control Plane Implementation Plan

## Overview

Implement Auth + Billing + Device Leases for Ixos Protocol, integrating Clerk authentication, Lemon Squeezy payments, Neon Postgres storage, and Resend emails across both the website (`ixos-site/`) and desktop app (`ui/` + `src-tauri/`).

**Primary Objective**: Create a robust entitlement system that prevents casual account sharing while allowing legitimate device switching with 1 active Pro lease at a time.

---

## Phase 1: Database & Schema Migration

### 1.1 Create Database Infrastructure in ixos-site/

**Files to create:**
- `ixos-site/src/lib/db/index.ts` - Neon serverless client (migrate from `landing/lib/db/index.ts`)
- `ixos-site/src/lib/db/schema.ts` - Extended Drizzle schema
- `ixos-site/drizzle.config.ts` - Drizzle kit configuration

**Schema tables (extend existing from landing/):**

```
users           - Synced from Clerk (existing)
subscriptions   - Lemon Squeezy subscription state (NEW)
devices         - Registered devices per user (NEW)
leases          - Pro device lease tracking (NEW)
lease_transfers - Transfer request tracking (NEW)
webhook_events  - Audit log for all webhooks (NEW)
```

**Key schema design:**
- `subscriptions.plan` = 'free' | 'pro' (not license keys)
- `devices.device_id` = SHA-256 hash from client-side machine fingerprint
- `leases` tracks 1 active Pro lease per user, with 7-day expiry
- `lease_transfers` manages email-confirmed device switches

### 1.2 Dependencies to Add

```bash
# ixos-site/
npm install @clerk/nextjs @neondatabase/serverless drizzle-orm jose resend svix zod
npm install -D drizzle-kit
```

---

## Phase 2: Webhook Endpoints

### 2.1 Lemon Squeezy Webhook

**File:** `ixos-site/src/app/api/webhooks/lemonsqueezy/route.ts`

Migrate from: `landing/app/api/webhooks/lemonsqueezy/route.ts` (162 lines)

**Modifications needed:**
1. Change from `purchases` + `licenseKeys` model → `subscriptions` model
2. Add raw event logging to `webhook_events` table
3. Handle events: `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_payment_failed`, `order_refunded`
4. Upsert subscription status rather than create license keys

**Signature verification** (keep existing HMAC-SHA256 + timing-safe comparison):
```typescript
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}
```

### 2.2 Clerk Webhook

**File:** `ixos-site/src/app/api/webhooks/clerk/route.ts`

Migrate from: `landing/app/api/webhooks/clerk/route.ts` (83 lines)

**Keep as-is:** Svix signature verification, user CRUD sync to `users` table

---

## Phase 3: Desktop API Endpoints (Clerk-Protected)

### 3.1 Device Registration

**File:** `ixos-site/src/app/api/desktop/register-device/route.ts`

```
POST /api/desktop/register-device
Auth: Clerk token required
Body: { deviceId: string, deviceLabel: string }
Response: { success: true, device: {...} }
```

### 3.2 Entitlement Check

**File:** `ixos-site/src/app/api/desktop/entitlement/route.ts`

```
GET /api/desktop/entitlement?deviceId=xxx
Auth: Clerk token required
Response: {
  plan: 'free' | 'pro',
  features: [],
  lease: { status: 'active' | 'none', expiresAt?: string },
  ui: { showUpgrade: boolean }
}
```

### 3.3 Lease Management

**Files:**
- `ixos-site/src/app/api/desktop/lease/claim/route.ts`
- `ixos-site/src/app/api/desktop/lease/refresh/route.ts`
- `ixos-site/src/app/api/desktop/lease/transfer/request/route.ts`
- `ixos-site/src/app/api/desktop/lease/transfer/approve/route.ts`

**Lease claim flow:**
1. Check if user has active Pro subscription
2. Check if lease exists on another device
3. If no conflict → issue new lease + signed JWT token
4. If conflict → return device info + transferToken for email confirmation

**Transfer flow:**
1. `/transfer/request` creates `lease_transfers` record + sends Resend email
2. Email contains one-click approve link with token
3. `/transfer/approve` revokes old lease, issues new lease

### 3.4 JWT Token Design

**Signing:** ES256 (ECDSA P-256) with server private key in `IXOS_JWT_PRIVATE_KEY` env var

**Payload:**
```json
{
  "sub": "clerk_user_id",
  "did": "device_id_hash",
  "plan": "free|pro",
  "features": [],
  "iat": 1234567890,
  "exp": 1235172690,  // 7 days
  "iss": "ixos-control-plane"
}
```

---

## Phase 4: Desktop Auth Integration

### 4.1 Add Clerk React to Desktop

**File:** `ui/package.json` - Add `@clerk/clerk-react`

**File:** `ui/src/providers/ClerkProvider.tsx` - ClerkProvider wrapper

**File:** `ui/.env` - Add `VITE_CLERK_PUBLISHABLE_KEY`

### 4.2 Auth Gate Component

**File:** `ui/src/components/auth/AuthGate.tsx`

Wraps entire app, shows SignIn/SignUp before search UI loads:
```tsx
export function AuthGate({ children }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <LoadingScreen />;
  if (!isSignedIn) return <AuthScreen />;  // Custom styled SignIn
  return children;
}
```

### 4.3 Modify App.tsx Entry Point

**File:** `ui/src/App.tsx` (lines 124-134)

Wrap AppShell with ClerkProvider + AuthGate:
```tsx
return (
  <ClerkProvider>
    <AuthGate>
      <AppShell>
        <MainSearchView />
      </AppShell>
    </AuthGate>
  </ClerkProvider>
);
```

### 4.4 Auth Store (Zustand)

**File:** `ui/src/stores/authStore.ts`

State:
- `user: { email, id } | null`
- `entitlement: { plan, features, lease } | null`
- `isLoading: boolean`
- `error: string | null`

Actions:
- `fetchEntitlement()` - GET /api/desktop/entitlement
- `claimLease()` - POST /api/desktop/lease/claim
- `refreshLease()` - POST /api/desktop/lease/refresh
- `requestTransfer()` - POST /api/desktop/lease/transfer/request

---

## Phase 5: Desktop UI Components

### 5.1 Account Badge + Plan Badge

**Modify:** `ui/src/components/layout/Sidebar.tsx` (line 66-88)

Add below brand header:
```tsx
{/* Account section */}
<div className="px-3 py-2 border-b border-stroke-hairline">
  <div className="flex items-center gap-2">
    <UserAvatar email={user.email} size="sm" />
    <div className="flex-1 min-w-0">
      <p className="text-xs text-fg-muted truncate">{user.email}</p>
    </div>
    <PlanBadge plan={entitlement.plan} />
  </div>
</div>
```

### 5.2 Upgrade Banner

**File:** `ui/src/components/account/UpgradeBanner.tsx`

**Insert in:** `Sidebar.tsx` above stats footer (line 265)

Shows only when `plan === 'free'`:
```tsx
{entitlement.plan === 'free' && (
  <UpgradeBanner onClick={openPricingModal} />
)}
```

### 5.3 Pricing Modal / In-App Checkout

**File:** `ui/src/components/account/PricingModal.tsx`

**Approach:** Open Tauri WebView window that loads Lemon Squeezy checkout URL

```rust
// In src-tauri/src/commands/auth.rs
#[tauri::command]
pub async fn open_checkout(variant_id: String, user_id: String) -> Result<(), String> {
  // Build Lemon checkout URL with prefilled email + custom_data
  // Open new Tauri window with that URL
}
```

### 5.4 Account Settings Tab

**File:** `ui/src/components/settings/AccountSettings.tsx`

Add to SettingsPanel tabs:
- User email
- Current plan badge
- Subscription status
- Registered devices list
- "Manage Subscription" link (Lemon customer portal)

---

## Phase 6: Rust Backend Token Verification

### 6.1 Add JWT Verification to Tauri

**File:** `src-tauri/Cargo.toml` - Add `jsonwebtoken = "9"`

**File:** `src-tauri/src/commands/auth.rs`

```rust
#[tauri::command]
pub async fn verify_entitlement_token(token: String) -> Result<Entitlement, String>;

#[tauri::command]
pub async fn get_device_id() -> Result<String, String>;

#[tauri::command]
pub async fn check_search_allowed(state: State<AppState>) -> Result<bool, String>;
```

### 6.2 Search Gate Enforcement

**Modify:** `src-tauri/src/commands/search.rs`

Add at start of `search_progressive`:
```rust
// Verify entitlement token before allowing search
let token = state.get_entitlement_token()?;
if token.is_none() || !verify_token(&token.unwrap())? {
    return Err("Authentication required".into());
}
```

### 6.3 Token Storage

Store JWT in encrypted local storage (existing `storage.rs` infrastructure):
- `write_encrypted_file("auth_token", token_bytes)`
- `read_encrypted_file("auth_token")` on app startup

---

## Phase 7: Email Templates (Resend)

### 7.1 Device Transfer Approval Email

**File:** `ixos-site/src/lib/email/templates/device-transfer.tsx`

Contains:
- "Approve transfer to {device_label}" button with signed link
- "If this wasn't you, revoke all devices" link
- Device info (old device label, new device label, timestamp)

### 7.2 Optional Emails

- `purchase-confirmation.tsx` - Welcome to Pro
- `new-device-login.tsx` - Security notification

---

## Phase 8: Rate Limits & Anti-Sharing

### 8.1 Transfer Cooldown

In `lease_transfers` logic:
- Check last successful transfer was >12 hours ago
- Max 5 transfers per calendar month
- Always email notify on any transfer

### 8.2 Lease Expiry

- Leases expire after 7 days
- Desktop polls `/api/desktop/lease/refresh` every 24 hours
- Grace period: token remains valid for 7 days even if server unreachable (offline use)

---

## Critical File Paths

| Purpose | Path |
|---------|------|
| Lemon webhook (migrate from) | `landing/app/api/webhooks/lemonsqueezy/route.ts` |
| Clerk webhook (migrate from) | `landing/app/api/webhooks/clerk/route.ts` |
| DB schema (migrate from) | `landing/lib/db/schema.ts` |
| Desktop entry point | `ui/src/App.tsx` |
| Sidebar (add badge/banner) | `ui/src/components/layout/Sidebar.tsx` |
| Rust lib (register commands) | `src-tauri/src/lib.rs` |
| Rust search (add gate) | `src-tauri/src/commands/search.rs` |
| Pricing UI (reference) | `ixos-site/src/components/sections/Pricing.tsx` |

---

## Environment Variables

### ixos-site/.env.local
```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SECRET=whsec_...

# Lemon Squeezy
LEMONSQUEEZY_WEBHOOK_SECRET=...
LEMONSQUEEZY_API_KEY=...
LEMONSQUEEZY_STORE_ID=...
LEMONSQUEEZY_PRO_VARIANT_ID=...

# Database
DATABASE_URL=postgres://...@neon.tech/ixos

# JWT Signing
IXOS_JWT_PRIVATE_KEY=...
IXOS_JWT_PUBLIC_KEY=...

# Resend
RESEND_API_KEY=re_...
```

### ui/.env
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_...
VITE_API_URL=https://ixos.io/api
```

---

## Verification Checklist

1. **Auth gate works**: Desktop app shows login screen, cannot access search without auth
2. **Plan badge displays**: After login, sidebar shows "Free" or "Pro" badge
3. **Upgrade banner shows**: Free users see "Upgrade to Pro" banner in sidebar
4. **In-app checkout works**: Clicking upgrade opens Lemon checkout in Tauri webview
5. **Webhook updates plan**: After purchase, webhook fires, DB updates, badge flips to "Pro"
6. **Device lease enforced**: Second device login shows transfer prompt, not immediate access
7. **Transfer email works**: Transfer request sends Resend email with approval link
8. **Approval transfers lease**: Clicking email link revokes old lease, issues new
9. **Rust gate enforced**: Even with UI bypass, search commands fail without valid token
10. **Offline grace works**: Cached 7-day token allows search when server unreachable

---

## Testing Commands

```bash
# Run ixos-site locally
cd ixos-site && npm run dev

# Test webhook with ngrok
ngrok http 3000
# Configure webhook URL in Lemon Squeezy dashboard: https://xxx.ngrok.io/api/webhooks/lemonsqueezy

# Build desktop app
cd ui && npm run build
cd ../src-tauri && cargo build

# Run Drizzle migrations
cd ixos-site && npx drizzle-kit push
```

---

## Documentation Deliverable

Create `docs/control-plane.md` with:
- Environment variable reference
- Webhook setup instructions (Lemon Squeezy + Clerk dashboards)
- Database schema diagram
- Troubleshooting: how to check webhook_events table for debugging
- How to manually revoke a lease for support cases
