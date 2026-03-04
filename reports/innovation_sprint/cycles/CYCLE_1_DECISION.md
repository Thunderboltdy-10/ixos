# CYCLE 1 DECISION

Generated: 2026-03-03 21:50 UTC

## Decision
- Status: `GO (flagged integration candidate)`
- Decision type: `KEEP prototype concept, no core merge yet`

## Why
- Failure atlas remains deterministic and exposes two trust failures in current product behavior.
- Witness-guard prototype fixes the highest-trust failure in scoped evaluation (`+1` pass, no regressions in evaluated set).
- Prototype is minimal, explainable, and compatible with local-first constraints.

## Evidence
- Baseline failures: `reports/innovation_sprint/failure_atlas/results_latest.md`
- Prototype improvement: `reports/innovation_sprint/cycles/CYCLE_1_PROTOTYPE.md`
- Validation matrix: `reports/innovation_sprint/cycles/CYCLE_1_MEASURE.md`

## Risks
- Potential overfitting to atlas phrases (especially short and token-rich queries).
- Candidate-pool expansion may increase latency if integrated naively.
- Path-based restricted penalties can hide legitimate results in edge cases.

## Falsification Criteria (fast kill tests)
1. Flagged integration does not reduce trust failures on atlas by at least one case.
2. Ralph `total_p95_ms` regresses by >10% with flag enabled in comparable runs.
3. Explicit sensitive query case (`restricted data`) regresses (must-include violation).

## Follow-ups
1. Integrate witness guard in `progressive.rs` behind `IXOS_EXPERIMENT_WITNESS_GUARD=1`.
2. Add A/B harness mode: baseline vs flag with identical query sets and fixed limits.
3. Extend atlas with additional hard negatives from real repo (non-`corpus_tiny`) and rerun stability.

## If Pablo Has Only 2 Hours, Do This Next
1. Implement the flag in runtime ranking path and run `run_failure_atlas.py` + one isolated Ralph pass.
2. Stop if trust fails unchanged or p95 regression >10%.
