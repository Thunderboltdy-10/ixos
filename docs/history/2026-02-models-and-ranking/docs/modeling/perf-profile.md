# Performance Profile

**Generated:** 2026-01-27
**Hardware:** Windows 11, AMD Ryzen 7 5800X (8c/16t), 32 GB RAM
**Dataset:** 1036 files, 2.46 MB total

## Executive Summary

End-to-end search latency is dominated by **ranking** (39-58%) and **ripgrep scan** (29-44%). Cache mode reduces embedding time by 75% but ranking remains the bottleneck. The fastest model (Potion 256d int8) achieves 272ms P95 total vs 536ms for Flash-v2 512d f16.

## Stage Breakdown by Model

### Flash-v2 (512d f16) - JIT Mode

| Stage | P50 | P95 | % of Total |
|-------|-----|-----|------------|
| Directory Walk | 80ms | 80ms | 15% |
| Path Scoring | 0ms | 1ms | 0% |
| Ripgrep Scan | 109ms | 153ms | 29% |
| Candidate Selection | 3ms | 13ms | 2% |
| Embedding | 11ms | 109ms | 20% |
| Ranking | 1ms | 208ms | 39% |
| **Total** | **141ms** | **536ms** | 100% |

- TTFR (Time to First Result): 168ms P95
- Cache Hit Rate: 56%
- Candidates Embedded: 38 avg
- Peak RAM: 185 MB

### Flash-v2 (512d f16) - Cache Mode

| Stage | P50 | P95 | % of Total |
|-------|-----|-----|------------|
| Directory Walk | 74ms | 74ms | 18% |
| Path Scoring | 0ms | 0ms | 0% |
| Ripgrep Scan | 118ms | 118ms | 29% |
| Candidate Selection | 13ms | 13ms | 3% |
| Embedding | 0ms | 27ms | 7% |
| Ranking | 0ms | 234ms | 58% |
| **Total** | **139ms** | **402ms** | 100% |

- TTFR: 127ms P95
- Cache Hit Rate: 81%
- Candidates Embedded: 6 avg
- Peak RAM: 142 MB

### Potion (256d int8) - JIT Mode

| Stage | P50 | P95 | % of Total |
|-------|-----|-----|------------|
| Directory Walk | 86ms | 86ms | 32% |
| Path Scoring | 1ms | 1ms | 0% |
| Ripgrep Scan | 127ms | 127ms | 47% |
| Candidate Selection | 13ms | 13ms | 5% |
| Embedding | 0ms | 55ms | 20% |
| Ranking | 0ms | 71ms | 26% |
| **Total** | **138ms** | **272ms** | 100% |

- TTFR: 140ms P95
- Cache Hit Rate: 56%
- Candidates Embedded: 38 avg
- Peak RAM: 54 MB (**3.4x smaller** than Flash-v2)

## Top 3 Bottlenecks

### 1. Ranking (39-58% of latency)

**Problem:** Linear scan dot product over all candidate embeddings.

**Current:** O(n × d) where n=candidates, d=embedding_dim
- Flash-v2 (512d): ~208ms P95 for 38 candidates
- Potion (256d): ~71ms P95 for 38 candidates

**Scaling:** Ranking time scales linearly with embedding dimension.

**Quick wins:**
- [ ] Use 256d model for initial ranking (66% faster)
- [ ] SIMD-optimize dot product (expect 2-4x speedup on AVX-512)
- [ ] Early termination when top-K scores stabilize
- [ ] Quantized int8 dot product (half the memory bandwidth)

### 2. Ripgrep Scan (29-47% of latency)

**Problem:** File I/O and regex matching across all candidate files.

**Current:** 109-153ms P95 to scan ~1000 files.

**Quick wins:**
- [ ] Better path priors to reduce scan scope
- [ ] Directory-level caching (skip unchanged directories)
- [ ] Lazy file reading (only read files that pass path filter)
- [ ] Async I/O batching (currently sequential)

### 3. Directory Walk (15-32% of latency)

**Problem:** File system enumeration of all files.

**Current:** 74-86ms P95 for 1036 files.

**Quick wins:**
- [ ] Cache directory structure (invalidate on file watch events)
- [ ] Parallel directory traversal (currently sequential)
- [ ] Index-based lookup for known file patterns

## Cascade Embedding Opportunity

**Hypothesis:** Use Potion (256d, fast) for initial ranking, then Flash-v2 (512d, quality) only for uncertain top-K.

**Estimated savings:**
- Potion ranking: ~71ms (vs 208ms for Flash-v2)
- Re-rank top-20 with Flash-v2: ~20ms additional
- **Net savings: ~100ms (20% of total)**

**Implementation:**
1. Embed all candidates with Potion (256d)
2. Rank and identify top-K (e.g., K=50)
3. If score_gap < threshold, re-embed top-K with Flash-v2
4. Re-rank and blend scores

## Memory vs Latency Tradeoff

| Model | Dims | Dtype | Ranking P95 | Peak RAM |
|-------|------|-------|-------------|----------|
| Flash-v2 | 512 | f16 | 208ms | 185 MB |
| Flash-v4-int8-512 | 512 | int8 | ~150ms* | ~100 MB* |
| Potion | 256 | int8 | 71ms | 54 MB |

\* Estimated based on dtype/dim scaling

## Recommended Optimizations (Priority Order)

1. **[HIGH] Cascade embedding** - Use Potion for initial ranking, Flash-v2 for uncertain top-K
2. **[HIGH] SIMD dot product** - Enable AVX-512 or NEON for vector math
3. **[MEDIUM] Directory caching** - Skip unchanged directories on repeated queries
4. **[MEDIUM] Reduce default Flash model to v4-int8-512** - 50% less memory, <1% quality loss
5. **[LOW] Async ripgrep I/O** - Overlap file reading with processing

## Benchmarking Commands

```bash
# Full profile with Flash-v2
cargo run --release --bin ixos-bench -- --dir dataset --runs 10 --cache-mode jit --model ixos-flash-v2

# Cache mode profile
cargo run --release --bin ixos-bench -- --dir dataset --runs 10 --cache-mode cache --model ixos-flash-v2

# Potion baseline
cargo run --release --bin ixos-bench -- --dir dataset --runs 10 --cache-mode jit --model potion
```

## Raw Data

- JIT profile: `bench/results/PERF_PROFILE_JIT.json`
- Cache profile: `bench/results/PERF_PROFILE_CACHE.json`
- Potion profile: `bench/results/PERF_PROFILE_POTION.json`
