#!/usr/bin/env python3
"""Anchor-Guard prototype: post-rerank top-k by lexical grounding confidence."""

from __future__ import annotations

import json
import math
import os
import re
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[3]
SUITE_PATH = ROOT / "reports" / "innovation" / "failure_suite" / "queries.json"
OUT_JSON = ROOT / "reports" / "innovation" / "prototypes" / "anchor_guard_results.json"
OUT_MD = ROOT / "reports" / "innovation" / "prototypes" / "anchor_guard_results.md"

TOKEN_RE = re.compile(r"[a-zA-Z0-9_]{2,}")


@dataclass
class EvalMetrics:
    hit_at_k: float
    banned_in_top_k_rate: float
    mrr: float
    anchor_trust_at_k: float


@dataclass
class CaseCompare:
    case_id: str
    search_mode: str
    top_k: int
    baseline_top: list[str]
    reranked_top: list[str]
    baseline_hit: bool
    reranked_hit: bool
    baseline_banned: bool
    reranked_banned: bool


def normalize_path(path_str: str) -> str:
    cleaned = path_str.replace("\\\\?\\", "")
    p = Path(cleaned)
    try:
        rel = p.resolve().relative_to(ROOT.resolve())
        return rel.as_posix()
    except Exception:
        return cleaned.replace("\\", "/")


def tokenize(text: str) -> list[str]:
    return [t.lower() for t in TOKEN_RE.findall(text.lower())]


def term_coverage(query_terms: list[str], path: str, snippet: str) -> float:
    if not query_terms:
        return 0.0
    hay = f"{path} {snippet}".lower()
    hits = 0
    for t in query_terms:
        if t in hay:
            hits += 1
    return hits / len(query_terms)


def anchor_guard_score(base_score: float, coverage: float, term_count: int) -> float:
    # Prototype scoring: keep semantic signal but enforce lexical grounding.
    entropy_bonus = 0.03 * math.log1p(term_count)
    miss_penalty = 0.12 if coverage <= 0.0 else 0.0
    return (0.84 * base_score) + (0.32 * coverage) + entropy_bonus - miss_penalty


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


def run_search(query: str, mode: str, limit: int, env: dict[str, str]) -> list[dict[str, Any]]:
    cmd = [
        str(ixos_bin()),
        "search",
        query,
        "--dir",
        "corpus_tiny",
        "--format",
        "json",
        "--limit",
        str(limit),
        "--search-mode",
        mode,
        "--cache-mode",
        "memory",
    ]
    proc = subprocess.run(
        cmd, cwd=ROOT, env=env, capture_output=True, text=True, encoding="utf-8"
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip())
    payload = json.loads(proc.stdout)
    return payload.get("results", [])


def evaluate_cases(
    cases: list[dict[str, Any]], reranked: bool, env: dict[str, str]
) -> tuple[EvalMetrics, list[CaseCompare]]:
    compares: list[CaseCompare] = []

    hit_total = 0
    banned_total = 0
    mrr_total = 0.0
    trust_total = 0.0

    for case in cases:
        q = case["query"]
        mode = case["search_mode"]
        top_k = int(case.get("top_k", 5))
        must_inc = [p for p in case.get("must_include_topk", [])]
        must_not = [p for p in case.get("must_not_include_topk", [])]

        # Pull a wider candidate window for rerank feasibility.
        results = run_search(q, mode, max(20, top_k), env)
        query_terms = tokenize(q)

        enriched: list[dict[str, Any]] = []
        for r in results:
            path = normalize_path(r.get("path", ""))
            snippet = r.get("snippet", "") or ""
            base_score = float(r.get("score", 0.0))
            coverage = term_coverage(query_terms, path, snippet)
            guarded = anchor_guard_score(base_score, coverage, len(query_terms))
            enriched.append(
                {
                    "path": path,
                    "base_score": base_score,
                    "coverage": coverage,
                    "guarded_score": guarded,
                }
            )

        baseline_sorted = sorted(enriched, key=lambda x: x["base_score"], reverse=True)
        guarded_sorted = sorted(enriched, key=lambda x: x["guarded_score"], reverse=True)

        chosen = guarded_sorted if reranked else baseline_sorted
        top = [x["path"] for x in chosen[:top_k]]

        # Compute per-case metrics
        hit = True
        if must_inc:
            for req in must_inc:
                if req not in top:
                    hit = False
                    break

        banned = False
        for bad in must_not:
            if bad in top:
                banned = True
                break

        mrr = 0.0
        if must_inc:
            first = must_inc[0]
            for idx, item in enumerate(top, start=1):
                if item == first:
                    mrr = 1.0 / idx
                    break

        trust = 0.0
        if top_k > 0:
            top_items = chosen[:top_k]
            if top_items:
                trust = sum(x["coverage"] for x in top_items) / len(top_items)

        hit_total += 1 if hit else 0
        banned_total += 1 if banned else 0
        mrr_total += mrr
        trust_total += trust

        # Build paired compare for report diagnostics
        baseline_top = [x["path"] for x in baseline_sorted[:top_k]]
        guarded_top = [x["path"] for x in guarded_sorted[:top_k]]

        baseline_hit = True
        if must_inc:
            baseline_hit = all(req in baseline_top for req in must_inc)

        reranked_hit = True
        if must_inc:
            reranked_hit = all(req in guarded_top for req in must_inc)

        baseline_banned = any(b in baseline_top for b in must_not)
        reranked_banned = any(b in guarded_top for b in must_not)

        compares.append(
            CaseCompare(
                case_id=case["id"],
                search_mode=mode,
                top_k=top_k,
                baseline_top=baseline_top,
                reranked_top=guarded_top,
                baseline_hit=baseline_hit,
                reranked_hit=reranked_hit,
                baseline_banned=baseline_banned,
                reranked_banned=reranked_banned,
            )
        )

    n = max(1, len(cases))
    metrics = EvalMetrics(
        hit_at_k=hit_total / n,
        banned_in_top_k_rate=banned_total / n,
        mrr=mrr_total / n,
        anchor_trust_at_k=trust_total / n,
    )
    return metrics, compares


def main() -> int:
    suite = json.loads(SUITE_PATH.read_text(encoding="utf-8"))
    cases = suite.get("cases", [])

    with tempfile.TemporaryDirectory(prefix="ixos_innovation_anchor_") as tmp:
        env = prepare_isolated_env(Path(tmp))
        bootstrap_env(env)
        baseline_metrics, compares = evaluate_cases(cases, reranked=False, env=env)
        rerank_metrics, _ = evaluate_cases(cases, reranked=True, env=env)

    payload = {
        "prototype": "anchor_guard_v1",
        "suite": suite.get("suite"),
        "metrics": {
            "baseline": baseline_metrics.__dict__,
            "anchor_guard": rerank_metrics.__dict__,
        },
        "cases": [
            {
                "id": c.case_id,
                "search_mode": c.search_mode,
                "top_k": c.top_k,
                "baseline_top": c.baseline_top,
                "reranked_top": c.reranked_top,
                "baseline_hit": c.baseline_hit,
                "reranked_hit": c.reranked_hit,
                "baseline_banned": c.baseline_banned,
                "reranked_banned": c.reranked_banned,
            }
            for c in compares
        ],
    }
    OUT_JSON.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    lines = [
        "# Anchor Guard Prototype Results",
        "",
        f"- Suite: `{payload['suite']}`",
        "",
        "## Metrics",
        "| Metric | Baseline | Anchor Guard | Delta |",
        "| --- | ---: | ---: | ---: |",
    ]

    for key in ["hit_at_k", "banned_in_top_k_rate", "mrr", "anchor_trust_at_k"]:
        b = payload["metrics"]["baseline"][key]
        r = payload["metrics"]["anchor_guard"][key]
        delta = r - b
        lines.append(f"| `{key}` | `{b:.4f}` | `{r:.4f}` | `{delta:+.4f}` |")

    lines.append("")
    lines.append("## Case Diff")
    for c in payload["cases"]:
        lines.append(f"### {c['id']} ({c['search_mode']})")
        lines.append(f"- Baseline top-{c['top_k']}: `{'; '.join(c['baseline_top'])}`")
        lines.append(f"- Reranked top-{c['top_k']}: `{'; '.join(c['reranked_top'])}`")
        lines.append(
            f"- Hit@k: baseline={c['baseline_hit']} -> reranked={c['reranked_hit']}; banned@k: baseline={c['baseline_banned']} -> reranked={c['reranked_banned']}"
        )

    OUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
