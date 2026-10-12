# Ixos Pro Fusion (flash + potion + lexical)

## Summary
Pro-tier pipeline that blends Flash and Potion embeddings with lexical signals for a large quality lift at moderate latency.

## Tier and status
- Tier: Pro
- Status: Candidate (quality win, routing required)
- Intended use: Auto/Pro mode refinement on ambiguous queries

## Pipeline overview
- Embedders: Flash v2 (`ixos-flash-v2`) + Potion 8M int8 (internal)
- Fusion: weighted linear blend of flash similarity, pro similarity, lexical match ratio, and dir prior
- Learned weights (real_corpus_v2): flash=0.2672, pro=0.2725, lexical=0.4602, dir=0.0

## Performance (canonical, 2026-02-02)

| Suite | MRR@10 | Recall@10 | Latency |
|-------|--------|-----------|---------|
| real_corpus_v2 | 0.9209 | 0.97 | 430.57 ms/1k |
| synthetic_ambiguity_v1 | 0.9833 | 1.00 | 131.83 ms/1k |

**Improvement over Flash-only:** +10.4% MRR@10 (vs Flash v2 canonical)

See `models/lab/results_v2_fusion_flashv2_2026-02-03.json` for details.

See `models/lab/CANONICAL_RESULTS.md` for verified benchmarks.

## Hardware assumptions
- CPU-first, no GPU required at runtime

## Runtime integration
- Progressive search uses dual-embedder fusion in Auto/Pro when Pro refinement is triggered.
- Flash scores are captured before Pro refinement (Auto) or computed via flash rerank (Pro).

## Packaging and usage
- Configure Pro model to `ixos-pro-v2` and Flash model to `ixos-flash-v2` in UI/config/CLI.
- Potion remains an internal dependency (not exposed as a user-selectable mode).
- Rust runtime uses `ProgressiveSearchConfig` fusion weights and `search_mode` routing.

## License
- Composite of Flash model license (Ixos, MIT) and Potion (MIT).
- Ensure Apache-2.0 compliance if Flash model derives from mpnet teachers.

## Known limitations
- Higher latency than Flash; must be routed or explicitly selected.
- Quality depends on alignment between fusion weights and chosen Pro model.
