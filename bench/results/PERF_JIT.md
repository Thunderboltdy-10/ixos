# PERF_BASELINE.md

**Generated:** 2026-01-23T14:01:43.985514200+00:00

## Corpus Statistics

| Metric | Value |
|--------|-------|
| Total Files | 1036 |
| Total Size | 2.46 MB |
| Avg File Size | 2493 bytes |

## Summary Metrics

| Metric | P50 | P95 | P99 |
|--------|-----|-----|-----|
| TTFR | 198ms | 288ms | 288ms |
| TTSI | 198ms | 288ms | 288ms |
| Total | 452ms | 4121ms | 4121ms |

- **Avg Cache Hit Rate:** 31.8%
- **Avg Candidates Embedded:** 61

- **Avg CPU:** 140.5%
- **Peak RAM:** 194 MB

## Stage Breakdown (P95)

| Stage | Duration |
|-------|----------|
| Directory Walk | 83ms |
| Path Scoring | 8ms |
| Ripgrep Scan | 257ms |
| Candidate Selection | 22ms |
| Embedding | 839ms |
| Ranking | 2934ms |

## Exit Criteria

- [ ] TTFR P95 < 200ms (actual: 288ms)
- [x] Candidates Embedded <= 1500 (actual: 61)
