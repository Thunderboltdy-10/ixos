# Systems Perf Engineer Critique (Cycle 1)

## Top 3 Objections
1. Prototype improvement comes from larger candidate pull (`limit>=20`), not purely from smarter scoring.
2. No stage-level instrumentation was added to separate rerank overhead from retrieval overhead.
3. Ralph regression in iteration 18 shows noise/tail sensitivity; confidence interval on p95 is missing.

## Falsification Experiments
1. Run A/B with same candidate limit for baseline and witness guard (`8`, `20`, `40`) and compare both quality and latency.
2. Add timing around witness-feature extraction + rerank to prove controller overhead is sub-millisecond.
3. Repeat Ralph 5 times and report median + MAD for TTFR/Total p95.

## If You Change One Thing
- Enforce equal retrieval budget in comparison before claiming controller gain.
