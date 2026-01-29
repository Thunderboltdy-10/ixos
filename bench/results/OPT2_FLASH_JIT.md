# PERF_BASELINE.md

**Generated:** 2026-01-28T19:35:14.065904200+00:00

## Corpus Statistics

| Metric | Value |
|--------|-------|
| Total Files | 1036 |
| Total Size | 2.46 MB |
| Avg File Size | 2493 bytes |

## Summary Metrics

| Metric | P50 | P95 | P99 |
|--------|-----|-----|-----|
| TTFR | 105ms | 122ms | 122ms |
| TTSI | 105ms | 122ms | 122ms |
| Total | 136ms | 400ms | 400ms |

- **Avg Cache Hit Rate:** 31.8%
- **Avg Candidates Embedded:** 61

- **Avg CPU:** 81.5%
- **Peak RAM:** 140 MB

## Stage Breakdown (P95)

| Stage | Duration |
|-------|----------|
| Directory Walk | 68ms |
| Path Scoring | 1ms |
| Ripgrep Scan | 110ms |
| Candidate Selection | 10ms |
| Embedding | 100ms |
| Ranking | 151ms |

## Exit Criteria

- [x] TTFR P95 < 200ms (actual: 122ms)
- [x] Candidates Embedded <= 1500 (actual: 61)
