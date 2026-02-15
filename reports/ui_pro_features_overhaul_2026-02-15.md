# UI + Pro Features Overhaul Report (2026-02-15)

## Scope
Desktop app and landing page polish with emphasis on:
- Single model/quality selector flow in search controls
- Today/Workstreams value clarity and functionality
- Ask Mode Pro gating + intent robustness
- Landing parity with desktop interaction patterns

## Commands Run
- `npm --prefix ui run build`
- `npm --prefix ixos-site run build`
- `cargo test`
- `cargo clippy -q`
- `cargo test -q ixos_rank::progressive::tests::test_ask_mode_respects_selected_model`
- `cargo check -q`

## Command Outcomes
| Command | Result | Notes |
|---|---|---|
| `npm --prefix ui run build` | PASS | Build succeeded; existing chunk-size warning remains. |
| `npm --prefix ixos-site run build` | PASS | Build/prerender succeeded; existing Next lockfile-root warning remains. |
| `cargo test` | PASS | `468 passed; 0 failed; 6 ignored` (plus bins/integration/doc tests). |
| `cargo clippy -q` | PASS with warnings | Existing repo-wide clippy warnings; no clippy errors. |
| `cargo test -q ixos_rank::progressive::tests::test_ask_mode_respects_selected_model` | PASS | Ask-mode model-path behavior check passed after intent changes. |
| `cargo check -q` | PASS | Final compile sanity check after formatting. |

## Before/After Table
| Area | Before | After |
|---|---|---|
| Desktop search controls | Duplicate model controls existed conceptually; confusion between selectors. | Single quality selector path kept (Flash/Auto/Pro), extra model switch removed from active desktop path, wider triggers + more folder path space. |
| Desktop dropdown UX | Titles/subtitles inconsistent; weak hover detail behavior. | Mode + quality menus use larger stacked text, selected left accent, and hover detail footer panel. |
| Search results deck | Redundant top metrics row cluttered results stream. | Top metrics row removed; streamlined pipeline/status/progress remains. |
| Result text selection | Drag-select could trigger card actions and disrupt copying. | Drag threshold + selection guards prevent accidental toggles; selectable snippet areas preserved. |
| Today/Workstreams value clarity | Pro value unclear; weak explanation of how data appears. | Added connection map, explicit “how it works” cards, Ask Mode Pro explanation, and better empty/action guidance. |
| Workstream creation | No clear file-seeding path; modal centering complaints. | Centered modal with “Seed With Recent Files” multi-select and backend event seeding. |
| Workstream actions | “Open Workstream” could appear inert when already active. | Active state shown as `Viewing` and action disabled for current workstream. |
| First-run understanding | Users lacked concrete cache behavior onboarding. | Mandatory first-run onboarding enforces two searches (cold/warm) and displays cache/time comparison. |
| Ask Mode activation robustness | Mostly punctuation/first-token dependent behavior. | Added typo-tolerant multi-token prefix detection + expanded intent templates and prompts. |
| Ask Mode entitlement | Users could be unclear on availability. | Backend and UI enforce Pro-gated Ask Mode indicators and fallback messaging. |
| Landing demo parity | Extra model dropdown and weaker parity with desktop control semantics. | Removed extra demo model dropdown; demo now uses mode + quality selectors with desktop-like hover detail. |
| Landing noisy texture | Arc noise was heavy. | Arc noise reduced slightly (small decrement only) to preserve feel without overpowering UI. |
| Landing cards/CTAs | Some CTA buttons were non-functional placeholders. | Today/Workstreams section CTAs now route to actionable destinations (`/download`). |

## Ask Mode Research Notes (non-LLM path)
Implemented deterministic improvements that preserve local/non-LLM architecture:
- Multi-token typo-tolerant intent matching in `IntentDetector::detect_intent`.
- Expanded ask templates for broader imperative/question phrasing.
- Additional trigger phrases for practical user language (`help me find`, `i need to know`).

## Residual Risks
- `cargo clippy -q` still reports existing repository-wide warnings unrelated to this pass.
- Next.js workspace-root warning persists due multi-lockfile setup.
- UI main bundle warning (>500k chunk) persists; functional but worth future split pass.
