# PERF_BASELINE.md

**Generated:** 2026-02-05T20:47:23.867991200+00:00

## Corpus Statistics

| Metric | Value |
|--------|-------|
| Total Files | 1036 |
| Total Size | 2.46 MB |
| Avg File Size | 2493 bytes |

## Summary Metrics

| Metric | P50 | P95 | P99 |
|--------|-----|-----|-----|
| TTFR | 110ms | 133ms | 133ms |
| TTSI | 110ms | 133ms | 133ms |
| Total | 202ms | 597ms | 597ms |

- **Avg Cache Hit Rate:** 31.8%
- **Avg Candidates Embedded:** 61

- **Avg CPU:** 87.3%
- **Peak RAM:** 200 MB

## Stage Breakdown (P95)

| Stage | Duration |
|-------|----------|
| Directory Walk | 98ms |
| Path Scoring | 1ms |
| Ripgrep Scan | 64ms |
| Candidate Selection | 13ms |
| Embedding | 153ms |
| Ranking | 267ms |

## Exit Criteria

- [x] TTFR P95 < 200ms (actual: 133ms)
- [x] Candidates Embedded <= 1500 (actual: 61)
