# PERF_BASELINE.md

**Generated:** 2026-01-27T20:51:26.767649900+00:00

## Corpus Statistics

| Metric | Value |
|--------|-------|
| Total Files | 1036 |
| Total Size | 2.46 MB |
| Avg File Size | 2493 bytes |

## Summary Metrics

| Metric | P50 | P95 | P99 |
|--------|-----|-----|-----|
| TTFR | 105ms | 127ms | 127ms |
| TTSI | 105ms | 127ms | 127ms |
| Total | 139ms | 402ms | 402ms |

- **Avg Cache Hit Rate:** 81.1%
- **Avg Candidates Embedded:** 6

- **Avg CPU:** 70.5%
- **Peak RAM:** 142 MB

## Stage Breakdown (P95)

| Stage | Duration |
|-------|----------|
| Directory Walk | 74ms |
| Path Scoring | 0ms |
| Ripgrep Scan | 118ms |
| Candidate Selection | 13ms |
| Embedding | 27ms |
| Ranking | 234ms |

## Exit Criteria

- [x] TTFR P95 < 200ms (actual: 127ms)
- [x] Candidates Embedded <= 1500 (actual: 6)
