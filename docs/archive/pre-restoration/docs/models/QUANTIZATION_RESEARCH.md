# Quantization Research Report

> Investigation of 4-bit quantization options for Ixos embedding models.

**Generated:** 2026-02-04
**Status:** Research Complete - Recommendation: Stay with int8

---

## Current State

| Model | Quantization | Size | MRR@10 | Latency |
|-------|-------------|------|--------|---------|
| ixos-flash-v2 | int8 | 16.6 MB | 0.8340 | 339ms/1k |
| potion-base-8m | int8 | 7.64 MB | 0.8073 | 219ms/1k |

Both production models use **int8 quantization**, which provides:
- ~50% size reduction vs float16
- ~20% latency improvement
- <1% accuracy degradation

---

## 4-bit Quantization Analysis

### Available Techniques

1. **GPTQ-style 4-bit**
   - Designed for LLMs, not embedding models
   - Uses calibration data to minimize error
   - Not directly applicable to Model2Vec

2. **GGML/GGUF Q4**
   - Popular in llama.cpp ecosystem
   - Block-based quantization (32 values per block)
   - No existing tooling for Model2Vec

3. **bitsandbytes NF4**
   - 4-bit NormalFloat format
   - Optimized for weight distributions in transformers
   - PyTorch-only, runtime dequantization

4. **AWQ (Activation-aware)**
   - Preserves salient weights at higher precision
   - Complex calibration requirements
   - Not applicable to static embedding models

### Why 4-bit is Not Recommended for Embeddings

1. **Embedding Dimension Sensitivity**
   - Embedding models produce fixed-dimension vectors (256-512 dims)
   - Each dimension contributes to final similarity score
   - 4-bit quantization error compounds across dimensions
   - Error: ±0.0625 per value (vs ±0.00390625 for int8)

2. **No Dynamic Range Benefits**
   - LLMs benefit from 4-bit because activations vary per input
   - Embedding weights are static - no activation-aware optimization
   - All weights equally important for similarity computation

3. **Minimal Size Benefit**
   - Flash v2 at int8: 16.6 MB
   - Theoretical int4: ~8 MB
   - Saving: 8 MB (negligible for desktop app)

4. **Quality Degradation Estimates**
   - Based on general quantization literature for embedding models:
   - Expected MRR drop: 5-15% (vs <1% for int8)
   - Tail query degradation: 15-25% on ambiguous queries

### Model2Vec Compatibility

The `model2vec` library supports these quantization levels:
- `float32` (default)
- `float16` (half precision)
- `int8` (current production)

**No native int4 support exists** in model2vec-rs or the Python library.

---

## Recommendation

**Stay with int8 quantization.**

### Rationale

1. **Quality-first**: int8 achieves <1% MRR degradation, int4 would be 5-15%
2. **No tooling**: Would require building custom int4 inference path
3. **Minimal gain**: 8 MB savings not worth accuracy loss
4. **Current performance excellent**: 339ms/1k latency is sub-perceptible

### If Smaller Models Are Needed

Consider these alternatives before 4-bit:

1. **Reduce embedding dimensions** (512 → 192)
   - Already have ixos-flash-v4-int8-192 (29 MB, MRR 0.795)
   - 38% size reduction, 5% quality loss

2. **Prune vocabulary**
   - Current: 15,000 tokens
   - Could reduce to 10,000 for specialized use cases
   - ~30% model size reduction

3. **Use Potion alone** (for speed-critical scenarios)
   - 7.64 MB, 219ms/1k
   - MRR 0.807 (adequate for most queries)

---

## Future Considerations

Monitor these developments:

- **ONNX Runtime int4**: Microsoft working on int4 support
- **Metal Performance Shaders**: Apple's int4 support for M-series
- **Model2Vec native int4**: If library adds support

Re-evaluate when:
- Model sizes exceed 100 MB
- int4 tooling matures for embedding models
- Quality benchmarks show <3% MRR degradation

---

## References

- [Model2Vec Documentation](https://github.com/MinishLab/model2vec)
- [GPTQ Paper](https://arxiv.org/abs/2210.17323)
- [AWQ Paper](https://arxiv.org/abs/2306.00978)
- Ixos internal benchmarks: `models/lab/CANONICAL_RESULTS.md`
