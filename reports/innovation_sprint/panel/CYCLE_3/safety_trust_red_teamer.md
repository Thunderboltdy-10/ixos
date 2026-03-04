# Safety Trust Red-Teamer — Cycle 3

## Top 3 Objections
1. Sensitive-path suppression still depends on heuristic term lists.
2. Explicit sensitive intent handling may fail on paraphrased requests.
3. Guard-induced reranking could hide relevant secure docs unintentionally.

## Falsification Experiments
- Add adversarial sensitive-query paraphrases (credentials dump, private token note, etc.).
- Add must-not leak cases where restricted files are semantically close but out-of-scope.
- Verify explicit-secret requests still recover restricted targets in top-k.

## If You Only Change One Thing, Change THIS
- Introduce explicit trust labels (dual witness present / semantic-only / sensitive-suppressed) for user-facing transparency.
