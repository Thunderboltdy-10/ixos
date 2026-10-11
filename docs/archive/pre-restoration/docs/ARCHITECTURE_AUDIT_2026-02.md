# Ixos Architecture Audit (2026-02)

## 1. Executive summary
Ixos is a local-first semantic file search stack with:
- Rust core retrieval/ranking pipeline (`src/ixos_rank`, `src/ixos_embed`)
- CLI orchestration (`src/main.rs`, `src/cli/*`)
- Tauri desktop bridge (`src-tauri/src/commands/*`)
- React desktop UI (`ui/src/*`)
- Next.js marketing/docs site (`ixos-site/src/*`)

This pass focused on naming unification, Deep Search behavior, Ask mode auto-detection, cache-mode semantics, desktop/landing UX, CI/release hardening, and CLI distribution scripts.

## 2. What changed in this overhaul
- Naming cleanup:
  - User-facing models now standardized to `Ixos Flash` / `Ixos Pro`.
  - User-facing cache labels standardized to `Memory` / `Local`.
  - Journalist mode repurposed and presented as `Deep Search`.
- Search behavior:
  - Deep Search now expands candidate and extraction caps instead of privacy wipe semantics.
  - Ask mode now runs as backend auto intent path and avoids forced Pro/slow full-scan fallback.
  - Memory mode clears in-memory cache at search entry to avoid cross-search reuse.
- Benchmark correctness:
  - `ixos-big-bench` warm labeling fixed (`query_idx > 0 || run_idx > 0`).
  - Directory walk timing now recorded per record from candidate stats.
- Desktop UX:
  - Ask toggle removed from input controls; backend auto remains.
  - Mode/model dropdown UX improved (fixed-position menu, clipping avoidance, hover detail panel).
  - Stream deck expanded to show files scanned / embeddings / cache hits / active file.
  - Settings panels visually normalized; cache clear wiring added.
- Landing/site:
  - Hero/demo copy and naming updated to Ixos Flash/Pro + Memory/Local/Deep Search.
  - Added Pro Features section and Download Actions (OS-aware desktop + CLI command).
  - Added docs pages: CLI reference + troubleshooting.
  - Docs agents page rewritten around actual AI-agent architecture guidance.
- CI/distribution:
  - Release workflow hardened with workspace UI install fallback and Windows model stub creation.
  - Tauri bundle model resource globs removed from packaging path (runtime download model strategy).
  - New CLI release workflow (`cli-v*`) added with packaged artifacts + sha256.
  - Installer scripts added: `scripts/install.sh`, `scripts/install.ps1`.

## 3. Architecture overview
- Rust core:
  - Candidate generation + lexical funnel in `src/ixos_rank/candidate_generator/*`
  - Semantic rerank + cache behavior in `src/ixos_rank/semantic_engine.rs`
  - Progressive orchestration + ask routing in `src/ixos_rank/progressive.rs`
- CLI:
  - command surface and flags in `src/cli/commands.rs`
  - runtime routing in `src/main.rs`
  - persisted config normalization in `src/cli/config.rs`
- Tauri:
  - search bridge/state in `src-tauri/src/commands/search.rs`, `src-tauri/src/state.rs`
  - config/cache commands in `src-tauri/src/commands/config.rs`
- Desktop UI:
  - state machine in `ui/src/stores/searchStore.ts`
  - history/state persistence in `ui/src/stores/starredStore.ts`
  - primary surface in `ui/src/components/search/*`
- Marketing/docs site:
  - page composition in `ixos-site/src/app/page.tsx`
  - hero/demo/pipeline sections under `ixos-site/src/components/*`
  - docs routes under `ixos-site/src/app/docs/*`

## 4. Key design decisions and trade-offs
- KEEP internal compatibility where low-risk:
  - Internal legacy identifiers remain in selected places for migration safety.
- REMOVE legacy runtime aliases for cache mode:
  - `jit/cache/persistent/nativecache` rejected in CLI/runtime parsing paths.
- Ask mode is backend-driven:
  - UI no longer drives ask-on/off overrides; frontend sends auto hint and reflects backend status.
- Deep Search persists history:
  - Unlike prior journalist behavior, deep-search results are now stored in history for continuity.
- CI model packaging:
  - Model artifacts are runtime/downloader concerns, not hard bundle resources.

## 5. Known remaining issues and gaps
- Some legacy `journalist` naming remains in internal symbols/comments for compatibility.
- UI build still emits non-blocking bundle-size and mixed static/dynamic import warnings.
- Next.js build warns about multi-lockfile workspace-root inference.
- Full cross-platform GitHub Actions execution cannot be fully proven locally; workflow logic was updated and linted by build-equivalent steps but requires remote run confirmation.

## 6. Performance baselines (current evidence)
- Canonical prior baseline snapshots remain in `PLAN.md` and `reports/ralph/*`.
- This pass validation samples:
  - `reports/big_bench_20260214_131205.json`
    - warm flag sequence validated: only first query/run marked cold
    - directory walk timing populated on every record
- Memory mode no-write verification on `corpus_tiny`:
  - `cache stats` before/after two memory searches remained `cached_files: 0`

## 7. Next roadmap suggestions
1. Finish full internal deep-search naming migration (`journalist` symbol debt).
2. Add strict same-suite quality delta checks to release gates.
3. Add workflow smoke jobs that validate uploaded installer/CLI assets post-release.
4. Split UI bundle using route-level/lazy chunks for lower initial payload.
5. Add deterministic benchmark environment controls to reduce p95 jitter.

## Top 10 files for a new AI agent
1. `docs/ARCHITECTURE_AUDIT_2026-02.md`
2. `CLAUDE.md`
3. `docs/Ixos_Master_Roadmap.md`
4. `src/main.rs`
5. `src/ixos_rank/semantic_engine.rs`
6. `ui/src/stores/searchStore.ts`
7. `ui/src/components/search/MainSearchView.tsx`
8. `src-tauri/src/commands/search.rs`
9. `ixos-site/src/app/page.tsx`
10. `.github/workflows/release.yml`

## Ralph Loop instructions for the next agent
1. Run:
   - `cargo test -q`
   - `cargo test --test settings_matrix -q`
2. Run frontend builds:
   - `npm --prefix ui run build`
   - `npm --prefix ixos-site run build`
3. Run loop:
   - `python scripts/ralph_loop.py --checkpoint R2 --bench-dir . --bench-runs 3 --objective-profile harsh`
4. After each change batch:
   - re-run validation
   - capture benchmark artifacts under `reports/`
   - produce before/after comparison table
5. Operate autonomously and iteratively until plateau.
6. Prioritize:
   - search latency reduction
   - deep-search quality and evidence depth
   - landing-page polish and conversion clarity
