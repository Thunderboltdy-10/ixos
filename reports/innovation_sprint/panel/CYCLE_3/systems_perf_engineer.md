# Systems Perf Engineer — Cycle 3

## Top 3 Objections
1. Guard logic can inflate candidate processing in low-limit paths and hurt p95 tails.
2. Benchmark variance can mask regressions; single run deltas are not enough.
3. Ranking-time file reads for witness fallback may add hidden I/O spikes.

## Falsification Experiments
- Profile guard ON/OFF stage timings on identical query seeds; require rank/embed p95 non-regression.
- Force cold-cache sweeps with mixed query lengths to expose tail sensitivity.
- Measure per-query additional file-read count introduced by witness fallback.

## If You Only Change One Thing, Change THIS
- Add a trust-risk controller so guard code path is skipped for low-risk queries.
