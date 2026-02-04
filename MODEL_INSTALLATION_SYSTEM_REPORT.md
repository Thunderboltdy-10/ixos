# Tauri App Model Installation System Report

**Date:** 2026-02-03  
**Scope:** Ixos Desktop model download, storage, and status reporting (updated for Flash v2 + Pro v2).

---

## 1) Model Download & Installation (Tauri)

### Entry Point: `download_model`
**File:** `src-tauri/src/commands/system.rs`

The Tauri backend exposes a `download_model` command that:
- Accepts a model type string
- Maps model types to Hugging Face repositories and file lists
- Downloads model files into the app data directory
- Emits progress events to the UI

### Current Model Mapping

| Model type | Subdir | HF repo | Files |
| --- | --- | --- | --- |
| `ixos-flash-v2` | `ixos-flash-v2` | `Thunderboltdy10/Ixos-Flash-v2` | `config.json`, `model.safetensors`, `tokenizer.json` |
| `ixos-flash-v1` (legacy) | `ixos-flash-v1` | `Thunderboltdy10/Ixos-Flash` | `config.json`, `model.safetensors`, `tokenizer.json` |
| `ixos-pro-v1` (legacy) | `ixos-pro-v1` | `Thunderboltdy10/Ixos-Pro` | `config.json`, `model.safetensors`, `tokenizer.json` |
| `potion` | `potion-base-8M-int8` | `minishlab/potion-base-8M` | `config.json`, `model.safetensors`, `tokenizer.json` |

**Pro v2 is composite.** Calling `download_model("ixos-pro-v2")` triggers a download of **Flash v2 + Potion** (internal dependency), then returns success.

---

## 2) Model Storage Locations (Search Order)

Models are searched in this priority order (see `src/ixos_embed/mmap_model.rs`):
1. `{exe_dir}/models/...`
2. `{exe_dir}/resources/models/...`
3. Parent directories of the executable (dev builds)
4. App data directory
   - Windows: `%APPDATA%/Ixos/models/{model_id}`
   - macOS/Linux: `~/.local/share/ixos/models/{model_id}`
5. CWD (`models/...`)
6. Workspace root (dev)

---

## 3) Model Status Reporting

`get_model_status` returns a `ModelStatus` struct with **v2 fields** and legacy fields:
- `ixos_flash_v2_available`, `ixos_flash_v2_path`
- `ixos_pro_v2_available`, `ixos_pro_v2_path` *(computed from flash v2 + potion)*
- `ixos_flash_v1_available`, `ixos_flash_v1_path` (legacy)
- `ixos_pro_v1_available`, `ixos_pro_v1_path` (legacy)
- `recommended` chooses flash v2 when available
- `loaded_model` maps `potion` → `ixos-pro-v2` for user display

---

## 4) CLI / UI Defaults and Mapping

- **Desktop UI default:** Flash v2 for Fast/Auto modes, Pro v2 for Pro mode.
- **CLI default:** Flash v2; Pro v2 is selectable via `--pro-model ixos-pro-v2`.
- **Legacy models** (ixos-pro-v1) are no longer exposed as selectable modes.

---

## 5) Authentication for Preload

The `preload_model` command requires a valid entitlement token and:
- For `ixos-pro-v2`, preloads **Flash v2 + Potion**.
- For other models, loads a single embedder.

---

## 6) Verification / Integrity

- Model presence is verified by checking for `model.safetensors` (or `embeddings.safetensors`).
- No checksum validation is performed post-download (future hardening recommended).

---

## 7) Notes / Recommendations

- Treat `ixos-pro-v2` as a **system**, not a single model artifact.
- Keep `potion` internal; UI/CLI should expose `ixos-pro-v2` only.
- For offline bundles, include both `models/ixos-flash-v2` and `models/potion-base-8M-int8`.
