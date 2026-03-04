# CYCLE 3 DECISION

Generated: 2026-03-03 23:00 UTC

## Decision
- Status: KEEP behind flag (default OFF)
- Outcome: quality win, performance caution

## Why
- Atlas improved from 14/16 to 16/16 with deterministic stability.
- Large-directory regression was resolved after removing broad lexical overfetch and narrowing fallback deepening.
- Ralph tail latency regressed in the latest iteration, so default-on is not justified yet.

## Evidence
- eports/innovation_sprint/cycles/CYCLE_3_ATLAS_BASELINE_v5.json
- eports/innovation_sprint/cycles/CYCLE_3_ATLAS_FLAG_ON_v6.json
- eports/innovation_sprint/cycles/CYCLE_3_VOLATILITY_FLAG_ON_v6.json
- eports/innovation_sprint/cycles/CYCLE_3_MEASURE.md
- eports/ralph/comparison_20_20260303_225705.md

## Risks
- p95/p99 regressions under broad benchmark workloads.
- Heuristic guard still sensitive to dataset-specific signal density.
- Potential overfitting to current failure atlas if not expanded.

## Follow-up Plan
1. Add a risk-calibrated controller: activate witness guard only when trust-risk score crosses threshold.
2. Expand atlas with more large-root command and filename-anchor cases.
3. Re-run Ralph and require no p95 regression before proposing default-on.

## If Pablo Has Only 2 Hours, Do This Next
1. Implement a lightweight trust-risk trigger (sensitive-in-top + missing dual witness).
2. A/B atlas + one Ralph iteration with trigger ON/OFF.
3. Keep only if 16/16 is preserved and TTFR/Total p95 do not regress.
