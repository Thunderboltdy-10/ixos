# Landing Hero + Pro Sections Polish Report (2026-02-15)

## User-driven fixes implemented

### Hero + Pipeline behavior
- `ixos-site/src/components/sections/HeroPipeline.tsx`
  - Increased emphasis sizing for `Google Search` in both desktop and mobile hero (`text-[1.06em]`).
  - Hero copy layer moved behind demo (hero z lowered to `z-20`, demo remains above).
  - Hero fade/morph delayed (`heroOpacity` now fades later) to keep headline visible longer through transition.
  - Pipeline title row resized to prevent top clipping (`gridTemplateRows` + title alignment updates).
  - Active pipeline cards now have explicit visible border treatment (`border-2` + `ring-2` + overlay border).
  - Multi-Signal Ranking card switched back to non-compact layout (diagram below text).
  - Flicker mitigation: stronger step hysteresis, smoother scrub, reduced exit translation drift.

### Demo interactivity
- `ixos-site/src/components/hero/IxosDemoWindow.tsx`
  - Added `interactionLocked` gating logic tied to guided step progression.
  - Demo remains interactive when not in locked guided step.
  - Input read-only now tied to `interactionLocked`, not blanket controlled mode.
  - Dropdown/result interactions now check `interactionLocked` (not global controlled state).
  - Removed forced deep-search mode flip during guided stage to avoid color inconsistency.

### Pipeline/accent color consistency
- `ixos-site/src/components/sections/HeroPipeline.tsx`
  - `PHASE_ACCENTS` updated so Memory Privacy is amber.
- `ixos-site/src/components/hero/diagrams/MemoryWipe.tsx`
  - Memory wipe diagram accent switched from violet to amber.

### Underlined accent phrase emphasis in other sections
- `ixos-site/src/components/sections/TodaySection.tsx`
  - Underlined phrase now slightly larger and accent-colored.
- `ixos-site/src/components/sections/WorkstreamsSection.tsx`
  - Underlined phrase now slightly larger and accent-colored.

### Today + Workstreams clarity improvements
- `ixos-site/src/components/sections/TodaySection.tsx`
  - Added explicit `PRIMARY OUTCOME` line per card for one-clear-takeaway readability.
- `ixos-site/src/components/sections/WorkstreamsSection.tsx`
  - Added per-card `PRIMARY OUTCOME` clarity.
  - Added per-card accent-rgb styles so hover glow color follows each card accent.

### Divider + section flow
- `ixos-site/src/app/page.tsx`
  - Added explicit divider between Workstreams and Pricing:
    - `<SectionDivider accent="magenta" label="PRICING" />`
- `ixos-site/src/components/ui/SectionDivider.tsx`
- `ixos-site/src/app/globals.css`
  - Divider sweep changed from one-shot to continuous visible animated sweep (`divider-sweep` keyframe).

### Pro capabilities presentation (non-uniform card layout)
- `ixos-site/src/components/sections/ProFeatures.tsx`
  - Reworked into varied layout:
    - mixed-size capability cards with per-accent border/glow
    - animated fall-in Pro card (`FALL-IN CARD`) to avoid repetitive same-size card grid

### Download actions enhancement
- `ixos-site/src/components/sections/DownloadActions.tsx`
  - Added `Quick test after install` command block.
  - Added dedicated `Copy test query` action.

## Validation
- `npm --prefix ixos-site run build` -> PASS
- `npm --prefix ui run build` -> PASS
- `cargo test -q` -> PASS (`468 passed; 0 failed; 6 ignored`)

### Follow-up adjustment
- `ixos-site/src/components/hero/IxosDemoWindow.tsx`
  - Interaction lock is fully disabled (`interactionLocked = false`) so the live demo remains interactive in all stages.
