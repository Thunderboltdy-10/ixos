# Release checklist

## Preflight
- [ ] Working tree clean or changes understood.
- [ ] Version bump applied (Cargo.toml, package.json, ixos-search/src-tauri/tauri.conf.json as needed).

## Required gates (must pass)
- [ ] Registry validation
  - `python scripts/validate_registry.py`
- [ ] Capability matrix regenerated and committed
  - `python scripts/generate_capability_matrix.py`
- [ ] Golden tests
  - `python scripts/run_golden.py`
- [ ] Contract tests
  - `python scripts/run_contract.py`
- [ ] Performance budget checks (stub for now)
  - `python scripts/run_perf_budget_stub.py`

## Build and packaging
- [ ] Rust build
  - `cargo build`
- [ ] Tauri build
  - Production (required for release): `npm run tauri:build:prod`
  - Local/dev packaging: `npm run tauri:build`

### Required env for `tauri:build:prod`
- `VITE_API_URL`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `IXOS_JWT_PUBLIC_KEY`

## Release artifacts
- [ ] Tag release after all gates pass.
- [ ] Attach change log and capability matrix to release notes.

