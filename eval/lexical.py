"""Strong, bounded-context lexical baselines over the identical frozen sources."""
from __future__ import annotations
from collections import Counter
import json
import math
from pathlib import Path
import re
import subprocess
import time
from eval.backends import Response
from eval.contract import ContractError, Dataset, validate_view

STOPWORDS = set("a an and are as at be by can does for from how i in is it of on or that the this to was what when where which who why with would".split())


def tokens(text: str) -> list[str]:
    text = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", text)
    return re.findall(r"[^\W_]+", text.casefold())


def terms(query: str) -> list[str]:
    return list(dict.fromkeys(t for t in tokens(query) if t not in STOPWORDS and len(t) >= 2))


def view_at(dataset: Dataset, path: str, line: int, context: int) -> dict:
    lines = dataset.sources[path].lines
    start, end = max(1, line-context), min(len(lines), line+context)
    return {"path": path, "start_line": start, "end_line": end, "text": "\n".join(lines[start-1:end])}


def compact_response(rows: list[dict], budget: int) -> tuple[bytes, list[dict]]:
    if budget < len(b'{"results":[]}\n'):
        raise ContractError("Output budget cannot hold an empty response")
    raw=bytearray(b'{"results":[')
    retained=[]
    for original in rows:
        row=dict(original)
        anchor=row.pop('_anchor',None)
        def encode(): return json.dumps(row,ensure_ascii=False,separators=(',',':')).encode('utf-8')
        encoded=encode()
        room=budget-len(raw)-3-bool(retained)
        if len(encoded)>room and row.get('view') is not None and anchor is not None:
            view=row['view']
            lines=view['text'].split('\n')
            row['view']={**view,'start_line':anchor,'end_line':anchor,'text':lines[anchor-view['start_line']]}
            encoded=encode()
        if len(encoded)>room and row.get('view') is not None:
            row.pop('view');row['evidence_omitted']=True
            encoded=encode()
        if len(encoded)>room:break
        if retained:raw.extend(b',')
        raw.extend(encoded);retained.append(row)
    raw.extend(b']}\n')
    return bytes(raw),retained


class BM25:
    """Explicit persistent in-memory index; never described as no-index/JIT."""
    def __init__(self, dataset: Dataset):
        started = time.perf_counter()
        self.dataset = dataset
        self.tf = {path: Counter(tokens("\n".join(source.lines)+" "+path+" "+path)) for path, source in dataset.sources.items()}
        self.df: Counter = Counter()
        self.lengths = {path: sum(counts.values()) for path, counts in self.tf.items()}
        for counts in self.tf.values():
            self.df.update(counts.keys())
        self.average_length = sum(self.lengths.values()) / len(self.tf)
        self.prepare_ms = (time.perf_counter()-started)*1000

    def search(self, query: str, *, limit=10, context=2, output_bytes=12000) -> Response:
        started = time.perf_counter()
        query_terms = terms(query)
        idfs = {t: math.log(1+(len(self.tf)-self.df[t]+.5)/(self.df[t]+.5)) for t in query_terms}
        scored = []
        for path, counts in self.tf.items():
            score = sum(idfs[t]*(counts[t]*2.2)/(counts[t]+1.2*(.25+.75*self.lengths[path]/max(self.average_length, 1))) for t in query_terms if counts[t])
            if score > 0:
                scored.append((score, path))
        scored.sort(key=lambda item: (-item[0], item[1]))
        rows = []
        for score, path in scored[:limit]:
            lines = self.dataset.sources[path].lines
            evidence = max(range(len(lines)), key=lambda i: (sum(idfs.get(t, 0) for t in set(tokens(lines[i]))), -i)) + 1
            rows.append({"path": path, "score": score, "view": view_at(self.dataset, path, evidence, context), '_anchor':evidence})
        raw, retained = compact_response(rows, output_bytes)
        elapsed = (time.perf_counter()-started)*1000
        views = [r["view"] for r in retained if r.get("view") is not None]
        for view in views:
            validate_view(view, self.dataset)
        return Response([r["path"] for r in retained], views, raw, b"", ["in-process", "bm25", query], 0, elapsed, {"condition": "persistent-bm25-query", "prepareMs": self.prepare_ms, "files_scored": len(self.tf), "positive_candidates": len(scored)}, [])


def run_rg(executable: str, root: Path, dataset: Dataset, query: str, *, limit=10, context=2, output_bytes=12000, strategy="keywords", capture=None) -> Response:
    started = time.perf_counter()
    query_terms = terms(query) if strategy == "keywords" else [query]
    if not query_terms:
        raw, _ = compact_response([], output_bytes)
        return Response([], [], raw, b"", [], 0, (time.perf_counter()-started)*1000, {"condition": "rg-ranked-context", "query_terms": []}, [])
    # The source catalog fixes eligible files; the same catalog is used by other
    # backends. No backend sees gold when constructing patterns or evidence.
    # Exact inventory validation permits root search without thousands of argv
    # paths, which would exceed Windows' command-line limit on dense corpora.
    argv = [executable, "--json", "--line-number", "--ignore-case", "--no-ignore", "--hidden"]
    if strategy != "regex":
        argv += ["--fixed-strings"]
    for term in query_terms:
        argv += ["-e", term]
    argv += ["--", "."]
    raw = subprocess.run(argv, cwd=root, capture_output=True, timeout=120)
    capture_ms = 0.0
    if capture:
        capture_started = time.perf_counter()
        capture(argv, raw.returncode, raw.stdout, raw.stderr, (time.perf_counter()-started)*1000)
        capture_ms = (time.perf_counter()-capture_started)*1000
    if raw.returncode not in {0, 1}:
        raise ContractError(f"ripgrep failed: {raw.returncode}")
    matches: dict[str, list[tuple[int, set[str]]]] = {}
    for line in raw.stdout.decode("utf-8").split("\n"):
        if not line.strip():
            continue
        row = json.loads(line)
        if row["type"] != "match":
            continue
        data = row["data"]
        path = Path(data["path"]["text"]).as_posix()
        if path not in dataset.sources:
            raise ContractError("ripgrep returned an unexpected file")
        shown = data["lines"]["text"].casefold()
        found = {t for t in query_terms if t.casefold() in shown} if strategy != "regex" else {query}
        matches.setdefault(path, []).append((data["line_number"], found))
    ranked = sorted(matches, key=lambda path: (-len(set().union(*(s for _, s in matches[path]))), -min(len(matches[path]), 20), path))
    rows = []
    for path in ranked[:limit]:
        line, found = max(matches[path], key=lambda item: (len(item[1]), -item[0]))
        view = view_at(dataset, path, line, context)
        validate_view(view, dataset)
        rows.append({"path": path, "matched_terms": sorted(found), "view": view, '_anchor':line})
    output, retained = compact_response(rows, output_bytes)
    elapsed = (time.perf_counter()-started)*1000 - capture_ms
    return Response([r["path"] for r in retained], [r["view"] for r in retained if r.get("view") is not None], output, raw.stderr, argv, raw.returncode, elapsed, {"condition": "rg-ranked-context; raw-log capture excluded", "strategy": strategy, "query_terms": query_terms, "matched_files": len(matches), "internal_rg_stdout_bytes": len(raw.stdout), "excluded_capture_ms":capture_ms}, [])
