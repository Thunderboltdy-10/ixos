# 00 Architecture Map

Generated: 2026-03-03 21:40:34 UTC

## Scope
- `src/ixos_rank/*` (progressive pipeline, candidate generation, semantic rerank, ask mode, evidence)
- `src/ixos_embed/*` (secure embedder, cache mode behavior, background indexer)
- `src-tauri/src/commands/search.rs` (frontend command gate + model/mode policy)
- `scripts/ralph_loop.py` + benchmark outputs under `reports/ralph/*`
- `golden_data/*` and existing innovation artifacts under `reports/innovation/*`

## Compact Dataflow

```text
UI (Tauri channel)
  -> search_progressive command (src-tauri/src/commands/search.rs)
     -> entitlement + capability checks (Pro gating)
     -> mode resolution (flash/pro/auto), ask-mode detection, cache mode parse
     -> model load (selected model; optional pro model)
     -> lexical preflight (optional) decides eager semantic indexing
     -> ProgressiveSearchEngine::search_progressive()
         Phase 0: Echo stream update
         Phase 1: Lexical candidate generation (streaming batches)
             - PathIndex scoring (cached index, TTL 300s)
             - Ripgrep funnel (hard cap + timeout)
             - Document engine gate for binary formats
             - Merge + metadata priors + ask anchors
         Phase 2: Semantic rerank
             - Flash rerank on lexical candidates
             - Pro primary + optional flash refinement fusion in Pro mode
             - Auto-mode optional Pro top-k refinement (heuristic gate)
             - Optional experiment: witness guard (`IXOS_EXPERIMENT_WITNESS_GUARD`, default off)
         Phase 3: Secure ranking + evidence/snippet enrichment
         Phase 4: Stream semantic results (and optional refined update)
  -> Event forwarder -> UI payloads (lexical batches, semantic, status, stream stats)
```

## Key Components and Guarantees

### 1) Command-layer policy gates (`src-tauri/src/commands/search.rs`)
- `resolve_search_mode` downgrades `auto` to `flash` for non-Pro and rejects explicit `pro` without entitlement.
- `ask_mode_active` requires Pro and intent detection (`ask_mode_requested`).
- `parse_cache_mode` allows only `native-cache/local` and `ephemeral/memory`; legacy aliases are rejected.
- Eager semantic indexing guard: only forced for Pro mode or lexical-preflight miss (`should_eager_index_semantic`).
- Runtime invariant: personal ranking is disabled when user lacks Pro entitlement.

### 2) Progressive pipeline (`src/ixos_rank/progressive.rs`)
- Phase structure is explicit in `search_progressive`:
  - lexical batches first,
  - semantic rerank,
  - optional refinement in Auto/Pro.
- Auto refine gate (`should_refine`) combines uncertainty signals:
  - score gap, lexical confidence, entropy, top-1/top-k score levels.
- Pro fusion path combines pro/flash/lexical/path priors with configured weights.
- Stream contract includes stage + stats payloads (`Echo`, `Lexical`, `Semantic`, `Refining`, `Tail`).

### 3) Candidate generator (`src/ixos_rank/candidate_generator/*`)
- Hard caps:
  - `MAX_CANDIDATES_FOR_EMBEDDING = 3000`
  - `RIPGREP_MAX_HITS = 5000`
  - `RIPGREP_TIMEOUT_MS = 300`
  - `MAX_BYTES_READ_PER_FILE = 64KB`
- Path index is cached globally with TTL (`INDEX_CACHE_TTL_SECS = 300`) and shared file list is reused by ripgrep to skip redundant walks.
- Ask-mode anchor filtering can hard-prune candidate set.

### 4) Semantic engine + cache behavior (`src/ixos_rank/semantic_engine.rs`)
- Two cache modes:
  - `Ephemeral`: memory-only embeddings (privacy-first).
  - `NativeCache`: persistent cache backend + memory front cache.
- `index_directory` is lazy path collection; embeddings are created on demand.
- Hot path in `get_embedding`:
  1. memory cache
  2. persistent cache (NativeCache only)
  3. file read + embed + cache write
- Includes directory centroid boost and FSTD topology boosts during similarity scoring.

## Where Time Accumulates (from latest harsh Tier-C bench)
- Source: `reports/ralph/big_bench_20260303_213041.json`
- Core latency:
  - TTFR p50/p95: `46 / 66 ms`
  - Total p50/p95: `47 / 68 ms`
  - Cold Total p95: `180 ms`
- Stage p95:
  - Walk: `160 ms` (largest tail contributor)
  - Ripgrep: `35 ms`
  - Rank: `2 ms`
  - Embed: `0 ms` (cache-warm dominant in this run)
- Interpretation: walk + lexical scanning are the dominant practical tails in this benchmark profile.

## Caches and State Surfaces
- Path index cache (in-process, TTL 300s).
- Ripgrep cached file list shared from path index.
- Semantic memory cache (always used).
- Optional persistent embedding cache (`NativeCache` mode only).
- Model cache via `state.get_or_load_model`.

## Invariants and Risk Points

### Runtime invariants to preserve
- No-write behavior in memory/ephemeral mode (no persistent embedding writes).
- User-selected model must be honored; Ask mode must not silently force Pro.
- Search-mode labels and behavior must stay aligned.
- Pro-only features (mode + personal ranking) must remain entitlement-gated at core.

### Current risk points observed
- Trust failure: exact anchor miss + privacy drift for `results streamed` in `flash/auto` on `corpus_tiny` (`restricted/secret.txt` appears in top-k).
- Potential UX inconsistency: golden `logs_streamed` expected top-1 conflicts with observed top-1 (expectation drift vs behavior drift requires decision).
- Tail risk on large-tree path walking remains dominant for TTFR/Total p95.
