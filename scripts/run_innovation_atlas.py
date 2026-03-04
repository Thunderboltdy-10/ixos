#!/usr/bin/env python3
"""Run the innovation sprint atlas deterministically in an isolated environment.

Outputs:
- reports/innovation_sprint_vnext/atlas/results_latest.json
- reports/innovation_sprint_vnext/atlas/results_latest.md
"""

from __future__ import annotations

import argparse
import itertools
import json
import os
import re
import statistics
import subprocess
import tempfile
import time
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Set, Tuple

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_QUERIES = ROOT / "reports" / "innovation_sprint_vnext" / "atlas" / "queries.json"
DEFAULT_OUTPUT_DIR = ROOT / "reports" / "innovation_sprint_vnext" / "atlas"
DEFAULT_CORPUS = ROOT / "corpus_tiny"


def strip_windows_extended_prefix(path: str) -> str:
    if path.startswith("\\\\?\\"):
        return path[4:]
    if path.startswith("//?/"):
        return path[4:]
    return path


def normalize_path_for_match(path: str) -> str:
    cleaned = strip_windows_extended_prefix(path).replace("\\", "/")
    lowered = cleaned.lower()
    # Keep a unicode-aware version and an ascii-fallback version for stable matching.
    ascii_folded = (
        unicodedata.normalize("NFKD", lowered)
        .encode("ascii", "ignore")
        .decode("ascii", errors="ignore")
    )
    return ascii_folded


def normalize_expected(path: str) -> str:
    cleaned = path.replace("\\", "/").strip().lower().strip("/")
    ascii_folded = (
        unicodedata.normalize("NFKD", cleaned)
        .encode("ascii", "ignore")
        .decode("ascii", errors="ignore")
    )
    return ascii_folded


def path_matches(expected_suffixes: Sequence[str], actual_paths: Sequence[str]) -> bool:
    expected = [normalize_expected(p) for p in expected_suffixes]
    actual = [normalize_path_for_match(p) for p in actual_paths]
    for exp in expected:
        for got in actual:
            if got.endswith(exp):
                return True
    return False


TOKEN_RE = re.compile(r"[a-z0-9_.-]+")
STOP_TERMS = {
    "the",
    "a",
    "an",
    "and",
    "or",
    "for",
    "with",
    "from",
    "about",
    "show",
    "where",
    "find",
    "is",
    "are",
    "to",
    "of",
}


def extract_anchor_terms(query: str) -> List[str]:
    lowered = query.lower()
    tokens = TOKEN_RE.findall(lowered)
    keep: List[str] = []
    for tok in tokens:
        if len(tok) < 2:
            continue
        if tok in STOP_TERMS:
            continue
        keep.append(tok)
    return keep[:8]


def has_explicit_anchor_shape(query: str) -> bool:
    lowered = query.lower()
    return (
        "\"" in query
        or "--" in query
        or "/" in query
        or "." in query
        or any(ext in lowered for ext in (".md", ".txt", ".rs", ".py", ".json", ".html"))
    )


def evidence_hits(result: Dict[str, object], anchor_terms: Sequence[str]) -> int:
    path = normalize_path_for_match(str(result.get("path", "")))
    snippet = normalize_path_for_match(str(result.get("snippet", "")))
    hits = 0
    for term in anchor_terms:
        norm = normalize_expected(term)
        if norm and (norm in path or norm in snippet):
            hits += 1
    return hits


def rrf_fuse(
    flash: Sequence[Dict[str, object]],
    pro: Sequence[Dict[str, object]],
    anchor_terms: Sequence[str],
    k: int,
    flash_weight: float = 0.55,
    pro_weight: float = 0.45,
    c: int = 60,
) -> List[Dict[str, object]]:
    merged: Dict[str, Dict[str, object]] = {}
    scores: Dict[str, float] = {}

    for rank, item in enumerate(flash, start=1):
        path = str(item.get("path", ""))
        if not path:
            continue
        merged[path] = item
        scores[path] = scores.get(path, 0.0) + flash_weight / (c + rank)

    for rank, item in enumerate(pro, start=1):
        path = str(item.get("path", ""))
        if not path:
            continue
        if path not in merged:
            merged[path] = item
        scores[path] = scores.get(path, 0.0) + pro_weight / (c + rank)

    # Anchor witness bonus in fused ranking.
    for path, item in merged.items():
        hits = evidence_hits(item, anchor_terms)
        if hits > 0:
            scores[path] = scores.get(path, 0.0) + min(0.0008 * hits, 0.0032)

    ranked_paths = sorted(scores.keys(), key=lambda p: scores[p], reverse=True)[:k]
    return [merged[p] for p in ranked_paths]


def any_sensitive_match(expected_suffixes: Sequence[str], actual_paths: Sequence[str]) -> bool:
    expected = [normalize_expected(p) for p in expected_suffixes]
    actual = [normalize_path_for_match(p) for p in actual_paths]
    for exp in expected:
        for got in actual:
            if got.endswith(exp):
                return True
    return False


def jaccard(a: Set[str], b: Set[str]) -> float:
    if not a and not b:
        return 1.0
    union = a | b
    if not union:
        return 1.0
    inter = a & b
    return len(inter) / len(union)


def mean(values: Iterable[float]) -> float:
    vals = list(values)
    if not vals:
        return 0.0
    return sum(vals) / len(vals)


def percentile(values: Sequence[float], p: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    if len(ordered) == 1:
        return float(ordered[0])
    idx = int(round((len(ordered) - 1) * p))
    idx = max(0, min(idx, len(ordered) - 1))
    return float(ordered[idx])


@dataclass
class CaseRun:
    paths: List[str]
    latency_ms: float
    include_hit: bool
    top1_hit: bool
    sensitive_leak: bool
    used_controller_pro: bool
    passed: bool


def get_ixos_bin() -> Path:
    env_bin = os.environ.get("IXOS_BIN")
    if env_bin:
        return Path(env_bin)
    exe_name = "ixos.exe" if os.name == "nt" else "ixos"
    debug_bin = ROOT / "target" / "debug" / exe_name
    if debug_bin.exists():
        return debug_bin
    subprocess.check_call(["cargo", "build", "--bin", "ixos"], cwd=ROOT)
    if debug_bin.exists():
        return debug_bin
    raise SystemExit("ixos binary not found after build")


def run_cmd(cmd: List[str], env: Optional[Dict[str, str]] = None) -> subprocess.CompletedProcess:
    return subprocess.run(
        cmd,
        cwd=ROOT,
        env=env,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )


def create_isolated_env(temp_dir: Path) -> Dict[str, str]:
    env = os.environ.copy()
    env["HOME"] = str(temp_dir / "home")
    env["XDG_CONFIG_HOME"] = str(temp_dir / "config")
    env["XDG_DATA_HOME"] = str(temp_dir / "data")
    if os.name == "nt":
        env["APPDATA"] = str(temp_dir / "appdata")
    for key in ("HOME", "XDG_CONFIG_HOME", "XDG_DATA_HOME", "APPDATA"):
        value = env.get(key)
        if value:
            Path(value).mkdir(parents=True, exist_ok=True)
    return env


def bootstrap_isolated_env(bin_path: Path, env: Dict[str, str], corpus: Path) -> None:
    consent = run_cmd([str(bin_path), "compliance", "consent", "--grant"], env=env)
    if consent.returncode != 0:
        raise RuntimeError(f"consent grant failed: {consent.stderr.strip()}")
    index = run_cmd([str(bin_path), "index", str(corpus), "--clear"], env=env)
    if index.returncode != 0:
        raise RuntimeError(f"index failed: {index.stderr.strip()}")


def run_search(
    bin_path: Path,
    env: Dict[str, str],
    corpus: Path,
    query: str,
    k: int,
    search_mode: str,
    cache_mode: str,
) -> Tuple[List[Dict[str, object]], float]:
    cmd = [
        str(bin_path),
        "search",
        query,
        "--dir",
        str(corpus),
        "--format",
        "json",
        "--limit",
        str(k),
        "--search-mode",
        search_mode,
        "--cache-mode",
        cache_mode,
    ]
    started = time.perf_counter()
    result = run_cmd(cmd, env=env)
    latency_ms = (time.perf_counter() - started) * 1000.0
    if result.returncode != 0:
        raise RuntimeError(f"search failed for '{query}': {result.stderr.strip()}")
    payload = json.loads(result.stdout)
    items = payload.get("results", [])
    normalized_items: List[Dict[str, object]] = []
    for item in items[:k]:
        normalized_items.append(
            {
                "path": item.get("path", ""),
                "score": float(item.get("score", 0.0) or 0.0),
                "snippet": item.get("snippet", ""),
            }
        )
    return normalized_items, latency_ms


def run_reference_once(
    bin_path: Path,
    env: Dict[str, str],
    corpus: Path,
    query: str,
    k: int,
    reference_mode: str,
    cache_mode: str,
) -> List[str]:
    ref_results, _ = run_search(
        bin_path=bin_path,
        env=env,
        corpus=corpus,
        query=query,
        k=k,
        search_mode=reference_mode,
        cache_mode=cache_mode,
    )
    return [str(item.get("path", "")) for item in ref_results]


def apply_risk_budget_controller(
    query: str,
    flash_results: Sequence[Dict[str, object]],
    k: int,
) -> Tuple[bool, List[str]]:
    """Return risk decision and reasons for escalation."""
    if not flash_results:
        return True, ["empty_flash_results"]

    anchor_terms = extract_anchor_terms(query)
    explicit_anchor = has_explicit_anchor_shape(query)
    top1 = flash_results[0]
    top2 = flash_results[1] if len(flash_results) > 1 else {"score": 0.0}
    top1_score = float(top1.get("score", 0.0) or 0.0)
    top2_score = float(top2.get("score", 0.0) or 0.0)
    gap = top1_score - top2_score
    witness = evidence_hits(top1, anchor_terms)
    qlen = len(anchor_terms)

    low_confidence = top1_score < 0.58 or gap < 0.05
    anchor_risk = explicit_anchor and witness == 0
    short_query_risk = qlen <= 2 and gap < 0.10
    risky = low_confidence or anchor_risk or short_query_risk

    reasons: List[str] = []
    if low_confidence:
        reasons.append("low_confidence")
    if anchor_risk:
        reasons.append("anchor_risk")
    if short_query_risk:
        reasons.append("short_query_risk")
    return risky, reasons


def compute_risk_score(query: str, flash_results: Sequence[Dict[str, object]]) -> Tuple[float, List[str]]:
    if not flash_results:
        return 1.0, ["empty_flash_results"]

    anchor_terms = extract_anchor_terms(query)
    explicit_anchor = has_explicit_anchor_shape(query)
    top1 = flash_results[0]
    top2 = flash_results[1] if len(flash_results) > 1 else {"score": 0.0}
    top1_score = float(top1.get("score", 0.0) or 0.0)
    top2_score = float(top2.get("score", 0.0) or 0.0)
    gap = top1_score - top2_score
    witness = evidence_hits(top1, anchor_terms)
    qlen = len(anchor_terms)

    score = 0.0
    score += max(0.0, 0.60 - top1_score) * 2.0
    score += max(0.0, 0.08 - gap) * 3.0

    reasons: List[str] = []
    if explicit_anchor and witness == 0:
        score += 0.55
        reasons.append("anchor_risk")
    if qlen <= 2 and gap < 0.10:
        score += 0.25
        reasons.append("short_query_risk")
    if top1_score < 0.60:
        reasons.append("top1_low")
    if gap < 0.08:
        reasons.append("gap_low")

    return score, reasons


def fuse_after_escalation(
    query: str,
    flash_results: Sequence[Dict[str, object]],
    pro_results: Sequence[Dict[str, object]],
    k: int,
) -> List[Dict[str, object]]:
    anchor_terms = extract_anchor_terms(query)
    fused = rrf_fuse(flash_results, pro_results, anchor_terms=anchor_terms, k=k)
    return fused


def category_impact_text(category: str) -> str:
    if category == "anchor_exactness":
        return "Exact anchors should be reliable; misses make users distrust deterministic retrieval."
    if category == "semantic_paraphrase":
        return "Paraphrase recall drives natural-language usability; misses feel 'smart but wrong'."
    if category == "privacy_sensitive":
        return "Any leak of restricted content in benign queries is a trust/safety failure."
    if category == "ambiguous_short":
        return "Short queries stress routing; unstable or off-target top-k feels noisy and slow."
    return "Unknown category impact."


def main() -> int:
    parser = argparse.ArgumentParser(description="Run innovation atlas deterministically.")
    parser.add_argument("--queries", type=Path, default=DEFAULT_QUERIES)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--corpus", type=Path, default=DEFAULT_CORPUS)
    parser.add_argument("--runs", type=int, default=5)
    parser.add_argument("--k", type=int, default=10)
    parser.add_argument("--search-mode", type=str, default="flash")
    parser.add_argument("--cache-mode", type=str, default="memory")
    parser.add_argument("--reference-mode", type=str, default="")
    parser.add_argument(
        "--controller",
        choices=["baseline", "risk_budget_v1", "risk_budget_v2"],
        default="baseline",
    )
    parser.add_argument("--controller-pro-mode", type=str, default="pro")
    parser.add_argument("--controller-budget-rate", type=float, default=0.25)
    args = parser.parse_args()

    if args.runs < 2:
        raise SystemExit("--runs must be >= 2 for stability metrics.")
    if not args.queries.exists():
        raise SystemExit(f"queries file missing: {args.queries}")
    if not args.corpus.exists():
        raise SystemExit(f"corpus missing: {args.corpus}")

    spec = json.loads(args.queries.read_text(encoding="utf-8-sig"))
    cases = spec.get("cases", [])
    if not cases:
        raise SystemExit("no atlas cases found")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    bin_path = get_ixos_bin()

    started_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    all_latencies: List[float] = []
    per_case: List[Dict[str, object]] = []
    controller_pro_calls = 0
    controller_total_decisions = 0

    with tempfile.TemporaryDirectory(prefix="ixos_innovation_atlas_") as td:
        env = create_isolated_env(Path(td))
        bootstrap_isolated_env(bin_path, env, args.corpus)

        for case in cases:
            case_id = case["id"]
            category = case["category"]
            query = case["query"]
            must_include_any = case.get("must_include_any", [])
            must_exclude = case.get("must_exclude", [])

            runs: List[CaseRun] = []
            norm_sets: List[Set[str]] = []

            for _ in range(args.runs):
                flash_results, flash_latency = run_search(
                    bin_path=bin_path,
                    env=env,
                    corpus=args.corpus,
                    query=query,
                    k=args.k,
                    search_mode=args.search_mode,
                    cache_mode=args.cache_mode,
                )
                final_results = flash_results
                latency_ms = flash_latency
                used_controller_pro = False
                controller_reasons: List[str] = []
                if args.controller == "risk_budget_v1":
                    risky, reasons = apply_risk_budget_controller(
                        query=query,
                        flash_results=flash_results,
                        k=args.k,
                    )
                    controller_total_decisions += 1
                    if risky:
                        pro_results, pro_latency = run_search(
                            bin_path=bin_path,
                            env=env,
                            corpus=args.corpus,
                            query=query,
                            k=args.k,
                            search_mode=args.controller_pro_mode,
                            cache_mode=args.cache_mode,
                        )
                        final_results = fuse_after_escalation(
                            query=query,
                            flash_results=flash_results,
                            pro_results=pro_results,
                            k=args.k,
                        )
                        used_controller_pro = True
                        controller_reasons = reasons
                        controller_pro_calls += 1
                        latency_ms = flash_latency + pro_latency
                elif args.controller == "risk_budget_v2":
                    risk_score, reasons = compute_risk_score(query, flash_results)
                    controller_total_decisions += 1
                    current_rate = controller_pro_calls / max(1, controller_total_decisions)
                    should_escalate = (
                        risk_score >= 0.55 and current_rate < args.controller_budget_rate
                    )
                    if should_escalate:
                        pro_results, pro_latency = run_search(
                            bin_path=bin_path,
                            env=env,
                            corpus=args.corpus,
                            query=query,
                            k=args.k,
                            search_mode=args.controller_pro_mode,
                            cache_mode=args.cache_mode,
                        )
                        final_results = fuse_after_escalation(
                            query=query,
                            flash_results=flash_results,
                            pro_results=pro_results,
                            k=args.k,
                        )
                        used_controller_pro = True
                        controller_reasons = reasons + [f"risk_score={risk_score:.3f}"]
                        controller_pro_calls += 1
                        latency_ms = flash_latency + pro_latency

                paths = [str(item.get("path", "")) for item in final_results]
                include_hit = True
                top1_hit = True
                if must_include_any:
                    include_hit = path_matches(must_include_any, paths)
                    top1_hit = path_matches(must_include_any, paths[:1])
                sensitive_leak = False
                if must_exclude:
                    sensitive_leak = any_sensitive_match(must_exclude, paths)
                passed = include_hit and not sensitive_leak
                runs.append(
                    CaseRun(
                        paths=paths,
                        latency_ms=latency_ms,
                        include_hit=include_hit,
                        top1_hit=top1_hit,
                        sensitive_leak=sensitive_leak,
                        used_controller_pro=used_controller_pro,
                        passed=passed,
                    )
                )
                norm_sets.append({normalize_path_for_match(p) for p in paths})
                all_latencies.append(latency_ms)

            pairwise = [
                jaccard(a, b)
                for a, b in itertools.combinations(norm_sets, 2)
            ]
            avg_jaccard = mean(pairwise)
            unique_top1 = len({(r.paths[0] if r.paths else "") for r in runs})

            reference_paths: List[str] = []
            agreement = None
            if args.reference_mode:
                reference_paths = run_reference_once(
                    bin_path=bin_path,
                    env=env,
                    corpus=args.corpus,
                    query=query,
                    k=args.k,
                    reference_mode=args.reference_mode,
                    cache_mode=args.cache_mode,
                )
                agreement = jaccard(
                    {normalize_path_for_match(p) for p in runs[0].paths},
                    {normalize_path_for_match(p) for p in reference_paths},
                )

            per_case.append(
                {
                    "id": case_id,
                    "category": category,
                    "query": query,
                    "must_include_any": must_include_any,
                    "must_exclude": must_exclude,
                    "passes": sum(1 for r in runs if r.passed),
                    "runs": args.runs,
                    "pass_rate": round(mean(1.0 if r.passed else 0.0 for r in runs), 4),
                    "anchor_hit_rate": round(mean(1.0 if r.include_hit else 0.0 for r in runs), 4),
                    "top1_hit_rate": round(mean(1.0 if r.top1_hit else 0.0 for r in runs), 4),
                    "sensitive_leak_rate": round(
                        mean(1.0 if r.sensitive_leak else 0.0 for r in runs), 4
                    ),
                    "plausible_wrong_rate": round(
                        mean(1.0 if (r.include_hit and not r.top1_hit) else 0.0 for r in runs), 4
                    ),
                    "jaccard_at_k_5run": round(avg_jaccard, 4),
                    "unique_top1_paths": unique_top1,
                    "latency_ms_p50": round(percentile([r.latency_ms for r in runs], 0.50), 2),
                    "latency_ms_p95": round(percentile([r.latency_ms for r in runs], 0.95), 2),
                    "topk_paths_by_run": [r.paths for r in runs],
                    "reference_topk": reference_paths,
                    "agreement_with_reference": round(agreement, 4) if agreement is not None else None,
                    "impact_if_fail": category_impact_text(category),
                    "controller_pro_calls": int(sum(1 for r in runs if r.used_controller_pro)),
                    "controller_last_reasons": controller_reasons,
                }
            )

    def by_category(cat: str) -> List[Dict[str, object]]:
        return [c for c in per_case if c["category"] == cat]

    anchor_cases = by_category("anchor_exactness")
    sensitive_cases = by_category("privacy_sensitive")

    summary = {
        "generated_at": started_at,
        "queries_file": str(args.queries),
        "corpus": str(args.corpus),
        "search_mode": args.search_mode,
        "cache_mode": args.cache_mode,
        "reference_mode": args.reference_mode or None,
        "controller": args.controller,
        "controller_pro_mode": args.controller_pro_mode if args.controller != "baseline" else None,
        "controller_budget_rate": args.controller_budget_rate if args.controller == "risk_budget_v2" else None,
        "runs_per_case": args.runs,
        "k": args.k,
        "cases": len(per_case),
        "controller_pro_calls": controller_pro_calls,
        "controller_pro_call_rate": round(
            controller_pro_calls / max(1, len(per_case) * args.runs), 4
        ),
        "overall_pass_rate": round(mean(c["pass_rate"] for c in per_case), 4),
        "AnchorHit_at_k": round(mean(c["anchor_hit_rate"] for c in anchor_cases), 4),
        "AnchorTop1Hit_at_1": round(mean(c["top1_hit_rate"] for c in anchor_cases), 4),
        "SensitiveLeak_at_k": round(mean(c["sensitive_leak_rate"] for c in sensitive_cases), 4),
        "PlausibleWrong_at_k": round(
            mean(
                c["plausible_wrong_rate"]
                for c in per_case
                if c["must_include_any"]
            ),
            4,
        ),
        "Jaccard_at_k_stability": round(mean(c["jaccard_at_k_5run"] for c in per_case), 4),
        "latency_ms_p50": round(percentile(all_latencies, 0.50), 2),
        "latency_ms_p95": round(percentile(all_latencies, 0.95), 2),
        "reference_agreement_avg": (
            round(
                mean(
                    c["agreement_with_reference"]
                    for c in per_case
                    if c["agreement_with_reference"] is not None
                ),
                4,
            )
            if args.reference_mode
            else None
        ),
    }

    payload = {"summary": summary, "cases": per_case}
    json_out = args.output_dir / "results_latest.json"
    json_out.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    failing = sorted(per_case, key=lambda c: (c["pass_rate"], c["category"], c["id"]))
    lines: List[str] = []
    lines.append("# Innovation Atlas Results")
    lines.append("")
    lines.append(f"- Generated: `{summary['generated_at']}`")
    lines.append(f"- Query file: `{summary['queries_file']}`")
    lines.append(f"- Corpus: `{summary['corpus']}`")
    lines.append(f"- Search mode: `{summary['search_mode']}`")
    lines.append(f"- Cache mode: `{summary['cache_mode']}`")
    lines.append(f"- Reference mode: `{summary['reference_mode']}`")
    lines.append(f"- Controller: `{summary['controller']}`")
    lines.append(f"- Controller pro mode: `{summary['controller_pro_mode']}`")
    lines.append(f"- Runs/case: `{summary['runs_per_case']}`")
    lines.append(f"- K: `{summary['k']}`")
    lines.append("")
    lines.append("## Metric Summary")
    lines.append("")
    lines.append("| Metric | Value |")
    lines.append("| --- | ---: |")
    lines.append(f"| OverallPassRate | {summary['overall_pass_rate']} |")
    lines.append(f"| ControllerProCallRate | {summary['controller_pro_call_rate']} |")
    lines.append(f"| AnchorHit@k | {summary['AnchorHit_at_k']} |")
    lines.append(f"| AnchorTop1Hit@1 | {summary['AnchorTop1Hit_at_1']} |")
    lines.append(f"| SensitiveLeak@k | {summary['SensitiveLeak_at_k']} |")
    lines.append(f"| PlausibleWrong@k | {summary['PlausibleWrong_at_k']} |")
    lines.append(f"| Jaccard@k Stability | {summary['Jaccard_at_k_stability']} |")
    lines.append(f"| Latency p50 (ms) | {summary['latency_ms_p50']} |")
    lines.append(f"| Latency p95 (ms) | {summary['latency_ms_p95']} |")
    lines.append(f"| Agreement@k (reference) | {summary['reference_agreement_avg']} |")
    lines.append("")
    lines.append("## Lowest-Pass Cases")
    lines.append("")
    lines.append(
        "| Case | Category | PassRate | AnchorHit | Top1Hit | PlausibleWrong | LeakRate | Jaccard | Top1Unique |"
    )
    lines.append("| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |")
    for case in failing[:15]:
        lines.append(
            f"| {case['id']} | {case['category']} | {case['pass_rate']} | "
            f"{case['anchor_hit_rate']} | {case['top1_hit_rate']} | "
            f"{case['plausible_wrong_rate']} | {case['sensitive_leak_rate']} | "
            f"{case['jaccard_at_k_5run']} | {case['unique_top1_paths']} |"
        )
    lines.append("")
    lines.append("## Case Cards")
    lines.append("")
    for case in per_case:
        lines.append(f"### {case['id']} ({case['category']})")
        lines.append(f"- Query: `{case['query']}`")
        lines.append(f"- Expected include(any): `{case['must_include_any']}`")
        lines.append(f"- Expected exclude: `{case['must_exclude']}`")
        lines.append(f"- User impact if fail: {case['impact_if_fail']}")
        lines.append(
            f"- Observed: pass_rate={case['pass_rate']}, "
            f"jaccard={case['jaccard_at_k_5run']}, "
            f"top1_unique={case['unique_top1_paths']}"
        )
        lines.append("")

    md_out = args.output_dir / "results_latest.md"
    md_out.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")

    print(f"Wrote {json_out}")
    print(f"Wrote {md_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
