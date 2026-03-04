# PLAN.md - Ixos Flash v2 + Pro v2 + Search vNext

## STATE SNAPSHOT (update frequently)
- Date: 2026-02-09
- Current baseline models: Flash v1 (legacy), Pro fusion baseline = Flash v1 + Potion + lexical (see models/lab/results_baseline_fusion_2026-02-02.json)
- Baseline quality (MRR@10 / Recall@10): Flash v1 0.8399 / 0.93; Potion 0.8073 / 0.90; Pro v1 0.7354 / 0.855; Pro fusion 0.9233 / 0.97 (real_corpus_v2)
- Baseline perf (p50/p95, ms/1k, TTFR): Flash v1 JIT total 70/337, TTFR 47/73; Potion JIT total 71/202, TTFR 45/61; Pro v1 JIT total 72/401, TTFR 45/62
- Current v2 models: Flash v2 (int8, 512d) default; Pro v2 = Flash v2 + Potion + lexical cascade
- Current v2 quality metrics: Flash v2 MRR@10 0.8340, Recall@10 0.925, 339.76 ms/1k (canonical). Pro v2 canonical: MRR@10 0.9209, Recall@10 0.97, 430.57 ms/1k.
- Current repo-scale E2E perf (`--dir .`, JIT, 3 queries x2 runs): Flash avg 16,838.65 ms; Auto avg 15,754.25 ms (see reports/v2_repo_latency_after_auto_index_fix_summary_2026-02-05_221919.json)
- Previous repo-scale E2E perf before rescue: Flash avg 17,153.32 ms; Auto avg 33,289.55 ms; Pro avg 32,985.66 ms (see reports/v2_repo_latency_summary_2026-02-05_213420.json)
- Delta achieved in this pass: Auto -52.68% average latency on large repo (33,289.55 -> 15,754.25 ms)
- CLI cleanup (2026-02-09): Removed Pro-gated commands (workstream, activity, ranking) from CLI; CLI now shows only core commands (search, index, config, daemon, cache, compliance, doctor, version, model)
- Recent regression fix (2026-02-05): Candidate document phase is now gated by query/path document signals to avoid unconditional binary parsing on code-only queries.
- Recent correctness fix (2026-02-05): `.env` removed from shared hardcoded skip list so env files are not silently excluded by walker entry-name filtering.
- Recent UX/runtime fix (2026-02-05): Streaming deck now resets per-search and stage updates are normalized; Auto mode no longer eagerly indexes Pro in Tauri path, improving perceived startup responsiveness for stream events.
- Recent landing/docs pass (2026-02-06): Hero + search pipeline storytelling was rebuilt with smoother scroll choreography, auth readability hardening landed for web/desktop, and docs were centralized with a full markdown inventory index.
- Feedback revision (2026-02-06): Pipeline demo now runs in scroll-guided mode without autonomous loops, hero demo remains visible/centered from initial hero state, diagrams were upgraded with richer motion semantics, docs were split into multi-page IA, and non-operational root markdown files were moved into `docs/archive/root`.
- Feedback revision (2026-02-06, pass 2): Removed hero radiating pulse effect, reduced hero demo height / widened layout for better proportion, stabilized controlled stage progression by pause-resume (no repeated scan/embed/rank restarts), simplified pipeline story block to text-forward copy, and upgraded docs readability with dedicated docs nav + long-form typography system.
- Feedback revision (2026-02-06, pass 3): Increased hero/pipeline scale after pass-2 overshrink, widened central demo and surrounding stage tiles, and raised baseline contrast/opacity for inactive and complete cards to improve readability.
- Feedback revision (2026-02-08, release hardening): Desktop now uses channel-only progressive event delivery, Pro access checks are unified across tabs, pricing overlay events are wired globally, release env validation was added (`tauri:build:prod`), footer `/terms` routing was corrected, and hero demo interactivity is restored in hero stage while remaining frozen in scroll-guided pipeline mode.
- Feedback revision (2026-02-08, prod entitlement hardening pass 2): Pro-mode search is now capability-gated in Rust (free users are forced to Flash for Auto and blocked from Pro), token-plan fallback no longer promotes free users to Pro in desktop UI, lease refresh/transfer confirm now issue subscription-bounded tokens, Firefox arc-noise parity fallback shipped, and release script `tauri:build` now enforces required prod env vars by default.
- Feedback revision (2026-02-08, prod entitlement hardening pass 3): startup Pro mode preference is no longer downgraded during transient entitlement load, desktop can fetch/install JWT verification public key at runtime (`/api/desktop/entitlement-key` + `set_entitlement_public_key`) to recover release builds missing compile-time key, entitlement refresh now actively re-syncs backend token/status, and landing demo loop/result visibility and Firefox noise parity were further stabilized.
- Feedback revision (2026-02-08, prod entitlement hardening pass 4): backend now permits Flash fallback when entitlement token sync is missing (while still blocking Pro mode), auth bootstrap now purges invalid cached tokens, Pro status polling is token-aware to avoid transient startup expiry mislabels, dropdown/sidebar/settings sizing was normalized for consistency, and golden harness path normalization removed Windows prefix false negatives.
- Feedback revision (2026-02-08, prod entitlement hardening pass 5): desktop JWT verification now refreshes runtime keys without sticky cache, landing/desktop logos were replaced with regenerated high-coverage icon packs (including tray/favicon/bundles), Firefox arc-noise intensity was reduced to match Chromium, hero demo handoff threshold was tuned to avoid frozen loop state when returning to hero, and local release packaging now passes end-to-end with MSI + NSIS artifacts built.
- Feedback revision (2026-02-08, search correctness patch): Flash/Auto desktop searches now run lexical preflight and force semantic eager indexing only when lexical hits are zero, restoring pure-semantic fallback while preserving low-latency lexical-first behavior.
- Feedback revision (2026-02-08, Phase 0.1 reliability patch): removed dead `index --watch` exposure, hid daemon `--status/--stop` from help, implemented `cache mode` persistence to config, implemented `index --clear` cache deletion, and implemented functional `cache rebuild` embedding warmup.
- Feedback revision (2026-02-08, Phase 0-2 closure pass): added doctor diagnostics end-to-end (CLI + desktop), shipped settings matrix automation + CI workflow, implemented encrypted activity/workstream persistence with autosave, shipped personal ranking (pin/ignore/not-relevant + explain path), fixed workstream persistence path mismatch, and validated release packaging (MSI + NSIS) plus golden/contract/settings matrix/doctor sweeps.
- Feedback revision (2026-02-08, cache truthfulness hardening): CLI search now respects persisted cache mode (unless explicitly overridden), cache stats are model-aware with fallback detection for mixed fingerprints, and cache clear/index-clear now reliably clear ADS/xattr plus LMDB fallback state.
- Cache correctness update (2026-02-08): embedding caches are now validated by both file hash and model fingerprint; edited files and model switches trigger recomputation automatically.
- Top bottlenecks (ranked): Directory walk/candidate generation on large trees; ripgrep scan I/O; semantic embedding on cold runs; completion-path evidence extraction tail
- Open risks / unknowns: Multilingual routing remains unevaluated (ES/FR/DE slice pending); remaining golden retrieval mismatches (`q1_financial_report`, `q2_financial_report`, `privacy_policy`, `config_json`, `todo_refine`, `logs_streamed`) require ranking/candidate investigation; lexical-preflight branch should be profiled on very large trees to quantify preflight overhead; cache rebuild still precomputes sequentially (`workers` currently informational only).
- Next 3 actions: (1) run multilingual ES/FR/DE quality slice for decision gate, (2) investigate remaining golden retrieval mismatches, (3) profile lexical-preflight overhead on large trees

---

## Objectives
1) Flash v2: faster + equal/better relevance than Flash v1
2) Pro v2: true Pro (fusion/cascade or single model distill) beats current Pro fusion or matches with lower latency
3) End-to-end search: reduce p95 materially; improve perceived latency
4) Naming: eliminate "pro-v1" confusion; make IDs canonical
5) Ship: docs + manifests + HF upload plan

---

## Workstreams
### WS1 - Reality map & naming audit
- [x] Map current defaults (CLI/UI/registry)
- [x] Identify where "Pro" is forced
- [x] Locate any "flash-v2" that is actually v1 renamed
- [x] Draft naming migration plan

### WS2 - Baseline measurement (real models)
- [x] Build release
- [x] Run canonical evals (Flash/Potion/Pro fusion/legacy pro-v1)
- [x] Run perf bench/profile
- [x] Store outputs under /reports + /models/lab

### WS3 - Bottlenecks & pipeline speedups
- [x] Instrument stage timings if missing
- [x] Profile ranking vs embedding vs ripgrep vs candidate gen
- [x] Implement top-ROI changes (ranking top-k, cached file list reuse, Pro v2 cascade)

### WS4 - Flash v2 model generation
- [x] Candidate strategy list (>=6)
- [x] Train/bake-off
- [x] Select winner, export, document

### WS5 - Pro v2 definition + implementation
- [x] Decide: fusion v2 vs single model distill
- [x] Implement cascade/fusion improvements
- [x] Re-eval and finalize (smoke)

### WS6 - Multilingual decision
- [ ] ES/FR/DE eval slice
- [ ] Decide route/optional models/backlog

### WS7 - Shipping
- [x] Update docs + changelogs + final writeup
- [x] Update installer/manifests
- [x] HF upload playbook
- [x] Verify CLI+UI

---

## Exit criteria
- [ ] Flash v2 + Pro v2 integrated and selectable correctly
- [ ] Benchmarks: before/after captured
- [ ] Docs updated, naming clean
- [ ] HF plan written

---

## STATE SNAPSHOT
- Date: 2026-02-10
- Current baseline numbers:
  - Flash v1: MRR@10 0.8399, Recall@10 0.93, 423.09 ms/1k
  - Pro fusion baseline: MRR@10 0.9233, Recall@10 0.97 (real_corpus_v2)
- Current best v2 numbers:
  - Flash v2: MRR@10 0.8340, Recall@10 0.925, 339.76 ms/1k
  - Pro v2 fusion: MRR@10 0.9209, Recall@10 0.97, 430.57 ms/1k
- Current bottleneck ranking:
  1. Candidate generation and directory walk on large trees
  2. Ripgrep scan I/O on broad queries
  3. Semantic embedding cold-path startup and tail extraction
- Current pass validation (2026-02-10):
  - `cargo test -q`: PASS (`466 passed; 0 failed; 6 ignored`)
  - `npm --prefix ui run build`: PASS
  - `npm --prefix ixos-site run build`: PASS
  - `python scripts/run_settings_matrix.py`: PASS (`reports/settings_matrix_2026-02-10.md`)
  - `cargo run --quiet --bin ixos -- doctor --json`: PASS (`8 pass; 0 warn; 0 fail; 2 info`)
- What is next (top 3 tasks):
  1. Complete explicit E2E auth/billing/lease transfer matrix run and capture a dedicated report
  2. Add deeper landing Strategy section lock tests on low-end hardware profiles
  3. Expand move recommendation feedback loop (accept/dismiss) and add persistence-backed evaluation hooks

## STATE SNAPSHOT (Prism R1, 2026-02-13)
- Date: 2026-02-13
- Current baseline numbers:
  - Ralph R0 baseline bench (`reports/ralph/v2_bench_1_20260213_171835.json`): TTFR p50 226ms, Total p95 555ms, cache hit rate 0.0707.
- Current best v2 numbers:
  - Big-root harness (`reports/ralph/big_bench_20260213_174232.json`, Tier C, 179,926 files, 40 queries x 3 runs):
    - TTFR p50 32ms
    - Total p95 47ms
    - Cold TTFR p50 32ms
    - Cold Total p95 51ms
    - Warm Total p95 47ms
    - Avg cache hit rate 0.99995
    - Gate: PASS
- Current bottleneck ranking:
  1. Ripgrep scan (`ripgrep_ms` avg 24.44ms)
  2. Ranking tail outliers (`rank_ms` max 96ms, avg 1.01ms)
  3. Cold initial walk/index build (`walk_ms` max 88ms, avg 0.73ms)
- What is next (top 3 tasks):
  1. Implement Phase 2 frontier-first candidate traversal + background phase-2 walk.
  2. Implement write-behind cache wrapper for NativeCache hot-path write removal.
  3. Expose Ask Mode in CLI (`--ask`/`--ask-mode`) with evidence-gated answer card output.

## STATE SNAPSHOT (Prism R1.2, 2026-02-13)
- Date: 2026-02-13
- Latest Ralph checkpoint: `reports/ralph/iteration_12_20260213_181349.md` (PASS)
- Latest big-root benchmark: `reports/ralph/big_bench_20260213_181435.json` (Tier C, harsh profile)
  - TTFR p50: 30ms
  - TTFR p95: 45ms
  - Total p50: 31ms
  - Total p95: 47ms
  - Cold TTFR p50: 30ms
  - Cold Total p95: 47ms
  - Warm Total p95: 47ms
  - Ripgrep p95: 27ms
  - Harsh gate: PASS
- Before/after comparison (turn aggregate): `reports/ralph/comparison_turn_20260213_181435.md`
  - Net vs 17:50 benchmark: mostly stable; cold total improved, ripgrep p95 improved, slight TTFR p50 +1ms variance.
- Quality evidence refreshed:
  - `models/lab/results_prism_iter_2026-02-13.json`
  - Note: current quality delta report mixes suite scopes; use same-suite files for release signoff.
- Current bottleneck ranking:
  1. Ripgrep p95 variability across query classes
  2. Query-specific spikes (`model download`, `lexical engine`, `daemon status`)
  3. Remaining naming/enum debt in internal UI mode types (`cache/jit` internals)
- What is next (top 3 tasks):
  1. Implement same-suite quality comparator and enforce it in `release-check`.
  2. Normalize internal UI mode types to `native-cache`/`ephemeral` end-to-end (remove legacy-only internals).
  3. Extend CI with installer/blob smoke validation using generated release artifacts.

## STATE SNAPSHOT (Prism R1.3, 2026-02-13)
- Date: 2026-02-13
- Latest Ralph checkpoint: `reports/ralph/iteration_13_20260213_231055.md` (PASS)
- Latest harsh benchmark (5 runs): `reports/ralph/big_bench_20260213_231310.json`
  - TTFR p50: 33ms
  - TTFR p95: 47ms
  - Total p50: 34ms
  - Total p95: 50ms
  - Cold TTFR p50: 34ms
  - Cold Total p95: 51ms
  - Warm Total p95: 49ms
  - Ripgrep p95: 30ms
  - Harsh gate: PASS
- Latest quality refresh:
  - `models/lab/results_prism_iter_2026-02-13_post_ui.json`
  - Synthetic ambiguity remains stable: Flash `mrr_at_10=0.9444`, Potion `mrr_at_10=0.9611`.
- Current bottleneck ranking:
  1. Ripgrep stage p95 variability (+11% vs prior turn benchmark)
  2. Minor TTFR drift under stricter repeated runs (+10% vs prior turn benchmark)
  3. UI bundle size warning (`ui` chunk >500kB) for future split optimization
- What is next (top 3 tasks):
  1. Implement same-suite quality comparator gate in `release-check` to make quality deltas strict and apples-to-apples.
  2. Add deterministic bench environment controls (CPU affinity/process priority/warmup policy) to reduce p95 jitter.
  3. Add CI installer/blob smoke checks matching release artifact workflow outputs.

## STATE SNAPSHOT (Overhaul Integration, 2026-02-14)
- Date: 2026-02-14
- Current baseline numbers:
  - Flash v1: MRR@10 0.8399, Recall@10 0.93, 423.09 ms/1k
  - Pro fusion baseline: MRR@10 0.9233, Recall@10 0.97 (real_corpus_v2)
- Current best v2 numbers:
  - Flash v2: MRR@10 0.8340, Recall@10 0.925, 339.76 ms/1k
  - Pro v2 fusion: MRR@10 0.9209, Recall@10 0.97, 430.57 ms/1k
- Current bottleneck ranking:
  1. Ripgrep I/O variance on large trees
  2. Ranking tail p95 spikes on specific query classes
  3. UI initial bundle size (desktop web assets)
- Current pass validation (2026-02-14):
  - `cargo test -q`: PASS (`467 passed; 0 failed; 6 ignored`)
  - `cargo test --test settings_matrix -q`: PASS
  - `python scripts/run_settings_matrix.py`: PASS (`reports/settings_matrix_2026-02-14.md`)
  - `npm --prefix ui run build`: PASS
  - `npm --prefix ixos-site run build`: PASS
  - `cargo build --release`: PASS
  - CLI smoke:
    - `target/release/ixos.exe search "test" --dir . --stub-model --format json --limit 1`: PASS
    - `target/release/ixos.exe search "test" --deep-search --dir . --stub-model --format json --limit 1`: PASS
    - Memory mode cache check on `corpus_tiny` (before/mid/after `cache stats`): `cached_files` stayed `0`
    - Ask auto status check (`what is the main config?` with progressive): backend emitted `Ask Mode active: understanding your question...`
  - Benchmark harness check:
    - `target/release/ixos-big-bench.exe --dir corpus_tiny --queries-file reports/tmp_bench_queries.json --runs 2 ...`: warm/cold labeling and per-record `walk_ms` verified (`reports/big_bench_20260214_131205.json`)
- What is next (top 3 tasks):
  1. Remove remaining internal `journalist` symbol debt in Tauri/UI internals.
  2. Add release-asset smoke checks in CI (post-upload verification).
  3. Run full remote GitHub Actions validation on branch and capture run links in `/reports`.

## STATE SNAPSHOT (Landing/Desktop follow-up completion, 2026-02-14)
- Date: 2026-02-14
- Current baseline numbers:
  - Flash v1: MRR@10 0.8399, Recall@10 0.93, 423.09 ms/1k
  - Pro fusion baseline: MRR@10 0.9233, Recall@10 0.97
- Current best v2 numbers:
  - Flash v2: MRR@10 0.8340, Recall@10 0.925, 339.76 ms/1k
  - Pro v2 fusion: MRR@10 0.9209, Recall@10 0.97, 430.57 ms/1k
- Current bottleneck ranking:
  1. Ripgrep I/O variance on large trees
  2. Ranking tail p95 spikes on specific query classes
  3. Desktop web bundle size (`ui` chunk >500kB)
- Current pass validation (2026-02-14 follow-up):
  - `cargo test test_unknown_cache_mode_is_preserved_on_load -- --nocapture`: PASS
  - `cargo test test_cache_mode_aliases_are_normalized -- --nocapture`: PASS
  - `cargo test -p ixos-app parse_cache_mode_rejects_legacy_aliases -- --nocapture`: PASS
  - `npm ci --prefer-offline --no-audit`: PASS
  - `npm run --workspace ui build`: PASS
  - `npm --prefix ixos-site run build`: PASS
- What is next (top 3 tasks):
  1. Run GitHub-hosted CI workflows and capture links/artifacts in `/reports`.
  2. Decide on single-lockfile vs multi-lockfile strategy for monorepo to remove Next root warning.
  3. Continue visual QA on landing + desktop for final branding parity against the desktop app.

## STATE SNAPSHOT (Landing hero correction pass, 2026-02-14)
- Date: 2026-02-14
- Current baseline numbers:
  - Flash v1: MRR@10 0.8399, Recall@10 0.93, 423.09 ms/1k
  - Pro fusion baseline: MRR@10 0.9233, Recall@10 0.97
- Current best v2 numbers:
  - Flash v2: MRR@10 0.8340, Recall@10 0.925, 339.76 ms/1k
  - Pro v2 fusion: MRR@10 0.9209, Recall@10 0.97, 430.57 ms/1k
- Current bottleneck ranking:
  1. Ripgrep I/O variance on large trees
  2. Ranking tail p95 spikes on specific query classes
  3. Desktop web bundle size (`ui` chunk >500kB)
- Current pass validation (2026-02-14 hero follow-up):
  - `npm run --workspace ixos-site build`: PASS
  - `npm run --workspace ui build`: PASS
- What is next (top 3 tasks):
  1. Execute tagged remote workflow smoke (`v*` and `cli-v*`) and capture run URLs in `/reports`.
  2. If needed, add sticky-layout fallback for hero on low-power devices.
  3. Continue landing/desktop visual parity QA and remaining interaction polish.

## STATE SNAPSHOT (UI/Pro Experience Completion, 2026-02-15)
- Date: 2026-02-15
- Current baseline numbers:
  - Flash v1: MRR@10 0.8399, Recall@10 0.93, 423.09 ms/1k
  - Pro fusion baseline: MRR@10 0.9233, Recall@10 0.97
- Current best v2 numbers:
  - Flash v2: MRR@10 0.8340, Recall@10 0.925, 339.76 ms/1k
  - Pro v2 fusion: MRR@10 0.9209, Recall@10 0.97, 430.57 ms/1k
- Current bottleneck ranking:
  1. Ripgrep I/O variance on large trees
  2. Ranking tail p95 spikes on specific query classes
  3. Desktop/landing asset size + lockfile-root warnings
- Current pass validation (2026-02-15):
  - `npm --prefix ui run build`: PASS
  - `npm --prefix ixos-site run build`: PASS
  - `cargo test`: PASS
  - `cargo clippy -q`: PASS with warnings
  - `cargo test -q ixos_rank::progressive::tests::test_ask_mode_respects_selected_model`: PASS
  - `cargo check -q`: PASS
- Artifact:
  - `reports/ui_pro_features_overhaul_2026-02-15.md`
- What is next (top 3 tasks):
  1. Run live manual QA on desktop auth/search/today/workstreams with real file trees and capture UX evidence screenshots/GIFs.
  2. Add Ask Mode trigger-reason telemetry and threshold tuning loop from real user queries.
  3. Extract shared dropdown/design primitives between desktop UI and landing demo for guaranteed parity.

## STATE SNAPSHOT (Pro UX + release hardening, 2026-02-15)
- Date: 2026-02-15
- Current baseline numbers:
  - Flash v1: MRR@10 0.8399, Recall@10 0.93, 423.09 ms/1k
  - Pro fusion baseline: MRR@10 0.9233, Recall@10 0.97
- Current best v2 numbers:
  - Flash v2: MRR@10 0.8340, Recall@10 0.925, 339.76 ms/1k
  - Pro v2 fusion: MRR@10 0.9209, Recall@10 0.97, 430.57 ms/1k
- Current bottleneck ranking:
  1. Ripgrep I/O variance on large trees
  2. Ranking tail p95 spikes on specific query classes
  3. Workspace-wide clippy lint debt under strict `-D warnings`
- Current pass validation (2026-02-15):
  - `npm --prefix ui run build`: PASS
  - `npm --prefix ixos-site run build`: PASS
  - `cargo test -q`: PASS (`468 passed; 0 failed; 6 ignored`)
  - `bash -n scripts/install.sh`: PASS
  - PowerShell parser check for `scripts/install.ps1`: PASS
  - `./scripts/install.ps1 -Tag cli-v0.0.0 -AssetUrl <local zip> -SkipPathPersist`: PASS
  - PATH smoke: `ixos --version` + `ixos search ...`: PASS
- What is next (top 3 tasks):
  1. Run hosted GitHub Actions for `cli-v*` and `v*` tags to validate release publishing with real secrets/signing.
  2. Add installer default-repo metadata smoke in CI to prevent slug regressions.
  3. Start dedicated clippy cleanup pass if strict warning-free Rust gate is required for release policy.

## STATE SNAPSHOT (Landing interaction correction pass, 2026-02-15)
- Date: 2026-02-15
- Current baseline numbers:
  - Flash v1: MRR@10 0.8399, Recall@10 0.93, 423.09 ms/1k
  - Pro fusion baseline: MRR@10 0.9233, Recall@10 0.97
- Current best v2 numbers:
  - Flash v2: MRR@10 0.8340, Recall@10 0.925, 339.76 ms/1k
  - Pro v2 fusion: MRR@10 0.9209, Recall@10 0.97, 430.57 ms/1k
- Current bottleneck ranking:
  1. Landing scroll choreography tuning under diverse viewport/device profiles
  2. Ripgrep I/O variance on large trees
  3. Workspace-wide strict clippy lint debt (`-D warnings`)
- Current pass validation (2026-02-15):
  - `npm --prefix ixos-site run build`: PASS
  - `npm --prefix ui run build`: PASS
  - `cargo test -q`: PASS (`468 passed; 0 failed; 6 ignored`)
- What is next (top 3 tasks):
  1. Manual visual QA pass on hero/pipeline layering + demo interaction at desktop breakpoints.
  2. Fine-tune ScrollTrigger thresholds only if residual flicker remains in QA recordings.
  3. Continue Pro feature clarity iteration using user feedback from Today/Workstreams adoption.

## STATE SNAPSHOT (Release + landing audit pass, 2026-02-16)
- Date: 2026-02-16
- Current baseline numbers:
  - Flash v1: MRR@10 0.8399, Recall@10 0.93, 423.09 ms/1k
  - Pro fusion baseline: MRR@10 0.9233, Recall@10 0.97
- Current best v2 numbers:
  - Flash v2: MRR@10 0.8340, Recall@10 0.925, 339.76 ms/1k
  - Pro v2 fusion: MRR@10 0.9209, Recall@10 0.97, 430.57 ms/1k
- Current bottleneck ranking:
  1. Hosted runner variance for macOS/Linux release packaging
  2. Hero scroll choreography sensitivity on lower-power devices
  3. Workspace-wide strict lint/clippy debt outside release-critical paths
- Current pass validation (2026-02-16):
  - `bash -n scripts/install.sh`: PASS
  - PowerShell parser check for `scripts/install.ps1`: PASS
  - `python -c "...yaml.safe_load(...)"` over `.github/workflows/*.yml`: PASS
  - `npm --prefix ixos-site run build`: PASS
  - `cd ixos-site; npx eslint <changed-landing-files>`: PASS
- What is next (top 3 tasks):
  1. Trigger real tag pipelines (`cli-v*`, `v*`) to validate macOS/Linux signing + upload behavior with live secrets.
  2. Run manual browser QA for pricing-to-pro card transfer motion on desktop and mobile breakpoints.
  3. Add CI smoke checks for release artifact names consumed by `scripts/generate-latest-json.js`.

## STATE SNAPSHOT (Landing polish pass 2, 2026-02-16)
- Date: 2026-02-16
- Current baseline numbers:
  - Flash v1: MRR@10 0.8399, Recall@10 0.93, 423.09 ms/1k
  - Pro fusion baseline: MRR@10 0.9233, Recall@10 0.97
- Current best v2 numbers:
  - Flash v2: MRR@10 0.8340, Recall@10 0.925, 339.76 ms/1k
  - Pro v2 fusion: MRR@10 0.9209, Recall@10 0.97, 430.57 ms/1k
- Current bottleneck ranking:
  1. Real GitHub tag release validation (secrets/signing dependent)
  2. Pipeline scroll choreography QA across devices
  3. Final landing visual consistency pass from user screenshot feedback
- Current pass validation (2026-02-16):
  - `cd ixos-site; npx eslint <updated landing/pricing/download files>`: PASS
  - `npm --prefix ixos-site run build`: PASS
- What is next (top 3 tasks):
  1. Run live `cli-v*` and `v*` Actions tags.
  2. Capture desktop/mobile recordings for pipeline and Pro-card handoff.
  3. Apply any final spacing/typography micro-tuning from visual QA.

## STATE SNAPSHOT (Release fix + landing refinement pass, 2026-02-16)
- Date: 2026-02-16
- Current baseline numbers:
  - Flash v1: MRR@10 0.8399, Recall@10 0.93, 423.09 ms/1k
  - Pro fusion baseline: MRR@10 0.9233, Recall@10 0.97
- Current best v2 numbers:
  - Flash v2: MRR@10 0.8340, Recall@10 0.925, 339.76 ms/1k
  - Pro v2 fusion: MRR@10 0.9209, Recall@10 0.97, 430.57 ms/1k
- Current bottleneck ranking:
  1. Live GitHub tag release validation for cross-runner packaging/publish
  2. Final visual QA of hero pipeline scroll under varied devices
  3. Remaining copy/motion polish from stakeholder feedback loops
- Current pass validation (2026-02-16):
  - `npm --prefix ixos-site run lint -- <changed files>`: PASS
  - `npm --prefix ixos-site run build`: PASS
- What is next (top 3 tasks):
  1. Trigger real `cli-v*` and `v*` workflows and confirm publish succeeds on macOS/Linux.
  2. Capture short desktop/mobile recordings for the pipeline and Pro-card handoff.
  3. Do a final text/copy micro-polish on Today/Workstreams after visual review.
## STATE SNAPSHOT (Publish reliability + marketing density pass, 2026-02-16)
- Date: 2026-02-16
- Current baseline numbers:
  - Flash v1: MRR@10 0.8399, Recall@10 0.93, 423.09 ms/1k
  - Pro fusion baseline: MRR@10 0.9233, Recall@10 0.97
- Current best v2 numbers:
  - Flash v2: MRR@10 0.8340, Recall@10 0.925, 339.76 ms/1k
  - Pro v2 fusion: MRR@10 0.9209, Recall@10 0.97, 430.57 ms/1k
- Current bottleneck ranking:
  1. Live Actions validation for `cli-v*` and `v*` publish jobs
  2. Final visual QA calibration for section copy density and spacing
  3. Cross-device scroll choreography tuning edge cases
- Current pass validation (2026-02-16):
  - `python -c "...yaml.safe_load..."` over workflows: PASS
  - `npm --prefix ixos-site run lint -- <updated sections>`: PASS
  - `npm --prefix ixos-site run build`: PASS
- What is next (top 3 tasks):
  1. Trigger one `cli-v*` run and verify `publish-to-releases` completes.
  2. Trigger one `v*` run and verify draft-download/copy/upload path completes.
  3. Capture final screenshots and trim any remaining verbose copy.
## STATE SNAPSHOT (Motion smoothing + hydration-safe detection + Workstreams redesign, 2026-02-16)
- Date: 2026-02-16
- Current baseline numbers:
  - Flash v1: MRR@10 0.8399, Recall@10 0.93, 423.09 ms/1k
  - Pro fusion baseline: MRR@10 0.9233, Recall@10 0.97
- Current best v2 numbers:
  - Flash v2: MRR@10 0.8340, Recall@10 0.925, 339.76 ms/1k
  - Pro v2 fusion: MRR@10 0.9209, Recall@10 0.97, 430.57 ms/1k
- Current bottleneck ranking:
  1. Live Actions proof for publish-to-releases on both tag flows
  2. Final subjective motion tuning for Pro-card handoff thresholds
  3. Final cross-section brand polish after screenshot QA
- Current pass validation (2026-02-16):
  - `npm --prefix ixos-site run lint -- <changed files>`: PASS
  - `npm --prefix ixos-site run build`: PASS
- What is next (top 3 tasks):
  1. Run `cli-v*` and `v*` workflows to confirm live publish behavior.
  2. Review Pro-card motion feel in browser and adjust threshold constants if needed.
  3. Finalize one more copy/spacing polish pass if any section still feels template-like.## STATE NOTE (2026-02-16, release reliability patch)
- Desktop release postprocess path added for existing tags (`.github/workflows/release-postprocess.yml`).
- Desktop release now bundles real Flash v2 + Potion model assets in installer resources and fails CI if model weights are missing/suspiciously small.
- CLI update/install reliability patched (PowerShell null-safe checksum parse + semver tag resolution, Unix staged rename for ETXTBSY).
- CLI install commands now target release assets (`install.sh`, `install.ps1`) published by CLI release workflow.
## STATE NOTE (2026-02-16, pre-v0.1.7 blockers resolved)
- Desktop release no longer requires pre-checked-in model files; it now fetches missing Flash/Potion assets and validates before packaging.
- Desktop and CLI releases both publish installer scripts to `ixos-releases` so `latest/download/install.*` remains available.
- `install.sh` semver selection is now portable on macOS (no GNU `sort -V` dependency).

## STATE SNAPSHOT (Landing /4 V4 completion, 2026-02-26)
- Date: 2026-02-26
- Current baseline numbers:
  - Flash v1: MRR@10 0.8399, Recall@10 0.93, 423.09 ms/1k
  - Pro fusion baseline: MRR@10 0.9233, Recall@10 0.97
- Current best v2 numbers:
  - Flash v2: MRR@10 0.8340, Recall@10 0.925, 339.76 ms/1k
  - Pro v2 fusion: MRR@10 0.9209, Recall@10 0.97, 430.57 ms/1k
- Current bottleneck ranking:
  1. Final visual/motion QA on `/4` hero + long-scroll pacing across device classes
  2. Pre-existing `_v4` lint debt in earlier section files
  3. Remaining release workflow validation on live tag runs
- Current pass validation (2026-02-26):
  - `npm --prefix C:/Users/pablo/Downloads/Ixos/ixos-site run build`: PASS
  - `/4` orchestrator now imports `_v4/*` only with content-matrix source references
- What is next (top 3 tasks):
  1. Record desktop/mobile QA passes for `/4` and trim any motion/copy overload spots.
  2. Execute a focused lint-hardening pass for legacy `_v4` files without changing section behavior.
  3. If required, wire live pricing data source into `/4` to support explicit numeric plan copy safely.

## STATE SNAPSHOT (/4 spatial redesign pass, 2026-02-26)
- Date: 2026-02-26
- Current baseline numbers:
  - Flash v1: MRR@10 0.8399, Recall@10 0.93, 423.09 ms/1k
  - Pro fusion baseline: MRR@10 0.9233, Recall@10 0.97
- Current best v2 numbers:
  - Flash v2: MRR@10 0.8340, Recall@10 0.925, 339.76 ms/1k
  - Pro v2 fusion: MRR@10 0.9209, Recall@10 0.97, 430.57 ms/1k
- Current bottleneck ranking:
  1. Final human visual QA/tuning for spatial camera intensity and comfort on `/4`
  2. Existing lint debt in older untouched `_v4` modules
  3. Release workflow live tag validation
- Current pass validation (2026-02-26):
  - `npm --prefix C:/Users/pablo/Downloads/Ixos/ixos-site run build`: PASS
  - `eslint` PASS on newly changed spatial files (`page.tsx`, `V4Loader`, `V4SpatialStage`, `V4ResultNode`)
- What is next (top 3 tasks):
  1. Run manual browser QA recordings (desktop/mobile) for the new search-flight experience.
  2. Tweak camera transforms/flicker amplitude based on comfort and readability.
  3. Optionally add user-selectable camera intensity mode if feedback remains split.

## STATE SNAPSHOT (/4 WebGL rail + desktop token alignment pass, 2026-02-26)
- Date: 2026-02-26
- Current baseline numbers:
  - Flash v1: MRR@10 0.8399, Recall@10 0.93, 423.09 ms/1k
  - Pro fusion baseline: MRR@10 0.9233, Recall@10 0.97
- Current best v2 numbers:
  - Flash v2: MRR@10 0.8340, Recall@10 0.925, 339.76 ms/1k
  - Pro v2 fusion: MRR@10 0.9209, Recall@10 0.97, 430.57 ms/1k
- Current bottleneck ranking:
  1. Per-device comfort tuning for new `/4` WebGL camera rail intensity
  2. Remaining lint debt in older untouched `_v4` modules (`V4Hero`, `V4Pipeline`, `V4CLI`)
  3. Final content polish pass to tighten desktop-term consistency across all cards
- Current pass validation (2026-02-26):
  - `npx eslint src/app/4/page.tsx src/app/4/_v4/V4SpatialStage.tsx src/app/4/_v4/V4ResultSpace.tsx src/app/4/_v4/V4ResultNode.tsx src/app/4/_v4/V4Comparison.tsx`: PASS
  - `npm --prefix C:/Users/pablo/Downloads/Ixos/ixos-site run build`: PASS
- What is next (top 3 tasks):
  1. QA desktop/mobile recordings for camera rail comfort and readability.
  2. Decide whether to add a user-facing camera intensity toggle (default/cinematic).
  3. Run a focused lint-hardening pass for older `_v4` files without behavior changes.

## STATE SNAPSHOT (/4 no-WebGL pivot + centered desktop shell pass, 2026-02-26)
- Date: 2026-02-26
- Current baseline numbers:
  - Flash v1: MRR@10 0.8399, Recall@10 0.93, 423.09 ms/1k
  - Pro fusion baseline: MRR@10 0.9233, Recall@10 0.97
- Current best v2 numbers:
  - Flash v2: MRR@10 0.8340, Recall@10 0.925, 339.76 ms/1k
  - Pro v2 fusion: MRR@10 0.9209, Recall@10 0.97, 430.57 ms/1k
- Current bottleneck ranking:
  1. Hero + section internals still need deeper one-to-one desktop visual parity (cards/microcontrols)
  2. Copy/style harmonization across remaining `_v4` sections
  3. Older untouched `_v4` lint debt
- Current pass validation (2026-02-26):
  - `npx eslint src/app/4/page.tsx src/app/4/_v4/V4SpatialStage.tsx src/app/4/_v4/V4ResultNode.tsx`: PASS
  - `npm --prefix C:/Users/pablo/Downloads/Ixos/ixos-site run build`: PASS
- What is next (top 3 tasks):
  1. Rebuild hero simulator controls/cards to match desktop component anatomy 1:1.
  2. Apply the same desktop anatomy pass to 3-4 key sections (progressive, compute, comparison, pricing).
  3. Final pacing/motion tuning pass after visual parity is achieved.

## STATE SNAPSHOT (/4 desktop-faithful hero + result-node expansion pass, 2026-02-26)
- Date: 2026-02-26
- Current baseline numbers:
  - Flash v1: MRR@10 0.8399, Recall@10 0.93, 423.09 ms/1k
  - Pro fusion baseline: MRR@10 0.9233, Recall@10 0.97
- Current best v2 numbers:
  - Flash v2: MRR@10 0.8340, Recall@10 0.925, 339.76 ms/1k
  - Pro v2 fusion: MRR@10 0.9209, Recall@10 0.97, 430.57 ms/1k
- Current bottleneck ranking:
  1. Remaining non-hero sections still need deeper desktop component parity
  2. Motion choreography can be pushed further (phase-linked section transitions)
  3. Legacy `_v4` lint debt outside touched files
- Current pass validation (2026-02-26):
  - `npx eslint src/app/4/_v4/V4SpatialStage.tsx src/app/4/_v4/V4ResultNode.tsx src/app/4/_v4/V4Hero.tsx src/app/4/_v4/V4Progressive.tsx src/app/4/page.tsx`: PASS
  - `npm --prefix C:/Users/pablo/Downloads/Ixos/ixos-site run build`: PASS
- What is next (top 3 tasks):
  1. Apply desktop-card parity to Progressive/Compute/Comparison internals.
  2. Introduce phase-synced section transition choreography (expand/collapse continuity) without fixed overlays.
  3. Run manual visual QA and tighten typography/spacing to desktop density.

## STATE SNAPSHOT (/4 app-world + shared-ui redesign pass, 2026-02-26)
- Date: 2026-02-26
- Current baseline numbers:
  - Flash v1: MRR@10 0.8399, Recall@10 0.93, 423.09 ms/1k
  - Pro fusion baseline: MRR@10 0.9233, Recall@10 0.97
- Current best v2 numbers:
  - Flash v2: MRR@10 0.8340, Recall@10 0.925, 339.76 ms/1k
  - Pro v2 fusion: MRR@10 0.9209, Recall@10 0.97, 430.57 ms/1k
- Current bottleneck ranking:
  1. Manual visual QA for new /4 App-World interactions (curve entry, lens pacing, non-blocking overlays)
  2. Desktop polish for search parity against new shared surfaces (Today/Workstreams now upgraded; search needs final refinement)
  3. Final consistency pass for source-backed copy across all active /4 lenses
- Current pass validation (2026-02-26):
  - `npm run tauri:dev`: PASS (app launches, model preloads)
  - `npm --prefix ui run build`: PASS
  - `npm --prefix ixos-site run build`: PASS
- What is next (top 3 tasks):
  1. Run browser QA on `/4` for desktop/mobile and tune lens spacing + world transform intensity.
  2. Tighten desktop search visual parity with shared AppWorld search component details.
  3. Optional: add targeted lint pass for modified desktop and `/4` files only.

## STATE SNAPSHOT (/4 execution-fix pass: curved woosh + lock-state + search polish, 2026-02-26)
- Date: 2026-02-26
- Current baseline numbers:
  - Flash v1: MRR@10 0.8399, Recall@10 0.93, 423.09 ms/1k
  - Pro fusion baseline: MRR@10 0.9233, Recall@10 0.97
- Current best v2 numbers:
  - Flash v2: MRR@10 0.8340, Recall@10 0.925, 339.76 ms/1k
  - Pro v2 fusion: MRR@10 0.9209, Recall@10 0.97, 430.57 ms/1k
- Current bottleneck ranking:
  1. Manual visual QA for `/4` scroll readability and AppWorld framing on 1920x1080 and mobile
  2. Remaining parity polish between legacy desktop details and shared `@ixos/ixos-ui` primitives
  3. Optional targeted lint cleanup on touched frontend files
- Current pass validation (2026-02-26):
  - `npm --prefix ui run build`: PASS
  - `npm --prefix ixos-site run build`: PASS
  - Lens source-path validation script: PASS (`ALL_PATHS_EXIST`)
- What is next (top 3 tasks):
  1. Manually verify `/4` in browser for section discoverability and hero-entry comfort.
  2. Capture screenshots/GIFs for desktop search, Today, Workstreams, and `/4` lenses.
  3. If needed, tune AppWorld transform intensity for low-end and reduced-motion users.

## STATE SNAPSHOT (/4 and desktop amplification pass, 2026-02-26)
- Date: 2026-02-26
- Current baseline numbers:
  - Flash v1: MRR@10 0.8399, Recall@10 0.93, 423.09 ms/1k
  - Pro fusion baseline: MRR@10 0.9233, Recall@10 0.97
- Current best v2 numbers:
  - Flash v2: MRR@10 0.8340, Recall@10 0.925, 339.76 ms/1k
  - Pro v2 fusion: MRR@10 0.9209, Recall@10 0.97, 430.57 ms/1k
- Current bottleneck ranking:
  1. Live visual QA for new `/4` world/lens choreography and hotspot readability across long scroll
  2. Additional iteration for desktop Workstreams detail ergonomics after the density upgrade
  3. Optional targeted lint pass for touched frontend files
- Current pass validation (2026-02-26):
  - `npm --prefix ui run build`: PASS
  - `npm --prefix ixos-site run build`: PASS
- What is next (top 3 tasks):
  1. Validate `/4` in-browser for interaction continuity (hero -> world -> lenses) and note remaining motion polish.
  2. Finalize desktop search micro-spacing around restored controls and evidence rail.
  3. Adjust Today/Workstreams empty-state messaging if user data patterns require.

## STATE SNAPSHOT (/1-/2-/3 overhaul + shared surface responsive/cloud-safety pass, 2026-02-28)
- Date: 2026-02-28
- Current baseline numbers:
  - Flash v1: MRR@10 0.8399, Recall@10 0.93, 423.09 ms/1k
  - Pro fusion baseline: MRR@10 0.9233, Recall@10 0.97
- Current best v2 numbers:
  - Flash v2: MRR@10 0.8340, Recall@10 0.925, 339.76 ms/1k
  - Pro v2 fusion: MRR@10 0.9209, Recall@10 0.97, 430.57 ms/1k
- Current bottleneck ranking:
  1. Desktop search row hierarchy can still be tightened (path truncation + denser evidence typography)
  2. Final manual UX QA in real Tauri app for mixed local/cloud folders and edge filesystem providers
  3. Optional full Rust test sweep remains blocked by unrelated `Commands::Update` test pattern drift in `src/cli/commands.rs`
- Current pass validation (2026-02-28):
  - `cargo check --lib`: PASS
  - `npx tsc -p packages/ixos-ui/tsconfig.json --noEmit`: PASS
  - `npx tsc -p ui/tsconfig.json --noEmit`: PASS
  - `cd ixos-site && npm run test:visual`: PASS (9/9, zero console/page errors)
- What is next (top 3 tasks):
  1. Run manual Tauri QA with OneDrive/iCloud placeholders to confirm no hydration in lexical/document paths.
  2. Optional compact-mode pass for result metadata truncation and keyboard-first scanning speed.
  3. Resolve unrelated `src/cli/commands.rs` test compile issue, then rerun targeted Rust test suites.

## STATE SNAPSHOT (desktop search restoration + release hardening pass, 2026-03-01)
- Date: 2026-03-01
- Current baseline numbers:
  - Flash v1: MRR@10 0.8399, Recall@10 0.93, 423.09 ms/1k
  - Pro fusion baseline: MRR@10 0.9233, Recall@10 0.97
- Current best v2 numbers:
  - Flash v2: MRR@10 0.8340, Recall@10 0.925, 339.76 ms/1k
  - Pro v2 fusion: MRR@10 0.9209, Recall@10 0.97, 430.57 ms/1k
- Current bottleneck ranking:
  1. Desktop/landing search parity still needs one QA pass for micro-spacing and dropdown ergonomics on small heights.
  2. Cross-platform release confidence is gated on CI secrets/vars presence (`VITE_API_URL`, `VITE_CLERK_PUBLISHABLE_KEY`, `IXOS_JWT_PUBLIC_KEY`) and updater metadata warning follow-up.
  3. Identifier hygiene: `com.ixos.app` suffix warning and updater bundler metadata warning should be cleaned before broad rollout.
- Current pass validation (2026-03-01):
  - `npm run build`: PASS
  - `cargo build --release`: PASS
  - `cargo test`: PASS
  - `npm run tauri:build`: PASS (after env-file hydration fix)
- What is next (top 3 tasks):
  1. Run manual desktop QA on Windows/macOS/Linux for new search dropdown anchoring, result scroll, and context rendering.
  2. Address Tauri warnings (`com.ixos.app` identifier suffix and `__TAURI_BUNDLE_TYPE` updater patch warning) before production tagging.
  3. Record release checklist completion in a dedicated report under `/reports` and attach CI artifact links.

## STATE SNAPSHOT (Desktop UX + Release Env Hardening, 2026-03-03)
- Date: 2026-03-03
- Current baseline numbers:
  - Model quality/perf baseline unchanged from prior snapshot (no ranking/model pipeline changes in this pass).
- Current best v2 numbers:
  - Unchanged in this pass.
- Current bottleneck ranking:
  1. Desktop UX density consistency at 1080p across remaining views/components.
  2. Release pipeline env consistency across all workflow variants.
  3. Bundle size warning (`ui` chunk >500kB) still pending split work.
- Current pass validation (2026-03-03):
  - `npm --prefix ui run build`: PASS
- What is next (top 3 tasks):
  1. Run desktop visual QA at 1920x1080, 1536x864, and 1366x768 after packaging.
  2. Verify release workflow env propagation on next tag build and capture run link/artifacts.
  3. Continue reducing micro text density in remaining settings/search surfaces.

## STATE SNAPSHOT (2026-03-04T00:00:00Z)
- Baseline (atlas flash): AnchorTop1Hit@1=0.80, PlausibleWrong@k=0.1333, SensitiveLeak@k=0.0, latency p50/p95=633.57/762.57 ms.
- Best trust point this sprint: risk_budget_v1 -> AnchorTop1Hit@1=1.00, PlausibleWrong@k=0.0333, latency p95=1725.16 ms (too slow).
- Best speed-trust compromise tested: risk_budget_v2 budget25 -> AnchorTop1Hit@1=0.88, PlausibleWrong@k=0.1067, latency p95=1439.39 ms (still too slow).
- Current bottleneck ranking:
  1) synchronous Pro escalation tail cost
  2) uncertainty calibration quality for selective escalation
  3) top1 trust errors despite hit@k success
- Next top-3 tasks:
  1) implement score-level trust-constrained Lagrangian (no synchronous Pro fallback)
  2) add confidence-sequence stop/probe for refine gate
  3) re-benchmark atlas + 5x stability + ralph big bench for Pareto update

## STATE SNAPSHOT (Ralph v3 plateau report, 2026-03-04)
- Date: 2026-03-04
- Current baseline numbers:
  - Atlas flash baseline (from innovation suite): AnchorTop1Hit@1=0.80, PlausibleWrong@k=0.1333, SensitiveLeak@k=0.0, latency p50/p95=633.57/762.57 ms.
- Current best v2 numbers:
  - Best trust point observed in sprint: risk_budget_v1 -> AnchorTop1Hit@1=1.00, PlausibleWrong@k=0.0333, latency p95=1725.16 ms (not ship-safe).
- Current bottleneck ranking:
  1. Candidate recall under capped lexical generation and timeout limits (anchor misses)
  2. Heuristic sensitive suppression without policy-grade constraints (leak risk)
  3. Confidence/routing calibration between Flash-first and Pro refinement (quality inversion risk)
- Ralph v3 evidence snapshot:
  - Stop state: NO SURVIVORS after prosecutor+gatekeeper and 3-cycle plateau.
  - Artifacts: ralph_v3/FINAL_REPORT.md, ralph_v3/NOVELTY_MATRIX.md, ralph_v3/BANLIST.md, ralph_v3/SOURCES.md.
- What is next (top 3 tasks):
  1. Start a fresh Ralph cycle from the five search directions in ralph_v3/FINAL_REPORT.md and require hard falsification-first evidence.
  2. Convert unresolved leak/anchor cases into executable regression cases in the atlas harness before new architecture claims.
  3. Re-run targeted retrieval benchmarks only after a gatekeeper-approved survivor exists.

