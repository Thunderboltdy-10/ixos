# Phase 0.1 CLI Reliability Patch (2026-02-08)

## Scope completed in this pass
- Removed dead `index --watch` CLI flag.
- Hid daemon `--status` and `--stop` flags from help (IPC handlers not wired).
- Implemented real cache mode persistence in `ixos cache mode`.
- Implemented `index --clear` cache clearing behavior.
- Implemented working `cache rebuild` flow that indexes files and precomputes embeddings.
- Added semantic engine helper to precompute embeddings for rebuild.

## Files changed
- `src/cli/commands.rs`
- `src/main.rs`
- `src/ixos_rank/semantic_engine.rs`

## Key behavior changes
1. `ixos index --help` no longer advertises `--watch`.
2. `ixos daemon --help` no longer advertises `--status` / `--stop`.
3. `ixos cache mode persistent|ephemeral` now writes to `search.cache_mode` in config.
4. `ixos index <dir> --clear` now removes embedding cache entries before indexing.
5. `ixos cache rebuild <dir> --force` now loads model, indexes directory, and warms cache.

## Validation commands
- `cargo fmt --all`
- `cargo test -p ixos-protocol`
- `cargo test -p ixos-app`
- `cargo run --bin ixos -- index --help`
- `cargo run --bin ixos -- daemon --help`
- `target/debug/ixos.exe cache mode persistent`
- `target/debug/ixos.exe config --get search.cache_mode`
- `target/debug/ixos.exe cache mode ephemeral`
- `target/debug/ixos.exe index dataset/synthetic_ambiguity --clear --progress --use-xattr`
- `cargo run --bin ixos -- cache rebuild dataset/synthetic_ambiguity --force --workers 2`

## Observed results
- `cargo test -p ixos-protocol`: PASS (`455 passed; 0 failed; 6 ignored`)
- `cargo test -p ixos-app`: PASS (`21 passed; 0 failed`)
- `ixos index --help`: `--watch` not present
- `ixos daemon --help`: only `--foreground` shown
- cache mode persistence check:
  - before: `jit`
  - after `persistent`: `cache`
  - after `ephemeral`: `jit`
- `index --clear` sample run: cleared 36 cached embeddings, then indexed 34 files.
- `cache rebuild` sample run (`dataset/synthetic_ambiguity`):
  - indexed files discovered: 34
  - embeddings rebuilt: 34
  - elapsed: ~470ms

## Notes
- Rebuild now runs inside the existing async runtime (no nested Tokio runtime panic).
- `workers` is currently an input used for UX/reporting; precompute is sequential in this pass.
