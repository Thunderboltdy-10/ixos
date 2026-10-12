# Landing Variant Status

Shared status file. Each agent (/1 /2 /3) writes to their section.
/5 is canonical and must NOT appear here as changed.

---

## /1 — Result Morph Stories
**Status**: complete
**Agent**: Agent-1

### Implementation Summary

**Files created:**
- `ixos-site/src/app/1/page.tsx` — Route entry point (imports V1Page)
- `ixos-site/src/app/1/layout.tsx` — Metadata for the /1 route
- `ixos-site/src/app/1/_v1/V1Page.tsx` — Main orchestrator; wires all 15 sections, connector, nav, footer
- `ixos-site/src/app/1/_v1/V1Nav.tsx` — Navigation bar (V4Nav visual style, no framer-motion, scroll-aware border)
- `ixos-site/src/app/1/_v1/V1Footer.tsx` — Simple footer, dark theme, monospace
- `ixos-site/src/app/1/_v1/V1Section.tsx` — Result Morph section: collapsed row → expanded bento, 3D shell tilt (8deg max), LOCKED badge, DemoSurface wiring
- `ixos-site/src/app/1/_v1/V1Connector.tsx` — Query Pulse Thread SVG overlay: animated dashed line, tone-colored nodes, animated pulse dot traveling to active section on spring physics, hover labels, click dispatches v4:pulse
- `ixos-site/src/app/1/_v1/V1JumpNav.tsx` — Fixed bottom-right dot stack, active dot filled + glowing, hover tooltip, click scrolls

**Design:**
- Background: V4AmbientField (pixel-square ripple) imported from /5 — unchanged
- Loader: V4Loader imported from /5 — unchanged
- 15 sections, all matching the canonical section list
- Each section morphs from a 72px collapsed search-result row to a 340-500px bento on scroll entry
- Left 55%: claim, bullets, source ref, mode toggle buttons
- Right 45%: DemoSurface (shared, single source of truth)
- 3D tilt applied ONLY to the card shell (perspective: 1400px, max 8deg), inner content stays flat
- Lock state triggers after 800ms in-view: border flash, glow on demo panel, LOCKED badge (fades 2s)
- Connector: fixed left-edge SVG at x=28, gradient cyan→violet dashed line, spring-animated pulse dot

---

## /2 — Pipeline Ribbon Flyover
**Status**: complete
**Agent**: Agent-2

### Implementation Summary

**Connector file**: `src/landing/connectors/PipelineRibbon.tsx`
**Route**: `/2` (uses `LandingCore` + `PipelineRibbonFlyover` connector)
**Build**: passes (static prerender `○ /2`)

### Root cause fixed

The previous connector used `useCallback` but did not import it from React, causing a
`ReferenceError: useCallback is not defined` that crashed prerendering for the entire
`/2` page. All hooks are now properly imported.

### Connector design (right-edge pipeline ribbon)

**Layout**: Fixed 60px overlay pinned to the right edge (right:0, top:0, height:100vh,
z-index:20). Container is pointer-events:none; diamond markers have pointer-events:all.

**Ribbon anatomy (SVG)**:
- Static dim spine: 1px vertical line at x=30, `rgba(255,255,255,0.07)`
- Flowing animated dashes: `strokeDasharray="8 6"`, animated `strokeDashoffset` 0→−280,
  cyan→violet→amber gradient, with glow filter
- Active segment highlight: spine segment above the active station brightens on entry

**Station markers (diamond)**:
- `<motion.rect>` rotated 45deg — 8px default, 10px hovered, 12px active
- Tone colors: cyan `#2DD4BF`, amber `#F59E0B`, violet `#7C3AED`
- Active: full color fill + glow; Visited: 70% fill; Future: transparent + 28% stroke

**Lock-in burst (on section enter)**:
- 3 `<motion.circle>` rings expand from r:8 to r:28/38/48, opacity 0.85→0
- Burst key incremented per activation to force remount of animation

**Flow speed adapts to active section tone**:
- cyan → 3s (fast/Flash-like), amber → 5s (medium), violet → 8s (slow/Pro-like)

**Hover label**: `<foreignObject>` left of the ribbon, styled rank + title pill in tone color.

**Click**: smooth scroll to section + `pulseAt` ripple at 350ms delay.

### 6 micro-animations
1. Continuous ribbon flow (strokeDashoffset infinite loop, speed tied to active tone)
2. Station lock-in burst (3 expanding concentric rings on section activation)
3. Active segment brightening (spine highlight above active station, animate in/out)
4. Diamond size transition (8→12px on active, spring via motion.rect animate prop)
5. Hover label fade in/out (AnimatePresence, 0.12s)
6. Tone indicator breathing (opacity pulse at half the ribbon speed)

### 3 user interactions
1. Hover station: shows `{rank} {title}` label to the left of the ribbon
2. Click station: smooth-scrolls to section, fires ripple pulse
3. Ribbon flow speed visibly changes when scrolling between tone zones

---

## /3 — Calibration + Phase Lock
**Status**: complete
**Agent**: Agent-3

### Implementation Summary

**Files created:**
- `ixos-site/src/app/3/page.tsx` — Route entry point (imports V3Page; replaces old LandingCore-based stub)
- `ixos-site/src/app/3/layout.tsx` — Metadata for the /3 route
- `ixos-site/src/app/3/_v3/V3Page.tsx` — Main orchestrator; wires all 15 sections, rails, nav, footer; manages loaded/activeSectionId state
- `ixos-site/src/app/3/_v3/V3Nav.tsx` — Navigation bar (V4Nav visual style, scroll-aware border, backdrop blur)
- `ixos-site/src/app/3/_v3/V3Footer.tsx` — Simple dark footer, monospace
- `ixos-site/src/app/3/_v3/V3Section.tsx` — Calibration frame section renderer: corner brackets (spring-animated on inView), measurement ticks (10 top + 10 bottom, sequential appear), cursor-follow ring (onMouseMove), LOCAL privacy badge (constant, always visible), two-column layout (bullets left / DemoSurface right with 3D hover tilt), score tick progress bar, mode/tab toggle buttons with whileTap + v4:pulse dispatch
- `ixos-site/src/app/3/_v3/V3Rails.tsx` — Left+right calibration tick rails (28 ticks each, aligned zone shifts on active section), phase-lock concentric ring pulses (3 rings, expand+fade on section enter), horizontal scan line sweeps viewport on each section transition
- `ixos-site/src/app/3/_v3/V3JumpNav.tsx` — Fixed bottom-right dot stack, active dot filled + glowing, hover tooltip, click scrolls to section

**Design:**
- Background: V4AmbientField (pixel-square ripple) imported from /5 — unchanged
- Loader: V4Loader imported from /5 — unchanged
- 15 sections, all matching the canonical section list with correct demoView/demoQuery/featureBullets
- Each section: calibration frame with 1px tone-colored border (opacity animates on inView), L-shaped corner brackets (12px arms, spring scale 0→1 staggered), 10 ticks top+bottom edges
- LOCAL privacy badge: constant on every section, teal (9px monospace, rgba(45,212,191,0.3) border)
- Cursor-follow ring: 40px circle tracks mouse inside card at 0.25 opacity
- DemoSurface: lazy-rendered when inView, subtle 3D hover (rotateX -3deg, perspective 1600px)
- Rails: 28 ticks per side, aligned zone (longer/brighter) smoothly shifts to track active section
- Phase lock: 3 concentric expanding rings from center on section transition
- Scan line: 1px gradient sweeps full viewport width on section change
- Zero TypeScript errors introduced by /3 files
