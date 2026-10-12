# Final Best Direction for Ixos
Date: 2026-02-25
Selected hero object: **Probe-Miss Martingale Certificate (PMMC)**

## Selection rationale

PMMC is selected as the single coherent direction because it best satisfies all required criteria:
1. Plausible for large speed + accuracy gains: it removes expensive work by certifying when not to escalate.
2. Real math: martingale/confidence-sequence style risk control with budget-constrained decision policy.
3. General method framing: applies to multi-stage retrieval pipelines beyond Ixos.
4. Strong Ixos systems case study: maps directly to measured bottlenecks (walk/scan/tail spikes).
5. Defensible novelty: contribution is integration object + guarantee + evidence, not "first ever primitive."

---

## Final CS-style research question (general + Ixos evaluation)

General RQ:
- Can an anytime probe-miss risk certificate be used to drive budgeted stage selection in multi-stage retrieval, reducing latency while controlling retrieval miss-risk?

Ixos case-study RQ:
- In a local-first no-global-DB search engine, can PMMC reduce TTFR and total p95 by eliminating unnecessary file scan and semantic escalation while preserving retrieval quality?

---

## Hypotheses and success thresholds

H1 - Work removal and latency:
- Reduce files opened/scanned per query by >= 60% on large-root workloads.
- Reduce total p95 latency by >= 35% versus current Ixos baseline.

H2 - Quality retention or gain:
- MRR@10 improves by >= 0.03, or
- MRR@10 drop remains <= 0.01 while H1 latency target is met.

H3 - Certificate reliability:
- Empirical miss-risk violation rate <= `alpha + 0.02` for configured `alpha` (example 0.05).

H4 - TTFR:
- TTFR p50 improves by >= 20% in cold/progressive large-root settings while preserving meaningful early results.

---

## Minimal baseline set

1. Current Ixos baseline:
- Existing progressive behavior and stage heuristics.

2. Strong simple heuristic baseline:
- Frontier-first + static budget caps + query heuristics (no formal certificate).

3. Proposed PMMC method:
- Probe generation, sequential miss evidence update, risk-certified budgeted escalation policy.

---

## Paper outline (general method paper)

1. Problem formulation: budgeted multi-stage retrieval under miss-risk control
2. PMMC object definition and algorithm
3. Theoretical guarantees and assumptions
4. Complexity and implementation design
5. Experimental protocol and baselines
6. Results and ablations
7. Failure cases and boundary conditions
8. Conclusion

---

## EE outline (Ixos-focused systems evaluation)

1. Ixos pipeline and bottleneck characterization
2. PMMC integration points in Ixos
3. Measurement protocol and reproducibility artifacts
4. Baseline comparisons
5. Main metrics: TTFR, total p95, stage timings, scanned files, MRR@10
6. Reliability analysis: miss-risk calibration and violation rates
7. Practical constraints: no-global-DB storage model, daemon memory behavior
8. Threats to validity and next steps

---

## Safest novelty claim language

Use:
- "Our contribution is a probe-miss, anytime-valid certificate for budgeted work elimination in multi-stage retrieval."
- "We evaluate this method in a local-first no-global-DB system and report latency, quality, and calibration tradeoffs."
- "To our knowledge, prior work does not evaluate this exact combination of certificate object, systems constraints, and progressive local-search deployment."

Do not use:
- "first to"
- "novel primitive"
- "state-of-the-art everywhere"

---

## Defensible contribution statement

If true novelty is limited, the strongest claim is:
- A rigorous integration contribution with formalized certificate policy,
- explicit work-removal mechanism,
- reproducible Ixos systems evidence under realistic bottlenecks and storage constraints.

This is still publication-grade if benchmarks and ablations are strong and transparent.
