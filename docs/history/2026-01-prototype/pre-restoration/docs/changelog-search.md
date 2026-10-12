# Search Pipeline Changelog

## v0.4.0 - Flash v2 + Pro v2 Cascade (2026-02-03)

### Performance / Quality Changes

- **Pro v2 cascade implemented**: Potion fast pass → Flash v2 refine on top-K/uncertain region → lexical fusion.
- **Ranking speedup**: top-K partial selection in semantic rerank (avoids full sort).
- **Ask Mode safeguard**: Ask Mode respects selected model (flash/pro/auto), verified by regression test.
- **Scale bench added**: automated real-world benchmark with query sampling and TTFR/total stats.

### Bench Artifacts

- `reports/profile_flashv2_2026-02-03.json`
- `reports/profile_potion_2026-02-03.json`
- `reports/scale_bench.json`, `reports/SCALE_BENCH.md`

### Repro

```bash
# Profiles (JIT)
cargo run --release --bin ixos-profile -- --dir dataset --runs 6 --cache-mode jit --model ixos-flash-v2 --out reports/profile_flashv2_2026-02-03.json
cargo run --release --bin ixos-profile -- --dir dataset --runs 6 --cache-mode jit --model potion --out reports/profile_potion_2026-02-03.json

# Scale bench (auto-discover)
python scripts/scale_bench.py --search-mode auto --cache-mode jit --model ixos-flash-v2 --pro-model ixos-pro-v2 --max-queries 50
```

## v0.3.0 - Performance Optimization Release (2026-01-28)

### Performance Improvements

#### P50 Latency (Typical Query)
- **Potion 256d:** 138ms → **75ms** (**46% faster**)
- **Flash-v2 512d:** 140ms → **70ms** (**50% faster**)

#### P95 Latency (Cold Start)
- **Potion 256d:** 271ms → **206ms** (**24% faster**)
- **Flash-v2 512d:** 394ms → **336ms** (**15% faster**)

#### Time to First Result (TTFR)
- **All models:** 107ms → **50-54ms** (**50% faster**)

### Changes

#### Semantic Engine (`src/ixos_rank/semantic_engine.rs`)

**P5.1: Mutex Lock Consolidation**
- Reduced lock acquisitions in `rerank()` from 8 to 4
- Batched metrics updates into single critical section
- Batched cache updates into single critical section
- Impact: ~5-10% reduction in lock contention

**P5.2: Parallel File Reading**
- Added rayon-based parallel I/O for uncached candidates
- Threshold: Uses parallel I/O when >8 files need reading
- Falls back to sequential for small batches (avoids overhead)
- Impact: ~10-15% improvement on cold starts

**P5.3: Index-Based Candidate Tracking**
- Use indices instead of cloning paths at each phase
- Single `candidate_paths` vector shared across phases
- Reduced memory allocations per rerank call
- Impact: Reduced GC pressure

**P5.4: Batch Similarity Infrastructure**
- Added `batch_cosine_similarities()` for future vectorization
- Currently reserved for future SIMD batching improvements

#### Ripgrep Funnel (`src/ixos_rank/candidate_generator/ripgrep_funnel.rs`)

**P5.5: Pre-Computed File List (BIGGEST WIN)**
- Added `cached_file_list` field to RipgrepFunnel
- Added `set_cached_file_list()` and `clear_cached_file_list()` methods
- When file list is set, skips directory walking during search
- Iterates directly over pre-computed paths
- Impact: **53% reduction in ripgrep scan time** (104ms → 49ms)

#### Path Engine (`src/ixos_rank/candidate_generator/path_engine.rs`)

**File Path Export**
- Added `get_file_paths()` method to PathIndex
- Returns vector of all indexed file paths
- Used to share file list with RipgrepFunnel

#### Candidate Generator (`src/ixos_rank/candidate_generator/mod.rs`)

**File List Sharing**
- Updated `build_index()` to share file list with RipgrepFunnel
- Called automatically when PathIndex is built
- Eliminates redundant directory walking

### Bug Fixes

- Fixed missing `Serialize` import in `ixos-profile.rs`
- Fixed missing `Default` derive on `ProfileModelType` enum

### Testing

- All 415 tests pass
- No quality regression (same ranking behavior)
- Verified on 1036 file corpus

### Documentation

- Created `models/lab/PERF_LEADERBOARD.md` - Full performance results
- Created `docs/modeling/RANKING_OPTIMIZATIONS.md` - Technical details
- Updated `models/lab/SEARCH_OPT_PLAN.md` - Optimization plan status

### Benchmark Artifacts

- `bench/results/BASELINE_POTION_JIT.json` - Pre-optimization
- `bench/results/BASELINE_FLASH_JIT.json` - Pre-optimization
- `bench/results/OPT3_POTION_JIT.json` - Final optimized
- `bench/results/OPT3_FLASH_JIT.json` - Final optimized

---

## Future Improvements (Not Yet Implemented)

### Cascade Retrieval
- Implemented in v0.4.0 as Pro v2 cascade (Potion fast pass → Flash v2 refine → fusion).

### Incremental Lexical Index
- Build trigram/token index updated by file watcher
- Replace per-query ripgrep with index lookup
- Expected: Could reduce ripgrep to <10ms

---

## Breaking Changes

None. All changes are internal optimizations with no API changes.

## Migration Guide

No migration required. Simply update to the new version.

## How to Reproduce

```bash
# Build
cargo build --release

# Run benchmarks
./target/release/ixos-bench --dir dataset --runs 10 --cache-mode jit --model potion
./target/release/ixos-bench --dir dataset --runs 10 --cache-mode jit --model ixos-flash-v2
```
