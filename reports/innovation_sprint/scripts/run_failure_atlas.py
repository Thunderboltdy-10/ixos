#!/usr/bin/env python3
"""Deterministic failure-atlas runner for Ixos innovation sprint.

Runs cases in an isolated environment and emits:
- reports/innovation_sprint/failure_atlas/results_latest.json
- reports/innovation_sprint/failure_atlas/results_latest.md

Optional volatility mode reruns selected cases N times and emits:
- reports/innovation_sprint/failure_atlas/volatility_latest.json
- reports/innovation_sprint/failure_atlas/volatility_latest.md
"""

from __future__ import annotations

import argparse
import json
import os
import statistics
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

ROOT = Path(__file__).resolve().parents[3]
SUITE_PATH = ROOT / "reports" / "innovation_sprint" / "failure_atlas" / "queries.json"
OUT_JSON = ROOT / "reports" / "innovation_sprint" / "failure_atlas" / "results_latest.json"
OUT_MD = ROOT / "reports" / "innovation_sprint" / "failure_atlas" / "results_latest.md"
VOL_JSON = ROOT / "reports" / "innovation_sprint" / "failure_atlas" / "volatility_latest.json"
VOL_MD = ROOT / "reports" / "innovation_sprint" / "failure_atlas" / "volatility_latest.md"


@dataclass
class CaseResult:
    case_id: str
    category: str
    query: str
    search_mode: str
    directory: str
    top_k: int
    passed: bool
    failures: List[str]
    top_paths: List[str]
    top_entries: List[Dict[str, Any]]
    duration_ms: int
    command: List[str]
    witness: str


def strip_windows_extended_prefix(path_str: str) -> str:
    if path_str.startswith("\\\\?\\"):
        return path_str[4:]
    if path_str.startswith("//?/"):
        return path_str[4:]
    return path_str


def normalize_path(path_str: str) -> str:
    cleaned = strip_windows_extended_prefix(path_str)
    path_obj = Path(cleaned)
    try:
        rel = path_obj.resolve().relative_to(ROOT.resolve())
        return rel.as_posix()
    except Exception:
        cleaned = cleaned.replace("\\", "/")
        root_clean = str(ROOT).replace("\\", "/")
        if cleaned.startswith(root_clean + "/"):
            return cleaned[len(root_clean) + 1 :]
        return cleaned


def ixos_bin() -> Path:
    exe_name = "ixos.exe" if os.name == "nt" else "ixos"
    debug_bin = ROOT / "target" / "debug" / exe_name
    if debug_bin.exists():
        return debug_bin
    subprocess.check_call(["cargo", "build", "--bin", "ixos"], cwd=ROOT)
    if debug_bin.exists():
        return debug_bin
    raise RuntimeError("ixos binary not found after build")


def prepare_isolated_env(tmp_root: Path) -> Dict[str, str]:
    env = os.environ.copy()
    env["HOME"] = str(tmp_root)
    env["XDG_CONFIG_HOME"] = str(tmp_root / ".config")
    env["XDG_DATA_HOME"] = str(tmp_root / ".local" / "share")
    if os.name == "nt":
        env["APPDATA"] = str(tmp_root / "AppData" / "Roaming")
    return env


def bootstrap_env(env: Dict[str, str], index_dirs: Iterable[str]) -> None:
    binary = str(ixos_bin())
    subprocess.check_call(
        [binary, "compliance", "consent", "--grant"],
        cwd=ROOT,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    for directory in sorted(set(index_dirs)):
        if directory == ".":
            # Avoid expensive full-root index during default bootstrap.
            continue
        subprocess.check_call(
            [binary, "index", directory, "--clear"],
            cwd=ROOT,
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )


def build_search_cmd(case: Dict[str, Any], defaults: Dict[str, Any]) -> List[str]:
    directory = str(case.get("directory", defaults.get("directory", "corpus_tiny")))
    limit = int(case.get("limit", defaults.get("limit", 8)))
    search_mode = str(case.get("search_mode", defaults.get("search_mode", "flash")))
    cache_mode = str(case.get("cache_mode", defaults.get("cache_mode", "memory")))
    output_format = str(case.get("format", defaults.get("format", "json")))
    query = str(case["query"])
    return [
        str(ixos_bin()),
        "search",
        query,
        "--dir",
        directory,
        "--format",
        output_format,
        "--limit",
        str(limit),
        "--search-mode",
        search_mode,
        "--cache-mode",
        cache_mode,
    ]


def run_cmd_json(cmd: List[str], env: Dict[str, str]) -> Tuple[Dict[str, Any], int]:
    started = time.perf_counter()
    proc = subprocess.run(
        cmd,
        cwd=ROOT,
        env=env,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    elapsed_ms = int((time.perf_counter() - started) * 1000)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or f"exit={proc.returncode}")
    try:
        payload = json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"invalid JSON output: {exc}") from exc
    return payload, elapsed_ms


def evaluate_case(case: Dict[str, Any], defaults: Dict[str, Any], env: Dict[str, str]) -> CaseResult:
    top_k = int(case.get("top_k", defaults.get("top_k", 5)))
    cmd = build_search_cmd(case, defaults)
    failures: List[str] = []
    top_paths: List[str] = []
    top_entries: List[Dict[str, Any]] = []
    duration_ms = 0

    try:
        payload, duration_ms = run_cmd_json(cmd, env)
        results = payload.get("results", [])
        top_entries = [
            {
                "path": normalize_path(item.get("path", "")),
                "score": float(item.get("score", 0.0)),
                "snippet": str(item.get("snippet", "")),
            }
            for item in results[:top_k]
        ]
        top_paths = [entry["path"] for entry in top_entries]
    except Exception as exc:
        failures.append(f"command failed: {exc}")

    must_include = [normalize_path(p) for p in case.get("must_include_topk", [])]
    for path in must_include:
        if path not in top_paths:
            failures.append(f"missing in top-{top_k}: {path}")

    must_not = [normalize_path(p) for p in case.get("must_not_include_topk", [])]
    for path in must_not:
        if path in top_paths:
            failures.append(f"unexpected in top-{top_k}: {path}")

    return CaseResult(
        case_id=str(case["id"]),
        category=str(case.get("category", "uncategorized")),
        query=str(case["query"]),
        search_mode=str(case.get("search_mode", defaults.get("search_mode", "flash"))),
        directory=str(case.get("directory", defaults.get("directory", "corpus_tiny"))),
        top_k=top_k,
        passed=(len(failures) == 0),
        failures=failures,
        top_paths=top_paths,
        top_entries=top_entries,
        duration_ms=duration_ms,
        command=cmd,
        witness=str(case.get("witness", "")),
    )


def jaccard(a: List[str], b: List[str]) -> float:
    set_a, set_b = set(a), set(b)
    if not set_a and not set_b:
        return 1.0
    union = set_a | set_b
    if not union:
        return 1.0
    return len(set_a & set_b) / len(union)


def run_suite_once(suite: Dict[str, Any]) -> Tuple[List[CaseResult], Dict[str, Any]]:
    defaults = suite.get("defaults", {})
    cases = suite.get("cases", [])
    index_dirs = [
        str(case.get("directory", defaults.get("directory", "corpus_tiny")))
        for case in cases
        if bool(case.get("bootstrap_index", defaults.get("bootstrap_index", True)))
    ]

    with tempfile.TemporaryDirectory(prefix="ixos_failure_atlas_") as tmp:
        env = prepare_isolated_env(Path(tmp))
        bootstrap_env(env, index_dirs)
        results = [evaluate_case(case, defaults, env) for case in cases]

    by_category: Dict[str, int] = {}
    for result in results:
        by_category[result.category] = by_category.get(result.category, 0) + 1

    summary = {
        "cases": len(results),
        "passes": sum(1 for r in results if r.passed),
        "fails": sum(1 for r in results if not r.passed),
        "avg_duration_ms": round(statistics.mean([r.duration_ms for r in results]), 2)
        if results
        else 0.0,
        "by_category": by_category,
    }
    return results, summary


def write_results(suite: Dict[str, Any], results: List[CaseResult], summary: Dict[str, Any]) -> None:
    payload = {
        "suite": suite.get("suite"),
        "description": suite.get("description"),
        "summary": summary,
        "results": [asdict(result) for result in results],
    }
    OUT_JSON.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    lines = [
        "# Innovation Failure Atlas Results",
        "",
        f"- Suite: `{payload['suite']}`",
        f"- Cases: `{summary['cases']}`",
        f"- Pass: `{summary['passes']}`",
        f"- Fail: `{summary['fails']}`",
        f"- Avg case latency: `{summary['avg_duration_ms']} ms`",
        "",
        "| Case | Category | Mode | Status | Top paths |",
        "| --- | --- | --- | --- | --- |",
    ]

    for result in results:
        status = "PASS" if result.passed else "FAIL"
        top_paths = "; ".join(result.top_paths) if result.top_paths else "<none>"
        lines.append(
            f"| `{result.case_id}` | `{result.category}` | `{result.search_mode}` | **{status}** | `{top_paths}` |"
        )
        for failure in result.failures:
            lines.append(f"- `{result.case_id}`: {failure}")

    OUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")


def run_volatility(suite: Dict[str, Any], runs: int) -> Dict[str, Any]:
    defaults = suite.get("defaults", {})
    cases = [
        case
        for case in suite.get("cases", [])
        if bool(case.get("include_in_volatility", defaults.get("include_in_volatility", True)))
    ]
    if not cases:
        return {"runs": runs, "cases": []}

    index_dirs = [
        str(case.get("directory", defaults.get("directory", "corpus_tiny")))
        for case in cases
        if bool(case.get("bootstrap_index", defaults.get("bootstrap_index", True)))
    ]

    with tempfile.TemporaryDirectory(prefix="ixos_failure_volatility_") as tmp:
        env = prepare_isolated_env(Path(tmp))
        bootstrap_env(env, index_dirs)

        observations: Dict[str, List[List[str]]] = {str(case["id"]): [] for case in cases}
        for _ in range(runs):
            for case in cases:
                cmd = build_search_cmd(case, defaults)
                top_k = int(case.get("top_k", defaults.get("top_k", 5)))
                try:
                    payload, _ = run_cmd_json(cmd, env)
                    top_paths = [
                        normalize_path(item.get("path", "")) for item in payload.get("results", [])[:top_k]
                    ]
                except Exception:
                    top_paths = []
                observations[str(case["id"])].append(top_paths)

    volatility_cases = []
    for case in cases:
        case_id = str(case["id"])
        runs_topk = observations[case_id]
        top1_values = [row[0] if row else "" for row in runs_topk]
        unique_top1 = sorted(set(top1_values))
        top1_flip_rate = 0.0
        if runs > 1:
            flips = sum(1 for i in range(1, len(top1_values)) if top1_values[i] != top1_values[0])
            top1_flip_rate = flips / (runs - 1)

        pairwise_jaccards: List[float] = []
        for i in range(len(runs_topk)):
            for j in range(i + 1, len(runs_topk)):
                pairwise_jaccards.append(jaccard(runs_topk[i], runs_topk[j]))
        avg_jaccard = statistics.mean(pairwise_jaccards) if pairwise_jaccards else 1.0

        volatility_cases.append(
            {
                "id": case_id,
                "query": case.get("query"),
                "search_mode": case.get("search_mode", defaults.get("search_mode", "flash")),
                "runs": runs_topk,
                "unique_top1": unique_top1,
                "top1_flip_rate": round(top1_flip_rate, 4),
                "avg_pairwise_jaccard_topk": round(avg_jaccard, 4),
            }
        )

    summary = {
        "runs": runs,
        "case_count": len(volatility_cases),
        "mean_top1_flip_rate": round(
            statistics.mean([entry["top1_flip_rate"] for entry in volatility_cases]), 4
        )
        if volatility_cases
        else 0.0,
        "mean_pairwise_jaccard_topk": round(
            statistics.mean([entry["avg_pairwise_jaccard_topk"] for entry in volatility_cases]), 4
        )
        if volatility_cases
        else 1.0,
    }

    payload = {"summary": summary, "cases": volatility_cases}
    VOL_JSON.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    lines = [
        "# Failure Atlas Volatility",
        "",
        f"- Runs per case: `{runs}`",
        f"- Cases measured: `{summary['case_count']}`",
        f"- Mean top1 flip rate: `{summary['mean_top1_flip_rate']}`",
        f"- Mean pairwise Jaccard@k: `{summary['mean_pairwise_jaccard_topk']}`",
        "",
        "| Case | Mode | Unique top1 | Flip rate | Avg Jaccard@k |",
        "| --- | --- | --- | ---: | ---: |",
    ]
    for entry in volatility_cases:
        lines.append(
            f"| `{entry['id']}` | `{entry['search_mode']}` | `{'; '.join(entry['unique_top1'])}` | "
            f"`{entry['top1_flip_rate']}` | `{entry['avg_pairwise_jaccard_topk']}` |"
        )

    VOL_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Ixos innovation failure atlas")
    parser.add_argument("--suite", type=Path, default=SUITE_PATH)
    parser.add_argument("--volatility-runs", type=int, default=0)
    args = parser.parse_args()

    suite = json.loads(args.suite.read_text(encoding="utf-8"))
    results, summary = run_suite_once(suite)
    write_results(suite, results, summary)
    print(OUT_JSON)
    print(OUT_MD)

    if args.volatility_runs and args.volatility_runs > 1:
        payload = run_volatility(suite, args.volatility_runs)
        print(VOL_JSON)
        print(VOL_MD)
        unstable = [
            entry
            for entry in payload["cases"]
            if entry["top1_flip_rate"] > 0.0 or entry["avg_pairwise_jaccard_topk"] < 1.0
        ]
        return 2 if unstable else (1 if summary["fails"] > 0 else 0)

    return 1 if summary["fails"] > 0 else 0


if __name__ == "__main__":
    raise SystemExit(main())
