# Ixos Benchmarks (P1-P3)

Generated: 2026-01-15

## How to run

JIT (memory-only):

```powershell
cargo run --bin ixos-bench -- --dir dataset --runs 5 --cache-mode jit --model potion --out PERF_JIT.md
```

ADS/xattr cache (persistent):

```powershell
cargo run --bin ixos-bench -- --dir dataset --runs 5 --cache-mode cache --model potion --out PERF_CACHE.md
```

Verify ADS on Windows (should show `ixos_embed` streams):

```powershell
Get-ChildItem -Path dataset -Recurse -File |
  ForEach-Object { Get-Item -Path $_.FullName -Stream ixos_embed -ErrorAction SilentlyContinue } |
  Select-Object -First 3 FileName, Stream, Length
```

## Environment

- OS: Windows
- Model: Potion (potion-base-8M-int8)
- Dataset: `dataset/` (1000 files, 2.46 MB total)
- Runs: 5 per mode
- Cache-mode benchmark clears the in-memory cache between runs to measure ADS/xattr hits

## Results Summary (P95)

| Mode | TTFR | Total | Embedding | Cache Hit Rate | Candidates Embedded |
|------|------|-------|-----------|----------------|---------------------|
| JIT | 190ms | 1918ms | 1406ms | 22.5% | 57 |
| ADS/xattr Cache | 192ms | 420ms | 0ms | 80.0% | 0 |

## Notes

- ADS/xattr cache is active on Windows NTFS via the `:ixos_embed` alternate data stream.
- Cache mode shows lower total latency once embeddings are cached; embedding time drops to 0ms in the warm-cache runs.
- Candidate funnel is capped at 1500 candidates with hard read caps (64KB per file, 20k chars after extraction).
- Raw reports are saved at `PERF_JIT.md`, `PERF_CACHE.md`, and their JSON counterparts.

## Pipeline Changes Validated

- P1: Instrumentation via `ixos-bench` with stage breakdowns and corpus stats.
- P2: Hard caps + streaming ripgrep batches (50ms/20 results) enforced in candidate generator.
- P3: Backend streaming contract emits stage + stats + events to power Energy Traces UI.
