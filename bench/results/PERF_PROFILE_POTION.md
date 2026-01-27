# PERF_BASELINE.md

**Generated:** 2026-01-27T20:52:16.356348400+00:00

## Corpus Statistics

| Metric | Value |
|--------|-------|
| Total Files | 1036 |
| Total Size | 2.46 MB |
| Avg File Size | 2493 bytes |

## Summary Metrics

| Metric | P50 | P95 | P99 |
|--------|-----|-----|-----|
| TTFR | 115ms | 140ms | 140ms |
| TTSI | 115ms | 140ms | 140ms |
| Total | 138ms | 272ms | 272ms |

- **Avg Cache Hit Rate:** 56.0%
- **Avg Candidates Embedded:** 38

- **Avg CPU:** 71.3%
- **Peak RAM:** 54 MB

## Stage Breakdown (P95)

| Stage | Duration |
|-------|----------|
| Directory Walk | 86ms |
| Path Scoring | 1ms |
| Ripgrep Scan | 127ms |
| Candidate Selection | 13ms |
| Embedding | 55ms |
| Ranking | 71ms |

## Exit Criteria

- [x] TTFR P95 < 200ms (actual: 140ms)
- [x] Candidates Embedded <= 1500 (actual: 38)
