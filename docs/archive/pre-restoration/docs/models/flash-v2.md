# Ixos Flash v2

## Summary
Current production flash-tier embedder, distilled and int8-quantized for low-latency CPU search.

## Tier and status
- Tier: Flash
- Status: Default (current)
- Intended use: Low-latency local search on CPU

## Specs
- Architecture: Model2Vec StaticModel
- Dimensions: 512
- Dtype: int8 (quantized)
- Disk size: ~16.6 MB (local `models/ixos-flash-v2`)

## Distillation
- Base candidate: `ixos-flash-v4-int8-512`
- Script: `python scripts/distill_model2vec_lab.py --mode flash --flash-id ixos-flash-v4-int8-512 --flash-dims 512 --flash-quantize int8`

## Performance (canonical, 2026-02-03)

| Suite | MRR@10 | Recall@10 | Latency (ms/1k) |
|-------|--------|-----------|----------------|
| real_corpus_v2 | 0.8340 | 0.925 | 339.76 |
| synthetic_ambiguity_v1 | 0.9444 | 1.00 | 111.26 |

See `models/lab/results_flash_v2_2026-02-03.csv` and `models/lab/CANONICAL_RESULTS.md` for verified benchmarks.

## Packaging and usage
- Model directory: `models/ixos-flash-v2`
- Rust: `MmapModel2VecEmbedder::new_with_type(ModelType::IxosFlashV2)`

## License
- Distilled weights: Ixos internal (MIT per MODELS_REPORT)
- Teacher lineage: Sentence-Transformers (st-all-mpnet-base-v2)
