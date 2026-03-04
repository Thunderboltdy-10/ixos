# 01 Baseline

Generated: 2026-03-03 21:40:34 UTC

## Baseline Repo State
- Branch/HEAD captured before baseline batch:
  - `git status --short --branch` -> `## roadmap...origin/roadmap` (dirty only from untracked report artifacts)
  - `git rev-parse HEAD` -> `9e7cf3f93e8ef70caea84c2f0e923793f5d4417c`
  - `git diff --stat` -> empty before edits

## A) Validation Matrix

### Commands executed

| Command | Exit | Result | Evidence |
| --- | ---: | --- | --- |
| `cargo test -q` | `0` | PASS | `reports/innovation_sprint/artifacts/baseline_cargo_test_20260303_222844.txt` |
| `cargo test --test settings_matrix -q` | `0` | PASS | `reports/innovation_sprint/artifacts/baseline_settings_matrix_20260303_222908.txt` |
| `npm --prefix ui run build` | `0` | PASS | `reports/innovation_sprint/artifacts/baseline_ui_build_20260303_222929.txt` |
| `npm --prefix ixos-site run build` | `0` | PASS | `reports/innovation_sprint/artifacts/baseline_site_build_20260303_222930.txt` |
| `python scripts/ralph_loop.py --checkpoint R2 --bench-dir . --bench-runs 3 --objective-profile harsh` (isolated env) | `1` | FAIL (landing audit stale-data check) | `reports/innovation_sprint/artifacts/baseline_ralph_loop_20260303_222952.txt`, `reports/ralph/iteration_17_20260303_212952.md` |

### Test/build highlights
- `cargo test -q`: `475 passed; 0 failed; 6 ignored` (core set), plus integration suites passed.
- `settings_matrix`: `1 passed; 0 failed`.
- UI and site production builds complete successfully.

### Ralph loop metrics (iteration 17, harsh Tier C)
- Bench artifact: `reports/ralph/big_bench_20260303_213041.json`
- Summary:
  - TTFR p50/p95: `46 / 66 ms`
  - Total p50/p95: `47 / 68 ms`
  - Cold TTFR p50: `65 ms`
  - Cold Total p95: `180 ms`
  - Warm Total p95: `68 ms`
  - Walk p95: `160 ms`
  - Ripgrep p95: `35 ms`
  - Embed p95: `0 ms`
  - Rank p95: `2 ms`
- Relative delta vs previous bench (`comparison_17_20260303_212952.md`):
  - TTFR p95 regressed `+10.00%`
  - Total p95 regressed `+7.94%`
  - Largest regression query: `cache mode` (`+10 ms total p95`)
- Loop fail reason:
  - `landing_audit` stale-data check failed (`ixos-site/src/data/benchmarks.json` older than latest benchmark).

## B) Quality Baselines

### Golden suite
- Command: `python scripts/run_golden.py` (internally isolated env + consent + corpus index).
- Exit: `1`
- Failure:
  - `logs_streamed` top-1 mismatch:
    - expected: `corpus_tiny/misc/changelog.txt`
    - actual: `corpus_tiny/logs/app.log`
- Evidence: `reports/innovation_sprint/artifacts/baseline_golden_20260303_223058.txt`

### Eval harness
- Command:
  - `python scripts/ixos_eval.py --suite both --only-ids ixos-flash-v2 --real-limit 120 --topk 10 --output reports/innovation_sprint/artifacts/ixos_eval_baseline_20260303_223118.json --csv reports/innovation_sprint/artifacts/ixos_eval_baseline_20260303_223118.csv`
- Exit: `0`
- Metrics (`ixos-flash-v2`):
  - Synthetic ambiguity:
    - Recall@10: `1.0000`
    - MRR@10: `0.9444`
    - Latency ms/1k: `105.31`
  - Real corpus:
    - Recall@10: `0.9450`
    - MRR@10: `0.8763`
    - Latency ms/1k: `324.47`

### Failure atlas (new)
- Suite: `reports/innovation_sprint/failure_atlas/queries.json`
- Runner:
  - `python reports/innovation_sprint/scripts/run_failure_atlas.py --volatility-runs 5`
- Single-run summary:
  - Cases: `16`
  - Pass: `14`
  - Fail: `2`
  - Failures:
    - `exact_anchor_results_streamed_flash` (missing `logs/app.log`, leaks `restricted/secret.txt`)
    - `semantic_drift_results_streamed_auto_secret` (leaks `restricted/secret.txt`)
- Evidence:
  - `reports/innovation_sprint/failure_atlas/results_latest.json`
  - `reports/innovation_sprint/failure_atlas/results_latest.md`

## C) Stability / Volatility Check (5x)

### Method
- Isolated temp profile (`HOME`, `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `APPDATA`) with fresh consent/index bootstrap.
- Repeated all non-heavy atlas cases (`15` cases; root stress case excluded) for `5` runs.
- Metrics:
  - top1 flip rate
  - pairwise Jaccard@k

### Result
- Mean top1 flip rate: `0.0`
- Mean pairwise Jaccard@k: `1.0`
- Interpretation: no observed ranking volatility across measured `corpus_tiny` atlas cases in isolated mode.
- Evidence:
  - `reports/innovation_sprint/failure_atlas/volatility_latest.json`
  - `reports/innovation_sprint/failure_atlas/volatility_latest.md`

## Baseline Takeaways
- Core correctness gates are mostly green, but trust-critical failures remain:
  - anchor miss on `results streamed` in flash
  - privacy drift into restricted file for `results streamed` in flash/auto
- Latency tail is still walk-dominated at Tier C harsh profile.
- Golden expectations need reconciliation (behavior vs expected top-1 for `logs_streamed`).
