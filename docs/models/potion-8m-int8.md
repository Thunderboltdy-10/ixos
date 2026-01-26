# Potion 8M (int8)

## Summary
Legacy fast baseline and Pro fusion component; extremely small and CPU-friendly.

## Tier and status
- Tier: Flash baseline / Pro component
- Status: Legacy baseline (still used in Pro fusion)
- Intended use: Speed-critical fallback or Pro fusion partner

## Specs
- Architecture: Model2Vec StaticModel
- Source model: minishlab/potion-base-8M
- Dimensions: 256
- Dtype: int8
- Disk size: ~7.64 MB (local `models/potion-base-8M-int8`)

## Performance (subset suites, 2026-01-26)
- real_corpus_v2: Recall@10 0.9000, MRR@10 0.8073, latency 179.55 ms/1k
- synthetic_ambiguity_v1: MRR@10 0.9611

## Hardware assumptions
- CPU-first, no GPU required at runtime

## Packaging and usage
- Model directory: `models/potion-base-8M-int8`
- Rust: `MmapModel2VecEmbedder::new_with_type(ModelType::Potion)`

## License
- MIT (per MODELS_REPORT)

## Known limitations
- Lower quality than Flash v2 on real corpus when used alone.
