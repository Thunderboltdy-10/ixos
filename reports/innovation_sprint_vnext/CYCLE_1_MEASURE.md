# CYCLE 1 MEASURE

Date: 2026-03-04
Evaluation harness: `scripts/run_innovation_atlas.py`
Atlas: `reports/innovation_sprint_vnext/atlas/queries.json` (30 cases, 5 runs/case)

Artifacts:
- Baseline: `reports/innovation_sprint_vnext/atlas/results_baseline_flash.json`
- Cycle 1: `reports/innovation_sprint_vnext/atlas/results_cycle1_risk_budget_v1.json`

## Before/After Table

| Metric | Baseline Flash | Cycle1 risk_budget_v1 | Delta |
| --- | ---: | ---: | ---: |
| OverallPassRate | 1.0000 | 1.0000 | 0.0000 |
| AnchorHit@k | 1.0000 | 1.0000 | 0.0000 |
| AnchorTop1Hit@1 | 0.8000 | 1.0000 | +0.2000 |
| PlausibleWrong@k | 0.1333 | 0.0333 | -0.1000 |
| SensitiveLeak@k | 0.0000 | 0.0000 | 0.0000 |
| Jaccard@k stability | 1.0000 | 1.0000 | 0.0000 |
| Latency p50 (ms) | 633.57 | 865.40 | +231.83 |
| Latency p95 (ms) | 762.57 | 1725.16 | +962.59 |
| Ref agreement avg | 0.8796 | 0.9044 | +0.0248 |
| Controller Pro call rate | 0.0000 | 0.5000 | +0.5000 |

## Interpretation
- Trust quality improved materially (top1 anchor and plausible-wrong).
- p95 tail regressed heavily because Pro escalations occurred in 50% of runs.
- This is a valid quality-focused Pareto point, but not shippable for speed target.

## Ralph/Bench Cross-check
No production benchmark path changed in this cycle; ralph/big-bench baselines remain from pre-change artifacts.
