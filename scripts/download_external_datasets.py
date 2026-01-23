#!/usr/bin/env python3
"""
Download external datasets for Ixos evaluation into datasets/external.

Datasets:
- external_beir: BeIR/scifact
- external_multilingual: MIRACL (es) if available, else BeIR/fiqa as domain-diverse fallback

Writes JSONL files:
- corpus.jsonl (id, title, text)
- queries.jsonl (id, text)
- qrels.jsonl (query_id, doc_id, relevance)
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "datasets" / "external"


def write_jsonl(path: Path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def export_beir(dataset_name: str, target_dir: Path, max_docs: int | None = None, max_queries: int | None = None):
    from datasets import load_dataset

    corpus = load_dataset(dataset_name, "corpus", split="train", cache_dir=str(OUT_DIR))
    queries = load_dataset(dataset_name, "queries", split="train", cache_dir=str(OUT_DIR))
    qrels = load_dataset(dataset_name, "qrels", split="train", cache_dir=str(OUT_DIR))

    if max_docs:
        corpus = corpus.select(range(min(max_docs, len(corpus))))
    if max_queries:
        queries = queries.select(range(min(max_queries, len(queries))))

    corpus_rows = []
    for row in corpus:
        corpus_rows.append({
            "id": str(row.get("_id") or row.get("doc_id") or row.get("id")),
            "title": row.get("title") or "",
            "text": row.get("text") or row.get("contents") or "",
        })

    query_rows = []
    for row in queries:
        query_rows.append({
            "id": str(row.get("_id") or row.get("query_id") or row.get("id")),
            "text": row.get("text") or row.get("query") or "",
        })

    qrel_rows = []
    for row in qrels:
        qrel_rows.append({
            "query_id": str(row.get("query-id") or row.get("query_id") or row.get("qid") or row.get("query")),
            "doc_id": str(row.get("corpus-id") or row.get("doc_id") or row.get("docid") or row.get("doc")),
            "relevance": int(row.get("score") or row.get("relevance") or row.get("label") or 0),
        })

    write_jsonl(target_dir / "corpus.jsonl", corpus_rows)
    write_jsonl(target_dir / "queries.jsonl", query_rows)
    write_jsonl(target_dir / "qrels.jsonl", qrel_rows)


def export_miracl(lang: str, target_dir: Path, max_docs: int | None = None, max_queries: int | None = None):
    from datasets import load_dataset

    corpus = load_dataset("miracl/miracl", lang, split="corpus", cache_dir=str(OUT_DIR))
    queries = load_dataset("miracl/miracl", lang, split="queries", cache_dir=str(OUT_DIR))
    qrels = load_dataset("miracl/miracl", lang, split="qrels", cache_dir=str(OUT_DIR))

    if max_docs:
        corpus = corpus.select(range(min(max_docs, len(corpus))))
    if max_queries:
        queries = queries.select(range(min(max_queries, len(queries))))

    corpus_rows = []
    for row in corpus:
        corpus_rows.append({
            "id": str(row.get("docid") or row.get("doc_id") or row.get("id")),
            "title": row.get("title") or "",
            "text": row.get("text") or "",
        })

    query_rows = []
    for row in queries:
        query_rows.append({
            "id": str(row.get("query_id") or row.get("id") or row.get("qid")),
            "text": row.get("query") or row.get("text") or "",
        })

    qrel_rows = []
    for row in qrels:
        qrel_rows.append({
            "query_id": str(row.get("query_id") or row.get("qid")),
            "doc_id": str(row.get("docid") or row.get("doc_id") or row.get("doc")),
            "relevance": int(row.get("relevance") or row.get("label") or row.get("score") or 0),
        })

    write_jsonl(target_dir / "corpus.jsonl", corpus_rows)
    write_jsonl(target_dir / "queries.jsonl", query_rows)
    write_jsonl(target_dir / "qrels.jsonl", qrel_rows)


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    beir_dir = OUT_DIR / "external_beir"
    multi_dir = OUT_DIR / "external_multilingual"

    print("[Download] external_beir -> BeIR/scifact")
    try:
        export_beir("BeIR/scifact", beir_dir, max_docs=5000, max_queries=500)
        print(f"[OK] Wrote {beir_dir}")
    except Exception as exc:
        print(f"[ERROR] BeIR/scifact download failed: {exc}")

    print("[Download] external_multilingual -> MIRACL (es)")
    try:
        export_miracl("es", multi_dir, max_docs=5000, max_queries=500)
        print(f"[OK] Wrote {multi_dir}")
    except Exception as exc:
        print(f"[ERROR] MIRACL download failed: {exc}")
        print("[Fallback] external_multilingual -> BeIR/fiqa (domain-diverse)")
        try:
            export_beir("BeIR/fiqa", multi_dir, max_docs=5000, max_queries=500)
            print(f"[OK] Wrote {multi_dir}")
        except Exception as exc2:
            print(f"[ERROR] BeIR/fiqa download failed: {exc2}")
            return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
