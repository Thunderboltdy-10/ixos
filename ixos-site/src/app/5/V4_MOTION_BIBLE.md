# V4 Motion Bible

Ten (plus two) motion principles governing all animation decisions on the /4 landing page. These rules are binding. If a new animation conflicts with these principles, the animation loses.

---

## Principle 1 — Fast But Controlled

UI responses must feel immediate. Interactive responses (hover, click, focus) complete within 150ms. Narrative sequences (hero cycle, scroll-scrub reveals) are longer — up to 600ms per phase — but never feel slow because each phase has clear forward momentum.

**Targets:**
- Hover transitions: 150ms
- Press/active: 80ms
- Page fade-in after loader: 500ms ease-out
- Phase transitions in hero: 300–400ms
- Full hero loop: ~15.5s

**Violation:** Any hover that takes >200ms feels laggy. Any UI response over 250ms requires a loading indicator.

---

## Principle 2 — Staged Lock-In

Animations progress through defined phases toward a stable final state. The hero cycle demonstrates this perfectly: scatter → typing → scanning → lexical → semantic → locked. Each stage has a clear visual language (amber = scanning/lexical, violet = semantic, cyan = locked). Users understand they are watching a process converge.

Never show random or looping "busy" animations without a terminus. Every motion implies progress toward a resolved state.

---

## Principle 3 — Layout Animation for Data Reordering

When data changes order (results reranking), use Framer Motion `layout` prop on each row so the transition is physical and comprehensible — rows glide to their new positions rather than appearing/disappearing. The user sees that `middleware/jwt.ts` moved from rank 2 to rank 1 because it visually travels there.

**Implementation:** `motion.div` with `layout` prop. Keys must be stable (file ID, not array index).

**Never:** Flash all rows out and back in when reranking. This destroys the narrative.

---

## Principle 4 — Calibration Presence

The blueprint grid overlay (80x80px, 1.2% white lines) and corner L-marks signal that this is a precision instrument, not a consumer app. These elements are always visible at very low opacity — they do not animate. Their stillness is intentional: the grid is the ground truth against which everything else moves.

**Rule:** Grid opacity never exceeds rgba(255,255,255,0.02). Corner marks never exceed rgba(255,255,255,0.1).

---

## Principle 5 — Pulse Propagation

Meaningful events in the hero trigger a wave pulse in the ambient background field (`v4:pulse` CustomEvent). This creates a physical sensation: the UI does something significant, and the environment responds.

**Pulse triggers and intensities:**
- Hero state transitions to `scanning`: intensity 1.0 (maximum — system starts working)
- Hero state transitions to `locked`: intensity 0.8 (results finalized)
- Evidence panel opens: intensity 0.5 (detail revealed)

**Rule:** Pulses must be triggered at the spatial origin of the event (use the panel's bounding rect center). A pulse from a random location is meaningless.

---

## Principle 6 — Progressive Reveal

Content appears in information-density order: the most scannable information first, details after. In the results list: filenames and scores appear before the evidence panel. The evidence panel expands after the results have settled (400ms after lock).

In scroll-scrub sections: stage labels appear before the detailed description. Statistics appear before the methodology.

**Rule:** Never reveal explanatory text before the subject it explains is visible.

---

## Principle 7 — Decay Not Snap

Brightness, opacity, and scale values decay smoothly toward zero — they never hard-cut. The pixel-wave ambient field decays at `brightness *= 0.97` per 60fps frame (equivalent to a 1.8s half-life). Result rows fade out with opacity 0 over 250ms. The resetting state fades the simulator over 800ms.

**Easing for decays:** Linear (exponential decay already baked into the math). Never use ease-in-out for things going to zero — it looks like the element changes its mind.

**Snap is allowed:** Cursor blink uses binary on/off. Stage dot color changes use a 300ms transition, not a snap.

---

## Principle 8 — Easing Palette

Three easings cover all cases. Do not introduce new curves without a strong reason.

| Name | Cubic Bezier | When to use |
|------|-------------|------------|
| Spring out | `[0.16, 1, 0.3, 1]` | Elements entering from off-screen or out-of-view. Panel expansion. Feels organic. |
| Material standard | `[0.4, 0, 0.2, 1]` | Elements moving within the visible frame. Phase transitions. Reordering. |
| Linear | `linear` | Constant-velocity processes: scan sweep, cursor blink, decay multipliers. |

Framer Motion named easings that map to these:
- `[0.16, 1, 0.3, 1]` is close to `circOut`
- `[0.4, 0, 0.2, 1]` is `easeInOut`
- `"linear"` is `"linear"`

---

## Principle 9 — Scroll-Scrub: Short and Purposeful

Maximum two scroll-scrub sequences per page. Each occupies no more than 200vh. No dead zones (regions where scrolling has no visual effect). Each scrub section must communicate a complete idea from entry to exit.

The ProgressiveScrollV4 section (lexical → semantic → locked) is the canonical scroll-scrub in this design. It uses 200vh with three equal stages. The PipelineV4 section is the second scrub.

**No more scroll-scrub sections after PipelineV4.** All subsequent sections use viewport-enter autoplay.

---

## Principle 10 — Reduced Motion: Static Final States

When `prefers-reduced-motion: reduce` is set, or when the device is detected as low-end (hardwareConcurrency <= 2 or deviceMemory <= 2GB):

1. Show the final/completed state immediately (no animation needed to reach it).
2. Remove all transitions, keyframes, rAF loops.
3. Replace canvas elements with CSS-only static fallbacks.
4. The ambient field becomes a static radial-gradient dot grid.
5. The hero simulator shows the locked state with evidence panel open, no typing animation.

**Rule:** The reduced-motion path must be as information-rich as the animated path. Users who need reduced motion are not penalized with less content.

---

## Principle 11 — Microinteractions

Every interactive element has a tactile response.

| Interaction | Duration | Effect |
|------------|----------|--------|
| Hover link | 150ms | Color shift to higher opacity |
| Hover button | 150ms | Slight scale(1.02) + opacity |
| Press button | 80ms | scale(0.98) |
| Focus ring | Instant | Always visible, never hidden with `outline: none` without a custom replacement |
| Mode chip swap | 200ms | AnimatePresence fade scale |
| Stage dot activate | 300ms | Color + box-shadow transition |

Hover states must never require JavaScript. Use CSS transitions whenever possible (`transition: 'color 0.15s'`). Only use Framer Motion for hover when the animation has more than two states or requires layout-aware positioning.

---

## Principle 12 — Wave Timing and Decay

The ambient pixel-wave field operates on these parameters. Do not change them without benchmarking on a mid-range device.

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Auto-wave interval | 5 seconds | Noticeable but not distracting |
| Auto-wave intensity | 0.25 | Gentle ambient texture |
| Auto-wave speed | 0.12 px/ms | ~1.2s to cross 800px |
| Pulse event speed | 0.15 px/ms | Slightly faster — event-driven |
| Initial center wave intensity | 0.4 | Strong first impression |
| Brightness decay per frame | ×0.97 at 60fps | ~1.8s half-life |
| Pixel grid cell size | 22px | Visible but not intrusive |
| Small pixel size | 5px | 90% of pixels |
| Large pixel size | 9px | 10% of pixels — accent rhythm |
| Max pixel alpha | `brightness × 0.12` | Subtle, never overshadows content |
| Wave ring width (influence) | lo = radius−18, hi = radius+6 | Asymmetric leading edge |
