# Ixos

Ixos is a local file-retrieval engine in Rust, with a CLI and a desktop interface. This monorepo also contains the website and shared UI packages. The engine/CLI is the primary restoration focus.

## Repository map

| Location | Purpose |
|---|---|
| `src/` | Rust library, CLI, retrieval, embeddings, extraction and native cache |
| `tests/`, `benches/`, `bench/` | Rust integration tests and existing benchmark implementations |
| `ixos-search/src-tauri/` | Desktop Rust shell |
| `ixos-search/ui/` | Desktop React interface |
| `ixos-site/` | Website and landing variants |
| `packages/` | Shared UI packages used by desktop and site |
| `scripts/` | Build, model and evaluation tools |
| `models/`, `dataset/` | Local model/data artifacts; large derived assets are excluded from Git |
| `reports/restoration/` | Reproducible restoration checks and their limitations |
| `docs/archive/`, `legacy/` | Historical plans, retired Ixplorer and design references |

`PLAN.md`, `RUNLOG.md` and `DECISIONS.md` record the active work. Archived documents describe earlier states and are not current specifications. Personal contribution/application records are locally Git-excluded.

## Development

```powershell
cargo build --locked --release -p ixos-protocol --bin ixos
cargo test --locked -p ixos-protocol --lib --bin ixos --test settings_matrix
npm ci
npm run dev
npm run tauri:dev
npm run site:dev
```

Use `target/release/ixos --help` for the CLI contract. Installed embedding models run on CPU. Native mode writes ADS/xattr metadata; JIT mode does not persist embedding caches. The optional fallback database lives in the application cache, never beside searched files.

## Restoration state

Gate 1 repairs confirmed cache, freshness, discovery, evidence and CLI-contract failures. Gate 2 removes account/payment restrictions and prepares the monorepo. Evaluation integrity precedes model or retrieval experiments; the current correctness checks do not establish benchmark superiority. Windows checks are captured in the restoration report; Mac/Linux runtime validation remains outstanding.
