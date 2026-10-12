# Ixos Model Lab Leaderboard

## Update (2026-02-03)
- **Current default:** `ixos-flash-v2` (int8, 512d). See `models/lab/CANONICAL_RESULTS.md` for authoritative numbers.
- **Naming fix:** Historical rows labeled `ixos-flash-v2` in the 2026-01-26 sections correspond to the **legacy Flash v1** artifact (pre-rename).

| Suite | Model | Tier | Recall@10 | MRR@10 | Latency ms/1k | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| real_corpus_v2 | ixos-flash-v2 | flash | 0.925 | 0.8340 | 339.76 | New default (int8) |
| synthetic_ambiguity_v1 | ixos-flash-v2 | flash | 1.000 | 0.9444 | 111.26 | New default (int8) |
| real_corpus_v2 | Flash+Potion Fusion (Pro v2) | pro | 0.97 | 0.9209 | 430.57 | Canonical Pro v2 |
| synthetic_ambiguity_v1 | Flash+Potion Fusion (Pro v2) | pro | 1.00 | 0.9833 | 131.83 | Canonical Pro v2 |

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

## Flash/Pro v3 sweep (2026-01-26)
Settings: candidate_cap=1500, batch_size=64, topk=10, synthetic difficulty=medium, real_limit=200, real_queries=200.

| Suite | Model | Tier | Recall@10 | MRR@10 | Latency ms/1k | Load ms | Mem delta MB | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| real_corpus_v2 | ixos-flash-v2 | flash | 0.9300 | 0.8399 | 428.75 | 124.73 | 74.64 | Baseline |
| real_corpus_v2 | potion-base-8m-int8 | flash | 0.9000 | 0.8073 | 193.74 | 52.99 | 14.27 | Fast legacy |
| real_corpus_v2 | ixos-flash-v3-int8-256 | flash | 0.9250 | 0.8216 | 721.00 | 91.82 | 40.29 | Discard (slower) |
| real_corpus_v2 | ixos-flash-v3-f16-384 | flash | 0.9250 | 0.8385 | 688.12 | 99.33 | 44.13 | Discard (slower) |
| real_corpus_v2 | ixos-pro-v1 | pro | 0.8550 | 0.7354 | 1606.55 | 114.30 | 91.16 | Baseline (weak) |
| real_corpus_v2 | ixos-pro-v2-f16-512 | pro | 0.9000 | 0.7648 | 1179.36 | 103.18 | 55.73 | Discard (quality) |
| synthetic_ambiguity_v1 | ixos-flash-v2 | flash | 1.0000 | 0.9500 | 180.04 | 114.91 | 76.46 | |
| synthetic_ambiguity_v1 | potion-base-8m-int8 | flash | 1.0000 | 0.9611 | 25.70 | 171.64 | 28.40 | |
| synthetic_ambiguity_v1 | ixos-flash-v3-int8-256 | flash | 1.0000 | 0.9500 | 90.11 | 90.59 | 38.57 | |
| synthetic_ambiguity_v1 | ixos-flash-v3-f16-384 | flash | 1.0000 | 0.9500 | 158.56 | 123.35 | 60.08 | |
| synthetic_ambiguity_v1 | ixos-pro-v1 | pro | 1.0000 | 0.9361 | 61.39 | 128.25 | 94.89 | |
| synthetic_ambiguity_v1 | ixos-pro-v2-f16-512 | pro | 1.0000 | 0.9833 | 50.67 | 106.91 | 70.93 | |

## Flash v4 sweep (2026-01-26)
Settings: candidate_cap=1500, batch_size=64, topk=10, synthetic difficulty=medium, real_limit=200, real_queries=200.

| Suite | Model | Tier | Recall@10 | MRR@10 | Latency ms/1k | Load ms | Mem delta MB | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| real_corpus_v2 | ixos-flash-v2 | flash | 0.9300 | 0.8399 | 376.96 | 107.69 | 76.56 | Baseline |
| real_corpus_v2 | ixos-flash-v4-int8-512 | flash | 0.9250 | 0.8340 | 366.85 | 67.48 | 28.53 | Candidate (size win) |
| real_corpus_v2 | ixos-flash-v4-int8-192 | flash | 0.9000 | 0.7950 | 340.03 | 63.04 | 16.84 | Candidate (fast) |
| real_corpus_v2 | ixos-flash-v4-int8-256-v8k | flash | 0.8950 | 0.7929 | 325.11 | 50.33 | 13.25 | Candidate (fast) |
| real_corpus_v2 | ixos-flash-v4-int8-128 | flash | 0.8750 | 0.7513 | 347.80 | 60.00 | 12.83 | Discard (quality) |
| real_corpus_v2 | potion-base-8m-int8 | flash | 0.9000 | 0.8073 | 179.55 | 52.86 | 14.58 | Legacy fast |
| synthetic_ambiguity_v1 | ixos-flash-v4-int8-512 | flash | 1.0000 | 0.9444 | 114.98 | 62.11 | 39.98 | |
| synthetic_ambiguity_v1 | ixos-flash-v4-int8-192 | flash | 1.0000 | 0.9278 | 72.23 | 57.24 | 31.61 | |
| synthetic_ambiguity_v1 | ixos-flash-v4-int8-256-v8k | flash | 1.0000 | 0.9444 | 82.44 | 66.36 | 29.42 | |
| synthetic_ambiguity_v1 | ixos-flash-v4-int8-128 | flash | 1.0000 | 0.8833 | 63.79 | 52.73 | 25.25 | |
| synthetic_ambiguity_v1 | ixos-flash-v2 | flash | 1.0000 | 0.9500 | 170.46 | 116.38 | 70.81 | |
| synthetic_ambiguity_v1 | potion-base-8m-int8 | flash | 1.0000 | 0.9611 | 23.73 | 168.23 | 28.68 | |

## Fusion (Pro candidate) 2026-01-26
Settings: candidate_cap=1500, batch_size=64, topk=10, synthetic difficulty=medium, real_limit=200, real_queries=200.

| Suite | Flash Model | Pro Model | Strategy | Recall@10 | MRR@10 | Latency ms/1k | Weights (flash/pro/lex/dir) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| real_corpus_v2 | ixos-flash-v2 | potion-base-8m-int8 | learned | 0.9700 | 0.9233 | 521.34 | 0.2697 / 0.2672 / 0.4631 / 0.0000 | Candidate Pro fusion |
| synthetic_ambiguity_v1 | ixos-flash-v2 | potion-base-8m-int8 | learned | 1.0000 | 0.9833 | 207.82 | 0.2402 / 0.3415 / 0.1754 / 0.2429 | |
| real_corpus_v2 | ixos-flash-v2 | ixos-pro-v1 | learned | 0.9500 | 0.9077 | 1462.39 | 0.3601 / 0.1085 / 0.5314 / 0.0000 | Discard (latency) |
| synthetic_ambiguity_v1 | ixos-flash-v2 | ixos-pro-v1 | learned | 1.0000 | 0.9667 | 249.05 | 0.2610 / 0.2802 / 0.1948 / 0.2640 | |

Notes:
- Progressive search now applies dual-embedder fusion at runtime using the learned weights above (flash/pro/lexical).
