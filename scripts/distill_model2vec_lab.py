#!/usr/bin/env python3
"""
Distill Ixos-branded model2vec embedders from local teacher models.

Creates variant outputs under models/lab/<id> and (optionally) mirrors to
models/<id> for product use.
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


def save_model(model, out_dir: Path, mirror_dir: Path | None) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(str(out_dir))
    if mirror_dir is None:
        return
    if mirror_dir.exists():
        shutil.rmtree(mirror_dir)
    shutil.copytree(out_dir, mirror_dir)


def distill_model(
    teacher: str,
    vocab: list[str] | None,
    out_dir: Path,
    mirror_dir: Path | None,
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
    parser.add_argument("--flash-id", default="ixos-flash-v2")
    parser.add_argument("--pro-id", default="ixos-pro-v1")
    parser.add_argument("--flash-vocab", type=int, default=15000)
    parser.add_argument("--pro-vocab", type=int, default=25000)
    parser.add_argument("--flash-dims", type=int, default=256)
    parser.add_argument("--pro-dims", type=int, default=384)
    parser.add_argument("--flash-quantize", default="int8")
    parser.add_argument("--pro-quantize", default="float16")
    parser.add_argument("--no-mirror", action="store_true")
    args = parser.parse_args()

    device = args.device
    if device == "auto":
        try:
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:
            device = "cpu"

    vocab_sources = [ROOT / "dataset", ROOT / "dataset" / "synthetic_ambiguity"]

    mirror_root = None if args.no_mirror else ROOT / "models"

    if args.mode in ("flash", "both"):
        vocab = None if args.flash_vocab <= 0 else build_vocab(vocab_sources, args.flash_vocab)
        vocab_size = 0 if vocab is None else len(vocab)
        print(f"[Flash] vocab={vocab_size} teacher={args.flash_teacher}")
        flash_id = args.flash_id
        distill_model(
            teacher=args.flash_teacher,
            vocab=vocab,
            out_dir=ROOT / "models" / "lab" / flash_id,
            mirror_dir=None if mirror_root is None else mirror_root / flash_id,
            dims=args.flash_dims,
            quantize=args.flash_quantize,
            device=device,
        )
        print(f"[OK] {flash_id} saved")

    if args.mode in ("pro", "both"):
        vocab = None if args.pro_vocab <= 0 else build_vocab(vocab_sources, args.pro_vocab)
        vocab_size = 0 if vocab is None else len(vocab)
        print(f"[Pro] vocab={vocab_size} teacher={args.pro_teacher}")
        pro_id = args.pro_id
        distill_model(
            teacher=args.pro_teacher,
            vocab=vocab,
            out_dir=ROOT / "models" / "lab" / pro_id,
            mirror_dir=None if mirror_root is None else mirror_root / pro_id,
            dims=args.pro_dims,
            quantize=args.pro_quantize,
            device=device,
        )
        print(f"[OK] {pro_id} saved")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
