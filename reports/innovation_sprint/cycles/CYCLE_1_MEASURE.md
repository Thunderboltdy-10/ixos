# CYCLE 1 MEASURE

Generated: 2026-03-03 21:50 UTC

## Validation Matrix Re-run

| Command | Exit | Status | Evidence |
| --- | ---: | --- | --- |
| `cargo test -q` | `0` | PASS | `reports/innovation_sprint/artifacts/cycle1_cargo_test_20260303_224520.txt` |
| `cargo test --test settings_matrix -q` | `0` | PASS | `reports/innovation_sprint/artifacts/cycle1_settings_matrix_20260303_224550.txt` |
| `npm --prefix ui run build` | `0` | PASS | `reports/innovation_sprint/artifacts/cycle1_ui_build_20260303_224610.txt` |
| `npm --prefix ixos-site run build` | `0` | PASS | `reports/innovation_sprint/artifacts/cycle1_site_build_20260303_224610.txt` |
| `python scripts/ralph_loop.py --checkpoint R2 --bench-dir . --bench-runs 3 --objective-profile harsh` (isolated env) | `1` | FAIL (landing audit stale-data check) | `reports/innovation_sprint/artifacts/cycle1_ralph_loop_20260303_224629.txt` |

## Ralph (Iteration 18) vs Iteration 17
- Before: `reports/ralph/big_bench_20260303_213041.json`
- After: `reports/ralph/big_bench_20260303_214720.json`
- Comparison: `reports/ralph/comparison_18_20260303_214629.md`

### Core latency deltas
- TTFR p95: `66 -> 70 ms` (`+6.06%`)
- Total p95: `68 -> 76 ms` (`+11.76%`)
- Cold Total p95: `180 -> 482 ms` (`+167.78%`)
- Stage p95:
  - Walk: `160 -> 161 ms`
  - Ripgrep: `35 -> 39 ms`
  - Embed: `0 -> 5 ms`
  - Rank: `2 -> 5 ms`

Interpretation:
- No performance win this cycle (expected; no core runtime optimization implemented).

## Failure Atlas (current baseline)
- `python reports/innovation_sprint/scripts/run_failure_atlas.py`
- Summary:
  - Cases: `16`
  - Pass: `14`
  - Fail: `2`
  - Failing trust cases:
    - `exact_anchor_results_streamed_flash`
    - `semantic_drift_results_streamed_auto_secret`
- Evidence:
  - `reports/innovation_sprint/failure_atlas/results_latest.json`
  - `reports/innovation_sprint/failure_atlas/results_latest.md`

## Prototype Measurement (reports-only)
- `python reports/innovation_sprint/cycles/cycle_1_witness_guard_prototype.py`
- Scope: `15` atlas cases (large-directory stress excluded for fast loop)
- Result:
  - Baseline pass/fail: `14 / 1`
  - Prototype rerank pass/fail: `15 / 0`
  - Delta: `+1` pass
  - Mean query latency (expanded candidate pull): `646.2 ms`
- Key improvement:
  - `exact_anchor_results_streamed_flash`
    - Before top-5: missing `logs/app.log`, contains `restricted/secret.txt`
    - After top-5: includes `logs/app.log`, excludes `restricted/secret.txt`
- Evidence:
  - `reports/innovation_sprint/cycles/CYCLE_1_PROTOTYPE.json`
  - `reports/innovation_sprint/cycles/CYCLE_1_PROTOTYPE.md`

## Caveats
- Prototype baseline uses expanded retrieval limit (`>=20`) for rerank feasibility; not apples-to-apples with production `limit=8` behavior.
- Improvement is proof-of-feasibility, not yet product-integrated evidence.

## Pareto Frontier Update (Cycle 1)
- Point A (current product): better latency, unresolved trust failures.
- Point B (prototype controller, offline): improved trust on targeted failure, unknown runtime overhead in product path.
- Next frontier task: integrate behind flag and measure latency-quality tradeoff directly in product loop.
