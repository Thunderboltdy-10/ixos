#!/usr/bin/env python3
"""
Fix tokenizer.json for model2vec-rs compatibility.

Fixes the issue where vocabulary_quantization creates a tokenizer
that claims unk_token='[UNK]' but the token isn't in the compressed vocabulary.

Usage:
    python scripts/fix_tokenizer.py models/ixos-embedder-v1
    python scripts/fix_tokenizer.py --all  # Fix all models in models/
"""

import json
import sys
from pathlib import Path


def fix_tokenizer(model_dir: Path) -> bool:
    """Fix tokenizer.json to ensure unk_token exists in vocabulary or remove the reference."""
    tokenizer_path = model_dir / "tokenizer.json"
    config_path = model_dir / "tokenizer_config.json"
    
    if not tokenizer_path.exists():
        print(f"  [SKIP] No tokenizer.json found in {model_dir}")
        return False
    
    print(f"  Checking {model_dir.name}...")
    
    try:
        with open(tokenizer_path, "r", encoding="utf-8") as f:
            tokenizer_data = json.load(f)
        
        modified = False
        unk_token = None
        unk_token_location = None
        
        # Location 1: model.unk_token (WordPiece/WordLevel tokenizers)
        if "model" in tokenizer_data and tokenizer_data["model"].get("unk_token"):
            unk_token = tokenizer_data["model"]["unk_token"]
            unk_token_location = "model.unk_token"
            print(f"    Found unk_token in {unk_token_location}: '{unk_token}'")
        
        # Location 2: Check tokenizer_config.json
        if not unk_token and config_path.exists():
            with open(config_path, "r", encoding="utf-8") as f:
                config_data = json.load(f)
            if config_data.get("unk_token"):
                unk_token = config_data["unk_token"]
                unk_token_location = "tokenizer_config.json"
                print(f"    Found unk_token in {unk_token_location}: '{unk_token}'")
        
        # Location 3: added_tokens with special=true
        if not unk_token and "added_tokens" in tokenizer_data:
            for token in tokenizer_data["added_tokens"]:
                content = token.get("content", "")
                if content in ["[UNK]", "<unk>", "<UNK>"]:
                    unk_token = content
                    unk_token_location = "added_tokens"
                    print(f"    Found unk_token in {unk_token_location}: '{unk_token}'")
                    break
        
        if not unk_token:
            print(f"    No unk_token defined - OK")
            return True
        
        # Get the vocabulary
        vocab = tokenizer_data.get("model", {}).get("vocab", {})
        if not vocab:
            print(f"    [WARN] No vocab found in tokenizer")
            return False
        
        # Check if unk_token exists in vocabulary
        if unk_token in vocab:
            print(f"    unk_token '{unk_token}' already in vocab - OK")
            return True
        
        print(f"    [ISSUE] unk_token '{unk_token}' NOT in vocab!")
        
        # FIX: Add unk_token to vocabulary with a new ID
        max_id = max(vocab.values()) if vocab else 0
        vocab[unk_token] = max_id + 1
        modified = True
        print(f"    [FIXED] Added '{unk_token}' to vocabulary (id={max_id + 1})")
        
        # Also fix tokenizer_config.json if needed
        if config_path.exists():
            with open(config_path, "r", encoding="utf-8") as f:
                config_data = json.load(f)
            # Make sure config references the token we just added
            if config_data.get("unk_token") and config_data["unk_token"] not in vocab:
                # Token is now in vocab after our fix
                print(f"    [NOTE] tokenizer_config.json unk_token now matches vocab")
        
        if modified:
            with open(tokenizer_path, "w", encoding="utf-8") as f:
                json.dump(tokenizer_data, f, indent=2)
            print(f"    [SAVED] tokenizer.json updated")
        
        return True
            
    except Exception as e:
        print(f"    [ERROR] {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/fix_tokenizer.py <model_dir>")
        print("       python scripts/fix_tokenizer.py --all")
        sys.exit(1)
    
    print("Tokenizer Compatibility Fix")
    print("="*50)
    
    if sys.argv[1] == "--all":
        # Fix all models
        models_dir = Path(__file__).parent.parent / "models"
        if not models_dir.exists():
            print(f"Models directory not found: {models_dir}")
            sys.exit(1)
        
        for model_dir in models_dir.iterdir():
            if model_dir.is_dir():
                fix_tokenizer(model_dir)
    else:
        # Fix specific model
        model_dir = Path(sys.argv[1])
        if not model_dir.exists():
            print(f"Model directory not found: {model_dir}")
            sys.exit(1)
        fix_tokenizer(model_dir)
    
    print()
    print("Done. Try running your search again:")
    print("  cargo run -- search \"Kirk\" --verbose")


if __name__ == "__main__":
    main()
