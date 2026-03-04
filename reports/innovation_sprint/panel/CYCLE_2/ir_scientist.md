# IR Scientist Critique (Cycle 2)

## Top 3 Objections
1. Improvement is concentrated in one failure family; generalization remains unproven.
2. Rule-based sensitive-path handling may distort semantic relevance for borderline intents.
3. No graded ranking metric reported for flag-on A/B, only pass/fail constraints.

## Falsification Experiments
1. Compute MRR@10 and NDCG@10 on golden + sampled real-repo query set with flag on/off.
2. Add ambiguous safety-intent queries to test suppression errors.
3. Evaluate across query-length bins (short, medium, long) to detect bias.

## If You Change One Thing
- Add graded IR metrics to every cycle decision gate alongside atlas pass/fail.
