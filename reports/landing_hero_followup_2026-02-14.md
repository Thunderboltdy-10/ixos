# Landing Hero Follow-up (2026-02-14)

## User-reported issues addressed
- Remove 3D model from landing hero.
- Keep demo chrome accent synchronized with selected search mode (Memory/Local/Deep), including latency badge styling.
- Fix unstable scroll experience in pinned hero pipeline.
- Prevent demo layer from blocking hero text selection.
- Increase hero title size and move hero copy higher.
- Clarify CLI installation and GitHub Actions release workflow behavior.

## Code changes
- `ixos-site/src/components/sections/HeroPipeline.tsx`
  - Removed `IxosLogo3D` usage from desktop and mobile hero.
  - Added `demoMode` state sourced from `IxosDemoWindow`.
  - Demo border/glow/latency label now follow mode accent (`memory=amber`, `local=teal`, `deep-search=violet`).
  - Adjusted ScrollTrigger pin tuning (`fixed`, reparent enabled, lower scrub/end) to reduce scroll jitter/bounce.
  - Raised hero stack, increased heading scale, added explicit CLI install line, and changed CTA to `/docs/cli-reference#install`.
  - Set demo overlay wrapper to `pointer-events-none` so it no longer steals text selection in empty areas.
- `ixos-site/src/components/hero/IxosDemoWindow.tsx`
  - Exported `DemoMode` type.
  - Added `onModeChange` callback prop and wired updates on mode changes.
- `ixos-site/src/app/globals.css`
  - Set base `html` scroll-behavior to `auto` to avoid smooth-scroll/pin conflicts.
- `ixos-site/src/app/docs/cli-reference/page.tsx`
  - Added explicit install block for macOS/Linux/WSL and Windows PowerShell.
  - Added verification step and GitHub Actions tag-trigger instructions (`v*` desktop, `cli-v*` CLI).
  - Corrected examples to canonical cache mode usage.
- `ixos-site/src/components/sections/DownloadActions.tsx`
  - Added Windows install command (`install.ps1`) and explicit note about release workflows.

## Validation
| Command | Result |
|---|---|
| `npm run --workspace ixos-site build` | PASS |
| `npm run --workspace ui build` | PASS |

## Notes
- Next.js still emits non-fatal multi-lockfile root warning during site build.
