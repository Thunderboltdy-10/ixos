# REALITY_MAP.md - Ixos Flash v2 + Pro v2

## Purpose
Document the current production defaults, what "Pro" actually does today, and where naming is inconsistent.

## Status
- Date: 2026-02-03
- State: Post-v2 integration (Flash v2 + Pro v2 wired in UI/CLI/Tauri)

## Current Production Defaults (code)
- Desktop (Tauri): `search.modelType = "ixos-flash-v2"`, `search.proModelType = "ixos-pro-v2"`, `search.searchMode = "auto"`.
- Desktop routing: Auto/Pro uses Pro v2 cascade (Potion fast pass + Flash v2 refinement + lexical fusion) when Pro refinement triggers.
- CLI: default model = `ixos-flash-v2`; Pro engine wired via `--pro-model ixos-pro-v2` and `--search-mode auto|pro`.

## What "Pro" Does Today (actual behavior)
- Pro v2 is a **fusion system**: Potion fast pass → Flash v2 refine (top-K/uncertain) → fusion with lexical scores.
- Potion is an internal dependency, not a user-selectable model.
- Legacy ixos-pro-v1 remains on disk for regression tests only and is hidden from UI/CLI.

## Naming & UX Consistency (post-fix)
- `ixos-flash-v1`: legacy baseline, not default
- `ixos-flash-v2`: current Flash default
- `ixos-pro-v1`: legacy embedder, hidden
- `ixos-pro-v2`: Pro fusion/cascade system
- `potion-base-8m-int8`: internal dependency only

## Open Notes
- Update canonical results + changelogs after new v2 eval runs.
- Ensure HF upload playbook reflects Flash v2 + Pro v2 bundle.
