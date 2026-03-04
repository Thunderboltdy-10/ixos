# IR Scientist Critique (Cycle 1)

## Top 3 Objections
1. Atlas is compact and deterministic but may overrepresent anchor-heavy queries.
2. Pass/fail constraints hide ranking nuance (MRR/NDCG shifts can regress silently).
3. The prototype lacks out-of-distribution checks beyond `corpus_tiny`.

## Falsification Experiments
1. Evaluate with graded metrics on `golden_data` and real-repo query slices (`MRR@10`, `Recall@10`, `NDCG@10`).
2. Add adversarial paraphrase set where lexical anchor is weak but semantic intent is correct.
3. Perform leave-one-case-family-out validation to detect overfitting to `results streamed`.

## If You Change One Thing
- Add a larger, mixed-domain holdout set before integrating any scoring rule.
