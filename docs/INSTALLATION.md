# Installation and the shared runtime

Ixos has one engine executable, `ixos` (`ixos.exe` on Windows). It provides the human CLI, public agent MCP server, and private resident desktop worker. Models, settings and skills live outside the executable. The desktop links only the small `ixos-runtime` client/contracts crate; it does not contain another copy of the search engine or models.

## CLI installation

Run `scripts/install-cli.ps1` on Windows or `sh scripts/install-cli.sh` on macOS/Linux from a source checkout. These build the runtime with Cargo and run `ixos setup`, provisioning the bundled agent skill and both verified models. Node is not required. A downloaded engine release binary is the same executable: place it on PATH and run `ixos setup` once. `ixos setup --skip-models` provisions skills without network access. Lexical search, grep and read need no model.

The runtime also checks skill installation on ordinary commands, including MCP and desktop worker startup. `--help` and `--version` exit before setup. Setup errors are explicit; routine commands warn on stderr and continue rather than overwrite custom skills. Semantic/hybrid search installs a missing managed model when first needed. Explicit model overrides are local-only. See [CLI](CLI.md) for offline model installation.

## Agent skill and MCP

The canonical skill is [`skills/ixos/SKILL.md`](../skills/ixos/SKILL.md), embedded in the runtime. Setup installs it under `~/.agents/skills/ixos`, plus detected `~/.codex/skills/ixos` and `~/.claude/skills/ixos`. A configured absolute `CODEX_HOME` is supported. An ownership receipt permits updates only while the installed content still matches the previously installed version. User-authored or edited skills are preserved. Directory junctions and file/directory links are never overwritten; matching canonical linked skills are reported as linked. Setup reports bundled version and SHA256 plus per-host status and installed hash. One preserved or failed target does not stop attempts for the other hosts. `setup` exits with an error when any target needs attention; ordinary retrieval warns on stderr and continues. The desktop Models settings and `doctor` show the host report. Set `IXOS_SKILL_HOME` to an isolated home for testing or deployment provisioning.

The skill teaches when to search, grep or expand a range. It does not register a server or grant tool permissions. Register the runtime once in your agent host; see [MCP setup](MCP.md). Restart/reload the host if it does not refresh installed skills or tools. The default installation intentionally does not rewrite global agent configuration.

For hosts supported by the optional [Agent Skills CLI](https://github.com/vercel-labs/skills), `npx skills add . --skill ixos` from this checkout can discover/install the canonical skill. This is an optional distribution route, not a runtime prerequisite. Check that CLI's host selection and scope before installing. Ixos native setup currently detects Codex and Claude Code plus the shared location; it does not claim automatic provisioning into every possible agent configuration.

## Desktop installation

Install the desktop application normally. At first launch it resolves the engine in this order:

1. Explicit `IXOS_ENGINE_PATH`.
2. A compatible managed engine at the desktop's pinned fallback version.
3. An explicit offline release directory in `IXOS_RUNTIME_FROM`, if provided.
4. A compatible `ixos` on PATH.
5. Download the pinned engine release into the platform local-data directory, `ixos/runtime/<version>/ixos[.exe]`.

The client verifies protocol major and required capabilities using a five-second handshake. Downloads use a versioned HTTPS release manifest, fixed platform filenames and SHA-256 verification, then verify the executable before atomic installation. Downloads are bounded; partial files are temporary. Supported prebuilt targets are Windows/Linux x86-64 and macOS ARM64/x86-64. Other targets can build the runtime and set `IXOS_ENGINE_PATH`.

The downloaded runtime provisions the skill and supplies model setup, settings, cache operations and resident search. There is no additional manual engine installation. Models remain shared with the CLI and MCP. Download failures are shown through the existing setup/location error surfaces and can be retried. For offline desktop use, put the release manifest and matching platform binary in a directory, set `IXOS_RUNTIME_FROM` to it, and install verified models ahead of time. This uses the same checksum, handshake and atomic installation path as HTTPS. `IXOS_ENGINE_PATH` remains available for a directly managed compatible runtime. An explicit offline source fails visibly rather than silently downloading another copy.

A desktop-managed engine need not be on PATH: agents can register its absolute executable path. Ixos does not modify the user's PATH or agent configuration silently. An existing CLI on PATH is reused when compatible; changing that binary affects new workers, while an already running worker retains its version until restarted.

## Independent releases and compatibility

The manual release workflow builds either `engine-vX.Y.Z` or `desktop-vX.Y.Z` into a draft. Engine drafts contain four platform binaries and `runtime-manifest.json`, generated from the actual artifact checksums. CLI package version and the runtime crate's pinned fallback version must match the engine tag. Desktop versions may advance independently; update the fallback engine version only when intentionally changing its supported installation baseline.

The private protocol is newline-delimited JSON with request IDs, a protocol major, required capabilities, and a 4 MiB frame bound. Add compatible operations without changing the major; incompatible wire behavior requires a new major. A newer compatible engine on PATH can serve an older desktop. The fallback remains pinned rather than silently following the latest release. MCP is separate and remains the agent interface.

Release preparation is not publication. An engine release and its manifest must be published before a desktop relying on that fallback is distributed. CI builds and platform packaging must pass on all supported targets. The bootstrap cannot download an unpublished draft; development can use `IXOS_ENGINE_PATH`.

`ixos runtime licenses` prints the project and bundled third-party source notices, including the optional parser dependencies. The notices are also in `docs/licenses/`.

## Isolation, recovery and removal

`IXOS_HOME` redirects owned settings, model/runtime data and fallback caches into `config`, `data` and `cache` below an explicit root. Native defaults remain unchanged. `IXOS_SKILL_HOME` separately selects a test/provisioning home for agent skills. Clear both variables for an ordinary user installation. Source-attached cache records still belong to the searched files: use a disposable corpus or disable caching for clean-room tests.

Workers have request deadlines after the handshake (search/refresh/doctor/cache: 120 seconds; model installation: 20 minutes; other calls: 30 seconds). Cancellation interrupts active calls and terminates their worker. Transport failure invalidates the session; the next desktop search recreates it. Ordinary returned operation errors keep a synchronized session usable. No mutating operation is retried automatically. Normal shutdown kills/waits for owned children; Windows also uses an owned job to prevent busy workers surviving abrupt desktop exit.

Remove only the installed executable/application and explicitly identified Ixos-owned data. Model and fallback cache directories are under the native local-data/cache roots, or the explicit `IXOS_HOME`. Source metadata can be inspected and cleared with the bounded `cache` commands. Preserve custom skills and agent configuration; remove only the Ixos MCP entry when disconnecting a host. The application does not silently remove shared engines/models when a desktop package is uninstalled.
