# Novelty Judge Critique (Cycle 2)

## Top 3 Objections
1. Current contribution still resembles a tuned safety-aware fusion rule.
2. Formal guarantee is absent; only empirical atlas delta is shown.
3. Novelty argument needs a clear object beyond ad-hoc bonuses/penalties.

## Falsification Experiments
1. Define `WCS(q, d)` formally and compare against BM25+dense+rule baseline.
2. Prove or disprove monotonic behavior: adding true witness terms should not reduce rank under guard.
3. Evaluate on non-sensitive datasets to ensure no hidden relevance collapse.

## If You Change One Thing
- Convert guard into a mathematically defined controller with explicit invariants and failure bounds.
