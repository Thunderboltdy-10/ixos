# PERF_BASELINE.md

**Generated:** 2026-01-28T19:29:24.362949+00:00

## Corpus Statistics

| Metric | Value |
|--------|-------|
| Total Files | 1036 |
| Total Size | 2.46 MB |
| Avg File Size | 2493 bytes |

## Summary Metrics

| Metric | P50 | P95 | P99 |
|--------|-----|-----|-----|
| TTFR | 99ms | 125ms | 125ms |
| TTSI | 99ms | 125ms | 125ms |
| Total | 135ms | 398ms | 398ms |

- **Avg Cache Hit Rate:** 31.8%
- **Avg Candidates Embedded:** 61

- **Avg CPU:** 103.3%
- **Peak RAM:** 141 MB

## Stage Breakdown (P95)

| Stage | Duration |
|-------|----------|
| Directory Walk | 67ms |
| Path Scoring | 1ms |
| Ripgrep Scan | 114ms |
| Candidate Selection | 9ms |
| Embedding | 86ms |
| Ranking | 169ms |

## Exit Criteria

- [x] TTFR P95 < 200ms (actual: 125ms)
- [x] Candidates Embedded <= 1500 (actual: 61)
