# RUNLOG

Append-only command log. Timestamps in UTC.

## 2026-03-03 19:36 UTC
- Initialized `reports/innovation/` workspace files.
- Command: `git status --short --branch`
- Output: `## roadmap...origin/roadmap`

## 2026-03-03 19:38-19:40 UTC
- Command: `cargo test -q`
- Result: PASS (`475 passed; 0 failed; 6 ignored`, plus integration suites)
- Command: `cargo test --test settings_matrix -q`
- Result: PASS (`1 passed; 0 failed`)
- Command: `npm --prefix ui run build`
- Result: PASS
- Command: `npm --prefix ixos-site run build`
- Result: PASS
- Command: `python scripts/ralph_loop.py --checkpoint R2 --bench-dir . --bench-runs 3 --objective-profile harsh`
- Result: FAIL gate
- Artifacts:
  - `reports/ralph/iteration_14_20260303_193850.md`
  - `reports/ralph/big_bench_20260303_194035.json`
  - `reports/ralph/comparison_14_20260303_193850.md`
- Key metrics:
  - `ttfr_p50=42ms`, `ttfr_p95=63ms`
  - `total_p50=44ms`, `total_p95=73ms`
  - `cold_ttfr_p50=131ms` (harsh target fail)

## 2026-03-03 19:41-19:45 UTC
- Command: `python scripts/run_golden.py`
- Result: FAIL (single mismatch reported)
- Manual reproduction commands:
  - `target/debug/ixos search "results streamed" --dir corpus_tiny --format json --limit 5 --search-mode flash --cache-mode memory`
  - `target/debug/ixos search "results streamed" --dir corpus_tiny --format json --limit 5 --search-mode auto --cache-mode memory`
  - `target/debug/ixos search "results streamed" --dir corpus_tiny --format json --limit 5 --search-mode pro --cache-mode memory`
- Observation: Flash/Auto miss `app.log` in top-5; Auto includes unrelated `restricted/secret.txt`.

## 2026-03-03 19:46-19:50 UTC
- Added failure suite and isolated runner:
  - `reports/innovation/failure_suite/queries.json`
  - `reports/innovation/failure_suite/run_failure_suite.py`
- Command: `python reports/innovation/failure_suite/run_failure_suite.py`
- Output artifacts:
  - `reports/innovation/failure_suite/results_latest.json`
  - `reports/innovation/failure_suite/results_latest.md`
- Result: FAIL by design (both target failure modes reproduced).

## 2026-03-03 19:50-19:54 UTC
- Added minimal prototype:
  - `reports/innovation/prototypes/anchor_guard_prototype.py`
- Command: `python reports/innovation/prototypes/anchor_guard_prototype.py`
- Output artifacts:
  - `reports/innovation/prototypes/anchor_guard_results.json`
  - `reports/innovation/prototypes/anchor_guard_results.md`
- Result: PASS (prototype executed)
- Key prototype deltas:
  - `hit_at_k`: `0.6667 -> 1.0000`
  - `mrr`: `0.1667 -> 0.6667`
  - `anchor_trust_at_k`: `0.1333 -> 0.2000`

## 2026-03-03 19:54-19:55 UTC (post-act measure)
- Command: `cargo test -q` -> PASS
- Command: `cargo test --test settings_matrix -q` -> PASS
- Command: `python scripts/ralph_loop.py --checkpoint R2 --bench-dir . --bench-runs 3 --objective-profile harsh`
- Result: PASS bench gate, FAIL landing audit stale-data check
- Artifacts:
  - `reports/ralph/iteration_15_20260303_195343.md`
  - `reports/ralph/big_bench_20260303_195514.json`
  - `reports/ralph/comparison_15_20260303_195343.md`
- Key metrics:
  - `ttfr_p50=43ms`, `ttfr_p95=65ms`
  - `total_p50=44ms`, `total_p95=71ms`
  - `cold_ttfr_p50=53ms` (harsh gate PASS)

## 2026-03-03 19:56-20:02 UTC
- Completed literature scan and novelty cards.
- Wrote final ranked candidate report: `reports/innovation/FINAL.md`.
- Updated `AGENT_PLAN.md`, `DECISIONS.md`, `IDEAS.md`, `BIBLIOGRAPHY.md`.
