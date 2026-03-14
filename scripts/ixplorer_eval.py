#!/usr/bin/env python3
"""
Replayable Ixplorer evaluation harness.

Computes:
- resume latency proxy (session_start -> first meaningful file action)
- auto-open wrong-path proxy
- search stability flip metrics for near-query perturbations
- command palette success metrics
- orchestrator action distribution
"""

from __future__ import annotations

import argparse
import json
import statistics
from collections import Counter
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable


def default_app_data_dir() -> Path:
    if "LOCALAPPDATA" in __import__("os").environ:
        return Path(__import__("os").environ["LOCALAPPDATA"]) / "Ixplorer"
    return Path.home() / ".ixplorer"


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    rows: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return rows


def load_activity_events(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    try:
        payload = json.loads(path.read_text(encoding="utf-8", errors="ignore"))
    except json.JSONDecodeError:
        return []
    events = payload.get("events", [])
    if not isinstance(events, list):
        return []
    return [e for e in events if isinstance(e, dict)]


def load_workstream_metadata(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8", errors="ignore"))
    except json.JSONDecodeError:
        return {}
    if not isinstance(payload, dict):
        return {}
    return payload


def as_int(v: Any, default: int = 0) -> int:
    try:
        return int(v)
    except Exception:
        return default


def normalize_query(value: str) -> str:
    return " ".join(value.strip().lower().split())


def is_near_query(lhs: str, rhs: str) -> bool:
    if not lhs or not rhs:
        return False
    if abs(len(lhs) - len(rhs)) > 2:
        return False
    prefix = min(4, len(lhs), len(rhs))
    if prefix == 0:
        return False
    return lhs[:prefix] == rhs[:prefix]


@dataclass
class EvalResult:
    resume_samples: int = 0
    resume_median_s: float = 0.0
    resume_p90_s: float = 0.0
    auto_open_samples: int = 0
    auto_open_wrong_rate: float = 0.0
    near_query_pairs: int = 0
    near_query_flip_rate: float = 0.0
    command_total: int = 0
    command_success_rate: float = 0.0
    orchestrator_total: int = 0
    orchestrator_top_actions: list[tuple[str, int]] | None = None
    workstream_signature: str = ""
    workstream_source_events: int = 0
    workstream_count: int = 0
    workstream_last_rebuild_ms: int = 0


def percentile(values: list[float], q: float) -> float:
    if not values:
        return 0.0
    if len(values) == 1:
        return values[0]
    values = sorted(values)
    index = max(0, min(len(values) - 1, int(round((len(values) - 1) * q))))
    return values[index]


def evaluate(
    activity_events: list[dict[str, Any]],
    search_trace: list[dict[str, Any]],
    command_rows: list[dict[str, Any]],
    orchestrator_rows: list[dict[str, Any]],
    workstream_metadata: dict[str, Any],
) -> EvalResult:
    result = EvalResult()

    sorted_events = sorted(activity_events, key=lambda e: as_int(e.get("timestamp"), 0))
    meaningful_actions = {"file_opened", "result_clicked", "tab_switched", "file_preview_opened"}
    deltas: list[float] = []
    for idx, event in enumerate(sorted_events):
        if event.get("action") != "session_start":
            continue
        t0 = as_int(event.get("timestamp"), 0)
        if t0 <= 0:
            continue
        for follow in sorted_events[idx + 1 :]:
            t1 = as_int(follow.get("timestamp"), 0)
            if t1 < t0:
                continue
            if follow.get("action") in meaningful_actions and follow.get("file_path"):
                deltas.append((t1 - t0) / 1000.0)
                break

    if deltas:
        result.resume_samples = len(deltas)
        result.resume_median_s = statistics.median(deltas)
        result.resume_p90_s = percentile(deltas, 0.9)

    file_events = [
        e
        for e in sorted_events
        if e.get("action") in meaningful_actions and isinstance(e.get("file_path"), str)
    ]
    sorted_trace = sorted(search_trace, key=lambda r: as_int(r.get("timestamp_ms"), 0))
    wrong = 0
    inspected = 0
    for row in sorted_trace:
        if row.get("action") != "auto_open":
            continue
        top_path = row.get("top_path")
        ts = as_int(row.get("timestamp_ms"), 0)
        if not top_path or ts <= 0:
            continue
        follow = next(
            (
                e
                for e in file_events
                if 0 <= as_int(e.get("timestamp"), 0) - ts <= 8000
            ),
            None,
        )
        if follow is None:
            continue
        inspected += 1
        if follow.get("file_path") != top_path:
            wrong += 1
    if inspected:
        result.auto_open_samples = inspected
        result.auto_open_wrong_rate = wrong / inspected

    flips = 0
    near_pairs = 0
    prev = None
    for row in sorted_trace:
        q = normalize_query(str(row.get("query", "")))
        top_path = str(row.get("top_path", ""))
        if not q or not top_path:
            continue
        if prev is not None:
            if is_near_query(prev["query"], q):
                near_pairs += 1
                if prev["top_path"] != top_path:
                    flips += 1
        prev = {"query": q, "top_path": top_path}
    if near_pairs:
        result.near_query_pairs = near_pairs
        result.near_query_flip_rate = flips / near_pairs

    if command_rows:
        total = len(command_rows)
        success = sum(1 for row in command_rows if bool(row.get("success")))
        result.command_total = total
        result.command_success_rate = success / total

    if orchestrator_rows:
        actions = Counter(str(row.get("action", "unknown")) for row in orchestrator_rows)
        result.orchestrator_total = sum(actions.values())
        result.orchestrator_top_actions = actions.most_common(5)

    if workstream_metadata:
        result.workstream_signature = str(workstream_metadata.get("graph_signature", "")).strip()
        result.workstream_source_events = as_int(workstream_metadata.get("source_event_count"), 0)
        result.workstream_last_rebuild_ms = as_int(workstream_metadata.get("last_rebuild_at"), 0)
        workstreams = workstream_metadata.get("workstreams", [])
        if isinstance(workstreams, list):
            result.workstream_count = len(workstreams)

    return result


def markdown_report(result: EvalResult, source_paths: dict[str, Path]) -> str:
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%SZ")
    lines = [
        "# Ixplorer Eval Harness Report",
        "",
        f"- Generated (UTC): `{now}`",
        f"- Activity source: `{source_paths['activity']}`",
        f"- Search trace source: `{source_paths['search']}`",
        f"- Command telemetry source: `{source_paths['command']}`",
        f"- Orchestrator source: `{source_paths['orchestrator']}`",
        f"- Workstream source: `{source_paths['workstreams']}`",
        "",
        "## Metrics",
        "",
        "| Metric | Value |",
        "|---|---|",
        f"| Resume samples | {result.resume_samples} |",
        f"| Resume median (s) | {result.resume_median_s:.2f} |",
        f"| Resume p90 (s) | {result.resume_p90_s:.2f} |",
        f"| Auto-open samples | {result.auto_open_samples} |",
        f"| Auto-open wrong-path rate | {result.auto_open_wrong_rate:.3f} |",
        f"| Near-query pairs | {result.near_query_pairs} |",
        f"| Near-query flip rate | {result.near_query_flip_rate:.3f} |",
        f"| Command invocations | {result.command_total} |",
        f"| Command success rate | {result.command_success_rate:.3f} |",
        f"| Orchestrator decisions | {result.orchestrator_total} |",
        f"| Workstream clusters | {result.workstream_count} |",
        f"| Workstream source events | {result.workstream_source_events} |",
        f"| Workstream graph signature | `{result.workstream_signature or 'none'}` |",
        f"| Workstream last rebuild (ms) | {result.workstream_last_rebuild_ms} |",
    ]
    if result.orchestrator_top_actions:
        lines.extend(
            [
                "",
                "## Top Orchestrator Actions",
                "",
                "| Action | Count |",
                "|---|---|",
            ]
        )
        for action, count in result.orchestrator_top_actions:
            lines.append(f"| `{action}` | {count} |")
    return "\n".join(lines) + "\n"


def main() -> int:
    app_dir = default_app_data_dir()
    parser = argparse.ArgumentParser()
    parser.add_argument("--activity", type=Path, default=app_dir / "activity_v1.json")
    parser.add_argument("--search-trace", type=Path, default=app_dir / "search_trace_v1.jsonl")
    parser.add_argument("--command-telemetry", type=Path, default=app_dir / "command_telemetry_v1.jsonl")
    parser.add_argument("--orchestrator", type=Path, default=app_dir / "orchestrator_decisions_v1.jsonl")
    parser.add_argument("--workstreams", type=Path, default=app_dir / "workstreams_v2.json")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("reports") / f"ixplorer_eval_{datetime.utcnow().strftime('%Y-%m-%d')}.md",
    )
    args = parser.parse_args()

    activity = load_activity_events(args.activity)
    search_rows = load_jsonl(args.search_trace)
    command_rows = load_jsonl(args.command_telemetry)
    orchestrator_rows = load_jsonl(args.orchestrator)
    workstream_metadata = load_workstream_metadata(args.workstreams)

    result = evaluate(activity, search_rows, command_rows, orchestrator_rows, workstream_metadata)
    report = markdown_report(
        result,
        {
            "activity": args.activity,
            "search": args.search_trace,
            "command": args.command_telemetry,
            "orchestrator": args.orchestrator,
            "workstreams": args.workstreams,
        },
    )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(report, encoding="utf-8")
    print(f"Wrote report: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
