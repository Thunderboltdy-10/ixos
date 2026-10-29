# Installation and the shared runtime

Ixos has one engine executable, `ixos` (`ixos.exe` on Windows). It provides the human CLI, public agent MCP server, and private resident desktop worker. Models, settings and skills live outside the executable. The desktop links only the small `ixos-runtime` client/contracts crate; it does not contain another copy of the search engine or models.

## CLI installation

The lightweight `ixos-install-<platform>` binary is the one installation entry point. It downloads the latest published stable `engine-vX.Y.Z` release and, by default, the latest compatible `desktop-vX.Y.Z` release. `--no-desktop` installs only CLI/MCP/skill. The bootstrap links only the small runtime client, with no search engine or models. Both engine and desktop releases contain this bootstrap and the two wrapper scripts, so GitHub's `/releases/latest/download/` works whichever component shipped last.

The PowerShell and shell commands in the README download and SHA-256-check that bootstrap against the release's `SHA256SUMS`, then invoke it with the selected desktop option. The bootstrap validates the component manifests and protocol before installing, checks the engine checksum and actual handshake/version, then runs that engine's `setup` before replacing the existing executable. Setup provisions the embedded skill, verifies all three files of each pinned Hugging Face model and loads both models. Corrupt or older model revisions are repaired through verified temporary directories; failed downloads retain existing files. Setup failure prevents desktop installation and leaves an existing engine executable intact.

Normal installations share `~/.ixos/bin/ixos[.exe]` (or `$IXOS_HOME/bin/ixos[.exe]`). The installer adds this directory to the user PATH; open a new terminal afterwards. Desktop is installed per user: NSIS on Windows, `~/Applications/Ixos.app` on macOS, and `~/.ixos/Ixos.AppImage` plus a user application entry on Linux. Linux desktop still needs the host's AppImage/FUSE and WebKit/GTK system support. CLI-only installations do not need those GUI libraries. MCP registration remains an explicit host command after the common installation; no global agent configuration is rewritten.

Source developers can still use `cargo install --path crates/ixos-cli --locked` followed by `ixos setup`. `ixos setup --skip-models` provisions skills without network access; lexical search, grep and read need no model.
The runtime also checks skill installation on ordinary commands, including MCP and desktop worker startup. `--help` and `--version` exit before setup. Setup errors are explicit; routine commands warn on stderr and continue rather than overwrite custom skills. Semantic/hybrid search installs a missing managed model when first needed. Explicit model overrides are local-only. See [CLI](CLI.md) for offline model installation.

## Agent skill and MCP

The canonical skill is [`skills/ixos/SKILL.md`](../skills/ixos/SKILL.md), embedded in the runtime. Setup installs it under `~/.agents/skills/ixos`, plus detected `~/.codex/skills/ixos` and `~/.claude/skills/ixos`. A configured absolute `CODEX_HOME` is supported. An ownership receipt permits updates only while the installed content still matches the previously installed version. User-authored or edited skills are preserved. Directory junctions and file/directory links are never overwritten; matching canonical linked skills are reported as linked. Setup reports bundled version and SHA256 plus per-host status and installed hash. One preserved or failed target does not stop attempts for the other hosts. `setup` exits with an error when any target needs attention; ordinary retrieval warns on stderr and continues. The desktop Models settings and `doctor` show the host report. Set `IXOS_SKILL_HOME` to an isolated home for testing or deployment provisioning.

The skill teaches when to search, grep or expand a range. It does not register a server or grant tool permissions. Register the runtime once in your agent host; see [MCP setup](MCP.md). Restart/reload the host if it does not refresh installed skills or tools. The default installation intentionally does not rewrite global agent configuration.

For hosts supported by the optional [Agent Skills CLI](https://github.com/vercel-labs/skills), `npx skills add . --skill ixos` from this checkout can discover/install the canonical skill. This is an optional distribution route, not a runtime prerequisite. Check that CLI's host selection and scope before installing. Ixos native setup currently detects Codex and Claude Code plus the shared location; it does not claim automatic provisioning into every possible agent configuration.

## Desktop installation

When launched from an MSIX-packaged terminal or agent, the bootstrap checks the physical destination of AppData writes as well as package identity. It hands installation to the user's Explorer desktop so the executable, models and Start menu entry are installed into the normal Windows environment. Without this handoff, Windows can redirect them into the terminal's private package cache, making an apparently successful installation invisible to normal app search. If Explorer is unavailable, installation reports an error instead of silently using that private cache.

On Windows, installing Ixos adds **Ixos** to the Start menu and Windows app search. Launching it opens its window; launching it again restores the existing window. Only the launch-at-login entry uses `--hidden` to start in the tray. NSIS installations and updates rebuild the Start menu shortcut with the current executable, icon and application ID, and notify the Windows shell. The explicit installer `/NS` option still opts out of shortcut creation. The Windows release workflow tests silent installation, recovery of a missing shortcut during an update, hidden startup, repeated launch and minimized-window restoration before collecting release artifacts. Run `scripts/test-desktop-install.ps1 -Installer <setup.exe> -RequireAppList` on an interactive Windows desktop to also verify Windows app-list discovery.

The bootstrap installs the CLI first; desktop never includes a second engine. At launch it resolves:

1. Explicit `IXOS_ENGINE_PATH`.
2. An explicit verified offline release in `IXOS_RUNTIME_FROM`, if provided.
3. The shared engine at `~/.ixos/bin/ixos[.exe]`.
4. A compatible `ixos` on PATH.
5. Installation of the latest compatible engine into the same shared location (falling back to the desktop's protocol baseline if the newest engine needs a different major).

The client verifies protocol major and required capabilities using a five-second handshake. Downloads use a versioned HTTPS release manifest, fixed platform filenames and SHA-256 verification, then verify the executable before atomic installation. Downloads are bounded; partial files are temporary. Supported prebuilt targets are Windows/Linux x86-64 and macOS ARM64/x86-64. Other targets can build the runtime and set `IXOS_ENGINE_PATH`.

The downloaded runtime provisions the skill and supplies model setup, settings, cache operations and resident search. There is no additional manual engine installation. Models remain shared with the CLI and MCP. Download failures are shown through the existing setup/location error surfaces and can be retried. For offline desktop use, put the release manifest and matching platform binary in a directory, set `IXOS_RUNTIME_FROM` to it, and install verified models ahead of time. This uses the same checksum, handshake and atomic installation path as HTTPS. `IXOS_ENGINE_PATH` remains available for a directly managed compatible runtime. An explicit offline source fails visibly rather than silently downloading another copy.

The normal installer adds the shared engine to the user PATH; agent hosts may also register its absolute executable path. Explicit offline and engine-path overrides do not modify PATH or agent configuration. An existing CLI on PATH is reused when compatible; changing that binary affects new workers, while an already running worker retains its version until restarted.

## Independent releases and compatibility

The manual release workflow builds either `engine-vX.Y.Z` or `desktop-vX.Y.Z` into a draft. Engine drafts contain four platform binaries and `runtime-manifest.json`, generated from the actual artifact checksums. CLI package version and the runtime crate's pinned fallback version must match the engine tag. Desktop versions may advance independently; update the fallback engine version only when intentionally changing its supported installation baseline.

The private protocol is newline-delimited JSON with request IDs, a protocol major, required capabilities, and a 4 MiB frame bound. Add compatible operations without changing the major; incompatible wire behavior requires a new major. A newer compatible engine on PATH can serve an older desktop. Automatic engine updates retain the protocol-major/capability contract; incompatible releases are rejected. MCP is separate and remains the agent interface.

Release preparation is not publication. An engine release and its manifest must be published before a desktop relying on that fallback is distributed. CI builds and platform packaging must pass on all supported targets. The bootstrap cannot download an unpublished draft; development can use `IXOS_ENGINE_PATH`.

### Updates and signing

`ixos update --check` checks immediately. Ordinary CLI commands start at most one background probe daily; cached notices appear on stderr without delaying search or contaminating JSON/stdout. MCP tool responses include an additional text notice with the command and a request to ask the user before updating. `ixos update` updates the shared engine, models as required by its pinned revisions, and owned/unmodified skills. `ixos update --desktop` also runs the desktop installer. Independently installed CLI executables must use their original package/source installation method. Restart running MCP connections after an update. `IXOS_NO_UPDATE_CHECK=1` disables automatic checks.

Production desktop checks on each launch/login. A compatible shared-engine update is verified and installed, then desktop restarts so workers use it. Explicit `IXOS_ENGINE_PATH`/`IXOS_RUNTIME_FROM` overrides are not auto-updated. Desktop updates use Tauri's signed updater with a separate `desktop-update.json` on the latest desktop release. Signatures are mandatory; failed checks/downloads retain the installed app and log the error. Windows' updater closes/relaunches the app through its per-user installer; macOS/Linux restart after successful installation. Development builds skip automatic updates.

Before producing desktop release builds, generate a Tauri signing key, keep the private key outside the repository, configure repository secrets `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, and set repository variable `IXOS_UPDATER_PUBLIC_KEY` to the public-key contents. The workflow refuses unsigned desktop releases. Keep the same verification key across releases. An ordinary local build without a key can run, but cannot verify desktop updates. No keys or releases are created by changing this repository.

The workflow stages drafts only. Publish engine and desktop releases with complete artifacts before using the default public installer. Every draft contains the bootstrap, wrapper scripts and checksums; engine releases add the runtime manifest, while desktop releases add installer hashes, signed updater assets and the updater manifest. Component tags and versions remain independent.

`ixos runtime licenses` prints the project and bundled third-party source notices, including the optional parser dependencies. The notices are also in `docs/licenses/`.

## Isolation, recovery and removal

`IXOS_HOME` redirects owned settings, model/runtime data and fallback caches into `config`, `data` and `cache` below an explicit root. Native defaults remain unchanged. `IXOS_SKILL_HOME` separately selects a test/provisioning home for agent skills. Clear both variables for an ordinary user installation. Source-attached cache records still belong to the searched files: use a disposable corpus or disable caching for clean-room tests.

Workers have request deadlines after the handshake (search/refresh/doctor/cache: 120 seconds; model installation: 20 minutes; other calls: 30 seconds). Cancellation interrupts active calls and terminates their worker. Transport failure invalidates the session; the next desktop search recreates it. Ordinary returned operation errors keep a synchronized session usable. No mutating operation is retried automatically. Normal shutdown kills/waits for owned children; Windows also uses an owned job to prevent busy workers surviving abrupt desktop exit.

Remove only the installed executable/application and explicitly identified Ixos-owned data. Model and fallback cache directories are under the native local-data/cache roots, or the explicit `IXOS_HOME`. Source metadata can be inspected and cleared with the bounded `cache` commands. Preserve custom skills and agent configuration; remove only the Ixos MCP entry when disconnecting a host. The application does not silently remove shared engines/models when a desktop package is uninstalled.
