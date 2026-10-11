# Search Mode Fallbacks (Desktop)

This document explains how desktop search decides when to pre-index semantic files before running progressive search.

## Goal
Keep Flash/Auto searches responsive while still returning semantic results when lexical hits are zero.

## Current behavior
- Ask mode: semantic eager indexing is enabled.
- Pro mode: semantic eager indexing is enabled.
- Flash/Auto non-Ask:
  - Run lexical preflight (`limit=1`).
  - If lexical preflight has hits: skip semantic eager indexing (fast path).
  - If lexical preflight has zero hits: run semantic eager indexing (fallback-correctness path).

## Why this exists
Pure-semantic fallback uses indexed file paths. If semantic indexing is skipped and lexical results are empty, fallback can return zero results even when relevant files exist.

## Code location
- Decision + preflight logic: `src-tauri/src/commands/search.rs`
- Progressive pure-semantic fallback path: `src/ixos_rank/progressive.rs`
- Semantic engine indexed file dependency: `src/ixos_rank/semantic_engine.rs`

## Regression tests
- `cargo test -p ixos-app eager_indexing_ -- --nocapture`

## Manual check
1. `npm run tauri:dev`
2. In desktop app, set mode to `Flash` or `Auto` and keep Ask mode off.
3. Run a query with likely zero lexical overlap but meaningful semantic intent.
4. Confirm results are returned (not empty).
5. Run a clearly lexical query and verify search still feels immediate.
