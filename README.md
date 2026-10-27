# Ixos

Ixos is local hybrid search over code and documents, running on CPU. Use it from the CLI, an AI client through MCP, or a tray app with a quick-search overlay.

## Install

Use the lightweight binary installer. It installs one shared CLI/engine with MCP and the bundled agent skill, verifies both Hugging Face models, and installs desktop by default. No Rust, Node or source checkout is needed.

```powershell
# Windows (PowerShell)
& ([scriptblock]::Create((irm https://github.com/Thunderboltdy-10/ixos/releases/latest/download/install-cli.ps1)))
```

```sh
# macOS / Linux
curl -fsSL https://github.com/Thunderboltdy-10/ixos/releases/latest/download/install-cli.sh | sh
```

For CLI/MCP/skill only, append `-NoDesktop` to the PowerShell invocation, or use `| sh -s -- --no-desktop` on macOS/Linux. There is still one installation entry point. Open a new terminal afterwards so agent hosts can find `ixos` on PATH.

You can also download the small `ixos-install-<platform>` executable from [Releases](https://github.com/Thunderboltdy-10/ixos/releases) and run it (`--no-desktop` is optional). Engine and desktop assets are fetched independently from their latest published stable component releases; drafts and prereleases are excluded. **Until the first engine and desktop releases are published, public installation links cannot complete.**

For developers building the CLI from a source checkout:

```sh
cargo install --path crates/ixos-cli --locked
ixos setup
```

`ixos setup` installs the bundled agent skill and downloads and verifies both models from the public Hugging Face repositories. Models are stored in your local application-data directory, outside the executable, and shared by the CLI and desktop. After setup, search works offline. The desktop performs the same download automatically in the background on first launch; Settings → Models shows setup errors and lets you retry.

If you skip setup, CLI and MCP semantic/hybrid search download a missing selected model automatically. Lexical search, grep and read do not require a model or network access. Individual downloads use `ixos model install code` and `ixos model install documents`.

For an offline installation, copy the three runtime files for each profile from [Ixos Code](https://huggingface.co/Thunderboltdy10/ixos-code) and [Ixos Documents](https://huggingface.co/Thunderboltdy10/ixos-documents), then use `ixos model install code --from PATH` or `ixos model install documents --from PATH`. Developers can reproduce these artifacts with `python scripts/models.py build` using `numpy==2.3.5`. See [CONTRIBUTING.md](CONTRIBUTING.md) for desktop and site builds.

## Use

Run these examples from the repository root:

```sh
ixos search "cache freshness" --dir crates/ixos-core --profile code
ixos grep "source_hash" --dir crates/ixos-core --fixed
ixos read src/source.rs --dir crates/ixos-core --start 1 --lines 30
```

Add `--json` for structured results. Search supports `lexical`, `semantic` and `hybrid` modes; the default is hybrid. Scores rank files and are not probabilities. [CLI reference](docs/CLI.md).

After the common installation step above, register with your agent, replacing the absolute project location:

```sh
codex mcp add ixos -- ixos mcp --dir /absolute/project --profile code
claude mcp add --transport stdio ixos -- ixos mcp --dir /absolute/project --profile code
```

The same `ixos` executable supplies the CLI, agent MCP server and resident desktop worker. The desktop reuses the shared engine at `~/.ixos/bin/ixos[.exe]`, or a compatible explicitly managed CLI; it does not bundle a second search engine. [Installation and offline setup](docs/INSTALLATION.md).

CLI commands check for updates in the background at most daily and suggest `ixos update`. MCP responses carry the same notice so your agent can ask before updating. `ixos update --desktop` includes the desktop. Desktop checks on launch/login, applies compatible engine updates and signed desktop updates, and restarts to use them. Models/settings are shared, and component versions can advance independently. Set `IXOS_NO_UPDATE_CHECK=1` to disable automatic checks. Desktop release builds require the signing configuration described in [installation](docs/INSTALLATION.md#independent-releases-and-compatibility).

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

- Search accepts at most 16 MiB per file and 256 MiB of combined extracted source text per engine.
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
