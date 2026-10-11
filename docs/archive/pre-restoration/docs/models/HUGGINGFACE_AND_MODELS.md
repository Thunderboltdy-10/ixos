# HUGGING FACE AND MODEL OPERATIONS

## CANONICAL IDS

- `ixos-flash-v1` (legacy baseline)
- `ixos-flash-v2` (new Flash generation)
- `ixos-pro-v1` (legacy Pro baseline)
- `ixos-pro-v2` (new true Pro definition)
- `potion-base-8m-int8` (internal dependency)

## STORAGE LAYOUT

- Local artifacts: `models/`
- Lab outputs: `models/lab/`
- Canonical results tracker: `models/lab/CANONICAL_RESULTS.md`

## DOWNLOAD + INSTALL PATHS

- Desktop in-app download/install actions
- Utility scripts under `scripts/`
- Tauri command support in `src-tauri/src/commands/system.rs`

## HF PUBLISHING

Use these references:

- `reports/HF_UPLOAD_PLAYBOOK.md`
- `scripts/README.md`
- `reports/MODEL_NAMING_MIGRATION.md`

## QUALITY + PERFORMANCE EVIDENCE

For every model claim, capture:

- exact command(s)
- output artifact path
- before/after comparison table

Primary references:

- `reports/V2_FINAL_WRITEUP.md`
- `reports/model_v2_benchmark_report.md`
- `docs/engineering/BENCHMARKING.md`

