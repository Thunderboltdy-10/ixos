# `.env` Skip List Fix (2026-02-05)

## Problem
The hardcoded skip list in `path_engine` was used as an entry-name filter across path indexing, ripgrep walking, and document walking. Including `.env` in this list could exclude `.env` files entirely from search traversal.

## Change
- Removed `.env` from `HARDCODED_SKIP_DIRS` in `src/ixos_rank/candidate_generator/path_engine.rs`.
- Added regression test:
  - `test_hardcoded_skip_dirs_does_not_exclude_dot_env_file_name`

## Validation Commands
```powershell
cargo fmt --all
cargo test path_engine::tests::test_hardcoded_skip_dirs_does_not_exclude_dot_env_file_name -- --nocapture
```

## Validation Result
- Test passed: `1 passed, 0 failed`
