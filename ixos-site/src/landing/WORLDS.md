# Ixos Landing Worlds

## World 1: DEMO-DRIVEN WORLD - "The Live Console"
**Pitch:** A highly interactive, scrollytelling journey where the product demo acts as the anchor, morphing its state to explain every technical capability as you scroll vertically.
**Signature System:** Pinned progressive demo. The central UI is fixed; as you scroll past sections, it live-updates (types a query, switches to semantic mode, breaks down a score) while narrative text scrolls alongside it.
**Hero Concept:** "Search reimagined locally." The user is instantly met with a massive, live-feeling search bar that types out a complex query, highlighting the speed and depth of the engine.
**Motion Language:** Snappy, instantaneous transitions mirroring a low-latency local tool. Sticking, pinning, and releasing based on vertical scroll.
**Section Blueprint:**
1. **Hero:** Pinned demo + headline + CTAs.
2. **Trust Strip:** Local-first, privacy-focused, speed metrics.
3. **Progressive Pipeline 1:** Lexical scan state (Demo updates).
4. **Progressive Pipeline 2:** Semantic index state (Demo updates).
5. **Evidence Drawer:** Expanding the "why matched" surface (interactive drawer).
6. **Result Anatomy:** Zooming into the score breakdown and code snippet.
7. **Modes/Quality:** The budget dial (balancing speed vs. exhaustiveness).
8. **Today/Workstreams Deep Dive:** DemoSurface #2 (managing context).
9. **CLI Workflows:** Real command examples, dark mode terminal aesthetic.
10. **Proof/Transparency:** File path routing and source labels.
11. **Pricing/Plans:** Clean, grid-based pricing.
12. **FAQ & CTA Footer:** Tight accordions and final hook.
**DemoSurface Usage:** 1. Pinned in the Hero (Sections 1-4). 2. Today/Workstreams Deep Dive (Section 8).
**Typography:** Display: Clash Display or Space Grotesk. Body: Inter. Monospace: JetBrains Mono for labels.
**Color Plan:** Deep Amber glows driving the primary actions; Teal for "Semantic" badges; Purple for "Lexical/Code" badges.
**Risk & Fallback:** If JS intersection observers fail, it degrades into a standard two-column alternating stack.

## World 2: 3D ATMOSPHERE WORLD - "The Vault"
**Pitch:** A premium, cinematic experience that feels like stepping into the high-speed, secure core of an index.
**Signature System:** A single, continuously morphing 3D artifact (the "Index Core") with an Amber center and Teal/Purple interference, reacting subtly to scroll depth.
**Hero Concept:** "The Local Index." A massive, slowly rotating geometric core that feels both ancient and hyper-modern, framing the primary search UI.
**Motion Language:** Ethereal, depth-driven. Parallax layers. Sections feel like descending into different floors of a vault.
**Section Blueprint:**
1. **Hero:** 3D Core + primary DemoSurface + "Unlock your codebase."
2. **The Vault Floor:** Local-first security narrative.
3. **The Indexer:** How the engine builds the index (fast lines drawing).
4. **Speed Metrics:** Big numbers, glowing typography.
5. **Search Accuracy:** Score breakdown visual (non-demo UI primitives).
6. **Code Snippets:** High-fidelity code blocks, syntax highlighting.
7. **The Evidence:** Why a result matched.
8. **Deep Dive:** DemoSurface #2 appearing from the "depths."
9. **Privacy First:** Diagram built from real UI chips (No cloud icons).
10. **Integration:** Tools and ecosystems.
11. **Pricing:** Monolithic, carved-stone aesthetic cards.
12. **CTA Footer:** The 3D core fades out, leaving a stark input box.
**DemoSurface Usage:** 1. Floating in the Hero. 2. Emerging in Section 8 for the Deep Dive.
**Typography:** Display: Ogg or Editorial New for high contrast, paired with crisp Helvetica/Geist for body.
**Color Plan:** Dark mode dominant. Amber acts as the light source of the 3D core. Teal/purple are ambient lighting on text borders.
**Risk & Fallback:** WebGL context loss or mobile uses a static, pre-rendered high-res webp with a slow CSS scale animation.

## World 3: EFFECTS WORLD - "Ripple Foundry"
**Pitch:** A masterclass in CSS/SVG choreography where scrolling generates ripples that organically reveal content blocks.
**Signature System:** Ripple-driven masks. A persistent, grid-like ripple field in the background. As the user scrolls vertically, "impact points" trigger masks that crystallize the UI sections into view.
**Hero Concept:** "The impact of instant search." The user scrolls, a drop hits the grid, and the UI ripples into existence.
**Motion Language:** Fluid, expanding, masked reveals. No 3D, purely 2D masking and clip-path transitions.
**Section Blueprint:**
1. **Hero:** Blank screen -> ripple -> DemoSurface appears + CTAs.
2. **Impact 1 (Speed):** Next ripple reveals latency metrics.
3. **Impact 2 (Local):** Reveal of privacy features.
4. **The Pipeline:** Ripple masks the transition from Lexical to Semantic.
5. **Result Anatomy:** Clean UI built from primitives, crystallized in.
6. **Code Snippets:** Staggered line-by-line reveal.
7. **Score Breakdown:** Explaining the ranking math.
8. **Workstreams Deep Dive:** DemoSurface #2 revealed via expanding circle mask.
9. **CLI Flow:** Terminal interface peeling in.
10. **Transparency:** Proof of local execution.
11. **Pricing:** Pricing tiers rippling outward from the center.
12. **Footer:** Final ripple collapsing the page into a CTA button.
**DemoSurface Usage:** 1. Revealed in Hero. 2. Workstreams Deep Dive.
**Typography:** Display & Body: A single, highly readable geometric sans (e.g., Plus Jakarta Sans) varied purely by weight and tracking.
**Color Plan:** Stark white or ultra-light grey background. Amber ripples. Teal and purple used exclusively for active states in the UI primitives.
**Risk & Fallback:** If clip-paths or complex SVG masks hurt performance, fallback is simple CSS opacity/translateY fades driven by standard IntersectionObserver.
