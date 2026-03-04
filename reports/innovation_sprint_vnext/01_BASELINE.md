# 01 Baseline

Generated: 2026-03-04
Artifacts root: `reports/innovation_sprint_vnext/artifacts`

## Isolation Setup
All baseline runs used isolated HOME/config/data roots under `.tmp/innovation_sprint_vnext/*`.

Environment isolation variables used:
- `HOME`
- `XDG_CONFIG_HOME`
- `XDG_DATA_HOME`
- `APPDATA` (Windows)

## Required Command Suite (Baseline)
Command summary source: `reports/innovation_sprint_vnext/artifacts/baseline_20260304_003416/summary.json`

| Step | Command | Exit | Duration (s) | Artifact |
| --- | --- | ---: | ---: | --- |
| Cargo tests | `cargo test` | 0 | 39.72 | `.../cargo_test.txt` |
| Settings matrix | `python scripts/run_settings_matrix.py` | 1 | 22.70 | `.../settings_matrix.txt` |
| UI build | `npm run build` | 0 | 11.61 | `.../ui_build.txt` |
| Site build (initial) | `cd ixos-site; npm run build` | 1 | 0.12 | `.../site_build.txt` |
| Ralph loop (standard) | `python scripts/ralph_loop.py --objective-profile standard` | 1 | 66.54 | `.../ralph_loop_standard.txt` |
| Golden suite | `python scripts/run_golden.py` | 0 | 15.88 | `.../golden_suite.txt` |

Corrected site build (same isolated approach):
- Command: `cd ixos-site && npm run build`
- Exit: 0
- Artifact: `reports/innovation_sprint_vnext/artifacts/baseline_20260304_003416/site_build_fixed_20260304_003949.txt`

## Quality/Contract Outcomes
- `cargo test`: PASS.
- `run_golden.py`: PASS.
- `run_settings_matrix.py`: FAIL with 24 failing combos (all non-progressive combinations produced `results array empty`).
  - Full table: `reports/settings_matrix_2026-03-03.md`.
- `ralph_loop.py --objective-profile standard`: overall FAIL because `landing_audit` failed.
  - Iteration report: `reports/ralph/iteration_21_20260303_233530.md`.
  - Bench within that loop still passed and produced benchmark JSON.

## Latency Baseline (Primary)
From `reports/ralph/big_bench_20260303_233636.json`:
- TTFR p50/p95: 44 / 87 ms
- Total p50/p95: 45 / 149 ms
- Cold TTFR p50: 215 ms
- Cold Total p95: 320 ms
- Warm Total p95: 100 ms
- Stage p95 (ms): walk 115, ripgrep 43, embed 36, rank 33

## Cold vs Mixed (5x Stability Bench)
Source: `reports/innovation_sprint_vnext/artifacts/stability_20260304_003842/stability_summary.json`

| Mode | Samples | TTFR p50/p95 | Total p50/p95 | Cold TTFR p50 | Cold Total p95 | Warm Total p95 | Cache Hit |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Ephemeral (cold-leaning) | 200 | 45 / 89 ms | 67 / 432 ms | 51 ms | 151 ms | 432 ms | 0% |
| NativeCache (mixed/warm) | 200 | 45 / 91 ms | 45 / 94 ms | 51 ms | 133 ms | 93 ms | 95% |

## Stability (5x Rank Variance)
Source: `reports/innovation_sprint_vnext/artifacts/stability_20260304_003842/top1_variance_summary.json`

NativeCache run (`big_bench_20260303_233915.json`):
- Queries: 40
- Unstable top1 queries: 23
- Stable rate: 0.425
- Avg unique top1 across 5 runs: 2.125

Ephemeral run (`big_bench_20260303_233904.json`):
- Queries: 40
- Unstable top1 queries: 0
- Stable rate: 1.0
- Avg unique top1 across 5 runs: 1.0

## New Atlas Baseline (30 Cases, 5 Runs/Case)
Artifacts:
- Query set: `reports/innovation_sprint_vnext/atlas/queries.json`
- Baseline result snapshot: `reports/innovation_sprint_vnext/atlas/results_baseline_flash.json`
- Runner: `scripts/run_innovation_atlas.py`

Baseline summary (Flash, memory cache, Pro reference):
- OverallPassRate: 1.0
- AnchorHit@k: 1.0
- AnchorTop1Hit@1: 0.8
- SensitiveLeak@k: 0.0
- PlausibleWrong@k: 0.1333
- Jaccard@k stability: 1.0
- Latency p50/p95: 633.57 / 762.57 ms
- Reference agreement average: 0.8796

## Exemplar Failures / Trust Risks
1. Settings matrix non-progressive mode returns empty results for half of combinations.
2. Atlas top-1 anchor misses exist despite hit@k pass (plausible-wrong behavior): examples include `A05`, `A08`, `P04`, `R02`.
3. Native-cache repeated runs show high top1 variance on 23/40 queries under mixed conditions.

## Warm-Cache Illusion Controls
- Isolated user/config state for all command bundles.
- Explicit indexing with `--clear` in golden + atlas bootstrap.
- Separate cold-leaning (ephemeral) and mixed/warm (native-cache) 5x benchmarks.
- Reported both cold and warm summaries, not only warm totals.
