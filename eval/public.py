"""Prepare pinned Semble-compatible code corpora; downloaded sources stay ignored.

The upstream file-only labels remain file-only. Existing source-span labels are
retained without deriving new spans from a retrieval model or inspecting test queries.
"""
from __future__ import annotations
import argparse
from collections import Counter
import io
import json
from pathlib import Path
import tarfile
import urllib.request
from eval.contract import canonical_hash, digest, load_dataset, relative_path

SEMBLE_REVISION = "170608652681fadab4fcfac0834d6f962e59299e"
UPSTREAM = f"https://raw.githubusercontent.com/MinishLab/semble/{SEMBLE_REVISION}"
TEXT_EXTENSIONS = {".rs", ".py", ".js", ".ts", ".tsx", ".jsx", ".go", ".java", ".c", ".cpp", ".h", ".hpp", ".cs", ".swift", ".kt", ".rb", ".php", ".sh", ".md", ".txt", ".json", ".toml", ".yaml", ".yml", ".xml", ".html", ".css", ".sql"}
# Explicit repository-level split decided before any model results. Initial
# restoration work uses these six; additional repositories require a frozen split.
SPLITS = {"fastapi": "dev", "serde": "dev", "axios": "validation", "tokio": "validation", "requests": "test", "axum": "test"}


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "Ixos-reproducible-eval/1"})
    with urllib.request.urlopen(request, timeout=120) as response:
        return response.read()


def prepare(name: str, destination: Path) -> dict:
    if name not in SPLITS:
        raise ValueError("A repository must have a frozen split before preparation")
    folder = destination / name
    root = folder / "corpus"
    if root.exists():
        raise ValueError("Use a new corpus directory; preparation must not merge with an earlier inventory")
    upstream_repos = fetch(f"{UPSTREAM}/benchmarks/repos.json")
    spec = next(r for r in json.loads(upstream_repos) if r["name"] == name)
    annotations_bytes = fetch(f"{UPSTREAM}/benchmarks/annotations/{name}.json")
    annotations = json.loads(annotations_bytes)
    owner_repo = spec["url"].removeprefix("https://github.com/").removesuffix(".git")
    archive_url = f"https://codeload.github.com/{owner_repo}/tar.gz/{spec['revision']}"
    archive_bytes = fetch(archive_url)
    root.mkdir(parents=True)
    benchmark_root = spec.get("benchmark_root", "")
    prefix = relative_path(benchmark_root).rstrip("/") + "/" if benchmark_root else ""
    sources = []
    with tarfile.open(fileobj=io.BytesIO(archive_bytes), mode="r:gz") as archive:
        for entry in sorted(archive.getmembers(), key=lambda m: m.name):
            # Extract explicit regular files only. Never tar.extractall a remote archive.
            if not entry.isfile():
                continue
            parts = entry.name.split("/", 1)
            if len(parts) != 2:
                continue
            if "/" not in parts[1] and parts[1].upper().startswith(("LICENSE", "COPYING", "NOTICE")):
                stream = archive.extractfile(entry)
                if stream:
                    (folder / ("UPSTREAM-" + Path(parts[1]).name)).write_bytes(stream.read())
            if not parts[1].startswith(prefix):
                continue
            path = relative_path(parts[1][len(prefix):])
            if Path(path).suffix.lower() not in TEXT_EXTENSIONS or any(p.startswith(".") or p in {"node_modules", "vendor", "target", "dist", "build"} for p in Path(path).parts):
                continue
            stream = archive.extractfile(entry)
            data = stream.read() if stream else b""
            try:
                text = data.decode("utf-8")
            except UnicodeDecodeError:
                continue
            if not text.strip() or "\x00" in text:
                continue
            target = root / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            sources.append({"path": path, "sha256": digest(data)})
    known = {s["path"] for s in sources}
    if not known:
        raise ValueError("No searchable files found")
    queries = []
    for i, row in enumerate(annotations):
        gold = {}
        for tier, grade in [("relevant", 2), ("secondary", 1)]:
            for entry in row.get(tier, []):
                full_path = entry if isinstance(entry, str) else entry["path"]
                if not full_path.startswith(prefix):
                    raise ValueError("Gold path differs from upstream benchmark root")
                path = relative_path(full_path[len(prefix):])
                if path not in known:
                    raise ValueError(f"Gold source not included by corpus policy: {name}/{path}")
                spans = [] if isinstance(entry, str) else [[entry["start_line"], entry["end_line"]]]
                previous = gold.get(path)
                if previous:
                    previous["grade"] = max(previous["grade"], grade)
                    previous["spans"].extend(spans)
                else:
                    gold[path] = {"path": path, "grade": grade, "spans": spans}
        queries.append({"id": f"{name}-{i:03d}", "text": row["query"], "group": name, "split": SPLITS[name], "workload": "code-agent", "kind": row["category"], "answerability": "answerable", "gold": list(gold.values())})
    manifest = {"schema": 1, "id": f"semble-{name}", "provenance": {"origin": f"{UPSTREAM}/benchmarks/annotations/{name}.json", "revision": spec["revision"], "label_method": "Upstream generated and verified LLM labels; existing file/span labels preserved", "license": "Upstream Semble MIT benchmark; source repository retains its own license", "limitations": "Subset with restricted text-extension policy and native Ixos output; not the complete published Semble protocol. File-only labels have no invented spans."}, "sources": sources, "queries": queries}
    manifest_path = folder / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    frozen = load_dataset(manifest_path, root)
    identity = {"name": name, "split": SPLITS[name], "upstream_revision": SEMBLE_REVISION, "repository": spec["url"], "source_revision": spec["revision"], "benchmark_root": benchmark_root, "archive_url": archive_url, "archive_sha256": digest(archive_bytes), "annotations_sha256": digest(annotations_bytes), "repo_catalog_sha256": digest(upstream_repos), "manifest_sha256": frozen.fingerprint, "sources": len(sources), "queries": len(queries), "categories": dict(Counter(q.kind for q in frozen.queries)), "span_annotated_queries": sum(any(g.spans for g in q.gold) for q in frozen.queries)}
    (folder / "download.json").write_text(json.dumps(identity, indent=2), encoding="utf-8")
    return identity


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", action="append", required=True, choices=sorted(SPLITS))
    parser.add_argument("--destination", type=Path, default=Path("dataset/restoration/public"))
    parser.add_argument("--receipt", type=Path, default=Path("reports/restoration/gate3-public-sources.json"))
    args = parser.parse_args()
    identities = []
    for name in args.repo:
        identity = prepare(name, args.destination)
        identities.append(identity)
        args.receipt.parent.mkdir(parents=True, exist_ok=True)
        args.receipt.write_text(json.dumps(identities, indent=2), encoding="utf-8")
        print(f"{name}: {identity['sources']} sources, {identity['queries']} queries, split={identity['split']}", flush=True)


if __name__ == "__main__":
    main()
