# Novelty Judge Critique (Cycle 1)

## Top 3 Objections
1. Witness reranking alone resembles known lexical-dense fusion; novelty claim is weak if presented as architecture.
2. No formal guarantee is stated yet (only empirical improvement).
3. The “new object” is unclear unless counterfactual witness logic is formalized.

## Falsification Experiments
1. Prior-art collapse check against RRF/BM25+dense/rule-based safety filters; list exact overlap.
2. Define and test a formal object: `Witness Consistency Score (WCS)` and prove monotonicity under anchor additions.
3. Show a property not present in standard fusion, e.g., bounded leak probability under explicit witness conditions.

## If You Change One Thing
- Convert prototype into a formal controller definition with a testable guarantee; otherwise classify as weak novelty.
