# CYCLE 2 MEASURE

Date: 2026-03-04
Artifacts:
- Baseline: `reports/innovation_sprint_vnext/atlas/results_baseline_flash.json`
- Cycle1 reference: `reports/innovation_sprint_vnext/atlas/results_cycle1_risk_budget_v1.json`
- Cycle2 budget25: `reports/innovation_sprint_vnext/atlas/results_cycle2_risk_budget_v2.json`
- Cycle2 budget3: `reports/innovation_sprint_vnext/atlas/results_cycle2_risk_budget_v2_budget003.json`

## Before/After Table (vs Baseline)

| Metric | Baseline | C2 budget25 | Delta | C2 budget3 | Delta |
| --- | ---: | ---: | ---: | ---: | ---: |
| OverallPassRate | 1.0000 | 1.0000 | 0.0000 | 1.0000 | 0.0000 |
| AnchorTop1Hit@1 | 0.8000 | 0.8800 | +0.0800 | 0.8000 | 0.0000 |
| PlausibleWrong@k | 0.1333 | 0.1067 | -0.0266 | 0.1333 | 0.0000 |
| SensitiveLeak@k | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 |
| Jaccard@k | 1.0000 | 0.9983 | -0.0017 | 1.0000 | 0.0000 |
| Latency p50 (ms) | 633.57 | 652.11 | +18.54 | 642.08 | +8.51 |
| Latency p95 (ms) | 762.57 | 1439.39 | +676.82 | 816.49 | +53.92 |
| Ref agreement avg | 0.8796 | 0.8837 | +0.0041 | 0.8796 | 0.0000 |
| Pro call rate | 0.0000 | 0.0800 | +0.0800 | 0.0133 | +0.0133 |

## Interpretation
- Budget25 keeps some trust improvement, but p95 remains too high.
- Budget3 keeps latency close to baseline but loses trust improvement.
- No budget setting in this cycle yields a strong simultaneous speed+trust win.

## Pareto Points
1. Baseline Flash: fastest tail among tested non-escalation variants.
2. C1 risk_v1: strongest trust gain, unacceptable p95.
3. C2 risk_v2 budget25: moderate trust gain, still heavy p95 penalty.
4. C2 risk_v2 budget3: near-baseline speed, near-baseline trust.
