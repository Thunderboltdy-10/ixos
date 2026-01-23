# PERF_BASELINE.md

**Generated:** 2026-01-15T19:27:39.374907400+00:00

## Corpus Statistics

| Metric | Value |
|--------|-------|
| Total Files | 1000 |
| Total Size | 2.46 MB |
| Avg File Size | 2581 bytes |

## Summary Metrics

| Metric | P50 | P95 | P99 |
|--------|-----|-----|-----|
| TTFR | 174ms | 192ms | 192ms |
| TTSI | 174ms | 192ms | 192ms |
| Total | 184ms | 420ms | 420ms |

- **Avg Cache Hit Rate:** 80.0%
- **Avg Candidates Embedded:** 0

## Stage Breakdown (P95)

| Stage | Duration |
|-------|----------|
| Directory Walk | 80ms |
| Path Scoring | 0ms |
| Ripgrep Scan | 190ms |
| Candidate Selection | 14ms |
| Embedding | 0ms |
| Ranking | 228ms |

## Exit Criteria

- [x] TTFR P95 < 200ms (actual: 192ms)
- [x] Candidates Embedded <= 1500 (actual: 0)
