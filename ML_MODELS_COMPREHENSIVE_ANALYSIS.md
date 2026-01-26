# Ixos ML Models - Comprehensive Analysis

**Generated**: January 2026  
**Scope**: Complete ML model inventory, architectures, performance metrics, and optimization techniques

---

## Executive Summary

Ixos implements a sophisticated hybrid architecture combining **lexical search** with **semantic embeddings** using Model2Vec. The system supports multiple embedding models with intelligent routing between fast "Flash" and accurate "Pro" variants, complemented by cross-encoder rerankers for top-K refinement.

**Key Innovation**: Zero-storage JIT (Just-In-Time) architecture that computes embeddings on-demand with 97% candidate set reduction via lexical funnel, enabling sub-2-second latency without persistent vector storage.

---

## 1. Embedding Models (Primary)

### 1.1 Ixos-Flash-v2 (PRIMARY PRODUCTION MODEL)

**Status**: Shipping default  
**Type**: Static embedding model  
**Base Architecture**: Model2Vec  
**Teacher Model**: st-all-mpnet-base-v2  

**Configuration**:
- **Dimensions**: 512 (float16)
- **Embedding Type**: float16 (memory efficient)
- **PCA**: Applied (512-dim)
- **Pooling**: Mean
- **SIF Coefficient**: 0.0001
- **Tokenizer**: st-all-mpnet-base-v2
- **License**: MIT

**Performance (Real Corpus v2, cap=300, batch=64)**:
- **MRR@10**: 0.766
- **Recall@10**: 0.875
- **Latency**: 417.49 ms/1k candidates
- **Load Time**: ~100-200ms
- **Model Size**: ~30-40MB (approx)

**Advantages**:
- Beats Potion baseline on real corpus (0.766 vs 0.727)
- Distilled for speed/quality tradeoff
- Float16 reduces memory pressure
- Trained with teacher knowledge from mpnet-base-v2

**Used In**: Default Flash mode, Auto mode initial pass

---

### 1.2 Ixos-Pro-v1 (EXPERIMENTAL)

**Status**: Experimental (not competitive)  
**Type**: Static embedding model  
**Base Architecture**: Model2Vec  

**Configuration**:
- **Dimensions**: Varies (experimental variants)
- **License**: MIT

**Performance (Real Corpus v2)**:
- **MRR@10**: ~0.63-0.69 (did not beat Flash)
- Kept for experimentation only

**Notes**: Multiple teacher/dimension variants attempted but none outperformed Flash. Not recommended for production.

---

### 1.3 Potion-base-8M-int8 (PREVIOUS DEFAULT)

**Status**: Superseded by Ixos-Flash-v2  
**Type**: Static embedding model  
**Source**: minishlab/potion-base-8M  
**Base License**: MIT  

**Configuration**:
- **Dimensions**: 256
- **Quantization**: int8 (4x compression)
- **Model Size**: 7.64 MB (extreme compression)
- **Pooling**: Mean
- **Embedding Dtype**: int8

**Performance (Real Corpus v2, cap=300, batch=64)**:
- **MRR@10**: 0.727
- **Recall@10**: 0.855
- **Latency**: 192.09 ms/1k candidates
- **Load Time**: ~50-100ms

**Key Characteristics**:
- Fastest inference (int8 SIMD optimization)
- Smallest footprint (7.6MB vs 30+MB)
- Good quality/speed tradeoff
- DEPRECATED: Replaced by Ixos-Flash-v2

**Optimization Techniques**:
- **8-bit Quantization**: Reduces model from 30MB to 7.5MB, enables AVX/SIMD 4x throughput increase
- **No gradient tracking**: Static model, no training overhead
- **Batch processing**: Vectorized inference

---

### 1.4 Ixos-Embedder-v1 (Qwen Distilled)

**Status**: Experimental  
**Type**: Static embedding model  
**Source**: Distilled from Qwen3-Embedding-0.6B  

**Configuration**:
- **Base Model**: Qwen/Qwen3-Embedding-0.6B
- **Dimensions**: 256
- **Quantization**: int8
- **PCA**: Applied (256-dim)
- **Vocabulary Quantization**: 10,000 tokens
- **Pooling**: Mean
- **Model Size**: 14.19 MB
- **License**: Unknown

**Performance (Real Corpus v2)**:
- **MRR@10**: 0.4351 (vs Potion 0.8381)
- **Latency**: 486.42 ms/1k
- NOT COMPETITIVE

**Notes**: 
- Intended to be "potentially better quality" than Potion
- Actual results show severe regression
- Needs distillation overhaul before considered for production
- Training process: 620M parameter Qwen model distilled to static Model2Vec format

---

## 2. Comparison Models (Evaluation Lab)

The `models/lab/manifest.json` contains 40+ models evaluated across multiple dimensions:

### 2.1 SentenceTransformers Family (Embedders)

| Model ID | Size (MB) | Tier | Backend | Dimensions | MRR@10 (Real) | Latency (ms/1k) |
|----------|-----------|------|---------|------------|---------------|-----------------|
| st-paraphrase-minilm-l6-v2 | 87.56 | flash | ST | 384 | 0.782 | 653.33 |
| st-paraphrase-multilingual-minilm-l12-v2 | 479.21 | flash | ST | 384 | 0.7631 | 1031.6 |
| st-all-mpnet-base-v2 | 418.59 | pro | ST | 768 | 0.77+ | 1000+ |
| st-stsb-roberta-base-v2 | 480.1 | pro | ST | 768 | 0.7637 | 1665.57 |
| st-all-roberta-large-v1 | 1360.24 | pro | ST | 1024 | 0.957 | 15978.10 |
| st-all-minilm-l6-v2 | 87.57 | flash | ST | 384 | ~0.74 | ~500 |

**Observations**:
- SentenceTransformers generally slower than Model2Vec variants
- Larger dimensions (768+) offer better quality but severe latency penalty
- MiniLM variants (L6/L12) best latency/quality tradeoff for ST

---

### 2.2 BGE Family (BAAI Embeddings)

| Model ID | Size (MB) | Tier | Backend | Dimensions | MRR@10 | Latency (ms/1k) |
|----------|-----------|------|---------|------------|--------|-----------------|
| bge-small-en-v1.5 | 382.53 | flash | transformers | 384 | 0.7744 | 81619.03* |
| bge-base-en-v1.5 | 1251.99 | pro | transformers | 768 | 0.7911 | 234014.45* |
| bge-base-en-v1.5-instruct | - | pro | transformers | 768 | 0.8066 | 225267.17* |

*Note: Reduced caps (cap=20) due to CPU constraints

---

### 2.3 E5 Family (Embeddings for Everything)

| Model ID | Size (MB) | Backend | Dimensions | MRR@10 | Latency (ms/1k) |
|----------|-----------|---------|------------|--------|-----------------|
| e5-small-v2 | 765.99 | transformers | 384 | 0.7984 | 82097.74* |
| e5-small-v2-onnx | 159.75 | onnx | 384 | 0.8130 | 88077.87* |
| e5-base-v2 | 2086.87 | transformers | 768 | 0.8342 | 230419.63* |
| e5-base-v2-prompt | - | transformers | 768 | 0.8279 | 229911.9* |

*Reduced caps due to CPU constraints; ONNX slightly faster

---

### 2.4 GTE Family (Supabase)

| Model ID | Size (MB) | Backend | MRR@10 | Latency (ms/1k) |
|----------|-----------|---------|--------|-----------------|
| gte-small-supabase | 287.59 | transformers | 0.7955 | 82810.14* |

---

## 3. Reranker Models (Top-K Refinement)

### 3.1 Cross-Encoder Family (MS MARCO)

**Purpose**: Re-score top-K candidates for improved ranking

| Model ID | Type | Size (MB) | MRR@10 | Recall@10 | Latency (ms/1k) |
|----------|------|-----------|--------|-----------|-----------------|
| cross-encoder/ms-marco-TinyBERT-L-2-v2 | reranker | 165.12 | 0.8562 | 0.9000 | **339.58** ✓ |
| cross-encoder/ms-marco-MiniLM-L-6-v2 | reranker | 848.92 | 0.8554 | 0.8950 | 675.72 |
| cross-encoder/ms-marco-MiniLM-L-12-v2 | reranker | 1247.78 | 0.8562 | 0.8900 | 1050.82 |

**SELECTED FOR PRODUCTION**: TinyBERT-L-2-v2
- Best speed/quality tradeoff
- Only CPU-friendly reranker worth shipping
- 339.58 ms/1k latency at cap=150, topK=30
- Architecture: 2-layer TinyBERT distilled from MiniLM

---

### 3.2 BGE Reranker Family

| Model ID | Size (MB) | MRR@10 | Latency (ms/1k) |
|----------|-----------|--------|-----------------|
| bge-reranker-base | 3203.51 | 0.8508 | 2350.01 |
| bge-reranker-large | 6429.4 | 0.8708 | 7230.57 |

**Notes**: Slower than TinyBERT, not recommended for production

---

## 4. Model Architecture Innovations

### 4.1 Quantization Techniques

#### Int8 Quantization (Model2Vec)
- **Benefit**: 4x model size reduction (30MB → 7.5MB)
- **Throughput Gain**: 2x inference speedup via AVX/SIMD
- **Precision Loss**: Minimal (<0.5% quality regression)
- **Used In**: Potion-base-8M-int8

#### Float16 (Ixos-Flash-v2)
- **Benefit**: 2x memory reduction vs float32
- **Precision**: Sufficient for semantic search
- **Hardware Support**: Native on most modern CPUs/GPUs
- **Used In**: Ixos-Flash-v2 (512-dim)

#### ONNX Quantization (E5-small-v2-onnx)
- **Model**: 159.75 MB (smaller packaged)
- **Backend**: ONNX Runtime (CPU inference)
- **Latency**: 88077.87 ms/1k (comparable to transformers)
- **Use Case**: Deployment where package size matters

---

### 4.2 Knowledge Distillation

#### Teacher-Stud
