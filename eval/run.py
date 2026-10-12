"""Evaluate each frozen query once through resident Ixos, BM25 or ranked rg."""

import argparse
import json
import os
from pathlib import Path
import tempfile
import tiktoken
from eval.backends import Ixos
from eval.dataset import Dataset, means, score, sha
from eval.lexical import BM25, run_rg


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--suite", choices=["repoqa", "scifact"], required=True)
    parser.add_argument("--split", choices=["dev", "test"], required=True)
    parser.add_argument(
        "--sources", type=Path, required=True, help="Prepared suite directory"
    )
    parser.add_argument(
        "--method", choices=["hybrid", "lexical", "bm25", "rg"], required=True
    )
    parser.add_argument(
        "--binary",
        type=Path,
        default=Path(
            "target/release/ixos.exe" if os.name == "nt" else "target/release/ixos"
        ),
    )
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument(
        "--output", type=Path, required=True, help="New ignored raw-run directory"
    )
    parser.add_argument("--result", type=Path, required=True, help="Small result JSON")
    args = parser.parse_args()
    if args.output.exists() or args.result.exists():
        parser.error("Use new output paths")
    args.output.mkdir(parents=True)
    args.result.parent.mkdir(parents=True, exist_ok=True)
    base = Path(__file__).parent / "suites" / args.suite
    manifests = (
        sorted((base / args.split).glob("*.json"))
        if args.suite == "repoqa"
        else [base / "manifest.json"]
    )
    profile = "code" if args.suite == "repoqa" else "documents"
    encoding = tiktoken.get_encoding("cl100k_base")
    rows, identities = [], []
    with tempfile.TemporaryDirectory(prefix="ixos-eval-") as temporary:
        config = Path(temporary) / "settings.toml"
        config.write_text("cache = false\n", encoding="utf-8")
        for manifest in manifests:
            root = (
                args.sources / manifest.stem / "corpus"
                if args.suite == "repoqa"
                else args.sources / "corpus"
            )
            dataset = Dataset(manifest, root)
            identities.append({"suite": manifest.stem, "sha256": sha(manifest)})
            family_output = args.output / manifest.stem
            family_output.mkdir()
            queries = [q for q in dataset.data["queries"] if q["split"] == args.split]
            if not queries:
                raise ValueError("Suite has no selected queries")
            with (family_output / "stderr.txt").open("wb") as stderr:
                client = (
                    Ixos(args.binary, root, profile, args.model, config, stderr)
                    if args.method in ("hybrid", "lexical")
                    else None
                )
                baseline = BM25(dataset) if args.method == "bm25" else None
                try:
                    for query in queries:
                        raw = (
                            client.search(query["text"], args.method)
                            if client
                            else (
                                baseline.search(query["text"])
                                if baseline
                                else run_rg(root, dataset, query["text"])
                            )
                        )
                        (family_output / (query["id"] + ".json")).write_bytes(raw)
                        if len(raw) > 6000:
                            raise ValueError("Response exceeds the output byte ceiling")
                        response = json.loads(raw)
                        rows.append(
                            {
                                "query_id": query["id"],
                                "group": query["group"],
                                **score(dataset, query, response),
                                "bytes": len(raw),
                                "tokens": len(
                                    encoding.encode(
                                        raw.decode("utf-8"), disallowed_special=()
                                    )
                                ),
                            }
                        )
                finally:
                    if client:
                        client.close()
            print(f"{manifest.stem}: {len(queries)} queries", flush=True)
    model_hashes = {
        name: sha(args.model / name)
        for name in ("model.safetensors", "tokenizer.json", "config.json")
    }
    result = {
        "suite": args.suite,
        "split": args.split,
        "method": args.method,
        "config": {
            "profile": profile,
            "limit": 10,
            "context": 2,
            "output_bytes": 6000,
            "cache": False,
            "execution": (
                "resident MCP"
                if args.method in ("hybrid", "lexical")
                else "prepared BM25" if args.method == "bm25" else "ranked rg"
            ),
        },
        "binary_sha256": sha(args.binary),
        "model_hashes": model_hashes,
        "suite_hashes": identities,
        "summary": {
            **means(rows),
            "queries": len(rows),
            "families": len({r["group"] for r in rows}),
            "bytes": sum(r["bytes"] for r in rows),
            "tokens": sum(r["tokens"] for r in rows),
        },
        "queries": rows,
    }
    args.result.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result["summary"]), flush=True)


if __name__ == "__main__":
    main()
