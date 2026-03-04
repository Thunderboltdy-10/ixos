# CYCLE 1 PLAN

Date: 2026-03-04
Mode: blind ideation (no prior innovation docs consulted yet)

## Observe (3 Failures + 1 Perf Bottleneck)
1. Atlas plausible-wrong rate at baseline is non-trivial (`PlausibleWrong@k = 0.1333`), despite 100% hit@k.
2. Anchor top1 reliability is weak (`AnchorTop1Hit@1 = 0.8`).
3. Native-cache mixed stability variance is high (`23/40` unstable top1 queries over 5 runs).
4. Perf bottleneck target: p95 tail sensitivity from escalation/uncertainty paths (controller-level overhead spikes).

## Orient
Code points mapped:
- Search orchestration: `src-tauri/src/commands/search.rs`
- Progressive flow and witness/fusion logic: `src/ixos_rank/progressive.rs`
- Candidate generation + ripgrep caps: `src/ixos_rank/candidate_generator/*`
- Semantic rerank/cache path: `src/ixos_rank/semantic_engine.rs`

Instrumentation for cycle-level experimentation:
- Prototype in `scripts/run_innovation_atlas.py` (flag-gated only, no default runtime changes).

## Diverge: 12 ToT Branches

1. `A1` BlockMaxWAND with topology upper bounds (candidate pruning)
- Impact: reduce ripgrep/candidate p95 by skipping low-upper-bound blocks.
- Risk: misses long-tail relevant files.
- Kill test: no >=20% p95 reduction at equal anchor hit.

2. `A2` Two-tier lexical funnel with confidence cutoffs
- Impact: reduce TTFR on easy queries.
- Risk: over-pruning hard paraphrases.
- Kill test: Recall/AnchorHit drops >2 points.

3. `B1` Constrained trust-relevance Lagrangian (mathy)
- Impact: explicit control of plausible-wrong and leak penalties.
- Risk: unstable lambda tuning.
- Kill test: no trust metric improvement with same/less latency.

4. `B2` Counterfactual score sensitivity regularizer (mathy)
- Impact: reduce rank flips and top1 instability.
- Risk: hurts relevance on clean queries.
- Kill test: Jaccard stability not improved.

5. `C1` Optional ANN sidecar under explicit privacy gate
- Impact: faster recall in warm regimes.
- Risk: violates zero-index spirit if defaulted.
- Kill test: any default-on indexing or privacy ambiguity.

6. `C2` Embedding cache eviction by uncertainty
- Impact: better cache utility under memory limits.
- Risk: churn on repeated queries.
- Kill test: hit-rate and p95 both worsen.

7. `D1` Risk-budgeted Flash->Pro escalation (mathy bandit flavor)
- Impact: trust recovery on uncertain queries with bounded compute.
- Risk: p95 spikes if budget poorly tuned.
- Kill test: no Pareto point vs baseline.

8. `D2` Confidence-sequence anytime stop (mathy)
- Impact: stop early when top-k confidence high.
- Risk: confidence miscalibration.
- Kill test: confidence bounds fail to predict misses.

9. `E1` Directory/workstream prior graph boost
- Impact: better personal/workspace relevance.
- Risk: folder-name bias.
- Kill test: cross-folder recall drops.

10. `F1` Late-interaction mini reranker on top-k only
- Impact: improve top1 quality.
- Risk: latency blowup.
- Kill test: p95 regression >30% without trust gain.

11. `G1` Witness-chain constraint before top1 promotion
- Impact: reduce plausible-wrong top result.
- Risk: false suppression of valid semantic hits.
- Kill test: no reduction in plausible-wrong.

12. `H1` Adaptive IO scheduling for ripgrep walk threads
- Impact: reduce filesystem tail variance.
- Risk: platform-specific regressions.
- Kill test: no measurable p95 gain on target hardware.

## Self-Consistency Selection (3 independent rankings)
Top-2 repeatedly selected:
1. `D1` Risk-budgeted escalation.
2. `B1` Constrained trust-relevance scoring.

Chosen for CYCLE 1 action:
- Implement `D1` as prototype-only controller in atlas runner (flag-gated).

## Success Metrics / Kill Tests
Primary:
- `AnchorTop1Hit@1` increase.
- `PlausibleWrong@k` decrease.
- `SensitiveLeak@k` unchanged at 0.
- Latency p95 regression bounded by explicit Pareto accounting.

Kill:
- If trust gain <2 absolute points and p95 worsens >50%, mark no-go for default path.
