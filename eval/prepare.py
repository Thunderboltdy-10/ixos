"""Recreate corpus files from the pinned upstream archives and frozen suites."""

import argparse
import gzip
import json
from pathlib import Path
import subprocess
import zipfile
from eval.dataset import Dataset, relative_path, sha

ARCHIVES = {
    "repoqa": (
        "c050a2ad90a7df89d9dc1f1c3b3b20683edd20a56293b35fcaae43dec115d681",
        "https://raw.githubusercontent.com/evalplus/repoqa_release/e3a571033de99d0b9dcaccd25577a75d4b1c70b1/repoqa-2024-06-23.json.gz",
    ),
    "scifact": (
        "536e14446a0ba56ed1398ab1055f39fe852686ecad24a6306c80c490fa8e0165",
        "https://public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/scifact.zip",
    ),
}


def write_source(root, path, data):
    target = root / relative_path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--suite", choices=list(ARCHIVES), required=True)
    parser.add_argument("--split", choices=["dev", "test"], default="dev")
    parser.add_argument("--archive", type=Path, required=True)
    parser.add_argument("--destination", type=Path, required=True)
    args = parser.parse_args()
    if args.destination.exists():
        parser.error("Use a new destination")
    if sha(args.archive) != ARCHIVES[args.suite][0]:
        parser.error("Archive differs from the pinned upstream bytes")
    base = Path(__file__).parent / "suites" / args.suite
    args.destination.mkdir(parents=True)
    # The evaluation owns an isolated corpus. Parent-checkout ignore rules
    # must not exclude it merely because raw evaluation data is gitignored.
    subprocess.run(["git", "init", "--quiet", str(args.destination)], check=True)
    if args.suite == "repoqa":
        with gzip.open(args.archive, "rb") as stream:
            data = json.load(stream)
        repositories = {
            repo["repo"]: repo for language in data.values() for repo in language
        }
        for manifest in sorted((base / args.split).glob("*.json")):
            spec = json.loads(manifest.read_text(encoding="utf-8"))
            repository = spec["queries"][0]["group"]
            repo = repositories[repository]
            if repo["commit_sha"] != spec["provenance"]["revision"]:
                raise ValueError("Source revision differs from the suite")
            root = args.destination / manifest.stem / "corpus"
            for source in spec["sources"]:
                write_source(
                    root,
                    source["path"],
                    repo["content"][source["path"]].encode("utf-8"),
                )
            Dataset(manifest, root)
    else:
        manifest = base / "manifest.json"
        spec = json.loads(manifest.read_text(encoding="utf-8"))
        with zipfile.ZipFile(args.archive) as archive:
            documents = {
                row["_id"]: row
                for row in (
                    json.loads(line)
                    for line in archive.read("scifact/corpus.jsonl")
                    .decode("utf-8")
                    .splitlines()
                )
            }
        root = args.destination / "corpus"
        for source in spec["sources"]:
            document = documents[Path(source["path"]).stem]
            text = document.get("title", "") + "\n" + document.get("text", "") + "\n"
            write_source(root, source["path"], text.encode("utf-8"))
        Dataset(manifest, root)
    print(f"Prepared {args.suite} in {args.destination}")


if __name__ == "__main__":
    main()
