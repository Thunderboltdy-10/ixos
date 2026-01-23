#!/usr/bin/env python3
"""
Aggregate Ixos model lab results into a single leaderboard with comparability flags.

Reads all results_*.json and results_*.csv under models/lab/ and emits:
- models/lab/leaderboard_aggregate.json
- models/lab/leaderboard_aggregate.csv

This script intentionally avoids heavy deps so it can run in any repo checkout.
"""
from __future__ import annotations

import csv
import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

ROOT = Path(__file__).resolve().parents[1]
LAB_DIR = ROOT / "models" / "lab"
DATASET_DIR = ROOT / "dataset"


def _load_manifest() -> Dict[str, Dict[str, Any]]:
    manifest_path = LAB_DIR / "manifest.json"
    if not manifest_path.exists():
        return {}
    payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    candidates = payload.get("candidates", [])
    return {c.get("id", ""): c for c in candidates}


def _synthetic_specs_count(difficulty: str) -> int:
    tiers = {"small": 3, "medium": 6, "large": 10}
    repeats = tiers.get(difficulty, 6)
    core = [
        ("finance", "report_2023.txt"),
        ("finance", "budget_2024.txt"),
        ("finance", "q4_summary.txt"),
        ("ops", "report_2023.txt"),
        ("ops", "budget_2024.txt"),
        ("ops", "q4_summary.txt"),
        ("legal", "report_2023.txt"),
        ("legal", "policy_review.txt"),
        ("hr", "report_2023.txt"),
        ("hr", "policy_review.txt"),
        ("marketing", "report_2023.txt"),
        ("marketing", "q4_summary.txt"),
        ("security", "incident_report.txt"),
        ("security", "policy_review.txt"),
        ("product", "roadmap_2024.txt"),
        ("product", "q4_summary.txt"),
    ]
    extra = [
        ("sales", "report_2023.txt"),
        ("engineering", "report_2023.txt"),
        ("research", "report_2023.txt"),
        ("support", "report_2023.txt"),
        ("compliance", "report_2023.txt"),
        ("design", "q4_summary.txt"),
        ("it", "incident_report.txt"),
        ("legal", "incident_report.txt"),
        ("ops", "incident_report.txt"),
        ("finance", "incident_report.txt"),
    ]
    specs: List[Tuple[str, str]] = []
    specs.extend(core)
    if difficulty in ("medium", "large"):
        specs.extend(extra)
    if difficulty == "large":
        specs.extend(extra)
    hard_names = ["summary.txt", "overview.txt", "plan.txt", "notes.txt", "report_2023.txt"]
    hard_dirs = ["finance", "ops", "legal", "hr", "marketing", "security", "product", "sales"]
    for name in hard_names[:repeats]:
        for d in hard_dirs[: 3 + repeats]:
            specs.append((d, name))
    return len(specs)


def _synthetic_query_count(difficulty: str) -> int:
    base_queries = [
        "finance 2023 report",
        "ops 2023 report",
        "legal compliance report 2023",
        "hr report 2023 retention",
        "marketing report 2023 roi",
        "ops budget 2024 staffing",
        "finance budget 2024 allocation",
        "policy review contracts legal",
        "policy review benefits hr",
        "security policy review mfa",
        "incident report access anomaly",
        "product roadmap 2024",
        "q4 summary marketing cac",
        "q4 summary operations sla",
        "q4 summary finance risk",
    ]
    variants: List[str] = []
    for q in base_queries:
        toks = q.split()
        if len(toks) > 2:
            variants.append(" ".join(toks[:2]))
        if "report" in q:
            variants.append(q.replace("report", "repot"))
        if "summary" in q:
            variants.append(q.replace("summary", "sumary"))
        variants.append(q.replace(" ", ""))
    if difficulty == "small":
        return len(base_queries)
    if difficulty == "medium":
        return len(base_queries) + len(variants[: len(base_queries)])
    return len(base_queries) + len(variants)


def _real_corpus_total_docs() -> int:
    if not DATASET_DIR.exists():
        return 0
    count = 0
    for path in DATASET_DIR.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() in {".txt", ".md", ".json"}:
            count += 1
    return count


def _json_results_files() -> List[Path]:
    return sorted([p for p in LAB_DIR.glob("results_*.json") if p.is_file()])


def _csv_results_files() -> List[Path]:
    return sorted([p for p in LAB_DIR.glob("results_*.csv") if p.is_file()])


def _as_float(val: Any) -> Optional[float]:
    if val is None:
        return None
    try:
        return float(val)
    except Exception:
        return None


def _as_int(val: Any) -> Optional[int]:
    if val is None:
        return None
    try:
        return int(val)
    except Exception:
        return None


def _run_tag(source_file: Path) -> str:
    stem = source_file.stem
    if stem.startswith("results_"):
        return stem[len("results_") :]
    return stem


def _source_hint(source_file: Path) -> str:
    tag = _run_tag(source_file)
    if re.search(r"sweep|ablation|fusion|routing|rerank|distill", tag):
        return "special_run"
    if re.search(r"^b\d", tag):
        return "batch_run"
    if re.search(r"^synth", tag):
        return "synth_only"
    if tag == "latest":
        return "latest"
    return "unknown"


def _suite_family(suite: Optional[str]) -> str:
    if not suite:
        return "unknown"
    if "synthetic" in suite:
        return "synthetic"
    if "real" in suite:
        return "real"
    return "unknown"


def _flatten_weights(weights: Any) -> str:
    if not isinstance(weights, dict):
        return ""
    parts = []
    for key in ("flash", "pro", "lexical", "dir_prior"):
        if key in weights:
            parts.append(f"{key}={weights[key]:.4f}")
    return ";".join(parts)


def _merge_row(base: Dict[str, Any], incoming: Dict[str, Any]) -> None:
    # Prefer higher MRR when duplicate keys appear.
    def _metric(row: Dict[str, Any]) -> float:
        try:
            return float(row.get("mrr_at_10") or 0.0)
        except Exception:
            return 0.0

    replace_all = False
    if incoming.get("mrr_at_10") not in (None, ""):
        if _metric(incoming) > _metric(base):
            replace_all = True

    for key, val in incoming.items():
        if key in ("source_files", "source_formats"):
            continue
        if replace_all:
            base[key] = val
            continue
        if base.get(key) in (None, "") and val not in (None, ""):
            base[key] = val
    base.setdefault("source_files", [])
    base.setdefault("source_formats", [])
    for path in incoming.get("source_files", []):
        if path not in base["source_files"]:
            base["source_files"].append(path)
    for fmt in incoming.get("source_formats", []):
        if fmt not in base["source_formats"]:
            base["source_formats"].append(fmt)


def _collect_json_rows(manifest: Dict[str, Dict[str, Any]]) -> Dict[Tuple[Any, ...], Dict[str, Any]]:
    rows: Dict[Tuple[Any, ...], Dict[str, Any]] = {}
    for path in _json_results_files():
        payload = json.loads(path.read_text(encoding="utf-8"))
        difficulty = payload.get("difficulty")
        runs = payload.get("runs")
        if runs is None:
            runs = [payload]
        for run in runs:
            run_candidate_cap = run.get("candidate_cap") or payload.get("candidate_cap")
            run_batch_size = run.get("batch_size") or payload.get("batch_size")
            run_topk = run.get("topk") or payload.get("topk")
            run_suite = run.get("suite") or payload.get("suite")
            run_real_limit = run.get("real_limit") or payload.get("real_limit")
            run_real_queries = run.get("real_queries") or payload.get("real_queries")
            run_tag = _run_tag(path)
            source_hint = _source_hint(path)
            models = run.get("models", []) or []
            for model_entry in models:
                model_id = model_entry.get("id")
                manifest_entry = manifest.get(model_id, {})
                for result in model_entry.get("results", []) or []:
                    suite = result.get("suite")
                    suite_family = _suite_family(suite)
                    row = {
                        "kind": "embedder",
                        "model_id": model_id,
                        "model_path": model_entry.get("path"),
                        "suite": suite,
                        "suite_family": suite_family,
                        "recall_at_10": _as_float(result.get("recall_at_10")),
                        "mrr_at_10": _as_float(result.get("mrr_at_10")),
                        "latency_ms_per_1k": _as_float(result.get("latency_ms_per_1k")),
                        "load_time_ms": _as_float(result.get("load_time_ms")),
                        "memory_delta_mb": _as_float(result.get("memory_delta_mb")),
                        "avg_candidates": _as_float(result.get("avg_candidates")),
                        "doc_count": _as_int(result.get("doc_count")),
                        "query_count": _as_int(result.get("query_count")),
                        "batch_size": _as_int(result.get("batch_size") or run_batch_size),
                        "candidate_cap": _as_int(result.get("candidate_cap") or run_candidate_cap),
                        "topk": _as_int(result.get("topk") or run_topk),
                        "difficulty": difficulty,
                        "real_limit": _as_int(run_real_limit),
                        "real_queries": _as_int(run_real_queries),
                        "backend": manifest_entry.get("backend"),
                        "tier": manifest_entry.get("tier"),
                        "license": manifest_entry.get("license"),
                        "size_mb": manifest_entry.get("size_mb"),
                        "quantize_to": manifest_entry.get("quantize_to"),
                        "hf_id": manifest_entry.get("hf_id"),
                        "run_tag": run_tag,
                        "source_hint": source_hint,
                        "source_files": [path.name],
                        "source_formats": ["json"],
                    }
                    key = (
                        row["kind"],
                        row["model_id"],
                        row["suite"],
                        row["candidate_cap"],
                        row["batch_size"],
                        row["topk"],
                        row["difficulty"],
                    )
                    if key in rows:
                        _merge_row(rows[key], row)
                    else:
                        rows[key] = row

            for fusion_entry in run.get("fusion", []) or []:
                suite = fusion_entry.get("suite")
                row = {
                    "kind": "fusion",
                    "model_id": "",
                    "model_path": "",
                    "suite": suite,
                    "suite_family": _suite_family(suite),
                    "recall_at_10": _as_float(fusion_entry.get("recall_at_10")),
                    "mrr_at_10": _as_float(fusion_entry.get("mrr_at_10")),
                    "latency_ms_per_1k": _as_float(fusion_entry.get("latency_ms_per_1k")),
                    "load_time_ms": _as_float(fusion_entry.get("load_time_ms")),
                    "memory_delta_mb": _as_float(fusion_entry.get("memory_delta_mb")),
                    "avg_candidates": _as_float(fusion_entry.get("avg_candidates")),
                    "doc_count": _as_int(fusion_entry.get("doc_count")),
                    "query_count": _as_int(fusion_entry.get("query_count")),
                    "batch_size": _as_int(fusion_entry.get("batch_size") or run_batch_size),
                    "candidate_cap": _as_int(fusion_entry.get("candidate_cap") or run_candidate_cap),
                    "topk": _as_int(fusion_entry.get("topk") or run_topk),
                    "difficulty": difficulty,
                    "real_limit": _as_int(run_real_limit),
                    "real_queries": _as_int(run_real_queries),
                    "backend": "fusion",
                    "tier": "fusion",
                    "license": "",
                    "size_mb": None,
                    "quantize_to": "",
                    "hf_id": "",
                    "strategy": fusion_entry.get("strategy"),
                    "weights": _flatten_weights(fusion_entry.get("weights")),
                    "run_tag": run_tag,
                    "source_hint": source_hint,
                    "source_files": [path.name],
                    "source_formats": ["json"],
                }
                key = (
                    row["kind"],
                    row.get("strategy"),
                    row.get("weights"),
                    row["suite"],
                    row["candidate_cap"],
                    row["batch_size"],
                    row["topk"],
                    row["difficulty"],
                )
                if key in rows:
                    _merge_row(rows[key], row)
                else:
                    rows[key] = row

            for routing_entry in run.get("routing", []) or []:
                suite = routing_entry.get("suite")
                row = {
                    "kind": "routing",
                    "model_id": "",
                    "model_path": "",
                    "suite": suite,
                    "suite_family": _suite_family(suite),
                    "recall_at_10": _as_float(routing_entry.get("recall_at_10")),
                    "mrr_at_10": _as_float(routing_entry.get("mrr_at_10")),
                    "latency_ms_per_1k": _as_float(routing_entry.get("latency_ms_per_1k")),
                    "load_time_ms": _as_float(routing_entry.get("load_time_ms")),
                    "memory_delta_mb": _as_float(routing_entry.get("memory_delta_mb")),
                    "avg_candidates": _as_float(routing_entry.get("avg_candidates")),
                    "doc_count": _as_int(routing_entry.get("doc_count")),
                    "query_count": _as_int(routing_entry.get("query_count")),
                    "batch_size": _as_int(routing_entry.get("batch_size") or run_batch_size),
                    "candidate_cap": _as_int(routing_entry.get("candidate_cap") or run_candidate_cap),
                    "topk": _as_int(routing_entry.get("topk") or run_topk),
                    "difficulty": difficulty,
                    "real_limit": _as_int(run_real_limit),
                    "real_queries": _as_int(run_real_queries),
                    "backend": "routing",
                    "tier": "routing",
                    "license": "",
                    "size_mb": None,
                    "quantize_to": "",
                    "hf_id": "",
                    "gap_threshold": routing_entry.get("gap_threshold"),
                    "lexical_threshold": routing_entry.get("lexical_threshold"),
                    "short_len": routing_entry.get("short_len"),
                    "run_tag": run_tag,
                    "source_hint": source_hint,
                    "source_files": [path.name],
                    "source_formats": ["json"],
                }
                key = (
                    row["kind"],
                    row.get("gap_threshold"),
                    row.get("lexical_threshold"),
                    row.get("short_len"),
                    row["suite"],
                    row["candidate_cap"],
                    row["batch_size"],
                    row["topk"],
                    row["difficulty"],
                )
                if key in rows:
                    _merge_row(rows[key], row)
                else:
                    rows[key] = row

            for reranker_entry in run.get("rerankers", []) or []:
                model_id = reranker_entry.get("id")
                manifest_entry = manifest.get(model_id, {})
                for result in reranker_entry.get("results", []) or []:
                    suite = result.get("suite")
                    row = {
                        "kind": "reranker",
                        "model_id": model_id,
                        "model_path": reranker_entry.get("path"),
                        "suite": suite,
                        "suite_family": _suite_family(suite),
                        "recall_at_10": _as_float(result.get("recall_at_10")),
                        "mrr_at_10": _as_float(result.get("mrr_at_10")),
                        "latency_ms_per_1k": _as_float(result.get("latency_ms_per_1k")),
                        "load_time_ms": _as_float(result.get("load_time_ms")),
                        "memory_delta_mb": _as_float(result.get("memory_delta_mb")),
                        "avg_candidates": _as_float(result.get("avg_candidates")),
                        "doc_count": _as_int(result.get("doc_count")),
                        "query_count": _as_int(result.get("query_count")),
                        "batch_size": _as_int(result.get("batch_size") or run_batch_size),
                        "candidate_cap": _as_int(result.get("candidate_cap") or run_candidate_cap),
                        "topk": _as_int(result.get("topk") or run_topk),
                        "difficulty": difficulty,
                        "real_limit": _as_int(run_real_limit),
                        "real_queries": _as_int(run_real_queries),
                        "backend": manifest_entry.get("backend"),
                        "tier": manifest_entry.get("tier"),
                        "license": manifest_entry.get("license"),
                        "size_mb": manifest_entry.get("size_mb"),
                        "quantize_to": manifest_entry.get("quantize_to"),
                        "hf_id": manifest_entry.get("hf_id"),
                        "rerank_topk": result.get("rerank_topk"),
                        "run_tag": run_tag,
                        "source_hint": source_hint,
                        "source_files": [path.name],
                        "source_formats": ["json"],
                    }
                    key = (
                        row["kind"],
                        row["model_id"],
                        row["suite"],
                        row["candidate_cap"],
                        row["batch_size"],
                        row["topk"],
                        row["difficulty"],
                        row.get("rerank_topk"),
                    )
                    if key in rows:
                        _merge_row(rows[key], row)
                    else:
                        rows[key] = row
    return rows


def _merge_csv_rows(
    rows: Dict[Tuple[Any, ...], Dict[str, Any]],
    manifest: Dict[str, Dict[str, Any]],
) -> None:
    # Build a simple index for merging CSV into JSON-derived rows.
    index: Dict[Tuple[Any, ...], Tuple[Any, ...]] = {}
    for key, row in rows.items():
        if row.get("kind") != "embedder":
            continue
        simple_key = (
            row.get("model_id"),
            row.get("suite"),
            row.get("candidate_cap"),
            row.get("batch_size"),
        )
        index[simple_key] = key

    for path in _csv_results_files():
        with path.open("r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for csv_row in reader:
                model_id = csv_row.get("model_id")
                suite = csv_row.get("suite")
                candidate_cap = _as_int(csv_row.get("candidate_cap"))
                batch_size = _as_int(csv_row.get("batch_size"))
                simple_key = (model_id, suite, candidate_cap, batch_size)
                manifest_entry = manifest.get(model_id or "", {})
                row = {
                    "kind": "embedder",
                    "model_id": model_id,
                    "model_path": "",
                    "suite": suite,
                    "suite_family": _suite_family(suite),
                    "recall_at_10": _as_float(csv_row.get("recall_at_10")),
                    "mrr_at_10": _as_float(csv_row.get("mrr_at_10")),
                    "latency_ms_per_1k": _as_float(csv_row.get("latency_ms_per_1k")),
                    "load_time_ms": _as_float(csv_row.get("load_time_ms")),
                    "memory_delta_mb": _as_float(csv_row.get("memory_delta_mb")),
                    "batch_size": batch_size,
                    "candidate_cap": candidate_cap,
                    "topk": None,
                    "difficulty": None,
                    "backend": manifest_entry.get("backend"),
                    "tier": manifest_entry.get("tier"),
                    "license": manifest_entry.get("license"),
                    "size_mb": manifest_entry.get("size_mb"),
                    "quantize_to": manifest_entry.get("quantize_to"),
                    "hf_id": manifest_entry.get("hf_id"),
                    "run_tag": _run_tag(path),
                    "source_hint": _source_hint(path),
                    "source_files": [path.name],
                    "source_formats": ["csv"],
                }
                if simple_key in index:
                    _merge_row(rows[index[simple_key]], row)
                else:
                    key = (
                        row["kind"],
                        row["model_id"],
                        row["suite"],
                        row["candidate_cap"],
                        row["batch_size"],
                        row["topk"],
                        row["difficulty"],
                    )
                    if key in rows:
                        _merge_row(rows[key], row)
                    else:
                        rows[key] = row


def _apply_suite_counts(rows: Dict[Tuple[Any, ...], Dict[str, Any]]) -> None:
    for row in rows.values():
        suite = row.get("suite")
        difficulty = row.get("difficulty")
        suite_family = row.get("suite_family")
        if suite_family == "synthetic" and isinstance(difficulty, str):
            row["suite_query_count"] = _synthetic_query_count(difficulty)
            row["suite_doc_count"] = _synthetic_specs_count(difficulty)
        elif suite_family == "real":
            row["suite_query_count"] = row.get("query_count")
            row["suite_doc_count"] = row.get("doc_count")
        else:
            row.setdefault("suite_query_count", row.get("query_count"))
            row.setdefault("suite_doc_count", row.get("doc_count"))


def _apply_real_limits(rows: Dict[Tuple[Any, ...], Dict[str, Any]]) -> None:
    # Only populate if explicit info exists in row (currently none). Placeholder for future runs.
    for row in rows.values():
        row.setdefault("real_limit", None)
        row.setdefault("real_queries", None)


def _apply_comparability(rows: Dict[Tuple[Any, ...], Dict[str, Any]]) -> None:
    # Determine modal settings per (kind, suite_family, suite) to compare against.
    settings_counter: Dict[Tuple[str, str, str], Counter] = defaultdict(Counter)
    for row in rows.values():
        kind = row.get("kind") or "unknown"
        suite_family = row.get("suite_family") or "unknown"
        suite = row.get("suite") or "unknown"
        settings = (
            row.get("candidate_cap"),
            row.get("batch_size"),
            row.get("topk"),
            row.get("difficulty"),
        )
        settings_counter[(kind, suite_family, suite)][settings] += 1

    modal_settings: Dict[Tuple[str, str, str], Tuple[Any, ...]] = {}
    for key, counter in settings_counter.items():
        if not counter:
            continue
        modal_settings[key] = counter.most_common(1)[0][0]

    for row in rows.values():
        kind = row.get("kind") or "unknown"
        suite_family = row.get("suite_family") or "unknown"
        suite = row.get("suite") or "unknown"
        settings = (
            row.get("candidate_cap"),
            row.get("batch_size"),
            row.get("topk"),
            row.get("difficulty"),
        )
        reasons: List[str] = []
        warnings: List[str] = []
        modal = modal_settings.get((kind, suite_family, suite))
        if modal and settings != modal:
            if settings[0] != modal[0]:
                reasons.append("candidate_cap_mismatch")
            if settings[1] != modal[1]:
                reasons.append("batch_size_mismatch")
            if settings[2] != modal[2]:
                reasons.append("topk_mismatch")
            if settings[3] != modal[3]:
                reasons.append("difficulty_mismatch")
        if suite_family == "real":
            if row.get("real_queries") is None:
                warnings.append("real_size_unknown")
        if row.get("source_hint") in {"special_run", "batch_run"}:
            warnings.append("special_run")
        row["non_comparable_reasons"] = ";".join(sorted(set(reasons)))
        row["warnings"] = ";".join(sorted(set(warnings)))
        row["comparable"] = False if reasons else True


def _write_outputs(rows: Dict[Tuple[Any, ...], Dict[str, Any]]) -> None:
    rows_list = list(rows.values())
    rows_list.sort(key=lambda r: (r.get("kind", ""), r.get("suite", ""), r.get("model_id", "")))

    out_json = {
        "metadata": {
            "synthetic_counts": {
                "small": {
                    "queries": _synthetic_query_count("small"),
                    "docs": _synthetic_specs_count("small"),
                },
                "medium": {
                    "queries": _synthetic_query_count("medium"),
                    "docs": _synthetic_specs_count("medium"),
                },
                "large": {
                    "queries": _synthetic_query_count("large"),
                    "docs": _synthetic_specs_count("large"),
                },
            },
            "real_corpus_total_docs": _real_corpus_total_docs(),
        },
        "rows": rows_list,
    }
    (LAB_DIR / "leaderboard_aggregate.json").write_text(
        json.dumps(out_json, indent=2), encoding="utf-8"
    )

    # CSV output
    fieldnames = [
        "kind",
        "model_id",
        "suite",
        "recall_at_10",
        "mrr_at_10",
        "latency_ms_per_1k",
        "load_time_ms",
        "memory_delta_mb",
        "avg_candidates",
        "batch_size",
        "candidate_cap",
        "topk",
        "difficulty",
        "real_limit",
        "real_queries",
        "suite_query_count",
        "suite_doc_count",
        "doc_count",
        "query_count",
        "backend",
        "tier",
        "license",
        "size_mb",
        "quantize_to",
        "hf_id",
        "strategy",
        "weights",
        "rerank_topk",
        "gap_threshold",
        "lexical_threshold",
        "short_len",
        "run_tag",
        "source_hint",
        "source_files",
        "source_formats",
        "comparable",
        "non_comparable_reasons",
        "warnings",
    ]
    with (LAB_DIR / "leaderboard_aggregate.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows_list:
            out = {k: row.get(k, "") for k in fieldnames}
            # Flatten lists
            if isinstance(out.get("source_files"), list):
                out["source_files"] = ";".join(out["source_files"])
            if isinstance(out.get("source_formats"), list):
                out["source_formats"] = ";".join(out["source_formats"])
            writer.writerow(out)


def main() -> None:
    manifest = _load_manifest()
    rows = _collect_json_rows(manifest)
    _merge_csv_rows(rows, manifest)
    _apply_suite_counts(rows)
    _apply_real_limits(rows)
    _apply_comparability(rows)
    _write_outputs(rows)


if __name__ == "__main__":
    main()
