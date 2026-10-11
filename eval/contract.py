"""Dataset validation and source-grounded retrieval metrics, without model dependencies.

This module never generates relevance labels from model results. Corpus paths and
line intervals are validated against exact UTF-8 source hashes before a run.
"""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
import hashlib
import json
import math
import os
from pathlib import Path, PurePosixPath
import random
from typing import Iterable


class ContractError(ValueError):
    pass


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical_hash(value: object) -> str:
    return digest(json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))


def strict_fields(value: dict, required: set[str], optional: set[str] = frozenset()) -> None:
    if not isinstance(value, dict) or required - value.keys() or value.keys() - required - optional:
        raise ContractError(f"Unexpected or missing fields: expected {sorted(required | optional)}")


def integer(value: object, minimum: int = 1) -> int:
    if type(value) is not int or value < minimum:
        raise ContractError(f"Expected integer >= {minimum}")
    return value


def relative_path(value: object) -> str:
    if not isinstance(value, str) or not value or "\\" in value or ":" in value:
        raise ContractError("Expected portable relative source path")
    parts = PurePosixPath(value)
    if parts.is_absolute() or any(part in {".", ".."} for part in value.split("/")) or "//" in value:
        raise ContractError("Source paths must remain inside the corpus")
    return value


def interval(value: object, line_count: int) -> tuple[int, int]:
    if not isinstance(value, list) or len(value) != 2:
        raise ContractError("Expected [start_line, end_line]")
    start, end = map(integer, value)
    if end < start or end > line_count:
        raise ContractError("Source interval is reversed or outside the source")
    return start, end


def union(ranges: Iterable[tuple[int, int]]) -> list[tuple[int, int]]:
    merged: list[tuple[int, int]] = []
    for start, end in sorted(ranges):
        if merged and start <= merged[-1][1] + 1:
            merged[-1] = merged[-1][0], max(end, merged[-1][1])
        else:
            merged.append((start, end))
    return merged


def length(ranges: Iterable[tuple[int, int]]) -> int:
    return sum(end - start + 1 for start, end in union(ranges))


def intersection_length(a: Iterable[tuple[int, int]], b: Iterable[tuple[int, int]]) -> int:
    left, right = union(a), union(b)
    return sum(max(0, min(x[1], y[1]) - max(x[0], y[0]) + 1) for x in left for y in right)


@dataclass(frozen=True)
class Source:
    path: str
    sha256: str
    lines: tuple[str, ...]


@dataclass(frozen=True)
class Gold:
    path: str
    grade: int
    spans: tuple[tuple[int, int], ...]


@dataclass(frozen=True)
class Query:
    id: str
    text: str
    group: str
    split: str
    workload: str
    kind: str
    gold: tuple[Gold, ...]
    answerability: str
    sequence: str | None
    turn: int | None
    feedback: dict | None


@dataclass(frozen=True)
class Dataset:
    id: str
    sources: dict[str, Source]
    queries: tuple[Query, ...]
    fingerprint: str
    provenance: dict


def validate_inventory(root: Path, expected: set[str]) -> None:
    """Freeze every ordinary file, including hidden files; native streams are allowed.

    Benchmarks use dedicated generated corpora, not a live checkout containing a
    manifest or unrelated files. Symlink directories are rejected even when they
    point inside the root, so a backend cannot discover a different source tree.
    """
    actual = set()
    for folder, directories, files in os.walk(root, followlinks=False):
        for name in directories + files:
            target = Path(folder) / name
            if target.is_symlink():
                raise ContractError("Corpus inventory contains a symlink")
        actual.update((Path(folder) / name).relative_to(root).as_posix() for name in files)
    if actual != expected:
        raise ContractError(f"Corpus inventory differs: extra={sorted(actual-expected)[:8]}, missing={sorted(expected-actual)[:8]}")


def load_dataset(manifest: Path, root: Path) -> Dataset:
    raw = json.loads(manifest.read_text(encoding="utf-8"))
    strict_fields(raw, {"schema", "id", "provenance", "sources", "queries"})
    if type(raw["schema"]) is not int or raw["schema"] != 1 or not isinstance(raw["id"], str) or not raw["id"].strip():
        raise ContractError("Invalid dataset schema/id")
    provenance = raw["provenance"]
    strict_fields(provenance, {"origin", "revision", "label_method", "license", "limitations"})
    if any(not isinstance(v, str) or not v for v in provenance.values()):
        raise ContractError("Provenance fields must be nonempty strings")
    resolved_root = root.resolve(strict=True)
    sources: dict[str, Source] = {}
    for row in raw["sources"]:
        strict_fields(row, {"path", "sha256"})
        path = relative_path(row["path"])
        target = (resolved_root / path).resolve(strict=True)
        if not target.is_relative_to(resolved_root) or (resolved_root / path).is_symlink():
            raise ContractError("Source escaped corpus or is a symlink")
        data = target.read_bytes()
        if path in sources or digest(data) != row["sha256"]:
            raise ContractError(f"Duplicate or changed source: {path}")
        try:
            text = data.decode("utf-8")
            # Source coordinates are physical LF/CRLF lines, matching Rust/rg.
            # str.splitlines also treats U+2028, NEL and form feed as line breaks.
            lines = text.split("\n")
            if lines and lines[-1] == "":
                lines.pop()
            lines = tuple(line.removesuffix("\r") for line in lines)
        except UnicodeDecodeError as exc:
            raise ContractError("Text benchmark sources must be UTF-8; parser probes are separate") from exc
        sources[path] = Source(path, row["sha256"], lines)
    if not sources:
        raise ContractError("An empty corpus is not an evaluation")
    validate_inventory(resolved_root, set(sources))
    queries: list[Query] = []
    ids: set[str] = set()
    group_splits: dict[str, str] = {}
    text_splits: dict[str, str] = {}
    gold_splits: dict[str, str] = {}
    sequence_turns: dict[str, list[int]] = defaultdict(list)
    sequence_groups: dict[str, str] = {}
    for row in raw["queries"]:
        strict_fields(row, {"id", "text", "group", "split", "workload", "kind", "gold", "answerability"}, {"sequence", "turn", "feedback"})
        for field in ["id", "text", "group", "kind"]:
            if not isinstance(row[field], str) or not row[field].strip():
                raise ContractError(f"Empty query field: {field}")
        if row["id"] in ids:
            raise ContractError("Duplicate query ID")
        ids.add(row["id"])
        if row["split"] not in {"dev", "validation", "test"} or row["workload"] not in {"code-agent", "document-agent", "human"}:
            raise ContractError("Invalid split/workload")
        old_split = group_splits.setdefault(row["group"], row["split"])
        if old_split != row["split"]:
            raise ContractError("Repository/document family leaks across selection and test splits")
        normalized = " ".join(row["text"].casefold().split())
        if text_splits.setdefault(normalized, row["split"]) != row["split"]:
            raise ContractError("Identical query text leaks across splits")
        gold: list[Gold] = []
        gold_paths: set[str] = set()
        for relevance in row["gold"]:
            strict_fields(relevance, {"path", "grade", "spans"})
            path = relative_path(relevance["path"])
            if path not in sources or path in gold_paths:
                raise ContractError("Gold path is missing or duplicated")
            gold_paths.add(path)
            source_hash = sources[path].sha256
            if gold_splits.setdefault(source_hash, row["split"]) != row["split"]:
                raise ContractError("Identical relevant source content leaks across splits")
            grade = integer(relevance["grade"])
            if grade > 3:
                raise ContractError("Grades must be in 1..3")
            spans = tuple(union(interval(s, len(sources[path].lines)) for s in relevance["spans"]))
            gold.append(Gold(path, grade, spans))
        if row["answerability"] not in {"answerable", "unanswerable", "unknown"}:
            raise ContractError("Invalid answerability label")
        if (row["answerability"] == "answerable" and not gold) or (row["answerability"] == "unanswerable" and gold):
            raise ContractError("Answerability contradicts relevance labels")
        sequence, turn, feedback = row.get("sequence"), row.get("turn"), row.get("feedback")
        if (sequence is None) != (turn is None):
            raise ContractError("Sequence and turn must be provided together")
        if sequence is not None:
            if not isinstance(sequence, str) or not sequence:
                raise ContractError("Invalid sequence ID")
            integer(turn, 0)
            if sequence_groups.setdefault(sequence, row["group"]) != row["group"]:
                raise ContractError("Sequence crosses dataset families")
            sequence_turns[sequence].append(turn)
        if feedback is not None:
            strict_fields(feedback, {"query_id", "accepted", "rejected"})
            # Feedback is available only after an earlier turn, never future gold.
            previous = next((q for q in queries if q.id == feedback["query_id"]), None)
            if sequence is None or not previous or previous.sequence != sequence or previous.turn >= turn:
                raise ContractError("Feedback references a future, unrelated or missing query")
            accepted, rejected = feedback["accepted"], feedback["rejected"]
            if not isinstance(accepted, list) or not isinstance(rejected, list):
                raise ContractError("Feedback must contain explicit path lists")
            accepted = [relative_path(path) for path in accepted]
            rejected = [relative_path(path) for path in rejected]
            if len(set(accepted)) != len(accepted) or len(set(rejected)) != len(rejected) or set(accepted) & set(rejected):
                raise ContractError("Feedback paths overlap or are duplicated")
            if any(p not in sources for p in accepted + rejected):
                raise ContractError("Feedback references an unknown source")
        queries.append(Query(row["id"], row["text"], row["group"], row["split"], row["workload"], row["kind"], tuple(gold), row["answerability"], sequence, turn, feedback))
    for turns in sequence_turns.values():
        if turns != list(range(len(turns))):
            raise ContractError("Sequence turns must be unique, ordered and contiguous from zero")
    if not queries:
        raise ContractError("No queries")
    return Dataset(raw["id"], sources, tuple(queries), canonical_hash(raw), provenance)


def validate_view(view: dict, dataset: Dataset) -> tuple[str, tuple[int, int]]:
    strict_fields(view, {"path", "start_line", "end_line", "text"})
    path = relative_path(view["path"])
    if path not in dataset.sources:
        raise ContractError("Result references a source outside the frozen corpus")
    bounds = interval([view["start_line"], view["end_line"]], len(dataset.sources[path].lines))
    expected = "\n".join(dataset.sources[path].lines[bounds[0]-1:bounds[1]])
    if view["text"] != expected:
        raise ContractError("Reported evidence is not the exact claimed source lines")
    return path, bounds


def score_query(query: Query, views: list[dict], dataset: Dataset, k: int = 10, paths: list[str] | None = None) -> dict:
    integer(k)
    checked = [validate_view(view, dataset) for view in views]
    # File rankings credit a file once; repeated passages cannot inflate nDCG.
    if paths is not None:
        if any(relative_path(path) not in dataset.sources for path in paths):
            raise ContractError("Ranked path is outside the frozen corpus")
        if any(path not in paths for path, _ in checked):
            raise ContractError("Displayed evidence does not belong to a ranked result")
    ranked = list(dict.fromkeys(paths if paths is not None else (path for path, _ in checked)))[:k]
    gold = {entry.path: entry for entry in query.gold}
    hits = [i + 1 for i, path in enumerate(ranked) if path in gold]
    dcg = sum((2**gold[p].grade - 1) / math.log2(i + 2) for i, p in enumerate(ranked) if p in gold)
    ideal = sum((2**grade - 1) / math.log2(i + 2) for i, grade in enumerate(sorted((g.grade for g in query.gold), reverse=True)[:k]))
    predicted: dict[str, list[tuple[int, int]]] = defaultdict(list)
    for path, bounds in checked[:k]:
        predicted[path].append(bounds)
    annotated = any(g.spans for g in query.gold)
    gold_lines = sum(length(g.spans) for g in query.gold)
    viewed_lines = sum(length(v) for v in predicted.values())
    overlap = sum(intersection_length(predicted.get(g.path, []), g.spans) for g in query.gold)
    answerable = query.answerability == "answerable"
    return {
        "mrr": 1 / hits[0] if hits else (0.0 if gold or answerable else None),
        "recall": len(hits) / len(gold) if gold else None,
        "ndcg": dcg / ideal if ideal else None,
        "span_recall": overlap / gold_lines if annotated else None,
        "span_precision": overlap / viewed_lines if annotated and viewed_lines else (0.0 if annotated else None),
        "span_metrics_complete": all(g.spans for g in query.gold) if gold else False,
        "false_positive": bool(ranked) if query.answerability == "unanswerable" else None,
        "abstained": not ranked,
        "unique_viewed_lines": viewed_lines,
        "duplicate_views": len(checked) - len(set(checked)),
    }


def cluster_mean_ci(rows: list[dict], metric: str, seed: int = 0, resamples: int = 2000) -> dict:
    """Equal family weighting and deterministic cluster bootstrap, not repeated-run N."""
    groups: dict[str, list[float]] = defaultdict(list)
    seen: set[str] = set()
    for row in rows:
        if row["query_id"] in seen:
            raise ContractError("Aggregate query metrics after combining timing repetitions")
        seen.add(row["query_id"])
        value = row[metric]
        if value is not None:
            if not isinstance(value, (int, float)) or not math.isfinite(value):
                raise ContractError("Invalid metric value")
            groups[row["group"]].append(float(value))
    means = [sum(v) / len(v) for _, v in sorted(groups.items())]
    if not means:
        return {"mean": None, "ci95": None, "families": 0, "queries": 0}
    average = sum(means) / len(means)
    if len(means) < 2:
        return {"mean": average, "ci95": None, "families": 1, "queries": sum(map(len, groups.values()))}
    integer(resamples)
    rng = random.Random(seed)
    samples = sorted(sum(rng.choices(means, k=len(means))) / len(means) for _ in range(resamples))
    return {"mean": average, "ci95": [samples[int(.025*resamples)], samples[min(resamples-1, int(.975*resamples))]], "families": len(means), "queries": sum(map(len, groups.values()))}


def paired_family_difference(baseline: list[dict], candidate: list[dict], metric: str, seed=0) -> dict:
    """Candidate minus baseline with identical queries/families; no unpaired cherry-picking."""
    def keyed(rows):
        result={r["query_id"]:r for r in rows}
        if len(result)!=len(rows):
            raise ContractError("Combine repetitions before paired comparison")
        return result
    left,right=keyed(baseline),keyed(candidate)
    if left.keys()!=right.keys():
        raise ContractError("Paired comparison requires the same query IDs")
    differences=[]
    for qid in sorted(left):
        a,b=left[qid],right[qid]
        if a["group"]!=b["group"] or (a[metric] is None)!=(b[metric] is None):
            raise ContractError("Paired families/metric eligibility differ")
        differences.append({"query_id":qid,"group":a["group"],"difference":b[metric]-a[metric] if a[metric] is not None else None})
    return cluster_mean_ci(differences,"difference",seed=seed)
