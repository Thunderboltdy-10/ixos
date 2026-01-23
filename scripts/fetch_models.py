#!/usr/bin/env python3
"""
Ixos model fetch/convert pipeline.

Usage:
  python scripts/fetch_models.py --manifest models/lab/manifest.json
"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from typing import Dict, List


def load_manifest(path: Path) -> Dict:
    return json.loads(path.read_text(encoding="utf-8"))


def save_manifest(path: Path, data: Dict) -> None:
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def dir_size_mb(path: Path) -> float:
    if not path.exists():
        return 0.0
    total = 0
    for p in path.rglob("*"):
        if p.is_file():
            total += p.stat().st_size
    return total / (1024 * 1024)


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def append_log(log_path: Path, line: str) -> None:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("a", encoding="utf-8") as f:
        f.write(line + "\n")


def fetch_model(entry: Dict, models_root: Path, log_path: Path, command: str, force: bool) -> Dict:
    model_id = entry["id"]
    backend = entry.get("backend", "model2vec")
    hf_id = entry.get("hf_id")
    quantize = entry.get("quantize_to")
    local_dir = models_root / model_id
    entry["path"] = str(local_dir)

    if not force and entry.get("skip_if_exists", True) and local_dir.exists():
        entry["size_mb"] = round(dir_size_mb(local_dir), 2)
        entry["downloaded_at"] = time.strftime("%Y-%m-%dT%H:%M:%S")
        return entry
    if force and local_dir.exists():
        import shutil

        shutil.rmtree(local_dir)

    ensure_dir(local_dir)
    start = time.perf_counter()

    if entry.get("source") == "local":
        import shutil

        source = Path(entry.get("local_path", ""))
        if not source.exists():
            raise FileNotFoundError(f"Local source not found: {source}")
        if local_dir.exists():
            shutil.rmtree(local_dir)
        shutil.copytree(source, local_dir)
    elif entry.get("type") == "reranker":
        from huggingface_hub import snapshot_download

        snapshot_download(
            repo_id=hf_id,
            local_dir=str(local_dir),
            local_dir_use_symlinks=False,
        )
    elif backend == "model2vec":
        from model2vec import StaticModel

        model = StaticModel.from_pretrained(hf_id, quantize_to=quantize)
        model.save_pretrained(str(local_dir))
    elif backend == "sentence-transformers":
        from sentence_transformers import SentenceTransformer

        model = SentenceTransformer(hf_id)
        model.save(str(local_dir))
    elif backend == "transformers":
        from huggingface_hub import snapshot_download

        snapshot_download(
            repo_id=hf_id,
            local_dir=str(local_dir),
            local_dir_use_symlinks=False,
        )
    elif backend == "onnx":
        from huggingface_hub import snapshot_download

        allow = entry.get("allow_patterns") or ["*.onnx", "tokenizer.json", "tokenizer_config.json", "vocab.txt", "merges.txt", "config.json"]
        snapshot_download(
            repo_id=hf_id,
            local_dir=str(local_dir),
            allow_patterns=allow,
            local_dir_use_symlinks=False,
        )
    else:
        raise ValueError(f"Unsupported backend: {backend}")

    elapsed = (time.perf_counter() - start) * 1000.0
    size_mb = dir_size_mb(local_dir)
    entry["size_mb"] = round(size_mb, 2)
    entry["downloaded_at"] = time.strftime("%Y-%m-%dT%H:%M:%S")
    entry["download_time_ms"] = round(elapsed, 2)

    append_log(
        log_path,
        f"- {entry['downloaded_at']} | {model_id} | {hf_id} | {backend} | {size_mb:.2f} MB | {command}",
    )
    return entry


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch and prepare models for Ixos lab")
    parser.add_argument("--manifest", type=str, required=True)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    manifest_path = Path(args.manifest)
    manifest = load_manifest(manifest_path)
    entries: List[Dict] = manifest.get("candidates", [])
    if not entries:
        raise SystemExit("Manifest has no candidates.")

    models_root = manifest_path.parent
    log_path = models_root / "MODELS_DOWNLOADED.md"
    command = f"python scripts/fetch_models.py --manifest {args.manifest}"

    updated = []
    for entry in entries:
        updated.append(fetch_model(entry, models_root, log_path, command, args.force))

    manifest["candidates"] = updated
    save_manifest(manifest_path, manifest)
    print(f"[OK] Updated manifest: {manifest_path}")
    print(f"[OK] Download log: {log_path}")


if __name__ == "__main__":
    main()
