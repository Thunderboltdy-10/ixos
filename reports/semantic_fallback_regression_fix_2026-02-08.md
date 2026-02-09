# Semantic Fallback Regression Fix (2026-02-08)

## Scope
Fix regression where Auto/Flash desktop searches could return empty results for semantic-only queries when lexical hits were zero.

## Root cause
- File: `src-tauri/src/commands/search.rs`
- Recent optimization skipped `semantic.index_directory(...)` for non-Ask Flash/Auto runs to improve startup latency.
- When lexical candidates were empty, progressive search fell back to `search_pure(...)`.
- `StubSemanticEngine::search_pure(...)` depends on indexed `files_to_search`; with no index, fallback returned empty.

## Code changes
1. Added lexical preflight before deciding eager semantic indexing:
   - Runs `lexical.search(&query, 1)` only in non-Ask, non-Pro modes.
   - If zero lexical hits, force semantic eager index.
2. Added explicit gate function for testability:
   - `should_eager_index_semantic(is_ask_mode, search_mode, lexical_probe_is_empty)`
3. Added unit tests for the gate logic.
4. Updated status message text to reflect context preparation (not always full indexing).

## Before vs after
| Scenario | Before | After |
|---|---|---|
| Flash/Auto + lexical hits > 0 | Skipped eager semantic index | Still skips eager semantic index |
| Flash/Auto + lexical hits = 0 | Skipped index, pure semantic fallback empty | Performs semantic index, pure semantic fallback has files |
| Ask mode | Eager index | Eager index (unchanged) |
| Pro mode | Eager index | Eager index (unchanged) |

## Validation commands
- `cargo fmt --all`
- `cargo test -p ixos-app eager_indexing_ -- --nocapture`

## Validation result
- PASS: 4/4 new tests in `src-tauri/src/commands/search.rs`.

## Manual validation (desktop)
1. Run app in dev mode: `npm run tauri:dev`
2. Set search mode to `Flash` (or `Auto`) and **disable Ask mode**.
3. Search a directory containing semantically related content with minimal lexical overlap.
4. Use a query likely to produce zero lexical hits (different wording/synonym phrasing).
5. Confirm results are still returned (not empty) and no panic appears in logs.
6. Repeat with a clearly lexical query and confirm startup remains responsive.

## Manual regression checks
1. Ask mode still works and returns results.
2. Pro mode still runs with Pro entitlement and returns results.
3. Free user selecting Auto is still backend-downgraded to Flash path.
