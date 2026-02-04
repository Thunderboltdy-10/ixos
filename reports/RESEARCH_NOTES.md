# RESEARCH_NOTES.md

Date: 2026-02-03

## Embedding Compression / Variable-Dimension Ideas
- Matryoshka Representation Learning (MRL) trains embeddings so prefixes remain useful, enabling a single model to serve multiple dimension budgets without extra inference cost. This supports Flash v2 candidates that allow dimension slicing or PCA sweeps. Source: [arXiv:2205.13147](https://arxiv.org/abs/2205.13147)
- MiniLMv2 distills self-attention relations to produce strong small models, reinforcing distillation as a practical path for Flash-class embedding quality at CPU-friendly sizes. Source: [arXiv:2012.15828](https://arxiv.org/abs/2012.15828)
- SmoothQuant introduces activation smoothing to enable W8A8 post-training quantization with minimal accuracy loss, suggesting an int8-first deployment path for CPU embeddings. Source: [arXiv:2211.10438](https://arxiv.org/abs/2211.10438)
- IntAttention proposes fully integer attention without dequantization, targeting lower latency/energy on CPU. This informs future CPU-optimized embedding variants. Source: [arXiv:2511.21513](https://arxiv.org/abs/2511.21513)

## Hard-Negative Mining / Distillation
- ANCE mines hard negatives from an ANN index updated during training, reducing train/test mismatch and improving dense retrieval. This supports ANN-mined negatives from real_corpus_v2 for Flash v2 training. Source: [arXiv:2007.00808](https://arxiv.org/abs/2007.00808)
- RocketQA uses large-batch negatives plus cross-encoder distillation (denoised hard negatives) to improve dense retrieval quality, motivating a stronger teacher/reranker for negative generation. Source: [arXiv:2010.08191](https://arxiv.org/abs/2010.08191)

## Cascade / Retrieval Acceleration
- ColBERTv2 pairs late interaction with residual compression to reduce storage while maintaining quality, pointing to multi-vector compression or late-interaction fallback for Pro v2 if needed. Source: [arXiv:2112.01488](https://arxiv.org/abs/2112.01488)
- PLAID accelerates late interaction retrieval using centroid interaction + pruning, reporting large latency reductions without sacrificing quality. This reinforces cascade pruning before expensive scoring. Source: [arXiv:2205.09707](https://arxiv.org/abs/2205.09707)

## Practical Takeaways for Ixos
- Flash v2 candidates should consider matryoshka-compatible or PCA-friendly embeddings to allow dimension sweeps without retraining. Sources: [arXiv:2205.13147](https://arxiv.org/abs/2205.13147)
- Pro v2 cascades benefit from aggressive pruning before high-cost scoring; PLAID/ColBERTv2 provide evidence that pruning retains quality. Sources: [arXiv:2205.09707](https://arxiv.org/abs/2205.09707), [arXiv:2112.01488](https://arxiv.org/abs/2112.01488)
- Hard-negative mining should combine ANN-mined negatives and reranker-denoised negatives for better supervision. Sources: [arXiv:2007.00808](https://arxiv.org/abs/2007.00808), [arXiv:2010.08191](https://arxiv.org/abs/2010.08191)
- Quantization-aware/post-training int8 remains the most practical CPU acceleration path today; SmoothQuant + IntAttention provide evidence for low-latency CPU inference. Sources: [arXiv:2211.10438](https://arxiv.org/abs/2211.10438), [arXiv:2511.21513](https://arxiv.org/abs/2511.21513)
