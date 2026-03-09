#!/usr/bin/env python3
"""Ralph Loop code audit runner.

Runs static and test checks, counts TODO/FIXME markers, and writes a markdown report.
"""

from __future__ import annotations

import argparse
import datetime as dt
import subprocess
from pathlib import Path


def run(cmd: list[str], cwd: Path | None = None) -> dict:
    started = dt.datetime.now(dt.timezone.utc)
    proc = subprocess.run(
        cmd,
        cwd=str(cwd) if cwd else None,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    ended = dt.datetime.now(dt.timezone.utc)
    return {
        "cmd": " ".join(cmd),
        "code": proc.returncode,
        "stdout": proc.stdout.strip(),
        "stderr": proc.stderr.strip(),
        "started": started,
        "ended": ended,
        "duration_s": round((ended - started).total_seconds(), 2),
    }


def count_todos(root: Path) -> int:
    scan_targets: list[str] = []
    for candidate in ["src", "ixos-search/src-tauri", "ixos-search/ui/src", "landing", "ixos-site", "tests"]:
        if (root / candidate).exists():
            scan_targets.append(candidate)
    if not scan_targets:
        return 0

    cmd = ["rg", "-n", "TODO|FIXME"] + scan_targets
    result = run(cmd, cwd=root)
    if result["code"] not in (0, 1):
        return -1
    if not result["stdout"]:
        return 0
    return len(result["stdout"].splitlines())


def format_section(title: str, result: dict) -> str:
    status = "PASS" if result["code"] == 0 else "FAIL"
    lines = [
        f"## {title}",
        f"- Status: **{status}**",
        f"- Command: `{result['cmd']}`",
        f"- Exit code: `{result['code']}`",
        f"- Duration: `{result['duration_s']}s`",
        "",
        "```text",
        (result["stdout"] or "<no stdout>")[:12000],
        "```",
    ]
    if result["stderr"]:
        lines.extend(
            [
                "",
                "```text",
                (result["stderr"])[:12000],
                "```",
            ]
        )
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Ralph code audit checks")
    parser.add_argument("--iteration", type=int, default=1)
    parser.add_argument("--output", type=Path, default=None)
    args = parser.parse_args()

    root = Path(__file__).resolve().parent.parent
    reports_dir = root / "reports" / "ralph"
    reports_dir.mkdir(parents=True, exist_ok=True)

    output = args.output or reports_dir / f"code_audit_{args.iteration}.md"

    clippy = run(["cargo", "clippy", "--all-targets"], cwd=root)
    tests = run(["cargo", "test"], cwd=root)
    todo_count = count_todos(root)

    generated_at = dt.datetime.now(dt.timezone.utc).isoformat()
    summary_ok = clippy["code"] == 0 and tests["code"] == 0

    lines = [
        "# Ralph Code Audit",
        f"- Iteration: `{args.iteration}`",
        f"- Generated: `{generated_at}`",
        f"- Overall: **{'PASS' if summary_ok else 'FAIL'}**",
        f"- TODO/FIXME count: `{todo_count if todo_count >= 0 else 'unavailable'}`",
        "",
        format_section("Cargo Clippy", clippy),
        format_section("Cargo Test", tests),
    ]

    output.write_text("\n".join(lines), encoding="utf-8")
    print(output)
    return 0 if summary_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
