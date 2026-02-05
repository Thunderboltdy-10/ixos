# V2 Rescue Search Pass (2026-02-05)

## Goal
Make Auto mode feel fast on large repos while preserving Flash-first streaming behavior and stable UX.

## Commands executed
- `cargo test`
- `cargo build --release`
- `npm run build` (in `ui/`)
- `npm run build` (in `ixos-site/`)
- `target/release/ixos-bench.exe --dir dataset --runs 5 --cache-mode jit --model ixos-flash-v2 --out reports/v2_bench_flash_dataset_2026-02-05.md`
- `target/release/ixos-bench.exe --dir dataset --runs 5 --cache-mode jit --model potion --out reports/v2_bench_potion_dataset_2026-02-05.md`
- `target/release/ixos-bench.exe --dir dataset --runs 5 --cache-mode jit --model ixos-pro-v1 --out reports/v2_bench_prov1_dataset_2026-02-05.md`
- `target/release/ixos-profile.exe --dir . --runs 2 --cache-mode jit --model ixos-flash-v2 --out reports/v2_profile_flash_repo_2026-02-05.json --slow-threshold-ms 20000 --slow-out reports/v2_profile_flash_slow_repo_2026-02-05.json`
- `target/release/ixos-profile.exe --dir . --runs 2 --cache-mode jit --model potion --out reports/v2_profile_potion_repo_2026-02-05.json --slow-threshold-ms 20000 --slow-out reports/v2_profile_potion_slow_repo_2026-02-05.json`
- Repo-scale CLI latency sweeps (`--dir .`, `--cache-mode jit`, queries: `semantic ranking`, `command palette`, `workstream clustering`) saved under `reports/v2_repo_latency_*.{csv,json}`

## Key artifacts
- `reports/v2_repo_latency_summary_2026-02-05_213420.json` (pre-fix baseline)
- `reports/v2_repo_latency_after_auto_index_fix_summary_2026-02-05_221919.json` (final after)
- `reports/v2_repo_latency_after_auto_index_fix_raw_2026-02-05_221919.csv`
- `reports/v2_bench_flash_dataset_2026-02-05.json`
- `reports/v2_bench_potion_dataset_2026-02-05.json`
- `reports/v2_bench_prov1_dataset_2026-02-05.json`
- `reports/v2_profile_flash_repo_2026-02-05.json`
- `reports/v2_profile_potion_repo_2026-02-05.json`

## Before/after (repo-scale CLI E2E)
| Mode | Before avg (ms) | After avg (ms) | Delta (ms) | Delta % |
|---|---:|---:|---:|---:|
| Flash | 17153.32 | 16838.65 | -314.67 | -1.83% |
| Auto | 33289.55 | 15754.25 | -17535.30 | -52.68% |

## Dataset bench snapshot (`dataset/`, 1036 files)
| Model | Total p50 (ms) | Total p95 (ms) | TTFR p50 (ms) | Peak RAM (MB) |
|---|---:|---:|---:|---:|
| ixos-flash-v2 | 198 | 408 | 109 | 126 |
| potion | 138 | 277 | 109 | 56 |
| ixos-pro-v1 | 202 | 597 | 110 | 200 |

## Root cause and fixes
1. Root cause: Auto CLI path eagerly indexed both Flash and Pro engines across the full repo before search timing, making Auto behave like Pro in startup cost.
2. Fix: Skip eager Pro indexing in Auto mode (`src/main.rs`) and keep eager Pro indexing only for Pro mode.
3. Additional tuning: tighten Auto refinement gate (`src/ixos_rank/progressive.rs`) and cap Auto refine timeout to 2.5s.
4. Stability fix: doctest compile issue in `src/attestation/mod.rs` fixed.
5. Score hygiene: lexical match ratio now clamped to `[0,1]` (`src/ixos_rank/types.rs`) with new test.

## Current bottleneck ranking (from profile + repo sweeps)
1. Directory walk / candidate generation over very large trees (still dominant for cold/full-repo runs).
2. Flash semantic pass over large candidate sets.
3. Evidence extraction tail (improved by deferred emission and tighter limits, but still present in completion path).

## Outcome
Auto now behaves as the fast default on large repos for tested queries, with average latency aligned to Flash and no longer paying full Pro startup cost.
