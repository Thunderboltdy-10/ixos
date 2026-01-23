# Ixos Marketing Site

Production-ready marketing and sales website for Ixos, the local-first semantic file search tool.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + custom design system
- **Animation**: Framer Motion + GSAP
- **Auth**: Clerk
- **Payments**: Lemon Squeezy (Merchant of Record)
- **Database**: PostgreSQL (Neon) + Drizzle ORM
- **Email**: Resend
- **Analytics**: Plausible

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- PostgreSQL database (Neon recommended)

### 1. Install Dependencies

```bash
cd landing
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Required variables:

```bash
# Clerk (https://dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx

# Database (https://console.neon.tech)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Lemon Squeezy (https://app.lemonsqueezy.com/settings/api)
LEMONSQUEEZY_API_KEY=xxx
LEMONSQUEEZY_STORE_ID=xxx
LEMONSQUEEZY_WEBHOOK_SECRET=xxx
LEMONSQUEEZY_PRO_PRODUCT_ID=xxx
LEMONSQUEEZY_PRO_VARIANT_ID=xxx

# Resend (https://resend.com/api-keys)
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=Ixos <noreply@ixos.app>

# Site
NEXT_PUBLIC_SITE_URL=https://ixos.app
```

### 3. Set Up Database

Push the Drizzle schema to your database:

```bash
npm run db:push
```

Or generate and run migrations:

```bash
npm run db:generate
npm run db:migrate
```

### 4. Configure Webhooks

#### Clerk Webhook

1. Go to Clerk Dashboard → Webhooks
2. Create endpoint: `https://your-domain.com/api/webhooks/clerk`
3. Subscribe to events: `user.created`, `user.updated`, `user.deleted`
4. Copy signing secret to `CLERK_WEBHOOK_SECRET`

#### Lemon Squeezy Webhook

1. Go to Lemon Squeezy → Settings → Webhooks
2. Create endpoint: `https://your-domain.com/api/webhooks/lemonsqueezy`
3. Subscribe to events:
   - `order_created`
   - `subscription_created`
   - `subscription_updated`
   - `subscription_cancelled`
   - `order_refunded`
4. Copy signing secret to `LEMONSQUEEZY_WEBHOOK_SECRET`

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

| Route | Description |
|-------|-------------|
| `/` | Home page with all marketing sections |
| `/pricing` | Pricing tiers with Lemon Squeezy checkout |
| `/download` | OS detection + installer downloads |
| `/docs` | Documentation index |
| `/about` | About page |
| `/security` | Security posture and threat model |
| `/changelog` | Version history |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/sign-in` | Clerk sign-in |
| `/sign-up` | Clerk sign-up |
| `/account` | User dashboard (protected) |
| `/account/downloads` | Download history |
| `/account/settings` | Account settings |

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/webhooks/clerk` | POST | Clerk user sync webhook |
| `/api/webhooks/lemonsqueezy` | POST | Payment/subscription webhook |
| `/api/waitlist` | POST | Waitlist signup with rate limiting |

## Database Schema

```typescript
users          // Synced from Clerk
purchases      // From Lemon Squeezy orders
licenseKeys    // Generated on purchase (IXOS-XXXX-XXXX-XXXX)
downloads      // Download tracking
waitlist       // Email signups
```

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repo to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

### Other Platforms

The site requires a Node.js runtime for API routes. Works with:
- Railway
- Render
- AWS Amplify
- DigitalOcean App Platform

Does NOT work with static hosts (Netlify static, GitHub Pages, CloudFlare Pages static).

## Development

### Adding New Features

1. Components go in `components/` organized by feature
2. Marketing sections go in `components/marketing/`
3. API routes go in `app/api/`
4. Use `lib/verified-benchmarks.ts` for any performance claims

### Updating Pricing

Edit `lib/constants.ts`:

```typescript
export const PRICING_TIERS = [
  {
    name: "Free",
    price: "€0",
    features: [...],
    ctaHref: "/download",
  },
  // ...
];
```

### Adding Benchmark Data

All performance claims must come from `IXOS_MODEL_LAB_REPORT.md`. Update `lib/verified-benchmarks.json` (or run the Phase 1 script to regenerate it):

```powershell
python scripts/update_verified_benchmarks.py --jit bench/results/PERF_JIT.json --cache bench/results/PERF_CACHE.json --out-json landing/lib/verified-benchmarks.json --out-report IXOS_MODEL_LAB_REPORT.md
```

## Testing Payments

1. Use Lemon Squeezy test mode
2. Test card: `4242 4242 4242 4242`
3. Verify webhook receives events
4. Check database for purchase record

## Troubleshooting

### Clerk auth not working

- Check `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set
- Verify callback URLs in Clerk dashboard match your domain

### Webhooks not receiving

- Verify webhook URLs are publicly accessible
- Check signing secrets match
- Look at Clerk/Lemon Squeezy webhook logs

### Database connection issues

- Neon requires `?sslmode=require` in connection string
- For local dev, use Neon's pooler URL

## License

MIT for marketing site code. Ixos core is also MIT, Pro features are proprietary.
