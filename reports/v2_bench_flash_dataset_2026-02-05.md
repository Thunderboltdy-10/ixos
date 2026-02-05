# PERF_BASELINE.md

**Generated:** 2026-02-05T20:47:13.461156600+00:00

## Corpus Statistics

| Metric | Value |
|--------|-------|
| Total Files | 1036 |
| Total Size | 2.46 MB |
| Avg File Size | 2493 bytes |

## Summary Metrics

| Metric | P50 | P95 | P99 |
|--------|-----|-----|-----|
| TTFR | 109ms | 120ms | 120ms |
| TTSI | 109ms | 120ms | 120ms |
| Total | 198ms | 408ms | 408ms |

- **Avg Cache Hit Rate:** 31.8%
- **Avg Candidates Embedded:** 61

- **Avg CPU:** 84.3%
- **Peak RAM:** 126 MB

## Stage Breakdown (P95)

| Stage | Duration |
|-------|----------|
| Directory Walk | 87ms |
| Path Scoring | 0ms |
| Ripgrep Scan | 53ms |
| Candidate Selection | 8ms |
| Embedding | 126ms |
| Ranking | 113ms |

## Exit Criteria

- [x] TTFR P95 < 200ms (actual: 120ms)
- [x] Candidates Embedded <= 1500 (actual: 61)
