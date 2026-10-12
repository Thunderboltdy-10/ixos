# Model Pipeline Changelog

## 2026-02-03 (Flash v2 + Pro v2)

**Author:** Codex  
**Summary:** Shipped Flash v2 (int8) as default, defined Pro v2 as a fusion/cascade system, and aligned naming + UI/CLI + installer paths. Added scale bench and updated canonical results.

### Key Outcomes

| Improvement | Before | After | Impact |
|-------------|--------|-------|--------|
| Flash default | Flash v1 (f16) | Flash v2 (int8) | ~20% faster, ~63% smaller model |
| Pro definition | Confused (ixos-pro-v1) | Pro v2 = Flash v2 + Potion + lexical | Correct Pro quality |
| CLI/UI parity | CLI default = potion | CLI default = flash v2 | Consistent UX |
| Canonical metrics | flash-v2 mislabeled | flash-v1 vs flash-v2 separated | Naming cleanup |
| Scale bench | None | reports/scale_bench.json + SCALE_BENCH.md | Real-world throughput |

### Metrics (Canonical)
- Flash v2 (real_corpus_v2): MRR@10 0.8340, Recall@10 0.925, latency 339.76 ms/1k.
- Pro v2 fusion (real_corpus_v2): MRR@10 0.9209, Recall@10 0.97, latency 430.57 ms/1k.

### Files Added / Updated
- `models/ixos-flash-v2` (new default model folder)
- `models/ixos-pro-v2` (fusion system definition)
- `reports/model_v2_benchmark_report.md`
- `reports/SCALE_BENCH.md`, `reports/scale_bench.json`
- `reports/HF_UPLOAD_PLAYBOOK.md`
- `reports/MODEL_NAMING_MIGRATION.md`

### Implementation Guide (updated defaults)

```rust
// Fast mode (default)
let model = MmapModel2VecEmbedder::new_with_type(ModelType::IxosFlashV2)?;
let config = ProgressiveSearchConfig::default(); // search_mode: Auto

// Pro mode (Pro v2)
let config = ProgressiveSearchConfig {
    search_mode: SearchMode::Pro,
    ..Default::default()
};
```

```bash
# Fast mode (default)
ixos search "query" --dir ./data

# Pro v2
ixos search "query" --dir ./data --search-mode pro --pro-model ixos-pro-v2
```

---

## 2026-01-27 (Historical audit)

**Author:** Claude (audit + improvements)

## Summary

This audit reproduced baselines, profiled bottlenecks, fixed documentation inconsistencies, and defined ship configurations for Fast/Accurate modes.

### Key Outcomes

| Improvement | Before | After | Impact |
|-------------|--------|-------|--------|
| Benchmark consistency | Multiple conflicting numbers | Single canonical source | Trustworthy metrics |
| MODELS_REPORT.md accuracy | MRR 0.766 (wrong) | MRR 0.8399 (correct) | Accurate docs |
| TIERS.md clarity | Flash/Pro (confusing) | Fast/Accurate (clear) | Better marketing |
| Profiling documentation | None | Full stage breakdown | Actionable bottlenecks |

## Changes Made

### Phase 1: Benchmark Reproducibility

**Created:**
- `models/lab/CANONICAL_RESULTS.md` - Authoritative benchmark source
- `models/lab/results_canonical.json` - Machine-readable canonical data
- `models/lab/results_canonical_run{1,2,3}.json` - Raw reproducibility runs
- `models/lab/results_canonical_fusion.json` - Fusion benchmark

**Fixed:**
- `MODELS_REPORT.md`: Updated flash-v2 metrics from 0.766 to 0.8399 MRR
- `MODELS_REPORT.md`: Updated fusion metrics from 0.8831 to 0.9233 MRR
- `MODELS_REPORT.md`: Updated Potion metrics from 0.727 to 0.8073 MRR

**Added to `docs/modeling/PROCESS.md`:**
- Benchmark validity section (dataset versions, seeds, metric definitions)
- Canonical source reference

### Phase 2: Performance Profiling

**Created:**
- `docs/modeling/PERF_PROFILE.md` - Full stage breakdown with P50/P95 timings
- `bench/results/PERF_PROFILE_JIT.{md,json}` - JIT mode profile
- `bench/results/PERF_PROFILE_CACHE.{md,json}` - Cache mode profile
- `bench/results/PERF_PROFILE_POTION.{md,json}` - Potion baseline

**Key findings:**
- Ranking: 39-58% of latency (SIMD already enabled via simsimd)
- Ripgrep scan: 29% of latency (I/O bound)
- Directory walk: 15% of latency
- Cache mode reduces embedding time by 75% (81% hit rate)

### Phase 3: Optimization Audit

**Verified existing optimizations:**
- SIMD cosine similarity via `simsimd` crate
- Batch embedding (P4.1 optimization)
- Dual-embedder fusion for Pro mode
- Auto routing with gap/entropy/lexical thresholds

**Architecture is already well-optimized.** No further code changes needed.

### Phase 4: Ship Configuration

**Updated `docs/product/TIERS.md`:**
- Renamed Flash/Pro to Fast/Accurate (Pablo's "Pro is free" decision)
- Defined four modes: Fast, Accurate, Auto, Eco (advanced)
- Added model selection guide by scenario
- Referenced canonical benchmarks

**Ship configuration summary:**

| Mode | Embedder(s) | MRR@10 | Latency | RAM | Default |
|------|-------------|--------|---------|-----|---------|
| **Fast** | flash-v2 | 0.834 | ~340ms | ~45MB | - |
| **Accurate** | pro-v2 (flash-v2 + potion) | 0.921 | ~431ms | ~102MB | - |
| **Auto** | Adaptive | 0.834-0.921 | ~340-431ms | ~45-102MB | Yes |
| **Eco** | flash-v4-192 | 0.80 | ~389ms | ~60MB | Hidden |

### Phase 5: Documentation

**Updated:**
- `docs/models/flash-v2.md` - Canonical metrics
- `docs/models/pro-fusion.md` - Canonical metrics
- `models/lab/EXPERIMENT_LOG.md` - Added 2026-01-27 audit notes
- `models/lab/LEADERBOARD.md` - Already had correct numbers

## Metrics Summary

### Quality (MRR@10 on real_corpus_v2)

| Model | Canonical | Previous Docs | Delta |
|-------|-----------|---------------|-------|
| ixos-flash-v2 | 0.8399 | 0.766 | +9.6% (doc fix) |
| Flash+Potion fusion | 0.9233 | 0.8831 | +4.5% (doc fix) |
| potion-base-8m-int8 | 0.8073 | 0.727 | +11% (doc fix) |

### Speed (P95 end-to-end, 1036 files)

| Mode | P95 Total | vs Baseline |
|------|-----------|-------------|
| Flash-v2 (JIT) | 536ms | Baseline |
| Flash-v2 (Cache) | 402ms | -25% |
| Potion | 272ms | -49% |

## Implementation Guide

### To use Fast mode (default):
```rust
let model = MmapModel2VecEmbedder::new_with_type(ModelType::IxosFlashV2)?;
let config = ProgressiveSearchConfig::default(); // search_mode: Auto
```

### To use Accurate mode:
```rust
let config = ProgressiveSearchConfig {
    search_mode: SearchMode::Pro,
    ..Default::default()
};
```

### To use Eco mode (advanced):
```rust
let model = MmapModel2VecEmbedder::new_with_type(ModelType::IxosFlashV4Fast)?;
```

### CLI usage:
```bash
# Fast mode (default)
ixos search "query" --dir ./data

# Pro v2
ixos search "query" --dir ./data --search-mode pro --pro-model ixos-pro-v2

# Eco mode
ixos search "query" --dir ./data --model ixos-flash-v4-fast
```

## Files Changed

```
models/lab/CANONICAL_RESULTS.md          [NEW] Canonical benchmark source
models/lab/results_canonical.json        [NEW] Machine-readable canonical data
models/lab/EXPERIMENT_LOG.md             [UPDATED] Added audit findings
docs/modeling/PROCESS.md                 [UPDATED] Added benchmark validity section
docs/modeling/PERF_PROFILE.md            [NEW] Performance profile
docs/product/TIERS.md                    [UPDATED] Fast/Accurate naming, full rewrite
docs/models/flash-v2.md                  [UPDATED] Canonical metrics
docs/models/pro-fusion.md                [UPDATED] Canonical metrics
MODELS_REPORT.md                         [UPDATED] Fixed incorrect metrics
docs/CHANGELOG_MODELS.md                 [NEW] This file
bench/results/PERF_PROFILE_*.{md,json}   [NEW] Profiling data
```

## Next Steps (Optional)

1. **Cascade embedding experiment** - Use Potion for initial ranking, Flash for uncertain top-K. Estimated 20% latency reduction on Fast mode.

2. **SIMD batch similarity** - Compute all cosine similarities in one SIMD call instead of per-candidate loop.

3. **Directory caching** - Cache directory structure to skip unchanged directories on repeated queries.

## Conclusion

The Ixos model pipeline is **production-ready** with:
- Trustworthy, reproducible benchmarks
- Well-optimized implementation (SIMD, batch embedding, dual-embedder fusion)
- Clear user-facing modes (Fast/Accurate/Auto/Eco)
- Consistent documentation across all files

**Ship recommendation: Deploy with current defaults (Auto mode, Flash v2 primary, Pro v2 fusion for refinement).**
