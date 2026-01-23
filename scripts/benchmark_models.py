#!/usr/bin/env python3
"""
Ixos Embedding Model Benchmark Suite

Measures and compares embedding models across multiple dimensions:
- Speed (embeddings per second)
- Memory usage
- Semantic quality (similarity tests)
- Model size

Usage:
    python scripts/benchmark_models.py              # Run all benchmarks
    python scripts/benchmark_models.py --potion     # Only benchmark Potion
    python scripts/benchmark_models.py --qwen       # Only benchmark Qwen
"""

import json
import time
import sys
from pathlib import Path
import argparse
import gc

try:
    from model2vec import StaticModel
except ImportError:
    print("[ERROR] model2vec not installed. Run: pip install model2vec")
    sys.exit(1)


# Test corpus for semantic quality benchmarks
SIMILARITY_TESTS = [
    # (phrase_a, phrase_b, expected_similarity: "high", "medium", "low")
    ("hello world", "greetings planet", "high"),
    ("programming code", "software development", "high"),
    ("machine learning", "artificial intelligence", "high"),
    ("the quick brown fox", "fast auburn dog", "medium"),
    ("search file query", "find document keyword", "high"),
    ("hello world", "quantum physics equations", "low"),
    ("programming code", "cooking recipes", "low"),
    ("file search", "database query", "medium"),
]

# Diverse test texts for speed benchmarks
SPEED_TEST_TEXTS = [
    "hello world",
    "The quick brown fox jumps over the lazy dog",
    "fn main() { println!(\"Hello, world!\"); }",
    "SELECT * FROM users WHERE name LIKE '%search%'",
    "This is a longer document that contains multiple sentences. It should test the model's ability to handle more complex inputs with various linguistic patterns and structures.",
    "Error: ModuleNotFoundError - No module named 'torch'",
    "2026-01-12T18:00:00Z INFO ixos_protocol::search Started search query",
    "README.md LICENSE.txt package.json Cargo.toml",
]


def get_model_size(model_dir: Path) -> float:
    """Calculate total model size in MB."""
    if not model_dir.exists():
        return 0.0
    total = sum(f.stat().st_size for f in model_dir.glob('*') if f.is_file())
    return total / (1024 * 1024)


def cosine_similarity(a: list, b: list) -> float:
    """Calculate cosine similarity between two vectors."""
    import math
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def benchmark_model(name: str, model_path: Path, iterations: int = 100):
    """Run comprehensive benchmark on a single model."""
    results = {
        "name": name,
        "path": str(model_path),
        "size_mb": get_model_size(model_path),
        "load_time_ms": 0,
        "embed_speed_per_sec": 0,
        "avg_embed_time_ms": 0,
        "dimensions": 0,
        "similarity_accuracy": 0,
        "semantic_tests": [],
        "errors": [],
    }
    
    if not model_path.exists():
        results["errors"].append(f"Model not found at {model_path}")
        return results
    
    # 1. Load time benchmark
    print(f"\n{'='*60}")
    print(f"Benchmarking: {name}")
    print(f"{'='*60}")
    print(f"Path: {model_path}")
    print(f"Size: {results['size_mb']:.2f} MB")
    
    gc.collect()
    start = time.perf_counter()
    try:
        model = StaticModel.from_pretrained(str(model_path))
        load_time = (time.perf_counter() - start) * 1000
        results["load_time_ms"] = round(load_time, 2)
        print(f"Load time: {load_time:.2f} ms")
    except Exception as e:
        results["errors"].append(f"Failed to load model: {e}")
        print(f"[ERROR] Failed to load: {e}")
        return results
    
    # 2. Get dimensions
    test_emb = model.encode(["test"])[0]
    results["dimensions"] = len(test_emb)
    print(f"Dimensions: {results['dimensions']}")
    
    # 3. Speed benchmark
    print(f"\nSpeed benchmark ({iterations} iterations × {len(SPEED_TEST_TEXTS)} texts)...")
    
    # Warmup
    for text in SPEED_TEST_TEXTS[:3]:
        _ = model.encode([text])
    
    # Timed run
    total_embeds = 0
    start = time.perf_counter()
    for _ in range(iterations):
        for text in SPEED_TEST_TEXTS:
            _ = model.encode([text])
            total_embeds += 1
    elapsed = time.perf_counter() - start
    
    results["embed_speed_per_sec"] = round(total_embeds / elapsed, 1)
    results["avg_embed_time_ms"] = round((elapsed / total_embeds) * 1000, 3)
    print(f"Speed: {results['embed_speed_per_sec']} embeds/sec")
    print(f"Avg time: {results['avg_embed_time_ms']} ms/embed")
    
    # 4. Semantic quality benchmark
    print(f"\nSemantic quality benchmark ({len(SIMILARITY_TESTS)} tests)...")
    correct = 0
    for phrase_a, phrase_b, expected in SIMILARITY_TESTS:
        emb_a = model.encode([phrase_a])[0]
        emb_b = model.encode([phrase_b])[0]
        sim = cosine_similarity(emb_a, emb_b)
        
        # Classify similarity
        if sim > 0.7:
            actual = "high"
        elif sim > 0.4:
            actual = "medium"
        else:
            actual = "low"
        
        is_correct = actual == expected
        if is_correct:
            correct += 1
        
        results["semantic_tests"].append({
            "phrase_a": phrase_a[:30],
            "phrase_b": phrase_b[:30],
            "similarity": round(sim, 3),
            "expected": expected,
            "actual": actual,
            "correct": is_correct,
        })
    
    results["similarity_accuracy"] = round(correct / len(SIMILARITY_TESTS) * 100, 1)
    print(f"Semantic accuracy: {results['similarity_accuracy']}% ({correct}/{len(SIMILARITY_TESTS)})")
    
    return results


def main():
    parser = argparse.ArgumentParser(description="Benchmark Ixos embedding models")
    parser.add_argument("--potion", action="store_true", help="Only benchmark Potion model")
    parser.add_argument("--qwen", action="store_true", help="Only benchmark Qwen model")
    parser.add_argument("--iterations", type=int, default=50, help="Speed test iterations")
    parser.add_argument("--json", action="store_true", help="Output results as JSON")
    args = parser.parse_args()
    
    models_dir = Path(__file__).parent.parent / "models"
    
    models_to_test = []
    if args.potion or (not args.potion and not args.qwen):
        models_to_test.append(("potion-base-8M-int8", models_dir / "potion-base-8M-int8"))
    if args.qwen or (not args.potion and not args.qwen):
        models_to_test.append(("ixos-embedder-v1 (Qwen)", models_dir / "ixos-embedder-v1"))
    
    print("\n" + "="*60)
    print("Ixos Embedding Model Benchmark")
    print("="*60)
    print(f"Iterations: {args.iterations}")
    print(f"Models: {len(models_to_test)}")
    
    all_results = []
    for name, path in models_to_test:
        try:
            result = benchmark_model(name, path, args.iterations)
            all_results.append(result)
        except Exception as e:
            print(f"[ERROR] Benchmark failed for {name}: {e}")
            all_results.append({"name": name, "error": str(e)})
    
    # Summary
    print("\n" + "="*60)
    print("BENCHMARK SUMMARY")
    print("="*60)
    print(f"{'Model':<30} {'Size':>8} {'Speed':>10} {'Quality':>10}")
    print("-"*60)
    
    for r in all_results:
        if r.get("errors"):
            print(f"{r['name']:<30} {'ERROR':>8} {'-':>10} {'-':>10}")
            for err in r["errors"]:
                print(f"  └─ {err}")
        else:
            size = f"{r['size_mb']:.1f} MB"
            speed = f"{r['embed_speed_per_sec']}/s"
            quality = f"{r['similarity_accuracy']}%"
            print(f"{r['name']:<30} {size:>8} {speed:>10} {quality:>10}")
    
    print()
    
    # Recommendations
    print("RECOMMENDATIONS:")
    working_models = [r for r in all_results if not r.get("errors")]
    if working_models:
        best_speed = max(working_models, key=lambda x: x.get("embed_speed_per_sec", 0))
        best_quality = max(working_models, key=lambda x: x.get("similarity_accuracy", 0))
        print(f"  Best speed:   {best_speed['name']} ({best_speed['embed_speed_per_sec']}/s)")
        print(f"  Best quality: {best_quality['name']} ({best_quality['similarity_accuracy']}%)")
    else:
        print("  No working models found. Run: python scripts/distill_model.py")
    
    if args.json:
        print("\n" + json.dumps(all_results, indent=2))
    
    # Save results to file
    results_file = models_dir.parent / "benchmark_results.json"
    with open(results_file, "w") as f:
        json.dump({
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "results": all_results
        }, f, indent=2)
    print(f"\nResults saved to: {results_file}")


if __name__ == "__main__":
    main()
