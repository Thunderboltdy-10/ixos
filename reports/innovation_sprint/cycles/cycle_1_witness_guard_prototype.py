#!/usr/bin/env python3
"""Cycle 1 prototype: Witness-aware guard reranker (reports-only).

Idea:
- Retrieve a wider candidate pool from Ixos CLI.
- Apply a lightweight post-retrieval controller:
  - lexical witness bonus (query terms found in path/snippet)
  - privacy guard penalty for restricted paths unless query explicitly asks for it

This does not modify product code. It measures feasibility and effect size.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List, Tuple

ROOT = Path(__file__).resolve().parents[3]
SUITE_PATH = ROOT / "reports" / "innovation_sprint" / "failure_atlas" / "queries.json"
OUT_JSON = ROOT / "reports" / "innovation_sprint" / "cycles" / "CYCLE_1_PROTOTYPE.json"
OUT_MD = ROOT / "reports" / "innovation_sprint" / "cycles" / "CYCLE_1_PROTOTYPE.md"

TOKEN_RE = re.compile(r"[a-z0-9_./-]+")
SENSITIVE_TERMS = {
    "restricted",
    "secret",
    "private",
    "confidential",
    "credential",
    "password",
}


def ixos_bin() -> Path:
    exe_name = "ixos.exe" if os.name == "nt" else "ixos"
    path = ROOT / "target" / "debug" / exe_name
    if path.exists():
        return path
    subprocess.check_call(["cargo", "build", "--bin", "ixos"], cwd=ROOT)
    if not path.exists():
        raise RuntimeError("ixos binary missing")
    return path


def normalize_path(path_str: str) -> str:
    path_str = path_str.replace("\\\\?\\", "")
    p = Path(path_str)
    try:
        rel = p.resolve().relative_to(ROOT.resolve())
        return rel.as_posix()
    except Exception:
        return path_str.replace("\\", "/")


def tokenize(text: str) -> List[str]:
    tokens = [t.lower() for t in TOKEN_RE.findall(text.lower()) if len(t) >= 2]
    dedup: List[str] = []
    seen = set()
    for token in tokens:
        if token in seen:
            continue
        seen.add(token)
        dedup.append(token)
    return dedup


def is_sensitive_query(query_tokens: List[str]) -> bool:
    return any(token in SENSITIVE_TERMS for token in query_tokens)


def fuzzy_term_match(token: str, haystack: str) -> bool:
    if token in haystack:
        return True
    if token.endswith("ed") and len(token) > 4 and token[:-2] in haystack:
        return True
    if token.endswith("ing") and len(token) > 5 and token[:-3] in haystack:
        return True
    return False


def score_entry(
    entry: Dict[str, Any],
    query_tokens: List[str],
    sensitive_query: bool,
) -> Tuple[float, Dict[str, Any]]:
    base_score = float(entry.get("score", 0.0))
    path = normalize_path(str(entry.get("path", "")))
    snippet = str(entry.get("snippet", "") or "")
    joined = f"{path} {snippet}".lower()

    matched_terms = [token for token in query_tokens if fuzzy_term_match(token, joined)]
    witness_ratio = (len(matched_terms) / len(query_tokens)) if query_tokens else 0.0
    phrase_bonus = 0.08 if " ".join(query_tokens) in joined and query_tokens else 0.0
    witness_bonus = 0.22 * witness_ratio + phrase_bonus

    restricted_path = "/restricted/" in path.lower() or path.lower().endswith("/secret.txt")
    privacy_penalty = 0.35 if restricted_path and not sensitive_query else 0.0

    adjusted = base_score + witness_bonus - privacy_penalty
    features = {
        "base_score": base_score,
        "adjusted_score": adjusted,
        "matched_terms": matched_terms,
        "witness_ratio": round(witness_ratio, 4),
        "phrase_bonus": round(phrase_bonus, 4),
        "privacy_penalty": round(privacy_penalty, 4),
        "path": path,
    }
    return adjusted, features


def evaluate_constraints(top_paths: List[str], case: Dict[str, Any], top_k: int) -> List[str]:
    failures: List[str] = []
    must_include = [normalize_path(p) for p in case.get("must_include_topk", [])]
    for path in must_include:
        if path not in top_paths:
            failures.append(f"missing in top-{top_k}: {path}")
    must_not = [normalize_path(p) for p in case.get("must_not_include_topk", [])]
    for path in must_not:
        if path in top_paths:
            failures.append(f"unexpected in top-{top_k}: {path}")
    return failures


def run_query(
    env: Dict[str, str],
    query: str,
    directory: str,
    search_mode: str,
    cache_mode: str,
    limit: int,
) -> Tuple[List[Dict[str, Any]], int]:
    cmd = [
        str(ixos_bin()),
        "search",
        query,
        "--dir",
        directory,
        "--format",
        "json",
        "--limit",
        str(limit),
        "--search-mode",
        search_mode,
        "--cache-mode",
        cache_mode,
    ]
    started = time.perf_counter()
    proc = subprocess.run(
        cmd, cwd=ROOT, env=env, capture_output=True, text=True, encoding="utf-8"
    )
    duration_ms = int((time.perf_counter() - started) * 1000)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or f"exit={proc.returncode}")
    payload = json.loads(proc.stdout)
    return payload.get("results", []), duration_ms


def bootstrap_env(env: Dict[str, str], dirs_to_index: List[str]) -> None:
    binary = str(ixos_bin())
    subprocess.check_call(
        [binary, "compliance", "consent", "--grant"],
        cwd=ROOT,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    for directory in sorted(set(dirs_to_index)):
        if directory == ".":
            continue
        subprocess.check_call(
            [binary, "index", directory, "--clear"],
            cwd=ROOT,
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )


def main() -> int:
    suite = json.loads(SUITE_PATH.read_text(encoding="utf-8"))
    defaults = suite.get("defaults", {})
    cases = suite.get("cases", [])

    # Cycle 1 scope: skip heavy full-root stress case for rapid loop.
    cases = [case for case in cases if case.get("category") != "large_directory_stress"]
    dirs = [str(case.get("directory", defaults.get("directory", "corpus_tiny"))) for case in cases]

    with tempfile.TemporaryDirectory(prefix="ixos_cycle1_prototype_") as tmp:
        tmp_path = Path(tmp)
        env = os.environ.copy()
        env["HOME"] = str(tmp_path)
        env["XDG_CONFIG_HOME"] = str(tmp_path / ".config")
        env["XDG_DATA_HOME"] = str(tmp_path / ".local" / "share")
        if os.name == "nt":
            env["APPDATA"] = str(tmp_path / "AppData" / "Roaming")

        bootstrap_env(env, dirs)

        report_cases = []
        baseline_pass = 0
        rerank_pass = 0
        latencies = []

        for case in cases:
            query = str(case["query"])
            search_mode = str(case.get("search_mode", defaults.get("search_mode", "flash")))
            directory = str(case.get("directory", defaults.get("directory", "corpus_tiny")))
            cache_mode = str(case.get("cache_mode", defaults.get("cache_mode", "memory")))
            top_k = int(case.get("top_k", defaults.get("top_k", 5)))
            base_limit = int(case.get("limit", defaults.get("limit", 8)))
            expanded_limit = max(base_limit, 20, top_k * 4)

            results, duration_ms = run_query(
                env=env,
                query=query,
                directory=directory,
                search_mode=search_mode,
                cache_mode=cache_mode,
                limit=expanded_limit,
            )
            latencies.append(duration_ms)

            normalized_entries = [
                {
                    "path": normalize_path(str(item.get("path", ""))),
                    "score": float(item.get("score", 0.0)),
                    "snippet": str(item.get("snippet", "")),
                }
                for item in results
            ]
            baseline_top = normalized_entries[:top_k]
            baseline_top_paths = [entry["path"] for entry in baseline_top]
            baseline_failures = evaluate_constraints(baseline_top_paths, case, top_k)
            baseline_ok = len(baseline_failures) == 0
            if baseline_ok:
                baseline_pass += 1

            query_tokens = tokenize(query)
            sensitive_query = is_sensitive_query(query_tokens)
            reranked_with_features = []
            for entry in normalized_entries:
                adjusted, features = score_entry(entry, query_tokens, sensitive_query)
                reranked_with_features.append((adjusted, entry, features))

            reranked_with_features.sort(key=lambda row: row[0], reverse=True)
            reranked_top = reranked_with_features[:top_k]
            reranked_top_paths = [entry["path"] for _, entry, _ in reranked_top]
            reranked_failures = evaluate_constraints(reranked_top_paths, case, top_k)
            reranked_ok = len(reranked_failures) == 0
            if reranked_ok:
                rerank_pass += 1

            report_cases.append(
                {
                    "id": case["id"],
                    "category": case.get("category"),
                    "query": query,
                    "search_mode": search_mode,
                    "top_k": top_k,
                    "expanded_limit": expanded_limit,
                    "duration_ms": duration_ms,
                    "baseline": {
                        "pass": baseline_ok,
                        "failures": baseline_failures,
                        "top_paths": baseline_top_paths,
                    },
                    "rerank": {
                        "pass": reranked_ok,
                        "failures": reranked_failures,
                        "top_paths": reranked_top_paths,
                        "top_features": [features for _, _, features in reranked_top],
                    },
                }
            )

    summary = {
        "cases": len(report_cases),
        "baseline_pass": baseline_pass,
        "baseline_fail": len(report_cases) - baseline_pass,
        "rerank_pass": rerank_pass,
        "rerank_fail": len(report_cases) - rerank_pass,
        "delta_pass": rerank_pass - baseline_pass,
        "avg_query_latency_ms": round(sum(latencies) / len(latencies), 2) if latencies else 0.0,
    }

    payload = {"summary": summary, "cases": report_cases}
    OUT_JSON.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    lines = [
        "# Cycle 1 Prototype: Witness Guard Reranker",
        "",
        f"- Cases: `{summary['cases']}`",
        f"- Baseline pass/fail: `{summary['baseline_pass']}` / `{summary['baseline_fail']}`",
        f"- Rerank pass/fail: `{summary['rerank_pass']}` / `{summary['rerank_fail']}`",
        f"- Pass delta: `{summary['delta_pass']}`",
        f"- Mean query latency (expanded candidate pull): `{summary['avg_query_latency_ms']} ms`",
        "",
        "| Case | Baseline | Rerank | Delta |",
        "| --- | --- | --- | --- |",
    ]
    for case in report_cases:
        b = "PASS" if case["baseline"]["pass"] else "FAIL"
        r = "PASS" if case["rerank"]["pass"] else "FAIL"
        delta = "IMPROVED" if (not case["baseline"]["pass"] and case["rerank"]["pass"]) else (
            "REGRESSED" if (case["baseline"]["pass"] and not case["rerank"]["pass"]) else "UNCHANGED"
        )
        lines.append(f"| `{case['id']}` | `{b}` | `{r}` | `{delta}` |")
        if delta != "UNCHANGED" or (not case["rerank"]["pass"]):
            lines.append(f"- `{case['id']}` baseline top: `{'; '.join(case['baseline']['top_paths'])}`")
            lines.append(f"- `{case['id']}` rerank top: `{'; '.join(case['rerank']['top_paths'])}`")
            for failure in case["rerank"]["failures"]:
                lines.append(f"- `{case['id']}` rerank failure: {failure}")

    OUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(OUT_JSON)
    print(OUT_MD)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
