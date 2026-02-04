# Ixos Flash v1

## Summary
Fast, CPU-first flash-tier embedder distilled from st-all-mpnet-base-v2.

## Tier and status
- Tier: Flash
- Status: Legacy (replaced by Ixos Flash v2)
- Intended use: Low-latency local search on CPU

## Specs
- Architecture: Model2Vec StaticModel
- Teacher: st-all-mpnet-base-v2 (Sentence Transformers)
- Dimensions: 512
- Dtype: float16
- Disk size: ~44.46 MB (local `models/ixos-flash-v1`)

## Distillation
- Script: `python scripts/distill_model2vec_lab.py --mode flash --flash-teacher models/lab/st-all-mpnet-base-v2`
- Vocab: built from `dataset/` + `dataset/synthetic_ambiguity` (default 15k tokens)

## Performance (canonical, 2026-01-27)

| Suite | MRR@10 | Recall@10 | Latency |
|-------|--------|-----------|---------|
| real_corpus_v2 | 0.8399 | 0.93 | ~456 ms/1k |
| synthetic_ambiguity_v1 | 0.9500 | 1.00 | ~195 ms/1k |

See `models/lab/CANONICAL_RESULTS.md` for verified benchmarks.

## Hardware assumptions
- CPU-first, no GPU required at runtime

## Packaging and usage
- Model directory: `models/ixos-flash-v1`
- Rust: `MmapModel2VecEmbedder::new_with_type(ModelType::IxosFlashV1)`

## Migration note
Flash v1 is retained for regression testing and legacy compatibility. New installs should use
Ixos Flash v2 (`models/ixos-flash-v2`) as the production default.

## License
- Distilled weights: Ixos internal (MIT per MODELS_REPORT)
- Teacher: Apache-2.0 (st-all-mpnet-base-v2)

## Known limitations
- Slightly slower than int8 Flash variants; higher memory delta than v4 int8.
