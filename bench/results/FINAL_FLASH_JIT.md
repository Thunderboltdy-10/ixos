# PERF_BASELINE.md

**Generated:** 2026-01-28T19:36:53.731904900+00:00

## Corpus Statistics

| Metric | Value |
|--------|-------|
| Total Files | 1036 |
| Total Size | 2.46 MB |
| Avg File Size | 2493 bytes |

## Summary Metrics

| Metric | P50 | P95 | P99 |
|--------|-----|-----|-----|
| TTFR | 107ms | 129ms | 129ms |
| TTSI | 107ms | 129ms | 129ms |
| Total | 140ms | 394ms | 394ms |

- **Avg Cache Hit Rate:** 56.0%
- **Avg Candidates Embedded:** 38

- **Avg CPU:** 75.6%
- **Peak RAM:** 184 MB

## Stage Breakdown (P95)

| Stage | Duration |
|-------|----------|
| Directory Walk | 72ms |
| Path Scoring | 1ms |
| Ripgrep Scan | 115ms |
| Candidate Selection | 12ms |
| Embedding | 92ms |
| Ranking | 160ms |

## Exit Criteria

- [x] TTFR P95 < 200ms (actual: 129ms)
- [x] Candidates Embedded <= 1500 (actual: 38)
