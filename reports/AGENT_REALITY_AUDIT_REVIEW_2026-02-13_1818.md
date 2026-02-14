# AGENT REALITY AUDIT REVIEW - 2026-02-13 18:18 UTC

Source reviewed: `reports/AGENT_REALITY_AUDIT_2026-02-13_1633.md`

## Confirmed corrections in this iteration

1. Cache mode naming and defaults
- Canonical naming is now `native-cache` (default) and `ephemeral`.
- Legacy aliases `cache`/`jit` remain accepted for compatibility.
- Updated user-facing labels in desktop UI + docs-site pages.

2. Benchmark and Ralph loop instrumentation
- Added harsh objective profile in `ixos-big-bench` and included stage p95 metrics.
- Added `scripts/compare_performance.py` and integrated it into `scripts/ralph_loop.py`.
- Generated new checkpoints and comparison artifacts under `reports/ralph/`.

3. CI/workflow reliability
- Release workflow now uses `npm ci` and `GH_TOKEN` for `gh release download`.
- Added required release env var wiring for desktop signing/build flow.
- Settings-matrix workflow now runs Rust integration test + locked build.
- Build-pro workflow now packages `README.md` and `LICENSE` alongside binary.

4. Global docs/site alignment
- Expanded docs-site content in-depth for getting started, desktop architecture, models, benchmarking, and agent workflows.
- Added benchmark data source file `ixos-site/src/data/benchmarks.json` and switched benchmark section to data-driven rendering.

5. Repository organization cleanup
- Moved root markdown clutter into `docs/archive/root/`:
  - `PROJECT_REVIEW_REPORT.md`
  - `PRODUCTION_AND_STRATEGY_GAPS_2026-02-10.md`
  - `FEATURES_AND_FUNCTIONALITY.md`
  - `IMPLEMENTATION_SUMMARY.md`
- Regenerated `docs/MARKDOWN_INVENTORY.md`.

## Remaining known gaps (not fully closed)

1. Internal UI mode representation still uses legacy enum values (`cache`/`jit`) in several components/stores.
- User-facing labels are aligned; internal type migration remains as technical debt.

2. Next.js build warning about workspace root inference persists.
- Build passes; warning is non-fatal.
- A safe `turbopack.root` fix needs framework-version-compatible shape without breaking build.

3. Quality comparison currently mixes suite scopes in some files.
- `results_baseline_2026-02-02.json` vs synthetic-only `results_prism_iter_2026-02-13.json` is not apples-to-apples.
- Release gate should compare same-suite artifacts.

## Verification run set in this pass
- `cargo test -q` -> PASS
- `cargo test --test settings_matrix -q` -> PASS
- `python scripts/run_settings_matrix.py` -> PASS
- `npm --prefix ui run build` -> PASS
- `npm --prefix ixos-site run build` -> PASS (with root-inference warning)
- `python scripts/ralph_loop.py --checkpoint R1 --bench-dir . --bench-runs 3 --objective-profile harsh --skip-landing-audit` -> PASS

## New artifacts generated
- `reports/ralph/iteration_11_20260213_180754.md`
- `reports/ralph/iteration_12_20260213_181349.md`
- `reports/ralph/comparison_11_20260213_180754.md`
- `reports/ralph/comparison_12_20260213_181349.md`
- `reports/ralph/comparison_turn_20260213_181435.md`
- `reports/ralph/research_notes_20260213.md`
