# PERF_BASELINE.md

**Generated:** 2026-01-28T19:32:37.714429100+00:00

## Corpus Statistics

| Metric | Value |
|--------|-------|
| Total Files | 1036 |
| Total Size | 2.46 MB |
| Avg File Size | 2493 bytes |

## Summary Metrics

| Metric | P50 | P95 | P99 |
|--------|-----|-----|-----|
| TTFR | 105ms | 144ms | 144ms |
| TTSI | 105ms | 145ms | 145ms |
| Total | 137ms | 276ms | 276ms |

- **Avg Cache Hit Rate:** 31.8%
- **Avg Candidates Embedded:** 61

- **Avg CPU:** 73.5%
- **Peak RAM:** 54 MB

## Stage Breakdown (P95)

| Stage | Duration |
|-------|----------|
| Directory Walk | 86ms |
| Path Scoring | 1ms |
| Ripgrep Scan | 129ms |
| Candidate Selection | 13ms |
| Embedding | 58ms |
| Ranking | 70ms |

## Exit Criteria

- [x] TTFR P95 < 200ms (actual: 144ms)
- [x] Candidates Embedded <= 1500 (actual: 61)
