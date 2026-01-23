# PERF_BASELINE.md

**Generated:** 2026-01-16T23:46:01.190515+00:00

## Corpus Statistics

| Metric | Value |
|--------|-------|
| Total Files | 65509 |
| Total Size | 17660.85 MB |
| Avg File Size | 282690 bytes |

## Summary Metrics

| Metric | P50 | P95 | P99 |
|--------|-----|-----|-----|
| TTFR | 378ms | 601ms | 601ms |
| TTSI | 378ms | 601ms | 601ms |
| Total | 566ms | 727ms | 727ms |

- **Avg Cache Hit Rate:** 35.8%
- **Avg Candidates Embedded:** 158

## Stage Breakdown (P95)

| Stage | Duration |
|-------|----------|
| Directory Walk | 4077ms |
| Path Scoring | 17ms |
| Ripgrep Scan | 300ms |
| Candidate Selection | 284ms |
| Embedding | 117ms |
| Ranking | 71ms |

## Exit Criteria

- [ ] TTFR P95 < 200ms (actual: 601ms)
- [x] Candidates Embedded <= 1500 (actual: 158)
