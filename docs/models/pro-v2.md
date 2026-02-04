# Ixos Pro v2

## Summary
Pro v2 is a **fusion system**, not a single embedder. It combines Flash v2, Potion int8, and lexical signals with cascade routing for high accuracy.

## Tier and status
- Tier: Pro
- Status: Default Pro mode (Auto/Pro)
- Intended use: Ambiguous or high-stakes searches when quality matters most

## Pipeline
1) Potion fast pass over lexical candidates
2) Flash v2 refinement on top-K / uncertain region
3) Fusion of flash + potion + lexical priors

## Components
- Flash model: `models/ixos-flash-v2`
- Pro dependency (internal): `models/potion-base-8M-int8`
- Config: `models/ixos-pro-v2/pro_v2.json`

## Learned Weights (real_corpus_v2)
- flash=0.2672, pro=0.2725, lexical=0.4602, dir=0.0

## Performance
**Pro v2 canonical (Flash v2 + Potion):**
- real_corpus_v2: MRR@10 0.9209, Recall@10 0.97, latency 430.57 ms/1k
- synthetic_ambiguity_v1: MRR@10 0.9833, latency 131.83 ms/1k

See `models/lab/CANONICAL_RESULTS.md` and `reports/model_v2_benchmark_report.md` for details.

## Packaging and usage
- UI/CLI selects `ixos-pro-v2` (do not expose Potion directly).
- Download flow pulls Flash v2 + Potion.

## License
- Composite of Flash v2 (MIT, distilled) and Potion (MIT).
- Ensure derivative licensing for Flash teacher (st-all-mpnet-base-v2).
