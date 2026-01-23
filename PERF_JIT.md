# PERF_BASELINE.md

**Generated:** 2026-01-15T19:27:32.362116200+00:00

## Corpus Statistics

| Metric | Value |
|--------|-------|
| Total Files | 1000 |
| Total Size | 2.46 MB |
| Avg File Size | 2581 bytes |

## Summary Metrics

| Metric | P50 | P95 | P99 |
|--------|-----|-----|-----|
| TTFR | 181ms | 190ms | 190ms |
| TTSI | 181ms | 190ms | 190ms |
| Total | 578ms | 1918ms | 1918ms |

- **Avg Cache Hit Rate:** 22.5%
- **Avg Candidates Embedded:** 57

## Stage Breakdown (P95)

| Stage | Duration |
|-------|----------|
| Directory Walk | 75ms |
| Path Scoring | 0ms |
| Ripgrep Scan | 177ms |
| Candidate Selection | 14ms |
| Embedding | 1406ms |
| Ranking | 321ms |

## Exit Criteria

- [x] TTFR P95 < 200ms (actual: 190ms)
- [x] Candidates Embedded <= 1500 (actual: 57)
