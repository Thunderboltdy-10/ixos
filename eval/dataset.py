"""Validate frozen source bytes and score ranked files and exact snippets."""

import hashlib
import json
import math
from collections import defaultdict
from pathlib import Path, PurePosixPath


def sha(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def relative_path(path):
    value = PurePosixPath(path)
    if (
        value.is_absolute()
        or any(p in ("", ".", "..") for p in path.split("/"))
        or "\\" in path
        or ":" in path
    ):
        raise ValueError("Expected a relative corpus path")
    return path


class Dataset:
    def __init__(self, manifest, root):
        self.manifest = Path(manifest)
        self.root = Path(root).resolve()
        self.data = json.loads(self.manifest.read_text(encoding="utf-8"))
        self.sources = {}
        expected = set()
        for source in self.data["sources"]:
            path = relative_path(source["path"])
            target = self.root / path
            if (
                target.is_symlink()
                or not target.resolve().is_relative_to(self.root)
                or sha(target) != source["sha256"]
            ):
                raise ValueError(f"Changed or invalid corpus source: {path}")
            text = target.read_bytes().decode("utf-8")
            lines = text.split("\n")
            if lines[-1] == "":
                lines.pop()
            self.sources[path] = [line.removesuffix("\r") for line in lines]
            expected.add(path)
        actual = {
            p.relative_to(self.root).as_posix()
            for p in self.root.rglob("*")
            if p.is_file()
        }
        if actual != expected or any(p.is_symlink() for p in self.root.rglob("*")):
            raise ValueError("Corpus inventory differs from the frozen suite")
        ids = set()
        for query in self.data["queries"]:
            if query["id"] in ids:
                raise ValueError("Repeated query ID")
            ids.add(query["id"])
            for gold in query["gold"]:
                if gold["path"] not in expected:
                    raise ValueError("Relevance label references an unknown source")
                for start, end in gold["spans"]:
                    if not 1 <= start <= end <= len(self.sources[gold["path"]]):
                        raise ValueError("Relevance label has invalid line coordinates")

    def validate_snippet(self, snippet):
        path = relative_path(snippet["path"])
        start, end = snippet["start_line"], snippet["end_line"]
        lines = self.sources[path]
        if not 1 <= start <= end <= len(lines) or snippet["text"] != "\n".join(
            lines[start - 1 : end]
        ):
            raise ValueError("Snippet is not the exact claimed source lines")
        return path, (start, end)


def union(ranges):
    result = []
    for start, end in sorted(ranges):
        if result and start <= result[-1][1] + 1:
            result[-1] = (result[-1][0], max(end, result[-1][1]))
        else:
            result.append((start, end))
    return result


def length(ranges):
    return sum(end - start + 1 for start, end in union(ranges))


def score(dataset, query, response, limit=10):
    rows = response["results"][:limit]
    paths = [row["path"] for row in rows]
    if len(set(paths)) != len(paths) or any(
        path not in dataset.sources for path in paths
    ):
        raise ValueError("Ranked paths are duplicated or outside the corpus")
    shown = defaultdict(list)
    for row in rows:
        snippets = [row["snippet"]] if row.get("snippet") else []
        for snippet in snippets:
            path, bounds = dataset.validate_snippet(snippet)
            if path != row["path"]:
                raise ValueError("Snippet and ranked file disagree")
            shown[path].append(bounds)
    gold = {g["path"]: g for g in query["gold"]}
    hits = [i + 1 for i, path in enumerate(paths) if path in gold]
    dcg = sum(
        (2 ** gold[path]["grade"] - 1) / math.log2(i + 2)
        for i, path in enumerate(paths)
        if path in gold
    )
    ideal = sum(
        (2**grade - 1) / math.log2(i + 2)
        for i, grade in enumerate(
            sorted((g["grade"] for g in gold.values()), reverse=True)[:limit]
        )
    )
    gold_lines = sum(length(g["spans"]) for g in gold.values())
    overlap = sum(
        max(0, min(a[1], b[1]) - max(a[0], b[0]) + 1)
        for path, g in gold.items()
        for a in union(shown[path])
        for b in union(g["spans"])
    )
    return dict(
        ndcg=dcg / ideal if ideal else 0,
        mrr=1 / hits[0] if hits else 0,
        recall=len(hits) / len(gold) if gold else 0,
        line_recall=overlap / gold_lines if gold_lines else None,
    )


def means(rows):
    groups = defaultdict(list)
    for row in rows:
        groups[row["group"]].append(row)
    family_means = [
        {
            key: sum(values) / len(values)
            for key in ("ndcg", "mrr", "recall", "line_recall")
            if (values := [row[key] for row in family if row[key] is not None])
        }
        for family in groups.values()
    ]
    return {
        key: sum(values) / len(values)
        for key in ("ndcg", "mrr", "recall", "line_recall")
        if (values := [family[key] for family in family_means if key in family])
    }
