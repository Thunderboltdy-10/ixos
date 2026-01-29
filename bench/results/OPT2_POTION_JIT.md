# PERF_BASELINE.md

**Generated:** 2026-01-28T19:34:59.594579100+00:00

## Corpus Statistics

| Metric | Value |
|--------|-------|
| Total Files | 1036 |
| Total Size | 2.46 MB |
| Avg File Size | 2493 bytes |

## Summary Metrics

| Metric | P50 | P95 | P99 |
|--------|-----|-----|-----|
| TTFR | 101ms | 120ms | 120ms |
| TTSI | 101ms | 120ms | 120ms |
| Total | 137ms | 269ms | 269ms |

- **Avg Cache Hit Rate:** 31.8%
- **Avg Candidates Embedded:** 61

- **Avg CPU:** 64.5%
- **Peak RAM:** 55 MB

## Stage Breakdown (P95)

| Stage | Duration |
|-------|----------|
| Directory Walk | 70ms |
| Path Scoring | 1ms |
| Ripgrep Scan | 110ms |
| Candidate Selection | 8ms |
| Embedding | 50ms |
| Ranking | 52ms |

## Exit Criteria

- [x] TTFR P95 < 200ms (actual: 120ms)
- [x] Candidates Embedded <= 1500 (actual: 61)
