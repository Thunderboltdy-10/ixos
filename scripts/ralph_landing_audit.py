#!/usr/bin/env python3
"""Ralph landing audit.

Performs a stale benchmark-data check and optional Lighthouse audit.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
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
        "duration_s": round((ended - started).total_seconds(), 2),
    }


def newest_benchmark_report(root: Path) -> Path | None:
    candidates = sorted(root.glob("reports/**/*bench*.json"), key=lambda p: p.stat().st_mtime)
    return candidates[-1] if candidates else None


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Ralph landing audits")
    parser.add_argument("--iteration", type=int, default=1)
    parser.add_argument("--output", type=Path, default=None)
    parser.add_argument("--url", type=str, default=None, help="Optional local/remote URL for Lighthouse")
    args = parser.parse_args()

    root = Path(__file__).resolve().parent.parent
    reports_dir = root / "reports" / "ralph"
    reports_dir.mkdir(parents=True, exist_ok=True)

    output = args.output or reports_dir / f"landing_audit_{args.iteration}.md"
    lighthouse_json = reports_dir / f"landing_lighthouse_{args.iteration}.json"

    benchmark_candidates = [
        root / "landing" / "src" / "data" / "benchmarks.json",
        root / "ixos-site" / "src" / "data" / "benchmarks.json",
        root / "ixos-site" / "data" / "benchmarks.json",
    ]
    landing_bench_json = next((p for p in benchmark_candidates if p.exists()), benchmark_candidates[0])
    latest_report = newest_benchmark_report(root)

    stale_check = "not-applicable"
    stale_detail = "No benchmark source report found."
    if latest_report:
        if landing_bench_json.exists():
            landing_ts = landing_bench_json.stat().st_mtime
            report_ts = latest_report.stat().st_mtime
            if landing_ts + 1 < report_ts:
                stale_check = "fail"
                stale_detail = (
                    f"Landing benchmarks older than latest report: {landing_bench_json} < {latest_report}"
                )
            else:
                stale_check = "pass"
                stale_detail = "Landing benchmark data is up to date with current reports."
        else:
            stale_check = "fail"
            stale_detail = (
                f"Landing benchmark file is missing: {landing_bench_json} "
                f"(latest report: {latest_report})"
            )
    elif landing_bench_json.exists():
        stale_check = "pass"
        stale_detail = "Landing benchmark file exists; no report baseline found to compare."

    lighthouse = None
    perf_score = None
    if args.url:
        cmd = [
            "npx",
            "lighthouse",
            args.url,
            "--quiet",
            "--chrome-flags=--headless",
            "--output=json",
            f"--output-path={lighthouse_json}",
        ]
        lighthouse = run(cmd, cwd=root)
        if lighthouse["code"] == 0 and lighthouse_json.exists():
            try:
                payload = json.loads(lighthouse_json.read_text(encoding="utf-8"))
                perf_score = payload.get("categories", {}).get("performance", {}).get("score")
                if perf_score is not None:
                    perf_score = round(float(perf_score) * 100, 2)
            except Exception:
                perf_score = None

    generated_at = dt.datetime.now(dt.timezone.utc).isoformat()
    lines = [
        "# Ralph Landing Audit",
        f"- Iteration: `{args.iteration}`",
        f"- Generated: `{generated_at}`",
        "",
        "## Stale Data Check",
        f"- Status: **{stale_check.upper()}**",
        f"- Detail: {stale_detail}",
        f"- Landing benchmark file: `{landing_bench_json}`",
        f"- Latest benchmark report: `{latest_report}`",
        "",
        "## Lighthouse",
    ]

    if args.url:
        status = "PASS" if lighthouse and lighthouse["code"] == 0 else "FAIL"
        lines.extend(
            [
                f"- URL: `{args.url}`",
                f"- Status: **{status}**",
                f"- Performance score: `{perf_score if perf_score is not None else 'unavailable'}`",
                f"- Output JSON: `{lighthouse_json}`",
            ]
        )
        if lighthouse:
            lines.extend(
                [
                    "",
                    "```text",
                    (lighthouse["stdout"] or "<no stdout>")[:8000],
                    "```",
                ]
            )
            if lighthouse["stderr"]:
                lines.extend(
                    [
                        "",
                        "```text",
                        lighthouse["stderr"][:8000],
                        "```",
                    ]
                )
    else:
        lines.append("- Skipped (`--url` not provided)")

    output.write_text("\n".join(lines), encoding="utf-8")
    print(output)

    failed = stale_check == "fail"
    if args.url and (not lighthouse or lighthouse["code"] != 0):
        failed = True
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
