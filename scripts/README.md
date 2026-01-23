# Ixos Model Distillation Scripts

This directory contains Python scripts for creating the custom Ixos embedding model.

## Overview

The Ixos embedder is a distilled, int8-quantized model optimized for file search. It provides:

- **Small size**: ~5-10 MB (vs ~30 MB for standard models)
- **Fast inference**: 2x faster on CPU with int8 SIMD
- **Good quality**: Distilled from Qwen3-Embedding-0.6B
- **Optimized vocabulary**: 10K tokens (sufficient for file content)

## Setup

1. Install Python dependencies:
```bash
pip install -r scripts/requirements.txt
```

## Creating the Model

Run the distillation script:
```bash
python scripts/distill_model.py
```

This will:
1. Download the base model (Qwen/Qwen3-Embedding-0.6B) from HuggingFace
2. Apply int8 quantization
3. Compress the vocabulary to 10,000 tokens
4. Save the model to `models/ixos-embedder-v1/`

**Note**: This may take 5-10 minutes depending on your hardware and internet connection.

## Benchmarking the Model

After creating the model, test its quality:
```bash
python scripts/benchmark_model.py
```

This will:
- Test embedding quality on file-search-relevant queries
- Measure inference speed
- Verify semantic similarity preservation

## Using the Model

Once created, the model is automatically used by Ixos when you build:

```bash
cargo build --release
```

The CLI uses the selected model:
1. **Potion-8M-int8** at `models/potion-base-8M-int8/` (recommended, stable)
2. **Ixos-Embedder-v1** at `models/ixos-embedder-v1/` (experimental)

Select a specific model:
```bash
cargo run -- search "query" --model potion    # Use Potion (recommended)
cargo run -- search "query" --model qwen      # Use Qwen (experimental)
```

## Benchmarking Models

Compare model performance:
```bash
python scripts/benchmark_models.py           # Benchmark all
python scripts/benchmark_models.py --potion  # Only Potion
python scripts/benchmark_models.py --json    # Output as JSON
```

This measures:
- Load time
- Embeddings per second
- Semantic quality (similarity accuracy)

## Model Harness (P7)

Run the eval harness on synthetic ambiguity + real corpus:
```bash
python scripts/ixos_eval.py --suite both
```

Results are written to:
- `models/lab/results_latest.json`
- `models/lab/results_latest.csv`

You can add models to test in:
- `models/lab/manifest.json`

## Fetch Models (P7)
Download/update all manifest models:
```bash
python scripts/fetch_models.py --manifest models/lab/manifest.json
```

## Distillation Experiments (P7)
Teacher → student:
```bash
python scripts/distill_lab.py --mode teacher --output models/lab/distill_teacher_student
```

Topology supervision:
```bash
python scripts/distill_lab.py --mode topology --output models/lab/distill_topology_student
```

## Deployment

For production deployments, the model is bundled with the installer via the Tauri configuration:

```json
{
  "bundle": {
    "resources": ["../models/ixos-embedder-v1/*"]
  }
}
```

This ensures users get the optimized model without requiring Python or a separate download step.

## Troubleshooting

### "model2vec not found"
Install dependencies: `pip install -r scripts/requirements.txt`

### "No module named 'torch'" or "ImportError: torch is required"
The distillation feature requires PyTorch. Install with the distill extra:
```bash
pip install model2vec[distill]
```
Or reinstall requirements: `pip install -r scripts/requirements.txt`

### "Distillation failed"
- Check your internet connection (needs to download from HuggingFace)
- Ensure you have ~500 MB free disk space
- Try clearing the HuggingFace cache: `rm -rf ~/.cache/huggingface`

### "Model not found" in Ixos
- Run `python scripts/distill_model.py` to create models
- Check that `models/potion-base-8M-int8/model.safetensors` exists
- The CLI defaults to Potion which is more reliable

### "tokenizer claims unk_token='[UNK]' but it isn't in the vocab"
This affects the Qwen model. Fix with:
```bash
python scripts/fix_tokenizer.py --all
```
Or delete and recreate the model:
```bash
rm -rf models/ixos-embedder-v1
python scripts/distill_model.py --qwen
```

## Technical Details

### Model Architecture
- **Base**: Qwen3-Embedding-0.6B (state-of-the-art Chinese-English embedding model)
- **Method**: Model2Vec distillation (static word embeddings with context)
- **Quantization**: int8 (4x compression, 2x speedup on modern CPUs)
- **Vocabulary**: 10,000 tokens (optimized for file content, not general text)

### Why Qwen3-Embedding-0.6B?
- Excellent semantic understanding for file content
- Strong performance on code and technical text
- Bilingual (English + Chinese) - useful for international users
- Compact base model (600M parameters -> distills to ~5MB)

### Why int8 quantization?
- CPUs with AVX2/AVX-512 have fast int8 SIMD instructions
- 4x smaller model size = faster loading from disk
- Negligible accuracy loss (<2%) for semantic search tasks
- Better cache utilization during inference
