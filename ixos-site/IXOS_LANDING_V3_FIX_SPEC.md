# IXOS Landing v3 — Fix & Refinement Spec (Delta)

This file is **not** a full re-spec. It is a **delta** spec that fixes what is broken in v3 and raises fidelity to the intended “Ixos: Power + Speed” experience.

**Top problems reported / observed:**
- Background systems (particles + electric traces) appear **not visible** or **behind** the page.
- Hero “sticky / pin” feels broken: video goes behind content, does not “drag into” How It Works, no 180° flip reveal.
- Visual system feels plain (too teal-forward, not enough white/greyscale complexity, not enough materials).
- Typography not correct (JetBrains Mono not used; H1 not “cool”).
- Sections/components drift into “AI SaaS” aesthetic (especially “Built for privacy”).
- Micro-interactions missing: pricing toggle lacks satisfying animation; buttons inconsistent / broken; global motion too sparse.
- 3D “lift” effect not visible.

---

## 0) Non‑negotiables

### 0.1 Correct stacking order (this fixes “things behind the website”)
Implement a **single, global** background stack mounted once at the root.

**DOM layering contract**
```
<body>
  <div id="bg-root">   // fixed, pointer-events-none, z-0
    [GraphitePaperTexture]
    [ArcNoiseTexture]
    [ParticleFieldCanvas]
    [ElectricTraceSVGOverlay]
  </div>

  <div id="app-root">  // relative, z-10
    [Nav]
    [Main sections]
    [Footer]
  </div>
</body>
```

**CSS contract**
- `#bg-root` MUST be:
  - `position: fixed; inset: 0; z-index: 0; pointer-events: none;`
  - `overflow: hidden;`
- `#app-root` MUST be:
  - `position: relative; z-index: 10;`
- No other element should set `z-index` above the hero deck **unless intentional**.

**Common causes of the current bug**
- A parent wrapper applies `transform` / `filter` / `opacity` → creates a stacking context so the pinned hero goes “behind”.
- A section has `overflow: hidden` + `position: relative` that clips fixed layers.
- Lenis + GSAP ScrollTrigger not wired via `scrollerProxy` → pins and triggers behave incorrectly.

### 0.2 Lenis + ScrollTrigger integration (if Lenis is used)
If smooth scrolling stays enabled, implement a proper GSAP integration:
- `lenis.on('scroll', ScrollTrigger.update)`
- `ScrollTrigger.scrollerProxy(...)` using the Lenis container
- `ScrollTrigger.refresh()` after fonts/video load

If that is too unstable right now: **disable Lenis temporarily** until hero pin + flip is perfect.

### 0.3 “White is the main color” clarification (on a dark site)
Background stays dark (graphite), but the brand should feel **white-led**:
- Primary strokes and typography: **porcelain / paper white** with **subtle greyscale gradients**
- Teal becomes *accent*, not the page identity
- Yellow + violet-blue are *micro accents* only (electricity moments)

---

## 1) Typography: exact requirements

### 1.1 Body / UI text
- Use **JetBrains Mono** for:
  - nav items, labels, badges, small copy, UI meta, pricing units
- Use a **neutral sans** for paragraph readability **only if needed** (optional). Default: JetBrains Mono everywhere except the hero H1.

### 1.2 Hero H1
- Use a higher-contrast “display” face (Resend-like sophistication).
- Recommended: **Fraunces** (variable), or **DM Serif Display** if you want crisper.
- H1 should use a **greyscale gradient** (white → light grey → white) to avoid flatness without “AI neon”.

### 1.3 Gradient text rule (greyscale only)
Allowed:
- `linear-gradient(180deg, #F4F6F8, #BFC7D0)`
- `linear-gradient(90deg, #F5F7FA, #D0D6DE, #F5F7FA)`
Not allowed:
- bright cyan/pink/purple gradients on headlines.

---

## 2) Visual tokens (update from v3)

### 2.1 Core palette
- Graphite background: near-black with paper grain
- Porcelain white: primary text/strokes
- Teal accent: `#0D9488` (sparing)
- Amber spark: `#F6B94C` (single-point, occasional)
- Violet-blue: `#6D5EF3` (rare highlight)

### 2.2 Materials (section differentiation without loud color blocks)
We want section boundaries to be obvious **without** “big color changes”.

**Allowed separators**
- Subtle material swap:
  - graphite paper grain → blueprint grid overlay → smoother “polished metal” gradient
- Halftone / risograph strip divider (your `Strip Divider.png`)
- Thin 1px hairline with tiny glow pulses tied to trace network
- Slight vignette shifts

---

## 3) Background systems: make them visible and meaningful

### 3.1 Particle field (hero: intense; rest: lower)
Must have:
- Movement (fast enough to feel “speed”)
- **Connections** when close (lines) to imply embeddings/graph
- Cursor attraction
- **Trace attraction**: particles subtly drift toward electric traces

Implementation note:
- Treat the trace SVG path as a set of attractor points (sample points along the polyline).
- Each particle applies a weak force toward nearest attractor when within a radius.

Visibility requirements:
- Particles and lines must be visible on graphite:
  - particles: off-white at low opacity
  - connection lines: very thin, fade by distance

### 3.2 Electric traces (missing today)
Must be **present across the whole page**, not just the hero.

Rules:
- Manhattan routing geometry (right angles, rounded corners)
- Draw as if it’s a hardware bus:
  - main trunk
  - branches to key sections (How it works, Pricing, Download CTA)
- Teal is *secondary*; porcelain is primary; **amber spark** at 1-2 junctions.
- Add a faint “current” motion (a traveling dash offset or pulse) when section becomes active.

Visibility requirements:
- Stroke width ~1–2px, with `vector-effect="non-scaling-stroke"`
- Add a very soft outer glow but keep it tight (avoid neon cloud)

---

## 4) Hero: pin + drag + flip into How It Works (critical)

### 4.1 Fix “too much scroll before page moves”
- Reduce hero scroll track height (target: 160–200vh total)
- If Lenis is causing heavy damping, reduce smoothing or disable until correct.

### 4.2 Hero deck behavior (the “cinematic”)
We want a two-face 3D card:
- Back face = video deck
- Front face = pipeline diagram preview (or first step of How It Works)

Scroll narrative:
1) Start: hero video visible, centered, large (not obscured by nav).
2) Scroll: deck pins; traces “power up”; ripple pulse triggers.
3) Mid-scroll: deck translates downward toward the How It Works section.
4) Flip: rotate 180° (X-axis) to reveal the pipeline face.
5) Handoff: the now-visible pipeline aligns with the How It Works sticky pipeline.

Implementation constraints:
- The card must **stay above** content during pin/flip (`z-index`, no stacking traps).
- Use `transform-style: preserve-3d` and `backface-visibility: hidden`.

### 4.3 Video load: no “template flash”
- Provide a `poster` frame and preload the video (`preload="auto"`).
- While loading, show a styled skeleton that matches the deck (not a generic template).

---

## 5) How It Works (keep — but add missing details)
- Keep existing sticky behavior (you said it’s great).
- Ensure “NO INDEXING” has:
  - the word “INDEXING” gets scribbled-out (use `Scribble.png`) via mask reveal.
- Pipeline nodes should have subtle glow and “current” when active.

---

## 6) Pricing: conversion-focused motion
Add:
- Animated monthly/annual toggle:
  - knob slides, background warms slightly, prices animate (count-up + crossfade)
  - annual shows subtle “save X%” badge
- Pro card: visible “lifted” material (see section 7), not just a teal outline.

---

## 7) 3D “lifted off the page” material (currently not visible)
Where:
- Hero deck
- How it works pipeline card
- Pro pricing tier
- Optional: final CTA

How:
- 1px border + inner highlight
- soft shadow with **two-layer** drop (tight + wide)
- tiny specular highlight gradient at top edge
- no big glow clouds

---

## 8) Remove the “AI layer” (style guardrails)
If anything looks like generic AI SaaS:
- Remove rainbow gradients
- Remove oversized rounded pills
- Remove “mystical” glow backgrounds
- Reduce iconography and generic security illustrations

Replace with:
- diagrams, hardware metaphors, precise typography
- subtle materials, crisp edges, purposeful motion

---

## 9) Add 1–2 sections (to avoid feeling too short)
No “privacy first” template block.

Add instead:
### 9.1 “Meeting rescue” story (universal use case)
- A short sequence: Calendar → Meeting notes PDF → “Where’s that quote?” → Ixos finds instantly.
- Can be done as a mini timeline card with micro animations.

### 9.2 “Benchmarks / speed receipts”
- Minimal chart or number tiles:
  - “query → results in X ms”
  - “JIT embeddings: created → deleted”
- Keep it monochrome; accents only on deltas.

---

## 10) Assets integration fixes
- `Strip Divider.png`: should be treated as a texture strip; ensure correct blend + opacity and no awkward scaling.
- `Scribble.png`: used specifically for the “INDEXING” strike.
- `Icon.png`: use in nav + favicon; ensure crisp at 32/48/64.

---

## 11) Definition of Done (v3 → v3.1)
- Particles visible behind all sections; hero more intense; connections visible.
- Electric traces visible across page + animate on section entry.
- Hero pins correctly, stays on top, drags down, flips into pipeline.
- No template flash at load.
- JetBrains Mono applied; hero H1 uses display font with greyscale gradient.
- Pricing toggle animation feels premium; Pro card lift visible.
- Section material changes are subtle but clear; arc-like noise present.
- “Built for privacy” AI-ish block removed/replaced with the two sections above.

