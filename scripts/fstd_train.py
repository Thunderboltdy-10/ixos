#!/usr/bin/env python3
"""
Train a tiny FSTD adapter that maps embeddings -> directory topology coordinates.

Outputs a JSON adapter compatible with the Rust FstdAdapter loader.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import random
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np

try:
    import torch
    from torch import nn
except Exception as exc:
    raise SystemExit("torch is required. Install with: pip install -r scripts/requirements.txt") from exc

try:
    from model2vec import StaticModel
except Exception as exc:
    raise SystemExit("model2vec is required. Install with: pip install -r scripts/requirements.txt") from exc


GENERIC_DIR_NAMES = {
    "downloads",
    "new folder",
    "new folder (2)",
    "untitled",
    "temp",
    "tmp",
    "misc",
    "miscellaneous",
    "documents",
    "desktop",
}


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)


def read_text(path: Path, max_chars: int) -> str:
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""
    text = text.strip()
    if len(text) > max_chars:
        text = text[:max_chars]
    return text


def path_components(path: Path) -> List[str]:
    return [part.lower() for part in path.parts if part]


def tree_distance(a: List[str], b: List[str]) -> int:
    common = 0
    for part_a, part_b in zip(a, b):
        if part_a == part_b:
            common += 1
        else:
            break
    return len(a) + len(b) - 2 * common


def select_anchors(nodes: List[Tuple[Path, List[str]]], topo_dim: int) -> List[Tuple[Path, List[str]]]:
    nodes_sorted = sorted(nodes, key=lambda item: len(item[1]), reverse=True)
    anchors = []
    seen = set()
    for path, comps in nodes_sorted:
        if len(anchors) >= topo_dim:
            break
        if path not in seen:
            seen.add(path)
            anchors.append((path, comps))
    return anchors


def build_topology(root: Path, files: List[Path], topo_dim: int) -> Tuple[Dict[Path, List[float]], float]:
    directories = {file.parent for file in files if file.parent is not None}
    nodes = [(path, path_components(path)) for path in directories]
    if not nodes:
        return {}, 0.0

    anchors = select_anchors(nodes, topo_dim)
    if not anchors:
        return {}, 0.0

    max_distance = 1.0
    for _, comps in nodes:
        for _, anchor_comps in anchors:
            max_distance = max(max_distance, tree_distance(comps, anchor_comps))

    coords: Dict[Path, List[float]] = {}
    for path, comps in nodes:
        vector = []
        for _, anchor_comps in anchors:
            dist = tree_distance(comps, anchor_comps)
            vector.append(min(1.0, dist / max_distance))
        coords[path] = vector

    return coords, structure_quality_score(nodes, root)


def structure_quality_score(nodes: List[Tuple[Path, List[str]]], root: Path) -> float:
    if not nodes:
        return 0.0
    root_depth = len(path_components(root))
    depth_sum = 0.0
    max_depth = 0
    name_counts: Dict[str, int] = {}
    generic_hits = 0

    for _, comps in nodes:
        depth = max(0, len(comps) - root_depth)
        depth_sum += depth
        max_depth = max(max_depth, depth)
        if comps:
            name = comps[-1]
            name_counts[name] = name_counts.get(name, 0) + 1
            if name in GENERIC_DIR_NAMES:
                generic_hits += 1

    avg_depth = depth_sum / len(nodes)
    depth_score = min(1.0, avg_depth / 4.0)
    max_depth_score = min(1.0, max_depth / 6.0)
    unique_ratio = len(name_counts) / len(nodes)
    reuse_ratio = 1.0 - unique_ratio
    generic_ratio = generic_hits / len(nodes)

    depth_component = 0.35 * depth_score + 0.15 * max_depth_score
    naming_component = 0.35 * unique_ratio + 0.15 * reuse_ratio
    penalty = 0.35 * generic_ratio
    return float(min(1.0, max(0.0, depth_component + naming_component - penalty)))


def batch(iterable: List[str], size: int) -> List[List[str]]:
    return [iterable[i : i + size] for i in range(0, len(iterable), size)]


def load_embeddings(model: StaticModel, texts: List[str], batch_size: int) -> np.ndarray:
    outputs: List[np.ndarray] = []
    for group in batch(texts, batch_size):
        embeddings = model.encode(group)
        outputs.append(np.asarray(embeddings, dtype=np.float32))
    return np.vstack(outputs)


def main() -> int:
    parser = argparse.ArgumentParser(description="Train FSTD adapter (topology distillation)")
    parser.add_argument("--data-dir", type=str, required=True, help="Directory to scan for training files")
    parser.add_argument("--model-path", type=str, default="models/ixos-flash-v2", help="Path or HF id")
    parser.add_argument("--output", type=str, default="models/fstd/adapter.json", help="Output adapter JSON")
    parser.add_argument("--topo-dim", type=int, default=8)
    parser.add_argument("--hidden-dim", type=int, default=128)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--max-files", type=int, default=2000)
    parser.add_argument("--max-chars", type=int, default=4000)
    parser.add_argument("--seed", type=int, default=1337)
    args = parser.parse_args()

    set_seed(args.seed)
    root = Path(args.data_dir).expanduser().resolve()
    if not root.exists():
        raise SystemExit(f"Data directory not found: {root}")

    files = [p for p in root.rglob("*") if p.is_file()]
    files = [p for p in files if p.suffix.lower() in {".txt", ".md", ".json", ".rs", ".toml"}]
    if not files:
        raise SystemExit("No supported text files found.")
    if args.max_files > 0 and len(files) > args.max_files:
        random.shuffle(files)
        files = files[: args.max_files]

    coords, quality = build_topology(root, files, args.topo_dim)
    print(f"[FSTD] structure quality score: {quality:.2f}")

    texts = []
    targets = []
    for path in files:
        coord = coords.get(path.parent)
        if coord is None:
            continue
        content = read_text(path, args.max_chars)
        if not content:
            continue
        title = path.stem.replace("_", " ")
        texts.append(f"{title}\n{content}")
        targets.append(coord)

    if not texts:
        raise SystemExit("No usable training samples after filtering.")

    model = StaticModel.from_pretrained(args.model_path)
    embeddings = load_embeddings(model, texts, args.batch_size)
    targets_arr = np.asarray(targets, dtype=np.float32)

    input_dim = embeddings.shape[1]
    output_dim = targets_arr.shape[1]

    device = "cuda" if torch.cuda.is_available() else "cpu"
    net = nn.Sequential(
        nn.Linear(input_dim, args.hidden_dim),
        nn.ReLU(),
        nn.Linear(args.hidden_dim, output_dim),
    ).to(device)

    optimizer = torch.optim.Adam(net.parameters(), lr=args.lr)
    loss_fn = nn.MSELoss()

    dataset = torch.utils.data.TensorDataset(
        torch.tensor(embeddings, dtype=torch.float32),
        torch.tensor(targets_arr, dtype=torch.float32),
    )
    loader = torch.utils.data.DataLoader(dataset, batch_size=args.batch_size, shuffle=True)

    for epoch in range(args.epochs):
        epoch_loss = 0.0
        for x_batch, y_batch in loader:
            x_batch = x_batch.to(device)
            y_batch = y_batch.to(device)
            optimizer.zero_grad()
            pred = net(x_batch)
            loss = loss_fn(pred, y_batch)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()
        avg_loss = epoch_loss / max(1, len(loader))
        print(f"[FSTD] epoch {epoch + 1:02d}/{args.epochs} loss={avg_loss:.6f}")

    # Export weights in row-major order for Rust adapter.
    layer1 = net[0]
    layer2 = net[2]
    adapter = {
        "input_dim": input_dim,
        "hidden_dim": args.hidden_dim,
        "output_dim": output_dim,
        "weights1": layer1.weight.detach().cpu().numpy().reshape(-1).tolist(),
        "bias1": layer1.bias.detach().cpu().numpy().reshape(-1).tolist(),
        "weights2": layer2.weight.detach().cpu().numpy().reshape(-1).tolist(),
        "bias2": layer2.bias.detach().cpu().numpy().reshape(-1).tolist(),
    }

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(adapter, f, indent=2)
    print(f"[FSTD] adapter saved to {output_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
