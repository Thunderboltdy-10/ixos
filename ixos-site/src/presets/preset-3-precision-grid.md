# Page /3 — "Precision Grid"

## Concept
A military-grade precision instrument. The page is a radar / HUD scanning system. Content appears to be "decoded" by a scanning beam sweeping down the page. Think: classified terminal access, declassified documents being revealed in real-time.

## Inspiration
- Augment Code: Dark grid background — the subtle grid lines visible in their hero are EXACTLY right
- Greptile: Light sections that transition to dark mid-page (contrast creates drama)
- Terminal/CLI aesthetic: ASCII borders, monospace everything

## Color Assignment
- Primary: Amber (#F6B94C) — the scan beam color, active elements, highlights
- Secondary: Green-tint (#22C55E at 0.6 opacity) — the grid lines (slight military green)
- Background: #0A0D0F with grid overlay
- Text: Porcelain (#F3F5F7) for body, amber for headers

## Background (CRITICAL NEW ELEMENT)
```css
.grid-bg {
  background-color: #0A0D0F;
  background-image:
    linear-gradient(rgba(246, 185, 76, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(246, 185, 76, 0.04) 1px, transparent 1px);
  background-size: 48px 48px;
}
```

The grid should be very subtle (0.04 opacity). Slightly brighter at grid intersections.

## SCAN BEAM (Core Animation)
A horizontal scan beam sweeps from top to bottom on page load:
```tsx
// ScanBeam component
// - A 2px amber line, full viewport width
// - Below the line: a gradient fade (amber/5 → transparent, 60px height)
// - CSS box-shadow on line: 0 0 12px 2px rgba(246,185,76,0.4)
// - Animates top: 0vh → 110vh over 3.5 seconds on mount
// - After reaching bottom, fades out and resets to idle (very subtle amber glow at screen edges)
// - On scroll: beam subtly brightens around the active section's y position
```

The beam REVEALS content as it passes. Sections below the beam start as:
- Opacity: 0.05 (barely visible grid)
- After beam passes: animate in over 600ms

## Section Entry Animation: DECODE EFFECT
Each section header (h2) uses a character decode animation:
```tsx
// On section entry:
// 1. Characters start as random ASCII: █ ░ ▓ ▒ # @ ! ?
// 2. Every 40ms, one more character "resolves" to the real character
// 3. Done in 400ms total
// Duration: text.length * 40ms (max 600ms)
```

Content paragraphs: standard fade-up (no decode — too slow for body text).

## Corner Bracket Decoration
ALL major cards and sections get corner brackets:
```tsx
// CornerBracket component — absolutely positioned spans
// Top-left: border-left + border-top (2px amber/30)
// Top-right: border-right + border-top
// Bottom-left: border-left + border-bottom
// Bottom-right: border-right + border-bottom
// Each bracket: 16px × 16px
```

## SIGNAL LOCKED Stamps
Each section, after its content loads, gets a "SIGNAL LOCKED" badge:
- Small pill: `[ ■ SIGNAL LOCKED ]` in amber/60, monospace, uppercase
- Appears with a 200ms delay after section content finishes loading
- Placed at top-right of section

## MinimalCalibration Connector Upgrade
Transform it into a full scan-beam-aware connector:
- Left rail: vertical amber line with tick marks every 60px
- Each tick: labeled with section ID (01, 02, 03...)
- Active tick: bright amber with a horizontal beam extending 40px right
- Right rail: same pattern but mirrored
- Center scan line: moves with the scroll-driven scan beam position

## Sections to Keep (enhanced with above)
1. Hero — scan beam reveals, decode effect on headline
2. Speed — scan-line counter metrics
3. Privacy Blueprint — corner-bracketed 3x2 grid
4. Pipeline — 4-stage HUD with activation sequence
5. Result Anatomy — decoded result card

## NEW SECTIONS to ADD

### "THREAT MODEL" Section
```
[ ■ THREAT MODEL ]
┌─────────────────────────────────────────────┐
│                                             │
│  Cloud search sends your code to servers.   │
│  Every query. Every file. Logged forever.   │
│                                             │
│  IXOS SENDS: 0 bytes.                       │
│                                             │
│  ██████████████████████ CLOUD: 2.4GB/month │
│  ▌                      IXOS:  0 B         │
│                                             │
└─────────────────────────────────────────────┘
```
Two bars: cloud (long amber/red) vs ixos (empty/0). Dramatic comparison.

### "SIGNAL FEED" Section
Live-scrolling log simulation:
```
[14:32:11] SCAN  src/auth/token-manager.ts      ████░ 0.78
[14:32:11] EMBED model2vec f16 vector            DONE
[14:32:11] HMAC  sha256 signature verified       LOCKED
[14:32:12] RANK  hybrid_engine.rs candidates=47  READY
[14:32:12] CACHE ADS write completed             ✓
```
New log lines append every 1.2s. Scrolls automatically. Infinite loop of canned data.

## Desktop Mockup (in Hero)
- Fixed height 480px, overflow hidden
- Show search view only
- The scan beam should pass OVER the mockup frame (the beam is positioned above everything)

## What NOT to Carry Over from Old /3
- The clip-path RippleReveal (remove — too soft for this theme)
- The SlashReveal (remove)
- The LoopingCards (transform into the SIGNAL FEED instead)
- Any soft rounded gradient backgrounds
