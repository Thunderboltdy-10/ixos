# Ixos Pro Fusion (flash + potion + lexical)

## Summary
Pro-tier pipeline that blends Flash and Potion embeddings with lexical signals for a large quality lift at moderate latency.

## Tier and status
- Tier: Pro
- Status: Candidate (quality win, routing required)
- Intended use: Auto/Pro mode refinement on ambiguous queries

## Pipeline overview
- Embedders: Flash (Ixos Flash v2 or v4) + Potion 8M int8
- Fusion: weighted linear blend of flash similarity, pro similarity, lexical match ratio, and dir prior
- Learned weights (real_corpus_v2): flash=0.2697, pro=0.2672, lexical=0.4631, dir=0.0

## Performance (subset suites, 2026-01-26)
- real_corpus_v2: Recall@10 0.9700, MRR@10 0.9233, latency 521.34 ms/1k
- synthetic_ambiguity_v1: MRR@10 0.9833

## Hardware assumptions
- CPU-first, no GPU required at runtime

## Runtime integration
- Progressive search uses dual-embedder fusion in Auto/Pro when Pro refinement is triggered.
- Flash scores are captured before Pro refinement (Auto) or computed via flash rerank (Pro).

## Packaging and usage
- Configure Pro model to `potion` and Flash model to `ixos-flash-v2` (or v4) in UI/config.
- Rust runtime uses `ProgressiveSearchConfig` fusion weights and `search_mode` routing.

## License
- Composite of Flash model license (Ixos, MIT) and Potion (MIT).
- Ensure Apache-2.0 compliance if Flash model derives from mpnet teachers.

## Known limitations
- Higher latency than Flash; must be routed or explicitly selected.
- Quality depends on alignment between fusion weights and chosen Pro model.
