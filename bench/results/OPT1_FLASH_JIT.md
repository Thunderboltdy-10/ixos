# PERF_BASELINE.md

**Generated:** 2026-01-28T19:32:51.690865600+00:00

## Corpus Statistics

| Metric | Value |
|--------|-------|
| Total Files | 1036 |
| Total Size | 2.46 MB |
| Avg File Size | 2493 bytes |

## Summary Metrics

| Metric | P50 | P95 | P99 |
|--------|-----|-----|-----|
| TTFR | 109ms | 116ms | 116ms |
| TTSI | 109ms | 117ms | 117ms |
| Total | 137ms | 395ms | 395ms |

- **Avg Cache Hit Rate:** 31.8%
- **Avg Candidates Embedded:** 61

- **Avg CPU:** 97.3%
- **Peak RAM:** 145 MB

## Stage Breakdown (P95)

| Stage | Duration |
|-------|----------|
| Directory Walk | 62ms |
| Path Scoring | 0ms |
| Ripgrep Scan | 108ms |
| Candidate Selection | 8ms |
| Embedding | 89ms |
| Ranking | 177ms |

## Exit Criteria

- [x] TTFR P95 < 200ms (actual: 116ms)
- [x] Candidates Embedded <= 1500 (actual: 61)
