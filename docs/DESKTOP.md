# Desktop

The tray app is the resident search process. The default global shortcut, Ctrl+Space, opens its quick-search overlay. The tray menu also opens search and Settings; closing a window hides it unless Quit on close is enabled.

On first run, choose one or more folders from anywhere; the picker accepts several at once. Documents and Desktop are suggestions, never preselected. If the shortcut is used before any folder is chosen, quick search offers the same picker. Ixos searches only chosen folders, honors ignore rules and skips symlinks and unhydrated cloud placeholders. Extracted text stays in memory up to 256 MiB in total; files past that are skipped and counted rather than failing the folder. Settings shows file counts and skipped files.

Launch warms the engine in the background through discover, lexical and semantic phases. Searches show keyword results first, then hybrid results from the selected code or documents model. Missing models leave keyword results available. Enter opens the selected file; Ctrl+Enter reveals it; Escape resets search in the main window and hides the overlay.

Settings contains locations, profile, result limit, caching, storage, models, shortcut, Quit on close and About. Storage shows each location's record count and bytes; Remove Ixos data first shows the removal plan and asks for confirmation. It uses the same core operation as `ixos cache clear` and preserves primary bytes, modified time and unrelated metadata. Recent searches keep a short local list of queries and locations.

The backend is `apps/desktop/src-tauri`, and React is `apps/desktop/ui`. One core engine holds all chosen locations. Main search and overlay share settings and search commands; changing location scope reuses the resident corpus and model. Shared search settings use `ixos/settings.toml`; desktop options, shortcut and recent searches use small files in the same configuration directory.

Build with `npm ci`, `npm run build`, then `npm run tauri:build -- --debug --no-bundle`. See [CONTRIBUTING.md](../CONTRIBUTING.md) for Rust checks and platform prerequisites.
