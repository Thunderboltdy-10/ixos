# Phase 0-2 Validation Report (2026-02-08)

## Scope

Validation of the production implementation pass covering:

- Phase 0 reliability + diagnostics + settings matrix
- Phase 1 personal ranking
- Phase 2 encrypted second-brain persistence
- Cache correctness for file edits and model switches

## Commands Executed

- `cargo check`
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
- `cargo run --quiet --bin ixos -- doctor --json | python -m json.tool`
- `cargo run --quiet --bin ixos -- --help`
- `cargo run --quiet --bin ixos -- index --help`
- `cargo run --quiet --bin ixos -- daemon --help`
- `cargo run --quiet --bin ixos -- cache rebuild corpus_tiny --force`
- `cargo run --quiet --bin ixos -- cache mode persistent`
- `cargo run --quiet --bin ixos -- config --get search.cache_mode`
- `cargo run --quiet --bin ixos -- index corpus_tiny --clear`
- `cargo run --quiet --bin ixos -- cache clear --dir corpus_tiny --force`
- `cargo run --quiet --bin ixos -- cache stats --dir corpus_tiny --json`
- `npm run tauri:build` (with required env vars present)

## Results

- Rust core tests: PASS (`463 passed, 0 failed, 6 ignored`).
- Tauri tests: PASS (`21 passed, 0 failed`).
- Doctor: PASS (`8 pass, 0 warn, 0 fail, 2 info`).
- Settings matrix: PASS (all 11 combos).
- Golden tests: PASS.
- Contract tests: PASS.
- Rust release build: PASS.
- UI build: PASS (chunk size warnings only).
- Landing build: PASS.
- Desktop packaging: PASS (MSI + NSIS outputs produced).

## Key Behavioral Verifications

- `index --watch` no longer exposed.
- `daemon --status/--stop` hidden from help.
- `cache rebuild` performs real embedding warmup.
- `cache mode` persists to config and now honors `--config` path overrides.
- `index --clear` removes cached embeddings before re-index.
- `cache stats --json` emits parseable JSON payload.
- Flash/Auto semantic fallback no longer returns empty due missing semantic index when lexical preflight is empty.
- Cache entries now invalidate on both file edits and model switches (file hash + model fingerprint).
- Golden harness now runs deterministic Flash/JIT mode for baseline ranking assertions.

## Addendum - Cache Truthfulness Verification (2026-02-08, late pass)

- CLI search now honors persisted cache mode unless `--cache-mode` is explicitly passed.
- CLI cache clear now clears both per-file metadata cache entries and LMDB sidecar fallback entries.
- CLI cache stats now reports model-matching entries and mixed-fingerprint blobs for cache-write truthfulness checks.
- Direct repro on `corpus_tiny`:
  - JIT path (`cache mode ephemeral` + search): `cached_files = 0`
  - Persistent path (`cache mode persistent` + search): `cached_files = 5`
- `python scripts/run_settings_matrix.py` rerun after this fix: PASS (all 11 combos).

## Artifacts

- `reports/settings_matrix_2026-02-08.md`
- `docs/product/PHASES_0_2_IMPLEMENTATION_AND_TESTING.md`
- `target/release/bundle/msi/Ixos_0.1.0_x64_en-US.msi`
- `target/release/bundle/nsis/Ixos_0.1.0_x64-setup.exe`
