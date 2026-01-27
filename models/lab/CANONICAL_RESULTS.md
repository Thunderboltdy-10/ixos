# Canonical Benchmark Results

> **This is the authoritative source for Ixos model metrics.**
> All other documents (MODELS_REPORT.md, model cards, TIERS.md) should reference this file.

**Generated:** 2026-01-27
**Methodology:** 3 independent runs per model, mean + stdev reported
**Hardware:** Windows 11, AMD Ryzen 7 5800X (8c/16t), 32 GB RAM
**Seed:** 1337 (deterministic)

## Evaluation Settings

| Parameter | Value |
|-----------|-------|
| Suite | synthetic_ambiguity_v1 + real_corpus_v2 |
| Difficulty | medium |
| Candidate cap | 1500 |
| Batch size | 64 |
| Top-K | 10 |
| Real limit | 200 docs |
| Real queries | 200 queries |

## Real Corpus v2 Results (Primary Benchmark)

| Model | Tier | Dims | Dtype | MRR@10 | Recall@10 | Latency ms/1k (mean±std) | Load ms | Mem MB |
|-------|------|------|-------|--------|-----------|--------------------------|---------|--------|
| **ixos-flash-v2** | Flash | 512 | f16 | **0.8399** | 0.93 | 456±13 | ~155 | ~75 |
| ixos-flash-v4-int8-512 | Flash | 512 | int8 | 0.8340 | 0.925 | 411±7 | ~122 | ~37 |
| ixos-flash-v4-int8-192 | Flash | 192 | int8 | 0.7950 | 0.90 | 389±18 | ~118 | ~29 |
| potion-base-8m-int8 | Flash | 256 | int8 | 0.8073 | 0.90 | 249±10 | ~87 | ~15 |
| **Flash+Potion Fusion** | Pro | 512+256 | f16+int8 | **0.9233** | 0.97 | 674 | ~355 | ~102 |

## Synthetic Ambiguity v1 Results

| Model | Tier | MRR@10 | Recall@10 | Latency ms/1k |
|-------|------|--------|-----------|---------------|
| ixos-flash-v2 | Flash | 0.9500 | 1.00 | 195±13 |
| ixos-flash-v4-int8-512 | Flash | 0.9444 | 1.00 | 149±6 |
| ixos-flash-v4-int8-192 | Flash | 0.9278 | 1.00 | 122±45 |
| potion-base-8m-int8 | Flash | 0.9611 | 1.00 | 34±3 |
| Flash+Potion Fusion | Pro | 0.9833 | 1.00 | 269 |

## Learned Fusion Weights

| Suite | Flash | Pro (Potion) | Lexical | Directory |
|-------|-------|--------------|---------|-----------|
| real_corpus_v2 | 0.2697 | 0.2672 | 0.4631 | 0.0000 |
| synthetic_ambiguity_v1 | 0.2402 | 0.3415 | 0.1754 | 0.2429 |

## Key Findings

1. **Quality winner (Flash tier):** ixos-flash-v2 at MRR 0.8399
2. **Speed winner (Flash tier):** potion-base-8m-int8 at 249 ms/1k (1.8x faster than flash-v2)
3. **Quality winner (Pro tier):** Flash+Potion Fusion at MRR 0.9233 (+9.9% over Flash-only)
4. **Best tradeoff:** ixos-flash-v4-int8-512 achieves 99.3% of flash-v2 quality with 10% lower latency and 50% less memory

## Reproducibility

```bash
# Reproduce these results
python scripts/ixos_eval.py --suite both \
  --only-ids ixos-flash-v2,potion-base-8m-int8,ixos-flash-v4-int8-512,ixos-flash-v4-int8-192 \
  --output models/lab/results_canonical.json \
  --csv models/lab/results_canonical.csv

# Reproduce fusion results
python scripts/ixos_eval.py --suite both \
  --only-ids ixos-flash-v2,potion-base-8m-int8 \
  --fusion learned \
  --flash-id ixos-flash-v2 \
  --pro-id potion-base-8m-int8 \
  --output models/lab/results_canonical_fusion.json
```

## Data Sources

- Raw results: `models/lab/results_canonical_run{1,2,3}.json`
- Fusion results: `models/lab/results_canonical_fusion.json`
- Aggregated CSV: `models/lab/results_canonical_aggregate.csv`

## Validity Notes

1. **MRR/Recall are deterministic** given fixed seed, corpus, and query generation
2. **Latency varies** by ±5-15% due to system load, CPU thermal throttling
3. **Benchmark measures embedding latency only** (ms per 1k candidates embedded), not end-to-end search
4. **Real corpus v2** uses 200 files sampled from `dataset/`, 200 queries derived from titles
5. **Synthetic suite** tests disambiguation on 7 folders with overlapping filenames
