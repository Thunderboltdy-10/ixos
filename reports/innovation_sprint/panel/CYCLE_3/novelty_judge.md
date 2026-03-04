# Novelty Judge — Cycle 3

## Top 3 Objections
1. Current approach is a strong heuristic controller, not yet a new retrieval object.
2. Claim strength drops if framed as "hybrid scoring" without formal guarantees.
3. Prior art overlap with risk-aware reranking must be explicitly bounded.

## Falsification Experiments
- Write a formal trust-risk trigger definition and show decision-bound behavior.
- Compare against closest prior methods (calibrated reranking, constrained search).
- Show at least one property that current rule guarantees (or fails to guarantee).

## If You Only Change One Thing, Change THIS
- Formalize the guard as a controller with explicit trigger/guarantee, then evaluate that guarantee directly.
