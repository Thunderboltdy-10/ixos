from __future__ import annotations
import argparse
from collections import Counter
import json
from pathlib import Path
from eval.contract import load_dataset


def main():
    parser = argparse.ArgumentParser(description="Validate a frozen retrieval corpus and source-span manifest")
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--root", type=Path, required=True)
    args = parser.parse_args()
    dataset = load_dataset(args.manifest, args.root)
    print(json.dumps({"dataset": dataset.id, "manifest_sha256": dataset.fingerprint, "sources": len(dataset.sources), "queries": len(dataset.queries), "splits": dict(Counter(q.split for q in dataset.queries)), "workloads": dict(Counter(q.workload for q in dataset.queries)), "families": len(set(q.group for q in dataset.queries)), "provenance": dataset.provenance}, indent=2))


if __name__ == "__main__":
    main()
