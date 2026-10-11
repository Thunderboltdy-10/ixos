# BENCHMARKING AND PROFILING RUNBOOK

## PRINCIPLES

- No stubs: use real model artifacts.
- Measure first: baseline before optimization.
- Every claim requires reproducible commands and artifacts.

## REQUIRED COMMAND SET

Build:

```bash
cargo build --release
```

Quality evaluation:

```bash
python scripts/ixos_eval.py --suite both --output models/lab/results_<stamp>.json ...
```

Performance benchmark:

```bash
./target/release/ixos-bench --dir dataset --runs 10 --cache-mode native-cache --model <model_id>
```

Profiling:

```bash
./target/release/ixos-profile --dir dataset --model <model_id> --cache-mode native-cache
```

## ARTIFACT LOCATIONS

- Baseline results: `reports/baseline_*`
- V2 results: `reports/v2_*`
- Final summary: `reports/V2_FINAL_WRITEUP.md`
- Model-lab canonical source: `models/lab/CANONICAL_RESULTS.md`

## REPORTING TEMPLATE

Each run should capture:

- date/time
- model id and mode
- dataset path and run count
- latency and quality metrics
- before/after delta table

## RECOMMENDED FINAL CHECKS

- Validate both Flash v2 and Pro v2 against legacy baselines.
- Confirm Ask mode respects selected model.
- Confirm TTFR and warm-cache behavior.
