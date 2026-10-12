# Ixos Search Upper-Bound Analysis

Date: 2026-02-23  
Source of truth: `reports/PERF_BOTTLENECKS.md` (dated 2026-02-03), `docs/engineering/BENCHMARKING.md`, `docs/flow-map.md`, `docs/PROJECT_GUIDE.md`.

## Baseline latency numbers used

- Flash v2 TTFR p50/p95: **46 / 68 ms**
- Flash v2 Total p50/p95: **132 / 315 ms**
- Flash v2 stage p50/p95 (ms):
  - Directory walk: 68.0 / 68.0
  - Path scoring: 0.0 / 0.75
  - Ripgrep scan: 43.5 / 54.5
  - Candidate selection: 1.5 / 7.5
  - Embedding: 12.5 / 81.25
  - Ranking: 0.5 / 70.0

Computation target in this doc is **Total p95 = 315 ms** and **TTFR p95 = 68 ms**.

## Stage dominance at p95 (Flash v2)

### Total p95 share and single-stage Amdahl bounds

Formula per stage `X`:  
`new_total = 315 - r*X`, where `r in {0.5, 0.9, 1.0}`.

| Stage | Stage p95 (ms) | Share of Total p95 | Best-case Total p95 if stage cut 50% | cut 90% | cut 100% |
|---|---:|---:|---:|---:|---:|
| Embedding | 81.25 | 25.79% | 274.38 ms (12.90% better, 1.148x) | 241.88 ms (23.21%, 1.302x) | 233.75 ms (25.79%, 1.348x) |
| Ranking | 70.00 | 22.22% | 280.00 ms (11.11%, 1.125x) | 252.00 ms (20.00%, 1.250x) | 245.00 ms (22.22%, 1.286x) |
| Directory walk | 68.00 | 21.59% | 281.00 ms (10.79%, 1.121x) | 253.80 ms (19.43%, 1.241x) | 247.00 ms (21.59%, 1.275x) |
| Ripgrep scan | 54.50 | 17.30% | 287.75 ms (8.65%, 1.095x) | 265.95 ms (15.57%, 1.184x) | 260.50 ms (17.30%, 1.209x) |
| Candidate selection | 7.50 | 2.38% | 311.25 ms (1.19%, 1.012x) | 308.25 ms (2.14%, 1.022x) | 307.50 ms (2.38%, 1.024x) |
| Path scoring | 0.75 | 0.24% | 314.62 ms (0.12%, 1.001x) | 314.32 ms (0.21%, 1.002x) | 314.25 ms (0.24%, 1.002x) |

Unattributed/overlap overhead at p95: `315 - (68 + 0.75 + 54.5 + 7.5 + 81.25 + 70) = 33.0 ms` (~10.48%).

Interpretation: **No single measured stage can produce a >=30% Total p95 win alone**. The largest single-stage ceiling is embedding (25.79%).

### TTFR p95 dominance

Observed TTFR p95 is 68 ms, and measured directory walk p95 is also 68 ms. Using this profile, TTFR p95 is walk-dominated.

| TTFR intervention assumption | TTFR p95 result | TTFR speedup |
|---|---:|---:|
| Cut walk by 50% | 34.0 ms | 2.0x |
| Cut walk by 90% | 6.8 ms | 10.0x |
| Cut walk by 100% (theoretical bound) | ~0 ms (+residual overhead) | unbounded theoretical |

Practical implication: TTFR 2x requires roughly a **50%+ reduction in walk-on-critical-path work**, usually by skipping/deferring walk entirely for many queries (not micro-optimizing parser/ranker only).

## What it takes to beat 30% and 2x

For Total p95, targets are:

- 30% better => save at least **94.5 ms** from 315 ms.
- 2x speedup => save at least **157.5 ms** from 315 ms.

From stage math:

- `embed + rank` full elimination saves 151.25 ms (48.02%) => still short of 2x.
- `walk + scan` full elimination saves 122.5 ms (38.89%) => not enough for 2x.
- `walk + scan + embed + rank` needs about **34.5% reduction** across that combined budget to hit 30%, and about **57.5% reduction** to hit 2x.

Therefore, beating 30% (and especially 2x) requires a **systems intervention that removes work across multiple heavy stages simultaneously**. In practice that means: avoid walking and broad scanning on many queries, reduce embedding/rerank invocation frequency through stronger candidate routing and early-exit confidence, and keep privacy-mode degradation deterministic.
