# Ixos Flash v4 (int8 512d)

## Summary
Quality-leaning Flash variant with int8 embeddings and reduced disk footprint.

## Tier and status
- Tier: Flash
- Status: Promoted (basis for Flash v2)
- Intended use: Default flash replacement where disk + memory reduction is needed

## Specs
- Architecture: Model2Vec StaticModel
- Teacher: st-all-mpnet-base-v2
- Dimensions: 512
- Dtype: int8
- Disk size: ~17.65 MB (local `models/lab/ixos-flash-v4-int8-512`)

## Distillation
- Script: `python scripts/distill_model2vec_lab.py --mode flash --flash-id ixos-flash-v4-int8-512 --flash-dims 512 --flash-quantize int8`
- Vocab: built from `dataset/` + `dataset/synthetic_ambiguity` (default 15k tokens)

## Performance (subset suites, 2026-01-26)
- real_corpus_v2: Recall@10 0.9250, MRR@10 0.8340, latency 366.85 ms/1k
- synthetic_ambiguity_v1: MRR@10 0.9444

## Hardware assumptions
- CPU-first, no GPU required at runtime

## Packaging and usage
- Model directory (lab): `models/lab/ixos-flash-v4-int8-512`
- To promote, copy to `models/ixos-flash-v4-int8-512`
- Rust: `MmapModel2VecEmbedder::new_with_type(ModelType::IxosFlashV4)`

## License
- Derived from st-all-mpnet-base-v2 (Apache-2.0)
- Distilled weights: Ixos internal; ensure Apache-2.0 compliance

## Known limitations
- Slight MRR regression vs Flash v2 on real_corpus_v2.
