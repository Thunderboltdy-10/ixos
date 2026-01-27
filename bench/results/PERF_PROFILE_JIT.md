# PERF_BASELINE.md

**Generated:** 2026-01-27T20:51:13.625327300+00:00

## Corpus Statistics

| Metric | Value |
|--------|-------|
| Total Files | 1036 |
| Total Size | 2.46 MB |
| Avg File Size | 2493 bytes |

## Summary Metrics

| Metric | P50 | P95 | P99 |
|--------|-----|-----|-----|
| TTFR | 111ms | 168ms | 168ms |
| TTSI | 111ms | 168ms | 168ms |
| Total | 141ms | 536ms | 536ms |

- **Avg Cache Hit Rate:** 56.0%
- **Avg Candidates Embedded:** 38

- **Avg CPU:** 88.1%
- **Peak RAM:** 185 MB

## Stage Breakdown (P95)

| Stage | Duration |
|-------|----------|
| Directory Walk | 80ms |
| Path Scoring | 1ms |
| Ripgrep Scan | 153ms |
| Candidate Selection | 13ms |
| Embedding | 109ms |
| Ranking | 208ms |

## Exit Criteria

- [x] TTFR P95 < 200ms (actual: 168ms)
- [x] Candidates Embedded <= 1500 (actual: 38)
