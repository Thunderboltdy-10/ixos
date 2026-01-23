# Release checklist

## Preflight
- [ ] Working tree clean or changes understood.
- [ ] Version bump applied (Cargo.toml, package.json, src-tauri/tauri.conf.json as needed).

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
  - `npm run tauri:build`

## Release artifacts
- [ ] Tag release after all gates pass.
- [ ] Attach change log and capability matrix to release notes.

