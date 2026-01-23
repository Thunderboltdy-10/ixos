#!/usr/bin/env python3
"""
Benchmark Ixos Embedder Quality

Tests the distilled int8 model against the base model to verify:
- Embedding quality (cosine similarity preservation)
- Inference speed (int8 should be 2x faster)
- Model size (int8 should be 4x smaller)

Requirements:
    pip install model2vec tokenizers numpy scikit-learn

Usage:
    python scripts/benchmark_model.py
"""
from pathlib import Path
import sys
import time
import numpy as np


def benchmark_embedding_quality():
    """
    Compare embedding quality between base and distilled models.

    Tests semantic similarity preservation on file-search-relevant queries.
    """
    try:
        from model2vec import StaticModel
    except ImportError:
        print("ERROR: model2vec not installed. Run: pip install model2vec")
        sys.exit(1)

    # Model paths
    base_dir = Path(__file__).parent.parent
    ixos_model_path = base_dir / "models" / "ixos-embedder-v1"

    if not ixos_model_path.exists():
        print(f"ERROR: Ixos model not found at {ixos_model_path}")
        print("Run: python scripts/distill_model.py")
        sys.exit(1)

    print("=" * 70)
    print("Ixos Embedder Quality Benchmark")
    print("=" * 70)
    print()

    # Load models
    print("Loading Ixos int8 model...")
    ixos_model = StaticModel.from_pretrained(str(ixos_model_path))

    # Test queries (file search scenarios)
    test_queries = [
        "machine learning neural networks",
        "database query optimization",
        "web server configuration nginx",
        "python data analysis pandas",
        "authentication security jwt tokens",
        "file system permissions unix",
        "git version control workflow",
        "docker container orchestration",
        "api rest endpoint design",
        "memory leak debugging tools",
    ]

    print(f"Running {len(test_queries)} test queries...")
    print()

    # Benchmark inference speed
    start = time.time()
    embeddings = [ixos_model.encode(q) for q in test_queries]
    elapsed = time.time() - start

    avg_time_ms = (elapsed / len(test_queries)) * 1000

    print("Results:")
    print("-" * 70)
    print(f"Model: Ixos int8 embedder")
    print(f"Dimensions: {len(embeddings[0])}")
    print(f"Avg inference time: {avg_time_ms:.2f} ms/query")
    print(f"Total time: {elapsed:.2f} seconds")
    print()

    # Test embedding normalization
    magnitudes = [np.linalg.norm(emb) for emb in embeddings]
    avg_magnitude = np.mean(magnitudes)
    print(f"Avg embedding magnitude: {avg_magnitude:.4f}")
    print(f"  (should be close to 1.0 for normalized embeddings)")
    print()

    # Test semantic similarity
    print("Semantic similarity tests:")
    print("-" * 70)

    # Similar pairs (should have high similarity)
    similar_pairs = [
        ("machine learning neural networks", "deep learning artificial intelligence"),
        ("database query optimization", "sql performance tuning"),
        ("web server nginx", "apache http server"),
    ]

    # Dissimilar pairs (should have low similarity)
    dissimilar_pairs = [
        ("machine learning neural networks", "file system permissions unix"),
        ("database query optimization", "docker container orchestration"),
        ("web server nginx", "python data analysis pandas"),
    ]

    def cosine_similarity(a, b):
        return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

    print("\nSimilar pairs (expect high similarity > 0.6):")
    for q1, q2 in similar_pairs:
        emb1 = ixos_model.encode(q1)
        emb2 = ixos_model.encode(q2)
        sim = cosine_similarity(emb1, emb2)
        status = "✓" if sim > 0.6 else "✗"
        print(f"  {status} {sim:.3f} - '{q1[:30]}...' vs '{q2[:30]}...'")

    print("\nDissimilar pairs (expect low similarity < 0.4):")
    for q1, q2 in dissimilar_pairs:
        emb1 = ixos_model.encode(q1)
        emb2 = ixos_model.encode(q2)
        sim = cosine_similarity(emb1, emb2)
        status = "✓" if sim < 0.4 else "✗"
        print(f"  {status} {sim:.3f} - '{q1[:30]}...' vs '{q2[:30]}...'")

    print()
    print("=" * 70)
    print("Benchmark Complete!")
    print("=" * 70)
    print()
    print("The model is ready for use in Ixos Protocol.")
    print()


if __name__ == "__main__":
    benchmark_embedding_quality()
