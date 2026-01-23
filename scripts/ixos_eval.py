#!/usr/bin/env python3
"""
Ixos Model Lab Evaluation Harness (P7)

Runs two eval suites:
1) Synthetic ambiguity suite (generated in-script)
2) Real-corpus eval (local-only, privacy-preserving)

Metrics:
- Recall@10, MRR@10
- Latency per 1k candidates (batched)
- Model load time, memory delta

Outputs JSON + CSV results.

Requirements:
    pip install -r scripts/requirements.txt
    (Optional) pip install psutil
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import os
import random
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

import numpy as np

try:
    import psutil
except Exception:
    psutil = None

try:
    from model2vec import StaticModel
except Exception as exc:
    raise SystemExit(
        "model2vec is required. Install with: pip install -r scripts/requirements.txt"
    ) from exc


TOKEN_RE = re.compile(r"[a-z0-9]+")


@dataclass
class Doc:
    doc_id: str
    path: Path
    title: str
    text: str
    tokens: List[str]
    dir_tokens: List[str]


@dataclass
class Query:
    text: str
    relevant: List[str]


@dataclass
class EvalMetrics:
    recall_at_10: float
    mrr_at_10: float
    avg_latency_ms_per_1k: float
    avg_candidates: float


@dataclass
class FusionWeights:
    flash: float
    pro: float
    lexical: float
    dir_prior: float


@dataclass
class QueryScores:
    relevant: List[str]
    candidate_ids: List[str]
    flash_scores: np.ndarray
    pro_scores: np.ndarray
    lexical_scores: np.ndarray
    dir_scores: np.ndarray
    query_len: int


def normalize_text(text: str) -> str:
    return text.strip().lower()


def tokenize(text: str) -> List[str]:
    return TOKEN_RE.findall(normalize_text(text))


def spec_bool(value: object, default: bool = True) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "y"}


def apply_query_template(text: str, spec: Dict[str, str]) -> str:
    prefix = spec.get("query_prefix", "") or ""
    suffix = spec.get("query_suffix", "") or ""
    return f"{prefix}{text}{suffix}"


def apply_doc_template(text: str, spec: Dict[str, str]) -> str:
    prefix = spec.get("doc_prefix", "") or ""
    suffix = spec.get("doc_suffix", "") or ""
    return f"{prefix}{text}{suffix}"


def read_text_file(path: Path, max_chars: int = 4000) -> Tuple[str, str]:
    try:
        raw = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        raw = ""
    raw = raw.strip()
    if not raw:
        return "", ""
    lines = raw.splitlines()
    title = lines[0].strip() if lines else path.stem
    snippet = raw[:max_chars]
    return title, snippet


def build_doc(path: Path) -> Doc:
    title, snippet = read_text_file(path)
    dir_tokens = []
    for part in path.parent.parts:
        dir_tokens.extend(tokenize(part))
    tokens = tokenize(path.stem) + tokenize(title)
    return Doc(
        doc_id=str(path),
        path=path,
        title=title or path.stem,
        text=snippet,
        tokens=tokens,
        dir_tokens=dir_tokens,
    )


def load_corpus(root: Path, limit: Optional[int], seed: int) -> List[Doc]:
    docs: List[Doc] = []
    files = [p for p in root.rglob("*") if p.is_file()]
    files = [p for p in files if p.suffix.lower() in {".txt", ".md", ".json"}]
    if limit and len(files) > limit:
        random.Random(seed).shuffle(files)
        files = files[:limit]
    for path in files:
        docs.append(build_doc(path))
    return docs


def build_doc_from_fields(dataset_key: str, doc_id: str, title: str, text: str) -> Doc:
    synthetic_path = Path(dataset_key) / f"{doc_id}.txt"
    tokens = tokenize(title) + tokenize(text)
    dir_tokens = tokenize(dataset_key)
    return Doc(
        doc_id=doc_id,
        path=synthetic_path,
        title=title or doc_id,
        text=text,
        tokens=tokens,
        dir_tokens=dir_tokens,
    )


def load_external_dataset(
    dataset_key: str,
    max_docs: Optional[int],
    max_queries: Optional[int],
    seed: int,
) -> Tuple[List[Doc], List[Query]]:
    base = Path("datasets") / "external" / dataset_key
    corpus_path = base / "corpus.jsonl"
    queries_path = base / "queries.jsonl"
    qrels_path = base / "qrels.jsonl"

    if not corpus_path.exists() or not queries_path.exists() or not qrels_path.exists():
        raise FileNotFoundError(
            f"External dataset '{dataset_key}' not found. "
            f"Run: python scripts/download_external_datasets.py"
        )

    def read_jsonl(path: Path) -> List[dict]:
        rows = []
        with path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                rows.append(json.loads(line))
        return rows

    corpus_rows = read_jsonl(corpus_path)
    query_rows = read_jsonl(queries_path)
    qrel_rows = read_jsonl(qrels_path)

    if max_docs and len(corpus_rows) > max_docs:
        random.Random(seed).shuffle(corpus_rows)
        corpus_rows = corpus_rows[:max_docs]

    docs = []
    for row in corpus_rows:
        doc_id = str(row.get("id") or row.get("_id") or row.get("doc_id"))
        docs.append(build_doc_from_fields(dataset_key, doc_id, row.get("title") or "", row.get("text") or ""))

    qrels = {}
    for row in qrel_rows:
        query_id = str(row.get("query_id"))
        doc_id = str(row.get("doc_id"))
        rel = int(row.get("relevance") or 0)
        if rel <= 0:
            continue
        qrels.setdefault(query_id, set()).add(doc_id)

    if max_queries and len(query_rows) > max_queries:
        random.Random(seed).shuffle(query_rows)
        query_rows = query_rows[:max_queries]

    queries = []
    for row in query_rows:
        qid = str(row.get("id") or row.get("query_id"))
        text = row.get("text") or ""
        relevant = list(qrels.get(qid, []))
        if not relevant:
            continue
        queries.append(Query(text=text, relevant=relevant))

    return docs, queries


def build_real_queries(docs: List[Doc], max_queries: Optional[int], seed: int) -> List[Query]:
    rng = random.Random(seed)
    queries: List[Query] = []
    for doc in docs:
        if not doc.title:
            continue
        variants = generate_query_variants(doc.title, rng)
        for variant in variants:
            if variant:
                queries.append(Query(text=variant, relevant=[doc.doc_id]))
    if max_queries and len(queries) > max_queries:
        rng.shuffle(queries)
        queries = queries[:max_queries]
    return queries


def generate_query_variants(title: str, rng: random.Random) -> List[str]:
    base = normalize_text(title)
    tokens = tokenize(base)
    if not tokens:
        return [base]

    variants: List[str] = []
    variants.append(base)  # exact title

    stop = {"the", "and", "for", "of", "to", "in", "a"}
    reduced = [t for t in tokens if t not in stop]
    if reduced and reduced != tokens:
        variants.append(" ".join(reduced))

    # Short / ambiguous queries (1-2 tokens)
    short_len = 1 if len(tokens) <= 2 else 2
    variants.append(" ".join(tokens[:short_len]))

    # Partial queries
    if len(tokens) > 2:
        variants.append(" ".join(tokens[: max(2, len(tokens) - 2)]))

    # Light synonym swap
    syn = {
        "report": "summary",
        "summary": "overview",
        "roadmap": "plan",
        "budget": "allocation",
        "incident": "outage",
        "policy": "guidelines",
        "notes": "memo",
    }
    swapped = [syn.get(t, t) for t in tokens]
    variants.append(" ".join(swapped))

    # Typos
    variants.append(base.replace("report", "reprot"))
    variants.append(base.replace("summary", "sumary"))
    variants.append(base.replace("budget", "budegt"))

    # Intent-like queries
    intents = [
        f"find {base}",
        f"open {base}",
        f"show me {base}",
        f"where is {base}",
    ]
    variants.extend(intents)

    # Partial or shuffled
    if len(tokens) > 3:
        subset = tokens[:]
        rng.shuffle(subset)
        variants.append(" ".join(subset[: max(2, len(tokens) - 1)]))

    variants.append("".join(tokens))

    # Deduplicate while preserving order
    seen = set()
    uniq = []
    for v in variants:
        v = v.strip()
        if not v or v in seen:
            continue
        seen.add(v)
        uniq.append(v)
    return uniq


def synthetic_suite(difficulty: str) -> Tuple[List[Doc], List[Query]]:
    base_dir = Path("dataset") / "synthetic_ambiguity"
    if not base_dir.exists():
        base_dir.mkdir(parents=True, exist_ok=True)
        _write_synthetic_files(base_dir, difficulty)
    else:
        # Ensure suite is regenerated when difficulty changes by writing a marker.
        marker = base_dir / f".suite_{difficulty}.marker"
        if not marker.exists():
            for child in base_dir.glob("**/*.txt"):
                try:
                    child.unlink()
                except Exception:
                    pass
            _write_synthetic_files(base_dir, difficulty)
            marker.write_text("ok", encoding="utf-8")
    docs = load_corpus(base_dir, None, seed=1337)
    queries = _synthetic_queries(base_dir, difficulty)
    return docs, queries


def _write_synthetic_files(base_dir: Path, difficulty: str) -> None:
    tiers = {
        "small": 3,
        "medium": 6,
        "large": 10,
    }
    repeats = tiers.get(difficulty, 6)
    core = [
        ("finance", "report_2023.txt", "Finance 2023 report for revenue, margin, and cash flow."),
        ("finance", "budget_2024.txt", "Finance 2024 budget plan and allocation summary."),
        ("finance", "q4_summary.txt", "Q4 finance summary with forecasts and risks."),
        ("ops", "report_2023.txt", "Operations 2023 report for logistics and uptime."),
        ("ops", "budget_2024.txt", "Operations 2024 budget for fleet and staffing."),
        ("ops", "q4_summary.txt", "Q4 operations summary: incidents and SLA metrics."),
        ("legal", "report_2023.txt", "Legal 2023 compliance report and audit notes."),
        ("legal", "policy_review.txt", "Legal policy review for contracts and NDAs."),
        ("hr", "report_2023.txt", "HR 2023 report for hiring and retention."),
        ("hr", "policy_review.txt", "HR policy review for benefits and leave."),
        ("marketing", "report_2023.txt", "Marketing 2023 report for campaigns and ROI."),
        ("marketing", "q4_summary.txt", "Q4 marketing summary: pipeline and CAC."),
        ("security", "incident_report.txt", "Security incident report for access anomaly."),
        ("security", "policy_review.txt", "Security policy review for MFA and logging."),
        ("product", "roadmap_2024.txt", "Product roadmap 2024 for features and milestones."),
        ("product", "q4_summary.txt", "Q4 product summary: launches and churn."),
    ]
    extra = [
        ("sales", "report_2023.txt", "Sales 2023 report for pipeline, bookings, and win rates."),
        ("engineering", "report_2023.txt", "Engineering 2023 report for reliability and velocity."),
        ("research", "report_2023.txt", "Research 2023 report on experiments and findings."),
        ("support", "report_2023.txt", "Support 2023 report for tickets and CSAT."),
        ("compliance", "report_2023.txt", "Compliance 2023 report on audits and controls."),
        ("design", "q4_summary.txt", "Q4 design summary for UX improvements."),
        ("it", "incident_report.txt", "IT incident report for outage response."),
        ("legal", "incident_report.txt", "Legal incident report for contract breach."),
        ("ops", "incident_report.txt", "Operations incident report for downtime."),
        ("finance", "incident_report.txt", "Finance incident report for fraud review."),
    ]
    specs = core + (extra if difficulty in ("medium", "large") else []) + (extra if difficulty == "large" else [])
    # Add same-filename hard negatives across multiple dirs
    hard_names = [
        "summary.txt",
        "overview.txt",
        "plan.txt",
        "notes.txt",
        "report_2023.txt",
    ]
    hard_dirs = ["finance", "ops", "legal", "hr", "marketing", "security", "product", "sales"]
    for name in hard_names[:repeats]:
        for d in hard_dirs[: 3 + repeats]:
            specs.append((d, name, f"{d.title()} {name.replace('_', ' ').replace('.txt','')} details."))
    for folder, filename, text in specs:
        path = base_dir / folder / filename
        path.parent.mkdir(parents=True, exist_ok=True)
        content = f"{filename.replace('_', ' ').replace('.txt', '').title()}\n\n{text}\n"
        path.write_text(content, encoding="utf-8")


def _synthetic_queries(base_dir: Path, difficulty: str) -> List[Query]:
    def p(folder: str, filename: str) -> str:
        return str(base_dir / folder / filename)

    base_queries = [
        Query(text="finance 2023 report", relevant=[p("finance", "report_2023.txt")]),
        Query(text="ops 2023 report", relevant=[p("ops", "report_2023.txt")]),
        Query(text="legal compliance report 2023", relevant=[p("legal", "report_2023.txt")]),
        Query(text="hr report 2023 retention", relevant=[p("hr", "report_2023.txt")]),
        Query(text="marketing report 2023 roi", relevant=[p("marketing", "report_2023.txt")]),
        Query(text="ops budget 2024 staffing", relevant=[p("ops", "budget_2024.txt")]),
        Query(text="finance budget 2024 allocation", relevant=[p("finance", "budget_2024.txt")]),
        Query(text="policy review contracts legal", relevant=[p("legal", "policy_review.txt")]),
        Query(text="policy review benefits hr", relevant=[p("hr", "policy_review.txt")]),
        Query(text="security policy review mfa", relevant=[p("security", "policy_review.txt")]),
        Query(text="incident report access anomaly", relevant=[p("security", "incident_report.txt")]),
        Query(text="product roadmap 2024", relevant=[p("product", "roadmap_2024.txt")]),
        Query(text="q4 summary marketing cac", relevant=[p("marketing", "q4_summary.txt")]),
        Query(text="q4 summary operations sla", relevant=[p("ops", "q4_summary.txt")]),
        Query(text="q4 summary finance risk", relevant=[p("finance", "q4_summary.txt")]),
    ]
    variants = []
    typo_map = {"report": ["reprot", "repot"], "summary": ["sumary"], "budget": ["budegt"]}
    for q in base_queries:
        toks = q.text.split()
        if len(toks) > 2:
            variants.append(Query(text=" ".join(toks[:2]), relevant=q.relevant))
        if "report" in q.text:
            variants.append(Query(text=q.text.replace("report", "repot"), relevant=q.relevant))
        if "summary" in q.text:
            variants.append(Query(text=q.text.replace("summary", "sumary"), relevant=q.relevant))
        variants.append(Query(text=q.text.replace(" ", ""), relevant=q.relevant))
    if difficulty == "small":
        return base_queries
    if difficulty == "medium":
        return base_queries + variants[: len(base_queries)]
    return base_queries + variants


def build_lexical_stats(docs: List[Doc]) -> Dict[str, float]:
    df: Dict[str, int] = {}
    for doc in docs:
        seen = set(doc.tokens)
        for tok in seen:
            df[tok] = df.get(tok, 0) + 1
    idf: Dict[str, float] = {}
    n = max(1, len(docs))
    for tok, count in df.items():
        idf[tok] = math.log((n + 1) / (count + 1)) + 1.0
    return idf


def lexical_score(query_tokens: List[str], doc: Doc, idf: Dict[str, float]) -> float:
    score = 0.0
    doc_tokens = doc.tokens
    for tok in query_tokens:
        if tok in doc_tokens:
            score += idf.get(tok, 1.0)
    return score


def dir_prior_score(query_tokens: List[str], doc: Doc) -> float:
    if not doc.dir_tokens:
        return 0.0
    hits = sum(1 for tok in query_tokens if tok in doc.dir_tokens)
    return float(hits) / max(1, len(query_tokens))


def chunked(items: List[str], batch_size: int) -> Iterable[List[str]]:
    for i in range(0, len(items), batch_size):
        yield items[i : i + batch_size]


class ModelBackend:
    def __init__(self, spec: Dict[str, str]):
        self.spec = spec
        self.model_id = spec.get("id", "")
        self.model_path = spec.get("path")
        self.backend = spec.get("backend", "model2vec")
        self.model = None

    def load(self) -> float:
        start = time.perf_counter()
        target = self.model_path or self.spec.get("hf_id") or self.model_id
        if self.backend == "model2vec":
            self.model = StaticModel.from_pretrained(target)
        elif self.backend == "sentence-transformers":
            from sentence_transformers import SentenceTransformer

            self.model = SentenceTransformer(
                target,
                local_files_only=True,
                tokenizer_kwargs={"fix_mistral_regex": True},
            )
        elif self.backend == "transformers":
            import torch
            from transformers import AutoModel, AutoTokenizer

            trust = bool(self.spec.get("trust_remote_code", False))
            tokenizer = AutoTokenizer.from_pretrained(
                target,
                trust_remote_code=trust,
                local_files_only=True,
                fix_mistral_regex=True,
            )
            model = AutoModel.from_pretrained(
                target, trust_remote_code=trust, local_files_only=True
            )
            model.eval()
            self.model = {"tokenizer": tokenizer, "model": model}
        elif self.backend == "onnx":
            import onnxruntime as ort
            from transformers import AutoTokenizer

            model_file = self.spec.get("onnx_model", "model.onnx")
            model_path = Path(self.model_path) / model_file
            tokenizer_path = self.spec.get("tokenizer_path") or self.model_path or target
            self.model = {
                "session": ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"]),
                "tokenizer": AutoTokenizer.from_pretrained(
                    tokenizer_path, local_files_only=True, use_fast=False
                ),
                "pooling": self.spec.get("pooling", "mean"),
            }
        else:
            raise ValueError(f"Unsupported backend: {self.backend}")
        return (time.perf_counter() - start) * 1000.0

    def encode(self, texts: List[str]) -> np.ndarray:
        if self.model is None:
            raise RuntimeError("Model not loaded")
        normalize = spec_bool(self.spec.get("normalize"), True)
        if self.backend == "model2vec":
            embeddings = self.model.encode(texts)
            arr = np.array(embeddings, dtype=np.float32)
        elif self.backend == "sentence-transformers":
            embeddings = self.model.encode(
                texts,
                normalize_embeddings=False,
                show_progress_bar=False,
            )
            arr = np.array(embeddings, dtype=np.float32)
        elif self.backend == "onnx":
            tokenizer = self.model["tokenizer"]
            session = self.model["session"]
            max_len = getattr(tokenizer, "model_max_length", 512)
            if not max_len or max_len > 10000:
                max_len = 512
            inputs = tokenizer(
                texts,
                padding=True,
                truncation=True,
                max_length=max_len,
                return_tensors="np",
            )
            ort_inputs = {inp.name: inputs[inp.name] for inp in session.get_inputs() if inp.name in inputs}
            outputs = session.run(None, ort_inputs)
            token_embeddings = outputs[0]
            attention = inputs["attention_mask"].astype(np.float32)
            mask = np.expand_dims(attention, axis=-1)
            summed = (token_embeddings * mask).sum(axis=1)
            counts = np.clip(mask.sum(axis=1), 1e-9, None)
            arr = summed / counts
        elif self.backend == "transformers":
            import torch

            tokenizer = self.model["tokenizer"]
            model = self.model["model"]
            with torch.no_grad():
                inputs = tokenizer(
                    texts,
                    padding=True,
                    truncation=True,
                    return_tensors="pt",
                )
                outputs = model(**inputs)
                token_embeddings = outputs.last_hidden_state
                attention = inputs["attention_mask"].unsqueeze(-1).float()
                summed = (token_embeddings * attention).sum(dim=1)
                counts = attention.sum(dim=1).clamp(min=1e-9)
                pooled = summed / counts
                arr = pooled.cpu().numpy().astype(np.float32)
        else:
            raise ValueError(f"Unsupported backend: {self.backend}")
        if not normalize:
            return arr
        norms = np.linalg.norm(arr, axis=1, keepdims=True) + 1e-8
        return arr / norms


class RerankerBackend:
    def __init__(self, spec: Dict[str, str]):
        self.spec = spec
        self.model_id = spec.get("id", "")
        self.model_path = spec.get("path")
        self.backend = spec.get("backend", "sentence-transformers")
        self.model = None

    def load(self) -> float:
        start = time.perf_counter()
        target = self.model_path or self.spec.get("hf_id") or self.model_id
        if self.backend != "sentence-transformers":
            raise ValueError(f"Unsupported reranker backend: {self.backend}")
        from sentence_transformers import CrossEncoder

        self.model = CrossEncoder(
            target,
            local_files_only=True,
            tokenizer_kwargs={"fix_mistral_regex": True},
        )
        return (time.perf_counter() - start) * 1000.0

    def score(self, query: str, docs: List[Doc]) -> np.ndarray:
        if self.model is None:
            raise RuntimeError("Reranker not loaded")
        pairs = [(query, augment_doc_text(doc)) for doc in docs]
        scores = self.model.predict(pairs, show_progress_bar=False)
        return np.array(scores, dtype=np.float32)


def measure_memory_delta_mb() -> Optional[float]:
    if psutil is None:
        return None
    proc = psutil.Process(os.getpid())
    return proc.memory_info().rss / (1024 * 1024)


def eval_model(
    model_spec: Dict[str, str],
    docs: List[Doc],
    queries: List[Query],
    candidate_cap: int,
    batch_size: int,
    topk: int,
    seed: int,
) -> Tuple[EvalMetrics, Dict[str, float]]:
    model_id = model_spec["id"]
    model_path = model_spec.get("path")
    backend = ModelBackend(model_spec)
    use_augmented = spec_bool(model_spec.get("use_augmented"), True)

    mem_before = measure_memory_delta_mb()
    load_time_ms = backend.load()
    mem_after = measure_memory_delta_mb()
    mem_delta = None if mem_before is None or mem_after is None else max(0.0, mem_after - mem_before)

    idf = build_lexical_stats(docs)

    total_recall = 0.0
    total_mrr = 0.0
    total_candidates = 0
    total_embed_ms = 0.0

    for query in queries:
        q_tokens = tokenize(query.text)

        # Candidate generation (lexical only, no content parsing beyond title/snippet)
        scored = []
        for doc in docs:
            score = lexical_score(q_tokens, doc, idf)
            scored.append((score, doc))

        scored.sort(key=lambda x: x[0], reverse=True)
        candidates = [doc for _, doc in scored[:candidate_cap]]
        total_candidates += len(candidates)

        # Embed query (optional template)
        q_text = apply_query_template(query.text, model_spec)
        q_emb = backend.encode([q_text])[0]

        # Embed candidates in batches
        texts = [
            apply_doc_template(augment_doc_text(doc) if use_augmented else doc.text, model_spec)
            for doc in candidates
        ]
        start = time.perf_counter()
        cand_embs = []
        for batch in chunked(texts, batch_size):
            cand_embs.append(backend.encode(batch))
        cand_embs_arr = np.vstack(cand_embs) if cand_embs else np.zeros((0, q_emb.shape[0]))
        total_embed_ms += (time.perf_counter() - start) * 1000.0

        # Similarity + rank
        sims = cand_embs_arr.dot(q_emb)
        ranked_idx = np.argsort(-sims)[:topk]
        ranked_docs = [candidates[i].doc_id for i in ranked_idx]

        # Recall@k and MRR@k
        hit_rank = None
        for rank, doc_id in enumerate(ranked_docs, start=1):
            if doc_id in query.relevant:
                hit_rank = rank
                break
        if hit_rank is not None:
            total_recall += 1.0
            total_mrr += 1.0 / hit_rank

    num_queries = max(1, len(queries))
    avg_candidates = total_candidates / num_queries
    avg_latency_ms_per_1k = (total_embed_ms / max(1, total_candidates)) * 1000.0

    metrics = EvalMetrics(
        recall_at_10=total_recall / num_queries,
        mrr_at_10=total_mrr / num_queries,
        avg_latency_ms_per_1k=avg_latency_ms_per_1k,
        avg_candidates=avg_candidates,
    )

    model_stats = {
        "model_id": model_id,
        "model_path": model_path or "",
        "load_time_ms": round(load_time_ms, 2),
        "memory_delta_mb": None if mem_delta is None else round(mem_delta, 2),
        "batch_size": batch_size,
        "candidate_cap": candidate_cap,
        "avg_candidates": round(avg_candidates, 1),
        "doc_count": len(docs),
        "query_count": len(queries),
    }

    return metrics, model_stats


def eval_reranker(
    reranker_spec: Dict[str, str],
    base_spec: Dict[str, str],
    docs: List[Doc],
    queries: List[Query],
    candidate_cap: int,
    batch_size: int,
    topk: int,
    rerank_topk: int,
    seed: int,
) -> Tuple[EvalMetrics, Dict[str, float]]:
    base = ModelBackend(base_spec)
    reranker = RerankerBackend(reranker_spec)

    mem_before = measure_memory_delta_mb()
    base_load_ms = base.load()
    reranker_load_ms = reranker.load()
    mem_after = measure_memory_delta_mb()
    mem_delta = None if mem_before is None or mem_after is None else max(0.0, mem_after - mem_before)

    idf = build_lexical_stats(docs)
    total_recall = 0.0
    total_mrr = 0.0
    total_candidates = 0
    total_embed_ms = 0.0
    total_rerank_ms = 0.0

    for query in queries:
        q_tokens = tokenize(query.text)
        scored = [(lexical_score(q_tokens, doc, idf), doc) for doc in docs]
        scored.sort(key=lambda x: x[0], reverse=True)
        candidates = [doc for _, doc in scored[:candidate_cap]]
        total_candidates += len(candidates)

        base_scores, embed_ms = score_candidates(base, query.text, candidates, batch_size)
        total_embed_ms += embed_ms

        # Base ranking
        base_idx = np.argsort(-base_scores)
        rerank_slice = base_idx[: min(rerank_topk, len(candidates))]
        rerank_docs = [candidates[i] for i in rerank_slice]

        start = time.perf_counter()
        rerank_scores = reranker.score(query.text, rerank_docs)
        total_rerank_ms += (time.perf_counter() - start) * 1000.0

        rerank_order = np.argsort(-rerank_scores)
        reranked_ids = [rerank_docs[i].doc_id for i in rerank_order]
        # Fill remaining with base order
        tail_ids = [candidates[i].doc_id for i in base_idx if candidates[i].doc_id not in reranked_ids]
        final_ranked = (reranked_ids + tail_ids)[:topk]

        hit_rank = None
        for rank, doc_id in enumerate(final_ranked, start=1):
            if doc_id in query.relevant:
                hit_rank = rank
                break
        if hit_rank is not None:
            total_recall += 1.0
            total_mrr += 1.0 / hit_rank

    num_queries = max(1, len(queries))
    avg_candidates = total_candidates / num_queries
    avg_latency_ms_per_1k = ((total_embed_ms + total_rerank_ms) / max(1, total_candidates)) * 1000.0

    metrics = EvalMetrics(
        recall_at_10=total_recall / num_queries,
        mrr_at_10=total_mrr / num_queries,
        avg_latency_ms_per_1k=avg_latency_ms_per_1k,
        avg_candidates=avg_candidates,
    )

    stats = {
        "base_model_id": base_spec["id"],
        "reranker_model_id": reranker_spec["id"],
        "base_load_ms": round(base_load_ms, 2),
        "reranker_load_ms": round(reranker_load_ms, 2),
        "memory_delta_mb": None if mem_delta is None else round(mem_delta, 2),
        "batch_size": batch_size,
        "candidate_cap": candidate_cap,
        "rerank_topk": rerank_topk,
        "doc_count": len(docs),
        "query_count": len(queries),
    }

    return metrics, stats


def augment_doc_text(doc: Doc) -> str:
    dir_hint = " ".join(doc.dir_tokens)
    return f"{dir_hint} {doc.path.stem} {doc.title}\n{doc.text}"


def load_manifest(path: Path) -> List[Dict[str, str]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return data.get("candidates", [])


def find_model_spec(candidates: List[Dict[str, str]], model_id: str) -> Dict[str, str]:
    for spec in candidates:
        if spec.get("id") == model_id:
            return spec
    raise SystemExit(f"Model not found in manifest: {model_id}")


def normalize_scores(scores: np.ndarray) -> np.ndarray:
    if scores.size == 0:
        return scores
    min_v = scores.min()
    max_v = scores.max()
    if max_v - min_v < 1e-6:
        return np.zeros_like(scores)
    return (scores - min_v) / (max_v - min_v)


def rrf_score(ranks: np.ndarray, k: int = 60) -> np.ndarray:
    return 1.0 / (k + ranks.astype(np.float32))


def rank_positions(scores: np.ndarray) -> np.ndarray:
    order = np.argsort(-scores)
    ranks = np.empty_like(order)
    ranks[order] = np.arange(1, len(scores) + 1)
    return ranks


def score_candidates(
    backend: ModelBackend,
    query: str,
    candidates: List[Doc],
    batch_size: int,
    spec: Optional[Dict[str, str]] = None,
    use_augmented: bool = True,
) -> Tuple[np.ndarray, float]:
    effective_spec = spec or {}
    q_emb = backend.encode([apply_query_template(query, effective_spec)])[0]
    texts = [
        apply_doc_template(
            augment_doc_text(doc) if use_augmented else doc.text,
            effective_spec,
        )
        for doc in candidates
    ]
    start = time.perf_counter()
    cand_embs = []
    for batch in chunked(texts, batch_size):
        cand_embs.append(backend.encode(batch))
    cand_embs_arr = np.vstack(cand_embs) if cand_embs else np.zeros((0, q_emb.shape[0]))
    elapsed_ms = (time.perf_counter() - start) * 1000.0
    sims = cand_embs_arr.dot(q_emb)
    return sims, elapsed_ms


def encode_candidates(
    backend: ModelBackend,
    query: str,
    candidates: List[Doc],
    batch_size: int,
    spec: Optional[Dict[str, str]] = None,
    use_augmented: bool = True,
) -> Tuple[np.ndarray, np.ndarray, float]:
    effective_spec = spec or {}
    q_emb = backend.encode([apply_query_template(query, effective_spec)])[0]
    texts = [
        apply_doc_template(
            augment_doc_text(doc) if use_augmented else doc.text,
            effective_spec,
        )
        for doc in candidates
    ]
    start = time.perf_counter()
    cand_embs = []
    for batch in chunked(texts, batch_size):
        cand_embs.append(backend.encode(batch))
    cand_embs_arr = np.vstack(cand_embs) if cand_embs else np.zeros((0, q_emb.shape[0]))
    elapsed_ms = (time.perf_counter() - start) * 1000.0
    return q_emb, cand_embs_arr, elapsed_ms


def eval_fusion(
    flash_spec: Dict[str, str],
    pro_spec: Dict[str, str],
    docs: List[Doc],
    queries: List[Query],
    candidate_cap: int,
    batch_size: int,
    topk: int,
    seed: int,
    weights: FusionWeights,
    strategy: str,
) -> Tuple[EvalMetrics, Dict[str, float]]:
    precomputed, stats = precompute_query_scores(
        flash_spec,
        pro_spec,
        docs,
        queries,
        candidate_cap,
        batch_size,
        seed,
    )
    metrics = eval_fusion_from_precomputed(precomputed, weights, strategy, topk)
    return metrics, stats


def precompute_query_scores(
    flash_spec: Dict[str, str],
    pro_spec: Dict[str, str],
    docs: List[Doc],
    queries: List[Query],
    candidate_cap: int,
    batch_size: int,
    seed: int,
) -> Tuple[List[QueryScores], Dict[str, float]]:
    flash = ModelBackend(flash_spec)
    pro = ModelBackend(pro_spec)
    flash_use_aug = spec_bool(flash_spec.get("use_augmented"), True)
    pro_use_aug = spec_bool(pro_spec.get("use_augmented"), True)

    mem_before = measure_memory_delta_mb()
    flash_load_ms = flash.load()
    pro_load_ms = pro.load()
    mem_after = measure_memory_delta_mb()
    mem_delta = None if mem_before is None or mem_after is None else max(0.0, mem_after - mem_before)

    idf = build_lexical_stats(docs)
    precomputed: List[QueryScores] = []
    total_candidates = 0
    total_embed_ms = 0.0

    for query in queries:
        q_tokens = tokenize(query.text)
        scored = [(lexical_score(q_tokens, doc, idf), doc) for doc in docs]
        scored.sort(key=lambda x: x[0], reverse=True)
        candidates = [doc for _, doc in scored[:candidate_cap]]
        total_candidates += len(candidates)

        flash_scores, flash_ms = score_candidates(
            flash,
            query.text,
            candidates,
            batch_size,
            spec=flash_spec,
            use_augmented=flash_use_aug,
        )
        pro_scores, pro_ms = score_candidates(
            pro,
            query.text,
            candidates,
            batch_size,
            spec=pro_spec,
            use_augmented=pro_use_aug,
        )
        total_embed_ms += flash_ms + pro_ms

        lexical_scores = np.array(
            [lexical_score(q_tokens, doc, idf) for doc in candidates], dtype=np.float32
        )
        dir_scores = np.array([dir_prior_score(q_tokens, doc) for doc in candidates], dtype=np.float32)

        precomputed.append(
            QueryScores(
                relevant=query.relevant,
                candidate_ids=[doc.doc_id for doc in candidates],
                flash_scores=flash_scores,
                pro_scores=pro_scores,
                lexical_scores=lexical_scores,
                dir_scores=dir_scores,
                query_len=len(q_tokens),
            )
        )

    num_queries = max(1, len(queries))
    avg_candidates = total_candidates / num_queries
    avg_latency_ms_per_1k = (total_embed_ms / max(1, total_candidates)) * 1000.0

    stats = {
        "flash_model_id": flash_spec["id"],
        "pro_model_id": pro_spec["id"],
        "flash_load_ms": round(flash_load_ms, 2),
        "pro_load_ms": round(pro_load_ms, 2),
        "memory_delta_mb": None if mem_delta is None else round(mem_delta, 2),
        "batch_size": batch_size,
        "candidate_cap": candidate_cap,
        "avg_candidates": round(avg_candidates, 1),
        "latency_ms_per_1k": round(avg_latency_ms_per_1k, 2),
        "doc_count": len(docs),
        "query_count": len(queries),
    }

    return precomputed, stats


def eval_fusion_from_precomputed(
    precomputed: List[QueryScores],
    weights: FusionWeights,
    strategy: str,
    topk: int,
) -> EvalMetrics:
    total_recall = 0.0
    total_mrr = 0.0
    total_candidates = 0

    for item in precomputed:
        total_candidates += len(item.candidate_ids)
        if strategy == "linear":
            fused = (
                weights.flash * normalize_scores(item.flash_scores)
                + weights.pro * normalize_scores(item.pro_scores)
                + weights.lexical * normalize_scores(item.lexical_scores)
                + weights.dir_prior * normalize_scores(item.dir_scores)
            )
        elif strategy == "rrf":
            fused = (
                weights.flash * rrf_score(rank_positions(item.flash_scores))
                + weights.pro * rrf_score(rank_positions(item.pro_scores))
                + weights.lexical * rrf_score(rank_positions(item.lexical_scores))
                + weights.dir_prior * rrf_score(rank_positions(item.dir_scores))
            )
        elif strategy == "rank_sum":
            n = len(item.candidate_ids)
            fused = (
                weights.flash * (n - rank_positions(item.flash_scores) + 1)
                + weights.pro * (n - rank_positions(item.pro_scores) + 1)
                + weights.lexical * (n - rank_positions(item.lexical_scores) + 1)
                + weights.dir_prior * (n - rank_positions(item.dir_scores) + 1)
            )
        elif strategy == "learned":
            fused = (
                weights.flash * normalize_scores(item.flash_scores)
                + weights.pro * normalize_scores(item.pro_scores)
                + weights.lexical * normalize_scores(item.lexical_scores)
                + weights.dir_prior * normalize_scores(item.dir_scores)
            )
        else:
            raise ValueError(f"Unknown fusion strategy: {strategy}")

        ranked_idx = np.argsort(-fused)[:topk]
        ranked_docs = [item.candidate_ids[i] for i in ranked_idx]
        hit_rank = None
        for rank, doc_id in enumerate(ranked_docs, start=1):
            if doc_id in item.relevant:
                hit_rank = rank
                break
        if hit_rank is not None:
            total_recall += 1.0
            total_mrr += 1.0 / hit_rank

    num_queries = max(1, len(precomputed))
    avg_candidates = total_candidates / num_queries

    return EvalMetrics(
        recall_at_10=total_recall / num_queries,
        mrr_at_10=total_mrr / num_queries,
        avg_latency_ms_per_1k=0.0,
        avg_candidates=avg_candidates,
    )


def grid_search_weights_from_precomputed(
    precomputed: List[QueryScores],
    topk: int,
    strategy: str,
    step: float,
) -> Tuple[FusionWeights, EvalMetrics]:
    best_weights = FusionWeights(0.4, 0.4, 0.1, 0.1)
    best_metrics = None
    weight_values = [round(i * step, 4) for i in range(int(1.0 / step) + 1)]
    for a in weight_values:
        for b in weight_values:
            for c in weight_values:
                for d in weight_values:
                    if abs((a + b + c + d) - 1.0) > 1e-6:
                        continue
                    weights = FusionWeights(a, b, c, d)
                    metrics = eval_fusion_from_precomputed(precomputed, weights, strategy, topk)
                    if best_metrics is None or metrics.mrr_at_10 > best_metrics.mrr_at_10:
                        best_metrics = metrics
                        best_weights = weights
    if best_metrics is None:
        best_metrics = EvalMetrics(0.0, 0.0, 0.0, 0.0)
    return best_weights, best_metrics


def learned_weights_from_precomputed(precomputed: List[QueryScores]) -> FusionWeights:
    try:
        from sklearn.linear_model import LogisticRegression
    except Exception as exc:
        raise RuntimeError("scikit-learn is required for learned fusion") from exc

    X = []
    y = []
    for item in precomputed:
        flash = normalize_scores(item.flash_scores)
        pro = normalize_scores(item.pro_scores)
        lex = normalize_scores(item.lexical_scores)
        dirp = normalize_scores(item.dir_scores)
        for idx, doc_id in enumerate(item.candidate_ids):
            X.append([flash[idx], pro[idx], lex[idx], dirp[idx]])
            y.append(1 if doc_id in item.relevant else 0)
    if not X:
        return FusionWeights(0.4, 0.4, 0.1, 0.1)

    clf = LogisticRegression(max_iter=200, solver="liblinear")
    clf.fit(X, y)
    coefs = clf.coef_[0]
    coefs = [max(0.0, float(c)) for c in coefs]
    total = sum(coefs)
    if total <= 0:
        return FusionWeights(0.4, 0.4, 0.1, 0.1)
    return FusionWeights(
        flash=coefs[0] / total,
        pro=coefs[1] / total,
        lexical=coefs[2] / total,
        dir_prior=coefs[3] / total,
    )


def eval_routing_from_precomputed(
    precomputed: List[QueryScores],
    gap_threshold: float,
    lexical_threshold: float,
    short_len: int,
    topk: int,
) -> EvalMetrics:
    total_recall = 0.0
    total_mrr = 0.0
    total_candidates = 0

    for item in precomputed:
        total_candidates += len(item.candidate_ids)
        flash_scores = normalize_scores(item.flash_scores)
        pro_scores = normalize_scores(item.pro_scores)
        lex_scores = normalize_scores(item.lexical_scores)

        top_sorted = np.sort(flash_scores)[::-1]
        gap = top_sorted[0] - top_sorted[min(4, len(top_sorted) - 1)]
        lexical_max = float(lex_scores.max()) if len(lex_scores) else 0.0

        # Heuristic routing
        use_pro = (
            gap < gap_threshold
            or lexical_max < lexical_threshold
            or item.query_len <= short_len
        )

        fused = pro_scores if use_pro else flash_scores

        ranked_idx = np.argsort(-fused)[:topk]
        ranked_docs = [item.candidate_ids[i] for i in ranked_idx]
        hit_rank = None
        for rank, doc_id in enumerate(ranked_docs, start=1):
            if doc_id in item.relevant:
                hit_rank = rank
                break
        if hit_rank is not None:
            total_recall += 1.0
            total_mrr += 1.0 / hit_rank

    num_queries = max(1, len(precomputed))
    avg_candidates = total_candidates / num_queries

    return EvalMetrics(
        recall_at_10=total_recall / num_queries,
        mrr_at_10=total_mrr / num_queries,
        avg_latency_ms_per_1k=0.0,
        avg_candidates=avg_candidates,
    )


def _rank_metrics(
    candidate_ids: List[str],
    scores: np.ndarray,
    relevant: List[str],
    topk: int,
) -> Tuple[float, float]:
    if scores.size == 0:
        return 0.0, 0.0
    ranked_idx = np.argsort(-scores)[:topk]
    ranked_docs = [candidate_ids[i] for i in ranked_idx]
    hit_rank = None
    for rank, doc_id in enumerate(ranked_docs, start=1):
        if doc_id in relevant:
            hit_rank = rank
            break
    if hit_rank is None:
        return 0.0, 0.0
    return 1.0, 1.0 / hit_rank


def score_entropy_np(scores: np.ndarray) -> float:
    if scores.size == 0:
        return 0.0
    max_score = float(scores.max())
    exp_scores = np.exp(scores - max_score)
    denom = float(exp_scores.sum())
    if denom <= 1e-8:
        return 0.0
    probs = exp_scores / denom
    entropy = -float(np.sum(probs * np.log(np.clip(probs, 1e-9, None))))
    norm = max(1e-6, math.log(len(scores)))
    return max(0.0, min(1.0, entropy / norm))


def eval_routing_learned_from_precomputed(
    precomputed: List[QueryScores],
    topk: int,
    seed: int,
) -> Tuple[EvalMetrics, Dict[str, float]]:
    try:
        from sklearn.linear_model import LogisticRegression
    except Exception as exc:
        raise RuntimeError("scikit-learn is required for learned routing") from exc

    rng = random.Random(seed)
    indices = list(range(len(precomputed)))
    rng.shuffle(indices)
    if not indices:
        return EvalMetrics(0.0, 0.0, 0.0, 0.0), {"train_size": 0, "test_size": 0}

    split1 = int(0.7 * len(indices))
    split2 = int(0.85 * len(indices))
    train_idx = indices[:split1]
    test_idx = indices[split2:]

    X = []
    y = []
    for idx in train_idx:
        item = precomputed[idx]
        flash_scores = normalize_scores(item.flash_scores)
        pro_scores = normalize_scores(item.pro_scores)
        lex_scores = normalize_scores(item.lexical_scores)
        gap = 0.0
        if len(flash_scores) >= 2:
            sorted_scores = np.sort(flash_scores)[::-1]
            gap = float(sorted_scores[0] - sorted_scores[min(4, len(sorted_scores) - 1)])
        lex_max = float(lex_scores.max()) if len(lex_scores) else 0.0
        entropy = score_entropy_np(flash_scores)
        flash_recall, flash_mrr = _rank_metrics(
            item.candidate_ids, flash_scores, item.relevant, topk
        )
        pro_recall, pro_mrr = _rank_metrics(
            item.candidate_ids, pro_scores, item.relevant, topk
        )
        label = 1 if pro_mrr > flash_mrr else 0
        X.append([gap, lex_max, entropy, float(item.query_len), float(flash_scores.max())])
        y.append(label)

    if not X:
        return EvalMetrics(0.0, 0.0, 0.0, 0.0), {"train_size": 0, "test_size": 0}

    clf = LogisticRegression(max_iter=200, solver="liblinear")
    clf.fit(X, y)

    total_recall = 0.0
    total_mrr = 0.0
    total_candidates = 0

    for idx in test_idx:
        item = precomputed[idx]
        flash_scores = normalize_scores(item.flash_scores)
        pro_scores = normalize_scores(item.pro_scores)
        lex_scores = normalize_scores(item.lexical_scores)
        gap = 0.0
        if len(flash_scores) >= 2:
            sorted_scores = np.sort(flash_scores)[::-1]
            gap = float(sorted_scores[0] - sorted_scores[min(4, len(sorted_scores) - 1)])
        lex_max = float(lex_scores.max()) if len(lex_scores) else 0.0
        entropy = score_entropy_np(flash_scores)
        features = np.array([[gap, lex_max, entropy, float(item.query_len), float(flash_scores.max())]])
        use_pro = bool(clf.predict(features)[0])
        scores = pro_scores if use_pro else flash_scores
        recall, mrr = _rank_metrics(item.candidate_ids, scores, item.relevant, topk)
        total_recall += recall
        total_mrr += mrr
        total_candidates += len(item.candidate_ids)

    num_queries = max(1, len(test_idx))
    avg_candidates = total_candidates / num_queries
    metrics = EvalMetrics(
        recall_at_10=total_recall / num_queries,
        mrr_at_10=total_mrr / num_queries,
        avg_latency_ms_per_1k=0.0,
        avg_candidates=avg_candidates,
    )
    stats = {
        "train_size": len(train_idx),
        "test_size": len(test_idx),
    }
    return metrics, stats


def eval_late_interaction(
    model_spec: Dict[str, str],
    docs: List[Doc],
    queries: List[Query],
    candidate_cap: int,
    batch_size: int,
    topk: int,
    seed: int,
    late_k: int,
    chunk_size: int,
) -> Tuple[EvalMetrics, Dict[str, float]]:
    backend = ModelBackend(model_spec)
    use_augmented = spec_bool(model_spec.get("use_augmented"), True)
    mem_before = measure_memory_delta_mb()
    load_time_ms = backend.load()
    mem_after = measure_memory_delta_mb()
    mem_delta = None if mem_before is None or mem_after is None else max(0.0, mem_after - mem_before)

    idf = build_lexical_stats(docs)
    total_candidates = 0
    total_embed_ms = 0.0
    total_recall = 0.0
    total_mrr = 0.0

    for query in queries:
        q_tokens = tokenize(query.text)
        scored = [(lexical_score(q_tokens, doc, idf), doc) for doc in docs]
        scored.sort(key=lambda x: x[0], reverse=True)
        candidates = [doc for _, doc in scored[:candidate_cap]]
        total_candidates += len(candidates)

        q_emb, cand_embs, embed_ms = encode_candidates(
            backend,
            query.text,
            candidates,
            batch_size,
            spec=model_spec,
            use_augmented=use_augmented,
        )
        total_embed_ms += embed_ms
        scores = cand_embs.dot(q_emb)

        # Late interaction approximation on top-K candidates
        k = min(late_k, len(candidates))
        if k > 0:
            for i in range(k):
                doc = candidates[i]
                tokens = tokenize(doc.text)
                if not tokens:
                    continue
                chunks = [
                    " ".join(tokens[j : j + chunk_size])
                    for j in range(0, len(tokens), chunk_size)
                ]
                if not chunks:
                    continue
                chunk_embs = []
                start = time.perf_counter()
                for batch in chunked(chunks, batch_size):
                    chunk_embs.append(backend.encode(batch))
                total_embed_ms += (time.perf_counter() - start) * 1000.0
                chunk_arr = np.vstack(chunk_embs) if chunk_embs else np.zeros((0, q_emb.shape[0]))
                if chunk_arr.size == 0:
                    continue
                scores[i] = float(chunk_arr.dot(q_emb).max())

        recall, mrr = _rank_metrics(
            [doc.doc_id for doc in candidates],
            scores,
            query.relevant,
            topk,
        )
        total_recall += recall
        total_mrr += mrr

    num_queries = max(1, len(queries))
    avg_candidates = total_candidates / num_queries
    avg_latency_ms_per_1k = (total_embed_ms / max(1, total_candidates)) * 1000.0

    metrics = EvalMetrics(
        recall_at_10=total_recall / num_queries,
        mrr_at_10=total_mrr / num_queries,
        avg_latency_ms_per_1k=avg_latency_ms_per_1k,
        avg_candidates=avg_candidates,
    )
    stats = {
        "model_id": model_spec["id"],
        "load_time_ms": round(load_time_ms, 2),
        "memory_delta_mb": None if mem_delta is None else round(mem_delta, 2),
        "batch_size": batch_size,
        "candidate_cap": candidate_cap,
        "late_k": late_k,
        "chunk_size": chunk_size,
        "latency_ms_per_1k": round(avg_latency_ms_per_1k, 2),
    }
    return metrics, stats


def eval_matryoshka(
    model_spec: Dict[str, str],
    docs: List[Doc],
    queries: List[Query],
    candidate_cap: int,
    batch_size: int,
    topk: int,
    seed: int,
    dims_list: List[int],
) -> Tuple[Dict[int, EvalMetrics], Dict[str, float]]:
    backend = ModelBackend(model_spec)
    use_augmented = spec_bool(model_spec.get("use_augmented"), True)
    mem_before = measure_memory_delta_mb()
    load_time_ms = backend.load()
    mem_after = measure_memory_delta_mb()
    mem_delta = None if mem_before is None or mem_after is None else max(0.0, mem_after - mem_before)

    idf = build_lexical_stats(docs)
    total_candidates = 0
    total_embed_ms = 0.0
    metrics_by_dim = {d: {"recall": 0.0, "mrr": 0.0} for d in dims_list}

    for query in queries:
        q_tokens = tokenize(query.text)
        scored = [(lexical_score(q_tokens, doc, idf), doc) for doc in docs]
        scored.sort(key=lambda x: x[0], reverse=True)
        candidates = [doc for _, doc in scored[:candidate_cap]]
        total_candidates += len(candidates)

        q_emb, cand_embs, embed_ms = encode_candidates(
            backend,
            query.text,
            candidates,
            batch_size,
            spec=model_spec,
            use_augmented=use_augmented,
        )
        total_embed_ms += embed_ms

        for dim in dims_list:
            dim = min(dim, cand_embs.shape[1] if cand_embs.ndim == 2 else len(q_emb))
            if dim <= 0:
                continue
            scores = cand_embs[:, :dim].dot(q_emb[:dim])
            recall, mrr = _rank_metrics(
                [doc.doc_id for doc in candidates],
                scores,
                query.relevant,
                topk,
            )
            metrics_by_dim[dim]["recall"] += recall
            metrics_by_dim[dim]["mrr"] += mrr

    num_queries = max(1, len(queries))
    avg_candidates = total_candidates / num_queries
    avg_latency_ms_per_1k = (total_embed_ms / max(1, total_candidates)) * 1000.0

    metrics_out: Dict[int, EvalMetrics] = {}
    for dim, totals in metrics_by_dim.items():
        metrics_out[dim] = EvalMetrics(
            recall_at_10=totals["recall"] / num_queries,
            mrr_at_10=totals["mrr"] / num_queries,
            avg_latency_ms_per_1k=avg_latency_ms_per_1k,
            avg_candidates=avg_candidates,
        )

    stats = {
        "model_id": model_spec["id"],
        "load_time_ms": round(load_time_ms, 2),
        "memory_delta_mb": None if mem_delta is None else round(mem_delta, 2),
        "batch_size": batch_size,
        "candidate_cap": candidate_cap,
        "latency_ms_per_1k": round(avg_latency_ms_per_1k, 2),
    }
    return metrics_out, stats


def write_results_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def write_results_csv(path: Path, rows: List[Dict[str, object]]) -> None:
    if not rows:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = []
    seen = set()
    for row in rows:
        for key in row.keys():
            if key not in seen:
                seen.add(key)
                fieldnames.append(key)
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Ixos model evaluation harness")
    parser.add_argument(
        "--suite",
        choices=[
            "synthetic",
            "real",
            "both",
            "external_beir",
            "external_multilingual",
            "external_all",
            "all",
        ],
        default="both",
    )
    parser.add_argument("--corpus", type=str, default="dataset")
    parser.add_argument("--real-limit", type=int, default=200)
    parser.add_argument("--real-queries", type=int, default=200)
    parser.add_argument("--external-docs", type=int, default=2000)
    parser.add_argument("--external-queries", type=int, default=200)
    parser.add_argument("--difficulty", choices=["small", "medium", "large"], default="medium")
    parser.add_argument("--candidate-cap", type=int, default=1500)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--batch-sizes", type=str, default="")
    parser.add_argument("--topk", type=int, default=10)
    parser.add_argument("--seed", type=int, default=1337)
    parser.add_argument("--manifest", type=str, default="models/lab/manifest.json")
    parser.add_argument("--only-ids", type=str, default="")
    parser.add_argument("--tier", type=str, default="")
    parser.add_argument("--fusion", choices=["none", "linear", "rrf", "rank_sum", "learned"], default="none")
    parser.add_argument("--flash-id", type=str, default="")
    parser.add_argument("--pro-id", type=str, default="")
    parser.add_argument("--fusion-weights", type=str, default="")
    parser.add_argument("--routing", action="store_true")
    parser.add_argument("--route-gap", type=float, default=0.05)
    parser.add_argument("--route-lexical", type=float, default=0.15)
    parser.add_argument("--route-short", type=int, default=2)
    parser.add_argument("--novelty", action="store_true")
    parser.add_argument("--late-k", type=int, default=50)
    parser.add_argument("--late-chunk", type=int, default=120)
    parser.add_argument("--matryoshka-dims", type=str, default="64,128,192,256")
    parser.add_argument("--eval-rerankers", action="store_true")
    parser.add_argument("--rerank-base-id", type=str, default="")
    parser.add_argument("--rerank-topk", type=int, default=50)
    parser.add_argument("--grid-step", type=float, default=0.25)
    parser.add_argument("--output", type=str, default="models/lab/results_latest.json")
    parser.add_argument("--csv", type=str, default="models/lab/results_latest.csv")
    args = parser.parse_args()

    manifest_path = Path(args.manifest)
    if not manifest_path.exists():
        raise SystemExit(f"Manifest not found: {manifest_path}")
    candidates = load_manifest(manifest_path)
    if not candidates:
        raise SystemExit("Manifest has no candidates")

    embedder_candidates = [c for c in candidates if c.get("type", "embedder") == "embedder"]
    reranker_candidates = [c for c in candidates if c.get("type") == "reranker"]

    if args.tier:
        embedder_candidates = [c for c in embedder_candidates if c.get("tier") == args.tier]
        reranker_candidates = [c for c in reranker_candidates if c.get("tier") == args.tier]

    if args.only_ids:
        allow = {x.strip() for x in args.only_ids.split(",") if x.strip()}
        embedder_candidates = [c for c in embedder_candidates if c.get("id") in allow]
        reranker_candidates = [c for c in reranker_candidates if c.get("id") in allow]

    def build_suites() -> List[Tuple[str, List[Doc], List[Query]]]:
        suites_local: List[Tuple[str, List[Doc], List[Query]]] = []
        include_all = args.suite in ("both", "all")
        if args.suite in ("synthetic", "both", "all"):
            docs, queries = synthetic_suite(args.difficulty)
            suites_local.append(("synthetic_ambiguity_v1", docs, queries))
        if args.suite in ("real", "both", "all"):
            corpus_root = Path(args.corpus)
            docs = load_corpus(corpus_root, args.real_limit, args.seed)
            queries = build_real_queries(docs, args.real_queries, args.seed)
            suites_local.append(("real_corpus_v2", docs, queries))
        if args.suite in ("external_beir", "external_all", "all"):
            try:
                docs, queries = load_external_dataset(
                    "external_beir",
                    args.external_docs,
                    args.external_queries,
                    args.seed,
                )
                suites_local.append(("external_beir_v1", docs, queries))
            except Exception as exc:
                print(f"[WARN] external_beir skipped: {exc}")
                if args.suite == "external_beir":
                    raise
        if args.suite in ("external_multilingual", "external_all", "all"):
            try:
                docs, queries = load_external_dataset(
                    "external_multilingual",
                    args.external_docs,
                    args.external_queries,
                    args.seed,
                )
                suites_local.append(("external_multilingual_v1", docs, queries))
            except Exception as exc:
                print(f"[WARN] external_multilingual skipped: {exc}")
                if args.suite == "external_multilingual":
                    raise
        return suites_local

    def run_single(batch_size: int) -> Tuple[Dict[str, object], List[Dict[str, object]]]:
        suites = build_suites()
        results = {
            "suite": args.suite,
            "difficulty": args.difficulty,
            "candidate_cap": args.candidate_cap,
            "batch_size": batch_size,
            "topk": args.topk,
            "real_limit": args.real_limit,
            "real_queries": args.real_queries,
            "external_docs": args.external_docs,
            "external_queries": args.external_queries,
            "models": [],
            "fusion": [],
            "rerankers": [],
            "routing": [],
            "novelty": [],
        }
        csv_rows: List[Dict[str, object]] = []

        for model_spec in embedder_candidates:
            model_entry = {
                "id": model_spec["id"],
                "path": model_spec.get("path"),
                "results": [],
            }
            for suite_name, docs, queries in suites:
                metrics, stats = eval_model(
                    model_spec,
                    docs,
                    queries,
                    candidate_cap=args.candidate_cap,
                    batch_size=batch_size,
                    topk=args.topk,
                    seed=args.seed,
                )
                entry = {
                    "suite": suite_name,
                    "recall_at_10": round(metrics.recall_at_10, 4),
                    "mrr_at_10": round(metrics.mrr_at_10, 4),
                    "latency_ms_per_1k": round(metrics.avg_latency_ms_per_1k, 2),
                    **stats,
                }
                model_entry["results"].append(entry)
                csv_rows.append(
                    {
                        "model_id": model_spec["id"],
                        "suite": suite_name,
                        "recall_at_10": round(metrics.recall_at_10, 4),
                        "mrr_at_10": round(metrics.mrr_at_10, 4),
                        "latency_ms_per_1k": round(metrics.avg_latency_ms_per_1k, 2),
                        "load_time_ms": stats["load_time_ms"],
                        "memory_delta_mb": stats["memory_delta_mb"],
                        "batch_size": stats["batch_size"],
                        "candidate_cap": stats["candidate_cap"],
                        "doc_count": stats["doc_count"],
                        "query_count": stats["query_count"],
                        "difficulty": args.difficulty,
                        "real_limit": args.real_limit,
                        "real_queries": args.real_queries,
                    }
                )
            results["models"].append(model_entry)

        if args.fusion != "none":
            if not args.flash_id or not args.pro_id:
                raise SystemExit("--fusion requires --flash-id and --pro-id")
            flash_spec = find_model_spec(embedder_candidates, args.flash_id)
            pro_spec = find_model_spec(embedder_candidates, args.pro_id)

            for suite_name, docs, queries in suites:
                precomputed, stats = precompute_query_scores(
                    flash_spec,
                    pro_spec,
                    docs,
                    queries,
                    candidate_cap=args.candidate_cap,
                    batch_size=batch_size,
                    seed=args.seed,
                )
                if args.fusion_weights:
                    parts = [float(x.strip()) for x in args.fusion_weights.split(",")]
                    if len(parts) != 4:
                        raise SystemExit("--fusion-weights requires 4 comma-separated values")
                    total = sum(parts)
                    if total <= 0:
                        raise SystemExit("--fusion-weights must sum to > 0")
                    weights = FusionWeights(
                        flash=parts[0] / total,
                        pro=parts[1] / total,
                        lexical=parts[2] / total,
                        dir_prior=parts[3] / total,
                    )
                elif args.fusion == "learned":
                    weights = learned_weights_from_precomputed(precomputed)
                else:
                    weights, _ = grid_search_weights_from_precomputed(
                        precomputed,
                        topk=args.topk,
                        strategy=args.fusion,
                        step=args.grid_step,
                    )
                fusion_metrics = eval_fusion_from_precomputed(
                    precomputed,
                    weights,
                    args.fusion,
                    args.topk,
                )
                fusion_entry = {
                    "suite": suite_name,
                    "strategy": args.fusion,
                    "weights": {
                        "flash": weights.flash,
                        "pro": weights.pro,
                        "lexical": weights.lexical,
                        "dir_prior": weights.dir_prior,
                    },
                    "recall_at_10": round(fusion_metrics.recall_at_10, 4),
                    "mrr_at_10": round(fusion_metrics.mrr_at_10, 4),
                    "latency_ms_per_1k": stats["latency_ms_per_1k"],
                    **stats,
                }
                results["fusion"].append(fusion_entry)

        if args.routing:
            if not args.flash_id or not args.pro_id:
                raise SystemExit("--routing requires --flash-id and --pro-id")
            flash_spec = find_model_spec(embedder_candidates, args.flash_id)
            pro_spec = find_model_spec(embedder_candidates, args.pro_id)
            for suite_name, docs, queries in suites:
                precomputed, stats = precompute_query_scores(
                    flash_spec,
                    pro_spec,
                    docs,
                    queries,
                    candidate_cap=args.candidate_cap,
                    batch_size=batch_size,
                    seed=args.seed,
                )
                routed = eval_routing_from_precomputed(
                    precomputed,
                    gap_threshold=args.route_gap,
                    lexical_threshold=args.route_lexical,
                    short_len=args.route_short,
                    topk=args.topk,
                )
                results["routing"].append(
                    {
                        "suite": suite_name,
                        "gap_threshold": args.route_gap,
                        "lexical_threshold": args.route_lexical,
                        "short_len": args.route_short,
                        "recall_at_10": round(routed.recall_at_10, 4),
                        "mrr_at_10": round(routed.mrr_at_10, 4),
                        "latency_ms_per_1k": stats["latency_ms_per_1k"],
                        **stats,
                    }
                )

        if args.novelty:
            dims_list = [int(x.strip()) for x in args.matryoshka_dims.split(",") if x.strip()]
            flash_spec = find_model_spec(embedder_candidates, args.flash_id) if args.flash_id else None
            pro_spec = find_model_spec(embedder_candidates, args.pro_id) if args.pro_id else None

            for suite_name, docs, queries in suites:
                if flash_spec:
                    metrics, stats = eval_late_interaction(
                        flash_spec,
                        docs,
                        queries,
                        candidate_cap=args.candidate_cap,
                        batch_size=batch_size,
                        topk=args.topk,
                        seed=args.seed,
                        late_k=args.late_k,
                        chunk_size=args.late_chunk,
                    )
                    results["novelty"].append(
                        {
                            "suite": suite_name,
                            "experiment": "late_interaction",
                            "model_id": flash_spec["id"],
                            "late_k": args.late_k,
                            "chunk_size": args.late_chunk,
                            "recall_at_10": round(metrics.recall_at_10, 4),
                            "mrr_at_10": round(metrics.mrr_at_10, 4),
                            "latency_ms_per_1k": stats["latency_ms_per_1k"],
                        }
                    )
                    csv_rows.append(
                        {
                            "model_id": flash_spec["id"],
                            "suite": suite_name,
                            "kind": "novelty",
                            "experiment": "late_interaction",
                            "recall_at_10": round(metrics.recall_at_10, 4),
                            "mrr_at_10": round(metrics.mrr_at_10, 4),
                            "latency_ms_per_1k": stats["latency_ms_per_1k"],
                        }
                    )

                    metrics_by_dim, stats = eval_matryoshka(
                        flash_spec,
                        docs,
                        queries,
                        candidate_cap=args.candidate_cap,
                        batch_size=batch_size,
                        topk=args.topk,
                        seed=args.seed,
                        dims_list=dims_list,
                    )
                    for dim, metrics in metrics_by_dim.items():
                        results["novelty"].append(
                            {
                                "suite": suite_name,
                                "experiment": "matryoshka",
                                "model_id": flash_spec["id"],
                                "dim": dim,
                                "recall_at_10": round(metrics.recall_at_10, 4),
                                "mrr_at_10": round(metrics.mrr_at_10, 4),
                                "latency_ms_per_1k": stats["latency_ms_per_1k"],
                            }
                        )
                        csv_rows.append(
                            {
                                "model_id": flash_spec["id"],
                                "suite": suite_name,
                                "kind": "novelty",
                                "experiment": "matryoshka",
                                "dim": dim,
                                "recall_at_10": round(metrics.recall_at_10, 4),
                                "mrr_at_10": round(metrics.mrr_at_10, 4),
                                "latency_ms_per_1k": stats["latency_ms_per_1k"],
                            }
                        )

                if flash_spec and pro_spec:
                    precomputed, stats = precompute_query_scores(
                        flash_spec,
                        pro_spec,
                        docs,
                        queries,
                        candidate_cap=args.candidate_cap,
                        batch_size=batch_size,
                        seed=args.seed,
                    )
                    try:
                        learned_metrics, learn_stats = eval_routing_learned_from_precomputed(
                            precomputed, args.topk, args.seed
                        )
                        results["novelty"].append(
                            {
                                "suite": suite_name,
                                "experiment": "routing_learned",
                                "flash_id": flash_spec["id"],
                                "pro_id": pro_spec["id"],
                                "train_size": learn_stats["train_size"],
                                "test_size": learn_stats["test_size"],
                                "recall_at_10": round(learned_metrics.recall_at_10, 4),
                                "mrr_at_10": round(learned_metrics.mrr_at_10, 4),
                                "latency_ms_per_1k": stats["latency_ms_per_1k"],
                            }
                        )
                        csv_rows.append(
                            {
                                "model_id": f"{flash_spec['id']}+{pro_spec['id']}",
                                "suite": suite_name,
                                "kind": "novelty",
                                "experiment": "routing_learned",
                                "recall_at_10": round(learned_metrics.recall_at_10, 4),
                                "mrr_at_10": round(learned_metrics.mrr_at_10, 4),
                                "latency_ms_per_1k": stats["latency_ms_per_1k"],
                            }
                        )
                    except Exception as exc:
                        print(f"[WARN] learned routing skipped: {exc}")

        if args.eval_rerankers:
            if not args.rerank_base_id:
                raise SystemExit("--eval-rerankers requires --rerank-base-id")
            base_spec = find_model_spec(embedder_candidates, args.rerank_base_id)
            for reranker_spec in reranker_candidates:
                reranker_entry = {
                    "id": reranker_spec["id"],
                    "path": reranker_spec.get("path"),
                    "results": [],
                }
                for suite_name, docs, queries in suites:
                    metrics, stats = eval_reranker(
                        reranker_spec,
                        base_spec,
                        docs,
                        queries,
                        candidate_cap=args.candidate_cap,
                        batch_size=batch_size,
                        topk=args.topk,
                        rerank_topk=args.rerank_topk,
                        seed=args.seed,
                    )
                    reranker_entry["results"].append(
                        {
                            "suite": suite_name,
                            "recall_at_10": round(metrics.recall_at_10, 4),
                            "mrr_at_10": round(metrics.mrr_at_10, 4),
                            "latency_ms_per_1k": round(metrics.avg_latency_ms_per_1k, 2),
                            **stats,
                        }
                    )
                results["rerankers"].append(reranker_entry)

        return results, csv_rows

    batch_sizes = []
    if args.batch_sizes:
        batch_sizes = [int(x.strip()) for x in args.batch_sizes.split(",") if x.strip()]
    if not batch_sizes:
        batch_sizes = [args.batch_size]

    runs = []
    all_csv_rows: List[Dict[str, object]] = []
    for batch_size in batch_sizes:
        result, csv_rows = run_single(batch_size)
        runs.append(result)
        all_csv_rows.extend(csv_rows)

    output_payload = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "suite": args.suite,
        "difficulty": args.difficulty,
        "runs": runs,
    }
    write_results_json(Path(args.output), output_payload)
    write_results_csv(Path(args.csv), all_csv_rows)

    print(f"[OK] Results saved to: {args.output}")
    print(f"[OK] CSV saved to: {args.csv}")


if __name__ == "__main__":
    main()
