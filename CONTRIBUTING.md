# Contributing

Install Rust, Node.js 22 or newer, and npm. Desktop builds also need Tauri's platform prerequisites: WebView2 and MSVC on Windows; GTK, WebKitGTK and app-indicator development libraries on Linux.

```sh
cargo build --release --locked -p ixos-cli
cargo fmt --all --check
cargo clippy --workspace --locked -- -D warnings
cargo test --workspace --locked
python -m unittest discover -s eval -p 'test_*.py'
npm ci
npm run build
npm run site:build
npm run tauri:build -- --debug --no-bundle
```

Build the desktop UI before workspace Rust tests: Tauri embeds `apps/desktop/ui/dist`. `npm run tauri:dev` runs the desktop development server; `npm run site:dev` starts the site. Evaluation needs `eval/requirements.txt`; ordinary Rust tests do not download models.

The workspace contains `crates/ixos-core` for search and storage, `crates/ixos-cli` for the CLI and MCP, and `apps/desktop/src-tauri` for the tray process. React and Next.js live in `apps/desktop/ui` and `apps/site`; `packages/` holds their shared UI. `eval/` reproduces retrieval results, `scripts/models.py` builds models, and `docs/history/` preserves historical documents.

Use the same domain names throughout: location for a searched folder, profile for code or documents, mode for lexical/semantic/hybrid, result for a ranked file, snippet for its excerpt, record for per-file embedding data, and cache for all records. Keep one implementation per behavior, remove unused flags and dead code, and add only real user choices.

Comments should explain why. Keep modules and docs short, and use ordinary readable code. Tests should prove behavior, especially source freshness, output coordinates and metadata clearing; they must not modify a user's primary file. Honor ignore rules and do not follow source symlinks.

Historical documents are immutable; edit their human index rather than their contents. Keep models, raw evaluation outputs, local credentials and development notes out of Git. Use conventional commit messages without generated trailers. Workflows are manual-only until the owner enables them.

The site deployment project root must be `apps/site`. Its Releases URL is in `apps/site/src/lib/downloads.ts`. Confirm published model repository IDs and immutable revisions in `crates/ixos-core/src/model/install.rs`; run the maintainer publish command only when the owner is ready to upload.
