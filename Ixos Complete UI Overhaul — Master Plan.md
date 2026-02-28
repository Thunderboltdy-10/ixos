# Ixos Complete UI Overhaul — Master Plan

## Context

The current landing pages (/1, /2, /3) share the same `V5PrimeLanding` component with different preset props. This creates architectural sameness — 15 identical sections, the same `DemoSurface` mockup repeated in every section, and only accent color/grid direction differing between variants. The result feels generic and "AI-ish." The desktop app was damaged during the landing-page unification effort — the search bar has an overwrought gradient, results are ugly, streaming is broken, justification is blank, and Today/Workstreams feel like stacked cards.

**Root causes identified:**
1. V5PrimeLanding preset system enforces sameness across /1, /2, /3
2. 15 sections per page is 2-3x too many (top landing pages: 5-7)
3. DemoSurface appears in every section — visual fatigue
4. Space Grotesk + teal/amber/violet = every AI product's palette
5. Desktop app borrowed landing-page visual patterns that don't work for daily use
6. No central visual metaphor tying any page together

**Scope:**
- Landing pages /1, /2, /3: Complete standalone rebuild (no shared code except `@ixos/ixos-ui` DemoSurface used sparingly, max 2x per page)
- Desktop app: Full visual + layout rework
- Root `/`: Stays as-is
- Brand colors: Keep teal/amber/violet, use better

---

## Part 1: Landing Page /1 — "Mission Control"

**Mood:** Authoritative, commanding, operational. You're entering a search operations center.

**Environment:** Dark control-room aesthetic. The product is the central monitor. Ambient readouts and data panels surround it. Scroll zooms you past the product into feature stations.

**Color emphasis:** Teal primary (#14B8A6) with amber data readouts (#F6B94C).

**Typography:**
- Display: **Instrument Sans** (via Google Fonts — technical, distinctive, not overused)
- Body/Data: **JetBrains Mono** (matches the "operations" feel, different from landing /2 and /3)
- Headlines: 900 weight, letter-spacing -0.04em, line-height 1.05
- Body: 400 weight, 15px, line-height 1.7

**Hero (viewport height):**
- Full-screen dark environment with CSS dot-grid background (radial-gradient pattern, masked with radial fade at edges)
- Product showcase (DemoSurface) as a floating "monitor" with BrowserMockup chrome wrapper — centered, 65% viewport width, perspective tilt on mouse move (max 6deg), layered shadow underneath
- Headline above: kinetic text reveal (staggered char-by-char with Framer Motion `staggerChildren: 0.03`)
- Subtle ambient elements: 4-5 small "instrument panel" SVG shapes at edges of viewport, different parallax depths (CSS scroll-driven animation `animation-timeline: scroll()`)
- Scroll indicator: thin teal line that extends downward as you scroll

**Sections (6 total):**
1. **Hero** — Product showcase in environment (described above)
2. **Speed** — Performance stats (7ms load, <800ms search) as animated counters. No DemoSurface. CSS-only grid of metric cards with number count-up animation. Progress bars that fill on scroll.
3. **Pipeline** — How search works (JIT Scan → Lexical → Semantic → Lock). Horizontal scroll section pinned via GSAP ScrollTrigger. 4 panels sliding left-to-right, each with icon + description + animated progress.
4. **Privacy** — "No cloud. No telemetry. No exceptions." Scroll-fill text (word-by-word opacity fill as you scroll, Apple-style). Clean, minimal — trust through restraint.
5. **Product Deep Dive** — Second DemoSurface usage, showing Today/Workstreams views. Cinematic reveal (scale 0.85→1, rotateX 12→0, blur 6→0 on scroll).
6. **CTA** — Download + pricing. Clean two-column layout, teal accent buttons, platform badges.

**Transitions:** GSAP color-shift between sections (subtle background tint changes). Noise overlay fixed across page (SVG feTurbulence, opacity 0.035, mix-blend-mode overlay).

**Key files to create:**
- `ixos-site/src/app/1/page.tsx` — Route entry
- `ixos-site/src/app/1/layout.tsx` — Metadata
- `ixos-site/src/app/1/_mc/MissionControlPage.tsx` — Main orchestrator
- `ixos-site/src/app/1/_mc/MCHero.tsx` — Hero section
- `ixos-site/src/app/1/_mc/MCSpeed.tsx` — Speed metrics
- `ixos-site/src/app/1/_mc/MCPipeline.tsx` — Horizontal scroll pipeline
- `ixos-site/src/app/1/_mc/MCPrivacy.tsx` — Scroll-fill privacy
- `ixos-site/src/app/1/_mc/MCProduct.tsx` — Product deep dive
- `ixos-site/src/app/1/_mc/MCCTA.tsx` — Download/pricing
- `ixos-site/src/app/1/_mc/MCNav.tsx` — Navigation
- `ixos-site/src/app/1/_mc/MCFooter.tsx` — Footer
- `ixos-site/src/app/1/_mc/mc.module.css` — All styles (CSS module)
- `ixos-site/src/app/1/_mc/BrowserMockup.tsx` — Product frame wrapper
- `ixos-site/src/app/1/_mc/AnimatedText.tsx` — Kinetic text component
- `ixos-site/src/app/1/_mc/CounterCard.tsx` — Animated metric card

**Key techniques:**
- CSS scroll-driven animations for parallax depth layers
- Framer Motion staggered text reveal
- GSAP ScrollTrigger for horizontal scroll section + section color shifts
- Mouse-following perspective tilt on product showcase
- CSS dot-grid background with radial mask fade
- SVG noise overlay

---

## Part 2: Landing Page /2 — "The Chamber"

**Mood:** Clinical precision. Swiss design. A pristine measurement chamber. Every search is a calibrated instrument reading.

**Environment:** Ultra-minimal. Lots of negative space. The product emerges cleanly from darkness. Geometric precision in every element.

**Color emphasis:** Violet primary (#7C5CFF) with teal accents (#14B8A6) for data highlights.

**Typography:**
- Display: **Satoshi** (via CDN — geometric, premium, crisp — very different from /1)
- Body: **Geist Mono** (continuity with desktop app)
- Headlines: 800 weight, letter-spacing -0.03em, line-height 1.1
- Subtitles: 300 weight (strong weight contrast with headlines)
- Body: 400 weight, 14px, line-height 1.75

**Hero (viewport height):**
- Centered composition. Nearly empty viewport.
- Large headline text that fades in word-by-word (not char-by-char — slower, more deliberate)
- Product emerges via clip-path reveal from center outward: `clip-path: inset(50% 50% 50% 50%)` → `inset(0)` on scroll
- No background effects — pure black (#0C0E10) with a single subtle radial violet glow behind the product
- Line grid background that ONLY appears around the product (masked to product area), creating a "measurement field"

**Sections (5 total):**
1. **Hero** — Clip-path product reveal (described above)
2. **Evidence** — "No black box" messaging. Split layout: left side has large scroll-fill text explaining the pipeline; right side has a sticky code block showing actual Rust source (`hybrid_engine.rs` snippet) that highlights different lines as you scroll through the explanation.
3. **Benchmarks** — Clean data table. No cards, no gradients. Just a beautifully typeset comparison table with Flash vs Auto vs Pro metrics. Numbers animate in on scroll. Horizontal lines only. Violet accent on Pro column.
4. **Security** — "Local-first" section. 3 concise feature blocks in a row: HMAC signing, ADS/xattr storage, Ed25519 attestation. Each block is a thin-bordered card with monospace caption + one-line description. DemoSurface showing Journalist Mode (second and final DemoSurface usage).
5. **CTA** — Minimal. Centered. One headline, one subline, two buttons (Download + Docs). Violet gradient on primary button.

**Transitions:** Clip-path wipe transitions between sections (CSS `animation-timeline: view()` with inset animations). Background shifts from pure black → deep navy (`#0A0D1A`) → back to black.

**Key files to create:**
- `ixos-site/src/app/2/page.tsx`
- `ixos-site/src/app/2/layout.tsx`
- `ixos-site/src/app/2/_ch/ChamberPage.tsx`
- `ixos-site/src/app/2/_ch/CHHero.tsx`
- `ixos-site/src/app/2/_ch/CHEvidence.tsx`
- `ixos-site/src/app/2/_ch/CHBenchmarks.tsx`
- `ixos-site/src/app/2/_ch/CHSecurity.tsx`
- `ixos-site/src/app/2/_ch/CHCTA.tsx`
- `ixos-site/src/app/2/_ch/CHNav.tsx`
- `ixos-site/src/app/2/_ch/CHFooter.tsx`
- `ixos-site/src/app/2/_ch/chamber.module.css`
- `ixos-site/src/app/2/_ch/ScrollFillText.tsx`
- `ixos-site/src/app/2/_ch/CodeHighlight.tsx` — Sticky code block with scroll-synced line highlighting

**Key techniques:**
- CSS clip-path reveal for hero product entrance
- Scroll-fill word-by-word opacity text (Framer Motion useScroll + useTransform)
- GSAP ScrollTrigger for sticky code highlighting
- CSS `animation-timeline: view()` for section wipe transitions
- Extreme negative space and weight contrast in typography
- Line grid background with radial mask

---

## Part 3: Landing Page /3 — "The Wire"

**Mood:** Energetic. Kinetic. Magazine editorial. Data flowing through circuits at high speed.

**Environment:** High-energy but controlled. Signal waveforms. Electricity. Everything moves with purpose. Editorial layout with asymmetric compositions.

**Color emphasis:** Amber primary (#F6B94C) with violet accents (#7C5CFF) for contrast.

**Typography:**
- Display: **Cabinet Grotesk** (via CDN — editorial, bold personality, very distinctive)
- Body: **Space Mono** (Google Fonts — kinetic feel, different from /1 and /2)
- Headlines: 900 weight, letter-spacing -0.05em, line-height 0.95 (very tight)
- Body: 400 weight, 14px, line-height 1.7

**Hero (viewport height):**
- Full-bleed dark background with animated mesh gradient (4 radial gradients with subtle CSS drift animation, 20s loop)
- Product showcase on the right side (60% width), angled at slight perspective (rotateY: -4deg), floating with parallax
- Left side: massive headline in Cabinet Grotesk, gradient text that shifts teal→amber→violet on scroll (background-position animation linked to scroll progress)
- Below headline: compact feature badges (like keyboard shortcuts) — "7ms load", "92% MRR@10", "Zero cloud"
- Grain overlay across entire hero

**Sections (6 total):**
1. **Hero** — Gradient text + floating product (described above)
2. **Flow** — How Ixos processes a query. GSAP horizontal scroll section with 4 panels: JIT Scan → Lexical → Semantic → Locked. Each panel is a full-viewport card with large number (01-04), title, one paragraph, and an animated visualization (CSS-only: progress rings, bar charts, connection lines).
3. **Speed** — Split: left has a large animated "~7ms" counter with decimals ticking; right has benchmark comparison cards (Flash vs Pro). Amber glow behind the counter. Kinetic text on section title.
4. **CLI** — Terminal-style section. Dark card with terminal chrome, actual CLI commands that type out one-by-one (CSS animation, no JS). Each command shows its output sliding in. Demonstrates `--journalist-mode`, `--progressive`, `--json`.
5. **Ask Mode** — DemoSurface showing Ask Mode in action (second DemoSurface usage). Left side: editorial-style text about intent detection. Right: the product with a natural language question and evidence response.
6. **CTA** — Bold, full-width amber gradient bar. "Get Ixos." + download buttons. High contrast, unmissable.

**Transitions:** Background color shifts between sections via GSAP. Sections use staggered element reveals (Framer Motion `staggerChildren`). Between major sections: a thin animated line (amber) that sweeps across viewport.

**Key files to create:**
- `ixos-site/src/app/3/page.tsx`
- `ixos-site/src/app/3/layout.tsx`
- `ixos-site/src/app/3/_wire/WirePage.tsx`
- `ixos-site/src/app/3/_wire/WireHero.tsx`
- `ixos-site/src/app/3/_wire/WireFlow.tsx` — Horizontal scroll pipeline
- `ixos-site/src/app/3/_wire/WireSpeed.tsx`
- `ixos-site/src/app/3/_wire/WireCLI.tsx` — Terminal typewriter
- `ixos-site/src/app/3/_wire/WireAsk.tsx`
- `ixos-site/src/app/3/_wire/WireCTA.tsx`
- `ixos-site/src/app/3/_wire/WireNav.tsx`
- `ixos-site/src/app/3/_wire/WireFooter.tsx`
- `ixos-site/src/app/3/_wire/wire.module.css`
- `ixos-site/src/app/3/_wire/GradientHeadline.tsx` — Scroll-linked gradient text
- `ixos-site/src/app/3/_wire/TerminalBlock.tsx` — Typewriter CLI demo

**Key techniques:**
- Animated mesh gradient background (4 radial gradients with CSS keyframe drift)
- Scroll-linked gradient text (background-position tied to scrollYProgress)
- GSAP horizontal scroll for pipeline walkthrough
- CSS typewriter animation for terminal demo
- Framer Motion staggered reveals
- Grain overlay (SVG feTurbulence)

---

## Part 4: Desktop App Redesign

**Goal:** Strip the landing-page visual excess. Make it feel like a precision tool you use every day, not a marketing page.

### 4A. Search Bar Simplification

**Current:** Multi-layered gradient glow, animated border pulse, mode-color-changing gradients.
**New:** Clean single-line input with:
- 1px border, `rgba(white, 0.08)` default, mode color on focus (subtle, not glowing)
- No animated pulse, no layered gradients
- Mode indicator (Flash/Auto/Pro) as a small pill badge to the right of the input
- Cache mode shown as text label below input, not color-changing

**Files to modify:**
- `ui/src/components/search/SearchInput.tsx` — Major simplification
- `ui/src/styles/globals.css` — Remove gradient utility classes for search

### 4B. Search Results Overhaul

**Current:** Dense cards with inconsistent hierarchy, ugly expanded sections, blank justification.
**New:**
- Each result: filename (prominent, 14px medium weight) + path (12px, muted) + score badge (clean circle, mode color)
- Click to expand: evidence panel shows actual content OR clear "Upgrade to Pro for evidence" CTA (not blank space)
- Better spacing: 8px gap between results, 16px padding inside cards
- File type icon: consistent 16px, left-aligned
- Match type (Semantic/Integrity/Temporal): single colored dot + label, not a badge with icon

**Files to modify:**
- `ui/src/components/search/ResultCard.tsx` — Redesign layout
- `ui/src/components/search/SearchResults.tsx` — Better spacing/animation
- `ui/src/components/search/ExplainPanel.tsx` — Fix blank state for non-Pro
- `ui/src/components/search/ScoreBreakdown.tsx` — Cleaner visualization
- `ui/src/components/search/WhyMatched.tsx` — Simplify evidence display
- `ui/src/components/search/ContextSnippet.tsx` — Better code display

### 4C. Streaming/Pipeline Fix

**Current:** Complex panel with multiple stage indicators.
**New:**
- Thin horizontal progress bar at top of results area (4px height)
- Three colored segments: Lexical (amber) → Semantic (teal) → Locked (violet)
- File scan trail: subtle ticker text below bar showing last scanned file
- Stats row: compact inline metrics (scanned: X, candidates: X, cached: X)
- Progress bar disappears when search completes (fade out)

**Files to modify:**
- `packages/ixos-ui/src/components/SearchSurface.tsx` — Simplify pipeline viz
- `ui/src/components/search/MainSearchView.tsx` — New progress bar placement

### 4D. Today/Workstreams Redesign

**Today view (new layout):**
- Top: Persistent context rail (date, total sessions, total searches, cache hit %)
- Primary: "Resume" section — last session with prominent "Continue" button
- Secondary: Recent sessions as compact rows (filename + time + score), not cards
- Tertiary: Daily signals as inline metrics row

**Workstreams view (new layout):**
- List view with clear grouping: Active (green dot) → Warm (amber dot) → Cold (gray dot)
- Each workstream: name + file count + last active + compact status
- Inline actions on hover (pin, rename, delete)
- "Start search from workstream" action as primary

**Files to modify:**
- `ui/src/components/today/TodayTab.tsx` — Full redesign
- `ui/src/components/today/TodayEmptyState.tsx` — Action-first language
- `ui/src/components/workstreams/WorkstreamsList.tsx` — Compact list view
- `ui/src/components/workstreams/WorkstreamDetail.tsx` — Better detail layout

### 4E. Layout/Navigation Updates

**Sidebar:**
- Width: 240px (down from 256px)
- Top: Logo + "New Search" (teal accent button)
- Nav: Search / Today / Workstreams — clear active state (left accent border, subtle bg)
- Pro-locked items: Lock icon + "Pro" badge, not grayed out
- History section: Searchable, compact rows (query text + relative time)
- Bottom: User email + plan badge only (move settings/billing to settings panel)

**Main area:**
- Remove workspace header bar redundancy (sidebar nav is sufficient)
- Add persistent breadcrumb/context line at top (12px muted text showing current view)
- Smooth fade transitions between views (200ms, Framer Motion AnimatePresence)
- Consistent 24px padding on all sides

**Files to modify:**
- `ui/src/components/layout/AppShell.tsx` — Layout restructure
- `ui/src/components/layout/Sidebar.tsx` — Redesign
- `ui/src/styles/globals.css` — Updated token system
- `ui/tailwind.config.cjs` — Refined color tokens if needed

### 4F. Motion Language Normalization

- Base transitions: 200ms `ease-out` for all state changes
- Micro-interactions: 150ms spring for buttons/toggles
- View transitions: 300ms crossfade via AnimatePresence
- Result entry: 150ms stagger, no bounce, no overshoot
- Respect `prefers-reduced-motion` everywhere

---

## Part 5: Shared Infrastructure

### 5A. Font Loading
Each landing page loads its own fonts (no impact on other pages):
- /1: Instrument Sans + JetBrains Mono (Google Fonts via next/font)
- /2: Satoshi (CDN) + Geist Mono (already loaded)
- /3: Cabinet Grotesk (CDN) + Space Mono (Google Fonts via next/font)
- Desktop app: Keep Geist Mono body, consider switching heading from Space Grotesk to Instrument Sans for consistency with /1

### 5B. DemoSurface Usage
- Each landing page uses DemoSurface max 2 times (hero + one feature section)
- DemoSurface wrapped in a proper BrowserMockup chrome frame (each page builds its own wrapper)
- DemoSurface rendered at generous size (min 660px width), never squished

### 5C. Noise Overlay
- Shared technique but independently implemented per page:
  - SVG feTurbulence filter (fractalNoise, baseFrequency 0.65)
  - Fixed overlay, opacity 0.03-0.04, mix-blend-mode overlay
  - pointer-events: none

### 5D. Cleanup
- Old V5PrimeLanding system files stay for now (don't delete — root / still references V4 components)
- Old /1, /2, /3 `_v1`, `_v3` directories will be replaced by new ones
- Old connector files (KineticQueryThread, PipelineRibbon, MinimalCalibration) become unused

---

## Execution Order

### Phase A: Desktop App (highest daily-use impact)
1. Search bar simplification
2. Result card redesign
3. Streaming/pipeline fix
4. Evidence panel fix
5. Today/Workstreams layout
6. Sidebar/navigation updates
7. Motion normalization
8. End-to-end testing

### Phase B: Landing Page /1 — Mission Control
1. Create file structure and page entry
2. Build hero (product showcase + environment + kinetic text)
3. Build speed metrics section
4. Build horizontal scroll pipeline section
5. Build privacy scroll-fill section
6. Build product deep dive section
7. Build CTA + nav + footer
8. Polish animations and responsiveness
9. Test at 1440/1024/390 widths

### Phase C: Landing Page /2 — The Chamber
1. Create file structure
2. Build hero (clip-path reveal)
3. Build evidence section (scroll-fill + sticky code)
4. Build benchmarks table
5. Build security section
6. Build CTA + nav + footer
7. Polish and test

### Phase D: Landing Page /3 — The Wire
1. Create file structure
2. Build hero (gradient text + floating product + mesh gradient)
3. Build horizontal scroll flow section
4. Build speed section
5. Build CLI terminal section
6. Build Ask Mode section
7. Build CTA + nav + footer
8. Polish and test

---

## Verification

### Landing Pages
- `cd ixos-site && npm run build` — All pages build without errors
- `npm run dev` — Each route loads and renders correctly
- Visual QA at 1440px, 1024px, and 390px widths
- Zero console errors
- All animations respect `prefers-reduced-motion`
- Each page feels completely distinct from the others
- DemoSurface renders at proper size (never squished)
- Page load performance: LCP < 2.5s, no layout shift

### Desktop App
- `cd ui && npm run dev` — App launches without errors
- Search bar focus/blur behavior works cleanly
- Search results stream in progressively
- Evidence panel shows content (Pro) or clear upgrade CTA (Free)
- Today/Workstreams navigation is smooth
- All three views (Search/Today/Workstreams) have consistent styling
- View transitions are smooth (no flash/jump)
- Sidebar collapses and expands correctly

### Deployment
- `cd ixos-site && npm run build` passes (static prerender for /1, /2, /3)
- Vercel deployment succeeds (test via `vercel deploy`)
- No broken imports or missing dependencies
