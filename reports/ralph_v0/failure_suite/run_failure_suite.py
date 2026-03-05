#!/usr/bin/env python3
"""Run compact innovation failure cases against ixos CLI search."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[3]
SUITE_PATH = Path(__file__).resolve().parent / "queries.json"
OUT_JSON = Path(__file__).resolve().parent / "results_latest.json"
OUT_MD = Path(__file__).resolve().parent / "results_latest.md"


@dataclass
class CaseResult:
    case_id: str
    query: str
    search_mode: str
    top_k: int
    passed: bool
    failures: list[str]
    top_paths: list[str]
    command: list[str]


def normalize_path(path_str: str) -> str:
    cleaned = path_str.replace("\\\\?\\", "")
    p = Path(cleaned)
    try:
        rel = p.resolve().relative_to(ROOT.resolve())
        return rel.as_posix()
    except Exception:
        return cleaned.replace("\\", "/")


def ixos_bin() -> Path:
    return ROOT / "target" / "debug" / ("ixos.exe" if sys.platform.startswith("win") else "ixos")


def prepare_isolated_env(tmp_root: Path) -> dict[str, str]:
    env = os.environ.copy()
    env["HOME"] = str(tmp_root)
    env["XDG_CONFIG_HOME"] = str(tmp_root / ".config")
    env["XDG_DATA_HOME"] = str(tmp_root / ".local" / "share")
    if sys.platform.startswith("win"):
        env["APPDATA"] = str(tmp_root / "AppData" / "Roaming")
    return env


def bootstrap_env(env: dict[str, str]) -> None:
    bin_path = str(ixos_bin())
    subprocess.check_call(
        [bin_path, "compliance", "consent", "--grant"],
        cwd=ROOT,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    subprocess.check_call(
        [bin_path, "index", "corpus_tiny", "--clear"],
        cwd=ROOT,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def run_case(defaults: dict[str, Any], case: dict[str, Any], env: dict[str, str]) -> CaseResult:
    top_k = int(case.get("top_k", defaults.get("limit", 5)))
    limit = int(case.get("limit", defaults.get("limit", 5)))
    cmd = [
        str(ixos_bin()),
        "search",
        case["query"],
        "--dir",
        case.get("directory", defaults.get("directory", "corpus_tiny")),
        "--format",
        case.get("format", defaults.get("format", "json")),
        "--limit",
        str(limit),
        "--search-mode",
        case["search_mode"],
        "--cache-mode",
        case.get("cache_mode", defaults.get("cache_mode", "memory")),
    ]

    proc = subprocess.run(
        cmd, cwd=ROOT, env=env, capture_output=True, text=True, encoding="utf-8"
    )
    failures: list[str] = []
    top_paths: list[str] = []

    if proc.returncode != 0:
        failures.append(f"command failed: {proc.stderr.strip()}")
    else:
        try:
            payload = json.loads(proc.stdout)
        except json.JSONDecodeError as exc:
            failures.append(f"invalid json output: {exc}")
            payload = {"results": []}

        results = payload.get("results", [])
        top_paths = [normalize_path(r.get("path", "")) for r in results[:top_k]]

        for p in case.get("must_include_topk", []):
            if p not in top_paths:
                failures.append(f"missing in top-{top_k}: {p}")

        for p in case.get("must_not_include_topk", []):
            if p in top_paths:
                failures.append(f"unexpected in top-{top_k}: {p}")

    return CaseResult(
        case_id=case["id"],
        query=case["query"],
        search_mode=case["search_mode"],
        top_k=top_k,
        passed=(len(failures) == 0),
        failures=failures,
        top_paths=top_paths,
        command=cmd,
    )


def main() -> int:
    suite = json.loads(SUITE_PATH.read_text(encoding="utf-8"))
    defaults = suite.get("defaults", {})

    with tempfile.TemporaryDirectory(prefix="ixos_innovation_suite_") as tmp:
        env = prepare_isolated_env(Path(tmp))
        bootstrap_env(env)
        results = [run_case(defaults, c, env) for c in suite.get("cases", [])]

    payload = {
        "suite": suite.get("suite"),
        "description": suite.get("description"),
        "results": [
            {
                "id": r.case_id,
                "query": r.query,
                "search_mode": r.search_mode,
                "top_k": r.top_k,
                "passed": r.passed,
                "failures": r.failures,
                "top_paths": r.top_paths,
                "command": r.command,
            }
            for r in results
        ],
    }
    OUT_JSON.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    lines = [
        "# Innovation Failure Suite Results",
        "",
        f"- Suite: `{payload['suite']}`",
        f"- Cases: `{len(results)}`",
        "",
        "| Case | Mode | Status | Top Paths |",
        "| --- | --- | --- | --- |",
    ]

    for r in results:
        status = "PASS" if r.passed else "FAIL"
        top = "<none>" if not r.top_paths else "; ".join(r.top_paths)
        lines.append(f"| `{r.case_id}` | `{r.search_mode}` | **{status}** | `{top}` |")
        for f in r.failures:
            lines.append(f"- `{r.case_id}`: {f}")

    OUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")

    return 1 if any(not r.passed for r in results) else 0


if __name__ == "__main__":
    raise SystemExit(main())
