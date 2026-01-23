#!/usr/bin/env python3
import argparse
import json
from datetime import datetime
from pathlib import Path


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def ms(value):
    return f"{int(round(value))}ms"


def pct(value):
    return f"{value:.1f}%"


def corpus_summary(baseline: dict):
    corpus = baseline.get("corpus", {})
    return {
        "files": corpus.get("total_files", 0),
        "totalSize": f"{corpus.get('total_size_mb', 0):.2f} MB",
        "avgFileSize": f"{corpus.get('avg_file_size_bytes', 0)} bytes",
    }


def summary_metrics(baseline: dict):
    summary = baseline.get("summary", {})
    return summary


def stage_breakdown(baseline: dict):
    stages = baseline.get("stages", {})
    return {
        "directoryWalkP95": ms(stages.get("directory_walk", {}).get("p95_ms", 0)),
        "pathScoringP95": ms(stages.get("path_scoring", {}).get("p95_ms", 0)),
        "ripgrepScanP95": ms(stages.get("ripgrep_scan", {}).get("p95_ms", 0)),
        "candidateSelectionP95": ms(stages.get("candidate_selection", {}).get("p95_ms", 0)),
        "embeddingP95": ms(stages.get("embedding", {}).get("p95_ms", 0)),
        "rankingP95": ms(stages.get("ranking", {}).get("p95_ms", 0)),
    }


def build_verified(jit: dict, cache: dict, model_name: str, source: str):
    jit_summary = summary_metrics(jit)
    cache_summary = summary_metrics(cache)

    data = {
        "source": source,
        "lastUpdated": datetime.utcnow().strftime("%Y-%m-%d"),
        "model": model_name,
        "testCorpus": corpus_summary(jit),
        "latency": {
            "ttfrP50": ms(jit_summary.get("ttfr", {}).get("p50_ms", 0)),
            "ttfrP95": ms(jit_summary.get("ttfr", {}).get("p95_ms", 0)),
            "ttfrP99": ms(jit_summary.get("ttfr", {}).get("p99_ms", 0)),
            "totalP50Jit": ms(jit_summary.get("total", {}).get("p50_ms", 0)),
            "totalP95Jit": ms(jit_summary.get("total", {}).get("p95_ms", 0)),
            "totalP95Cache": ms(cache_summary.get("total", {}).get("p95_ms", 0)),
        },
        "jitMode": {
            "p95Total": ms(jit_summary.get("total", {}).get("p95_ms", 0)),
            "hitRate": pct(jit_summary.get("avg_cache_hit_rate", 0.0) * 100.0),
            "candidatesEmbedded": int(jit_summary.get("avg_candidates_embedded", 0)),
            "avgCpu": pct(jit_summary.get("avg_cpu_percent", 0.0)),
            "peakRamMb": int(jit_summary.get("peak_ram_mb", 0)),
        },
        "cacheMode": {
            "p95Total": ms(cache_summary.get("total", {}).get("p95_ms", 0)),
            "hitRate": pct(cache_summary.get("avg_cache_hit_rate", 0.0) * 100.0),
            "candidatesEmbedded": int(cache_summary.get("avg_candidates_embedded", 0)),
            "avgCpu": pct(cache_summary.get("avg_cpu_percent", 0.0)),
            "peakRamMb": int(cache_summary.get("peak_ram_mb", 0)),
        },
        "stageBreakdown": stage_breakdown(jit),
    }

    return data


def render_report(verified: dict):
    lines = [
        "# IXOS_MODEL_LAB_REPORT.md",
        "",
        f"Generated: {verified['lastUpdated']}",
        "",
        "## Test Corpus",
        "",
        f"- Files: {verified['testCorpus']['files']}",
        f"- Total Size: {verified['testCorpus']['totalSize']}",
        f"- Avg File Size: {verified['testCorpus']['avgFileSize']}",
        "",
        "## Latency (P95)",
        "",
        f"- TTFR P95: {verified['latency']['ttfrP95']}",
        f"- Total (JIT) P95: {verified['latency']['totalP95Jit']}",
        f"- Total (Cache) P95: {verified['latency']['totalP95Cache']}",
        "",
        "## Cache vs JIT",
        "",
        f"- JIT Hit Rate: {verified['jitMode']['hitRate']}",
        f"- Cache Hit Rate: {verified['cacheMode']['hitRate']}",
        f"- JIT Candidates Embedded: {verified['jitMode']['candidatesEmbedded']}",
        f"- Cache Candidates Embedded: {verified['cacheMode']['candidatesEmbedded']}",
        "",
        "## Stage Breakdown (JIT P95)",
        "",
        f"- Directory Walk: {verified['stageBreakdown']['directoryWalkP95']}",
        f"- Path Scoring: {verified['stageBreakdown']['pathScoringP95']}",
        f"- Ripgrep Scan: {verified['stageBreakdown']['ripgrepScanP95']}",
        f"- Candidate Selection: {verified['stageBreakdown']['candidateSelectionP95']}",
        f"- Embedding: {verified['stageBreakdown']['embeddingP95']}",
        f"- Ranking: {verified['stageBreakdown']['rankingP95']}",
        "",
    ]
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Update verified benchmark data from perf outputs.")
    parser.add_argument("--jit", required=True, help="PERF_JIT.json path")
    parser.add_argument("--cache", required=True, help="PERF_CACHE.json path")
    parser.add_argument("--out-json", required=True, help="Output JSON path")
    parser.add_argument("--out-report", required=True, help="Output report markdown path")
    parser.add_argument("--model", default="Ixos-Flash-v2", help="Model name label")
    parser.add_argument(
        "--source", default="IXOS_MODEL_LAB_REPORT.md", help="Source doc name"
    )
    args = parser.parse_args()

    jit = load_json(Path(args.jit))
    cache = load_json(Path(args.cache))

    verified = build_verified(jit, cache, args.model, args.source)
    out_json = Path(args.out_json)
    out_report = Path(args.out_report)

    out_json.parent.mkdir(parents=True, exist_ok=True)
    out_report.parent.mkdir(parents=True, exist_ok=True)

    out_json.write_text(json.dumps(verified, indent=2), encoding="utf-8")
    out_report.write_text(render_report(verified), encoding="utf-8")

    print(f"Wrote {out_json}")
    print(f"Wrote {out_report}")


if __name__ == "__main__":
    main()
