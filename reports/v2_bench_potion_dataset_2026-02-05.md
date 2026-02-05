# PERF_BASELINE.md

**Generated:** 2026-02-05T20:47:13.281437600+00:00

## Corpus Statistics

| Metric | Value |
|--------|-------|
| Total Files | 1036 |
| Total Size | 2.46 MB |
| Avg File Size | 2493 bytes |

## Summary Metrics

| Metric | P50 | P95 | P99 |
|--------|-----|-----|-----|
| TTFR | 109ms | 130ms | 130ms |
| TTSI | 109ms | 130ms | 130ms |
| Total | 138ms | 277ms | 277ms |

- **Avg Cache Hit Rate:** 31.8%
- **Avg Candidates Embedded:** 61

- **Avg CPU:** 86.7%
- **Peak RAM:** 56 MB

## Stage Breakdown (P95)

| Stage | Duration |
|-------|----------|
| Directory Walk | 88ms |
| Path Scoring | 1ms |
| Ripgrep Scan | 54ms |
| Candidate Selection | 13ms |
| Embedding | 59ms |
| Ranking | 67ms |

## Exit Criteria

- [x] TTFR P95 < 200ms (actual: 130ms)
- [x] Candidates Embedded <= 1500 (actual: 61)
