# Ixos Control Plane (Auth + Billing + Leases)

This document describes the Control Plane implementation for Ixos (Clerk auth, Lemon Squeezy billing, Neon Postgres storage, Resend emails) and the desktop entitlement flow.

## Environment Variables

### ixos-site (`ixos-site/.env.local`)

```
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SECRET=whsec_...

# Lemon Squeezy
LEMONSQUEEZY_WEBHOOK_SECRET=...
LEMONSQUEEZY_API_KEY=...
LEMONSQUEEZY_STORE_ID=...
LEMONSQUEEZY_PRO_VARIANT_ID=...

# Public checkout URL template for pricing button
# Example: https://store.lemonsqueezy.com/checkout/buy/{variantId}
NEXT_PUBLIC_LEMON_CHECKOUT_URL_TEMPLATE=...
NEXT_PUBLIC_LEMONSQUEEZY_PRO_VARIANT_ID=...

# Database
DATABASE_URL=postgres://...@neon.tech/ixos

# JWT Signing (ES256 PEM)
IXOS_JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
IXOS_JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"

# Resend
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Ixos <noreply@ixos.app>

# Base URL for approval links in emails
IXOS_SITE_URL=https://ixos.app

# Support inbox for contact form
IXOS_SUPPORT_EMAIL=support@ixos.app

# Public site URL (for checkout success redirects)
NEXT_PUBLIC_SITE_URL=https://ixos.app
```

### Desktop UI (`ui/.env`)

```
VITE_CLERK_PUBLISHABLE_KEY=pk_...
VITE_API_URL=https://ixos.app
VITE_LEMONSQUEEZY_PRO_VARIANT_ID=...
```

### Desktop Tauri (`src-tauri/.env` optional or runtime env)

```
# Used to open checkout/pricing inside an in-app window.
# Optional now: desktop can pass pricing URLs directly.
IXOS_SITE_URL=https://ixos.app
IXOS_PRICING_URL=https://ixos.app/pricing
IXOS_CHECKOUT_URL_TEMPLATE=https://store.lemonsqueezy.com/checkout/buy/{variantId}
IXOS_CHECKOUT_SUCCESS_URL=https://ixos.app/account?checkout=success
IXOS_CHECKOUT_CANCEL_URL=https://ixos.app/pricing?checkout=cancelled

# Verify entitlement tokens
IXOS_JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
```

## Webhook Setup

### Clerk
- Dashboard → Webhooks → Create endpoint: `https://<domain>/api/webhooks/clerk`
- Copy signing secret to `CLERK_WEBHOOK_SECRET`

### Lemon Squeezy
- Dashboard → Webhooks → Create endpoint: `https://<domain>/api/webhooks/lemonsqueezy`
- Copy signing secret to `LEMONSQUEEZY_WEBHOOK_SECRET`

## Database Schema (Drizzle)

Tables created in `ixos-site/src/lib/db/schema.ts`:

- `users`: Clerk users (uuid id + clerk_user_id)
- `subscriptions`: Lemon Squeezy subscription state
- `devices`: Registered devices per user
- `leases`: Active Pro lease (1 per user)
- `lease_transfers`: Transfer requests + approval tokens
- `webhook_events`: Raw webhook logs

## Desktop Flow

1. Desktop signs in via Clerk.
2. App registers device (`/api/desktop/register-device`).
3. App claims/refreshes lease (`/api/desktop/lease/claim`).
4. Server issues ES256-signed entitlement token.
5. Desktop stores token locally and passes it to the Tauri backend for search gating.

## Troubleshooting

### Webhook events not updating entitlements
- Check `webhook_events` for `processing_error`
- Confirm webhook signature secrets match
- Ensure checkout includes `checkout[custom][clerk_user_id]`

### Device transfer issues
- Check `lease_transfers` for status and `expires_at`
- Confirm Resend API key and sender address

### Manual revoke (support)

To revoke all active leases for a user:

```sql
UPDATE leases
SET status = 'revoked', revoked_at = NOW()
WHERE user_id = '<uuid>' AND status = 'active';
```

## Testing Notes

- `cd ixos-site && npm run dev` to run API routes locally
- `npx drizzle-kit push` to apply schema to Neon
- `npm run tauri dev` from repo root to run desktop app
- `npm run tauri:build:prod` from repo root for release packaging (fails fast if required env vars are missing)
