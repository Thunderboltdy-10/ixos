# 00 Architecture Map

Generated: 2026-03-04
Scope: current runtime path from Tauri command to final ranked response, including cache layers and p95 tail drivers.

## Request Path (Current)
1. `src-tauri/src/commands/search.rs::search_progressive`
2. Resolve entitlement + mode + cache mode + model ids.
3. Build lexical engine (`CandidateLexicalEngine`) and semantic engine (`StubSemanticEngine` with selected model).
4. Optional eager semantic indexing gate: enabled when Pro-primary or lexical preflight is empty.
5. Call `ProgressiveSearchEngine::search_progressive`.

## Progressive Pipeline Stages
1. `Echo`: immediately emit stream state.
2. `Lexical`: `CandidateGenerator::generate_streaming`.
3. `Semantic`: rerank lexical candidates via `SemanticEngine::rerank`.
4. `Refining`: optional Pro/Flash secondary pass and fusion.
5. `Tail`: evidence/snippet extraction and final stream complete.

## Candidate Generation Internals
- `PathIndex` walk + token index (`path_engine.rs`): path-only BM25-like scoring.
- `RipgrepFunnel` (`ripgrep_funnel.rs`): capped/timeout content scan (`max_hits=5000`, `timeout_ms=300`).
- Merge + dedup path/ripgrep/document candidates.
- Metadata priors (`metadata_priors.rs`): recency/folder/type boost.
- Ask-mode anchor filtering (`query_preprocess.rs` + anchor extractor).

## Semantic Rerank Internals
From `semantic_engine.rs::rerank`:
1. Partition cached vs uncached candidates.
2. Parallel file reads for uncached set (`rayon` when >8 uncached).
3. Batch embedding (`embed_batch_secure`).
4. Memory cache + optional persistent cache write-back.
5. Directory centroid and FSTD topology boosts.
6. Similarity scoring + top-k selection.

## Ranking/Trust Layer
- `progressive.rs` fusion and rerank orchestration.
- Optional witness guard via `IXOS_EXPERIMENT_WITNESS_GUARD`.
- Final ranker: `SecureRanker` (integrity-aware scoring).
- Evidence phase: semantic passage extraction + trusted snippet selection for Ask mode.

## Cache Layers
1. Tauri app state model cache: `AppState::model_cache`.
2. Candidate-generator root cache: static `INDEX_CACHE` keyed by root path.
3. Ripgrep cached file list: reused from path index.
4. Query preprocessor LRU (size 256).
5. Lexical engine content LRU.
6. Semantic memory embedding cache (always present).
7. Semantic persistent cache (NativeCache mode only).
8. Secure ranker integrity cache (TTL-based).
9. Per-search evidence/document extraction cache (session-local, cleared).

## Invariants and Contracts
- Zero-index philosophy: no forced persistent index for content; persistent embedding cache is mode-gated.
- Ask mode must respect selected model (`progressive.rs` tests include `test_ask_mode_respects_selected_model`).
- Pro mode is entitlement-gated in Tauri command layer.
- Candidate/time caps exist to avoid full-corpus blowups (`search_pure` hard cap, ripgrep timeout/hit caps).

## TTFR vs Total: Where Time Is Spent
Observed from latest measured artifacts:
- `reports/ralph/big_bench_20260303_233636.json` (native-cache, runs=1, dataset):
  - TTFR p50/p95: 44/87 ms
  - Total p50/p95: 45/149 ms
  - Stage p95: walk 115, ripgrep 43, embed 36, rank 33
- `reports/innovation_sprint_vnext/artifacts/stability_20260304_003842/stability_summary.json` (runs=5):
  - NativeCache: Total p95 94 ms, cache hit ~95%
  - Ephemeral: Total p95 432 ms, cache hit 0%

Interpretation:
- Cold/mixed tail is dominated by embedding + rank when cache is cold/ephemeral.
- In warm native-cache runs, embedding cost collapses and TTFR/Total are driven mainly by lexical + fixed overhead.
- p95 spikes are strongly coupled to compute-escalation paths (Pro/fallback/progressive refine), not only lexical stages.

## p95 Tail Sensitivities
1. Controller/model escalation to Pro paths.
2. Low-confidence queries with larger semantic candidate sets.
3. First-query cold model/cache effects.
4. Non-progressive settings-matrix paths currently showing empty result behavior (product reliability risk, not raw latency only).
