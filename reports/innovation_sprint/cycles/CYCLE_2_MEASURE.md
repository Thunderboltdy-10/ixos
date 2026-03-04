# CYCLE 2 MEASURE

Generated: 2026-03-03 22:02 UTC

## Validation Matrix (post-code-change)

| Command | Exit | Status | Evidence |
| --- | ---: | --- | --- |
| `cargo test -q` | `0` | PASS | `reports/innovation_sprint/artifacts/cycle2_cargo_test_20260303_225816.txt` |
| `cargo test --test settings_matrix -q` | `0` | PASS | `reports/innovation_sprint/artifacts/cycle2_settings_matrix_20260303_225843.txt` |
| `npm --prefix ui run build` | `0` | PASS | `reports/innovation_sprint/artifacts/cycle2_ui_build_20260303_225913.txt` |
| `npm --prefix ixos-site run build` | `0` | PASS | `reports/innovation_sprint/artifacts/cycle2_site_build_20260303_225913.txt` |
| isolated Ralph (`R2`, harsh, guard flag ON) | `1` | FAIL (`landing_audit` stale benchmark data) | `reports/innovation_sprint/artifacts/cycle2_ralph_loop_20260303_225945.txt` |

## Atlas A/B (core signal)

### Baseline (flag OFF)
- Source: `reports/innovation_sprint/cycles/CYCLE_2_ATLAS_BASELINE.json`
- Result: `14/16` pass, `2` fail
- Failing:
  - `exact_anchor_results_streamed_flash`
  - `semantic_drift_results_streamed_auto_secret`

### Flag ON (v2 tuned guard)
- Source: `reports/innovation_sprint/cycles/CYCLE_2_ATLAS_FLAG_ON_v2.json`
- Result: `15/16` pass, `1` fail
- Remaining failing case:
  - `exact_anchor_results_streamed_flash` (still missing `logs/app.log`)

### Delta
- Pass count: `+1` (`14 -> 15`)
- Restricted leak in auto case: fixed
- Large-directory stress case: preserved (PASS in v2 tuned run)

## Ralph (flag ON) vs previous run
- Comparison: `reports/ralph/comparison_19_20260303_215945.md`
- Before: iteration 18 (`big_bench_20260303_214720.json`)
- After: iteration 19 (`big_bench_20260303_220112.json`)

### Core metrics
- TTFR p95: `70 -> 72 ms` (`+2.86%`)
- Total p95: `76 -> 74 ms` (`-2.63%`)
- Cold Total p95: `482 -> 181 ms` (`-62.45%`)
- Warm Total p95: `74 -> 74 ms` (unchanged)

Interpretation:
- No clear latency penalty from flag-on run at this noise level; totals improved from iteration 18, but run-to-run variance remains non-trivial.

## What We Learned
- Targeted guard activation is better than always-on adjustment.
- Current guard is good at leak suppression, not enough yet for anchor recovery in flash top-5.
- Remaining miss likely requires post-rank anchor injection or deeper candidate/rank integration.
