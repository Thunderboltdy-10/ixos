# Page /5 — "Director's Cut"

## Concept
The most refined, polished version. Keeps the current electric-background aesthetic but fixes every broken element. This is the showstopper — the page that makes someone say "I need this app."

## Color Assignment
- Primary: Amber (#F6B94C) — ALWAYS. Every hero element, every CTA, every key stat.
- Secondary: Teal (#14B8A6) — secondary, evidence, pipeline progress
- Violet: Pro features, deep search
- Background: #0E1117 with electric traces and particle field

## Critical Fixes (Do These First)

### Fix 1: Hero Color — Amber Primary
In `V4Hero.tsx`:
- ALL teal highlights → amber
- `text-teal-400` → `text-amber-400`
- `bg-teal-400/10` → `bg-amber-400/10`
- `border-teal-400/30` → `border-amber-400/30`
- The "Run Search" / primary action button → `bg-amber-500 hover:bg-amber-400 text-graphite-0`
- The score result highlights → amber instead of teal

### Fix 2: Pipeline Section Background
In `V4Pipeline.tsx`:
- Remove any `bg-black`, `bg-graphite-0`, `bg-[#0E1117]` applied directly to the section
- Set to `bg-transparent` so the electric background field shows through
- If sections need contrast from each other, use `bg-gradient-to-b from-transparent via-graphite-0/20 to-transparent`
- The stage cards themselves keep their dark glass styling

### Fix 3: Scroll-Pinned Results Blocking Text
In `SearchResultStackConnector.tsx`:
- The connector currently may cause result cards to be `position: sticky` or `fixed`
- Change any fixed/sticky positioned result overlays to `position: relative`
- The connector should be purely behavioral (fires ripple pulses) with no visible DOM elements that persist on screen
- If there are visible result cards: wrap them in `pointer-events-none` at minimum, or remove entirely

### Fix 4: Background Dimming on Scroll
In `V4AmbientField.tsx` or wherever the electric field/particles are rendered:
```tsx
// Add scroll listener:
useEffect(() => {
  const onScroll = () => {
    const progress = window.scrollY / (document.body.scrollHeight - window.innerHeight)
    // 0% scroll = 1.0 intensity, 60%+ = 0.3 intensity
    const intensity = Math.max(0.3, 1 - progress * 1.15)
    setFieldIntensity(intensity)
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  return () => window.removeEventListener('scroll', onScroll)
}, [])
// Apply intensity to the ambient field's opacity:
// <div style={{ opacity: fieldIntensity }}>
```

### Fix 5: Electric Traces Visibility in Hero
Find where ElectricTraces is rendered in the /5 hero area:
- Increase stroke width: 1px → 1.5px
- Increase opacity: 0.3 → 0.5 (base), 0.8 (on hover or pulse)
- The electric pulses (traveling dots) should be more frequent: every 2s → every 1s

### Fix 6: Text Legibility Over Background
For any section where text sits directly on the electric field background:
```tsx
<div className="relative">
  {/* Scrim behind text for legibility */}
  <div className="absolute inset-0 bg-gradient-to-b from-graphite-0/30 via-transparent to-graphite-0/30 pointer-events-none" />
  {/* Content */}
  <div className="relative z-10">
    {children}
  </div>
</div>
```

## Hero Enhancement (Beyond Color Fix)
- Keep the current V4Hero animation sequence (typing → local → deep → locked) — it's great
- The desktop preview in hero: ensure Flash/Auto/Pro mode toggles are visible
- Add a subtle amber glow emanating from the search bar in the preview: `box-shadow: 0 0 40px rgba(246,185,76,0.15)`
- Below the hero CTA: add the 4-stat KPI strip (100% Local | 0 B Data | <800ms | 250+)

## V4Pipeline Section
After applying Fix 2 (transparent bg):
- The stage cards (JIT Scan → Lexical → Semantic → Hybrid Merge) should have `backdrop-blur-sm`
- Their borders: `border border-white/8 hover:border-amber-400/30`
- The flowing arrows between stages: amber color with `stroke-dashoffset` animation

## V4FileScan Section
- The "312 files" count-up should feel faster: 600ms instead of 1600ms
- The 3D perspective tilt on the tree card — make the mouse tracking more responsive (reduce the spring stiffness)
- The STRATEGY/PARALLELISM/TELEMETRY status strip: amber status dots

## V4Stats Section
- The ~7ms stat: amber accent (it's the most impressive stat)
- The 0 daemons stat: teal accent (this is the privacy/safety statement)
- The <800ms stat: violet accent (it's the compound result)
- All SVG tick rules: amber/30

## SearchResultStack Connector Improvements
The connector fires ripple pulses on section entry. Enhance:
- Pulse at section ORIGIN (already does this)
- After pulse: a brief amber "ring" expands from the origin point (CSS animation, z-50, pointer-none)
- The ring should match the section's tone color (amber/teal/violet based on section rank)

## Scroll Progress Indicator
Add a thin amber progress bar at the very top of the viewport (not the nav):
```tsx
<div
  className="fixed top-0 left-0 h-[2px] bg-amber-500 z-50 origin-left transition-transform"
  style={{ transform: `scaleX(${scrollProgress})` }}
/>
```

## Section: V4Benchmarks / V4ComputeBudget
These sections (if currently transparent background): ensure they show through to the electric field.

## What to KEEP (Don't Break These)
- The results-appear animation on load ("/5" launch animation that the user loves)
- The LandingCore architecture and all 15 sections
- The V4 component system (V4FileScan, V4Pipeline, V4Stats, V4Hero)
- The existing SearchResultStackConnector connection logic (ripple behavior)

## Build Safety
After changes, verify:
- `cd ixos-site && npm run build` passes
- No "use client" missing from components using hooks
- No undefined exports from V4 components
