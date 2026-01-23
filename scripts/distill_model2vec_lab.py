#!/usr/bin/env python3
"""
Distill Ixos-branded model2vec embedders from local teacher models.

Creates:
- models/lab/ixos-flash-v2 (int8, 256 dims)
- models/lab/ixos-pro-v1 (float16, 384 dims)

Also mirrors to models/ for product use.
"""
from __future__ import annotations

import argparse
import shutil
from collections import Counter
from pathlib import Path
import re

from model2vec.distill import distill

ROOT = Path(__file__).resolve().parents[1]
TOKEN_RE = re.compile(r"[a-z0-9]+")


def tokenize(text: str) -> list[str]:
    return TOKEN_RE.findall(text.lower())


def build_vocab(paths: list[Path], max_tokens: int) -> list[str]:
    counts: Counter[str] = Counter()
    for path in paths:
        if not path.exists():
            continue
        if path.is_dir():
            files = [p for p in path.rglob("*") if p.is_file()]
        else:
            files = [path]
        for file in files:
            if file.suffix.lower() not in {".txt", ".md", ".json"}:
                continue
            try:
                text = file.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue
            counts.update(tokenize(text))
            counts.update(tokenize(file.stem))
            for part in file.parent.parts:
                counts.update(tokenize(part))
    most_common = [tok for tok, _ in counts.most_common(max_tokens)]
    return most_common


def save_model(model, out_dir: Path, mirror_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(str(out_dir))
    if mirror_dir.exists():
        shutil.rmtree(mirror_dir)
    shutil.copytree(out_dir, mirror_dir)


def distill_model(
    teacher: str,
    vocab: list[str] | None,
    out_dir: Path,
    mirror_dir: Path,
    dims: int,
    quantize: str,
    device: str,
) -> None:
    model = distill(
        model_name=teacher,
        vocabulary=vocab,
        device=device,
        pca_dims=dims,
        quantize_to=quantize,
    )
    save_model(model, out_dir, mirror_dir)


def main() -> int:
    parser = argparse.ArgumentParser(description="Ixos model2vec distillation")
    parser.add_argument("--mode", choices=["flash", "pro", "both"], default="both")
    parser.add_argument("--device", default="auto")
    parser.add_argument("--flash-teacher", default=str(ROOT / "models" / "lab" / "st-paraphrase-minilm-l6-v2"))
    parser.add_argument("--pro-teacher", default=str(ROOT / "models" / "lab" / "st-paraphrase-mpnet-base-v2"))
    parser.add_argument("--flash-vocab", type=int, default=15000)
    parser.add_argument("--pro-vocab", type=int, default=25000)
    parser.add_argument("--flash-dims", type=int, default=256)
    parser.add_argument("--pro-dims", type=int, default=384)
    parser.add_argument("--flash-quantize", default="int8")
    parser.add_argument("--pro-quantize", default="float16")
    args = parser.parse_args()

    device = args.device
    if device == "auto":
        try:
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:
            device = "cpu"

    vocab_sources = [ROOT / "dataset", ROOT / "dataset" / "synthetic_ambiguity"]

    if args.mode in ("flash", "both"):
        vocab = None if args.flash_vocab <= 0 else build_vocab(vocab_sources, args.flash_vocab)
        vocab_size = 0 if vocab is None else len(vocab)
        print(f"[Flash] vocab={vocab_size} teacher={args.flash_teacher}")
        distill_model(
            teacher=args.flash_teacher,
            vocab=vocab,
            out_dir=ROOT / "models" / "lab" / "ixos-flash-v2",
            mirror_dir=ROOT / "models" / "ixos-flash-v2",
            dims=args.flash_dims,
            quantize=args.flash_quantize,
            device=device,
        )
        print("[OK] ixos-flash-v2 saved")

    if args.mode in ("pro", "both"):
        vocab = None if args.pro_vocab <= 0 else build_vocab(vocab_sources, args.pro_vocab)
        vocab_size = 0 if vocab is None else len(vocab)
        print(f"[Pro] vocab={vocab_size} teacher={args.pro_teacher}")
        distill_model(
            teacher=args.pro_teacher,
            vocab=vocab,
            out_dir=ROOT / "models" / "lab" / "ixos-pro-v1",
            mirror_dir=ROOT / "models" / "ixos-pro-v1",
            dims=args.pro_dims,
            quantize=args.pro_quantize,
            device=device,
        )
        print("[OK] ixos-pro-v1 saved")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
