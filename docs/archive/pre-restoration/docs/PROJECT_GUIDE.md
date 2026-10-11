# Ixos Project Guide

## Source of Truth Policy
- The registry at `features/registry.yml` and the code it references are authoritative.
- This guide must only make claims that have direct evidence in code or config.
- Any doc-only claim without evidence must be logged in `docs/gaps.md`.

## Surfaces and entry points
- IMPLEMENTED: Rust core library lives in `src/` and exports modules via `src/lib.rs`.
  Evidence: `src/lib.rs:28`, `src/lib.rs:42`
- IMPLEMENTED: CLI binary is `ixos` and uses `src/main.rs` as entrypoint.
  Evidence: `Cargo.toml:122`, `Cargo.toml:123`, `Cargo.toml:124`
- IMPLEMENTED: Desktop app is a Tauri backend in `src-tauri/` with a Vite + React frontend in `ui/`.
  Evidence: `src-tauri/src/lib.rs:50`, `ui/package.json:7`, `ui/package.json:27`
- IMPLEMENTED: Marketing site is `ixos-site/` (Next.js app).
  Evidence: `ixos-site/package.json:6`

## Core modules (Rust)
- IMPLEMENTED: Core modules are declared in `src/lib.rs` (attestation, compliance, embeddings, ranking, watcher, security, storage, telemetry).
  Evidence: `src/lib.rs:28`, `src/lib.rs:42`
- IMPLEMENTED: Model2Vec dependency is in the workspace dependencies.
  Evidence: `Cargo.toml:18`

## CLI commands (current)
- IMPLEMENTED: `search` command exists.
  Evidence: `src/cli/commands.rs:97`
  - IMPLEMENTED: Key flags include `--limit`, `--format`, `--dir`, `--progressive`, `--show-scores`, `--cache-mode`, `--model`, `--secure-timing`, `--journalist-mode`.
    Evidence: `src/cli/commands.rs:103`, `src/cli/commands.rs:107`, `src/cli/commands.rs:111`, `src/cli/commands.rs:117`, `src/cli/commands.rs:123`, `src/cli/commands.rs:139`, `src/cli/commands.rs:152`, `src/cli/commands.rs:159`, `src/cli/commands.rs:172`
- IMPLEMENTED: `index` command exists, with `--watch` and `--clear` flags defined.
  Evidence: `src/cli/commands.rs:176`, `src/cli/commands.rs:184`
- IMPLEMENTED: `config` command exists with get/set/list/reset/path.
  Evidence: `src/cli/commands.rs:198`
- PARTIALLY IMPLEMENTED: `daemon` command exists but background mode is not implemented.
  Evidence: `src/cli/commands.rs:221`, `src/main.rs:583`
- PARTIALLY IMPLEMENTED: `cache` subcommands exist; `rebuild` prints not fully implemented.
  Evidence: `src/cli/commands.rs:236`, `src/cli/commands.rs:345`, `src/main.rs:809`
- IMPLEMENTED: `compliance` subcommands exist (consent, gdpr, ccpa, docs, audit).
  Evidence: `src/cli/commands.rs:375`, `src/cli/commands.rs:392`, `src/cli/commands.rs:399`, `src/cli/commands.rs:406`, `src/cli/commands.rs:417`
- IMPLEMENTED: Output formats include `zotero`, `mendeley`, `bibtex` in addition to human/json/csv/ripgrep.
  Evidence: `src/cli/commands.rs:263`, `src/cli/output.rs:41`, `src/cli/output.rs:44`, `src/cli/output.rs:46`

## Configuration management
- IMPLEMENTED: Config is loaded and saved via `IxosConfig` with a default path.
  Evidence: `src/cli/config.rs:301`, `src/cli/config.rs:339`
- IMPLEMENTED: Desktop exposes get/update/reset config commands.
  Evidence: `src-tauri/src/commands/config.rs:158`, `src-tauri/src/commands/config.rs:165`, `src-tauri/src/commands/config.rs:172`

## Progressive search and streaming
- IMPLEMENTED: Core progressive streaming search engine and events are in `src/ixos_rank/progressive.rs`.
  Evidence: `src/ixos_rank/progressive.rs:296`, `src/ixos_rank/progressive.rs:423`
- IMPLEMENTED: CLI uses progressive search when `--progressive` is enabled.
  Evidence: `src/main.rs:301`, `src/cli/commands.rs:117`
- IMPLEMENTED: Desktop uses `search_progressive` Tauri command and emits streamed events to UI.
  Evidence: `src-tauri/src/commands/search.rs:235`, `src-tauri/src/commands/search.rs:323`

## Cache modes and storage
- IMPLEMENTED: CLI supports `--cache-mode` flag with canonical names `ephemeral` / `native-cache` (legacy aliases `jit` / `cache` still accepted).
  Evidence: `src/cli/commands.rs:139`
- IMPLEMENTED: CLI forces Ephemeral in journalist mode and uses configured cache mode in search.
  Evidence: `src/main.rs:185`, `src/main.rs:262`
- IMPLEMENTED: Cache backends are ADS on Windows and xattr on Unix via `get_cache_for_path`.
  Evidence: `src/storage/mod.rs:39`, `src/storage/mod.rs:43`

## Journalist mode
- IMPLEMENTED: CLI flag exists and forces Ephemeral, clears data after search.
  Evidence: `src/cli/commands.rs:172`, `src/main.rs:185`, `src/main.rs:371`
- IMPLEMENTED: Desktop search honors `journalist_mode` and forces Ephemeral.
  Evidence: `src-tauri/src/commands/search.rs:246`, `src-tauri/src/commands/search.rs:449`

## Secure timing
- IMPLEMENTED: CLI flag exists and routes to secure embedder.
  Evidence: `src/cli/commands.rs:159`, `src/main.rs:255`
- IMPLEMENTED: Secure embedder enforces a 100ms minimum processing time.
  Evidence: `src/ixos_embed/secure_embedder.rs:29`

## Compliance and consent
- IMPLEMENTED: ComplianceManager exposes GDPR/CCPA consent and audit operations.
  Evidence: `src/compliance/mod.rs:204`, `src/compliance/mod.rs:234`, `src/compliance/mod.rs:258`
- IMPLEMENTED: CLI compliance subcommands exist.
  Evidence: `src/cli/commands.rs:375`, `src/cli/commands.rs:392`, `src/cli/commands.rs:399`
- IMPLEMENTED: Desktop exposes consent commands via Tauri.
  Evidence: `src-tauri/src/commands/config.rs:178`, `src-tauri/src/commands/config.rs:191`

## Desktop app (Tauri backend)
- IMPLEMENTED: Tauri commands are registered in `src-tauri/src/lib.rs`.
  Evidence: `src-tauri/src/lib.rs:50`
- IMPLEMENTED: System tray is set up and managed in `src-tauri/src/tray.rs`.
  Evidence: `src-tauri/src/tray.rs:15`, `src-tauri/src/lib.rs:35`
- IMPLEMENTED: Global hotkey is configurable and registered.
  Evidence: `src-tauri/src/commands/shortcut.rs:183`, `src-tauri/src/commands/shortcut.rs:243`
- IMPLEMENTED: Model status and preload commands are available.
  Evidence: `src-tauri/src/commands/system.rs:155`, `src-tauri/src/commands/system.rs:220`
- IMPLEMENTED: File open and reveal commands are available.
  Evidence: `src-tauri/src/commands/system.rs:33`, `src-tauri/src/commands/system.rs:63`

## Desktop UI (React)
- IMPLEMENTED: UI calls Tauri `get_model_status` on startup in the main window.
  Evidence: `ui/src/App.tsx:88`
- IMPLEMENTED: Encrypted storage API bridges to Tauri storage commands.
  Evidence: `ui/src/lib/storage.ts:21`, `src-tauri/src/commands/storage.rs:18`
- IMPLEMENTED: AES-GCM encryption with PBKDF2 key derivation is used for local data.
  Evidence: `ui/src/lib/crypto.ts:17`, `ui/src/lib/crypto.ts:30`
- IMPLEMENTED: Search history suggestions are fetched via Tauri history commands.
  Evidence: `src-tauri/src/commands/history.rs:26`, `ui/src/stores/historyStore.ts:31`

## Academic export formats
- IMPLEMENTED: Academic export formats (Zotero CSV, Mendeley XML, BibTeX) are supported in CLI output.
  Evidence: `src/cli/output.rs:41`, `src/cli/output.rs:44`, `src/cli/output.rs:46`, `src/integrations/academic.rs:9`

## Background indexing and prefetch
- PARTIALLY IMPLEMENTED: Background indexer exists but indexing logic is placeholder.
  Evidence: `src/ixos_embed/background_indexer.rs:93`, `src/ixos_embed/background_indexer.rs:179`
- IMPLEMENTED: Prefetch commands exist in Tauri backend.
  Evidence: `src-tauri/src/commands/prefetch.rs:26`, `src-tauri/src/commands/prefetch.rs:51`

## Marketing site (ixos-site)
- IMPLEMENTED: Next.js app defined in `ixos-site/package.json`.
  Evidence: `ixos-site/package.json:18`
- IMPLEMENTED: Marketing site specifications and acceptance criteria are documented in `ixos-site/SPEC_PART1-5`.
  Evidence: `ixos-site/SPEC_PART1_TOKENS.md:1`, `ixos-site/SPEC_PART5_RULES.md:1`

## Tooling and benchmarks
- IMPLEMENTED: Benchmark runner exists as `ixos-bench` binary.
  Evidence: `src/bin/ixos-bench.rs:1`

