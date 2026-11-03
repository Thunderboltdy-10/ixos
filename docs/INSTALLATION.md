# Installation

Download the native installer from [ixos.dev](https://ixos.dev). Every installation includes the desktop app, its engine/CLI, the agent skills, and MCP registration for Codex and Claude Code. There is no engine-only or separate agent installation. Restart your agent after installing.

Windows uses a per-user NSIS installer with desktop and Start menu shortcuts. Linux provides a Debian package for Debian and Ubuntu x64. macOS provides Apple silicon and Intel disk images. Copy Ixos to Applications and open it; drag-and-drop installs finish user setup on their first launch. Debian package installation configures the invoking user when available; a direct root installation finishes user setup on first launch.

The engine is bundled with the app and installed at `~/.ixos/bin/ixos` (`ixos.exe` on Windows), which is added to your user PATH. No engine download is needed. Both models download separately from Hugging Face on first use. Failed model downloads can be retried in Settings → Models. Keyword search, grep and read work without models.

## Agents

Installation writes only the Ixos MCP entry in Codex's `~/.codex/config.toml` (or `CODEX_HOME/config.toml`) and Claude Code's user-scoped `~/.claude.json`. Existing unrelated settings and servers are preserved. The entries use the absolute installed executable and `["mcp"]`, so no terminal PATH refresh is required. Skills are installed in the shared/native agent locations. User-edited skills are preserved and reported.

## Updates and releases

Pushing a `vX.Y.Z` tag releases that version. The tag is the only version source: sources keep a `0.0.0` placeholder and the build writes the tag's version into them. The workflow builds and tests all four native packages, verifies installation and launch, checks artifact hashes, then publishes the release with four installers and `desktop-manifest.json`. Nothing is published unless every platform passes. Download links use GitHub's `releases/latest`, so they never change.

The desktop offers a newer release each time it opens. The CLI and MCP tools show `ixos update` while one is available, checking at most daily. Both install the native package after verifying its SHA-256 against the release manifest. On Linux this asks for an administrator password. `IXOS_NO_UPDATE_CHECK=1` disables the checks. Models stay on Hugging Face and are not bundled into releases.

Build one native platform locally using Node 22, Rust 1.92 and the platform dependencies from the workflow:

```sh
python scripts/build-release.py --tag v0.2.0 --platform Linux-X64
```

Use `Windows-X64`, `macOS-ARM64` or `macOS-X64` on those systems. This writes the tag's version into your working tree, so discard that change afterwards. Output is saved under `release-dist/<tag>/<platform>`. Filenames come from `packages/releases/desktop-assets.json`.

## Offline and development

`ixos setup` downloads/verifies both models. `ixos model install code --from /path/to/code` and `ixos model install documents --from /path/to/documents` install verified local model bundles. `ixos setup --install --skip-models` repairs user engine/agent setup without downloading models.

`IXOS_ENGINE_PATH` selects an explicit compatible development engine. `IXOS_HOME` redirects Ixos installation/data/cache for portable testing; `IXOS_SKILL_HOME` redirects agent files. These overrides do not change the ordinary user's PATH.

## Removal

Uninstall the native application, then remove explicitly identified Ixos-owned data and the `ixos` MCP entries when a complete reset is intended. Keep unrelated agent configuration and custom skills. Never clear source repositories to remove an installation.
