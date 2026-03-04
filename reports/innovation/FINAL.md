# Innovation Architecture Candidates (Final)

Date: 2026-03-03 20:02 UTC

## 0) Observations

### Baseline validation
- `cargo test -q`: PASS
- `cargo test --test settings_matrix -q`: PASS
- `npm --prefix ui run build`: PASS
- `npm --prefix ixos-site run build`: PASS

### Ralph loop checkpoints
| Checkpoint | Artifact | Bench Gate | TTFR p50/p95 | Total p50/p95 | Cold TTFR p50 |
| --- | --- | --- | --- | --- | --- |
| Iteration 14 | `reports/ralph/iteration_14_20260303_193850.md` | FAIL | 42/63 ms | 44/73 ms | 131 ms |
| Iteration 15 | `reports/ralph/iteration_15_20260303_195343.md` | PASS | 43/65 ms | 44/71 ms | 53 ms |

### Reproduced failure modes
Artifact: `reports/innovation/failure_suite/results_latest.md`
- False negative: Flash misses obvious exact-hit file `corpus_tiny/logs/app.log` in top-5 for query `results streamed`.
- False positive: Auto includes unrelated `corpus_tiny/restricted/secret.txt` in top-5 for the same query.

### Minimal prototype evidence
Artifact: `reports/innovation/prototypes/anchor_guard_results.md`
- Hit@k: `0.6667 -> 1.0000`
- MRR: `0.1667 -> 0.6667`
- Anchor-trust@k: `0.1333 -> 0.2000`
- Note: prototype is reports-only and not integrated into production path.

## 1) Ranked architecture candidates (5)

### #1 AARC: Anytime Auditable Recall Certificate
- New object / guarantee:
  - Query certificate `C(q,t) = (L_t, alpha, tau, probe_trace, budget_state)`.
  - Goal: with confidence `1-alpha`, true Recall@K at step `t` is at least `L_t`.
  - Stop when `L_t >= tau`; else broaden frontier.
- Novelty argument:
  - Prior work has calibration/cascades, but not a runtime+UX certificate artifact for local file search.
- Integration path:
  - `src/ixos_rank/progressive.rs`: add `RiskCertificate`, escalation logic.
  - `src/ixos_rank/candidate_generator/mod.rs`: low-cost probes/frontier policies.
  - `src-tauri/src/commands/search.rs`: emit certificate metadata.
  - `ui/src/lib/types.ts`: optional uncertainty/certificate fields.
- Complexity: medium-high.
- Risks: probe bias, calibration drift.
- Measurement plan:
  - Accuracy: Recall@10, MRR@10, failure-suite Hit@5.
  - Latency: TTFR/Total p95 + stage p95.
  - Truthfulness: `UnsupportedTopKRate`, `CertificateViolationRate`.
- Math angle:
  - Anytime confidence sequence on recall process.
  - Theorem candidate: `P(exists t: Recall@K_t < L_t) <= alpha` under estimator assumptions.

### #2 CEDR: Counterfactual Exclusion Delta Regularizer
- New object / guarantee:
  - `Delta_anchor(d,q,A) = s(d,q) - s(d,q\A)`.
  - High-confidence results must satisfy `Delta_anchor >= delta_min`.
- Novelty argument:
  - Counterfactual LTR usually debiases training; this applies counterfactual sensitivity online for retrieval truthfulness.
- Integration path:
  - `src/ixos_rank/progressive.rs`: runtime anchor-drop probing.
  - `src/ixos_rank/evidence/mod.rs`: store anchor sensitivity evidence.
  - `src-tauri/src/commands/search.rs`: expose confidence tier + anchor sensitivity.
- Complexity: medium.
- Risks: may hurt paraphrase recall.
- Measurement plan:
  - False-positive@k, must-include hit@k, Recall/MRR, latency overhead.
- Math angle:
  - Conjecture: with sufficient penalty `lambda` and score margin assumptions, top-k enforces anchor sensitivity with bounded rank regret.

### #3 DWC: Dual-Witness Consistency Ranking
- New object / guarantee:
  - Witness tuple `W(d,q)=(w_lex,w_sem,w_path)`.
  - No high-confidence rank unless at least two independent witness channels agree.
- Novelty argument:
  - Fusion exists; witness-consistency as explicit ranking contract + UI truth tier is distinct.
- Integration path:
  - `src/ixos_rank/evidence/*` and `src/ixos_rank/progressive.rs`.
  - UI confidence badges tied to witness tiers.
- Complexity: medium.
- Risks: lexical-light true positives can be demoted.
- Measurement plan:
  - `HighConfidenceErrorRate`, `UnsupportedTopKRate`, Recall@10, TTFR.
- Math angle:
  - Agreement graph / consensus threshold formulation.

### #4 SVL: Semantic Volatility Ledger
- New object / guarantee:
  - Per-result volatility `V(d,q)` under micro perturbations.
  - High volatility blocks high-confidence labeling.
- Novelty argument:
  - Uses runtime stability as trust signal at file-result level.
- Integration path:
  - Top-n perturbation probe in `src/ixos_rank/progressive.rs`.
  - Add volatility field in result types.
- Complexity: medium.
- Risks: extra compute if uncapped.
- Measurement plan:
  - Calibration metrics + TTFR overhead.
- Math angle:
  - Variance bounds and monotonic confidence policy.

### #5 TBR-SF: Topology Bandit Router with Safety Floor
- New object / guarantee:
  - Routing policy `pi(q,x)` with minimum global probe quota `rho`.
  - Bounded regret with guaranteed non-zero global coverage.
- Novelty argument:
  - Bandits are known; explicit no-starvation safety floor integrated with retrieval controller is the new principle.
- Integration path:
  - `src/ixos_rank/candidate_generator/*` and `src/ixos_rank/progressive.rs`.
- Complexity: high.
- Risks: cold-start instability and tuning burden.
- Measurement plan:
  - Regret proxy, miss rate on unseen repos, latency percentiles.
- Math angle:
  - Constrained contextual bandit with coverage floor.

## 2) EE-ready framing (top 2)

### AARC
- Core question: Can an anytime confidence certificate control recall risk in progressive local file search while preserving low latency?
- Formal definitions:
  - `R_t`: Recall@K after stage `t`.
  - `L_t`: lower confidence bound from probes.
  - `tau, alpha`: target recall/risk.
- Theorem candidate:
  - Under valid probe estimator and martingale assumptions, `P(exists t: R_t < L_t) <= alpha`.
- Evaluation:
  - violation rate vs `alpha`, latency-quality Pareto, probe ablations.

### CEDR
- Core question: Does runtime counterfactual anchor sensitivity reduce semantic false positives without unacceptable recall loss?
- Formal definitions:
  - `Delta_anchor(d,q,A)` as above.
  - High-confidence iff `Delta_anchor >= delta_min`.
- Theorem candidate (conjecture):
  - Under separable margin `gamma` and penalty `lambda`, filtered top-k satisfies anchor-sensitivity constraint with bounded rank regret.
- Evaluation:
  - false-positive@k, must-include hit@k, latency overhead.

## 3) What I tried (appendix)

### Commands
- `cargo test -q`
- `cargo test --test settings_matrix -q`
- `npm --prefix ui run build`
- `npm --prefix ixos-site run build`
- `python scripts/ralph_loop.py --checkpoint R2 --bench-dir . --bench-runs 3 --objective-profile harsh`
- `python scripts/run_golden.py`
- `python reports/innovation/failure_suite/run_failure_suite.py`
- `python reports/innovation/prototypes/anchor_guard_prototype.py`

### Artifacts
- Failure suite:
  - `reports/innovation/failure_suite/queries.json`
  - `reports/innovation/failure_suite/run_failure_suite.py`
  - `reports/innovation/failure_suite/results_latest.json`
  - `reports/innovation/failure_suite/results_latest.md`
- Prototype:
  - `reports/innovation/prototypes/anchor_guard_prototype.py`
  - `reports/innovation/prototypes/anchor_guard_results.json`
  - `reports/innovation/prototypes/anchor_guard_results.md`
- Architecture map:
  - `reports/innovation/ARCHITECTURE_MAP.md`

### Diff summary
- Added reports-only scripts/docs under `reports/innovation/`.
- No production code changes in `src/`, `src-tauri/`, `ui/`, or `ixos-site/`.

## 4) Killed ideas
- Global candidate-limit inflation.
- Model stacking without guarantee object.
- Force-Pro fallback heuristics.
