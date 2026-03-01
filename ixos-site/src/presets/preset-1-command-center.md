# Page /1 — "Command Center"

## Concept
Military operations center. Every piece of info is LIVE. The page feels like mission control actively monitoring your filesystem. Amber = alert/active. Teal = all clear/verified.

## Inspiration
- Superhuman: Bento grid feature cards, large section typography, smooth app transitions
- Augment: Split layout (content left, app preview right), technical precision, dark grid

## Color Assignment
- Primary: Amber (#F6B94C) — hero text accent, CTAs, active states
- Secondary: Teal (#14B8A6) — evidence, verified states, "success"
- Violet: Pro features only
- Background: #0E1117 with ArcNoise texture

## Background
Keep existing ArcNoise + ParticlesField. ADD a scroll-driven amber radial spotlight:
```css
background: radial-gradient(600px circle at var(--spotlight-x) var(--spotlight-y), rgba(246, 185, 76, 0.04) 0%, transparent 70%)
```
Update `--spotlight-x` and `--spotlight-y` via scroll listener to track the center of the active viewport section.

## Hero (CRITICAL FIXES)
- Left: text content — "Search reimagined locally. Every file remembered." where "Every file remembered." is amber with a subtle text-shadow glow
- Add blinking cursor `|` after the hero heading that pulses every 1.2s
- Right: Desktop mockup — FIXED HEIGHT 520px, overflow hidden. Always shows Flash/Auto/Pro buttons and model selector.
- CTA buttons: Primary = amber filled (`bg-amber-500 text-graphite-0`), Secondary = ghost

## Desktop Mockup Fix (REQUIRED)
```tsx
<div className="relative overflow-hidden rounded-xl border border-white/8" style={{ height: '520px' }}>
  <AppWorldSurface /* props */ />
</div>
```
The mockup should only show the Search view (not sidebar nav tabs). Keep it focused. The search bar must always show the mode toggle (Flash | Auto | Pro).

## Section Reveals
Each section uses a DIFFERENT directional clip-path wipe:
- Hero stats: fade up (standard)
- Pipeline Phase 1: wipe from LEFT → RIGHT
- Pipeline Phase 2: wipe from RIGHT → LEFT
- Evidence: wipe from BOTTOM → TOP
- Modes: wipe from TOP → BOTTOM
- Today/Workstreams: fade up with scale(0.96→1)
- CLI: wipe from LEFT → RIGHT
- Privacy: stagger grid cells

## KPI Stats Strip (below hero)
MUST use count-up animation (RAF + easeOutCubic). Count up over 1200ms when section enters viewport.
- 100% → counts from 0 to 100
- 0 B → stays 0 (no animation needed)
- <800ms → counts from 0 to 800 with "<" prefix
- 250+ → counts from 0 to 250 with "+" suffix

## Section Enhancements
- Add corner bracket decorations to all dark card sections (amber, 0.2 opacity)
  ```
  ┌─────────────────────┐
  │  content            │
  └─────────────────────┘
  ```
  Use CSS pseudo-elements or absolutely positioned spans.
- Section labels (e.g., "PIPELINE", "EVIDENCE") should be in uppercase amber monospace, tracking-widest

## KineticQueryThread Connector Upgrades
- When section becomes active, the spline node at that section's ripple origin should BURST (scale 1→2→0 ring)
- The spline color: starts amber (#F6B94C), transitions to teal (#14B8A6) once search "locks"
- Add 3 traveling "packets" along the spline (small amber dots moving from search box to current section)

## Bento Feature Grid (new section after CLI)
Replace or expand the current Privacy/Proof grid with a Superhuman-style bento layout:
- 6 cards in a grid: [2-wide card] [1-wide] [1-wide] / [1-wide] [2-wide card]
- Cards: No Cloud Index | HMAC-SHA256 | mlock Memory | Timing Protection | Ephemeral Mode | Local-Only
- Each card: corner bracket decoration, small icon, stat number, description
- Hover: subtle amber glow on border

## What NOT to Change
- The educational content structure (Pipeline, Evidence, Modes sections) — just enhance visually
- The DemoSurface integration — keep existing queries
- Nav structure and pricing section
