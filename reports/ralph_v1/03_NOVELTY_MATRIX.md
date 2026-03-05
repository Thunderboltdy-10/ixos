# 03 Novelty Matrix

Generated: 2026-03-03 21:50 UTC

## Candidate Matrix

| Candidate idea | New object / guarantee | Closest prior art | What differs | Kill criteria |
| --- | --- | --- | --- | --- |
| Witness-Guard Controller (WGC) | `Witness Consistency Score (WCS)` controlling top-k promotion/suppression; explicit no-sensitive-path promotion unless query has sensitive witness | BM25+dense fusion, RRF, rule-based safelists | Controller is not just fusion weight; it encodes a policy constraint tied to query witness and path class | If gains disappear under equal candidate budget and holdout set, classify as weak fusion variant |
| Counterfactual Anchor Stability (CAS) | Trust guarantee candidate: if top-k is stable under anchor removal, uncertainty is low; unstable results flagged | Influence functions / counterfactual reranking analyses | Applies counterfactual removal at retrieval-controller level for local file search trust signals | If instability score does not predict failures better than score gap/entropy, drop |
| Journaled Delta Candidate Universe (JDCU) | Guarantee candidate: bounded stale-index error under OS journal replay window | Watchman, USN/FSEvents indexing | Integrates stale-bound guarantee directly into semantic candidate generation, not separate index subsystem | If stale-bound cannot be formally or empirically bounded with low overhead, drop |
| Risk-Calibrated Anytime Refine (RCAR) | Sequential stop rule with explicit risk budget on wrong top-k freeze | Anytime retrieval, conformal/uncertainty stopping | Budgeted risk bound attached to auto refine decisions in progressive UI loop | If stop policy increases trust failures or offers no p95 gain, drop |
| Topology-Spectral Witness Routing (TSWR) | New representation: graph spectral coordinate + lexical witness joint score | FSTD/topology priors, graph retrieval priors | Jointly constrains routing and witness confidence via topology embeddings | If topology feature adds no gain over lexical/path priors, drop |
| Leakage-Bounded Path Penalty (LBPP) | Candidate bound on sensitive-path exposure probability under non-sensitive queries | Policy filters / safety classifiers | Formalized as retrieval-side probability bound, not just blacklist filter | If explicit sensitive queries regress or leaks persist in non-sensitive queries, drop |

## Cycle 1 Novelty Verdict
- `WGC` currently rates as **B-level novelty** (strong adaptation + measurable trust objective), not A-level yet.
- To reach stronger novelty:
  - formalize `WCS`,
  - show non-trivial guarantee (e.g., bounded leak promotion under witness constraints),
  - beat standard fusion baselines under equal retrieval budget.

## Cycle 2 Update
- Flagged runtime integration (`progressive.rs`) delivered measurable atlas gain (`14/16 -> 15/16`) while keeping default behavior unchanged (flag off).
- Novelty level unchanged: still B-level until formal guarantee + broader prior-art separation are documented.
