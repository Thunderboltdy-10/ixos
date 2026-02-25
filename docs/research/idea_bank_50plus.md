# Idea Bank (60 Ideas): High-Impact Speed + Retrieval Success Levers

Date: 2026-02-23  
Speed references: `docs/research/upper_bounds.md` (Flash v2 Total p95 shares: walk 21.59%, scan 17.30%, embed 25.79%, rank 22.22%).

Interpretation rule used in this bank:
- Estimated Total p95 gain is computed by stage-share arithmetic (e.g., reducing 50% of embedding work yields about 12.9% Total p95 gain).
- TTFR p95 is assumed walk-dominant (current 68 ms), so walk elimination directly affects TTFR.

## A) Stop walking every query (10 ideas)

| ID | Idea | Stage(s) reduced | Speedup potential (upper-bound anchored) | Accuracy mechanism |
|---|---|---|---|---|
| A1 | OS-journal delta map (USN/FSEvents/inotify) replaces full tree walk on steady-state queries | walk, scan | If walk reduced 70-95% and scan 10-30%: ~16.8-25.7% Total p95; TTFR p95 can approach 2x when walk cut >=50% | fresher candidate universe (fewer stale/missing files) |
| A2 | Persistent root frontier cache (top changed dirs first, rest lazy) | walk, scan | Walk 60-90% + scan 10-20%: ~14.7-22.9% Total p95; TTFR 1.6-2.0x cohort-level | changed regions searched first improves top-k within N seconds |
| A3 | Path trie with invalidation bitsets and lazy subtree materialization | walk | Walk 60-100%: ~13.0-21.6% Total p95; TTFR up to 2x+ | faster path recall for deep directories |
| A4 | Directory-level posting cache keyed by query term signatures | walk, scan | Walk 40-80% + scan 20-40%: ~12.1-24.2% Total p95 | higher lexical recall in likely folders before global fallback |
| A5 | Two-level root scheduler (hot roots immediate, cold roots background) | walk | Walk 50-90% on critical path: ~10.8-19.4% Total p95; TTFR near 2x if p95 path avoids cold roots | early results from relevant roots improve opened-file@k-time |
| A6 | MFT/inode snapshot checkpoint with incremental replay | walk | Walk 70-95%: ~15.1-20.5% Total p95; TTFR 1.8-2.3x in warm state | stable full-file universe reduces random misses |
| A7 | Scope memory from prior successful roots per query-cluster | walk, scan | Walk 40-85% + scan 10-30%: ~10.4-23.5% Total p95 | query-cluster reuse raises top-k success probability |
| A8 | Prefix-path Bloom gate skips known-empty subtrees for current query tokens | walk, scan | Walk 30-70% + scan 20-40%: ~9.9-22.1% Total p95 | less dilution from irrelevant directories increases precision |
| A9 | Workstream-root first pass with strict budget then global expansion | walk, scan, embed | Walk 50-85% + scan 25-45% + embed 10-20%: ~17.0-33.5% Total p95 | context scope first improves early top-k and later semantic quality |
| A10 | Hybrid snapshot+watcher mode with fail-open fallback to full walk only on drift | walk | Steady state walk 70-95% reduction, drift fallback preserves correctness: ~15.1-20.5% Total p95 | correctness maintained under churn via bounded fallback |

## B) Stop scanning every query (10 ideas)

| ID | Idea | Stage(s) reduced | Speedup potential (upper-bound anchored) | Accuracy mechanism |
|---|---|---|---|---|
| B1 | Trigram inverted index prefilter before ripgrep | scan, embed, rank | Scan 60-90% + embed 20-40% + rank 10-30%: ~21.5-41.0% Total p95 | better candidate shortlist quality before semantic rerank |
| B2 | Per-file Bloom/bitset lexical sketches to reject impossible matches | scan | Scan 50-85%: ~8.7-14.7% Total p95 | preserves recall while reducing noisy scans |
| B3 | Learned lexical selectivity estimator chooses exact scan vs indexed lookup | scan, walk | Scan 40-80% + walk 10-30%: ~9.1-20.2% Total p95 | right retrieval path per query reduces false negatives |
| B4 | Query-term DF cache and early empty-intersection test | scan | Scan 30-70%: ~5.2-12.1% Total p95 | avoids wasting budget on impossible conjunctions |
| B5 | SIMD token filter + chunk skip map for large files | scan, rank | Scan 30-60% + rank 10-20%: ~7.4-14.8% Total p95 | keeps more budget for better reranking |
| B6 | Segment-level lexical index for documents (docx/pdf text segments) | scan, embed | Scan 40-80% + embed 10-25%: ~9.5-20.3% Total p95 | improves document retrieval precision and recall |
| B7 | Multi-query memoization of recent ripgrep postings in hot window | scan | Scan 35-75%: ~6.1-13.0% Total p95 | better consistency for iterative reformulations |
| B8 | Token-set MinHash locality gate to select only likely files for scan | scan, embed, rank | Scan 50-85% + embed 20-35% + rank 15-30%: ~20.9-38.9% Total p95 | denser candidate quality for top-k open success |
| B9 | Lexical ANN (sparse vector index) fallback instead of broad grep | scan, embed | Scan 55-90% + embed 15-35%: ~13.7-24.5% Total p95 | broader lexical recall than exact grep under misspellings |
| B10 | Content-addressed scan cache keyed by (file hash, token set) | scan | Scan 40-80% (rewrite-heavy repos lower): ~6.9-13.8% Total p95 | deterministic reuse avoids stale false hits via hash checks |

## C) Smarter cascade / early exit (10 ideas)

| ID | Idea | Stage(s) reduced | Speedup potential (upper-bound anchored) | Accuracy mechanism |
|---|---|---|---|---|
| C1 | Conformal uncertainty gate for semantic/pro refine | embed, rank | Embed 40-80% + rank 30-70%: ~17.0-36.1% Total p95 | calibrated abstention preserves hard-query quality |
| C2 | Sequential probability ratio test for stopping rerank batches | embed, rank | Embed 30-70% + rank 30-60%: ~14.4-31.4% Total p95 | stop only when confidence in top-k is high |
| C3 | Block-Max/WAND-style dynamic pruning in lexical candidate scoring | scan, rank, embed | Scan 30-70% + rank 20-50% + embed 15-35%: ~14.4-33.3% Total p95 | prunes low-upside candidates without losing high scorers |
| C4 | Anytime rerank with utility-per-ms budget controller | embed, rank | Embed 35-75% + rank 30-70%: ~15.7-34.9% Total p95 | returns strong early top-k, improves within-time success |
| C5 | Query hardness classifier controls candidate multiplier | embed, rank, scan | Embed 25-60% + rank 20-50% + scan 10-30%: ~12.5-28.6% Total p95 | more budget on hard queries, less overcompute on easy ones |
| C6 | Dual-threshold gate: lexical consensus + semantic margin | embed, rank | Embed 35-70% + rank 25-60%: ~14.6-31.4% Total p95 | reduces unnecessary refine while protecting ambiguous cases |
| C7 | Early evidence stop when answer confidence saturates | rank, embed | Rank 20-50% + embed 20-40%: ~9.6-19.2% Total p95 | prevents tail drag and keeps confidence-weighted evidence |
| C8 | Per-query latency knapsack allocates ms budget across stages | walk, scan, embed, rank | Combined 35-60% reduction on heavy stages when planner is confident: ~30.4-52.1% Total p95 | budget goes to highest expected relevance gain stages |
| C9 | Risk-aware fallback ladder (lexical -> flash -> pro only on demand) | embed, rank, scan | Embed 35-75% + rank 30-70% + scan 10-25%: ~17.5-38.6% Total p95 | keeps strong quality via guarded fallback path |
| C10 | Calibration-aware top-k freeze (stop rerank after stable rank bands) | rank, embed | Rank 30-70% + embed 20-50%: ~11.8-28.5% Total p95 | stable top-k criterion preserves opened-file@k consistency |

## D) Hybrid retrieval accuracy boosts (10 ideas)

| ID | Idea | Stage(s) reduced | Speedup potential (upper-bound anchored) | Accuracy mechanism |
|---|---|---|---|---|
| D1 | RRF fusion of sparse lexical index + dense semantic with adaptive weights | scan, embed, rank | Scan 30-60% + embed 20-45% + rank 15-35%: ~13.3-31.5% Total p95 | robust lexical+semantic complementarity improves recall@k |
| D2 | SPLADE-lite sparse vectors for fast high-recall preselection | scan, embed | Scan 50-85% + embed 10-30%: ~11.2-22.4% Total p95 | captures semantic term expansion with sparse efficiency |
| D3 | Multi-vector late interaction only on shortlisted candidates | embed, rank | Embed 30-65% + rank 20-55%: ~12.2-29.0% Total p95 | higher precision rerank with bounded cost |
| D4 | Filetype-specialized first-stage retrievers (code/docs/config) | scan, embed, rank | Scan 35-70% + embed 20-50% + rank 10-30%: ~14.5-34.5% Total p95 | domain-appropriate retrieval boosts top-k open success |
| D5 | Learned fusion feature set includes path priors and recency | rank, embed | Rank 20-45% + embed 15-35%: ~9.6-19.3% Total p95 | better ordering at fixed candidate budget |
| D6 | Approximate nearest centroid routing before exact dense scoring | embed, rank | Embed 40-70% + rank 20-45%: ~14.8-28.1% Total p95 | preserves semantic recall with cheaper coarse routing |
| D7 | Cross-encoder-lite only for uncertain top-20 not all candidates | rank, embed | Rank 25-60% + embed 25-50%: ~12.0-27.7% Total p95 | focused expensive scoring where it changes decisions |
| D8 | Structured query decomposition (path term + content term + intent) | walk, scan, embed | Walk 20-50% + scan 20-50% + embed 10-25%: ~10.6-24.8% Total p95 | better candidate grounding for mixed path/content queries |
| D9 | Lexical typo/abbreviation expansion with confidence cap | scan, embed | Scan 15-40% + embed 10-20%: ~5.2-12.1% Total p95 | improves recall without broadening to full-scan explosion |
| D10 | Query-aware chunking policy for embedding (short files skip chunking) | embed, rank | Embed 25-55% + rank 10-30%: ~8.7-20.8% Total p95 | cleaner chunk candidates improve semantic precision |

## E) Behavior-conditioned planning (10 ideas)

| ID | Idea | Stage(s) reduced | Speedup potential (upper-bound anchored) | Accuracy mechanism |
|---|---|---|---|---|
| E1 | Cost-aware Hawkes folder router (budgeted scope order) | walk, scan, embed | Walk 50-85% + scan 30-60% + embed 10-25%: ~17.0-34.5% Total p95; TTFR up to 2x | routes to likely successful folders first |
| E2 | Workstream state model selects initial scope + model mode | walk, scan, embed, rank | Walk 40-80% + scan 25-55% + embed 20-45% + rank 15-35%: ~25.0-50.6% Total p95 | context-aware routing improves opened-file@k-in-time |
| E3 | Contextual bandit chooses Flash/Auto/Pro per query | embed, rank, scan | Embed 30-70% + rank 30-65% + scan 10-30%: ~17.1-36.8% Total p95 | learns latency-quality frontier per user/workload |
| E4 | Recency-frequency-intent planner with explicit SLA objective | walk, scan, embed | Walk 35-70% + scan 20-45% + embed 15-35%: ~15.6-30.8% Total p95 | better first-pass candidate set quality |
| E5 | Query reformulation memory (reuse last successful plan) | walk, scan | Walk 30-60% + scan 20-45%: ~10.0-20.7% Total p95 | boosts success on iterative searches |
| E6 | Time-of-day/work-cycle priors for root and filetype selection | walk, scan, embed | Walk 20-50% + scan 15-35% + embed 10-20%: ~8.8-20.0% Total p95 | reduces irrelevant scope at task-specific times |
| E7 | Session change-point detector resets bad priors quickly | walk, scan, rank | Walk 20-40% + scan 15-35% + rank 10-25%: ~9.0-18.2% Total p95 | avoids stale personalization harming accuracy |
| E8 | Reinforcement planner with reward = opened-file@k-time - latency penalty | walk, scan, embed, rank | Heavy-stage reduction 30-55% when policy converges: ~26.1-47.8% Total p95 | directly optimizes success-under-time metric |
| E9 | Query-cluster routing templates (code fix, config lookup, document ask) | walk, scan, embed | Walk 30-70% + scan 25-55% + embed 10-30%: ~12.7-31.8% Total p95 | intent-specific pipelines improve hit quality |
| E10 | Personalized cache admission by predicted near-future reuse | embed, scan | Embed 20-50% + scan 10-25%: ~6.9-17.2% Total p95 | higher warm-hit probability improves top-k latency |

## F) Privacy-mode safe personalization (10 ideas)

| ID | Idea | Stage(s) reduced | Speedup potential (upper-bound anchored) | Accuracy mechanism |
|---|---|---|---|---|
| F1 | Dual-path planner: persistent profile (normal) vs ephemeral profile (journalist mode) | walk, scan, embed, rank | Normal mode: 25-45% via personalization; privacy mode: deterministic baseline with <=5% overhead | preserves gains without violating zero-index/privacy constraints |
| F2 | On-device federated-style local updates only (no upload) for routing weights | embed, rank, scan | Embed 20-45% + rank 20-45% + scan 10-20%: ~11.9-27.9% Total p95 | adapts ranking while keeping data local |
| F3 | LDP-style noisy counters for behavior features in persistent mode | walk, scan | Walk 20-50% + scan 15-35%: ~8.8-16.8% Total p95 | private but still informative scope priors |
| F4 | Privacy budget-aware gating (disable high-risk signals first, not whole planner) | embed, rank | Embed 20-40% + rank 15-35%: ~8.5-18.0% Total p95 | graceful degradation keeps robust candidate quality |
| F5 | Encrypted local behavior index with short TTL and scoped keys | walk, scan, embed | Walk 25-55% + scan 20-45% + embed 10-25%: ~11.9-25.0% Total p95 | secure personalization with bounded retention |
| F6 | Session-only micro-index for deep-search mode (destroy on exit) | walk, scan | During session walk 40-75% + scan 20-45%: ~12.1-23.9% Total p95 | maintains fast iterative search in privacy sessions |
| F7 | Privacy-safe workstream memory using hashed folder clusters | walk, scan, rank | Walk 25-55% + scan 20-45% + rank 10-20%: ~12.4-25.0% Total p95 | context routing without storing cleartext queries |
| F8 | User-selectable personalization levels with measured SLA guarantees | walk, scan, embed, rank | Level-dependent: from baseline to ~35% Total p95 gain; explicit tradeoff control | transparency increases controllable accuracy/latency balance |
| F9 | Zero-retention fallback verifier (A/B check against non-personalized route) | rank, embed | Small direct speed gain (~5-15%), but protects quality regressions | catches personalization-induced miss cases |
| F10 | Differentially private query-cluster templates stored locally | walk, scan, embed | Walk 20-45% + scan 15-40% + embed 10-25%: ~9.2-22.2% Total p95 | better intent routing with reduced re-identification risk |

## Bank-level observations

- Ideas most likely to exceed the user threshold (`>=30% Total p95` or `>=2x TTFR p95`) are concentrated in:
  - `A9`, `B1`, `B8`, `C1`, `C3`, `C4`, `C8`, `C9`, `D4`, `E1`, `E2`, `E3`, `E8`.
- The strongest class is multi-stage work elimination (walk+scan+embed+rank), not micro-optimization in one stage.
