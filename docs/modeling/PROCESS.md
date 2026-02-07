# Modeling Process

This document describes the end-to-end model pipeline and the reproducible workflow used in the Ixos model lab.

## Pipeline overview
1. Query preprocessing
   - Normalize, fix typos, and extract query terms.
2. Lexical funnel (fast)
   - Ripgrep-style scan produces candidate file list.
   - Top-K lexical matches stream immediately.
3. Flash semantic rerank
   - Flash embedder reranks lexical candidates.
4. Auto routing (optional)
   - If ambiguity is detected (gap/entropy/lexical thresholds), trigger Pro refinement.
5. Pro refinement + fusion
   - Pro embedder reranks top-K candidates.
   - Fusion blends flash similarity, pro similarity, lexical match ratio, and directory prior.
6. Secure ranking + evidence
   - Secure ranker finalizes order.
   - Evidence snippets extracted for top results.

## Key configs and flags
- `SearchMode`: flash | auto | pro
- `FusionConfig`: flash/pro/lexical/dir weights (default learned for flash+potion)
- `AutoModeConfig`: `gap_threshold`, `lexical_threshold`, `entropy_threshold`, `pro_top_k`

## Evaluation workflow
Run the suite using the existing harness:

```
python scripts/ixos_eval.py --suite both
```

For CPU-only machines, use a subset of models:

```
python scripts/ixos_eval.py --suite both --only-ids ixos-flash-v2,potion-base-8m-int8
```

Outputs:
- JSON: `models/lab/results_<exp_id>.json`
- CSV:  `models/lab/results_<exp_id>.csv`
- Aggregated: `python scripts/aggregate_lab_results.py`

## Distillation workflow (Model2Vec)
Distill new flash/pro variants locally:

```
python scripts/distill_model2vec_lab.py --mode flash --flash-id ixos-flash-v4-int8-512 --flash-dims 512 --flash-quantize int8
python scripts/distill_model2vec_lab.py --mode flash --flash-id ixos-flash-v4-int8-192 --flash-dims 192 --flash-quantize int8
```

Artifacts are written to `models/lab/<id>`. Copy to `models/<id>` to promote for runtime use.

## Fusion weight learning
Use the eval harness to learn fusion weights from precomputed scores:

```
python scripts/ixos_eval.py --suite both --flash-id ixos-flash-v2 --pro-id potion-base-8m-int8 --fusion learned
```

The learned weights are stored in `models/lab/results_*` and should be applied in `ProgressiveSearchConfig`.

## Adding a new model safely
1. Distill or download model into `models/lab/<id>`.
2. Add entry to `models/lab/manifest.json` (license, source, backend).
3. Run `scripts/ixos_eval.py` on both suites.
4. Update `models/lab/LEADERBOARD.md` and `models/lab/EXPERIMENT_LOG.md`.
5. If promoted:
   - Add a `ModelType` variant in `src/ixos_embed/mmap_model.rs`.
   - Update UI types and model selectors.
   - Copy weights to `models/<id>`.
   - Create a model card in `docs/models/`.

## Folder layout
- `models/lab/<exp_id>/` - experiment artifacts
- `models/lab/LEADERBOARD.md` - sortable metrics table
- `models/lab/EXPERIMENT_LOG.md` - narrative log + summary table
- `models/lab/CANONICAL_RESULTS.md` - **authoritative benchmark source**
- `docs/models/` - model cards

## Benchmark validity

### Dataset versions
- **synthetic_ambiguity_v1**: 7 folders with overlapping filenames, regenerated per difficulty level (small/medium/large)
- **real_corpus_v2**: 200 files sampled from `dataset/` using seed 1337, 200 queries derived from file titles

### Reproducibility
- **Seed**: 1337 (fixed for deterministic sampling and query generation)
- **MRR/Recall**: Deterministic given same seed, corpus, and model
- **Latency**: Varies ±10-15% due to system load, CPU throttling; report mean±stdev from 3+ runs

### Metric definitions
- **MRR@10**: Mean Reciprocal Rank at top-10. If relevant doc at rank r (1-10), score = 1/r; else 0.
- **Recall@10**: Fraction of queries where relevant doc appears in top-10.
- **Latency ms/1k**: Milliseconds to embed 1000 candidates (embedding time only, not end-to-end)
- **Load time**: Time to load model weights from disk into memory
- **Memory delta**: RSS increase during model load

### End-to-end latency (ixos-bench)
For full pipeline timing (directory walk + ripgrep + embedding + ranking), use:
```bash
cargo run --bin ixos-bench -- --dir dataset --runs 5 --cache-mode jit --model ixos-flash-v2
```

### Canonical source
All documents (`docs/archive/root/MODELS_REPORT.md`, TIERS.md, model cards) should reference `models/lab/CANONICAL_RESULTS.md` for metrics. If numbers disagree, the canonical file is authoritative.
