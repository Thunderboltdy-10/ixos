# Systems Perf Engineer Critique (Cycle 2)

## Top 3 Objections
1. Ralph deltas are still noisy; single-run comparisons are weak for p95 claims.
2. Guard adds per-candidate logic without explicit micro-timing attribution.
3. Build time jumped in iteration 19 due code changes; not a runtime issue but needs separation in logs.

## Falsification Experiments
1. Run 5 Ralph iterations with flag on/off and report median + MAD on TTFR/Total p95.
2. Add instrumentation for guard activation count and per-query guard compute time.
3. Benchmark large candidate scenarios (`max_results` high) to detect nonlinear overhead.

## If You Change One Thing
- Add guard-specific timing counters in stream stats before shipping any default-on decision.
