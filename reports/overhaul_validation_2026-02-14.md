# Overhaul Validation Report (2026-02-14)

## Commands
- `cargo test -q`
- `cargo test --test settings_matrix -q`
- `python scripts/run_settings_matrix.py`
- `npm --prefix ui run build`
- `npm --prefix ixos-site run build`
- `cargo build --release`
- `target/release/ixos.exe search "test" --dir . --stub-model --format json --limit 1`
- `target/release/ixos.exe search "test" --deep-search --dir . --stub-model --format json --limit 1`
- Memory mode no-write check:
  - `target/release/ixos.exe cache clear --dir corpus_tiny --force`
  - `target/release/ixos.exe cache stats --dir corpus_tiny --json` (before/mid/after)
  - `target/release/ixos.exe search "project plan" --dir corpus_tiny --stub-model --cache-mode memory --format json --limit 1` (x2)
- Ask auto check:
  - `target/release/ixos.exe search "what is the main config?" --dir . --stub-model --progressive --format json --limit 1`
- Big bench warm/walk fix check:
  - `target/release/ixos-big-bench.exe --dir corpus_tiny --queries-file reports/tmp_bench_queries.json --runs 2 --cache-mode ephemeral --model ixos-flash-v2 --output-dir reports`

## Results
- Rust tests:
  - PASS (`467 passed; 0 failed; 6 ignored`)
- Settings matrix integration test:
  - PASS (`1 passed; 0 failed`)
- Settings matrix live script:
  - PASS (`reports/settings_matrix_2026-02-14.md`)
- UI build:
  - PASS (Vite build completed; non-blocking chunk warnings only)
- Site build:
  - PASS (Next build completed; non-blocking multi-lockfile workspace warning only)
- Release build:
  - PASS
- CLI smoke:
  - PASS for standard and deep-search paths
- Memory mode cache behavior:
  - `cached_files` stayed `0` before/mid/after repeated memory-mode searches
- Ask mode auto:
  - progressive output included status: `Ask Mode active: understanding your question...`
- `ixos-big-bench` correctness:
  - first record `warm=false`, subsequent records warm as expected
  - `walk_ms` populated on every record (`reports/big_bench_20260214_131205.json`)

## Before/after spot table
| Area | Before | After | Evidence |
|---|---|---|---|
| Big bench warm marking | Warm was run-based (`run_idx > 0`) and mislabeled query 2+ in run 1 | Warm uses `query_idx > 0 || run_idx > 0` | `src/bin/ixos-big-bench.rs`, `reports/big_bench_20260214_131205.json` |
| Big bench walk timing | `walk_ms` was only set on first record in earlier behavior | `walk_ms` captured from candidate stats per record | `src/bin/ixos-big-bench.rs`, `reports/big_bench_20260214_131205.json` |
| Ask mode activation (desktop/CLI parity) | UI-side regex/toggle behavior drift risk | Backend auto intent path; progressive status confirms activation | `ui/src/stores/searchStore.ts`, `src/ixos_rank/ask_mode/intent_detector.rs` |
| Memory mode persistence semantics | Risk of residual reuse across searches | Cache stats stayed at zero over repeated memory searches | command block above + recorded outputs |

## Notes
- `ixos-big-bench` still accepts `native-cache|ephemeral` values at CLI enum level; user-facing docs/UI now use `Local|Memory`.
- Remote GitHub Actions execution was not run from this environment; workflow changes were applied and local build parity checks passed.
