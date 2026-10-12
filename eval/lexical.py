"""Full-text BM25 and ranked ripgrep over the same frozen sources."""

from collections import Counter
import json
import math
import re
import subprocess
from eval.backends import bounded

STOPWORDS = set(
    "a an and are as at be by can does for from how i in is it of on or that the this to was what when where which who why with would".split()
)


def tokens(text):
    text = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", text)
    return re.findall(r"[^\W_]+", text.casefold())


def terms(query):
    return list(
        dict.fromkeys(t for t in tokens(query) if t not in STOPWORDS and len(t) >= 2)
    )


def snippet_at(dataset, path, line, context=2):
    lines = dataset.sources[path]
    start, end = max(1, line - context), min(len(lines), line + context)
    return dict(
        path=path,
        start_line=start,
        end_line=end,
        text="\n".join(lines[start - 1 : end]),
    )


class BM25:
    def __init__(self, dataset):
        self.dataset = dataset
        self.tf = {
            path: Counter(tokens("\n".join(lines) + " " + path + " " + path))
            for path, lines in dataset.sources.items()
        }
        self.df = Counter()
        self.lengths = {path: sum(counts.values()) for path, counts in self.tf.items()}
        for counts in self.tf.values():
            self.df.update(counts.keys())
        self.average = sum(self.lengths.values()) / len(self.tf)

    def search(self, query):
        words = terms(query)
        idfs = {
            t: math.log(1 + (len(self.tf) - self.df[t] + 0.5) / (self.df[t] + 0.5))
            for t in words
        }
        scored = []
        for path, counts in self.tf.items():
            value = sum(
                idfs[t]
                * counts[t]
                * 2.2
                / (
                    counts[t]
                    + 1.2 * (0.25 + 0.75 * self.lengths[path] / max(self.average, 1))
                )
                for t in words
                if counts[t]
            )
            if value > 0:
                scored.append((value, path))
        scored.sort(key=lambda item: (-item[0], item[1]))
        rows = []
        for value, path in scored[:10]:
            lines = self.dataset.sources[path]
            anchor = (
                max(
                    range(len(lines)),
                    key=lambda i: (
                        sum(idfs.get(t, 0) for t in set(tokens(lines[i]))),
                        -i,
                    ),
                )
                + 1
            )
            rows.append(
                dict(
                    path=path,
                    score=value,
                    snippet=snippet_at(self.dataset, path, anchor),
                )
            )
        return bounded(rows)


def run_rg(root, dataset, query):
    words = terms(query)
    if not words:
        return bounded([])
    argv = [
        "rg",
        "--json",
        "--line-number",
        "--ignore-case",
        "--no-ignore",
        "--hidden",
        "--fixed-strings",
    ]
    for word in words:
        argv += ["-e", word]
    raw = subprocess.run(argv + ["--", "."], cwd=root, capture_output=True, timeout=120)
    if raw.returncode not in (0, 1):
        raise ValueError("ripgrep failed")
    matches = {}
    for line in raw.stdout.decode("utf-8").split("\n"):
        if not line:
            continue
        event = json.loads(line)
        if event["type"] != "match":
            continue
        data = event["data"]
        path = data["path"]["text"].replace("\\", "/").removeprefix("./")
        if path not in dataset.sources:
            raise ValueError("ripgrep returned an unknown file")
        found = {w for w in words if w in data["lines"]["text"].casefold()}
        matches.setdefault(path, []).append((data["line_number"], found))
    ranked = sorted(
        matches,
        key=lambda p: (
            -len(set().union(*(s for _, s in matches[p]))),
            -min(len(matches[p]), 20),
            p,
        ),
    )
    rows = []
    for path in ranked[:10]:
        line, found = max(matches[path], key=lambda item: (len(item[1]), -item[0]))
        rows.append(
            dict(path=path, score=len(found), snippet=snippet_at(dataset, path, line))
        )
    return bounded(rows)
