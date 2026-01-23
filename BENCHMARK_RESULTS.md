# Ixos Benchmarks (P1-P3)

Generated: 2026-01-23

## How to run

JIT (memory-only):

```powershell
cargo run --bin ixos-bench -- --dir dataset --runs 5 --cache-mode jit --model ixos-flash-v2 --out bench/results/PERF_JIT.md
```

ADS/xattr cache (persistent):

```powershell
cargo run --bin ixos-bench -- --dir dataset --runs 5 --cache-mode cache --model ixos-flash-v2 --out bench/results/PERF_CACHE.md
```

Verify ADS on Windows (should show `ixos_embed` streams):

```powershell
Get-ChildItem -Path dataset -Recurse -File |
  ForEach-Object { Get-Item -Path $_.FullName -Stream ixos_embed -ErrorAction SilentlyContinue } |
  Select-Object -First 3 FileName, Stream, Length
```

## Environment

- OS: Windows
- Model: Ixos-Flash-v2
- Dataset: `dataset/` (1036 files, 2.46 MB total)
- Runs: 5 per mode
- Cache-mode benchmark clears the in-memory cache between runs to measure ADS/xattr hits

## Results Summary (P95)

| Mode | TTFR | Total | Embedding | Cache Hit Rate | Candidates Embedded |
|------|------|-------|-----------|----------------|---------------------|
| JIT | 288ms | 4121ms | 839ms | 31.8% | 61 |
| ADS/xattr Cache | 280ms | 3247ms | 0ms | 80.0% | 0 |

## Notes

- ADS/xattr cache is active on Windows NTFS via the `:ixos_embed` alternate data stream.
- Cache mode shows lower total latency once embeddings are cached; embedding time drops to 0ms in the warm-cache runs.
- Candidate funnel is capped at 1500 candidates with hard read caps (64KB per file, 20k chars after extraction).
- Raw reports are saved at `bench/results/PERF_JIT.md`, `bench/results/PERF_CACHE.md`, and their JSON counterparts.
- Regenerate everything with `scripts/run_phase1_benchmarks.ps1`.

## Pipeline Changes Validated

- P1: Instrumentation via `ixos-bench` with stage breakdowns and corpus stats.
- P2: Hard caps + streaming ripgrep batches (50ms/20 results) enforced in candidate generator.
- P3: Backend streaming contract emits stage + stats + events to power Energy Traces UI.
