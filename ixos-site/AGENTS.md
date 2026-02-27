# Ixos Site Agent Guardrails

This file is the persistent operating contract for all Codex work in `ixos-site`.

## Scope
- Applies to landing variants `/1`, `/2`, `/3` and supporting shared components.

## Variant Tokens + Presets (required)
- `/1` "Ripple Foundry"
  - Tokens:
    - `--v-accent-main: #2dd4bf`
    - `--v-accent-alt: #f59e0b`
    - `--v-shell-bg: rgba(10,14,16,0.78)`
  - Presets:
    - `authentication token refresh`
    - `rate limiter middleware`
    - `How does token expiry work?`

- `/2` "Evidence Loom"
  - Tokens:
    - `--v-accent-main: #8b5cf6`
    - `--v-accent-alt: #2dd4bf`
    - `--v-shell-bg: rgba(14,12,21,0.82)`
  - Presets:
    - `How does token refresh work?`
    - `cache signing validation`
    - `journalist mode privacy`

- `/3` "Quiet Luxury Cockpit"
  - Tokens:
    - `--v-accent-main: #f3f5f7`
    - `--v-accent-alt: #2dd4bf`
    - `--v-shell-bg: rgba(12,14,18,0.72)`
  - Presets:
    - `authentication token refresh`
    - `workstream session recovery`
    - `ephemeral mode privacy`

## Design Constraints
- Do not clone `/5` layout or styling; only reuse compatible systems (for example ripple behavior and section concepts).
- The square ripple field look is visually fixed; enhancements are allowed, redesign is not.
- No generic AI diagram blocks. Use real product UI primitives and real labels.
- Shared app demo visuals must be implemented through shared desktop surfaces from `@ixos/ixos-ui`.

## Interactive Demo Requirements
- Buttons, tabs, and toggles must respond.
- Search typing must stream scripted results without backend dependency.
- Use deterministic demo adapters.

## Mandatory Playwright Visual Harness
- `expect(page).toHaveScreenshot()` is mandatory for `/1`, `/2`, `/3`.
- Required widths: `1440`, `1024`, `390`.
- Snapshot output location: `ixos-site/.visual/`.
- Run after each variant stage and fix obvious breakage before moving on.
- All three routes must pass with zero console errors.

## Completion Bar
- `/1`, `/2`, `/3` are structurally and visually distinct.
- Shared DemoSurface wrapper is used across all three variants.
- Visual tests pass and screenshots are written to `.visual/`.
