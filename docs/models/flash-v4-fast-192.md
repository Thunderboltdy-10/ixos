# Ixos Flash v4 Fast (int8 192d)

## Summary
Speed-first Flash variant for the lowest CPU latency and tiny disk size.

## Tier and status
- Tier: Flash
- Status: Candidate (speed-focused)
- Intended use: Ultra-fast CPU deployments where small quality tradeoff is acceptable

## Specs
- Architecture: Model2Vec StaticModel
- Teacher: st-all-mpnet-base-v2
- Dimensions: 192
- Dtype: int8
- Disk size: ~7.45 MB (local `models/lab/ixos-flash-v4-int8-192`)

## Distillation
- Script: `python scripts/distill_model2vec_lab.py --mode flash --flash-id ixos-flash-v4-int8-192 --flash-dims 192 --flash-quantize int8`
- Vocab: built from `dataset/` + `dataset/synthetic_ambiguity` (default 15k tokens)

## Performance (subset suites, 2026-01-26)
- real_corpus_v2: Recall@10 0.9000, MRR@10 0.7950, latency 340.03 ms/1k
- synthetic_ambiguity_v1: MRR@10 0.9278

## Hardware assumptions
- CPU-first, no GPU required at runtime

## Packaging and usage
- Model directory (lab): `models/lab/ixos-flash-v4-int8-192`
- To promote, copy to `models/ixos-flash-v4-int8-192`
- Rust: `MmapModel2VecEmbedder::new_with_type(ModelType::IxosFlashV4Fast)`

## License
- Derived from st-all-mpnet-base-v2 (Apache-2.0)
- Distilled weights: Ixos internal; ensure Apache-2.0 compliance

## Known limitations
- Noticeable MRR drop vs Flash v2; treat as speed-first tier.
