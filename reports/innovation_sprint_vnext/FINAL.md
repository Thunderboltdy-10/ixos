# FINAL (Living)

Last updated: 2026-03-04

## Pareto Snapshot

| Variant | AnchorTop1Hit@1 | PlausibleWrong@k | SensitiveLeak@k | Latency p50/p95 (ms) | Notes |
| --- | ---: | ---: | ---: | ---: | --- |
| Baseline Flash | 0.80 | 0.1333 | 0.0 | 633.57 / 762.57 | Fastest trustworthy baseline point |
| C1 risk_budget_v1 | 1.00 | 0.0333 | 0.0 | 865.40 / 1725.16 | Quality-heavy, too slow |
| C2 risk_budget_v2 (25%) | 0.88 | 0.1067 | 0.0 | 652.11 / 1439.39 | Moderate trust gain, p95 too high |
| C2 risk_budget_v2 (3%) | 0.80 | 0.1333 | 0.0 | 642.08 / 816.49 | Near baseline speed, no trust gain |

## Top 5 Candidate Architectures (Research-Worthy)

### 1) Trust-Constrained Lagrangian Ranking
- Plain English: rank by relevance but explicitly penalize leak risk, anchor-miss risk, and instability.
- Formal definition: maximize `E[Rel(x,q)] - λ1*LeakRisk(x,q) - λ2*AnchorMiss(x,q) - λ3*Instability(x,q)` with adaptive `λ` from query risk.
- Kill test: if trust metrics do not improve without severe recall loss, reject.
- Prior art match: constrained ranking / fairness-style objective.
- Novelty claim: local-first trust constraints + latency-aware adaptive dual weights in desktop search.
- Expected EE graphs: trust-vs-latency frontier, λ sensitivity, per-category failure reductions.
- Minimal sketch: implement score post-processing in `progressive.rs` behind `IXOS_EXPERIMENT_TRUST_LAGRANGIAN`.

### 2) Confidence-Sequence Anytime Controller
- Plain English: stop compute when confidence in current top-k is statistically sufficient.
- Formal definition: maintain confidence sequence on top1-vs-top2 margin; escalate only when lower bound < threshold.
- Kill test: if confidence bounds are poorly calibrated and miss-risk remains high.
- Prior art match: anytime bandits, sequential testing.
- Novelty claim: bound-based escalation under local privacy and strict p95 targets.
- Expected EE graphs: regret/latency curves, confidence coverage plots.
- Minimal sketch: add uncertainty tracker in `progressive.rs` semantic/refine gate.

### 3) BlockMaxWAND + Topology Upper Bounds
- Plain English: skip low-potential candidate blocks earlier using block upper bounds augmented by directory priors.
- Formal definition: upper bound `UB(block,q)=BM25_ub + α*TopoPrior_ub`; prune when `UB < kth_score`.
- Kill test: no significant p95 cut at fixed anchor/recall.
- Prior art match: WAND/BlockMaxWAND.
- Novelty claim: coupling filesystem topology priors into block pruning for local corpora.
- Expected EE graphs: skipped-block ratio vs recall, p95 reductions.
- Minimal sketch: candidate generator block abstraction over path index postings.

### 4) Counterfactual Stability Regularized Ranking
- Plain English: discourage rankings that flip under small query perturbations.
- Formal definition: optimize `Score - β * E[|rank(q)-rank(q')|]` over perturbation set `q'`.
- Kill test: if stability increases but relevance/latency collapses.
- Prior art match: robust ranking / adversarial retrieval.
- Novelty claim: explicit stability objective tied to trust failure taxonomy.
- Expected EE graphs: perturbation sensitivity distributions, stability vs quality.
- Minimal sketch: offline calibration loop + lightweight online approximation for top-k.

### 5) Witness-Chain Top1 Gate
- Plain English: do not let top1 win unless snippet/path evidence chain is sufficient for anchor-bearing queries.
- Formal definition: `Top1 allowed iff WitnessScore >= τ(q)` where `WitnessScore = w_path + w_snippet + w_anchor`.
- Kill test: if witness gate blocks correct answers too often.
- Prior art match: grounded answer verification.
- Novelty claim: trustful local retrieval gate without remote verification services.
- Expected EE graphs: top1 trust gain vs false suppression rate.
- Minimal sketch: extend existing witness guard path in `progressive.rs` with calibrated thresholds.

## Recommendation Right Now
- Do not ship synchronous Pro escalation controller.
- Prioritize score-level trust constraints and confidence-based stopping that avoid hard p95 penalties.

## If Pablo Has Only 2 Hours
1. Implement trust-constrained score post-processing (Lagrangian prototype) behind env flag.
2. Re-run atlas + 5x stability and compare against baseline and C1/C2 Pareto points.
3. Keep only if `AnchorTop1Hit@1` improves and p95 regression <= 15%.
