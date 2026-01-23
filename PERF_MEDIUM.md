# PERF_BASELINE.md

**Generated:** 2026-01-16T23:45:43.605390800+00:00

## Corpus Statistics

| Metric | Value |
|--------|-------|
| Total Files | 1000 |
| Total Size | 2.46 MB |
| Avg File Size | 2581 bytes |

## Summary Metrics

| Metric | P50 | P95 | P99 |
|--------|-----|-----|-----|
| TTFR | 76ms | 92ms | 92ms |
| TTSI | 76ms | 92ms | 92ms |
| Total | 98ms | 242ms | 242ms |

- **Avg Cache Hit Rate:** 22.5%
- **Avg Candidates Embedded:** 57

## Stage Breakdown (P95)

| Stage | Duration |
|-------|----------|
| Directory Walk | 59ms |
| Path Scoring | 0ms |
| Ripgrep Scan | 86ms |
| Candidate Selection | 6ms |
| Embedding | 101ms |
| Ranking | 49ms |

## Exit Criteria

- [x] TTFR P95 < 200ms (actual: 92ms)
- [x] Candidates Embedded <= 1500 (actual: 57)
