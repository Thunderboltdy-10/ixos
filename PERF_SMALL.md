# PERF_BASELINE.md

**Generated:** 2026-01-16T23:45:41.740329100+00:00

## Corpus Statistics

| Metric | Value |
|--------|-------|
| Total Files | 100 |
| Total Size | 0.19 MB |
| Avg File Size | 1975 bytes |

## Summary Metrics

| Metric | P50 | P95 | P99 |
|--------|-----|-----|-----|
| TTFR | 7ms | 13ms | 13ms |
| TTSI | 7ms | 13ms | 13ms |
| Total | 10ms | 78ms | 78ms |

- **Avg Cache Hit Rate:** 21.1%
- **Avg Candidates Embedded:** 9

## Stage Breakdown (P95)

| Stage | Duration |
|-------|----------|
| Directory Walk | 5ms |
| Path Scoring | 0ms |
| Ripgrep Scan | 13ms |
| Candidate Selection | 0ms |
| Embedding | 23ms |
| Ranking | 42ms |

## Exit Criteria

- [x] TTFR P95 < 200ms (actual: 13ms)
- [x] Candidates Embedded <= 1500 (actual: 9)
