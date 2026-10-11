# CLI Reliability Quickcheck

Use this checklist after pulling latest changes.

## 1) Dead flags removed from help
- `ixos index --help`
  - Confirm `--watch` is NOT listed.
- `ixos daemon --help`
  - Confirm only `--foreground` is listed.

## 2) Cache mode persistence
1. `ixos cache mode persistent`
2. `ixos config --get search.cache_mode`
   - Expected: `cache`
3. `ixos cache mode ephemeral`
4. `ixos config --get search.cache_mode`
   - Expected: `jit`

## 3) Index clear behavior
- `ixos index <your-dir> --clear --progress --use-xattr`
- Expected:
  - A line showing cleared cache entries.
  - Indexing continues and reports indexed file count.

## 4) Cache rebuild behavior
- `ixos cache rebuild <your-dir> --force --workers 2`
- Expected:
  - `Indexed files discovered: <n>`
  - `Embeddings rebuilt: <n or near n>`
  - `Elapsed: ...`

## 5) Semantic fallback correctness (desktop)
- Start desktop app and use Flash or Auto (Ask off).
- Run a query with low lexical overlap.
- Expected: semantic fallback still returns results (not empty).

See: `reports/semantic_fallback_regression_fix_2026-02-08.md` and `reports/phase0_cli_reliability_patch_2026-02-08.md`.
