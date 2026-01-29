# PERF_BASELINE.md

**Generated:** 2026-01-28T19:29:12.329032900+00:00

## Corpus Statistics

| Metric | Value |
|--------|-------|
| Total Files | 1036 |
| Total Size | 2.46 MB |
| Avg File Size | 2493 bytes |

## Summary Metrics

| Metric | P50 | P95 | P99 |
|--------|-----|-----|-----|
| TTFR | 100ms | 137ms | 137ms |
| TTSI | 100ms | 137ms | 137ms |
| Total | 136ms | 271ms | 271ms |

- **Avg Cache Hit Rate:** 31.8%
- **Avg Candidates Embedded:** 61

- **Avg CPU:** 63.4%
- **Peak RAM:** 54 MB

## Stage Breakdown (P95)

| Stage | Duration |
|-------|----------|
| Directory Walk | 68ms |
| Path Scoring | 0ms |
| Ripgrep Scan | 124ms |
| Candidate Selection | 12ms |
| Embedding | 51ms |
| Ranking | 64ms |

## Exit Criteria

- [x] TTFR P95 < 200ms (actual: 137ms)
- [x] Candidates Embedded <= 1500 (actual: 61)
