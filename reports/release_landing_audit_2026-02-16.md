# Release + Landing Audit (2026-02-16)

## Scope
- GitHub Actions reliability audit for CLI and desktop release flows (focus: macOS/Linux failures).
- Installer script safety and coexistence behavior for desktop + CLI installs.
- Landing/pricing/download UX overhaul and verification.

## Evidence Commands
```bash
bash -n scripts/install.sh
```

```powershell
$parseErrors = $null
[System.Management.Automation.Language.Parser]::ParseFile("scripts/install.ps1", [ref]$null, [ref]$parseErrors) | Out-Null
if ($parseErrors -and $parseErrors.Count -gt 0) { throw "parse failed" }
```

```bash
python -c "import pathlib,yaml; [yaml.safe_load(p.read_text(encoding='utf-8')) for p in pathlib.Path('.github/workflows').glob('*.yml')]; print('workflow YAML parse OK')"
```

```bash
npm --prefix ixos-site run build
```

```bash
cd ixos-site
npx eslint src/components/sections/DownloadActions.tsx src/app/download/page.tsx src/components/sections/Pricing.tsx src/components/sections/ProFeatures.tsx src/components/sections/PricingProFlow.tsx src/components/sections/ProCard.tsx src/components/sections/TodaySection.tsx src/components/sections/WorkstreamsSection.tsx src/lib/downloads.ts src/app/page.tsx src/app/pricing/page.tsx src/app/docs/page.tsx src/app/docs/cli-reference/page.tsx
```

## Before vs After
| Area | Before | After |
|---|---|---|
| PR settings matrix | Dedicated `settings-matrix` workflow failing many combos | Workflow removed from PR/push triggers per request |
| CLI macOS/x86 smoke | Cross-arch binary execution risk on arm runner | Host/target arch guard; execution skipped for cross-arch with file check |
| CLI/desktop publish upload | `gh release ... artifacts/*` could include directories and fail | Stage/upload explicit file lists only; ensure release exists before upload |
| Desktop UI build (mac/linux) | `rollup` native optional package could be missing after `npm ci` | Post-install native check + fallback `npm --workspace ui install --include=optional rollup` |
| Linux checksum tooling | Assumed `shasum` availability | `shasum` with `sha256sum` fallback |
| Desktop Ubuntu deps | Single hardcoded package set | Adaptive package install for WebKit/JavaScriptCore/AppIndicator variants |
| Model stub casing | `potion-base-8M-int8` only | `potion-base-8m-int8` + legacy uppercase path |
| CLI install path isolation | Shared root risk on Windows (`%LOCALAPPDATA%\\Ixos`) | Dedicated CLI root defaults (`%LOCALAPPDATA%\\IxosCLI`, `~/.ixos/cli`) |
| CLI checksum handling (PS) | 404 path could hard-fail | 404 handled as warning; other errors still fail |
| POSIX install command | `install.sh | sh` (bash script piped to sh) | `install.sh | bash` in site/docs/hero/download UX |
| Pricing -> Pro section continuity | Duplicated card instances | Shared handoff flow via `PricingProFlow` (`pricing -> hidden -> capabilities`) |
| Pricing page parity | No Pro-capability handoff, weaker install CTA parity | Same shared Pro transfer + integrated download actions section |
| Download clarity | Desktop and CLI paths less explicit | Clear split sections, auto detection, install location visibility, repo provenance links |
| Today/Workstreams quality | Generic/static feel | Interactive, product-faithful stream/brief surfaces with actionable controls |

## Files Changed (Primary)
- `.github/workflows/cli-release.yml`
- `.github/workflows/release.yml`
- `scripts/install.sh`
- `scripts/install.ps1`
- `ixos-site/src/lib/downloads.ts`
- `ixos-site/src/components/sections/DownloadActions.tsx`
- `ixos-site/src/app/download/page.tsx`
- `ixos-site/src/components/sections/Pricing.tsx`
- `ixos-site/src/components/sections/ProFeatures.tsx`
- `ixos-site/src/components/sections/PricingProFlow.tsx`
- `ixos-site/src/components/sections/ProCard.tsx`
- `ixos-site/src/components/sections/TodaySection.tsx`
- `ixos-site/src/components/sections/WorkstreamsSection.tsx`
- `ixos-site/src/app/page.tsx`
- `ixos-site/src/app/pricing/page.tsx`
- `ixos-site/src/app/docs/page.tsx`
- `ixos-site/src/app/docs/cli-reference/page.tsx`
- `ixos-site/src/components/sections/HeroPipeline.tsx`

## Residual Risk
- Hosted runner image drift can still impact package availability.
- Tauri signing/upload behavior still requires a real tag run with repository secrets.
- Hero scroll choreography remains sensitive to viewport/device variance and should be manually QAed.

## Follow-up Pass (Landing Polish 2)
- Removed hero curl install line in `HeroPipeline`.
- Reduced pipeline stage flicker by stabilizing quantized step mapping and removing blur transition from pipeline cards.
- Removed the transfer-zone lane and switched to a non-obstructive `pricing -> hidden -> capabilities` handoff with softer spring profile.
- Added flip-style price animation for monthly/annual toggle via `FlipPrice` in `ProCard`.
- Rebuilt Today and Workstreams sections with cleaner boxy hierarchy and one-main-point framing per panel.
