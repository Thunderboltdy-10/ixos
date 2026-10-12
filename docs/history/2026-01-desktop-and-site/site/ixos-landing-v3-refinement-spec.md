# IXOS Landing — V3 Refinement Spec (Upgrade Pass)

This spec upgrades the **already-built** Ixos marketing website to the “polished, intricate, premium dev-tool” level we described.
It is intentionally opinionated and **over-specific** so an implementation agent can’t take shortcuts.

---

## 0) Non‑Negotiables

- **Core vibe**: dark graphite “instrument panel” + subtle paper/material texture (not glossy AI SaaS).
- **Primary color is PORCELAIN (white)**. Teal is an accent only (interactive + rare trace highlight).
- **Electricity motif** must be **visible**: Manhattan-routed traces + sparing yellow “spark”.
- **Hero must feel alive immediately** (no blank “template” load).
- **Scroll story must not feel broken**: no dead scroll. The hero should progress with minimal wheel/trackpad input.

---

## 1) Design Tokens (Colors, Materials, Shadows)

### 1.1 Color tokens (dark graphite base + porcelain foreground)
Use these exact tokens (or extremely close):
- `bg.graphite-0`: `#07080A` (page base)
- `bg.graphite-1`: `#0B0D10` (section panels)
- `bg.graphite-2`: `#101318` (lifted cards backing)
- `fg.porcelain`: `#F3F5F7` (primary text)
- `fg.muted`: `rgba(243,245,247,.72)` (secondary)
- `stroke.hairline`: `rgba(243,245,247,.14)`
- **Accent teal (strictly limited)**: `#0D9488`
- **Spark (micro-detail only)**: `#F6B94C`
- **Arc blue (rare)**: `#5EA3FF` (very low saturation usage)
- **Ion purple (rare)**: `#9B7DFF` (very low saturation usage)

Rules:
- Never color an entire heading teal. Only one word at most, or a small underline/badge.
- Spark is only for: a trace junction + one micro-badge highlight. No general UI.

### 1.2 Material overlays (subtle, not noisy)
You will implement these purely in CSS (no new assets needed):
- **Graphite grain**: a low-opacity noise overlay via SVG turbulence (see 8.2).
- **Arc-like texture** (very subtle): a soft dotted/mesh pattern + faint vignette.
- Section-to-section variation should be subtle:
  - Hero: graphite + radial “light cone”
  - How it works: slightly lighter graphite-1 + faint grid
  - Pricing: graphite-0 + faint halftone strip divider boundary

### 1.3 Lifted “3D in 2D” shadow language
Hero deck, pipeline diagram, and Pro tier card must feel **lifted** (levitating).
Use a consistent layered shadow:
- `shadowLift`:
  - `0 0 0 1px rgba(243,245,247,.12)`
  - `0 18px 60px rgba(0,0,0,.55)`
  - `0 2px 14px rgba(0,0,0,.45)`
- Add a subtle pseudo-element “underlay” offset by 2–4px with blur to reinforce depth.

No heavy glow. If any glow exists, it must be a **tiny halo** around nodes/traces only.

---

## 2) Typography (JetBrains Mono + Display H1)

### 2.1 Fonts
- **Body / UI / small labels**: JetBrains Mono
- **H1 only**: a “cooler” display face (serif contrast like Resend). Use one of:
  - `Instrument Serif` (preferred), or
  - `Fraunces` (fallback).
- H2/H3 can remain JetBrains Mono for consistency, but allow slightly different weight/spacing.

### 2.2 Type rules
- Body line-height 1.65–1.8 (mono needs air).
- H1 letter spacing slightly negative (`-0.02em`).
- Use **porcelain** for most text. Use muted for paragraph copy.

---

## 3) Hero (Above-the-fold) — Must feel “working” immediately

### 3.1 Layout
- 100vh hero (no more than one screen).
- Nav must not cover H1 or video. Increase top padding.
- Hero has:
  - Left: H1 + subcopy + primary CTA (Download) + secondary CTA (Watch demo) + tiny badge
  - Right/Center: **Hero Deck (video)** sized “average” (large but not > 1/2 screen height).

### 3.2 Immediate load requirement (fix the “template flash”)
The first seconds must never show a generic template placeholder.
Implementation requirement:
- Video element has:
  - `poster` image (use first frame extracted from video, or generate a poster)
  - `preload="auto"`, `playsInline`, `muted`, `loop`, `autoPlay`
- Use `opacity` fade-in when `canplaythrough` fires, but **poster is visible instantly**.

### 3.3 Buttons must work
- Download: real link (even if it’s a placeholder file). Must trigger a download or open /download page.
- Watch demo: opens a modal overlay playing the demo (use existing `Hero Video.mp4`).

### 3.4 Micro-interactions
- On hover, buttons “magnetize” nearby particles (see 6.3).
- Hover also shifts border + background slightly (no neon).

---

## 4) Hero Scroll Story (Pinned → Drag Down → Flip → Hand-off)

This is the main thing missing. Implement it exactly.

### 4.1 Structure
Use a 2-part hero:
1) **Hero Base (100vh)**: normal layout, no pin.
2) **Hero Story (additional ~120–160vh)**: activates on scroll and performs the hand-off animation.

Key constraint: **No dead scroll**.
- The user should feel progress on the first small scroll.
- Keep the pin duration short and high-signal.

### 4.2 Desired animation (timeline)
As user scrolls through Hero Story:
1) **Pin** the Hero Deck (not the whole page).
2) Deck begins to **slide downward** (toward the next section).
3) Electric traces start “routing” from deck downward.
4) A subtle **power-up ripple** pulses outward (once or twice), synced to trace completion.
5) Near the end of the story: deck **rotates 180° around X** (flip to flat) and becomes the **pipeline diagram**.
6) **Hand-off**:
   - At the exact scroll point where the pipeline section begins, the deck’s back face aligns with the pipeline’s container.
   - Crossfade: deck-back becomes pipeline diagram, then the pipeline section takes over (sticky steps continue exactly as now).
7) Deck unpins and disappears (or becomes the pipeline).

### 4.3 Visual rules
- Deck movement stays **centered** (only minimal lateral movement).
- Rotation is crisp and engineered (no wobble).
- Use `transform-style: preserve-3d; backface-visibility: hidden`.
- Keep the pipeline section behavior you already like.

---

## 5) Electric Traces (Must be visible and page-wide)

### 5.1 What they should look like
- Manhattan-routed traces (orthogonal, rounded 90° corners).
- Stroke: 1px porcelain at ~0.55 opacity.
- One teal highlighted trace segment appears occasionally.
- One spark (yellow) at a junction appears rarely (micro detail).
- Subtle faint outer halo (optional) but extremely restrained.

### 5.2 Where they should exist
Traces are not just in hero. They should lightly “route” across the site:
- Hero deck → Pipeline diagram
- Pipeline → Pricing Pro card
- Pricing → Final CTA / Download
- Optional: a faint “backbone” trace in the background across sections

### 5.3 How they animate
- Use SVG with `stroke-dasharray` / `stroke-dashoffset` to draw in.
- On scroll into each section, the next branch draws and emits a small pulse at the node.

---

## 6) Particle Field (Embeddings feel)

Current particles are “fine”, but you need **connections** and **trace attraction**.

### 6.1 Connections = “embedding links”
- Draw faint lines between nearby particles (distance threshold).
- Lines should appear/disappear smoothly as particles drift.
- Cap total lines per frame for performance (e.g., k-nearest or spatial grid).

### 6.2 Behavior
- Fast drift, subtle parallax.
- Cursor repulsion/attraction stays.
- Intensity lower outside hero: fewer particles + fewer lines.

### 6.3 Trace attraction (key)
Particles should be *slightly pulled* toward electric traces, so the field “leans into” the routing.
Implementation idea:
- Sample points along the trace paths.
- For each particle, find nearest sample point within radius and apply a small force.
- When a trace draws, local particle density increases slightly around it.

---

## 7) Strip Divider (Fix integration)

The strip divider asset currently looks wrong because it’s being stretched or too opaque.

Rules:
- Never stretch vertically.
- Use it as a repeating horizontal band with **fade at edges** (mask).
- Blend mode: `screen` or `lighten` at low opacity.
- Use it only between major sections (Hero→How, How→Pricing, Pricing→CTA).

---

## 8) Scribble Strike (INDEXING)

This must exist and be obvious:
- In the “No Indexing” callout, the word **INDEXING** is struck through by a scribble.
- Animate it on scroll:
  - Use the `Scribble.png` as a mask/clip.
  - Reveal left→right like it’s being drawn.

---

## 9) Section Materials & Subtle Background Shifts

Right now everything uses the same background.
Add subtle shifts without “hard color blocks”:

- Implement per-section background overlays:
  - `Hero`: stronger vignette + “light cone”
  - `How it works`: faint grid + slightly lighter graphite-1
  - `Pricing`: graphite-0 + subtle halftone / arc texture
  - `CTA`: graphite-1 + slightly stronger grain

Also: add **arc-like texture** (see 9.1).

### 9.1 Arc-like texture (CSS-only)
Add a pseudo-element overlay using:
- faint dotted/mesh pattern
- + a low-opacity noise overlay
- + a soft vignette

This gives “paper + light” without AI gradients.

---

## 10) Add Sections (More length, but not AI-SaaS)

Add 2–3 sections maximum, minimal, and grounded in desktop search:

1) **Use case: Meeting note rescue**
- Short story: “Find the PDF before the meeting.”
- Shows speed + relevance + local privacy.
- This can be mostly text + a small “result list” mock component.

2) **Benchmarks (simple)**
- One compact panel: “Instant results” with a single metric and a small chart line.
- No big dashboard vibes.

3) **FAQ (short)**
- 5 questions max, collapsible.

---

## 11) Quality Bar (Acceptance Tests)

Your implementation is “done” only if:
- Scroll never feels locked/broken in hero.
- Video deck pins properly and remains visible through story.
- Deck drag-down + flip + pipeline handoff works.
- Traces are visible (verify on multiple screens).
- Scribble strike is visible + animated.
- Strip divider looks intentional (not stretched).
- Download & Watch demo buttons work.
- Particles show connections and trace attraction.
- JetBrains Mono applied; H1 uses display font.
- Key panels have lifted shadow language.

---

## 12) Implementation Notes (Suggested component architecture)

Create or refactor into these components (names are suggestions):
- `components/background/ParticleField.tsx`
- `components/background/ElectricTraces.tsx`
- `components/background/MaterialOverlays.tsx`
- `components/hero/Hero.tsx`
- `components/hero/HeroStory.tsx` (GSAP/ScrollTrigger timeline)
- `components/how/HowItWorks.tsx` (keep existing behavior)
- `components/ui/StripDivider.tsx`
- `components/ui/ScribbleStrike.tsx`
- `components/pricing/Pricing.tsx`
- `components/cta/FinalCTA.tsx`

Prefer creating **new** V3 components and swapping them in, rather than patching old logic.

