# IXOS_MODEL_LAB_REPORT

Date: 2026-01-17
Owner: Codex (ML embeddings + systems)

## Phase A - Integration Checklist
| Item | Status | Notes | Code Pointers |
| --- | --- | --- | --- |
| A1 Typo correction | Done | Query preprocessing w/ LRU cache + typo map + tests | src/ixos_rank/candidate_generator/query_preprocess.rs, src/ixos_rank/candidate_generator/mod.rs |
| A2 Synonym expansion | Done | Light synonyms, capped per term, operator/extension/quotes preserved | src/ixos_rank/candidate_generator/query_preprocess.rs, src/ixos_rank/candidate_generator/mod.rs |
| A3 PassageExtractor integration | Done | Top-K evidence uses PassageExtractor::best_passage; heavy formats skipped | src/ixos_rank/progressive.rs |
| A4 Evidence tags/explanations | Done | EvidenceSummary added + payload fields for tags/explanations/lexical/semantic/path/filetype | src/ixos_rank/types.rs, src/ixos_rank/secure_ranker.rs, src/ixos_rank/progressive.rs, src-tauri/src/commands/search.rs |
| A5 AugmentedEmbedder | Done | Path-augmented text via build_augmented_text for embeddings (single + batch) | src/ixos_embed/augmented.rs, src/ixos_rank/semantic_engine.rs |
| A6 DirectoryCentroids boost | Done | Centroid boost + tunable weight + micro-bench added | src/ixos_rank/semantic_engine.rs, benches/directory_centroids_boost.rs |

## Evidence Payload Fields (Top-K Only)
- Lexical: hit count + matched terms (best effort from snippet/query)
- Semantic: best passage (short)
- Path tags: filename tokens + parent folder
- File type tag: extension
- UI tags + explanation: generated from EvidenceChain

## Tests & Benchmarks
| Run | Status | Notes |
| --- | --- | --- |
| cargo test --lib | Passed | All lib tests pass (409 passed, 6 ignored). Warnings remain. |
| cargo test --bins | Passed | Bin tests pass; warnings remain. |
| cargo bench --bench directory_centroids_boost | Passed | Criterion results captured; see below. |
| python scripts/ixos_eval.py --suite both | Passed | Synthetic + real-corpus evals executed; results in models/lab/results_latest.json |
| python scripts/ixos_eval.py --suite both --difficulty medium --candidate-cap 300 | Passed | Marathon sweep in chunks; outputs results_b*.json |
| python scripts/ixos_eval.py --suite synthetic --fusion linear/rrf/rank_sum/learned | Passed | Fusion strategies logged |
| python scripts/distill_lab.py --mode teacher/topology | Passed | Distillation experiments completed; models in models/lab/ |

## Directory Centroids Micro-Benchmark (P6.3)
Benchmark: `directory_centroids_boost/update_and_score`

| Candidates | Time (median) | Throughput |
| --- | --- | --- |
| 200 | ~53.4 µs | ~3.75 Melem/s |
| 500 | ~133.9 µs | ~3.73 Melem/s |
| 1000 | ~268.5 µs | ~3.72 Melem/s |

Observation: centroid update + similarity scoring for 1k candidates stays well under 1ms.

## Open Issues / Follow-ups
- None blocking Phase A. (Warnings remain in existing code.)

## Phase B - Model Harness & Routing
### Model Harness (B1)
Created `scripts/ixos_eval.py` with:
- Synthetic ambiguity suite (auto-generated under dataset/synthetic_ambiguity)
- Real-corpus eval mode (local-only dataset/ with title-as-query)
- Metrics: Recall@10, MRR@10, latency per 1k candidates (batched), load time
- Outputs: JSON + CSV in models/lab/

CLI:
```
python scripts/ixos_eval.py --suite both
```

Manifest:
`models/lab/manifest.json`

Synthetic suite directories: finance, ops, legal, hr, marketing, security, product (ambiguous filenames like report_2023.txt).

Synthetic suite difficulty upgrades (2026-01-18):
- Added typos, spacing issues, partial queries, and synonym variants.
- Added same-filename hard negatives across 3–8 directories (report_2023.txt, summary.txt, overview.txt, plan.txt, notes.txt).
- Added difficulty switch: small/medium/large to scale ambiguity and file count.

### Fetch Pipeline (B1.5)
Created `scripts/fetch_models.py` to download/prepare candidates from `models/lab/manifest.json` and log to `models/lab/MODELS_DOWNLOADED.md`.

Command:
```
python scripts/fetch_models.py --manifest models/lab/manifest.json
```

### Marathon Sweep (Medium difficulty)
Eval settings (standard): candidate_cap=300, real_limit=80, real_queries=80, batch_size=32
Candidates evaluated so far: 30 total (25 embedders + 5 rerankers, including 2 distilled students).

Synthetic Ambiguity (standard settings)
| Model | MRR@10 | Recall@10 | Lat ms/1k |
| --- | --- | --- | --- |
| st-paraphrase-multilingual-minilm-l12-v2 | 0.9208 | 1.0000 | 506.02 |
| st-paraphrase-mpnet-base-v2 | 0.9167 | 1.0000 | 709.12 |
| st-multi-qa-minilm-l6-dot-v1 | 0.8889 | 1.0000 | 225.35 |
| st-msmarco-distilbert-base-v4 | 0.8872 | 1.0000 | 378.88 |
| potion-base-8m | 0.8833 | 0.9667 | 21.21 |
| potion-base-8m-int8 | 0.8833 | 0.9667 | 24.57 |
| st-multi-qa-minilm-l6-cos-v1 | 0.7900 | 1.0000 | 245.35 |
| st-all-distilroberta-v1 | 0.7843 | 1.0000 | 390.98 |

Real Corpus (standard settings)
| Model | MRR@10 | Recall@10 | Lat ms/1k |
| --- | --- | --- | --- |
| st-paraphrase-minilm-l6-v2 | 0.9358 | 0.9875 | 664.27 |
| potion-base-8m | 0.9330 | 0.9625 | 167.78 |
| potion-base-8m-int8 | 0.9330 | 0.9625 | 201.89 |
| st-paraphrase-multilingual-minilm-l12-v2 | 0.9112 | 0.9625 | 1072.59 |
| st-stsb-roberta-base-v2 | 0.8894 | 0.9875 | 1636.96 |
| st-msmarco-distilbert-base-v4 | 0.8688 | 0.8875 | 5422.10 |
| st-paraphrase-mpnet-base-v2 | 0.8601 | 0.9000 | 14197.34 |
| st-all-minilm-l12-v2 | 0.8491 | 0.9125 | 1023.23 |

Pareto Frontier (real, cap=300, batch=32)
| Model | MRR@10 | Lat ms/1k |
| --- | --- | --- |
| potion-base-8m | 0.9330 | 167.78 |
| st-paraphrase-minilm-l6-v2 | 0.9358 | 664.27 |

Reduced settings runs (heavy models timed out on standard settings):
| Model | MRR@10 | Recall@10 | Lat ms/1k | Cap | Batch |
| --- | --- | --- | --- | --- | --- |
| bge-base-en-v1.5 | 0.9714 | 1.0000 | 12331.33 | 150 | 16 |
| e5-base-v2 | 0.9389 | 1.0000 | 12227.18 | 150 | 16 |
| bge-small-en-v1.5 | 0.9375 | 1.0000 | 3645.76 | 200 | 32 |
| gte-small-supabase | 0.8909 | 1.0000 | 5042.51 | 200 | 32 |
| e5-small-v2-onnx | 0.8889 | 1.0000 | 2557.74 | 200 | 32 |
| e5-small-v2 | 0.8889 | 1.0000 | 3689.31 | 200 | 32 |
| st-all-roberta-large-v1 | 0.9571 | 1.0000 | 15978.10 | 150 | 16 |

Notes:
- ONNX e5-small-v2 needed tokenizer fix (use_fast=False + max_length) to avoid ONNX input index error.
- Sentence-transformers loading now sets fix_mistral_regex to suppress incorrect regex warnings.
- Batch-size sweep (16/32/64) executed on small suites in grouped runs: `results_sweep_group_*.json` (caps 120–150, real_limit 10–20).

### Results (Initial Baseline)
Run: 2026-01-18, batch_size=64, candidate_cap=1500, topk=10

Synthetic Ambiguity Suite (v1)
| Model | Recall@10 | MRR@10 | Latency ms/1k | Load Time ms | Memory Delta MB |
| --- | --- | --- | --- | --- | --- |
| potion-base-8M-int8 | 1.000 | 1.000 | 43.12 | 175.11 | 30.39 |
| ixos-embedder-v1 | 1.000 | 1.000 | 44.07 | 423.03 | 159.80 |

Real Corpus Suite (v1, dataset/)
| Model | Recall@10 | MRR@10 | Latency ms/1k | Load Time ms | Memory Delta MB |
| --- | --- | --- | --- | --- | --- |
| potion-base-8M-int8 | 0.985 | 0.9272 | 179.85 | 57.74 | 15.02 |
| ixos-embedder-v1 | 0.855 | 0.6260 | 413.95 | 431.54 | 147.98 |

Notes:
- Memory delta now recorded via psutil (installed 2026-01-18).
- Real-corpus queries now use title-derived variants (dropwords, synonyms, typos, shuffles); no longer exact title-only.

### Routing + Fusion (B2/B3)
Fusion strategies implemented in `scripts/ixos_eval.py` (linear, RRF, rank-sum) with grid search.

Grid search (step=0.5) on Synthetic Ambiguity Suite using:
- Flash: potion-base-8M-int8
- Pro: ixos-embedder-v1

| Strategy | Weights (flash, pro, lexical, dir) | Recall@10 | MRR@10 | Latency ms/1k |
| --- | --- | --- | --- | --- |
| linear | (0.0, 0.5, 0.0, 0.5) | 1.000 | 1.000 | 90.44 |
| rrf | (0.0, 0.5, 0.0, 0.5) | 1.000 | 1.000 | 77.54 |
| rank_sum | (0.0, 0.5, 0.0, 0.5) | 1.000 | 1.000 | 93.97 |

Next: repeat grid search on real-corpus suite and expand weight search granularity.

Fusion (medium difficulty, synthetic) with Flash= `potion-base-8m-int8`, Pro= `st-paraphrase-minilm-l6-v2`, batch=32:
| Strategy | Weights (flash, pro, lexical, dir) | MRR@10 | Lat ms/1k |
| --- | --- | --- | --- |
| linear | (0.50, 0.25, 0.25, 0.00) | 0.9370 | 270.90 |
| rrf | (0.50, 0.25, 0.25, 0.00) | 0.9037 | 279.88 |
| rank_sum | (0.75, 0.25, 0.00, 0.00) | 0.8870 | 270.79 |
| learned (logistic) | (0.30, 0.24, 0.22, 0.24) | 0.9208 | 272.85 |

### Ablations (Synthetic Medium, batch=32, cap=300)
Flash=`potion-base-8m-int8`, Pro=`st-paraphrase-minilm-l6-v2`
| Ablation | Weights (flash, pro, lexical, dir) | MRR@10 | Recall@10 |
| --- | --- | --- | --- |
| Flash only | (1,0,0,0) | 0.8833 | 0.9667 |
| Pro only | (0,1,0,0) | 0.6208 | 1.0000 |
| Lexical only | (0,0,1,0) | 0.2897 | 0.8333 |
| Dir only | (0,0,0,1) | 0.7294 | 0.8667 |
| Flash+Pro | (0.5,0.5,0,0) | 0.8819 | 1.0000 |
| Flash+Lex | (0.5,0,0.5,0) | 0.9167 | 0.9667 |
| Pro+Lex | (0,0.5,0.5,0) | 0.8292 | 1.0000 |
| Flash+Dir | (0.5,0,0,0.5) | 0.8875 | 1.0000 |
| Pro+Dir | (0,0.5,0,0.5) | 0.6208 | 1.0000 |
| Lex+Dir | (0,0,0.5,0.5) | 0.7294 | 0.8667 |

### Reranker Benchmarks (Top-K = 50, base = potion-base-8m-int8)
| Reranker | MRR@10 (synthetic) | MRR@10 (real) | Lat ms/1k (real) | Cap |
| --- | --- | --- | --- | --- |
| cross-encoder/ms-marco-TinyBERT-L-2-v2 | 0.9056 | 0.9675 | 749.54 | 200 |
| cross-encoder/ms-marco-MiniLM-L-6-v2 | 0.8639 | 0.9750 | 2309.55 | 200 |
| cross-encoder/ms-marco-MiniLM-L-12-v2 | 0.8039 | 0.9187 | 4035.31 | 200 |
| bge-reranker-base | 0.9028 | 0.9625 | 10265.28 | 150 |
| bge-reranker-large | 0.9208 | 1.0000 | 32960.77 | 100 |

### Routing (Flash → Pro) Heuristic
Rule: run Pro when flash top1-top5 gap < 0.05 OR lexical max < 0.15 OR query_len <= 2.
- Flash: potion-base-8m-int8
- Pro: st-paraphrase-multilingual-minilm-l12-v2

Results:
| Suite | MRR@10 | Recall@10 | Lat ms/1k | Notes |
| --- | --- | --- | --- | --- |
| synthetic (cap=300) | 0.9583 | 1.0000 | 791.06 | medium difficulty |
| real (cap=100) | 1.0000 | 1.0000 | 2324.43 | small real subset (10 queries) |

## Distillation Experiments (B3)
Distill #1 — Teacher reranker → Student embedder
- Teacher: cross-encoder/ms-marco-MiniLM-L-6-v2
- Student: all-MiniLM-L6-v2 (1 epoch, 300 pairs)
- Output: `models/lab/distill-teacher-student`
- Results: synthetic MRR@10 0.8708, real MRR@10 0.8185

Distill #2 — Filesystem topology supervision
- Positives: same-folder pairs; Negatives: different-folder pairs
- Student: all-MiniLM-L6-v2 (1 epoch, 300 pairs)
- Output: `models/lab/distill-topology-student`
- Results: synthetic MRR@10 0.7328, real MRR@10 0.8046

## Novelty Track
Implemented **adaptive fusion learning** (logistic regression over flash/pro/lexical/dir scores).
- Learned weights: (0.30, 0.24, 0.22, 0.24)
- Synthetic MRR@10: 0.9208 (better than flash-only baseline)

## Final Candidates (Draft)
### Ixos-Flash (default)
- Model: `potion-base-8m-int8` (Model2Vec, int8, 256-dim)
- Metrics (standard, cap=300, batch=32): synthetic MRR@10 0.8833, real MRR@10 0.9330, latency 24.57 ms/1k
- Intended routing: always-on baseline; use Pro only when ambiguity detected (gap < 0.05, lexical weakness, or very short queries)

### Ixos-Pro (optional)
- Model: `st-paraphrase-multilingual-minilm-l12-v2` (SentenceTransformers, 384-dim)
- Metrics (standard, cap=300, batch=32): synthetic MRR@10 0.9208, real MRR@10 0.9112, latency 1072.59 ms/1k
- Intended routing: triggered for ambiguity/high-risk queries only; cap to top-K candidates

### Reranker (optional top-K)
- Model: `cross-encoder/ms-marco-TinyBERT-L-2-v2`
- Metrics (cap=200, topK=50): synthetic MRR@10 0.9056, real MRR@10 0.9675, latency 749.54 ms/1k

## Model Cards (Draft)
### Ixos-Flash — potion-base-8m-int8
- Base: minishlab/potion-base-8M (Model2Vec)
- Format: Model2Vec static embedding, int8 quantized
- Dimensions: 256
- License: MIT
- Notes: fastest CPU-friendly candidate; strong real-corpus MRR with tiny footprint

### Ixos-Pro — st-paraphrase-multilingual-minilm-l12-v2
- Base: sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
- Format: SentenceTransformers
- Dimensions: 384
- License: Apache-2.0
- Notes: best ambiguous-suite performance among standard settings; multilingual support

### Reranker — cross-encoder/ms-marco-TinyBERT-L-2-v2
- Base: cross-encoder/ms-marco-TinyBERT-L-2-v2
- Format: SentenceTransformers CrossEncoder
- License: Apache-2.0
- Notes: best speed/quality tradeoff in reranker set

## Pre-mortem (Draft)
1) Folder structures are noisy → routing triggers Pro too often and slows search. Test: measure pro-trigger rate on 30k corpus with synthetic noise folders.
2) Ambiguous filenames (report_2023.txt) still misrouted → Pro not triggered. Test: ambiguity suite with gap/lexical thresholds; monitor wrong-branch rate.
3) Multilingual queries degrade Flash → false negatives. Test: Spanish/French query set against multilingual docs.
4) Reranker bottleneck on low-end CPUs → latency spikes. Test: run topK reranker on 1k candidates and measure p95 on 4-core CPU.
5) Distilled models regress on code-heavy corpora. Test: add code dataset subset and re-eval distill students vs base.

## Novelty Track
Pending (Phase B work).

## Audit Findings (Phase 0 - 2026-01-18)
- Aggregated leaderboard built from all results CSV/JSON: models/lab/leaderboard_aggregate.csv + models/lab/leaderboard_aggregate.json (includes backend, latency, memory, caps, batch, difficulty, and comparability flags + warnings).
- Logging gap: real-corpus query count/limit is not recorded in results, so cross-run comparability is ambiguous. Aggregate marks this as warning `real_size_unknown`.
- Several MRR@10=1.0 outcomes come from easy settings (synthetic small difficulty or tiny caps) and are not credible as proof of superiority. Aggregate flags these as non-comparable where settings differ.
- Potion best claim (current evidence): under medium synthetic cap=300/batch=32, potion MRR is ~0.883 while higher-quality models exist but are far slower; potion stays on the latency-quality Pareto front (22-24 ms/1k vs 200-12k ms/1k). On real cap=300/batch=32, the best observed MRR is 0.9358 (st-paraphrase-minilm-l6-v2) vs potion 0.933 with ~4x lower latency, but the runs are from different batches; this must be re-run with identical real query sets to confirm.
- Qwen distilled embedder is not present in manifest/results and has not been evaluated yet.
- Reproduced potion vs st-paraphrase-minilm-l6-v2 with identical settings and >=200 real queries: `results_audit_potion_vs_st.json` (cap=300, batch=32, difficulty=medium, real_limit=200, real_queries=200).
  - Real corpus MRR@10: st-paraphrase-minilm-l6-v2 0.8744 (682.97 ms/1k) vs potion-base-8m-int8 0.8381 (202.12 ms/1k) and potion-base-8m 0.8409 (174.72 ms/1k).
  - Synthetic medium MRR@10: potion-base-8m/int8 0.9611 vs st-paraphrase-minilm-l6-v2 0.7406 (same settings).
  - Conclusion: Potion is not the top quality model under fair real-corpus settings; it is the speed/quality Pareto option. The earlier "potion best" claim was confounded by mismatched runs.
- Verified Qwen-distilled (ixos-embedder-v1) under identical settings vs Potion: `results_audit_qwen_vs_potion.json` (cap=300, batch=32, real_limit=200, real_queries=200).
  - Real corpus MRR@10: ixos-embedder-v1 0.4351 (486.42 ms/1k) vs potion-base-8m-int8 0.8381 (206.0 ms/1k). Qwen-distilled is currently not competitive; needs distillation overhaul.
- External dataset download attempt (2026-01-18): `python scripts/download_external_datasets.py` failed due to outbound network restrictions (WinError 10013). No external datasets cached under datasets/external yet. Harness now supports external suites and will run once datasets are available.

---

## 2026-01-18 — Perfection Pass Addendum (Audit + Rebuild)

### Audit Findings (Updated)
- **Real-corpus eval credibility fixed**: `real_corpus_v2` now generates title, partial, typo, synonym, short (1–2 token), and intent-like queries (200 queries minimum).
- **External dataset downloads blocked**: HuggingFace + GitHub downloads fail with WinError 10013 (socket permissions). Re-attempted 2026-01-18 with the new downloader and manual `Invoke-WebRequest`; both blocked. External suites remain configured but skipped until outbound access is enabled.
- **Comparability clarified**: heavy transformer/ONNX models evaluated with smaller candidate caps due to CPU runtime constraints; aggregator flags non-comparable settings.

### External Benchmarks (Status)
Attempted datasets:
- `external_beir` (BeIR/scifact) – blocked (WinError 10013).
- `external_multilingual` (MIRACL + BEIR/fiqa fallback) – blocked (WinError 10013).

### Real Corpus v2 Leaderboards (cap=300, batch=64, 200 queries)
| Model | MRR@10 | Recall@10 | Lat ms/1k | Run |
| --- | --- | --- | --- | --- |
| st-paraphrase-minilm-l6-v2 | 0.782 | 0.885 | 653.33 | distill_lab_v2 |
| ixos-flash-v2 | 0.766 | 0.875 | 417.49 | distill_flash_v5 |
| st-stsb-roberta-base-v2 | 0.7637 | 0.89 | 1665.57 | sweep_real_v2_st1 |
| st-paraphrase-multilingual-minilm-l12-v2 | 0.7631 | 0.845 | 1031.6 | sweep_real_v2_g2a1 |
| st-paraphrase-minilm-l6-v2-nonorm | 0.7525 | 0.875 | 631.34 | sweep_real_v2_st3b |
| potion-base-8m | 0.7272 | 0.855 | 162.36 | sweep_real_v2_m2v |
| potion-base-8m-int8 | 0.727 | 0.855 | 192.09 | distill_flash_v4 |

Notes:
- `st-paraphrase-minilm-l6-v2` still tops accuracy but is slower and not Model2Vec-compatible.
- **Ixos-Flash-v2** now beats Potion on real_corpus_v2 with comparable caps.

### Heavy Transformer/ONNX Runs (Non-Comparable Caps)
Cap=30 (batch=16):
| Model | MRR@10 | Recall@10 | Lat ms/1k | Run |
| --- | --- | --- | --- | --- |
| e5-small-v2 | 0.7984 | 0.91 | 82097.74 | sweep_real_v2_e5small |
| gte-small-supabase | 0.7955 | 0.88 | 82810.14 | sweep_real_v2_gte1 |
| e5-small-v2-prompt | 0.7849 | 0.905 | 82702.27 | sweep_real_v2_e5smallp |
| bge-small-en-v1.5 | 0.7744 | 0.87 | 81619.03 | sweep_real_v2_bgesmall |

Cap=20 (batch=8):
| Model | MRR@10 | Recall@10 | Lat ms/1k | Run |
| --- | --- | --- | --- | --- |
| e5-base-v2 | 0.8342 | 0.915 | 230419.63 | sweep_real_v2_e5base |
| e5-base-v2-prompt | 0.8279 | 0.915 | 229911.9 | sweep_real_v2_e5basep |
| bge-base-en-v1.5-instruct | 0.8066 | 0.89 | 225267.17 | sweep_real_v2_bgebasei |
| bge-base-en-v1.5 | 0.7911 | 0.895 | 234014.45 | sweep_real_v2_bgebase |

Cap=10 (batch=8, ONNX):
| Model | MRR@10 | Recall@10 | Lat ms/1k | Run |
| --- | --- | --- | --- | --- |
| e5-small-v2-onnx-prompt | 0.8224 | 0.9 | 85202.5 | sweep_real_v2_onnx2 |
| e5-small-v2-onnx | 0.813 | 0.9 | 88077.87 | sweep_real_v2_onnx1 |

Interpretation:
- Transformer/ONNX models are strong but **too slow on CPU** for default Pro unless restricted to very small top‑K.

### Reranker Benchmarks (real_corpus_v2, cap=150, topK=30)
| Reranker | MRR@10 | Recall@10 | Lat ms/1k |
| --- | --- | --- | --- |
| cross-encoder/ms-marco-TinyBERT-L-2-v2 | 0.8562 | 0.9000 | 339.58 |
| cross-encoder/ms-marco-MiniLM-L-6-v2 | 0.8554 | 0.8950 | 675.72 |
| cross-encoder/ms-marco-MiniLM-L-12-v2 | 0.8562 | 0.8900 | 1050.82 |
| bge-reranker-base | 0.8508 | 0.8950 | 2350.01 |
| bge-reranker-large | 0.8708 | 0.8950 | 7230.57 |

Decision: **TinyBERT-L-2-v2** is the only CPU-friendly reranker worth shipping.

### Distillation (2026-01-18)
**Ixos-Flash-v2 (Model2Vec)**
- Teacher: `st-all-mpnet-base-v2`
- Dims/quant: 512 / float16
- Result (real_corpus_v2 cap=300): **MRR 0.766 vs Potion 0.727** (win)

**Ixos-Pro-v1 (Model2Vec)**
- Multiple teachers/dims attempted; **did not beat Flash** (MRR ~0.63–0.69).
- Kept for experimentation only; not default.

**Teacher → Student (Cross-Encoder Distill)**
| Model | MRR@10 | Recall@10 |
| --- | --- | --- |
| distill-teacher-student | 0.6909 | 0.785 |
| distill-topology-student | 0.6605 | 0.745 |

**Topology Supervision (Synthetic)**
| Model | MRR@10 | Recall@10 |
| --- | --- | --- |
| st-paraphrase-minilm-l6-v2 | 0.7406 | 1.0 |
| distill-topology-student | **0.8622** | 1.0 |

Interpretation: topology-supervised student **improves folder-sensitive retrieval** (synthetic suite).

### Novelty Track (3 prototypes)
1) **Learned query routing (LogReg)**
   - Flash: ixos-flash-v2, Pro: st-all-mpnet-base-v2
   - Test MRR@10: **0.7247** (cap=100, 200 queries)
   - Use as calibration baseline for Auto.

2) **Late-interaction approximation** (chunked top‑K)
   - MRR@10: 0.6331 (worse than baseline) → **killed**.

3) **Matryoshka / resizable embeddings**
   - 64d: 0.6064
   - 128d: 0.7143
   - 256d: 0.7653
   - 384d: 0.7801
   - Confirms dimension tradeoff; kept as optional performance knob.

### Fusion (Real v2)
**Learned fusion weights (Flash=Ixos-Flash-v2, Pro=Ixos-Flash-v2)**
| Weights (semantic, lexical, dir) | MRR@10 | Recall@10 | Lat ms/1k |
| --- | --- | --- | --- |
| (0.33, 0.67, 0.00) | **0.8831** | 0.92 | 1361.55 |

Decision: **Pro mode = Flash + lexical fusion** (no extra model load).

---

## Final Lineup (Shipping Defaults)

**Flash (default)**
`Ixos-Flash-v2` (Model2Vec, 512-dim float16, mpnet-teacher)
- Best Model2Vec accuracy on real_corpus_v2 with acceptable latency.
- Replaces Potion as default.

**Pro (policy)**
`Ixos-Pro` = Ixos-Flash-v2 + learned lexical/semantic fusion
- Uses weights (semantic 0.33 / lexical 0.67 / dir 0.0).
- Stronger ranking without new model dependencies.

**Reranker (optional)**
`cross-encoder/ms-marco-TinyBERT-L-2-v2`
- Best speed/quality tradeoff for CPU top‑K reranking.

**Auto Mode**
- Run Flash immediately.
- Trigger refinement when gap < 0.05 OR lexical max < 0.15 OR entropy > 0.9 OR query_len <= 2.
- If triggered: apply Pro fusion on top‑K (default 120).

---

## Product Integration (Rust + UI)
- Added **Search Mode dropdown** (Flash / Auto / Pro) and pro model selection in Settings.
- Auto refinement stage streams **Refining…** updates to UI.
- Evidence tags and semantic passages now render in result cards.
- Config defaults: Flash=ixos-flash-v2, Pro model = ixos-flash-v2, SearchMode=auto.

---

## Outstanding Constraints
- External datasets blocked by outbound network restrictions (WinError 10013).  
  Benchmarks will auto-run once network access is available (scripts are ready).
