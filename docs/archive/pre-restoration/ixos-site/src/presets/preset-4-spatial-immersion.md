# Page /4 — "Spatial Immersion"

## Concept
The most ambitious page. The whole page IS the desktop app. Users are outside looking at a floating app in space, then scroll and enter it. Once inside, landing page content lives within the app's search results. Every section = a different search result being explored.

## Color Assignment
- Primary: Violet (#7C5CFF / #7C3AED) — the void/space color, depth
- Secondary: Amber (#F6B94C) — active results, glowing elements
- Background: True void (#04050A) — almost pure black with violet radial clouds

## Background: Nebula Void
```css
.void-bg {
  background: #04050A;
  /* Multi-layer radial gradients for nebula effect */
  background-image:
    radial-gradient(ellipse 80% 60% at 20% 30%, rgba(124, 92, 255, 0.08) 0%, transparent 70%),
    radial-gradient(ellipse 60% 80% at 80% 70%, rgba(124, 58, 237, 0.06) 0%, transparent 70%),
    radial-gradient(ellipse 40% 40% at 50% 10%, rgba(246, 185, 76, 0.03) 0%, transparent 60%);
}
```

## THE SCROLL JOURNEY (Core Architecture)

### Phase 1: THE VOID (scroll 0–25%)
The desktop app floats in 3D space, small and distant.

```tsx
// ScrollStage component
// Uses useEffect + scroll listener to drive CSS custom properties
// --scroll-progress: 0 to 1

// AppFrame starts at:
transform: `perspective(1200px) translateZ(-500px) rotateX(8deg) rotateY(-3deg) scale(0.55)`
opacity: 0.8

// As --scroll-progress goes 0 → 0.25:
// translateZ: -500px → -100px
// scale: 0.55 → 0.85
// rotateX: 8deg → 2deg
// rotateY: -3deg → 0deg
// opacity: 0.8 → 1
```

Around the floating app: violet particle field (150 particles, slow drift, orbital paths).

```tsx
// OrbitalParticles: particles orbit the app frame center on elliptical paths
// Speed: very slow (one orbit every 12-20s, randomized)
// Color: violet/30 to violet/60
// Size: 1-3px
```

### Phase 2: ZOOM IN (scroll 25–50%)
The camera moves forward. The app grows to fill the viewport.

```tsx
// AppFrame:
// translateZ: -100px → 0px
// scale: 0.85 → 1.0
// rotateX: 2deg → 0deg
// The app border/shadow fades as we get "inside"
// Background: void transitions to the app's graphite-0
```

During zoom: a brief "ENTERING IXOS PROTOCOL" text appears, centered, fades after 800ms.

### Phase 3: INSIDE THE APP (scroll 50–100%)
We're inside. The viewport IS the app. Sections are search results.

The sidebar is always visible (sticky left). The main panel shows the "active result" which changes as you scroll between sections.

```tsx
// InsideApp layout:
<div className="flex h-screen sticky top-0">
  <AppSidebar /> {/* 240px, always visible */}
  <div className="flex-1 overflow-hidden">
    <SearchBar /> {/* Fixed, always visible */}
    <ActiveResult /> {/* Changes based on scroll position */}
  </div>
</div>

// Below the sticky shell: each section is a "result" that expands
// when scrolled into view
```

## The Sidebar (fake, not interactive)
```tsx
// Renders a non-interactive sidebar:
// - Ixos brand mark + "Protocol"
// - Nav: [Search] [Today] [Workstreams]
// - Session: "ixos-spatial-demo"
// - Recent: 5 fake query history items
// - No real interaction — visual only
```

## The Sections as Result Cards
Each of the 15 sections becomes an "expanded result card":

```
01  src/storage/validator.ts           0.97 ████████████████████
    STORAGE · cache-anywhere · Why this matched

    ┌──────────────────────────────────────────────────────────┐
    │  [Section content rendered here — the full feature       │
    │   description, stats, diagrams, etc.]                    │
    └──────────────────────────────────────────────────────────┘
```

As you scroll between sections:
- The result rank number (01, 02, 03...) is visible in the sticky SearchBar area
- The score bar at top right fills with amber
- Match labels update (STORAGE, SECURITY, PERFORMANCE, etc.)

## OrbitalPath Connector (New)
```tsx
// OrbitalPath.tsx — draws circular paths between section nodes
// Each section node = a small planet
// Orbital rings connect them in an arc
// Active section: its planet glows amber, orbit ring brightens
// SVG paths with strokeDashoffset animation
// The "sun" at center = the search query
```

## Specific Visual Elements

### App Frame Decoration (Phase 1 & 2)
The floating app has:
- Glowing violet border: `box-shadow: 0 0 60px rgba(124,92,255,0.3), inset 0 0 30px rgba(124,92,255,0.05)`
- Title bar: "IXOS PROTOCOL — Local Search Engine" in monospace
- Three traffic light dots (decorative)
- Subtle scan lines on the app surface (CSS animation)

### ENTERING text (Phase 2 transition)
```tsx
// Appears when scroll reaches 35%, disappears at 50%
<div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
  <span className="text-xs tracking-[0.4em] text-amber-400/60 font-mono uppercase">
    entering ixos protocol
  </span>
</div>
```

### Inside section headers
Once inside, section headers become result-style:
```
[ 03 ]  src/ixos_embed/secure_embedder.rs  [ 0.89 ]  SECURITY
```

## Performance Note
This page will be heavy. Use:
- `will-change: transform` on the AppFrame
- `requestAnimationFrame` for the scroll listener (not onScroll directly)
- `useReducedMotion` hook — if reduced motion preferred, skip the zoom and show sections statically

## New Files to Create
```
ixos-site/src/app/4/
├── page.tsx (new, ~150 lines — sets up ScrollStage)
├── _spatial/
│   ├── ScrollStage.tsx      (scroll-driven perspective manager)
│   ├── VoidPhase.tsx        (phase 1: floating app)
│   ├── ZoomPhase.tsx        (phase 2: camera forward)
│   ├── InsidePhase.tsx      (phase 3: inside the app)
│   ├── AppFrame.tsx         (the app shell, visual only)
│   ├── AppSidebar.tsx       (static fake sidebar)
│   ├── ResultSection.tsx    (section as search result wrapper)
│   ├── OrbitalParticles.tsx (particles orbiting the app)
│   └── EnteringText.tsx     (the transition overlay)
```

## What to Remove
Everything currently in `ixos-site/src/app/4/` can be replaced. The _v4/ components are good but /4 needs to be a complete reimagination. You may import V4FileScan, V4Stats, V4Pipeline for the section content inside the result cards, but the shell is entirely new.
