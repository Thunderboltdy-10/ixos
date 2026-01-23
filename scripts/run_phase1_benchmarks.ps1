$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
Push-Location $repoRoot

try {
    if (!(Test-Path "bench/results")) {
        New-Item -ItemType Directory -Path "bench/results" | Out-Null
    }

    Write-Host "Running JIT benchmark..."
    cargo run --bin ixos-bench -- --dir dataset --runs 5 --cache-mode jit --model ixos-flash-v2 --out bench/results/PERF_JIT.md

    Write-Host "Running cache benchmark..."
    cargo run --bin ixos-bench -- --dir dataset --runs 5 --cache-mode cache --model ixos-flash-v2 --out bench/results/PERF_CACHE.md

    Write-Host "Running perf suite (small/medium/huge)..."
    cargo run --bin ixos-perf-suite -- --config bench/perf_suite.toml

    Write-Host "Checking perf budgets..."
    python scripts/check_perf_budget.py --report bench/results/PERF_REGRESSION.json --budget bench/perf_budget.json

    Write-Host "Updating verified benchmarks..."
    python scripts/update_verified_benchmarks.py `
        --jit bench/results/PERF_JIT.json `
        --cache bench/results/PERF_CACHE.json `
        --out-json landing/lib/verified-benchmarks.json `
        --out-report IXOS_MODEL_LAB_REPORT.md `
        --model "Ixos-Flash-v2"

    Write-Host "Done."
}
finally {
    Pop-Location
}
