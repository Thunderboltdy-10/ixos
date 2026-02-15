# Pro Features + Release Hardening Report (2026-02-15)

## Scope
This pass finalized remaining UX and release-readiness gaps, with emphasis on Pro value surfaces:
- Today
- Workstreams
- Ask Mode
- CLI installer + command-path reliability

## Key Changes

### 1) Desktop Pro UX: Today + Workstreams clarity
- `ui/src/components/workstreams/WorkstreamsList.tsx`
  - Added KPI cards for:
    - total workstreams
    - total activity signals
    - unique linked files
    - active streams in last 24h
  - Updated create CTA from `New` to `New from Recent` to make manual seeding intent explicit.
  - Strengthened explanatory copy for:
    - how files are added
    - where connection maps and move recommendations appear
  - Empty-state guidance now explicitly mentions seeding from recent files.

- `ui/src/components/search/SearchInput.tsx`
  - Increased folder picker row share (`flex-[2.6]`, `min-w-[340px]`) so path strings are longer/clearer.

- `ui/src/components/search/QualitySwitcher.tsx`
  - Increased trigger width (`min-w-[196px]`) for easier targeting/readability.

- `ui/src/components/search/ModeSwitcher.tsx`
  - Increased trigger width (`min-w-[192px]`) for better comfort and visual balance.

### 2) Landing Pro marketing alignment
- `ixos-site/src/components/sections/Pricing.tsx`
  - Added explicit Pro feature bullets for:
    - Today view
    - Workstreams
    - connection map + folder move recommendations

- `ixos-site/src/components/sections/ProFeatures.tsx`
  - Replaced generic feature slot with explicit `Today + Workstreams` capability positioning.

- `ixos-site/src/components/sections/WorkstreamsSection.tsx`
  - Updated copy to communicate:
    - auto + manual stream creation
    - connection-map and reorganization recommendations

### 3) CLI install/release hardening
- `scripts/install.sh`
  - Fixed default repo slug to valid `Thunderboltdy10/Ixos`.

- `scripts/install.ps1`
  - Fixed default repo slug to valid `Thunderboltdy10/Ixos`.

This removes a real failure mode where default installer invocation returned GitHub API 404.

## Validation Commands + Results

### Build/Test
- `npm --prefix ui run build` -> PASS
- `npm --prefix ixos-site run build` -> PASS
- `cargo test -q` -> PASS (`468 passed; 0 failed; 6 ignored`)

### Installer checks
- `bash -n scripts/install.sh` -> PASS
- PowerShell parser check for `scripts/install.ps1` -> PASS
- Local smoke install (Windows script with local asset override):
  - `./scripts/install.ps1 -Tag cli-v0.0.0 -AssetUrl <local zip> -SkipPathPersist` -> PASS
  - installed binary path: `.tmp-installer-smoke/Ixos/bin/ixos.exe`
- PATH invocation smoke:
  - `ixos --version` -> PASS
  - `ixos search "readme" --dir . --stub-model --format json --limit 1` -> PASS

## Tag/CI Readiness Notes
- CLI release workflow (`.github/workflows/cli-release.yml`) builds and packages:
  - linux x86_64
  - macOS arm64
  - macOS x86_64
  - windows x86_64
- Desktop release workflow (`.github/workflows/release.yml`) remains tag-triggered (`v*`) and includes installer syntax validation.

## Known Limitation
- Strict global gate `cargo clippy --all-targets -- -D warnings` still fails due broad, pre-existing lint debt outside this scope.
- Shipping checks used in this pass are compile/build/test plus installer/package smoke consistent with current release workflows.

## Before/After Summary (this pass)
| Area | Before | After |
|---|---|---|
| Workstreams value signal | Mostly explanatory text | KPI dashboard + clearer action/creation cues |
| Search controls ergonomics | Shorter folder + narrower triggers | Longer path field + wider quality/mode triggers |
| Landing Pro positioning | Ask Mode-heavy, Today/Workstreams less explicit | Today/Workstreams + reorg recommendations explicitly marketed |
| Installer default repo | Invalid slug (`Thunderboltdy-10`) | Valid slug (`Thunderboltdy10`) |
| Windows installer smoke | previously unresolved in this pass | local scripted install + PATH command verified |

## Persona Critique Pass (Applied)

### Persona A: Solo developer (context-switch heavy)
- Pain: returns to project after meetings and forgets which files mattered.
- Improvement applied:
  - Workstreams KPI and active-state visibility in list.
  - Explicit `New from Recent` seeding path.
  - Today/Workstreams surfaced in Pro pricing copy.

### Persona B: Analyst / operations user (folder sprawl)
- Pain: many similarly named files spread across folders with weak structure.
- Improvement applied:
  - Marketing and desktop copy now explicitly calls out connection maps + move recommendations.
  - Workstreams explanatory cards now point users to where reorganization guidance appears.

### Persona C: Power user evaluating paid tier quickly
- Pain: unclear why Pro is worth paying for beyond model quality.
- Improvement applied:
  - Pro messaging now centers on Ask Mode + Today + Workstreams as a coherent workflow system.
  - Pricing bullets include actionable outcomes (answer cards, suggested next files, context clusters, reorg hints).
