# Ixos Landing Worlds v2.1

## World 1: DEMO-DRIVEN "Guided Mission"

**Pitch:** A highly interactive, scrollytelling journey where the product demo acts as the anchor, morphing its state to explain every technical capability as you scroll vertically.
**Signature System:** Pinned progressive demo. The central UI is fixed vertically; as you scroll past sections, it live-updates (types a query, switches to semantic mode, breaks down a score) while narrative text scrolls alongside it.
**Hero Concept:** "Search reimagined locally." The user is instantly met with a massive, live-feeling search bar that types out a complex query, highlighting the speed and depth of the engine.
**Motion Language:** Snappy, instantaneous transitions mirroring a low-latency local tool. Sticking, pinning, and releasing based on vertical scroll.
**Navigation Style:** Utilitarian, dense navigation similar to Graphite. Multi-tier dropdowns with a focus on product documentation and workflows. Hidden until needed or scroll-triggered.
**DemoSurface Usage:**
1. Pinned in the Hero (Sections 1-4). Minimum width ~620px.
2. Today/Workstreams Deep Dive (Section 8). Minimum width ~520px.
**Fallbacks:** If JS intersection observers fail, it degrades into a standard two-column alternating stack (reduced motion/low-end).

**Section Blueprint (Layout Primitives):**
1. **Hero:** Full-bleed Split Screen (Narrative Left, Pinned Demo Right).
2. **Trust Strip:** Asymmetric Grid Band (Local-first, privacy-focused, speed metrics).
3. **Progressive Pipeline 1:** Scrolling Narrative Rail (Lexical scan state; Demo updates).
4. **Progressive Pipeline 2:** Scrolling Narrative Rail (Semantic index state; Demo updates).
5. **Evidence Drawer:** Interactive Pinned Drawer (Expanding the "why matched" surface).
6. **Result Anatomy:** Zoomed UI Overlay (Zooming into the score breakdown and code snippet).
7. **Modes/Quality:** Stepper Rail (The budget dial balancing speed vs. exhaustiveness).
8. **Today/Workstreams Deep Dive:** Inline Demo Container (DemoSurface #2 for managing context).
9. **CLI Workflows:** Terminal Window Chrome (Real command examples, dark mode terminal aesthetic).
10. **Proof/Transparency:** Bento Grid (File path routing and source labels).
11. **Pricing/Plans:** Monolithic Tables (Clean, tabular pricing, no generic cards).
12. **FAQ & CTA Footer:** Full-width Accordion Block (Tight accordions and final hook).

---

## World 2: 3D ECOSYSTEM HERO (stable)

**Pitch:** A premium, cinematic experience that feels like stepping into the high-speed, secure core of an index.
**Signature System:** A single, continuously morphing 3D artifact (the "Index Core") with an Amber center and Teal/Purple interference, reacting subtly to scroll depth.
**Hero Concept:** "The Local Index." A massive, slowly rotating geometric core that feels both ancient and hyper-modern, framing the primary search UI.
**Motion Language:** Ethereal, depth-driven. Parallax layers. Sections feel like descending into different floors of a vault.
**Navigation Style:** Stark, simple top nav that disappears on scroll down, reappears on scroll up (Lando-inspired). Clean and minimal.
**DemoSurface Usage:**
1. Floating in the Hero over the 3D core. Minimum width ~620px.
2. Emerging in Section 8 for the Deep Dive. Minimum width ~520px.
**Fallbacks:** WebGL context loss or mobile uses a static, pre-rendered high-res WebP with a slow CSS scale animation.

**Section Blueprint (Layout Primitives):**
1. **Hero:** Centered Parallax Stage (3D Core + primary DemoSurface).
2. **The Vault Floor:** Full-width Atmospheric Band (Local-first security narrative).
3. **The Indexer:** SVG Line-Drawing Canvas (How the engine builds the index).
4. **Speed Metrics:** Massive Typographic Grid (Big numbers, glowing typography).
5. **Search Accuracy:** Split Editorial Layout (Score breakdown visual using UI primitives).
6. **Code Snippets:** Sticky Code Viewer (High-fidelity code blocks, syntax highlighting).
7. **The Evidence:** Masked Reveal Panel (Why a result matched).
8. **Deep Dive:** Expanding Modal Overlay (DemoSurface #2 appearing from the "depths").
9. **Privacy First:** Diagrammatic Blueprint (Built from real UI chips, no cloud icons).
10. **Integration:** Asymmetric Logo Wall (Tools and ecosystems).
11. **Pricing:** Carved-stone aesthetic Columns (Not traditional cards).
12. **CTA Footer:** Stark Input Box Center (The 3D core fades out).

---

## World 3: EFFECTS-DRIVEN CHOREOGRAPHY (ripple field as engine)

**Pitch:** A masterclass in CSS/SVG choreography where scrolling generates ripples that organically reveal content blocks.
**Signature System:** Ripple-driven masks. A persistent, grid-like ripple field in the background. As the user scrolls vertically, "impact points" trigger masks that crystallize the UI sections into view.
**Hero Concept:** "The impact of instant search." The user scrolls, a drop hits the grid, and the UI ripples into existence.
**Motion Language:** Fluid, expanding, masked reveals. No 3D, purely 2D masking and clip-path transitions.
**Navigation Style:** Pill-shaped, floating navigation bar that drops a subtle shadow (Convex-inspired). Centered and continuous.
**DemoSurface Usage:**
1. Revealed via ripple in the Hero. Minimum width ~620px.
2. Workstreams Deep Dive. Minimum width ~520px.
**Fallbacks:** If clip-paths or complex SVG masks hurt performance, fallback is simple CSS opacity/translateY fades driven by standard IntersectionObserver.

**Section Blueprint (Layout Primitives):**
1. **Hero:** Blank Screen to Circular Mask Reveal (DemoSurface appears + CTAs).
2. **Impact 1 (Speed):** Expanding Ripple Band (Latency metrics).
3. **Impact 2 (Local):** Expanding Ripple Band (Privacy features).
4. **The Pipeline:** Staggered Clip-Path Grid (Transition from Lexical to Semantic).
5. **Result Anatomy:** Crystallized UI Primitives (Clean UI blocks appearing over ripples).
6. **Code Snippets:** Staggered Line-by-Line List.
7. **Score Breakdown:** Pinned Explainer Rail (Explaining the ranking math).
8. **Workstreams Deep Dive:** Expanding Circle Mask Container (DemoSurface #2).
9. **CLI Flow:** Peeling Page Effect (Terminal interface peeling in).
10. **Transparency:** Layered Transparencies (Proof of local execution).
11. **Pricing:** Concentric Circles Layout (Pricing tiers rippling outward).
12. **Footer:** Collapsing Ripple Box (Final ripple collapsing the page into a CTA button).
