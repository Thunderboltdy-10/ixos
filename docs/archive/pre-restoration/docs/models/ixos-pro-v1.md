# Ixos Pro v1

## Summary
Legacy Pro embedder distilled from paraphrase mpnet; currently slower and lower quality than Flash.

## Tier and status
- Tier: Pro (legacy)
- Status: Deprecated for quality (kept for backward compatibility)
- Intended use: None (avoid unless testing)

## Specs
- Architecture: Model2Vec StaticModel
- Teacher: st-paraphrase-mpnet-base-v2
- Dimensions: 768
- Dtype: float16
- Disk size: ~65.81 MB (local `models/ixos-pro-v1`)

## Performance (subset suites, 2026-01-26)
- real_corpus_v2: Recall@10 0.8550, MRR@10 0.7354, latency 1606.55 ms/1k
- synthetic_ambiguity_v1: MRR@10 0.9361

## Hardware assumptions
- CPU-first, but heavy and slow for desktop CPU

## Packaging and usage
- Model directory: `models/ixos-pro-v1`
- Rust: `MmapModel2VecEmbedder::new_with_type(ModelType::IxosProV1)`

## License
- Derived from st-paraphrase-mpnet-base-v2 (Apache-2.0)
- Distilled weights: Ixos internal; verify redistribution policy

## Known limitations
- Regresses quality vs Flash v2 on real corpus and is much slower.
