# AGENT PLAN

Last updated: 2026-03-03 20:02 UTC

## Mission
- Explore and validate genuinely novel semantic file-search architectures for Ixos.
- Keep experiments minimal, reversible, and evidence-linked.

## Current Loop (Cycle 1 complete)
- [x] Observe: map architecture + baseline metrics + failure cases.
- [x] Orient: generate broad hypothesis space.
- [x] Diverge: literature + prior-art scan.
- [x] Converge: shortlist candidates with novelty cards.
- [x] Act: minimal prototype (reports-only anchor-consistency rerank).
- [x] Measure: tests + settings matrix + Ralph loop + failure suite.
- [x] Document: decisions, bibliography, final ranked candidates.

## State Snapshot
- Baseline validation:
  - `cargo test -q`: PASS
  - `cargo test --test settings_matrix -q`: PASS
  - `npm --prefix ui run build`: PASS
  - `npm --prefix ixos-site run build`: PASS
- Ralph loop checkpoints:
  - Iteration 14 (`reports/ralph/iteration_14_20260303_193850.md`): bench FAIL gate (`cold_ttfr_p50=131ms`, target `120ms`)
  - Iteration 15 (`reports/ralph/iteration_15_20260303_195343.md`): bench PASS gate (`cold_ttfr_p50=53ms`)
- Failure suite (`reports/innovation/failure_suite/results_latest.md`):
  - `fn_flash_results_streamed`: FAIL (misses `corpus_tiny/logs/app.log` in top-5)
  - `fp_auto_results_streamed`: FAIL (`corpus_tiny/restricted/secret.txt` appears in top-5)
  - `control_pro_results_streamed`: PASS (`app.log` included in top-5)
- Prototype (`reports/innovation/prototypes/anchor_guard_results.md`):
  - Hit@k: `0.6667 -> 1.0000`
  - MRR: `0.1667 -> 0.6667`
  - Anchor-trust@k: `0.1333 -> 0.2000`

## Next Top 3 Tasks
1. Decide whether to implement candidate #1 (AARC) behind a dev-only flag.
2. Expand failure suite from 3 to 10+ adversarial queries.
3. If implementing, expose uncertainty/witness labels through Tauri payload + UI badges.
