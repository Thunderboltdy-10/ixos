# IDEAS

## Idea Backlog
- AARC: Anytime Auditable Recall Certificate (survivor)
- DWC: Dual-Witness Consistency Ranking (survivor)
- CEDR: Counterfactual Exclusion Delta Regularizer (survivor)
- SVL: Semantic Volatility Ledger (survivor)
- TBR-SF: Topology Bandit Router with Safety Floor (survivor)

## Killed Ideas
- Raise candidate limits globally
  - Why killed: no new object/guarantee; likely latency regression on large repos.
- Add another dense model only
  - Why killed: composition-only novelty; no testable guarantee.
- Force Pro when uncertain
  - Why killed: conflicts with model-selection invariants and speed constraints.

## Novelty Cards

### 1) AARC (Anytime Auditable Recall Certificate)
- Claim: each query emits a recall lower-bound certificate controlling stop/expand decisions.
- New object/guarantee:
  - `C(q,t) = (L_t, alpha, tau, probe_trace)` with anytime-valid `L_t` for Recall@K.
  - Stop only when `L_t >= tau`; otherwise broaden search.
- Closest prior art:
  - Conformal Risk Control (ICLR 2024)
  - Time-uniform confidence sequences (Howard et al., 2020)
  - Cascade ranking in production search (Liu et al., 2017)
  - Neural IR query performance prediction (Faggioli et al., 2023)
- Why different:
  - Query-level certificate is both controller input and UI truthfulness artifact.
  - Designed for local-first file search and progressive streaming constraints.
- How it could fail / kill test:
  - Probe bias invalidates lower bound.
  - Kill if empirical violation rate exceeds `alpha` on adversarial suite.

### 2) DWC (Dual-Witness Consistency)
- Claim: high-confidence top-k requires independent lexical and semantic witnesses.
- New object/guarantee:
  - `W(d,q) = (w_lex, w_sem)`; confidence tiers require multi-channel support.
  - Guarantee: no high-confidence result is single-channel unsupported.
- Closest prior art:
  - ColBERT late interaction
  - SPLADE sparse expansion
  - Reciprocal Rank Fusion
  - BEIR hybrid retrieval findings
- Why different:
  - Witness consistency is an explicit ranking contract, not just a fusion heuristic.
- How it could fail / kill test:
  - Could suppress paraphrase-valid results lacking lexical overlap.
  - Kill if recall@10 drops >2% on paraphrase-heavy set.

### 3) CEDR (Counterfactual Exclusion Delta Regularizer)
- Claim: down-rank results insensitive to removing mandatory query anchors.
- New object/guarantee:
  - `Delta_anchor(d,q,A) = s(d,q) - s(d,q\A)`.
  - Guarantee: high-confidence top-k satisfies `Delta_anchor >= delta_min`.
- Closest prior art:
  - Counterfactual LTR (Joachims et al., 2016)
  - ULTR disentangling studies
  - Retrieval uncertainty calibration work
- Why different:
  - Applies counterfactual logic at runtime for trustfulness, not only training debias.
- How it could fail / kill test:
  - Penalizes short/implicit queries.
  - Kill if false-positive rate does not improve at equal recall.

### 4) SVL (Semantic Volatility Ledger)
- Claim: confidence is modulated by ranking volatility under micro-perturbations.
- New object/guarantee:
  - Volatility score `V(d,q)` from lightweight perturbation ensemble.
  - Guarantee: high-volatility results cannot be high-confidence.
- Closest prior art:
  - Retrieval uncertainty calibration
  - TRAQ conformal trust signals
- Why different:
  - Uses perturbation stability at file-result granularity in progressive desktop search.
- How it could fail / kill test:
  - Added compute may hurt TTFR.
  - Kill if TTFR p95 worsens >10% without trustfulness gains.

### 5) TBR-SF (Topology Bandit Router with Safety Floor)
- Claim: contextual bandit routes directory exploration with guaranteed global probe floor.
- New object/guarantee:
  - Policy `pi(q,x)` plus safety floor `rho`.
  - Guarantee: bounded regret with non-zero global coverage per query.
- Closest prior art:
  - Learning to efficiently rank
  - Operational cascade routing
  - Neural IR QPP
- Why different:
  - Explicit no-starvation coverage constraint added to learned routing.
- How it could fail / kill test:
  - Cold-start instability on new repos.
  - Kill if regret remains high after adaptation window.
