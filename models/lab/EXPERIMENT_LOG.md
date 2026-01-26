# Ixos Model Lab Experiment Log

## 2026-01-26 Baseline (subset)
- Host: Windows 11 Home (build 26200), AMD Ryzen 7 5800X (8c/16t), 32 GB RAM
- Attempted full sweep: `python scripts/ixos_eval.py --suite both`
  - Status: aborted after ~10 minutes; full manifest sweep is impractically slow on CPU-only hardware (large transformer models).
- Baseline command (subset):
  - `python scripts/ixos_eval.py --suite both --only-ids ixos-flash-v2,ixos-pro-v1,potion-base-8m-int8 --output models/lab/results_baseline_2026-01-26.json --csv models/lab/results_baseline_2026-01-26.csv`
- Suite settings: synthetic_ambiguity_v1 (medium), real_corpus_v2 (real_limit=200, real_queries=200), candidate_cap=1500, batch_size=64, topk=10

### Results Summary (real_corpus_v2)
| Model | Recall@10 | MRR@10 | Latency ms/1k | Load ms | Mem delta MB |
| --- | --- | --- | --- | --- | --- |
| potion-base-8m-int8 | 0.9000 | 0.8073 | 193.72 | 54.28 | 16.20 |
| ixos-flash-v2 | 0.9300 | 0.8399 | 414.19 | 121.34 | 76.63 |
| ixos-pro-v1 | 0.8550 | 0.7354 | 1161.53 | 113.02 | 95.58 |

### Results Summary (synthetic_ambiguity_v1)
| Model | Recall@10 | MRR@10 | Latency ms/1k | Load ms | Mem delta MB |
| --- | --- | --- | --- | --- | --- |
| potion-base-8m-int8 | 1.0000 | 0.9611 | 25.42 | 179.11 | 28.79 |
| ixos-flash-v2 | 1.0000 | 0.9500 | 171.55 | 136.59 | 75.74 |
| ixos-pro-v1 | 1.0000 | 0.9361 | 59.14 | 154.55 | 94.71 |

Notes:
- On the real suite subset, ixos-flash-v2 outperforms potion on MRR but is ~2x slower.
- ixos-pro-v1 underperforms both flash and potion while being much slower, reinforcing the need for a new Pro strategy.
