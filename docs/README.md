# IXOS DOCUMENTATION HUB

This directory is the canonical starting point for product, model, and engineering documentation.

## CORE ENTRY POINTS

- Getting started: `docs/getting-started/INSTALLATION.md`
- Desktop app guide: `docs/product/DESKTOP_APP.md`
- CLI reliability quickcheck: `docs/product/CLI_RELIABILITY_QUICKCHECK.md`
- Phases 0-2 implementation + testing guide: `docs/product/PHASES_0_2_IMPLEMENTATION_AND_TESTING.md`
- Models and Hugging Face: `docs/models/HUGGINGFACE_AND_MODELS.md`
- Benchmark and profiling runbook: `docs/engineering/BENCHMARKING.md`
- Desktop search fallback behavior: `docs/engineering/SEARCH_MODE_FALLBACKS.md`
- Agent workflow and skills: `docs/agents/SKILLS_AND_WORKFLOWS.md`
- Markdown catalog for the full repo: `docs/MARKDOWN_INVENTORY.md`
- Markdown governance and organization rules: `docs/engineering/MARKDOWN_ORGANIZATION.md`

## CANONICAL MODEL NAMING

- `ixos-flash-v1`: legacy baseline for comparison.
- `ixos-flash-v2`: current Flash v2 generation.
- `ixos-pro-v1`: legacy hidden Pro baseline.
- `ixos-pro-v2`: current true Pro v2 system.
- `potion-base-8m-int8`: internal dependency (not user-facing mode).

## AUTHORITATIVE OPERATION FILES

Keep these continuously maintained during implementation loops:

- `PLAN.md`
- `RUNLOG.md`
- `DECISIONS.md`
- `/reports/*` benchmark and validation artifacts

## RELATED LEGACY/DEEP-DIVE DOCS

Existing specialized docs are still valid and linked through:

- `docs/PROJECT_GUIDE.md`
- `docs/models/README.md`
- `docs/modeling/PROCESS.md`
- `reports/V2_FINAL_WRITEUP.md`

Archived former root docs are now grouped under:

- `docs/archive/root/`
