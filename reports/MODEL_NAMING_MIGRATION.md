# MODEL_NAMING_MIGRATION.md

Date: 2026-02-03

## Canonical IDs (post-v2)
- `ixos-flash-v1` : legacy Flash baseline (deprecated)
- `ixos-flash-v2` : **current Flash default**
- `ixos-pro-v1`   : legacy Pro embedder (hidden)
- `ixos-pro-v2`   : **current Pro mode** (fusion/cascade system)
- `potion-base-8m-int8` : internal dependency for Pro v2 (not user-selectable)

## Why This Change
- `models/lab/ixos-flash-v2` was previously a rename of v1; this confusion is removed.
- Pro quality is achieved via **fusion/cascade**, not `ixos-pro-v1`.

## Migration Steps (Apps + CLI)
1) **Update defaults**
   - Set Flash default to `ixos-flash-v2`.
   - Set Pro default to `ixos-pro-v2`.
2) **Hide legacy models**
   - Remove `ixos-pro-v1` from UI/CLI selection.
   - Keep `ixos-pro-v1` on disk only for regression testing.
3) **Map Pro v2 internally**
   - Treat `ixos-pro-v2` as a composite: Flash v2 + Potion + fusion.
   - Do not expose Potion as a user-facing mode.
4) **Installer / downloads**
   - Download `ixos-flash-v2` + `potion-base-8m-int8` for Pro v2.
   - Keep `ixos-flash-v1` / `ixos-pro-v1` as optional legacy downloads only.

## Config Compatibility
- Config values using `flash-v1` or `pro-v1` should be normalized to `flash-v2` / `pro-v2` at load time.
- CLI flags should accept `pro`, `pro-v2`, and `ixos-pro-v2` as aliases.

## Deprecation Notes
- `ixos-pro-v1` is slower and lower quality than Flash v2; it must never be labeled as "Pro" in UI/CLI.
