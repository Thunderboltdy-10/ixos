# Product Tiers: Flash vs Pro

This document defines the product distinction between Flash and Pro for Ixos.

## Flash (Free)
**What it is:** A single-embedder semantic rerank on top of the lexical funnel.

**Pipeline:**
- Lexical funnel -> Flash embedder rerank -> secure ranking -> evidence.

**Targets:**
- CPU-first, local-first, minimal memory.
- Typical real_corpus_v2 MRR@10: ~0.84 (Flash v2) with ~377 ms/1k latency.

**Default models:**
- Flash Core: `ixos-flash-v2` (float16, 512d)
- Flash Quartz: `ixos-flash-v4-int8-512` (int8, 512d) when available
- Flash Ember: `ixos-flash-v4-int8-192` (int8, 192d) for speed-first use

## Pro (Paid)
**What it is:** A dual-embedder refinement pipeline that fuses Flash + Potion + lexical signals to boost ranking quality.

**Pipeline:**
- Flash rerank -> Auto routing -> Pro rerank (Potion) -> fusion (flash/pro/lexical/dir) -> secure ranking.

**Targets:**
- Meaningfully better ranking on real corpora.
- Typical real_corpus_v2 MRR@10: ~0.92 with ~521 ms/1k latency (fusion weights learned).
- Only invoked when Auto routing detects ambiguity, or explicitly in Pro mode.

**Default Pro model:**
- `potion` (fast, small, and complementary to Flash for fusion).

## Auto mode (bridge)
Auto routes to Pro only when needed (low score gap, weak lexical match, or high entropy). This keeps most queries at Flash latency while preserving Pro wins on ambiguous or difficult queries.

## Local-first trust
Both Flash and Pro run entirely on-device. Paid value is delivered via offline model bundles, tuning, and UI features, never by remote inference or data collection.

## Defensible differentiation
- Flash: single embedder, lowest latency, smallest footprint.
- Pro: dual embedder + fusion, higher MRR on real corpora, routed to avoid unnecessary cost.

This remains defensible even if the code is open because the Pro value is in the curated model bundle, fusion tuning, and safe defaults that are shipped as a product pack.
