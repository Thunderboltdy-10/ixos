#!/usr/bin/env python3
"""Project Prism Ralph Loop orchestrator.

Runs a repeatable observe->measure loop and writes timestamped reports under reports/ralph.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import subprocess
import sys
from pathlib import Path


def run(cmd: list[str], cwd: Path, timeout_s: int | None = None) -> dict:
    started = dt.datetime.now(dt.timezone.utc)
    try:
        proc = subprocess.run(
            cmd,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout_s,
        )
        code = proc.returncode
        stdout = proc.stdout.strip()
        stderr = proc.stderr.strip()
        timed_out = False
    except subprocess.TimeoutExpired as exc:
        code = 124
        stdout = (exc.stdout or "").strip()
        stderr = f"Timeout after {timeout_s}s"
        timed_out = True

    ended = dt.datetime.now(dt.timezone.utc)
    return {
        "cmd": " ".join(cmd),
        "code": code,
        "stdout": stdout,
        "stderr": stderr,
        "timed_out": timed_out,
        "duration_s": round((ended - started).total_seconds(), 2),
        "started": started.isoformat(),
        "ended": ended.isoformat(),
    }


def next_iteration(reports_dir: Path) -> int:
    existing = sorted(reports_dir.glob("iteration_*_*.md"))
    if not existing:
        return 1
    numbers = []
    for path in existing:
        name = path.stem
        parts = name.split("_")
        if len(parts) >= 2 and parts[1].isdigit():
            numbers.append(int(parts[1]))
    return (max(numbers) + 1) if numbers else 1


def summarize_status(code: int) -> str:
    return "PASS" if code == 0 else "FAIL"


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Ralph loop orchestration")
    parser.add_argument("--checkpoint", type=str, default=None, help="Optional checkpoint label, e.g. R0")
    parser.add_argument("--bench-dir", type=Path, default=Path("dataset"))
    parser.add_argument("--bench-runs", type=int, default=1)
    parser.add_argument("--bench-bin", type=str, default="ixos-big-bench")
    parser.add_argument(
        "--objective-profile",
        type=str,
        default="standard",
        choices=["standard", "harsh", "strict"],
        help="Objective profile passed to ixos-big-bench",
    )
    parser.add_argument("--capture-baseline", action="store_true")
    parser.add_argument("--skip-build", action="store_true")
    parser.add_argument("--skip-code-audit", action="store_true")
    parser.add_argument("--skip-bench", action="store_true")
    parser.add_argument("--skip-landing-audit", action="store_true")
    args = parser.parse_args()

    root = Path(__file__).resolve().parent.parent
    reports_dir = root / "reports" / "ralph"
    reports_dir.mkdir(parents=True, exist_ok=True)

    iteration = next_iteration(reports_dir)
    ts = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%d_%H%M%S")

    iteration_report = reports_dir / f"iteration_{iteration}_{ts}.md"
    checkpoint_report = (
        reports_dir / f"checkpoint_{args.checkpoint}_{ts}.md" if args.checkpoint else None
    )

    commands: list[tuple[str, dict]] = []

    if not args.skip_build:
        commands.append(("build_release", run(["cargo", "build", "--release"], root, timeout_s=3600)))

    if not args.skip_code_audit:
        code_audit_md = reports_dir / f"code_audit_{iteration}.md"
        result = run(
            [
                sys.executable,
                "scripts/ralph_code_audit.py",
                "--iteration",
                str(iteration),
                "--output",
                str(code_audit_md),
            ],
            root,
            timeout_s=7200,
        )
        commands.append(("code_audit", result))

    if not args.skip_bench:
        previous_big_benches = sorted(reports_dir.glob("big_bench_*.json"))
        if args.bench_bin == "ixos-big-bench":
            bench_cmd = [
                "cargo",
                "run",
                "--release",
                "--bin",
                "ixos-big-bench",
                "--",
                "--dir",
                str(args.bench_dir),
                "--runs",
                str(args.bench_runs),
                "--cache-mode",
                "native-cache",
                "--model",
                "ixos-flash-v2",
                "--output-dir",
                str(reports_dir),
                "--objective-profile",
                args.objective_profile,
            ]
        else:
            bench_md = reports_dir / f"v2_bench_{iteration}_{ts}.md"
            bench_cmd = [
                "cargo",
                "run",
                "--release",
                "--bin",
                args.bench_bin,
                "--",
                "--dir",
                str(args.bench_dir),
                "--runs",
                str(args.bench_runs),
                "--cache-mode",
                "native-cache",
                "--model",
                "ixos-flash-v2",
                "--out",
                str(bench_md),
            ]
        commands.append(("bench", run(bench_cmd, root, timeout_s=7200)))
        latest_big_benches = sorted(reports_dir.glob("big_bench_*.json"))
        if latest_big_benches:
            after_bench = latest_big_benches[-1]
            before_bench = previous_big_benches[-1] if previous_big_benches else None
            compare_cmd = [
                sys.executable,
                "scripts/compare_performance.py",
                "--after-bench",
                str(after_bench),
            ]
            if before_bench is not None:
                compare_cmd.extend(["--before-bench", str(before_bench)])
            compare_cmd.extend(
                [
                    "--output",
                    str(reports_dir / f"comparison_{iteration}_{ts}.md"),
                    "--json-output",
                    str(reports_dir / f"comparison_{iteration}_{ts}.json"),
                ]
            )
            commands.append(("compare_perf", run(compare_cmd, root, timeout_s=600)))

    if not args.skip_landing_audit:
        landing_md = reports_dir / f"landing_audit_{iteration}.md"
        result = run(
            [
                sys.executable,
                "scripts/ralph_landing_audit.py",
                "--iteration",
                str(iteration),
                "--output",
                str(landing_md),
            ],
            root,
            timeout_s=1800,
        )
        commands.append(("landing_audit", result))

    baseline_path = reports_dir / "baseline.json"
    baseline = None
    if baseline_path.exists():
        try:
            baseline = json.loads(baseline_path.read_text(encoding="utf-8"))
        except Exception:
            baseline = None

    capture_baseline = args.capture_baseline or baseline is None
    if capture_baseline:
        baseline_payload = {
            "captured_at": dt.datetime.now(dt.timezone.utc).isoformat(),
            "iteration": iteration,
            "commands": {
                name: {"code": result["code"], "duration_s": result["duration_s"]}
                for name, result in commands
            },
        }
        baseline_path.write_text(json.dumps(baseline_payload, indent=2), encoding="utf-8")
        baseline = baseline_payload

    lines = [
        "# Ralph Loop Iteration Report",
        f"- Iteration: `{iteration}`",
        f"- Generated: `{dt.datetime.now(dt.timezone.utc).isoformat()}`",
        f"- Checkpoint: `{args.checkpoint or 'none'}`",
        f"- Baseline file: `{baseline_path}`",
        "",
        "## Command Results",
        "| Step | Status | Exit | Duration (s) |",
        "| --- | --- | ---: | ---: |",
    ]

    for name, result in commands:
        lines.append(
            f"| `{name}` | {summarize_status(result['code'])} | `{result['code']}` | `{result['duration_s']}` |"
        )

    lines.append("")
    lines.append("## Before/After (vs Baseline)")
    lines.append("| Step | Baseline Exit | Current Exit | Delta Duration (s) |")
    lines.append("| --- | ---: | ---: | ---: |")

    baseline_commands = (baseline or {}).get("commands", {})
    for name, result in commands:
        b = baseline_commands.get(name)
        if b:
            delta = round(result["duration_s"] - float(b.get("duration_s", 0.0)), 2)
            lines.append(
                f"| `{name}` | `{b.get('code')}` | `{result['code']}` | `{delta}` |"
            )
        else:
            lines.append(f"| `{name}` | `n/a` | `{result['code']}` | `n/a` |")

    lines.append("")
    lines.append("## Raw Command Logs")
    for name, result in commands:
        lines.extend(
            [
                f"### {name}",
                f"- Command: `{result['cmd']}`",
                f"- Exit: `{result['code']}`",
                f"- Duration: `{result['duration_s']}s`",
                "```text",
                (result["stdout"] or "<no stdout>")[:12000],
                "```",
            ]
        )
        if result["stderr"]:
            lines.extend(["```text", result["stderr"][:12000], "```"])
        lines.append("")

    content = "\n".join(lines)
    iteration_report.write_text(content, encoding="utf-8")
    if checkpoint_report is not None:
        checkpoint_report.write_text(content, encoding="utf-8")

    print(iteration_report)
    if checkpoint_report is not None:
        print(checkpoint_report)

    failed = any(result["code"] != 0 for _, result in commands)
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
