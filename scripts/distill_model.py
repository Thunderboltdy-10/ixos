#!/usr/bin/env python3
"""
Ixos Embedder Setup Pipeline

Creates embedding models for Ixos Protocol:
1. potion-base-8M-int8: Quantized version of potion-base-8M (simple, reliable)
2. ixos-embedder-v1: Distilled from Qwen3-Embedding-0.6B (experimental, potentially better)

Requirements:
    pip install model2vec[distill] tokenizers numpy
    For GPU support: pip install torch --index-url https://download.pytorch.org/whl/cu121

Usage:
    python scripts/distill_model.py              # Create both models (auto-detect GPU)
    python scripts/distill_model.py --potion     # Only quantize potion-base-8M
    python scripts/distill_model.py --qwen       # Only distill Qwen model
    python scripts/distill_model.py --device cuda  # Force GPU usage
    python scripts/distill_model.py --device cpu   # Force CPU usage
"""
from model2vec import StaticModel
from model2vec.distill import distill
from pathlib import Path
import argparse
import sys


def verify_cuda():
    """Check if CUDA is available and print GPU info."""
    try:
        import torch
        if torch.cuda.is_available():
            gpu_name = torch.cuda.get_device_name(0)
            gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3
            print(f"[GPU DETECTED] {gpu_name} ({gpu_memory:.1f} GB)")
            return "cuda"
        else:
            print("[WARNING] CUDA not available. Using CPU (this will be SLOW).")
            print("[WARNING] To enable GPU, install PyTorch with CUDA:")
            print("          pip install torch --index-url https://download.pytorch.org/whl/cu121")
            return "cpu"
    except ImportError:
        print("[WARNING] PyTorch not installed. Using CPU.")
        return "cpu"


def create_potion_int8():
    """
    Quantize potion-base-8M to int8.

    This is the RECOMMENDED model for most use cases:
    - Already optimized for static embeddings
    - Simple quantization (no distillation)
    - Reliable quality (no training variance)
    - ~7.5MB final size
    - ~256 dimensions
    """
    output_dir = Path(__file__).parent.parent / "models" / "potion-base-8M-int8"

    if output_dir.exists():
        print(f"[potion-8M-int8] Model already exists at {output_dir}")
        return True

    print("=" * 70)
    print("Potion-Base-8M Int8 Quantization")
    print("=" * 70)
    print()
    print("Base model: minishlab/potion-base-8M")
    print("Quantization: int8 (4x smaller, 2x faster)")
    print(f"Output: {output_dir}")
    print()

    try:
        # Load the existing potion model with int8 quantization
        # Note: quantize_to is a parameter of from_pretrained(), not save_pretrained()
        print("Step 1/2: Loading potion-base-8M from HuggingFace with int8 quantization...")
        model = StaticModel.from_pretrained("minishlab/potion-base-8M", quantize_to="int8")

        # Create output directory
        output_dir.mkdir(parents=True, exist_ok=True)

        # Save the quantized model
        print("Step 2/2: Saving quantized model...")
        model.save_pretrained(str(output_dir))

        # Calculate model size
        size_mb = sum(f.stat().st_size for f in output_dir.glob('*')) / 1024 / 1024

        print()
        print(f"[SUCCESS] Potion-8M-int8 saved to: {output_dir}")
        print(f"[SUCCESS] Model size: {size_mb:.2f} MB")
        print()
        return True

    except Exception as e:
        print(f"[ERROR] Potion quantization failed: {e}", file=sys.stderr)
        if output_dir.exists():
            import shutil
            shutil.rmtree(output_dir)
        return False


def create_qwen_distilled(device="auto"):
    """
    Distill a custom int8 embedding model from Qwen3-Embedding-0.6B.

    This is an EXPERIMENTAL model that may provide better quality:
    - Distilled from large Qwen3 embedding model
    - int8 quantization + vocabulary compression
    - More complex process (may fail or produce worse results)
    - ~5-10MB final size
    - Potentially better semantic understanding
    
    Args:
        device: "auto", "cuda", or "cpu". Auto will detect GPU availability.
    """
    output_dir = Path(__file__).parent.parent / "models" / "ixos-embedder-v1"

    if output_dir.exists():
        print(f"[ixos-embedder-v1] Model already exists at {output_dir}")
        return True

    # Determine device to use
    if device == "auto":
        device = verify_cuda()
    elif device == "cuda":
        import torch
        if not torch.cuda.is_available():
            print("[ERROR] --device cuda specified but CUDA is not available!")
            print("[ERROR] Install PyTorch with CUDA: pip install torch --index-url https://download.pytorch.org/whl/cu121")
            return False
        print(f"[GPU] Using CUDA: {torch.cuda.get_device_name(0)}")
    else:
        print("[CPU] Using CPU (this will be slow for Qwen distillation)")

    print()
    print("=" * 70)
    print("Ixos Embedder Distillation (Qwen3-Embedding-0.6B)")
    print("=" * 70)
    print()
    print("Base model: Qwen/Qwen3-Embedding-0.6B")
    print("Quantization: int8 (4x smaller, 2x faster)")
    print("Vocabulary: 10,000 tokens (optimized for file content)")
    print(f"Device: {device.upper()}")
    print(f"Output: {output_dir}")
    print()
    if device == "cpu":
        print("WARNING: CPU mode detected. This may take 30+ minutes!")
        print("WARNING: For faster processing, install CUDA-enabled PyTorch.")
    else:
        print("INFO: GPU mode. Expected time: 5-10 minutes.")
    print("WARNING: The distilled model may not outperform potion-8M-int8.")
    print()

    try:
        # Create output directory
        output_dir.mkdir(parents=True, exist_ok=True)

        # Distill the model with int8 quantization and vocabulary compression
        print("Step 1/2: Downloading and distilling from Qwen3-Embedding-0.6B...")
        print("          (This downloads ~1.2GB and processes 620M parameters)")
        print()
        
        # Move the base model to GPU first for faster encoding
        if device == "cuda":
            import torch
            print(f"          GPU Memory before: {torch.cuda.memory_allocated()/1024**3:.2f} GB")
            torch.backends.cudnn.benchmark = True  # Enable cuDNN auto-tuner
        
        model = distill(
            model_name="Qwen/Qwen3-Embedding-0.6B",
            quantize_to="int8",
            vocabulary_quantization=10000,
            device=device,  # GPU for the transformer encoding step
            use_subword=False,  # Skip subword processing for speed
        )

        print("Step 2/2: Saving distilled model...")
        model.save_pretrained(str(output_dir))

        # Fix tokenizer.json - ensure unk_token exists in vocabulary
        # model2vec-rs requires the unk_token to be in the vocab
        tokenizer_path = output_dir / "tokenizer.json"
        if tokenizer_path.exists():
            print("Step 2.5/2: Fixing tokenizer for Rust compatibility...")
            try:
                import json
                with open(tokenizer_path, "r", encoding="utf-8") as f:
                    tokenizer_data = json.load(f)
                
                # Get unk_token if defined
                unk_token = None
                if "model" in tokenizer_data and "unk_token" in tokenizer_data["model"]:
                    unk_token = tokenizer_data["model"]["unk_token"]
                
                # Check if it's in the vocab and add if missing
                if unk_token and "model" in tokenizer_data and "vocab" in tokenizer_data["model"]:
                    vocab = tokenizer_data["model"]["vocab"]
                    if unk_token not in vocab:
                        # Add unk_token with a high ID
                        max_id = max(vocab.values()) if vocab else 0
                        vocab[unk_token] = max_id + 1
                        print(f"          Added missing '{unk_token}' to vocabulary")
                        
                        with open(tokenizer_path, "w", encoding="utf-8") as f:
                            json.dump(tokenizer_data, f)
            except Exception as tok_err:
                print(f"          [WARNING] Could not fix tokenizer: {tok_err}")

        # Calculate model size
        size_mb = sum(f.stat().st_size for f in output_dir.glob('*')) / 1024 / 1024

        print()
        print(f"[SUCCESS] Ixos-embedder-v1 saved to: {output_dir}")
        print(f"[SUCCESS] Model size: {size_mb:.2f} MB")
        print()
        return True

    except Exception as e:
        print(f"[ERROR] Qwen distillation failed: {e}", file=sys.stderr)
        if output_dir.exists():
            import shutil
            shutil.rmtree(output_dir)
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Create embedding models for Ixos Protocol",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python scripts/distill_model.py              # Create both models
    python scripts/distill_model.py --potion     # Only quantize potion-base-8M (recommended)
    python scripts/distill_model.py --qwen       # Only distill Qwen model (experimental)
        """
    )
    parser.add_argument(
        "--potion",
        action="store_true",
        help="Only create potion-base-8M-int8 (recommended)"
    )
    parser.add_argument(
        "--qwen",
        action="store_true",
        help="Only create ixos-embedder-v1 from Qwen (experimental)"
    )
    parser.add_argument(
        "--device",
        type=str,
        choices=["auto", "cuda", "cpu"],
        default="cuda",
        help="Device for Qwen distillation: auto (default), cuda, or cpu"
    )

    args = parser.parse_args()

    # Default: create both if no flags specified
    create_potion = args.potion or (not args.potion and not args.qwen)
    create_qwen = args.qwen or (not args.potion and not args.qwen)

    print()
    print("=" * 70)
    print("Ixos Embedding Model Setup")
    print("=" * 70)
    print()

    success = True

    if create_potion:
        if not create_potion_int8():
            success = False
            print("[WARN] Potion-8M-int8 creation failed, continuing...")

    if create_qwen:
        if not create_qwen_distilled(device=args.device):
            success = False
            print("[WARN] Qwen distillation failed, continuing...")

    print()
    print("=" * 70)
    print("Summary")
    print("=" * 70)

    models_dir = Path(__file__).parent.parent / "models"

    potion_exists = (models_dir / "potion-base-8M-int8").exists()
    qwen_exists = (models_dir / "ixos-embedder-v1").exists()

    print()
    print(f"  potion-base-8M-int8: {'[OK]' if potion_exists else '[MISSING]'}")
    print(f"  ixos-embedder-v1:    {'[OK]' if qwen_exists else '[MISSING]'}")
    print()

    if potion_exists or qwen_exists:
        print("At least one model is ready. You can now build Ixos:")
        print("  cargo build --release")
        print()
        print("Select model in CLI with: --model potion | qwen | auto")
        print("  (auto = try qwen first, fallback to potion)")
    else:
        print("[ERROR] No models created. Check errors above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
