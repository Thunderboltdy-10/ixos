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

### Experiment Summary (real_corpus_v2 subset)
| Model / Pipeline | Tier | Dims | Dtype | Disk MB | Recall@10 | MRR@10 | Latency ms/1k | License | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ixos-flash-v2 | flash | 512 | f16 | 44.46 | 0.9300 | 0.8399 | 376.96 | MIT (Ixos) | Current default flash |
| ixos-flash-v4-int8-512 | flash | 512 | int8 | 17.65 | 0.9250 | 0.8340 | 366.85 | Apache-2.0 (teacher) | Size win, near-v2 quality |
| ixos-flash-v4-int8-192 | flash | 192 | int8 | 7.45 | 0.9000 | 0.7950 | 340.03 | Apache-2.0 (teacher) | Speed-first flash variant |
| potion-base-8m-int8 | flash | 256 | int8 | 7.64 | 0.9000 | 0.8073 | 179.55 | MIT | Legacy fast baseline |
| ixos-pro-v1 | pro | 768 | f16 | 65.81 | 0.8550 | 0.7354 | 1606.55 | MIT (Ixos) | Legacy pro (quality regression) |
| Fusion: flash-v2 + potion + lexical | pro | 512 + 256 | f16 + int8 | 52.10 | 0.9700 | 0.9233 | 521.34 | Composite (MIT + MIT) | Learned weights flash/potion/lexical |

Notes:
- Disk MB from local `models/` + `models/lab/` directories on 2026-01-26.
- Dims/dtype sourced from each model's config.json; fusion uses both embeddings.

## 2026-01-26 Candidate generation (v1)
Flash ideas (speed-first):
- Distill mpnet teacher to 256d int8 (new Flash v3 fast)
- Distill mpnet teacher to 384d float16 (speed/quality balance)
- Matryoshka truncation at runtime (256/384 dims) without new weights
- Pack embeddings to int8 for scoring (quantized dot)
- Parallelize similarity scoring (rayon) + SIMD dot for ranking stage

Pro ideas (quality-first):
- Distill e5-base-v2 teacher to 512/768d float16 (higher quality)
- Distill bge-base-en-v1.5 teacher to 768d float16
- Add TinyBERT reranker for top-k in Pro/Auto (routed)
- Tune Auto routing thresholds to reduce over-triggering

Selected to implement now:
1) ixos-flash-v3-int8-256 (teacher: st-all-mpnet-base-v2, int8, 256d)
2) ixos-flash-v3-f16-384 (teacher: st-all-mpnet-base-v2, float16, 384d)
3) ixos-pro-v2-f16-512 (teacher: e5-base-v2, float16, 512d)

## 2026-01-26 Flash/Pro v3 eval (results_flash_pro_v3_2026-01-26.json)
Settings: candidate_cap=1500, batch_size=64, topk=10, real_limit=200, real_queries=200.

Real_corpus_v2 (MRR@10 / latency ms per 1k):
- ixos-flash-v2: 0.8399 / 428.75
- potion-base-8m-int8: 0.8073 / 193.74
- ixos-flash-v3-int8-256: 0.8216 / 721.00
- ixos-flash-v3-f16-384: 0.8385 / 688.12
- ixos-pro-v1: 0.7354 / 1606.55
- ixos-pro-v2-f16-512: 0.7648 / 1179.36

Synthetic_ambiguity_v1 (MRR@10 / latency ms per 1k):
- ixos-flash-v2: 0.9500 / 180.04
- potion-base-8m-int8: 0.9611 / 25.70
- ixos-flash-v3-int8-256: 0.9500 / 90.11
- ixos-flash-v3-f16-384: 0.9500 / 158.56
- ixos-pro-v1: 0.9361 / 61.39
- ixos-pro-v2-f16-512: 0.9833 / 50.67

Decisions:
- Discard flash-v3-int8-256 and flash-v3-f16-384 (both slower than flash-v2 on real suite).
- Pro v2 f16-512 improves synthetic MRR but regresses real MRR; not a Pro win.
- Next: try smaller/faster Flash variants (128d int8, smaller vocab) and re-try Pro with larger dims or different teacher; consider reranker integration if Pro still lags.

## 2026-01-26 Flash speed retry (v4 candidates)
New Flash candidates to recover speed:
- ixos-flash-v4-int8-128 (mpnet teacher, int8, 128d, vocab 12000)
- ixos-flash-v4-int8-192 (mpnet teacher, int8, 192d, vocab 15000)

Goal: materially faster than ixos-flash-v2 while keeping MRR close to 0.84 on real_corpus_v2.

## 2026-01-26 Flash v4 eval (results_flash_v4_2026-01-26.json, results_flash_v4b_2026-01-26.json, results_flash_v4c_2026-01-26.json)
Real_corpus_v2 (MRR@10 / latency ms per 1k):
- ixos-flash-v4-int8-128: 0.7513 / 347.80
- ixos-flash-v4-int8-192: 0.7950 / 329.77
- ixos-flash-v4-int8-256-v8k: 0.7929 / 325.11
- ixos-flash-v4-int8-512: 0.8340 / 366.85
- ixos-flash-v2: 0.8399 / 376.96
- potion-base-8m-int8: 0.8073 / 179.55

Notes:
- v4-int8-512 nearly matches Flash MRR while shaving ~10ms/1k and cutting memory ~63% (76.6 -> 28.5 MB).
- v4-int8-192 and v4-int8-256-v8k are ~12-15% faster than flash-v2 but drop ~0.045 MRR.

Decision (tentative):
- Keep v4-int8-512 as Flash-quality candidate (size win, slight speed win).
- Keep v4-int8-192 as Flash-fast candidate (speed win, quality tradeoff).
- Discard v4-int8-128 (quality too low).

## 2026-01-26 Fusion experiments (Pro pipeline candidate)
Fusion flash+potion (results_fusion_flash_potion_2026-01-26.json):
- real_corpus_v2 MRR@10: 0.9233, Recall@10: 0.97, latency_ms/1k: 521.34
- learned weights: flash=0.2697, pro(potion)=0.2672, lexical=0.4631, dir=0.0

Fusion flash+pro-v1 (results_fusion_flash_prov1_2026-01-26.json):
- real_corpus_v2 MRR@10: 0.9077, Recall@10: 0.95, latency_ms/1k: 1462.39
- learned weights: flash=0.3601, pro=0.1085, lexical=0.5314, dir=0.0

Decision:
- Promote flash+potion+lexical fusion as Pro-quality path (big MRR gain, moderate latency).
- Discard flash+pro-v1 fusion (latency too high for gain).

## 2026-01-26 Runtime fusion integration (dual-embedder)
- Implemented dual-embedder fusion in progressive search (flash + pro + lexical + dir prior).
- Auto mode now captures Flash scores before Pro refinement; Pro mode computes Flash scores for top-K via Flash rerank when needed.
- Default fusion weights aligned to learned flash+potion/lexical mix (flash=0.2697, pro=0.2672, lexical=0.4631, dir=0.0).
- Notes: if Flash scores are missing, fusion falls back to Pro similarity; extra Flash rerank is time-bounded by semantic timeout.
