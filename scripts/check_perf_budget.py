#!/usr/bin/env python3
import argparse
import json
import sys
from pathlib import Path


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def compute_summary(run_baseline: dict):
    summary = run_baseline.get("summary", {})
    runs = run_baseline.get("runs", [])

    ttfr_p95 = summary.get("ttfr", {}).get("p95_ms", 0)
    total_p95 = summary.get("total", {}).get("p95_ms", 0)

    avg_cpu = summary.get("avg_cpu_percent", None)
    peak_ram = summary.get("peak_ram_mb", None)

    if avg_cpu is None:
        cpu_vals = [r.get("resources", {}).get("cpu_percent", 0.0) for r in runs]
        avg_cpu = sum(cpu_vals) / len(cpu_vals) if cpu_vals else 0.0

    if peak_ram is None:
        ram_vals = [r.get("resources", {}).get("peak_ram_mb", 0) for r in runs]
        peak_ram = max(ram_vals) if ram_vals else 0

    return {
        "ttfr_p95_ms": ttfr_p95,
        "total_p95_ms": total_p95,
        "avg_cpu_percent": avg_cpu,
        "peak_ram_mb": peak_ram,
    }


def main():
    parser = argparse.ArgumentParser(description="Check perf suite results against budgets.")
    parser.add_argument("--report", required=True, help="Perf regression JSON report")
    parser.add_argument("--budget", required=True, help="Budget JSON file")
    args = parser.parse_args()

    report_path = Path(args.report)
    budget_path = Path(args.budget)

    report = load_json(report_path)
    budget = load_json(budget_path)

    default_budget = budget.get("default", {})
    by_size = budget.get("by_size", {})

    failures = []
    for run in report.get("runs", []):
        size = str(run.get("size", "unknown"))
        baseline = run.get("baseline", {})
        metrics = compute_summary(baseline)
        limits = by_size.get(size, default_budget)

        for key, limit in limits.items():
            value = metrics.get(key)
            if value is None:
                continue
            if value > limit:
                failures.append(
                    f"size={size} metric={key} value={value} limit={limit}"
                )

    if failures:
        print("PERF BUDGET FAILURES:")
        for failure in failures:
            print(f"  - {failure}")
        sys.exit(1)

    print("Perf budgets OK.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
