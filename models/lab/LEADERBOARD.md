# Ixos Model Lab Leaderboard

## Baseline (2026-01-26)
Settings: candidate_cap=1500, batch_size=64, topk=10, synthetic difficulty=medium, real_limit=200, real_queries=200.

| Suite | Model | Tier | Recall@10 | MRR@10 | Latency ms/1k | Load ms | Mem delta MB | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| real_corpus_v2 | ixos-flash-v2 | flash | 0.9300 | 0.8399 | 414.19 | 121.34 | 76.63 | Default Flash baseline |
| real_corpus_v2 | potion-base-8m-int8 | flash | 0.9000 | 0.8073 | 193.72 | 54.28 | 16.20 | Fast legacy baseline |
| real_corpus_v2 | ixos-pro-v1 | pro | 0.8550 | 0.7354 | 1161.53 | 113.02 | 95.58 | Slower + worse quality |
| synthetic_ambiguity_v1 | potion-base-8m-int8 | flash | 1.0000 | 0.9611 | 25.42 | 179.11 | 28.79 | Strong on synthetic |
| synthetic_ambiguity_v1 | ixos-flash-v2 | flash | 1.0000 | 0.9500 | 171.55 | 136.59 | 75.74 | |
| synthetic_ambiguity_v1 | ixos-pro-v1 | pro | 1.0000 | 0.9361 | 59.14 | 154.55 | 94.71 | |

Notes:
- Baseline run uses the eval harness subset (three model2vec variants) to keep runtime reasonable on CPU-only hardware.
- The full manifest sweep is deferred; use `python scripts/ixos_eval.py --suite both` on a dedicated machine if needed.
