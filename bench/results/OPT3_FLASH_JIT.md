# PERF_BASELINE.md

**Generated:** 2026-01-28T19:41:10.388448400+00:00

## Corpus Statistics

| Metric | Value |
|--------|-------|
| Total Files | 1036 |
| Total Size | 2.46 MB |
| Avg File Size | 2493 bytes |

## Summary Metrics

| Metric | P50 | P95 | P99 |
|--------|-----|-----|-----|
| TTFR | 50ms | 63ms | 63ms |
| TTSI | 50ms | 64ms | 64ms |
| Total | 70ms | 336ms | 336ms |

- **Avg Cache Hit Rate:** 56.0%
- **Avg Candidates Embedded:** 38

- **Avg CPU:** 25.1%
- **Peak RAM:** 141 MB

## Stage Breakdown (P95)

| Stage | Duration |
|-------|----------|
| Directory Walk | 76ms |
| Path Scoring | 1ms |
| Ripgrep Scan | 53ms |
| Candidate Selection | 8ms |
| Embedding | 94ms |
| Ranking | 163ms |

## Exit Criteria

- [x] TTFR P95 < 200ms (actual: 63ms)
- [x] Candidates Embedded <= 1500 (actual: 38)
