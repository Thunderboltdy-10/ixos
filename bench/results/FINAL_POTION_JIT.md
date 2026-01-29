# PERF_BASELINE.md

**Generated:** 2026-01-28T19:36:48.451117600+00:00

## Corpus Statistics

| Metric | Value |
|--------|-------|
| Total Files | 1036 |
| Total Size | 2.46 MB |
| Avg File Size | 2493 bytes |

## Summary Metrics

| Metric | P50 | P95 | P99 |
|--------|-----|-----|-----|
| TTFR | 107ms | 114ms | 114ms |
| TTSI | 107ms | 114ms | 114ms |
| Total | 138ms | 267ms | 267ms |

- **Avg Cache Hit Rate:** 56.0%
- **Avg Candidates Embedded:** 38

- **Avg CPU:** 83.6%
- **Peak RAM:** 56 MB

## Stage Breakdown (P95)

| Stage | Duration |
|-------|----------|
| Directory Walk | 69ms |
| Path Scoring | 1ms |
| Ripgrep Scan | 111ms |
| Candidate Selection | 10ms |
| Embedding | 58ms |
| Ranking | 54ms |

## Exit Criteria

- [x] TTFR P95 < 200ms (actual: 114ms)
- [x] Candidates Embedded <= 1500 (actual: 38)
