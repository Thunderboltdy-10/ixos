# Release Smoke Matrix - 2026-02-08

## Scope
- Desktop entitlement/auth robustness
- Search streaming + mode enforcement
- UI/landing build validity
- Release gate command outcomes

## Command Matrix
| Command | Result | Notes |
|---|---|---|
| `cargo test -p ixos-app` | PASS | `17 passed; 0 failed` |
| `cargo test` | PASS | `455 passed; 0 failed; 6 ignored` |
| `cargo build -p ixos-app --release` | PASS | Release desktop crate build succeeded |
| `cargo build --release` | PASS | Workspace release build succeeded |
| `cd ui; npm run build` | PASS | TypeScript + Vite build succeeded |
| `cd ixos-site; npm run build` | PASS | Next build succeeded; `/terms` and `/api/desktop/entitlement-key` present |
| `python scripts/validate_registry.py` | PASS | Registry validation passed |
| `python scripts/generate_capability_matrix.py` | PASS | `docs/capability-matrix.md` regenerated |
| `python scripts/run_contract.py` | PASS | Contract tests passed |
| `python scripts/run_perf_budget_stub.py` | PASS | Perf budget stub passed |
| `python scripts/run_golden.py` | FAIL | Path-format false negatives removed; remaining true retrieval mismatches listed below |
| `npm run tauri:build:prod` | FAIL (expected) | Guardrail blocked build due missing env vars in local shell |

## Remaining Golden Failures (True Retrieval Mismatch)
- `q1_financial_report`: expected `corpus_tiny/docs/q1_financial_report.md`, actual top result `corpus_tiny/docs/project_plan_2025.md`
- `q2_financial_report`: expected `corpus_tiny/docs/q2_financial_report.md`, actual top result `corpus_tiny/docs/project_plan_2025.md`
- `privacy_policy`: expected `corpus_tiny/docs/privacy_policy.md`, actual top result `corpus_tiny/docs/project_plan_2025.md`
- `config_json`: expected `corpus_tiny/data/config.json`, actual top result `corpus_tiny/docs/api_reference.md`
- `todo_refine`: expected `corpus_tiny/misc/todo.md`, actual top result `corpus_tiny/docs/project_plan_2025.md`
- `logs_streamed`: expected `corpus_tiny/logs/app.log`, actual top result `corpus_tiny/misc/changelog.txt` and required result missing

## Key Fixes Validated In This Pass
- Flash fallback now works without backend entitlement token; Pro mode remains blocked without valid entitlement.
- Pro status polling is token-aware to avoid startup false-expired UI state.
- Cached invalid entitlement token is purged when backend validation fails.
- Dropdown overlays render above suggestions and use denser, readable item layout.
- Sidebar/settings button sizing and consistency improved.
- Firefox arc-noise path now uses same overlay strategy as Chromium and is layered above particles.
- Golden harness path normalization now strips Windows extended path prefixes (`\\?\`, `//?/`).

## Production Packaging Blocker
`npm run tauri:build:prod` currently requires these env vars in shell/CI:
- `VITE_API_URL`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `IXOS_JWT_PUBLIC_KEY`
