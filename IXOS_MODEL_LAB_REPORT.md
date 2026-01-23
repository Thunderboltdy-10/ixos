# IXOS_MODEL_LAB_REPORT.md

Generated: 2026-01-23

## Test Corpus

- Files: 1036
- Total Size: 2.46 MB
- Avg File Size: 2493 bytes

## Latency (P95)

- TTFR P95: 288ms
- Total (JIT) P95: 4121ms
- Total (Cache) P95: 3247ms

## Cache vs JIT

- JIT Hit Rate: 31.8%
- Cache Hit Rate: 80.0%
- JIT Candidates Embedded: 61
- Cache Candidates Embedded: 0

## Stage Breakdown (JIT P95)

- Directory Walk: 83ms
- Path Scoring: 8ms
- Ripgrep Scan: 257ms
- Candidate Selection: 22ms
- Embedding: 839ms
- Ranking: 2934ms
