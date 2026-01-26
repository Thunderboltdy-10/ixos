# Ixos Flash v2

## Summary
Fast, CPU-first flash-tier embedder distilled from st-all-mpnet-base-v2.

## Tier and status
- Tier: Flash
- Status: Default (current)
- Intended use: Low-latency local search on CPU

## Specs
- Architecture: Model2Vec StaticModel
- Teacher: st-all-mpnet-base-v2 (Sentence Transformers)
- Dimensions: 512
- Dtype: float16
- Disk size: ~44.46 MB (local `models/ixos-flash-v2`)

## Distillation
- Script: `python scripts/distill_model2vec_lab.py --mode flash --flash-teacher models/lab/st-all-mpnet-base-v2`
- Vocab: built from `dataset/` + `dataset/synthetic_ambiguity` (default 15k tokens)

## Performance (subset suites, 2026-01-26)
- real_corpus_v2: Recall@10 0.9300, MRR@10 0.8399, latency 376.96 ms/1k
- synthetic_ambiguity_v1: MRR@10 0.9500

## Hardware assumptions
- CPU-first, no GPU required at runtime

## Packaging and usage
- Model directory: `models/ixos-flash-v2`
- Rust: `MmapModel2VecEmbedder::new_with_type(ModelType::IxosFlashV2)`

## License
- Distilled weights: Ixos internal (MIT per MODELS_REPORT)
- Teacher: Apache-2.0 (st-all-mpnet-base-v2)

## Known limitations
- Slightly slower than int8 Flash variants; higher memory delta than v4 int8.
