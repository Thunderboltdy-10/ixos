#!/usr/bin/env python3
"""
Ixos P7 distillation experiments.

Modes:
  --mode teacher   : reranker-teacher -> student embedder distillation
  --mode topology  : filesystem topology supervision (same-folder positives)
"""
from __future__ import annotations

import argparse
import random
import sys
from pathlib import Path

from sentence_transformers import SentenceTransformer, InputExample, losses
from sentence_transformers.cross_encoder import CrossEncoder
from torch.utils.data import DataLoader

# Reuse synthetic suite and augmentation from ixos_eval.py
ROOT = Path(__file__).parent.parent
sys.path.append(str(Path(__file__).parent))
from ixos_eval import synthetic_suite, augment_doc_text, load_corpus  # noqa: E402


def distill_from_teacher(
    output_dir: Path,
    student_id: str,
    teacher_id: str,
    max_pairs: int,
    seed: int,
) -> None:
    docs, queries = synthetic_suite("medium")
    random.seed(seed)

    teacher = CrossEncoder(teacher_id, local_files_only=True)
    student = SentenceTransformer(student_id, local_files_only=True)

    pairs = []
    for query in queries:
        # sample a few docs per query
        sampled = random.sample(docs, min(len(docs), 8))
        texts = [augment_doc_text(doc) for doc in sampled]
        query_texts = [query.text for _ in texts]
        scores = teacher.predict(list(zip(query_texts, texts)), show_progress_bar=False)
        # normalize per query
        if len(scores) > 1:
            min_s, max_s = min(scores), max(scores)
            if max_s - min_s > 1e-6:
                scores = [(s - min_s) / (max_s - min_s) for s in scores]
        for doc, score in zip(sampled, scores):
            pairs.append(InputExample(texts=[query.text, augment_doc_text(doc)], label=float(score)))
        if len(pairs) >= max_pairs:
            break

    loader = DataLoader(pairs, shuffle=True, batch_size=16)
    loss = losses.CosineSimilarityLoss(student)

    student.fit(
        train_objectives=[(loader, loss)],
        epochs=1,
        warmup_steps=max(1, len(loader) // 10),
        show_progress_bar=False,
    )
    output_dir.mkdir(parents=True, exist_ok=True)
    student.save(str(output_dir))


def distill_topology(
    output_dir: Path,
    student_id: str,
    max_pairs: int,
    seed: int,
) -> None:
    random.seed(seed)
    docs = load_corpus(ROOT / "dataset", limit=300, seed=seed)
    by_folder = {}
    for doc in docs:
        folder = str(doc.path.parent)
        by_folder.setdefault(folder, []).append(doc)

    positives = []
    negatives = []
    folders = list(by_folder.keys())
    for folder, items in by_folder.items():
        if len(items) < 2:
            continue
        a, b = random.sample(items, 2)
        positives.append((a, b))
        if len(positives) >= max_pairs // 2:
            break

    # negatives from different folders with similar filenames if possible
    for _ in range(max_pairs // 2):
        f1, f2 = random.sample(folders, 2)
        a = random.choice(by_folder[f1])
        b = random.choice(by_folder[f2])
        negatives.append((a, b))

    pairs = []
    for a, b in positives:
        pairs.append(InputExample(texts=[augment_doc_text(a), augment_doc_text(b)], label=1.0))
    for a, b in negatives:
        pairs.append(InputExample(texts=[augment_doc_text(a), augment_doc_text(b)], label=0.0))

    student = SentenceTransformer(student_id, local_files_only=True)
    loader = DataLoader(pairs, shuffle=True, batch_size=16)
    loss = losses.CosineSimilarityLoss(student)
    student.fit(
        train_objectives=[(loader, loss)],
        epochs=1,
        warmup_steps=max(1, len(loader) // 10),
        show_progress_bar=False,
    )
    output_dir.mkdir(parents=True, exist_ok=True)
    student.save(str(output_dir))


def main() -> None:
    parser = argparse.ArgumentParser(description="Ixos P7 distillation experiments")
    parser.add_argument("--mode", choices=["teacher", "topology"], required=True)
    parser.add_argument("--seed", type=int, default=1337)
    parser.add_argument("--max-pairs", type=int, default=400)
    parser.add_argument("--student", type=str, default="sentence-transformers/all-MiniLM-L6-v2")
    parser.add_argument("--teacher", type=str, default="cross-encoder/ms-marco-MiniLM-L-6-v2")
    parser.add_argument("--output", type=str, default="")
    args = parser.parse_args()

    if args.mode == "teacher":
        out = Path(args.output or "models/lab/distill_teacher_student")
        distill_from_teacher(out, args.student, args.teacher, args.max_pairs, args.seed)
    else:
        out = Path(args.output or "models/lab/distill_topology_student")
        distill_topology(out, args.student, args.max_pairs, args.seed)

    print(f"[OK] Distilled model saved to {out}")


if __name__ == "__main__":
    main()
