# Ixos Phase 1 Bench Harness

This folder holds the Phase 1 benchmark harness (fixtures, budgets, and results).

## Run perf suite (small/medium/huge)

```powershell
cargo run --bin ixos-perf-suite -- --config bench/perf_suite.toml
```

Output: `bench/results/PERF_REGRESSION.json`

## Check perf budgets

```powershell
python scripts/check_perf_budget.py --report bench/results/PERF_REGRESSION.json --budget bench/perf_budget.json
```

## Run end-to-end benchmark on real corpus

```powershell
cargo run --bin ixos-bench -- --dir dataset --runs 5 --cache-mode ephemeral --model ixos-flash-v2 --out bench/results/PERF_JIT.md
cargo run --bin ixos-bench -- --dir dataset --runs 5 --cache-mode native-cache --model ixos-flash-v2 --out bench/results/PERF_CACHE.md
```

## Slow query profiler (opt-in, real corpus)

```powershell
cargo run --bin ixos-profile -- --dir dataset --runs 6 --cache-mode ephemeral --model ixos-flash-v2 --slow-threshold-ms 1500 --slow-out bench/results/slow_queries.json
```

## Notes

- All benchmarks use **real models** (no stub models). If a model is missing, commands fail.
- Synthetic corpora are generated under `target/perf_corpus/`.
- Update `bench/perf_budget.json` after you establish baselines on your primary machine.
