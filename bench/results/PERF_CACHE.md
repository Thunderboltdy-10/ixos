# PERF_BASELINE.md

**Generated:** 2026-01-23T14:01:48.993425700+00:00

## Corpus Statistics

| Metric | Value |
|--------|-------|
| Total Files | 1036 |
| Total Size | 2.46 MB |
| Avg File Size | 2493 bytes |

## Summary Metrics

| Metric | P50 | P95 | P99 |
|--------|-----|-----|-----|
| TTFR | 199ms | 280ms | 280ms |
| TTSI | 199ms | 280ms | 280ms |
| Total | 259ms | 3247ms | 3247ms |

- **Avg Cache Hit Rate:** 80.0%
- **Avg Candidates Embedded:** 0

- **Avg CPU:** 99.3%
- **Peak RAM:** 194 MB

## Stage Breakdown (P95)

| Stage | Duration |
|-------|----------|
| Directory Walk | 84ms |
| Path Scoring | 7ms |
| Ripgrep Scan | 248ms |
| Candidate Selection | 23ms |
| Embedding | 0ms |
| Ranking | 2935ms |

## Exit Criteria

- [ ] TTFR P95 < 200ms (actual: 280ms)
- [x] Candidates Embedded <= 1500 (actual: 0)
