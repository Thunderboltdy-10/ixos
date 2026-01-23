# Ixos Marketing Site - Technical Decisions

This document logs key architectural and implementation decisions for the Ixos marketing and sales website.

## Architecture Decisions

### 1. Removed Static Export

**Decision**: Removed `output: 'export'` from `next.config.mjs`

**Rationale**: Static export prevents API routes, which are required for:
- Clerk authentication callbacks
- Lemon Squeezy payment webhooks
- Waitlist signup with rate limiting
- Dynamic user session handling

**Trade-off**: Requires server deployment (Vercel recommended) instead of static hosting.

### 2. Route Groups for Organization

**Decision**: Used Next.js route groups `(marketing)`, `(legal)`, `(auth)`, `(dashboard)`

**Rationale**:
- Separates concerns cleanly
- Allows different layouts per section (e.g., dashboard has sidebar, marketing has navbar/footer)
- Keeps URL structure clean (no `/marketing/` prefix)

### 3. Clerk for Authentication

**Decision**: Clerk over Auth.js/NextAuth

**Rationale**:
- Pre-built UI components that match our dark theme
- Built-in webhook support for user sync
- Simpler setup for sign-in/sign-up flows
- Good TypeScript support

### 4. Lemon Squeezy for Payments

**Decision**: Lemon Squeezy over Stripe

**Rationale**:
- Merchant of Record (handles VAT/taxes automatically)
- No need to manage tax compliance ourselves
- Built-in license key generation
- Webhook-based order tracking

### 5. Drizzle ORM + Neon PostgreSQL

**Decision**: Drizzle over Prisma

**Rationale**:
- Better serverless performance (no cold start issues)
- Type-safe schema in TypeScript
- Simpler migration workflow
- Neon's serverless driver works well with Edge runtime

### 6. Plausible Analytics

**Decision**: Plausible over Google Analytics

**Rationale**:
- Privacy-first (GDPR compliant, no cookies)
- Aligns with Ixos's privacy messaging
- Simpler dashboard
- Script tag approach more reliable than npm package (which is deprecated)

## Design Decisions

### 7. Replaced Horizontal Scroll Features

**Decision**: Grid + spotlight pattern instead of GSAP horizontal scroll

**Rationale**:
- Better accessibility (keyboard navigation)
- Works better on mobile
- Clearer information hierarchy
- Users can see all features at once

### 8. Removed AI Hype Language

**Decision**: Replaced "billions of parameters, zero latency" with verified metrics

**Rationale**:
- Builds trust with technical users
- Differentiates from "AI blob" marketing
- All claims backed by lab report data

**Examples**:
- "181ms P50 latency" (verified from IXOS_MODEL_LAB_REPORT.md)
- "0.766 MRR@10" (verified Flash mode accuracy)
- "500x faster than transformers" (verified comparison)

### 9. Accurate Product Terminology

**Decision**: Use "Ixos-Flash-v2", "Auto mode", "Pro fusion" consistently

**Rationale**:
- Matches actual product implementation
- Avoids confusion between modes
- Educational for users about how the system works

### 10. Pricing Tier Naming

**Decision**: Free / Pro / Team (changed from Core / Nexus / Vault)

**Rationale**:
- More intuitive for users
- Clearer value proposition
- Standard SaaS naming convention

## Security Decisions

### 11. Webhook Signature Verification

**Decision**: Verify all webhook signatures (Clerk via Svix, Lemon Squeezy via HMAC)

**Rationale**: Prevents spoofed webhook attacks that could create unauthorized purchases or user accounts.

### 12. Rate Limiting on Waitlist

**Decision**: In-memory rate limit (5 requests per IP per hour)

**Rationale**:
- Prevents spam/abuse
- Simple implementation for MVP
- Would move to Redis for production scale

### 13. Honeypot Anti-Spam

**Decision**: Hidden field that bots fill but humans don't see

**Rationale**: Non-intrusive spam prevention without CAPTCHA friction.

## File Structure

```
landing/
├── app/
│   ├── (marketing)/      # Public pages with navbar/footer
│   ├── (legal)/          # Privacy, terms
│   ├── (auth)/           # Clerk sign-in/sign-up
│   ├── (dashboard)/      # Protected account pages
│   ├── docs/             # Documentation
│   └── api/              # Webhooks, waitlist
├── components/
│   ├── marketing/        # Home page sections
│   ├── dashboard/        # Account components
│   ├── shared/           # Navbar, footer, waitlist form
│   └── ui/               # Primitive components
└── lib/
    ├── db/               # Drizzle schema and client
    ├── verified-benchmarks.ts  # Lab report data
    └── constants.ts      # Site config, pricing, features
```

## Future Considerations

1. **Redis for rate limiting**: Current in-memory solution won't scale across serverless instances
2. **License key validation API**: For desktop app to verify licenses
3. **Stripe fallback**: Consider adding Stripe for users who prefer it
4. **CDN for downloads**: Move installers to CloudFlare R2 or similar
5. **Email templates**: Proper React Email templates for better deliverability
