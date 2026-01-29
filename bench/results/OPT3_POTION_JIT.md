# PERF_BASELINE.md

**Generated:** 2026-01-28T19:40:41.990299+00:00

## Corpus Statistics

| Metric | Value |
|--------|-------|
| Total Files | 1036 |
| Total Size | 2.46 MB |
| Avg File Size | 2493 bytes |

## Summary Metrics

| Metric | P50 | P95 | P99 |
|--------|-----|-----|-----|
| TTFR | 54ms | 77ms | 77ms |
| TTSI | 54ms | 77ms | 77ms |
| Total | 75ms | 206ms | 206ms |

- **Avg Cache Hit Rate:** 56.0%
- **Avg Candidates Embedded:** 38

- **Avg CPU:** 24.3%
- **Peak RAM:** 55 MB

## Stage Breakdown (P95)

| Stage | Duration |
|-------|----------|
| Directory Walk | 72ms |
| Path Scoring | 1ms |
| Ripgrep Scan | 63ms |
| Candidate Selection | 13ms |
| Embedding | 57ms |
| Ranking | 56ms |

## Exit Criteria

- [x] TTFR P95 < 200ms (actual: 77ms)
- [x] Candidates Embedded <= 1500 (actual: 38)
