# Page /2 — "Signal Architecture"

## Concept
A live architectural diagram of the search pipeline — like a network topology map of your local filesystem's intelligence layer. The 3D object (currently a useless sphere) should BE the data. The hero 3D object becomes a semantic embedding space visualization.

## Inspiration
- Augment Code: Node/graph visualization for semantic understanding (EXACT reference for the embedding space section — dark panel with dots/nodes connected by weighted lines, labeled clusters)
- Convex: 3D infrastructure diagram built from CSS, informational 3D that explains the product

## Color Assignment
- Primary: Teal (#14B8A6 / #2DD4BF) — architectural, cool, precise
- Secondary: Amber (#F6B94C) — hot spots, query hits, active nodes
- Violet: depth layers in the 3D lattice
- Background: Deep space #080c14 (darker than standard)

## Background
Deep dark (#080c14) with a subtle CSS star-field:
```tsx
// ~200 tiny dots, 1px, white/5 to white/20, fixed position
// Rendered in a canvas or via CSS box-shadow trick
// Stars cluster slightly toward center
// Extremely subtle — just depth, not decoration
```

## REPLACE THE ORB — New 3D CSS Embedding Lattice

The VaultCore / sphere must be replaced with a CSS 3D lattice. This is the centerpiece.

```tsx
// CSSLattice component
// - 5x5x5 grid of dots in 3D perspective space (125 nodes)
// - Rendered with CSS transform-style: preserve-3d and perspective: 900px
// - Each node: small 4px circle, teal/10 default, amber when "matched"
// - ~20 connecting lines between nearby nodes (SVG or CSS transforms)
// - Slow idle rotation: rotateY(360deg) over 30s, rotateX(10deg) constant
// - On "query hit": 15 nodes along a path light up amber sequentially (staggered 40ms)
// - The amber path represents the semantic match route through embedding space
```

Implementation:
```tsx
const nodes = Array.from({ length: 125 }, (_, i) => ({
  x: (i % 5 - 2) * 80,  // -160 to 160
  y: (Math.floor(i / 5) % 5 - 2) * 80,
  z: (Math.floor(i / 25) - 2) * 80,
  active: false,
}))
// position each node with: transform: `translate3d(${x}px, ${y}px, ${z}px)`
```

The lattice sits in the hero BEHIND the centered text. It does NOT block the mockup.

## Hero Layout
- Centered layout (not split screen)
- Large headline: "The Local Index." (keep)
- Subtitle: "A cryptographically signed vector index that never leaves your machine."
- CTA buttons below
- Below that: the CSSLattice (300px height, visible through subtle fog fade at edges)
- Below lattice: the DemoSurface mockup (full width, fixed height 480px)

## Pipeline Section
Replace SVG dashed-line connector with animated SVG `stroke-dashoffset`:
- 4 stage cards in a horizontal row
- Connecting lines between them animate left-to-right with a flowing dot
- When stage card enters viewport, it "activates": border color shifts from white/8 to teal/40

## NEW: Embedding Space Section
This is a showcase unique to /2. Draw directly from Augment's "Context Engine" visualization:

```
REALTIME RAW CONTEXT    SEMANTIC UNDERSTANDING    CURATED RESULTS
Code         ●●●●       [file node scatter plot]   auth/token.ts  0.92
Dependencies ●●●●                                   middleware.ts  0.87
Tests        ●●●●       [connected graph of         config.ts      0.81
                         file nodes with labels]
4,456 sources → 682 relevant
```

- Left column: input dimensions (file types, depths)
- Center: the node graph (dots = files, weighted edges = semantic proximity, labeled clusters)
- Right: curated results list with scores
- Animated: nodes appear one by one, edges draw in, results count up
- This teaches users HOW semantic search actually works

## Speed Metrics
Keep the massive typographic stats but animate them as odometers:
- "Sub-second" → keep text
- "312 files" → count up 0 → 312 over 1.6s
- "94% cache hit" → count up 0 → 94 over 1.2s

## Score Visualization
The lexical vs semantic score bars — make them:
- Taller bars (not thin)
- Animated fill (0% → final% on scroll entry)
- Teal for semantic, amber for lexical, white/30 for combined

## Workstreams Section
Use the TodaySurface or WorkstreamsSurface in a dark glass panel. Fixed height 400px.

## CTA / Footer
Keep email signup. Add: a subtle teal beam that sweeps under the CTA section.

## What to Remove
- The existing VaultCore / sphere (entirely)
- Any parallax that causes layout shift
- The opaque background panels that block the star-field

## File to Modify
`ixos-site/src/app/2/page.tsx` — major rework (~800 lines, most sections need visual redesign)
