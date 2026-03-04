# IR Scientist — Cycle 3

## Top 3 Objections
1. Atlas improvements may overfit specific lexical anchors.
2. 16/16 on 16 cases is promising but statistically narrow.
3. Confidence calibration remains heuristic, not probabilistic.

## Falsification Experiments
- Hold out 10–20 unseen anchor/semantic-drift cases and require preserved gains.
- Evaluate recall@10 and MRR@10 on broader golden/eval sets with guard ON.
- Test adversarial paraphrases to ensure gains are not phrase-fragile.

## If You Only Change One Thing, Change THIS
- Expand failure atlas with out-of-sample trust cases before promoting architecture claims.
