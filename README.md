# Ixos

Ixos is local hybrid search over code and documents, running on CPU. Use it from the CLI, an AI client through MCP, or a tray app with a quick-search overlay.

[ixos.dev](https://ixos.dev)

https://github.com/user-attachments/assets/d931b23f-20b1-46ba-ae11-4c5144c7ad9c

## Install

Use the Install button on [ixos.dev](https://ixos.dev), or download your native installer directly below. No terminal, Rust, Node or source checkout is needed.

- Windows x64: open the [Windows installer](https://github.com/Thunderboltdy-10/ixos/releases/latest/download/Ixos-Windows-X64-setup.exe). It creates desktop and Start menu shortcuts.
- macOS: open the [Apple silicon disk image](https://github.com/Thunderboltdy-10/ixos/releases/latest/download/Ixos-macOS-ARM64.dmg) or [Intel disk image](https://github.com/Thunderboltdy-10/ixos/releases/latest/download/Ixos-macOS-X64.dmg). Drag Ixos to Applications.
- Debian or Ubuntu x64: open the [Debian package](https://github.com/Thunderboltdy-10/ixos/releases/latest/download/Ixos-Linux-X64.deb) with your software installer, then launch Ixos from Applications.

The installer includes the desktop and engine, installs the skills and registers MCP for Codex and Claude Code. Restart your agent after installing. Models download from Hugging Face on first use. After setup, search works offline. Settings → Models shows download errors and lets you retry. The desktop offers new versions when it opens, and the CLI and MCP tools show `ixos update` when one is available.

See the [installation guide](docs/INSTALLATION.md) for CLI installation and offline setup, or [CONTRIBUTING.md](CONTRIBUTING.md) to build from source.

## Use

Run these examples from the repository root:

```sh
ixos search "cache freshness" --dir crates/ixos-core --profile code
ixos grep "source_hash" --dir crates/ixos-core --fixed
ixos read src/source.rs --dir crates/ixos-core --start 1 --lines 30
```

Add `--json` for structured results. Search supports `lexical`, `semantic` and `hybrid` modes; the default is hybrid. Scores rank files and are not probabilities. [CLI reference](docs/CLI.md).

### Claude Code and Codex

The normal installer sets up both agents automatically. Restart Codex or Claude Code after installation, then ask it to search your project. Existing settings and other MCP servers are preserved.

The same installed engine supplies the CLI, MCP server and desktop worker. `ixos update` updates the complete installation. Set `IXOS_NO_UPDATE_CHECK=1` to disable automatic update checks. Models stay separate on Hugging Face. [Installation and offline setup](docs/INSTALLATION.md).

The server exposes search, grep and read. Search optionally returns bounded function evidence (`evidence:"functions"`); exact function/range reads, grouped grep, compact numbered views and batches make follow-up inspection precise. Default search remains unchanged. The installed skill explains these capabilities; MCP registration enables the tools. [MCP setup for Codex and Claude Code](docs/MCP.md).

## How it works

An ignore-aware walk discovers sources, which Ixos extracts into text and ranks with full-text BM25 and static embeddings. Compact records cache vectors in file metadata, with one application-cache database as a fallback. A source fingerprint keeps records fresh, and resident processes reuse unchanged text and vectors. Snippets are selected at query time. [Architecture](docs/ARCHITECTURE.md).

## Results

| Suite | Hybrid nDCG@10 | BM25 nDCG@10 | Ranked rg nDCG@10 |
|---|---:|---:|---:|
| RepoQA, 260 descriptions | 0.6937 | 0.6066 | 0.4469 |
| SciFact, 300 claims | 0.6950 | 0.6645 | 0.5361 |

These are recorded baseline file-retrieval results, with a 6,000-byte response ceiling. These sets were inspected repeatedly during development and are diagnostic evidence, not fresh independent confirmation. Optional function evidence historically raised labeled-function overlap from 101/260 to 171/260; this measures source availability, not agent task accuracy. Later agent comparisons did not establish a reliable correctness or total-context advantage over ordinary tools. [Agent evidence and limits](docs/AGENT-EVIDENCE.md), [results and timings](docs/RESULTS.md), [reproduction](eval/README.md).

## Limitations

- Search accepts at most 16 MiB per plain-text file, 512 MiB per PDF or Office file, and 256 MiB of combined extracted source text per engine.
- Extraction supports text, PDF and Office files; it has no OCR for scanned pages.
- Ignore rules, symlinks and unhydrated cloud placeholders can exclude sources.
- The 6,000-byte response ceiling can shorten or omit snippets and reduce returned files.
- The single 10,000-file timing check reached 2,873 ms fresh and 573 ms resident, missing the speed targets; retrieval scores do not measure agent task completion.

## Project history

The [historical documents](docs/history/README.md) record the original plans, abandoned features, restoration and cleanup.

## Built with AI assistance

Pablo designed and directed Ixos and made its product decisions. AI coding agents, including Claude Code and Codex, wrote much of the implementation under his direction. The [historical documents](docs/history/README.md) record the original plans, abandoned features, restoration and cleanup.

## License and models

Ixos is [MIT licensed](LICENSE), with the project notice naming Pablo. The notice identifies the rights holder; it does not assert a registered trademark for the project name. Retain the copyright and permission notices when distributing the software. The code and documents models derive from MinishLab's MIT-licensed Potion models without additional training; [model cards](docs/models/) describe the exact transformations and upstream attribution. The encoded loader includes code adapted from model2vec-rs, with its [MIT notice](docs/licenses/model2vec-rs-MIT.txt).
