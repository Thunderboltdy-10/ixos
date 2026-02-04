# V2_FINAL_WRITEUP.md

Date: 2026-02-03

## What Changed

### Models
- **Flash v2** promoted as the production default (int8, 512d).
- **Pro v2** defined as a cascade/fusion system (Flash v2 + Potion int8 + lexical).
- **Legacy models** (Flash v1, Pro v1) remain for regression only and are hidden from UI/CLI.

### Pipeline
- Ranking speedup via top-K partial selection (avoids full sort).
- Pro v2 cascade: Potion fast pass → Flash v2 refine on top-K/uncertain region → fusion.
- Ask Mode respects selected model (no forced Pro).
- Parsing expanded and validated (PDF/DOCX/PPTX/XLSX/RTF/TXT/MD), with byte caps.
- Scale bench tooling added for real-world corpora.

### Naming + UX
- Canonical IDs: `ixos-flash-v1`, `ixos-flash-v2`, `ixos-pro-v1`, `ixos-pro-v2`, `potion-base-8m-int8`.
- UI/CLI now expose **Flash v2 / Pro v2 / Auto** only.

---

## Why It’s Faster
- Flash v2 uses int8 embeddings (smaller, faster dot products).
- Ranking top-K reduces full-sort overhead on large candidate sets.
- Cached file list reuse reduces ripgrep scan and directory walk overhead on repeated queries.
- Pro v2 cascade avoids Flash re-embedding on the full candidate set.

---

## Why It’s More Accurate
- Pro v2 fuses Flash + Potion + lexical signals with learned weights.
- Auto routing triggers Pro refinement only when queries are ambiguous.
- Parsing improvements expand searchable content for PDFs/DOCX/etc.

---

## Benchmarks (Summary)

Canonical results: `models/lab/CANONICAL_RESULTS.md`

- **Flash v2 (real_corpus_v2):** MRR@10 0.8340, Recall@10 0.925, 339.76 ms/1k
- **Pro v2 fusion (real_corpus_v2):** MRR@10 0.9209, Recall@10 0.97, 430.57 ms/1k
- **Scale bench (Auto, 50 queries):** TTFR p50/p95 87/371 ms, Total p50/p95 1065/6520 ms

Full details: `reports/model_v2_benchmark_report.md`, `reports/PERF_BOTTLENECKS.md`, `reports/SCALE_BENCH.md`.

---

## How to Reproduce

```bash
# Build release
cargo build --release

# Flash v2 canonical
python scripts/ixos_eval.py --suite both \
  --only-ids ixos-flash-v2 \
  --output models/lab/results_flash_v2_2026-02-03.json \
  --csv models/lab/results_flash_v2_2026-02-03.csv

# Pro v2 fusion (Flash v2 + Potion)
python scripts/ixos_eval.py --suite both \
  --only-ids ixos-flash-v2,potion-base-8m-int8 \
  --fusion learned \
  --flash-id ixos-flash-v2 \
  --pro-id potion-base-8m-int8 \
  --output models/lab/results_v2_fusion_flashv2_2026-02-03.json

# Perf profiles
cargo run --release --bin ixos-profile -- --dir dataset --runs 6 --cache-mode jit --model ixos-flash-v2 --out reports/profile_flashv2_2026-02-03.json
cargo run --release --bin ixos-profile -- --dir dataset --runs 6 --cache-mode jit --model potion --out reports/profile_potion_2026-02-03.json

# Scale bench (auto-discover)
python scripts/scale_bench.py --search-mode auto --cache-mode jit --model ixos-flash-v2 --pro-model ixos-pro-v2 --max-queries 50
```

---

## How to Ship

1) **Model folders**
   - Ensure `models/ixos-flash-v2` exists with `config.json`, `model.safetensors`, `tokenizer.json`, `modules.json`.
   - Ensure `models/potion-base-8M-int8` exists for Pro v2.

2) **Defaults**
   - Config defaults: Flash v2, Pro v2, Auto mode.

3) **UI/CLI**
   - UI exposes Flash v2 / Pro v2 / Auto.
   - CLI defaults to Flash v2; `--pro-model ixos-pro-v2` for Pro.

4) **Installer / Downloads**
   - `download_model("ixos-pro-v2")` must pull Flash v2 + Potion.

---

## HF Upload

See `reports/HF_UPLOAD_PLAYBOOK.md` for exact repos, files, and tags.

---

## Migration Plan

- **Normalize configs** to `ixos-flash-v2` / `ixos-pro-v2` on load.
- **Hide legacy models** (`ixos-pro-v1`) from UI/CLI.
- Keep `ixos-flash-v1` / `ixos-pro-v1` only for regression testing.
- Distribute Flash v2 + Potion together for Pro v2 installs.

---

## Open Items

- Optional: re-run Pro v2 fusion on a dedicated machine for cross-hardware validation.
- Optional multilingual slice evaluation (ES/FR/DE) for routing validation.
