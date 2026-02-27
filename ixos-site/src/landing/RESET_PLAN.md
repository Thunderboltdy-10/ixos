# IXOS Landing Reset Plan (V5-Clone Direction)

## Structural Direction
- `/1`, `/2`, `/3` are rebuilt from the `/5` landing architecture and section rhythm.
- `/5` remains untouched.
- Variants use the same section flow and differ by preset styling/motion emphasis.

## Core Changes
- Replace route renderers (`/1`, `/2`, `/3`) to use `V5PrimeLanding`.
- Keep original ripple background component (`V4AmbientField`) unchanged.
- Remove global page tilt by replacing the spatial wrapper with a flat stage.
- Replace old sticky horizontal section separators with side-entry metadata rails + directional divider sweeps.

## Unified Surface Integration
- All search-centric sections now use shared `DemoSurface` (backed by `AppWorldSurface`):
  - Hero
  - Progressive Retrieval
  - Ask Mode
  - Pro Workflow Loop (Today/Workstreams/Search)
- Users can type queries and interact with mode/tabs directly in those sections.

## Variant Presets
- `/1` Flow Edition: teal/amber editorial energy.
- `/2` Proof Edition: violet instrumentation and stronger glow cadence.
- `/3` Quiet Edition: restrained chrome and softer motion.

## Verification
- Run Playwright screenshots for `/1`, `/2`, `/3` at 1440/1024/390 into `.visual/`.
- Validate no console/page errors and no obvious spacing/cropping regressions.
