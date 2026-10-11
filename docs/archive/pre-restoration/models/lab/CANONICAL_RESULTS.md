# Canonical Benchmark Results

> **Authoritative reference for Ixos model metrics.**
> Updated to reflect Flash v2 (int8) and Pro v2 fusion weights.

**Generated:** 2026-02-03
**Hardware:** Windows 11, AMD Ryzen 7 5800X (8c/16t), 32 GB RAM
**Seed:** 1337 (deterministic)

## Evaluation Settings (Canonical)

| Parameter | Value |
|-----------|-------|
| Suite | synthetic_ambiguity_v1 + real_corpus_v2 |
| Difficulty | medium |
| Candidate cap | 1500 |
| Batch size | 64 |
| Top-K | 10 |
| Real limit | 200 docs |
| Real queries | 200 queries |

## Update Notes
- **Flash v2 (int8)** numbers come from `models/lab/results_flash_v2_2026-02-03.json`.
- **Flash v1 / Potion / Pro v1** numbers come from `models/lab/results_baseline_2026-02-02.json`.
- **Pro v2 fusion** comes from `models/lab/results_v2_fusion_flashv2_2026-02-03.json`.
- Flash v4 candidate numbers are retained from prior lab runs (see file history).

---

## Real Corpus v2 Results (Primary)

| Model | Tier | Dims | Dtype | MRR@10 | Recall@10 | Latency ms/1k | Load ms | Mem MB | Notes |
|-------|------|------|-------|--------|-----------|---------------|---------|--------|-------|
| **ixos-flash-v2** | Flash | 512 | int8 | **0.8340** | 0.925 | 339.76 | 74.85 | 44.46 | New default (2026-02-03) |
| ixos-flash-v1 | Flash | 512 | f16 | 0.8399 | 0.93 | 423.09 | ~155 | ~75 | Legacy baseline |
| ixos-flash-v4-int8-512 | Flash | 512 | int8 | 0.8340 | 0.925 | 411 | ~122 | ~37 | Lab candidate |
| ixos-flash-v4-int8-192 | Flash | 192 | int8 | 0.7950 | 0.90 | 389 | ~118 | ~29 | Lab speed candidate |
| potion-base-8m-int8 | Flash | 256 | int8 | 0.8073 | 0.90 | 219.18 | ~87 | ~15 | Fast baseline |
| **Flash + Potion Fusion (Pro v2)** | Pro | 512+256 | int8+int8 | **0.9209** | 0.97 | 430.57 | ~355 | ~102 | New Pro v2 fusion |
| ixos-pro-v1 | Pro (legacy) | 768 | f16 | 0.7354 | 0.855 | 1436.5 | ~300 | ~180 | Deprecated |

## Synthetic Ambiguity v1 Results

| Model | Tier | MRR@10 | Recall@10 | Latency ms/1k |
|-------|------|--------|-----------|---------------|
| ixos-flash-v2 | Flash | 0.9444 | 1.00 | 111.26 |
| ixos-flash-v1 | Flash | 0.9500 | 1.00 | 171.48 |
| ixos-flash-v4-int8-512 | Flash | 0.9444 | 1.00 | 149 |
| ixos-flash-v4-int8-192 | Flash | 0.9278 | 1.00 | 122 |
| potion-base-8m-int8 | Flash | 0.9611 | 1.00 | 32.12 |
| Flash + Potion Fusion (Pro v2) | Pro | 0.9833 | 1.00 | 131.83 |
| ixos-pro-v1 | Pro (legacy) | 0.9361 | 1.00 | 65.27 |

---

## Learned Fusion Weights (Pro v2)

| Suite | Flash | Pro (Potion) | Lexical | Directory |
|-------|-------|--------------|---------|-----------|
| real_corpus_v2 | 0.2672 | 0.2725 | 0.4602 | 0.0000 |
| synthetic_ambiguity_v1 | 0.2361 | 0.3435 | 0.1771 | 0.2433 |

---

## Reproducibility

```bash
# Flash v2 canonical run (200/200)
python scripts/ixos_eval.py --suite both \
  --only-ids ixos-flash-v2 \
  --output models/lab/results_flash_v2_2026-02-03.json \
  --csv models/lab/results_flash_v2_2026-02-03.csv

# Baseline canonical run (Flash v1 + Potion + Pro v1)
python scripts/ixos_eval.py --suite both \
  --only-ids ixos-flash-v1,potion-base-8m-int8,ixos-pro-v1 \
  --output models/lab/results_baseline_2026-02-02.json \
  --csv models/lab/results_baseline_2026-02-02.csv

# Pro v2 fusion (Flash v2 + Potion)
python scripts/ixos_eval.py --suite both \
  --only-ids ixos-flash-v2,potion-base-8m-int8 \
  --fusion learned \
  --flash-id ixos-flash-v2 \
  --pro-id potion-base-8m-int8 \
  --output models/lab/results_v2_fusion_flashv2_2026-02-03.json \
  --csv models/lab/results_v2_fusion_flashv2_2026-02-03.csv
```
