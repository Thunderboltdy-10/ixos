# Inspiration Matrix v2.1

An analysis of top-tier landing pages to guide the Ixos Awwwards Rebuild v2.1. We are moving away from generic templates and towards highly intentional, technically impressive, and cohesive aesthetic experiences.

## Lando
1. **Hero Move:** Large typographic statement with an interactive terminal/CLI tool embedded gracefully.
   *How to implement:* CSS Grid with `fr` units, typography using `ch` width limits to force solid text blocks.
2. **Nav Move:** Stark, simple top nav that disappears on scroll down, reappears on scroll up.
   *How to implement:* `framer-motion` `useScroll` tracking `y` translation or native `IntersectionObserver` toggling a CSS class.
3. **Rhythm Move:** High-contrast banding (alternating stark white and deep dark sections).
   *How to implement:* Global CSS variables scoped per `<section data-theme="dark|light">`.
4. **Transition Move:** Instant snap-scroll or extremely fast opacity reveals.
   *How to implement:* CSS `scroll-snap-type: y mandatory` or Framer Motion `duration: 0.15, ease: "linear"`.
5. **Typography Move:** Heavy use of monospace for labels, tight tracking on display fonts.
   *How to implement:* CSS `font-family: var(--font-mono)`, `letter-spacing: -0.04em` on header tags.
6. **Texture Move:** Subtle gradients in the terminal header, flat colors elsewhere.
   *How to implement:* CSS `linear-gradient` over borders and subtle `box-shadow` on specific technical components.
7. **Interaction Move:** Snappy hover states on buttons with slight scale and color inversion.
   *How to implement:* CSS `:hover` with `transform: scale(1.02)` and `transition: all 0.1s ease`.
8. **Layout Move:** Asymmetric split grids for technical features.
   *How to implement:* CSS Grid with `grid-template-columns: 1fr 2fr` or `minmax(300px, 1fr) 2fr`.
9. **Detail Move:** Terminal code typing out automatically.
   *How to implement:* React `useEffect` interval typing logic or Framer Motion `staggerChildren`.
10. **Background Move:** Pure black (`#000000`) and pure white (`#ffffff`) background blocks, no intermediate grays for sections.
    *How to implement:* Direct hex color values, intentionally overriding standard subtle gray palettes.
11. **Content Move:** Features presented as functional CLI commands rather than prose.
    *How to implement:* Custom CodeSnippet React component with strict syntax highlighting.
12. **Sticky Move:** Sidebars sticky while scrolling through long feature lists.
    *How to implement:* CSS `position: sticky; top: var(--header-height)` within a parent grid or flex container.

## Convex
1. **Hero Move:** Soft glowing, living "sync" visualization that feels continuously connected.
   *How to implement:* SVG with CSS `@keyframes` animations for continuous, flowing data paths.
2. **Nav Move:** Pill-shaped, floating navigation bar that drops a subtle shadow.
   *How to implement:* CSS `border-radius: 9999px`, `backdrop-filter: blur(10px)`, `position: fixed; left: 50%; transform: translateX(-50%)`.
3. **Rhythm Move:** Symmetrical, centered layouts branching into broad 2-column deep dives.
   *How to implement:* Flexbox `flex-direction: column; align-items: center` for flow, expanding to `grid-template-columns: 1fr 1fr`.
4. **Transition Move:** Overlapping, stacking panels on scroll.
   *How to implement:* CSS `position: sticky; top: Xpx` for panels to stack like cards in a deck.
5. **Typography Move:** Friendly, open sans-serif, highly legible with large x-height.
   *How to implement:* `font-family: var(--font-sans)` using fonts like Inter or similar humanist sans.
6. **Texture Move:** Amber/Teal/Purple glowing blurs behind key components.
   *How to implement:* Absolute positioned `div` with `filter: blur(100px)` and reduced opacity.
7. **Interaction Move:** Code snippets that update and highlight lines based on scroll position.
   *How to implement:* `IntersectionObserver` triggering React state changes that dynamically apply highlighted classes to code lines.
8. **Layout Move:** Wide, expansive feature boards that feel like a massive canvas.
   *How to implement:* Full-bleed section containers with an inner max-width constraint for content.
9. **Detail Move:** "Live" status dots pulsing on elements to signify active connection.
   *How to implement:* CSS `@keyframes pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(...) } ... }`.
10. **Background Move:** Subtle grain or noise over off-white/dark backgrounds.
    *How to implement:* Fixed SVG noise overlay with `mix-blend-mode: overlay` and low opacity.
11. **Content Move:** Testimonial/tweet grids presented dynamically.
    *How to implement:* CSS Masonry or CSS Columns for a staggered look.
12. **Sticky Move:** The primary visual remains sticky while narrative text scrolls by.
    *How to implement:* Two-column grid with `position: sticky` on the visual column.

## Graphite
1. **Hero Move:** Dense, technical command palette or graph interface front and center.
   *How to implement:* Complex React component rendering realistic UI primitives (chips, graphs, rows), not static svgs.
2. **Nav Move:** Utilitarian, dense navigation with many technical options.
   *How to implement:* Mega-menu or multi-tier dropdowns using Radix UI primitives.
3. **Rhythm Move:** High information density, tight grid-like structure.
   *How to implement:* CSS Grid with small gaps (e.g., `gap-2` or `gap-4`) and defined borders (`border: 1px solid var(--border)`).
4. **Transition Move:** Line-drawing reveals and unfolding architectural panels.
   *How to implement:* SVG `stroke-dasharray` and `stroke-dashoffset` animations triggered by scroll.
5. **Typography Move:** Tabular data styles, mono-spaced numbers, very structured.
   *How to implement:* CSS `font-variant-numeric: tabular-nums` for all metrics and numbers.
6. **Texture Move:** Wireframes, dots, structural grid lines in the background.
   *How to implement:* CSS `background-image: radial-gradient(...)` or linear gradients for dot/line matrices.
7. **Interaction Move:** Hovering over items reveals complex tooltips or popovers with rich data.
   *How to implement:* Floating UI / Radix Tooltip with fast enter animations and delay-free hover.
8. **Layout Move:** Bento-box grids for feature highlights.
   *How to implement:* CSS Grid with `grid-template-columns: repeat(auto-fit, minmax(...))` and explicit row/col spans.
9. **Detail Move:** Badges and tags everywhere to denote status, language, or type.
   *How to implement:* Reusable Badge React component with variant styling.
10. **Background Move:** Deep, dark industrial backgrounds.
    *How to implement:* Slate/Zinc dark palettes (e.g., `#0f172a` or `#09090b`).
11. **Content Move:** Focus on workflows, PRs, and branch graphs.
    *How to implement:* Interactive HTML canvas or complex SVG node-graph rendering.
12. **Sticky Move:** Code diffs side-by-side that stick as you scroll through changes.
    *How to implement:* Multi-pane layouts with independent scrolling columns.

## Greptile
1. **Hero Move:** Stark, code-first introduction. Usually a direct prompt-to-code visualization.
   *How to implement:* Interactive prompt input component driving a simulated streaming code response.
2. **Nav Move:** Extremely minimal, nearly invisible until needed.
   *How to implement:* Transparent background, low-contrast text that brightens to full opacity on hover.
3. **Rhythm Move:** Storytelling through sequential code transformations or chat interactions.
   *How to implement:* Framer Motion sequence animations based on scroll depth.
4. **Transition Move:** Typewriter effects and progressively expanding code blocks.
   *How to implement:* React state updating text character-by-character or token-by-token.
5. **Typography Move:** The code font is the primary font for the entire narrative.
   *How to implement:* Entire sections styled like a code editor with a premium monospace font.
6. **Texture Move:** Editor chrome (tabs, line numbers, syntax highlighting colors).
   *How to implement:* Replicating VS Code or similar editor aesthetics via precise CSS borders and colors.
7. **Interaction Move:** Clicking tokens or variables to see definitions or references.
   *How to implement:* Span wrapping around keywords with `onClick` handlers showing inline popovers.
8. **Layout Move:** Split screen with narrative on one side, active editor on the other.
   *How to implement:* Flexbox `row` layout, strict 50/50 split.
9. **Detail Move:** Cursor blinking and selecting text automatically.
   *How to implement:* CSS keyframe animations for a simulated caret (`opacity: 0` to `opacity: 1`).
10. **Background Move:** Editor background colors (often dark grays/blues).
    *How to implement:* Global theming matching popular IDE themes (e.g., One Dark, Dracula).
11. **Content Move:** Focus on the "chat with codebase" aspect.
    *How to implement:* Chat message bubble components with robust markdown and code block rendering.
12. **Sticky Move:** The prompt input remains fixed at the bottom of the "editor" view.
    *How to implement:* Absolute positioning within a relative editor container.

## Vercel
1. **Hero Move:** Iconic, central glowing triangle or perfect geometric shape with minimal text.
   *How to implement:* CSS/SVG with precise layered drop-shadows and absolute centering.
2. **Nav Move:** Clean, pixel-perfect top nav with subtle blurs and perfect alignment.
   *How to implement:* `backdrop-filter: blur(12px)`, `border-bottom: 1px solid rgba(255,255,255,0.1)`.
3. **Rhythm Move:** Massive white space around singular, powerful statements, followed by tight product grids.
   *How to implement:* `padding-block: 12rem` or more for key statements to let them breathe.
4. **Transition Move:** Elegant, slow fades and subtle 1px border highlights entering the viewport.
   *How to implement:* Framer Motion `initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} transition={{duration: 0.8}}`.
5. **Typography Move:** Perfect kerning, perfect hierarchy, sans-serif (Geist/Inter).
   *How to implement:* Strict typographic scale using CSS variables (e.g., `--text-4xl`, `--text-sm`) with tuned line-heights.
6. **Texture Move:** Total lack of noise. Perfection in borders and subtle inner shadows.
   *How to implement:* `box-shadow: inset 0 1px 0 rgba(255,255,255,0.1)` on buttons and cards.
7. **Interaction Move:** Hover effects that illuminate borders of cards based on cursor position.
   *How to implement:* CSS `background: radial-gradient(...)` moving with mouse position (using JS `onMouseMove` to update CSS vars).
8. **Layout Move:** Perfectly aligned, crisp grids. Nothing out of place.
   *How to implement:* CSS Grid with exact pixel or rem gaps, strict column tracks.
9. **Detail Move:** Micro-typography. Tiny, perfectly legible labels in all caps.
   *How to implement:* `font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 500`.
10. **Background Move:** Deep black (`#000`) for maximum contrast against pure white text and vibrant accents.
    *How to implement:* `background-color: #000; color: #fff;` defined globally.
11. **Content Move:** Focus on deployment speed and infrastructure scale.
    *How to implement:* Live-updating counters or deployment status simulators with deterministic states.
12. **Sticky Move:** Sections that pin while inner content fades through (e.g., showing different framework logos).
    *How to implement:* `position: sticky; top: 0` container with transitioning absolute positioned children.

## Site 5 (Baseline - What we are leaving behind)
1. **Hero Move:** Generic "AI" floating shapes and an oversized, unresponsive search bar.
   *How to fix:* Stop doing this. Use grounded, highly detailed UI primitives that actually look like the product.
2. **Nav Move:** Standard, uninspired navbar with poorly sized buttons.
   *How to fix:* Refine spacing, standardize typography, and add distinct, polished hover states.
3. **Rhythm Move:** Disjointed. Huge gaps of nothing followed by cramped text.
   *How to fix:* Establish a consistent vertical rhythm (e.g., strict 8pt grid system for all padding/margins).
4. **Transition Move:** Janky horizontal scroll hijacking that breaks the mouse wheel.
   *How to fix:* Strictly vertical scrolling. Use `position: sticky` for side-to-side reveals if needed, but DO NOT overflow the viewport.
5. **Typography Move:** Unbalanced hierarchy; mobile text is sometimes larger than desktop text.
   *How to fix:* Implement responsive fluid typography using CSS `clamp()` or strict breakpoint adjustments.
6. **Texture Move:** Overused glowing orbs that lack connection to the product.
   *How to fix:* Tie visual effects to specific product actions (e.g., a ripple effect precisely when a search completes).
7. **Interaction Move:** Confusing hover states that don't indicate clickability.
   *How to fix:* Provide clear affordances (pointer cursor, transform scale, background color changes).
8. **Layout Move:** Horizontal overflow everywhere, causing a "wobbly" page.
   *How to fix:* Enforce `overflow-x: hidden` on `html, body` and rigorously test all container bounds.
9. **Detail Move:** Fake, hardcoded numbers that never change.
   *How to fix:* Implement deterministic state machines that compute and display dynamic numbers based on input.
10. **Background Move:** Muddy gray backgrounds that lack contrast.
    *How to fix:* Use stronger contrast ratios, utilizing pure blacks, pure whites, or deeply intentional dark tones.
11. **Content Move:** Repeating the exact same search bar mockup in every section.
    *How to fix:* Vary the UI components shown (focus on score breakdowns, code snippets, node graphs, etc.).
12. **Sticky Move:** Broken sticky elements that overlap incorrectly and ruin the layout.
    *How to fix:* Manage `z-index` strictly via a documented scale and establish clear CSS stacking contexts.

## 10 Anti-Patterns to Avoid

1. **Generic Cards:** Stacking 3-column feature cards with an icon and a paragraph. It is lazy and unmemorable. Find an alternative layout primitive.
2. **Generic SVG Diagrams:** Abstract lines and nodes that do not look like the actual product or represent real data flow. Use real UI elements instead.
3. **Demo Repeated Everywhere:** Showing the exact same search bar mockup in every section just to fill space.
4. **Fake Metrics:** Hardcoding "99.9%" or "0.1ms" in static images. Numbers must be computed deterministically to feel real.
5. **Tiny Demo Mockup:** A hero image where the product UI is so small you cannot read the text. The product UI IS the hero; make it massive.
6. **Horizontal Scroll Hijacking:** Forcing the user to scroll sideways unexpectedly. This breaks momentum and trust. No horizontal scroll is permitted.
7. **"AI Kits" Aesthetic:** Default purple/pink glowing blobs behind glassmorphism. It looks like a cheap template. Use our defined Amber/Teal/Purple palette with intention.
8. **Paper Compliance:** Building features that look right but do not actually function (e.g., a "streaming" list that just appears all at once after a timeout).
9. **Unintentional Typography:** Using default system fonts or poorly tracked sans-serifs everywhere without establishing a clear hierarchy, contrast, or personality.
10. **The "Blank" Feeling:** Sections with so little content or visual interest that the user feels lost, disconnected from the narrative, or thinks the page failed to load.
