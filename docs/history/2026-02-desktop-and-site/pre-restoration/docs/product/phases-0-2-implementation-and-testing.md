# PHASES 0-2 IMPLEMENTATION AND TESTING GUIDE

This document summarizes the production implementation pass for Phases 0, 1, and 2, and gives a concrete manual test checklist.

## What Was Implemented

### Phase 0 - Reliability Lockdown

- Removed dead CLI exposure for `index --watch`.
- Hid unsupported daemon IPC controls (`daemon --status`, `daemon --stop`) from help.
- Implemented `cache rebuild` with real model embeddings.
- Implemented cache-mode persistence to config (`cache mode ephemeral|persistent`).
- Implemented index clear path (`index <dir> --clear`) to remove embedding cache entries.
- Implemented real background indexer work loop in `src/ixos_embed/background_indexer.rs`.
- Added `ixos doctor` CLI command with structured checks and `--json`.
- Added desktop Diagnostics tab with `Run Doctor` and `Copy Report`.
- Added settings matrix automation script and CI workflow:
  - `scripts/run_settings_matrix.py`
  - `.github/workflows/settings-matrix.yml`

### Phase 1 - Pro Memory Lite

- Added personal ranking signal storage (`ADS`/`xattr` + fallback store):
  - `src/storage/personal_ranking.rs`
- Added decay/update ranking logic:
  - `src/ixos_rank/personal_ranker.rs`
- Integrated personal boost into secure ranking with journalist guard:
  - `src/ixos_rank/secure_ranker.rs`
- Added Tauri personal-ranking commands (pin/ignore/not-relevant/reset/get signals).
- Added result-card actions in UI (Pin, Ignore, Not Relevant).
- Added Pro-gated explain panel (`Why this result` support path).
- Added settings toggle for personal ranking and reset-learning action.
- Added open-file learning update on desktop open action (when enabled and not journalist mode).

### Phase 2 - Pro Second Brain

- Replaced activity ledger persistence stubs with encrypted on-disk persistence:
  - `activity_ledger_v1.enc`
- Added bounded serialized storage enforcement (5MB cap) with pruning.
- Added periodic autosave and close-time save for activity ledger.
- Encrypted workstream persistence (`workstreams_v1.enc`).
- Added emergency clear coverage for new encrypted files.
- Fixed workstream persistence reliability:
  - all mutation paths now persist
  - autosave on interval and close
  - unified storage location to app config directory

## Cache Correctness (Edited Files + Model Changes)

Ixos cache entries are now validated by both:

- file content hash
- model fingerprint

This means:

1. If a file is edited, the file hash changes and cached embedding is treated as stale and recomputed.
2. If the user changes model (for example Flash to Pro-family model path), model fingerprint mismatch invalidates cache hits, and embeddings are recomputed under the active model.

Implemented in:

- `src/storage/mod.rs`
- `src/storage/ads_windows.rs`
- `src/storage/xattr_unix.rs`
- `src/storage/sidecar_lmdb.rs`
- `src/ixos_rank/semantic_engine.rs`

## Auto/Flash Semantic Fallback Regression Fix

Desktop search now does lexical preflight for non-Ask/non-Pro paths. If lexical hits are empty, semantic indexing is eagerly prepared before pure-semantic fallback executes, preventing false "no results" on semantic-only queries.

Implemented in:

- `src-tauri/src/commands/search.rs`

## Manual Testing Checklist

Run from repository root.

1. CLI help sanity
   - `cargo run --bin ixos -- --help`
   - `cargo run --bin ixos -- index --help`
   - Confirm no `--watch` on index help.
2. Daemon help sanity
   - `cargo run --bin ixos -- daemon --help`
   - Confirm only foreground daemon flag is exposed.
3. Cache rebuild
   - `cargo run --bin ixos -- cache rebuild corpus_tiny --force`
   - Expect non-zero `Indexed files discovered` and `Embeddings rebuilt`.
4. Cache mode persistence
   - `cargo run --bin ixos -- cache mode persistent`
   - `cargo run --bin ixos -- config --get search.cache_mode`
   - Expect `cache`.
4b. JIT vs Cache truthfulness (quick proof)
   - `cargo run --bin ixos -- cache clear --dir corpus_tiny --force`
   - `cargo run --bin ixos -- cache mode ephemeral`
   - `cargo run --bin ixos -- search "quarterly report" --dir corpus_tiny --limit 5`
   - `cargo run --bin ixos -- cache stats --dir corpus_tiny --json`
   - Expect `cached_files` to stay `0` in JIT mode.
   - `cargo run --bin ixos -- cache clear --dir corpus_tiny --force`
   - `cargo run --bin ixos -- cache mode persistent`
   - `cargo run --bin ixos -- search "quarterly report" --dir corpus_tiny --limit 5`
   - `cargo run --bin ixos -- cache stats --dir corpus_tiny --json`
   - Expect `cached_files` to increase (for example `5` on corpus_tiny).
5. Index clear behavior
   - `cargo run --bin ixos -- index corpus_tiny --clear`
   - Expect output showing cleared cached embeddings before re-index.
6. Cache stats JSON
   - `cargo run --bin ixos -- cache stats --dir corpus_tiny --json`
   - Confirm valid JSON output.
7. Doctor CLI
   - `cargo run --bin ixos -- doctor --json | python -m json.tool`
   - Confirm parsable JSON and zero `fail` checks.
8. Settings matrix
   - `python scripts/run_settings_matrix.py`
   - Confirm PASS and generated report under `reports/`.
9. Desktop diagnostics
   - Start app (`npm run tauri:dev`).
   - Open Settings -> Diagnostics.
   - Click `Run Doctor`, verify checks render.
   - Click `Copy Report`, verify clipboard contains JSON report.
10. Personal ranking actions
    - Run a search in desktop app.
    - Pin a result, rerun related search, verify boost.
    - Ignore a result, rerun related search, verify demotion.
    - Use Reset Learning in Search Settings and verify behavior resets.
11. Today/workstreams persistence
    - Generate activity via search/open/reveal.
    - Recluster workstreams.
    - Restart app.
    - Verify Today and Workstreams data persists.
12. Journalist mode guard
    - Enable journalist mode.
    - Repeat searches/open actions.
    - Verify no persistent activity/cache growth.

## Automated Validation Commands Run In This Pass

- `cargo test`
- `cargo test -p ixos-app`
- `cargo clippy --all-targets`
- `cargo build --release`
- `npm --prefix ui run build`
- `npm --prefix ixos-site run build`
- `python scripts/run_golden.py`
- `python scripts/run_contract.py`
- `python scripts/run_settings_matrix.py`
- `cargo run --quiet --bin ixos -- doctor --json`
- `npm run tauri:build` (with required env vars set)
