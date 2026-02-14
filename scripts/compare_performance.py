#!/usr/bin/env python3
"""Compare Ixos benchmark/quality artifacts and emit a before-vs-after report."""

from __future__ import annotations

import argparse
import datetime as dt
import json
from pathlib import Path
from statistics import mean


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def pick_bench_paths(ralph_dir: Path, before: str | None, after: str | None) -> tuple[Path, Path]:
    if before and after:
        return Path(before), Path(after)

    benches = sorted(ralph_dir.glob("big_bench_*.json"))
    if len(benches) < 2:
        raise SystemExit("Need at least two bench reports to compare. Provide --before-bench and --after-bench.")

    before_path = Path(before) if before else benches[0]
    after_path = Path(after) if after else benches[-1]
    return before_path, after_path


def pct_delta(before: float, after: float) -> float:
    if before == 0:
        return 0.0
    return ((after - before) / before) * 100.0


def fmt_ms(value: float | None) -> str:
    if value is None:
        return "n/a"
    return f"{value:.2f}"


def bench_row(label: str, before: float | None, after: float | None, lower_is_better: bool = True) -> str:
    if before is None or after is None:
        return f"| {label} | {fmt_ms(before)} | {fmt_ms(after)} | n/a | n/a |"

    delta = after - before
    pct = pct_delta(before, after)
    improved = delta < 0 if lower_is_better else delta > 0
    status = "IMPROVED" if improved else "REGRESSED" if abs(delta) > 1e-9 else "UNCHANGED"
    return f"| {label} | {before:.2f} | {after:.2f} | {delta:+.2f} | {pct:+.2f}% ({status}) |"


def build_query_delta(before_per_query: list[dict], after_per_query: list[dict], key: str) -> list[tuple[str, float]]:
    before_map = {row["query"]: float(row.get(key, 0.0)) for row in before_per_query}
    after_map = {row["query"]: float(row.get(key, 0.0)) for row in after_per_query}
    shared = sorted(set(before_map) & set(after_map))
    deltas: list[tuple[str, float]] = []
    for query in shared:
        deltas.append((query, after_map[query] - before_map[query]))
    deltas.sort(key=lambda x: x[1], reverse=True)
    return deltas


def percentile(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    sorted_values = sorted(values)
    idx = round((len(sorted_values) - 1) * p)
    return float(sorted_values[idx])


def extract_summary_metric(payload: dict, metric: str) -> float | None:
    summary = payload.get("summary", {})
    if metric in summary and summary[metric] is not None:
        return float(summary[metric])

    records = payload.get("records", [])
    if not isinstance(records, list) or not records:
        return None

    stage_metric_map = {
        "walk_p95_ms": ("stage_breakdown", "walk_ms"),
        "path_score_p95_ms": ("stage_breakdown", "path_score_ms"),
        "ripgrep_p95_ms": ("stage_breakdown", "ripgrep_ms"),
        "embed_p95_ms": ("stage_breakdown", "embed_ms"),
        "rank_p95_ms": ("stage_breakdown", "rank_ms"),
    }
    if metric not in stage_metric_map:
        return None

    parent_key, child_key = stage_metric_map[metric]
    values: list[float] = []
    for row in records:
        stage = row.get(parent_key, {})
        value = stage.get(child_key) if isinstance(stage, dict) else None
        if value is not None:
            values.append(float(value))
    if not values:
        return None
    return percentile(values, 0.95)


def extract_quality_summary(path: Path) -> dict[str, dict[str, float]]:
    payload = load_json(path)
    result: dict[str, dict[str, float]] = {}
    models = payload.get("models")
    if not isinstance(models, list):
        runs = payload.get("runs", [])
        if isinstance(runs, list) and runs:
            models = runs[0].get("models", [])
        else:
            models = []

    for model in models:
        model_id = str(model.get("id", "unknown"))
        suites = model.get("results", [])
        if not suites:
            continue

        mrr = [float(item.get("mrr_at_10", 0.0)) for item in suites]
        recall = [float(item.get("recall_at_10", 0.0)) for item in suites]
        latency = [float(item.get("latency_ms_per_1k", 0.0)) for item in suites]

        result[model_id] = {
            "mrr_at_10_mean": mean(mrr),
            "recall_at_10_mean": mean(recall),
            "latency_ms_per_1k_mean": mean(latency),
        }
    return result


def tier_harsh_targets(tier: str) -> dict[str, float]:
    tier = tier.lower()
    if tier == "a":
        return {"ttfr_p50_ms": 35.0, "total_p95_ms": 250.0}
    if tier == "b":
        return {"ttfr_p50_ms": 70.0, "total_p95_ms": 1200.0}
    return {
        "cold_ttfr_p50_ms": 120.0,
        "cold_total_p95_ms": 6000.0,
        "warm_total_p95_ms": 2500.0,
        "ripgrep_p95_ms": 80.0,
        "embed_p95_ms": 40.0,
        "rank_p95_ms": 80.0,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Compare benchmark and quality outputs")
    parser.add_argument("--before-bench", type=str, default=None)
    parser.add_argument("--after-bench", type=str, default=None)
    parser.add_argument("--before-quality", type=str, default=None)
    parser.add_argument("--after-quality", type=str, default=None)
    parser.add_argument("--output", type=str, default=None)
    parser.add_argument("--json-output", type=str, default=None)
    args = parser.parse_args()

    root = Path(__file__).resolve().parent.parent
    ralph_dir = root / "reports" / "ralph"
    before_path, after_path = pick_bench_paths(ralph_dir, args.before_bench, args.after_bench)

    before = load_json(before_path)
    after = load_json(after_path)
    bsum = before.get("summary", {})
    asum = after.get("summary", {})

    quality_before = extract_quality_summary(Path(args.before_quality)) if args.before_quality else {}
    quality_after = extract_quality_summary(Path(args.after_quality)) if args.after_quality else {}

    all_total_deltas = build_query_delta(before.get("per_query", []), after.get("per_query", []), "total_p95_ms")
    worst_total = [row for row in all_total_deltas if row[1] > 0][:5]
    best_total = [row for row in sorted(all_total_deltas, key=lambda x: x[1]) if row[1] < 0][:5]

    tier = str(after.get("corpus_tier", "")).lower()
    harsh = tier_harsh_targets(tier)
    harsh_eval_rows: list[str] = []

    for metric, target in harsh.items():
        after_value = asum.get(metric)
        if after_value is None:
            harsh_eval_rows.append(f"| {metric} | {target:.2f} | n/a | FAIL (missing) |")
            continue
        ok = float(after_value) <= float(target)
        harsh_eval_rows.append(
            f"| {metric} | {target:.2f} | {float(after_value):.2f} | {'PASS' if ok else 'FAIL'} |"
        )

    now = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%d_%H%M%S")
    output = Path(args.output) if args.output else (ralph_dir / f"comparison_{now}.md")
    json_output = Path(args.json_output) if args.json_output else (ralph_dir / f"comparison_{now}.json")

    lines: list[str] = []
    lines.append("# Ralph Performance Comparison")
    lines.append(f"- Generated: `{dt.datetime.now(dt.timezone.utc).isoformat()}`")
    lines.append(f"- Before bench: `{before_path}`")
    lines.append(f"- After bench: `{after_path}`")
    lines.append("")

    lines.append("## Core Latency Delta")
    lines.append("| Metric | Before | After | Delta | Change |")
    lines.append("| --- | ---: | ---: | ---: | --- |")
    lines.append(bench_row("TTFR p50 (ms)", bsum.get("ttfr_p50_ms"), asum.get("ttfr_p50_ms")))
    lines.append(bench_row("TTFR p95 (ms)", bsum.get("ttfr_p95_ms"), asum.get("ttfr_p95_ms")))
    lines.append(bench_row("Total p50 (ms)", bsum.get("total_p50_ms"), asum.get("total_p50_ms")))
    lines.append(bench_row("Total p95 (ms)", bsum.get("total_p95_ms"), asum.get("total_p95_ms")))
    lines.append(bench_row("Cold TTFR p50 (ms)", bsum.get("cold_ttfr_p50_ms"), asum.get("cold_ttfr_p50_ms")))
    lines.append(bench_row("Cold Total p95 (ms)", bsum.get("cold_total_p95_ms"), asum.get("cold_total_p95_ms")))
    lines.append(bench_row("Warm Total p95 (ms)", bsum.get("warm_total_p95_ms"), asum.get("warm_total_p95_ms")))
    lines.append("")

    lines.append("## Stage p95 Delta")
    lines.append("| Stage | Before | After | Delta | Change |")
    lines.append("| --- | ---: | ---: | ---: | --- |")
    lines.append(bench_row("Walk p95 (ms)", extract_summary_metric(before, "walk_p95_ms"), extract_summary_metric(after, "walk_p95_ms")))
    lines.append(bench_row("Path score p95 (ms)", extract_summary_metric(before, "path_score_p95_ms"), extract_summary_metric(after, "path_score_p95_ms")))
    lines.append(bench_row("Ripgrep p95 (ms)", extract_summary_metric(before, "ripgrep_p95_ms"), extract_summary_metric(after, "ripgrep_p95_ms")))
    lines.append(bench_row("Embed p95 (ms)", extract_summary_metric(before, "embed_p95_ms"), extract_summary_metric(after, "embed_p95_ms")))
    lines.append(bench_row("Rank p95 (ms)", extract_summary_metric(before, "rank_p95_ms"), extract_summary_metric(after, "rank_p95_ms")))
    lines.append("")

    lines.append("## Harsh Objective Check")
    lines.append(f"- Tier: `{tier.upper()}`")
    lines.append("| Metric | Harsh target | After | Status |")
    lines.append("| --- | ---: | ---: | --- |")
    lines.extend(harsh_eval_rows)
    lines.append("")

    lines.append("## Query-Level Total p95 Deltas")
    lines.append("### Largest regressions")
    lines.append("| Query | Delta ms |")
    lines.append("| --- | ---: |")
    if worst_total:
        for query, delta in worst_total:
            lines.append(f"| {query} | {delta:+.2f} |")
    else:
        lines.append("| (none) | +0.00 |")
    lines.append("")

    lines.append("### Largest improvements")
    lines.append("| Query | Delta ms |")
    lines.append("| --- | ---: |")
    if best_total:
        for query, delta in best_total:
            lines.append(f"| {query} | {delta:+.2f} |")
    else:
        lines.append("| (none) | +0.00 |")
    lines.append("")

    if quality_before and quality_after:
        lines.append("## Quality Delta (if provided)")
        lines.append("| Model | MRR@10 mean (before) | MRR@10 mean (after) | Recall@10 mean (before) | Recall@10 mean (after) | Latency ms/1k (before) | Latency ms/1k (after) |")
        lines.append("| --- | ---: | ---: | ---: | ---: | ---: | ---: |")
        for model_id in sorted(set(quality_before) & set(quality_after)):
            b = quality_before[model_id]
            a = quality_after[model_id]
            lines.append(
                "| {} | {:.4f} | {:.4f} | {:.4f} | {:.4f} | {:.2f} | {:.2f} |".format(
                    model_id,
                    b.get("mrr_at_10_mean", 0.0),
                    a.get("mrr_at_10_mean", 0.0),
                    b.get("recall_at_10_mean", 0.0),
                    a.get("recall_at_10_mean", 0.0),
                    b.get("latency_ms_per_1k_mean", 0.0),
                    a.get("latency_ms_per_1k_mean", 0.0),
                )
            )
        lines.append("")

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("\n".join(lines) + "\n", encoding="utf-8")

    payload = {
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "before_bench": str(before_path),
        "after_bench": str(after_path),
        "tier": tier,
        "before_summary": bsum,
        "after_summary": asum,
        "harsh_targets": harsh,
    }
    json_output.parent.mkdir(parents=True, exist_ok=True)
    json_output.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    print(output)
    print(json_output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
