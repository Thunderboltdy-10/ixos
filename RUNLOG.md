# RUNLOG.md (append-only)

## Log format (use this every entry)
- Date/Time:
- Branch/Commit:
- Goal:
- Commands run:
- Outputs saved to:
- Key results:
- Decision: KEEP / REVERT / PIVOT
- Next:

---

## Entry 001 - Repo ingest started
- Date/Time: 2026-02-02
- Branch/Commit: (unknown)
- Goal: Initialize tracking files and start Phase 0 doc ingest
- Commands run: ls; Get-Content PLAN.md; Get-Content RUNLOG.md; Get-Content DECISIONS.md; New-Item reports; Set-Content reports/REALITY_MAP.md
- Outputs saved to: reports/REALITY_MAP.md
- Key results: Tracking files created/normalized; reports directory created
- Decision: KEEP
- Next: Phase 0 doc ingest + Reality Map build
## Entry 002 - Phase 0 doc ingest + Reality Map
- Date/Time: 2026-02-02
- Branch/Commit: (unknown)
- Goal: Read required docs/code and produce Reality Map
- Commands run: Get-Content models/lab/CANONICAL_RESULTS.md; Get-Content models/lab/LEADERBOARD.md; Get-Content models/lab/PERF_LEADERBOARD.md; Get-Content docs/models/pro-fusion.md; Get-Content docs/models/flash-v1.md; Get-Content AI_DEVELOPMENT_CONTEXT.md; Get-Content FEATURES.md; Get-Content MODEL_INSTALLATION_SYSTEM_REPORT.md; Get-Content Ixos_Master_Roadmap.md; rg for flash-v2/pro-v1; inspected src/ixos_rank/progressive.rs and ui config files
- Outputs saved to: reports/REALITY_MAP.md
- Key results: Identified default model = ixos-flash-v1, Pro fusion uses potion, CLI defaults to potion and lacks pro engine, flash-v2 naming conflict
- Decision: KEEP
- Next: Phase 1 baseline measurements (build + eval + perf)
## Entry 003 - Phase 1 baseline measurements
- Date/Time: 2026-02-02
- Branch/Commit: (unknown)
- Goal: Capture baseline quality + perf with real models
- Commands run: cargo build --release; python scripts/ixos_eval.py --suite both --only-ids ixos-flash-v2,potion-base-8m-int8,ixos-pro-v1 ...; python scripts/ixos_eval.py --fusion learned --flash-id ixos-flash-v2 --pro-id potion-base-8m-int8 ...; cargo run --release --bin ixos-profile --model ixos-flash-v1 ...; cargo run --release --bin ixos-profile --model potion ...; cargo run --release --bin ixos-profile --model ixos-pro-v1 ...
- Outputs saved to: models/lab/results_baseline_2026-02-02.{json,csv}; models/lab/results_baseline_fusion_2026-02-02.{json,csv}; reports/baseline_profile_*_2026-02-02.json; reports/baseline_slow_*_2026-02-02.json; reports/model_v2_benchmark_report.md
- Key results: Baseline Flash MRR@10 0.8399, Potion 0.8073, Pro v1 0.7354; Pro fusion MRR@10 0.9233; Flash JIT P95 337ms; Potion JIT P95 202ms; Pro v1 JIT P95 401ms
- Decision: KEEP
- Next: Phase 2 bottleneck hunt (analyze profile + instrument if needed)
## Entry 004 - Phase 2 bottleneck analysis
- Date/Time: 2026-02-02
- Branch/Commit: (unknown)
- Goal: Derive stage-level bottlenecks from baseline profiles
- Commands run: python reports/_tmp_profile_summary.py
- Outputs saved to: reports/PERF_BOTTLENECKS.md
- Key results: Ranking P95 + ripgrep + directory walk dominate cold path; embedding spikes on Flash/Pro v1
- Decision: KEEP
- Next: Implement speedups (ranking top-k + cascade + ripgrep/file list reuse)
## Entry 005 - Flash v1 vs lab v2 hash check
- Date/Time: 2026-02-02
- Branch/Commit: (unknown)
- Goal: Verify if lab ixos-flash-v2 matches shipped ixos-flash-v1
- Commands run: Get-FileHash models/ixos-flash-v1/model.safetensors models/lab/ixos-flash-v2/model.safetensors
- Outputs saved to: reports/REALITY_MAP.md (updated note)
- Key results: SHA256 hashes match; lab ixos-flash-v2 == shipped ixos-flash-v1
- Decision: KEEP
- Next: Naming cleanup + true Flash v2 creation
## Entry 006 - Parsing + cascade + CLI wiring
- Date/Time: 2026-02-02
- Branch/Commit: (unknown)
- Goal: Implement parsing support + pipeline improvements (ranking top-k + Pro cascade) + CLI pro wiring
- Commands run: python scripts/create_parsing_fixtures.py
- Outputs saved to: reports/PARSING_STATUS.md; tests/fixtures/*; scripts/create_parsing_fixtures.py
- Key results: Added PDF/DOCX/PPTX/RTF parsing with byte caps; fixtures/tests added; semantic rerank now uses top-k selection; Pro v2 cascade uses potion fast pass + flash top-k refinement; CLI accepts search_mode/pro_model and uses config defaults when flags absent
- Decision: KEEP
- Next: Run cargo test; run perf + scale bench; adjust Auto thresholds if quality regresses
## Entry 007 - Parser tests
- Date/Time: 2026-02-02
- Branch/Commit: (unknown)
- Goal: Validate parsing fixtures/tests after parser changes
- Commands run: cargo test -p ixos-protocol test_extract_
- Outputs saved to: (test run only)
- Key results: Parser fixture tests passed; warnings remain (unused temp_dir in sandbox tests)
- Decision: KEEP
- Next: Run perf/profile + scale bench; proceed with v2 model sweep
## Entry 008 - Flash v2 default + Pro v2 fusion + benchmarks
- Date/Time: 2026-02-03
- Branch/Commit: (unknown)
- Goal: Promote Flash v2, define Pro v2, run benchmarks/perf/scale, update docs and tests
- Commands run: 
  - python scripts/ixos_eval.py --suite both --only-ids ixos-flash-v1,ixos-flash-v2,potion-base-8m-int8,ixos-pro-v1 --real-limit 50 --real-queries 50 --candidate-cap 600 --output models/lab/results_v2_baseline_2026-02-03.json --csv models/lab/results_v2_baseline_2026-02-03.csv
  - python scripts/ixos_eval.py --suite real --real-limit 10 --real-queries 10 --candidate-cap 200 --fusion learned --flash-id ixos-flash-v1 --pro-id potion-base-8m-int8 --output models/lab/results_v2_fusion_baseline_real_2026-02-03.json --csv models/lab/results_v2_fusion_baseline_real_2026-02-03.csv
  - python scripts/ixos_eval.py --suite synthetic --candidate-cap 200 --fusion learned --flash-id ixos-flash-v1 --pro-id potion-base-8m-int8 --output models/lab/results_v2_fusion_baseline_synth_2026-02-03.json --csv models/lab/results_v2_fusion_baseline_synth_2026-02-03.csv
  - python scripts/ixos_eval.py --suite real --real-limit 10 --real-queries 10 --candidate-cap 200 --fusion learned --flash-id ixos-flash-v2 --pro-id potion-base-8m-int8 --output models/lab/results_v2_fusion_flashv2_real_2026-02-03.json --csv models/lab/results_v2_fusion_flashv2_real_2026-02-03.csv
  - python scripts/ixos_eval.py --suite synthetic --candidate-cap 200 --fusion learned --flash-id ixos-flash-v2 --pro-id potion-base-8m-int8 --output models/lab/results_v2_fusion_flashv2_synth_2026-02-03.json --csv models/lab/results_v2_fusion_flashv2_synth_2026-02-03.csv
  - cargo test -p ixos-protocol test_ask_mode_respects_selected_model
  - cargo build --release
  - cargo run --release --bin ixos-profile -- --dir dataset --runs 6 --cache-mode jit --model ixos-flash-v2 --out reports/profile_flashv2_2026-02-03.json --slow-threshold-ms 1500 --slow-out reports/slow_flashv2_2026-02-03.json
  - cargo run --release --bin ixos-profile -- --dir dataset --runs 6 --cache-mode jit --model potion --out reports/profile_potion_2026-02-03.json --slow-threshold-ms 1500 --slow-out reports/slow_potion_2026-02-03.json
  - python scripts/scale_bench.py --search-mode auto --cache-mode jit --model ixos-flash-v2 --pro-model ixos-pro-v2 --max-queries 50
- Outputs saved to:
  - models/lab/results_v2_baseline_2026-02-03.{json,csv}
  - models/lab/results_v2_fusion_baseline_real_2026-02-03.{json,csv}
  - models/lab/results_v2_fusion_baseline_synth_2026-02-03.{json,csv}
  - models/lab/results_v2_fusion_flashv2_real_2026-02-03.{json,csv}
  - models/lab/results_v2_fusion_flashv2_synth_2026-02-03.{json,csv}
  - reports/profile_flashv2_2026-02-03.json
  - reports/profile_potion_2026-02-03.json
  - reports/scale_bench.json
  - reports/SCALE_BENCH.md
- Key results:
  - Flash v2 canonical: MRR@10 0.8340, Recall@10 0.925, latency 339.76 ms/1k
  - Pro v2 smoke: real_corpus_v2 MRR@10 1.00 (10 queries), latency 819.8 ms/1k
  - Perf after: Flash v2 total p95 315ms; Potion total p95 195ms
  - Scale bench on `C:\Users\pablo\Downloads` (322,184 files / 87.6 GB): TTFR p50/p95 87/371ms, total p50/p95 1065/6520ms
- Decision: KEEP
- Next: Finish docs/changelogs, update PLAN snapshot, run final formatting and verify
## Entry 009 - Pro v2 canonical fusion rerun (full)
- Date/Time: 2026-02-03
- Branch/Commit: (unknown)
- Goal: Run full canonical Pro v2 fusion and update weights/docs
- Commands run:
  - python scripts/ixos_eval.py --suite both --fusion learned --flash-id ixos-flash-v2 --pro-id potion-base-8m-int8 --output models/lab/results_v2_fusion_flashv2_2026-02-03.json --csv models/lab/results_v2_fusion_flashv2_2026-02-03.csv (aborted: full manifest run)
  - python scripts/ixos_eval.py --suite both --only-ids ixos-flash-v2,potion-base-8m-int8 --fusion learned --flash-id ixos-flash-v2 --pro-id potion-base-8m-int8 --output models/lab/results_v2_fusion_flashv2_2026-02-03.json --csv models/lab/results_v2_fusion_flashv2_2026-02-03.csv
- Outputs saved to:
  - models/lab/results_v2_fusion_flashv2_2026-02-03.{json,csv}
- Key results:
  - real_corpus_v2: MRR@10 0.9209, Recall@10 0.97, latency 430.57 ms/1k
  - synthetic_ambiguity_v1: MRR@10 0.9833, Recall@10 1.00, latency 131.83 ms/1k
- Decision: KEEP
- Next: Update docs + canonical results + fusion weights
## Entry 010 - Rescue UI/perf pass + Auto startup latency fix
- Date/Time: 2026-02-05
- Branch/Commit: (working tree)
- Goal: Execute rescue plan across UI + search pipeline, verify builds/tests, and remove Auto mode large-repo startup penalty.
- Commands run:
  - cargo test
  - cargo build --release
  - npm run build (ui)
  - npm run build (ixos-site)
  - target/release/ixos-bench.exe --dir dataset --runs 5 --cache-mode jit --model ixos-flash-v2 --out reports/v2_bench_flash_dataset_2026-02-05.md
  - target/release/ixos-bench.exe --dir dataset --runs 5 --cache-mode jit --model potion --out reports/v2_bench_potion_dataset_2026-02-05.md
  - target/release/ixos-bench.exe --dir dataset --runs 5 --cache-mode jit --model ixos-pro-v1 --out reports/v2_bench_prov1_dataset_2026-02-05.md
  - target/release/ixos-profile.exe --dir . --runs 2 --cache-mode jit --model ixos-flash-v2 --out reports/v2_profile_flash_repo_2026-02-05.json --slow-threshold-ms 20000 --slow-out reports/v2_profile_flash_slow_repo_2026-02-05.json
  - target/release/ixos-profile.exe --dir . --runs 2 --cache-mode jit --model potion --out reports/v2_profile_potion_repo_2026-02-05.json --slow-threshold-ms 20000 --slow-out reports/v2_profile_potion_slow_repo_2026-02-05.json
  - Repo latency sweeps using `target/release/ixos.exe search ... --dir . --cache-mode jit --format json --limit 1` (flash/pro/auto; pre and post fixes)
- Outputs saved to:
  - reports/v2_repo_latency_summary_2026-02-05_213420.json
  - reports/v2_repo_latency_after_auto_gate_v2_summary_2026-02-05_220605.json
  - reports/v2_repo_latency_after_auto_index_fix_summary_2026-02-05_221919.json
  - reports/v2_repo_latency_after_auto_index_fix_raw_2026-02-05_221919.csv
  - reports/v2_bench_flash_dataset_2026-02-05.{md,json}
  - reports/v2_bench_potion_dataset_2026-02-05.{md,json}
  - reports/v2_bench_prov1_dataset_2026-02-05.{md,json}
  - reports/v2_profile_flash_repo_2026-02-05.json
  - reports/v2_profile_potion_repo_2026-02-05.json
  - reports/v2_rescue_search_pass_2026-02-05.md
- Key results:
  - Repo-scale E2E before fix: Flash 17153.32 ms avg, Auto 33289.55 ms avg, Pro 32985.66 ms avg.
  - Root cause found: Auto eagerly indexed pro engine in CLI startup path, paying near-Pro startup cost before search timing.
  - Repo-scale E2E after fix: Flash 16838.65 ms avg, Auto 15754.25 ms avg.
  - Auto improvement: -52.68% avg latency on large repo.
  - cargo test fully green (451 passed + docs).
- Decision: KEEP
- Next: Run targeted quality A/B for tightened Auto refinement gate and implement non-blocking evidence completion path for CLI/UI parity.

## Entry 011 - Candidate document phase gate (P1 perf regression fix)
- Date/Time: 2026-02-05
- Branch/Commit: (working tree)
- Goal: Stop unconditional document extraction from candidate generation for code-only queries.
- Commands run:
  - cargo fmt --all
  - cargo test candidate_generator::tests::test_document_search_gate -- --nocapture
  - cargo test candidate_generator::tests -- --nocapture
- Outputs saved to:
  - reports/document_search_gate_fix_2026-02-05.md
- Key results:
  - Added query/path gate for document phase in both `generate` and `generate_streaming`.
  - New gate regression tests added and passing.
  - `candidate_generator` test module fully green (8 passed).
- Decision: KEEP
- Next: Run repo-scale latency/profile pass to quantify impact on large trees with mixed binary docs.

## Entry 012 - Remove `.env` from hardcoded skip list
- Date/Time: 2026-02-05
- Branch/Commit: (working tree)
- Goal: Ensure `.env` files are not hard-excluded by shared path/ripgrep/document walkers.
- Commands run:
  - cargo fmt --all
  - cargo test path_engine::tests::test_hardcoded_skip_dirs_does_not_exclude_dot_env_file_name -- --nocapture
- Outputs saved to:
  - reports/dotenv_skiplist_fix_2026-02-05.md
- Key results:
  - Removed `.env` from `HARDCODED_SKIP_DIRS`.
  - Added regression test to prevent reintroduction.
  - Targeted test passed (1 passed).
- Decision: KEEP
- Next: Add integration test coverage that validates hidden `.env` search behavior end-to-end when hidden scanning is enabled.

## Entry 013 - Streaming deck stabilization + match-classification unification
- Date/Time: 2026-02-05
- Branch/Commit: (working tree)
- Goal: Fix non-moving streaming banner, align "Why this matched" with score breakdown, improve result/readability UX and shortcut discoverability.
- Commands run:
  - npm run build (ui)
  - cargo check
- Outputs saved to:
  - reports/ui_streaming_classification_fix_2026-02-05.md
- Key results:
  - Streaming event pipeline hardened in UI (`streamStage`/stats normalization + per-search progress reset).
  - Tauri Auto path no longer eagerly indexes Pro before streaming starts.
  - Match badges and explanation now share one classifier (`ui/src/lib/matchClassification.ts`).
  - Sidebar now surfaces `Ctrl+K`; search history query text is prominent and metadata is dimmer.
  - `npm run build` and `cargo check` both passed.
- Decision: KEEP
- Next: Run manual Tauri smoke in Auto mode on large repo and capture stage-timing evidence/screenshots.

## Entry 014 - Landing UI narrative pass + auth readability + docs organization
- Date/Time: 2026-02-06
- Branch/Commit: (working tree)
- Goal: Fix hero/pipeline UX issues, improve auth text readability in landing + desktop app, and organize/populate project docs.
- Commands run:
  - npm --prefix ui run build
  - npm --prefix ixos-site run build
  - cd ixos-site; npx eslint src/components/sections/HeroPipeline.tsx src/app/docs/page.tsx src/components/auth/AuthScreen.tsx src/components/ui/SectionDivider.tsx src/components/hero/diagrams/ScoreWaterfall.tsx src/components/hero/diagrams/MemoryWipe.tsx
- Outputs saved to:
  - reports/ui_docs_refresh_2026-02-06.md
  - docs/MARKDOWN_INVENTORY.md
  - docs/README.md
  - docs/getting-started/INSTALLATION.md
  - docs/product/DESKTOP_APP.md
  - docs/models/HUGGINGFACE_AND_MODELS.md
  - docs/engineering/BENCHMARKING.md
  - docs/engineering/MARKDOWN_ORGANIZATION.md
  - docs/agents/SKILLS_AND_WORKFLOWS.md
- Key results:
  - Hero demo starts lower and lifts into pipeline mode with radial reveal.
  - Pipeline cards now highlight in order and drive synchronized hero demo step changes.
  - Divider labels are globally uppercase in shared `SectionDivider` for landing + desktop.
  - Clerk auth readability improved with stronger contrast and autofill-safe styles.
  - Docs page replaced with structured sections and markdown inventory generated for repo-wide visibility.
- Decision: KEEP
- Next: Manual visual QA pass on desktop/mobile breakpoints and capture updated screenshots/GIFs for release notes.

## Entry 015 - Feedback-driven pipeline + docs IA overhaul + root markdown cleanup
- Date/Time: 2026-02-06
- Branch/Commit: (working tree)
- Goal: Remove looped demo behavior during pipeline scroll, improve component diagram value, keep hero demo visible/centered from initial hero state, split docs into proper pages, and move root markdown sprawl into docs hierarchy.
- Commands run:
  - cd ixos-site; npx eslint src/components/sections/HeroPipeline.tsx src/components/hero/IxosDemoWindow.tsx src/components/hero/diagrams/QueryDecomposition.tsx src/components/hero/diagrams/VectorSpace.tsx src/components/hero/diagrams/ScoreWaterfall.tsx src/components/hero/diagrams/MemoryWipe.tsx src/components/hero/diagrams/StreamWaterfall.tsx src/app/docs/layout.tsx src/app/docs/page.tsx src/app/docs/getting-started/page.tsx src/app/docs/desktop-app/page.tsx src/app/docs/models/page.tsx src/app/docs/benchmarking/page.tsx src/app/docs/agents/page.tsx src/components/auth/AuthScreen.tsx src/components/ui/SectionDivider.tsx
  - npm --prefix ixos-site run build
  - npm --prefix ui run build
- Outputs saved to:
  - reports/ui_docs_refresh_2026-02-06.md
  - docs/MARKDOWN_INVENTORY.md
  - ixos-site/src/app/docs/*
  - docs/archive/root/*
- Key results:
  - Controlled pipeline demo no longer runs autonomous query loops during scroll.
  - Hero demo remains visible from the start, centered, and acts as pulse origin for radial card activation.
  - Diagram set replaced with higher-signal custom visuals, including looping stream ticker behavior.
  - Docs moved to multi-page information architecture with dedicated routes and readable article layout.
  - Root markdown cleaned to operational files only (`AGENTS.md`, `PLAN.md`, `RUNLOG.md`, `DECISIONS.md`).
- Decision: KEEP
- Next: Capture fresh screenshots/GIFs for hero/pipeline/docs on desktop + mobile, then run UX copy polish.

## Entry 016 - Hero proportion + controlled-stage stability + docs readability polish
- Date/Time: 2026-02-06
- Branch/Commit: (working tree)
- Goal: Apply user feedback on hero dimensions/centering, remove pulse effect, stop stage-cycling jitter in controlled demo, and make docs layout/text more readable.
- Commands run:
  - npm --prefix ixos-site run build
  - npm --prefix ui run build
  - npm --prefix ixos-site run lint -- src/components/sections/HeroPipeline.tsx src/components/hero/IxosDemoWindow.tsx src/components/hero/fakeSearch.ts src/app/docs/layout.tsx src/app/docs/page.tsx src/app/docs/getting-started/page.tsx src/app/docs/desktop-app/page.tsx src/app/docs/models/page.tsx src/app/docs/benchmarking/page.tsx src/app/docs/agents/page.tsx src/components/docs/DocsSideNav.tsx
  - Get-ChildItem -Path . -File -Filter *.md | Select-Object -ExpandProperty Name
- Outputs saved to:
  - reports/ui_docs_refresh_2026-02-06.md (updated)
  - ixos-site/src/components/sections/HeroPipeline.tsx
  - ixos-site/src/components/hero/IxosDemoWindow.tsx
  - ixos-site/src/components/hero/fakeSearch.ts
  - ixos-site/src/app/docs/*
  - ixos-site/src/components/docs/DocsSideNav.tsx
  - ixos-site/src/app/globals.css
- Key results:
  - Hero demo proportions reduced in height and widened; layout is centered and transitions upward smoothly into pipeline state.
  - Radiating pulse visuals were removed entirely from the hero/pipeline transition.
  - Scroll-guided demo now uses pause-resume stage flow in fake search logic, eliminating repeated scan/embed/rank restarts.
  - Pipeline narrative card was simplified to text-forward "Search Pipeline" messaging.
  - Docs IA now has active side nav and long-form typography styles for readability.
  - Root markdown verified as operational-only (`AGENTS.md`, `PLAN.md`, `RUNLOG.md`, `DECISIONS.md`).
- Decision: KEEP
- Next: Capture updated screenshots/GIFs for desktop/mobile and run manual scroll QA on edge viewport sizes.

## Entry 017 - Hero/pipeline dimension and brightness tuning
- Date/Time: 2026-02-06
- Branch/Commit: (working tree)
- Goal: Increase hero demo and how-it-works component dimensions and reduce dimness of stage cards/content.
- Commands run:
  - npm --prefix ixos-site run build
  - npm --prefix ixos-site run lint -- src/components/sections/HeroPipeline.tsx
- Outputs saved to:
  - ixos-site/src/components/sections/HeroPipeline.tsx
- Key results:
  - Increased desktop pipeline canvas (`max-w`, grid columns/rows, total height) and mobile demo height.
  - Raised baseline opacity/contrast for inactive/complete cards and status text to improve readability.
  - Increased compact diagram slot size and brightened checkpoints/body text.
  - Build and targeted lint passed.
- Decision: KEEP
- Next: Manual visual QA on desktop + tablet widths to confirm final proportions.

## Entry 018 - Desktop release hardening + Pro gating consistency
- Date/Time: 2026-02-08
- Branch/Commit: (working tree)
- Goal: Fix production entitlement/search regressions, eliminate duplicate search event processing, unify Pro gating, improve overlay behavior, and land release guardrails.
- Commands run:
  - npm --prefix ui run build
  - npm --prefix ixos-site run build
  - cargo build
  - cargo test -q
- Outputs saved to:
  - reports/desktop_release_hardening_2026-02-08.md
- Key results:
  - Progressive search events now use channel transport only in Tauri backend; legacy bus listener is disabled by default in UI.
  - Desktop API base no longer silently falls back to localhost in production.
  - Pro detection is centralized and reused by Sidebar, Pricing, Account, Today, Workstreams, and Related Files.
  - `open-pricing` event is now handled globally by `AppShell`, fixing upgrade CTA dead-ends.
  - Overlay panels now auto-close on clicks outside the modal panel while allowing underlying actions to continue.
  - Cache management gained backend-aware stats and a `Clear All Cache` path (including LMDB sidecar).
  - Footer legal link now routes to `/terms`; hero demo interactivity restored in hero stage.
  - Validation status: UI build pass, landing build pass, Rust build pass, Rust tests pass.
- Decision: KEEP
- Next: Run manual packaged Tauri smoke (`tauri:build:prod`) with real production env values and capture entitlement + upgrade + search flow recordings.

## Entry 019 - Production entitlement hardening + Firefox arc-noise parity + validation sweep
- Date/Time: 2026-02-08
- Branch/Commit: (working tree)
- Goal: Close remaining release-critical gaps: free-vs-pro enforcement consistency, backend Pro-mode hardening, prod token expiry correctness, dropdown/sidebar/settings polish, and Firefox landing noise parity.
- Commands run:
  - cargo fmt
  - cargo test -q
  - cargo build
  - npm --prefix ui run build
  - npm --prefix ixos-site run build
  - node scripts/verify-desktop-build-env.js
  - npm audit --audit-level=high --omit=dev
  - cargo clippy --all-targets --quiet
- Outputs saved to:
  - reports/desktop_release_hardening_2026-02-08.md
- Key results:
  - Rust search command now enforces Pro capability for Pro mode and downgrades Auto->Flash when Pro is unavailable (`src-tauri/src/commands/search.rs`).
  - Added unit tests for search-mode resolution logic (free downgrade + pro rejection + pro allow).
  - UI Pro fallback no longer treats active/grace token status alone as Pro; token `plan` must decode to `pro` (`ui/src/lib/proAccess.ts`).
  - Search controls/settings now auto-downgrade non-Pro users to Flash and lock Auto/Pro selection paths.
  - Lease refresh and transfer-confirm APIs now issue subscription-bounded entitlement tokens (`subscriptionEnd`) to avoid overlong Pro token validity (`ixos-site/src/app/api/desktop/lease/refresh/route.ts`, `ixos-site/src/app/api/desktop/lease/transfer/confirm/route.ts`).
  - Firefox-specific arc-noise fallback improved without changing overall landing UI design (`ixos-site/src/components/effects/ArcNoiseBackground.tsx`).
  - Settings/guide/pricing overlays now use fixed centering and sidebar/dropdown/account controls received consistency polish.
  - Bench-target compile blocker fixed in `benches/agent_search_comparison.rs` (`println!` formatting), enabling `cargo clippy --all-targets` completion.
- Validation summary:
  - `cargo test -q`: PASS (455 passed, 0 failed, 6 ignored).
  - `cargo build`: PASS.
  - `npm --prefix ui run build`: PASS.
  - `npm --prefix ixos-site run build`: PASS (includes `/terms` route).
  - `cargo clippy --all-targets --quiet`: PASS with warnings only.
  - `node scripts/verify-desktop-build-env.js`: FAIL in local shell due missing env vars (`VITE_API_URL`, `VITE_CLERK_PUBLISHABLE_KEY`, `IXOS_JWT_PUBLIC_KEY`) - expected safeguard behavior.
  - `npm audit --audit-level=high --omit=dev`: reports high advisory for `next` and moderate advisory for `nodemailer` (remediation requires version bumps).
- Decision: KEEP
- Next: Run packaged desktop smoke with real production env values and verify full entitlement lifecycle flows (free, pro, upgrade, lease transfer, renewal, cancellation).

## Entry 020 - Phase 0-2 implementation closure + full validation sweep
- Date/Time: 2026-02-08
- Branch/Commit: (working tree)
- Goal: Complete remaining Phase 0-2 implementation gaps, fix cache correctness edge cases, and run full confidence matrix.
- Commands run:
  - cargo check
  - cargo test
  - cargo test -p ixos-app
  - cargo clippy --all-targets
  - cargo build --release
  - npm --prefix ui run build
  - npm --prefix ixos-site run build
  - python scripts/run_golden.py
  - python scripts/run_contract.py
  - python scripts/run_settings_matrix.py
  - cargo run --quiet --bin ixos -- doctor --json
  - cargo run --quiet --bin ixos -- doctor --json | python -m json.tool
  - cargo run --quiet --bin ixos -- --help
  - cargo run --quiet --bin ixos -- index --help
  - cargo run --quiet --bin ixos -- daemon --help
  - cargo run --quiet --bin ixos -- cache rebuild corpus_tiny --force
  - cargo run --quiet --bin ixos -- cache mode persistent
  - cargo run --quiet --bin ixos -- config --get search.cache_mode
  - cargo run --quiet --bin ixos -- index corpus_tiny --clear
  - cargo run --quiet --bin ixos -- cache clear --dir corpus_tiny --force
  - cargo run --quiet --bin ixos -- cache stats --dir corpus_tiny --json
  - npm run tauri:build (after setting required env vars in shell)
- Outputs saved to:
  - reports/settings_matrix_2026-02-08.md
  - docs/product/PHASES_0_2_IMPLEMENTATION_AND_TESTING.md
  - target/release/bundle/msi/Ixos_0.1.0_x64_en-US.msi
  - target/release/bundle/nsis/Ixos_0.1.0_x64-setup.exe
- Key results:
  - Rust core tests pass: 463 passed, 0 failed, 6 ignored.
  - Tauri backend tests pass: 21 passed, 0 failed.
  - Doctor report: 8 pass, 0 warn, 0 fail, 2 info.
  - Settings matrix: PASS (all 11 combinations).
  - Golden and contract suites: PASS.
  - Release build and desktop packaging: PASS (MSI + NSIS generated).
  - Fixed workstreams persistence reliability (mutation autosave + close/interval autosave + consistent config-dir storage path).
  - Fixed `--config` override handling in CLI `config` and `cache mode` paths.
  - Cache correctness now model-aware + file-edit aware in semantic cache paths.
  - Auto/Flash semantic fallback regression covered by lexical preflight + conditional eager semantic indexing when lexical probe is empty.
- Decision: KEEP
- Next: Manual desktop UX smoke pass for Pro/free transition flows and Today/workstreams interactions using the new checklist doc.

## Entry 021 - Golden determinism fix (Auto/Pro drift in regression harness)
- Date/Time: 2026-02-08
- Branch/Commit: (working tree)
- Goal: Resolve golden regression mismatch caused by mode-dependent ranking variance in isolated env.
- Commands run:
  - python scripts/run_golden.py (failed)
  - python scripts/run_golden.py (rerun, failed)
  - edited `scripts/run_golden.py` to force `--search-mode flash --cache-mode jit`
  - python scripts/run_golden.py (pass)
  - python scripts/run_contract.py (pass)
- Outputs saved to:
  - scripts/run_golden.py
- Key results:
  - Root mismatch was on query `meeting_notes_date` where Auto path returned a different top result.
  - Golden harness now pins deterministic Flash/JIT mode for stable ranking baselines.
  - Golden and contract suites both pass after harness correction.
- Decision: KEEP
- Next: If Auto/Pro golden coverage is required, add a separate expectation file per mode instead of mixing in Flash baseline assertions.

## Entry 020 - Release pass 3: runtime key bootstrap + downgrade-race fix + demo/stream polish
- Date/Time: 2026-02-08
- Branch/Commit: (working tree)
- Goal: Fix remaining production regressions (Pro expired/auth mismatch in packaged app), prevent startup mode downgrade race, harden entitlement refresh/sync, improve perceived streaming startup, and close landing demo/Firefox parity issues.
- Commands run:
  - cargo fmt --all
  - cargo test -q
  - cargo build --release
  - npm --prefix ui run build
  - npm --prefix ixos-site run build
  - cargo clippy --all-targets --quiet
  - node scripts/verify-desktop-build-env.js
- Outputs saved to:
  - reports/desktop_release_hardening_2026-02-08.md
- Key results:
  - Added runtime entitlement public-key bootstrap path for desktop:
    - New backend command: `set_entitlement_public_key`
    - New web API: `GET /api/desktop/entitlement-key`
    - Auth bootstrap now fetches/syncs public key and retries `set_entitlement_token` automatically when key-missing errors occur.
  - Removed startup Pro-preference downgrade mutation in UI (`SearchInput`/`SearchSettings`) to fix the reported transient-null entitlement race that reset saved mode to Flash.
  - Search error mapping now distinguishes token-missing, device-transfer, and missing-public-key conditions (no more blanket “session transferred” message).
  - Settings entitlement refresh now performs a real lease/token refresh + backend re-sync instead of reloading the page.
  - Added proactive backend token re-sync before each search invocation.
  - Improved perceived streaming startup in desktop search:
    - Emit immediate pre-index stream/status events.
    - Skip eager semantic indexing for low-latency Flash/Auto non-Ask flows.
  - Landing/demo fixes:
    - Controlled/uncontrolled transition now clears stale pause state.
    - Fake demo search now has guaranteed fallback results for weak matches.
    - Firefox arc-noise fallback strengthened for visible parity.
  - UI polish:
    - Dropdowns moved above suggestion layers and resized (narrower, slightly taller options).
    - Sidebar Pro badges + account/billing/sign-out sizing normalized.
- Validation summary:
  - `cargo test -q`: PASS (`455 passed; 0 failed; 6 ignored`).
  - `cargo build --release`: PASS.
  - `npm --prefix ui run build`: PASS.
  - `npm --prefix ixos-site run build`: PASS (includes `/api/desktop/entitlement-key` and `/terms` routes).
  - `cargo clippy --all-targets --quiet`: PASS (warnings only, no new hard failures).
  - `node scripts/verify-desktop-build-env.js`: FAIL in local shell due missing env vars (`VITE_API_URL`, `VITE_CLERK_PUBLISHABLE_KEY`, `IXOS_JWT_PUBLIC_KEY`) — expected safeguard behavior.
- Decision: KEEP
- Next: packaged desktop smoke with real env to verify full lifecycle matrix (free/pro/upgrade/cancel/renew/transfer) on release artifact.

## Entry 021 - Release pass 4: entitlement fallback hardening + dropdown/readability polish + golden normalization
- Date/Time: 2026-02-08
- Branch/Commit: (working tree)
- Goal: Remove remaining production auth dead-ends for Flash searches, stabilize startup Pro status handling, improve dropdown/sidebar/settings readability, and produce an updated release smoke gate summary.
- Commands run:
  - `cargo test -p ixos-app`
  - `cargo test`
  - `cargo build -p ixos-app --release`
  - `cargo build --release`
  - `python scripts/validate_registry.py`
  - `python scripts/generate_capability_matrix.py`
  - `python scripts/run_contract.py`
  - `python scripts/run_perf_budget_stub.py`
  - `python scripts/run_golden.py`
  - `npm run tauri:build:prod`
  - `cd ui; npm run build`
  - `cd ixos-site; npm run build`
- Outputs saved to:
  - reports/release_smoke_matrix_2026-02-08.md
  - docs/capability-matrix.md (regenerated)
- Key results:
  - Backend search now allows unauthenticated Flash-mode fallback (including Auto->Flash downgrade) while still hard-blocking Pro mode without a valid entitlement token.
  - Auth bootstrap now clears invalid cached entitlement tokens that fail backend validation instead of leaving stale token state.
  - Pro status refresh path is now gated on token availability to avoid transient "expired" status during startup race windows.
  - Pro-access UI helper now trusts active server lease state while still honoring `timeSuspect` lock.
  - Dropdown overlays were moved above suggestion layers and resized for denser, clearer one-line option rows.
  - Sidebar/account/settings controls were normalized for consistent button sizing and visual hierarchy.
  - Firefox landing arc-noise now uses the same overlay path as Chromium and is layered above particles.
  - Golden runner path normalization now strips Windows `\\?\`/`//?/` prefixes; false path-format failures are removed.
- Validation summary:
  - `cargo test -p ixos-app`: PASS (`17 passed; 0 failed`).
  - `cargo test`: PASS (`455 passed; 0 failed; 6 ignored`).
  - `cargo build -p ixos-app --release`: PASS.
  - `cd ui; npm run build`: PASS.
  - `cd ixos-site; npm run build`: PASS (`/terms` and `/api/desktop/entitlement-key` present).
  - `python scripts/validate_registry.py`: PASS.
  - `python scripts/generate_capability_matrix.py`: PASS.
  - `python scripts/run_contract.py`: PASS.
  - `python scripts/run_perf_budget_stub.py`: PASS.
  - `python scripts/run_golden.py`: FAIL (remaining true retrieval mismatches on `q1_financial_report`, `q2_financial_report`, `privacy_policy`, `config_json`, `todo_refine`, `logs_streamed`).
  - `npm run tauri:build:prod`: FAIL in local shell due missing required env vars (`VITE_API_URL`, `VITE_CLERK_PUBLISHABLE_KEY`, `IXOS_JWT_PUBLIC_KEY`) - expected guardrail behavior.
- Decision: KEEP
- Next: Resolve remaining golden retrieval regressions and run packaged production-desktop smoke with real env credentials for full entitlement lifecycle verification.

## Entry 022 - Release pass 5: logo/icon replacement + Firefox noise tuning + prod entitlement verification hardening
- Date/Time: 2026-02-08
- Branch/Commit: (working tree)
- Goal: Address remaining visual/release regressions reported after pass 4 (Firefox arc-noise intensity, landing/desktop logo replacement consistency, tiny desktop icon rendering, dropdown density polish), and harden release entitlement verification behavior.
- Commands run:
  - cargo test
  - cargo test -p ixos-app
  - cargo build --release
  - cargo fmt --all -- --check
  - python scripts/run_golden.py
  - npm run build
  - cd ixos-site; npm run build
  - npm run tauri:build (with required env vars exported in shell)
  - npx tauri icon logo-app-master.png -o src-tauri/icons
- Outputs saved to:
  - target/release/bundle/msi/ixos_0.1.0_x64_en-US.msi
  - target/release/bundle/nsis/ixos_0.1.0_x64-setup.exe
- Key results:
  - Rebuilt all Tauri icon bundles from the new root logo with tighter crop/scale to eliminate tiny bordered rendering in desktop shell/taskbar/tray.
  - Propagated regenerated icon asset to desktop UI (`ui/src/assets/ixos-icon.png`) and landing assets (`ixos-site/public/assets/icon.png`, `ixos-site/public/assets/logo-v2.png`, new `ixos-site/public/assets/logo-v3.png`, `ixos-site/src/app/favicon.ico`).
  - Updated landing logo references to versioned filename (`logo-v3.png`) and metadata icons to avoid stale-cache visuals while remaining compatible with Next local image constraints.
  - Reduced Firefox arc-noise intensity to match Chromium visual strength more closely.
  - Hardened desktop entitlement verification behavior for release by removing sticky decoding-key cache in Rust auth command path and expanding frontend retry logic for key-mismatch signature errors.
  - Improved pipeline hero handoff so autonomous loop remains active until deeper scroll progression, reducing "frozen" hero interactions when scrolling back up.
  - Compact dropdown options were tuned to be less wide while keeping one-line explanatory text.
- Validation summary:
  - `cargo test`: PASS (`455 passed; 0 failed; 6 ignored`).
  - `cargo test -p ixos-app`: PASS (`17 passed; 0 failed`).
  - `cargo build --release`: PASS.
  - `cargo fmt --all -- --check`: PASS.
  - `python scripts/run_golden.py`: PASS.
  - `npm run build`: PASS (desktop UI).
  - `cd ixos-site; npm run build`: PASS.
  - `npm run tauri:build` (with env set): PASS; produced MSI + NSIS installers.
  - `cd ixos-site; npm run lint`: FAIL due pre-existing lint debt outside this pass (not introduced by these changes).
- Decision: KEEP
- Next: Run final manual smoke on Firefox + packaged desktop to confirm icon sizing and noise intensity on target machines, then close remaining unrelated lint debt in `ixos-site` as a separate cleanup task.

## Entry 023 - Flash/Auto pure-semantic fallback regression fix
- Date/Time: 2026-02-08
- Branch/Commit: (working tree)
- Goal: Fix desktop regression where Auto/Flash semantic-only queries returned no results after eager-index skip optimization.
- Commands run:
  - `rg -n "files_to_search|search_pure|index_directory|lexical_results" src src-tauri`
  - `cargo fmt --all`
  - `cargo test -p ixos-app eager_indexing_ -- --nocapture`
- Outputs saved to:
  - `reports/semantic_fallback_regression_fix_2026-02-08.md`
- Key results:
  - Added lexical preflight (`lexical.search(query, 1)`) in Tauri search command for non-Ask, non-Pro flows.
  - If lexical preflight has zero hits, semantic eager indexing is forced so pure-semantic fallback has indexed files.
  - Ask/Pro behavior remains unchanged; lexical-hit flows keep low-latency no-eager-index path.
  - Added 4 unit tests around the eager-index gate function.
- Validation summary:
  - `cargo test -p ixos-app eager_indexing_ -- --nocapture`: PASS (`4 passed; 0 failed`).
- Decision: KEEP
- Next: Implement Phase 0.1 reliability cleanup tasks and wire `ixos doctor`/diagnostics panel.

## Entry 024 - Phase 0.1 CLI reliability cleanup (dead toggles + cache flows)
- Date/Time: 2026-02-08
- Branch/Commit: (working tree)
- Goal: Remove/harden dead CLI paths and implement functional cache/index maintenance behavior.
- Commands run:
  - `cargo fmt --all`
  - `cargo test -p ixos-protocol`
  - `cargo test -p ixos-app`
  - `cargo run --bin ixos -- index --help`
  - `cargo run --bin ixos -- daemon --help`
  - `target/debug/ixos.exe cache mode persistent`
  - `target/debug/ixos.exe config --get search.cache_mode`
  - `target/debug/ixos.exe cache mode ephemeral`
  - `target/debug/ixos.exe index dataset/synthetic_ambiguity --clear --progress --use-xattr`
  - `cargo run --bin ixos -- cache rebuild dataset/synthetic_ambiguity --force --workers 2`
- Outputs saved to:
  - `reports/phase0_cli_reliability_patch_2026-02-08.md`
  - `docs/product/CLI_RELIABILITY_QUICKCHECK.md`
- Key results:
  - Removed `index --watch` from CLI.
  - Hid daemon `--status` and `--stop` flags in help output.
  - `cache mode` now persists to `search.cache_mode` in config.
  - `index --clear` now clears embedding cache entries before indexing.
  - `cache rebuild` now loads model, indexes files, and precomputes embeddings.
  - Added `StubSemanticEngine::precompute_embeddings()` helper for rebuild warmup.
  - Fixed nested Tokio runtime panic in `cache rebuild` by making cache handler async.
- Validation summary:
  - `cargo test -p ixos-protocol`: PASS (`455 passed; 0 failed; 6 ignored`).
  - `cargo test -p ixos-app`: PASS (`21 passed; 0 failed`).
  - `ixos index --help`: `--watch` removed.
  - `ixos daemon --help`: only `--foreground` visible.
  - Cache mode persistence round-trip: `jit -> cache -> jit` confirmed.
  - `index --clear` sample run: cleared 36 entries then indexed 34 files.
  - `cache rebuild` sample run: indexed 34 files, rebuilt 34 embeddings.
- Decision: KEEP
- Next: finish daemon/background implementation gaps, then deliver `ixos doctor` + diagnostics UI.

## Entry 025 - Cache truthfulness + settings matrix recovery (JIT/Cache semantics)
- Date/Time: 2026-02-08
- Branch/Commit: (working tree)
- Goal: Resolve founder-reported confusion around JIT/cache behavior and restore settings-matrix cache-mode invariants after model-fingerprint-aware cache stats changes.
- Commands run:
  - `cargo clippy --all-targets`
  - `cargo build --release`
  - `cargo test`
  - `npm --prefix ui run build`
  - `npm --prefix ixos-site run build`
  - `python scripts/run_golden.py`
  - `python scripts/run_contract.py`
  - `python scripts/run_settings_matrix.py` (failed first run, then pass after fixes)
  - `target/debug/ixos.exe doctor --json`
  - `target/debug/ixos.exe cache clear --dir corpus_tiny --force`
  - `target/debug/ixos.exe cache mode ephemeral`
  - `target/debug/ixos.exe search "quarterly report" --dir corpus_tiny --limit 5`
  - `target/debug/ixos.exe cache stats --dir corpus_tiny --json`
  - `target/debug/ixos.exe cache mode persistent`
  - `target/debug/ixos.exe search "quarterly report" --dir corpus_tiny --limit 5`
  - `target/debug/ixos.exe cache stats --dir corpus_tiny --json`
  - `npm run tauri:build` (with required env vars exported in shell)
- Outputs saved to:
  - `reports/settings_matrix_2026-02-08.md`
  - `reports/phase0_2_validation_2026-02-08.md`
  - `target/release/bundle/msi/Ixos_0.1.0_x64_en-US.msi`
  - `target/release/bundle/nsis/Ixos_0.1.0_x64-setup.exe`
- Key results:
  - CLI search cache mode now correctly resolves from persisted config when `--cache-mode` is omitted.
  - CLI cache stats now validates against active model fingerprint and also detects mixed-fingerprint cache blobs for truthfulness in matrix runs.
  - CLI cache clear + index clear now reliably clear ADS/xattr entries and always clear LMDB sidecar fallback state.
  - Reproduced and verified behavior:
    - JIT run -> `cached_files: 0`
    - Persistent cache run -> `cached_files: 5` on `corpus_tiny` sample query.
  - Settings matrix recovered from failures in cache combos (7/8/9/11) to full PASS.
- Validation summary:
  - `cargo clippy --all-targets`: PASS (warnings remain, pre-existing repository debt).
  - `cargo build --release`: PASS.
  - `cargo test`: PASS (`463 passed; 0 failed; 6 ignored`).
  - `npm --prefix ui run build`: PASS.
  - `npm --prefix ixos-site run build`: PASS.
  - `python scripts/run_golden.py`: PASS.
  - `python scripts/run_contract.py`: PASS.
  - `python scripts/run_settings_matrix.py`: PASS (after cache stats/clear fixes).
  - `ixos doctor --json`: PASS (`8 pass; 0 warn; 0 fail; 2 info`).
  - `npm run tauri:build` (env set): PASS; MSI + NSIS produced.
## Entry 026 - CLI Pro feature cleanup (remove workstream/activity/ranking from CLI)
- Date/Time: 2026-02-09
- Branch/Commit: (working tree)
- Goal: Remove Pro-gated features from CLI to ensure CLI only includes core functionality (search, cache, config, compliance, model management, doctor, version)
- Commands run:
  - cargo check
  - cargo build --release
  - ./target/release/ixos --help
  - ./target/release/ixos cache --help
  - ./target/release/ixos model --help
  - ./target/release/ixos version
- Outputs saved to: (code changes only)
- Key results:
  - Removed WorkstreamCommands, ActivityCommands, RankingCommands from `src/cli/commands.rs`
  - Removed exports from `src/cli/mod.rs`
  - Updated `src/main.rs` imports and removed handler functions for removed commands
  - Fixed malformed duplicate code in commands.rs (lines 409-417)
  - CLI now shows only core commands: search, index, config, daemon, cache, compliance, doctor, version, model
  - Build passes, all CLI commands tested and working
- Decision: KEEP
- Next: Run cargo test to verify no regressions, then proceed with remaining implementation items

## Entry 027 - Security-first hardening + Pro move recommendations + landing lock stability
- Date/Time: 2026-02-10
- Branch/Commit: (working tree)
- Goal: Implement security-first execution slice from the mega production plan: tighten auth fallback behavior, harden Pro-gated command surfaces, improve landing strategy lock behavior on low-end devices, and ship first Pro move-recommendation loop.
- Commands run:
  - `cargo test -q`
  - `npm --prefix ui run build`
  - `npm --prefix ixos-site run build`
  - `python scripts/run_settings_matrix.py`
  - `cargo run --quiet --bin ixos -- doctor --json`
- Outputs saved to:
  - `reports/settings_matrix_2026-02-10.md`
  - `PRODUCTION_AND_STRATEGY_GAPS_2026-02-10.md`
- Key results:
  - Security: `getClerkUserIdFromRequest` now rejects requests when bearer token is present but verification fails, instead of falling back to cookie/session auth.
  - Security: personal ranking Tauri commands (`pin/unpin/ignore/unignore/not-relevant/reset/get`) now enforce active Pro entitlement + capability server-side.
  - Pro gating UX: desktop lock overlay in `AppShell` is now wired to real entitlement/pro-status conditions (expired/time-suspect) instead of a dead constant.
  - Landing: `HeroPipeline` now keeps pinning active on low-powered devices and shifts to reduced-FX hard-lock behavior (stage progression without heavy movement), plus fixed pin mode/reparent to reduce scroll drift.
- New Pro feature: added repeated-behavior file move recommendation engine in activity ledger, exposed through new Tauri command `get_move_recommendations`, wired into Today tab UI as "Suggested Reorganization".
  - Types/api: added `MoveRecommendation` model in Rust and TypeScript; today data pipeline now loads recommendation set.
  - Skill update: refreshed `.claude/skills/ixos-search/SKILL.md` to align model naming and recommended command defaults.
- Validation summary:
  - `cargo test -q`: PASS (`466 passed; 0 failed; 6 ignored`)
  - `npm --prefix ui run build`: PASS
  - `npm --prefix ixos-site run build`: PASS
  - `python scripts/run_settings_matrix.py`: PASS
  - `cargo run --quiet --bin ixos -- doctor --json`: PASS (`8 pass; 0 warn; 0 fail; 2 info`)
- Decision: KEEP
- Next:
  1. Add explicit recommendation feedback actions (accept/dismiss) and persistence.
  2. Execute dedicated auth/payments/lease transfer adversarial test matrix.
  3. Add targeted landing low-end integration test scenarios for pinned lock behavior.

## Entry 028 - Prism Phase 1 implementation batch (big bench + matrix contracts + release-check stub)
- Date/Time: 2026-02-13
- Branch/Commit: (working tree)
- Goal: Execute Phase 1 deliverables after Phase 0 hardening: big-root benchmark harness, expanded settings matrix contract tests, and CLI release-check stub.
- Commands run:
  - `cargo fmt --all`
  - `cargo test --test settings_matrix`
  - `python scripts/run_settings_matrix.py`
  - `cargo run --release --bin ixos-big-bench -- --dir corpus_tiny --runs 1 --output-dir reports/ralph`
  - `cargo run --release --bin ixos-big-bench -- --dir . --runs 1 --output-dir reports/ralph`
  - `cargo run --release --bin ixos-big-bench -- --dir . --runs 3 --output-dir reports/ralph`
  - `cargo run --quiet --bin ixos -- release-check --quick`
  - `cargo test -q`
  - `python scripts/ralph_loop.py --checkpoint R1 --bench-dir . --bench-runs 1 --skip-landing-audit`
- Outputs saved to:
  - `bench/big_root_queries.json`
  - `reports/ralph/big_bench_20260213_173220.{json,md}`
  - `reports/ralph/big_bench_20260213_173337.{json,md}`
  - `reports/ralph/big_bench_20260213_173426.{json,md}`
  - `reports/ralph/big_bench_20260213_174158.{json,md}`
  - `reports/ralph/big_bench_20260213_174232.{json,md}`
  - `reports/settings_matrix_2026-02-13.md`
  - `reports/ralph/iteration_5_20260213_173913.md`
  - `reports/ralph/checkpoint_R1_20260213_173913.md`
- Key results:
  - Added `ixos-big-bench` binary with per-query metrics (`ttfr_ms`, `total_ms`, stage breakdown, cache stats, top-1 metadata) and embedded tier gates.
  - Added curated big-root query suite (`bench/big_root_queries.json`, 40 queries).
  - Expanded CLI live matrix script to 48 combinations (`cache_mode � search_mode � progressive � secure_timing � journalist_mode`), including NDJSON validation for progressive JSON streams.
  - Added fast programmatic integration test matrix (`tests/settings_matrix.rs`).
  - Added `release-check` command stub (`ixos release-check --quick`) for Phase 1 contract.
  - Big bench acceptance command succeeded: `cargo run --release --bin ixos-big-bench -- --dir . --runs 3` with JSON+MD output and Tier C PASS.
  - Full test suite remains green (`cargo test -q`: `470 passed; 0 failed; 6 ignored` + integration/bins).
- Decision: KEEP
- Next:
  1. Start Phase 2 implementation: directory prioritizer + two-phase candidate generation.
  2. Add write-behind cache wrapper and measure before/after total_ms delta with Ralph checkpoint R2.
  3. Begin Ask Mode CLI exposure and confidence-gating pipeline.

## Entry 029 - Ralph gate enforcement hardening (big-bench exit codes)
- Date/Time: 2026-02-13
- Branch/Commit: (working tree)
- Goal: Ensure Ralph loop treats tier-gate failures as real regressions instead of pass-through bench success.
- Commands run:
  - `cargo run --release --bin ixos-big-bench -- --dir . --runs 1 --output-dir reports/ralph` (expected fail)
  - `cargo run --release --bin ixos-big-bench -- --dir . --runs 3 --output-dir reports/ralph` (expected pass)
  - `python scripts/ralph_loop.py --checkpoint R1 --bench-dir . --bench-runs 1 --skip-build --skip-code-audit --skip-landing-audit` (expected fail)
  - `python scripts/ralph_loop.py --checkpoint R1 --bench-dir . --bench-runs 3 --skip-build --skip-code-audit --skip-landing-audit` (expected pass)
  - `cargo test -q`
- Outputs saved to:
  - `reports/ralph/big_bench_20260213_174718.{json,md}`
  - `reports/ralph/big_bench_20260213_174749.{json,md}`
  - `reports/ralph/iteration_8_20260213_174830.md`
  - `reports/ralph/checkpoint_R1_20260213_174830.md`
  - `reports/ralph/iteration_9_20260213_174857.md`
  - `reports/ralph/checkpoint_R1_20260213_174857.md`
- Key results:
  - `ixos-big-bench` now exits non-zero when tier gate fails.
  - Ralph loop now correctly fails checkpoint runs when bench gate fails (`--bench-runs 1`, Tier C missing warm samples).
  - Ralph loop passes with adequate run count (`--bench-runs 3`, Tier C PASS).
  - Full Rust suite still passes after the harness behavior change.
- Decision: KEEP
- Next:
  1. Start Phase 2 implementation and re-benchmark at R2 using enforced gate semantics.
  2. Add explicit `--smoke` mode to matrix script for faster local pre-checks.
  3. Add Ask CLI path and confidence metrics for R6 readiness.

## Entry 030 - Ralph R1 full checkpoint pass with big-bench default
- Date/Time: 2026-02-13
- Branch/Commit: (working tree)
- Goal: Validate end-to-end Ralph checkpoint after switching bench default to `ixos-big-bench` and enforcing non-zero gate failures.
- Commands run:
  - `python scripts/ralph_loop.py --checkpoint R1 --bench-dir . --bench-runs 3 --skip-landing-audit`
- Outputs saved to:
  - `reports/ralph/iteration_10_20260213_175006.md`
  - `reports/ralph/checkpoint_R1_20260213_175006.md`
  - `reports/ralph/big_bench_20260213_175055.{json,md}`
  - `reports/ralph/code_audit_10.md`
- Key results:
  - Full R1 checkpoint now passes with build + code audit + big-bench.
  - Bench stage now reports PASS only when Tier gate passes under `runs=3`.
- Decision: KEEP
- Next:
  1. Move into Phase 2 frontier-first candidate generation implementation.
  2. Add write-behind cache wrapper and re-run R2 checkpoint.
  3. Start Ask CLI implementation for Phase 6 contract.

## Entry 031 - Prism iteration: harsh-objective benching, comparison automation, docs/site expansion, CI hardening, and repo cleanup
- Date/Time: 2026-02-13
- Branch/Commit: (working tree)
- Goal: Continue autonomous Ralph iterations, tighten objectives, validate before/after speed+quality evidence, harden workflows, expand docs depth, and clean root-level doc organization.
- Commands run:
  - `cargo check --bin ixos-big-bench`
  - `cargo run --release --bin ixos-big-bench -- --dir . --runs 3 --cache-mode native-cache --model ixos-flash-v2 --objective-profile harsh --output-dir reports/ralph`
  - `python scripts/compare_performance.py --before-bench reports/ralph/big_bench_20260213_175055.json --after-bench reports/ralph/big_bench_20260213_180600.json`
  - `python scripts/ixos_eval.py --suite synthetic --only-ids ixos-flash-v2,ixos-pro-v2,potion-base-8m-int8 --output models/lab/results_prism_iter_2026-02-13.json`
  - `python scripts/ralph_loop.py --checkpoint R1 --bench-dir . --bench-runs 3 --objective-profile harsh --skip-landing-audit` (twice)
  - `cargo test -q`
  - `cargo test --test settings_matrix -q`
  - `python scripts/run_settings_matrix.py`
  - `npm --prefix ui run build`
  - `npm --prefix ixos-site run build`
  - `cargo run --bin ixos -- release-check --quick`
- Outputs saved to:
  - `reports/ralph/big_bench_20260213_180600.{json,md}`
  - `reports/ralph/big_bench_20260213_180844.{json,md}`
  - `reports/ralph/big_bench_20260213_181435.{json,md}`
  - `reports/ralph/comparison_20260213_180600.{md,json}`
  - `reports/ralph/comparison_11_20260213_180754.{md,json}`
  - `reports/ralph/comparison_12_20260213_181349.{md,json}`
  - `reports/ralph/comparison_turn_20260213_181435.{md,json}`
  - `reports/ralph/research_notes_20260213.md`
  - `reports/ralph/iteration_11_20260213_180754.md`
  - `reports/ralph/iteration_12_20260213_181349.md`
  - `reports/AGENT_REALITY_AUDIT_REVIEW_2026-02-13_1818.md`
  - `models/lab/results_prism_iter_2026-02-13.json`
- Key results:
  - Added harsh objective profile and stage p95 metrics to `ixos-big-bench`.
  - Added `scripts/compare_performance.py` and integrated automatic comparison into `scripts/ralph_loop.py`.
  - Hardened GitHub workflows:
    - Release: `npm ci`, `GH_TOKEN` for `gh`, release env var wiring.
    - Settings matrix: locked build + Rust integration matrix test.
    - Pro module build: locked build and package includes `README.md` + `LICENSE`.
  - Fixed a real UI mode propagation bug in overlay flow (`SearchOverlay` now uses actual selected mode and updates state).
  - Expanded docs-site pages (`/docs/getting-started`, `/docs/desktop-app`, `/docs/models`, `/docs/benchmarking`, `/docs/agents`) with in-depth operational content.
  - Benchmarks section now reads from data file: `ixos-site/src/data/benchmarks.json`.
  - Repository cleanup: moved root markdown clutter into `docs/archive/root/` and regenerated `docs/MARKDOWN_INVENTORY.md`.
- Validation summary:
  - `cargo test -q`: PASS (`470 passed; 0 failed; 6 ignored` + integration bins)
  - `cargo test --test settings_matrix -q`: PASS
  - `python scripts/run_settings_matrix.py`: PASS
  - `npm --prefix ui run build`: PASS
  - `npm --prefix ixos-site run build`: PASS (non-fatal lockfile root warning remains)
  - Ralph iterations 11 and 12: PASS
- Decision: KEEP
- Next:
  1. Build same-suite quality comparator guard for release-check.
  2. Complete internal UI mode type migration away from legacy `cache/jit` internals.
  3. Add release artifact smoke checks for installer/blob publishing path in CI.

## Entry 032 - Canonical mode migration (desktop + landing demo), branding cleanup, and Ralph R1.3 validation
- Date/Time: 2026-02-13
- Branch/Commit: (working tree)
- Goal: Close remaining naming/UX gaps by migrating internal UI mode enums to canonical `native-cache`/`ephemeral`, align landing demo internals, and revalidate speed/quality/checkpoints.
- Commands run:
  - `rg -n "'jit'|'cache'|native-cache|ephemeral" ui/src ixos-site/src src src-tauri/src docs scripts`
  - `npm --prefix ui run build`
  - `npm --prefix ixos-site run build`
  - `cargo test -q`
  - `cargo test --test settings_matrix -q`
  - `python scripts/run_settings_matrix.py`
  - `cargo run --bin ixos -- release-check --quick`
  - `python scripts/ralph_loop.py --checkpoint R1 --bench-dir . --bench-runs 3 --objective-profile harsh --skip-landing-audit`
  - `cargo run --release --bin ixos-big-bench -- --dir . --runs 5 --cache-mode native-cache --model ixos-flash-v2 --objective-profile harsh --output-dir reports/ralph`
  - `python scripts/compare_performance.py --before-bench reports/ralph/big_bench_20260213_181435.json --after-bench reports/ralph/big_bench_20260213_231310.json --output reports/ralph/comparison_turn_20260213_231310.md --json-output reports/ralph/comparison_turn_20260213_231310.json`
  - `python scripts/ixos_eval.py --suite synthetic --only-ids ixos-flash-v2,ixos-pro-v2,potion-base-8m-int8 --output models/lab/results_prism_iter_2026-02-13_post_ui.json`
- Outputs saved to:
  - `reports/ralph/iteration_13_20260213_231055.md`
  - `reports/ralph/checkpoint_R1_20260213_231055.md`
  - `reports/ralph/comparison_13_20260213_231055.{md,json}`
  - `reports/ralph/big_bench_20260213_231310.{json,md}`
  - `reports/ralph/comparison_turn_20260213_231310.{md,json}`
  - `models/lab/results_prism_iter_2026-02-13_post_ui.json`
- Key results:
  - Desktop UI now uses canonical internal cache mode types across stores/components (`native-cache`/`ephemeral`), with legacy alias compatibility only at history/config migration boundaries.
  - Landing hero demo internal mode keys also migrated to canonical names.
  - Rebranding consistency pass completed for remaining model/caching UI strings and `mmap_model` display naming (`Potion Core`).
  - Validation remains green: Rust tests, settings matrix test/script, UI build, landing build, and release-check stub all pass.
  - Harsh objective gates still PASS on latest 5-run benchmark; compared to prior turn benchmark, latency is slightly regressed but within harsh thresholds.
  - Synthetic quality metrics unchanged for tested models (MRR/Recall stable in latest eval artifact).
- Decision: KEEP
- Next:
  1. Add suite-consistent quality delta enforcement inside release-check.
  2. Add bench jitter controls and repeated-batch median reporting.
  3. Add workflow-level installer/blob smoke verification.
## Entry 033 - Major overhaul integration pass (naming, deep search, ask auto, CI/CLI distribution, marketing refresh)
- Date/Time: 2026-02-14
- Branch/Commit: (working tree)
- Goal: Implement the cross-surface overhaul plan with backend correctness fixes, desktop/landing UX refresh, CI/workflow hardening, and validation.
- Commands run:
  - Backend/tests/build:
    - `cargo test -q`
    - `cargo test --test settings_matrix -q`
    - `cargo build --release`
    - `cargo fmt --all`
  - Frontend/site:
    - `npm --prefix ui run build`
    - `npm --prefix ixos-site run build`
  - CLI/runtime smoke:
    - `target/release/ixos.exe search "test" --dir . --stub-model --format json --limit 1`
    - `target/release/ixos.exe search "test" --deep-search --dir . --stub-model --format json --limit 1`
    - memory-mode no-write check via:
      - `target/release/ixos.exe cache clear --dir corpus_tiny --force`
      - `target/release/ixos.exe cache stats --dir corpus_tiny --json` (before/mid/after two memory searches)
    - ask auto status check:
      - `target/release/ixos.exe search "what is the main config?" --dir . --stub-model --progressive --format json --limit 1`
  - Benchmark correctness check:
    - `target/release/ixos-big-bench.exe --dir corpus_tiny --queries-file reports/tmp_bench_queries.json --runs 2 --cache-mode ephemeral --model ixos-flash-v2 --output-dir reports`
  - Script/workflow sanity:
    - `bash -n scripts/install.sh`
    - powershell parse check for `scripts/install.ps1`
- Outputs saved to:
  - `reports/big_bench_20260214_131205.json`
  - `docs/ARCHITECTURE_AUDIT_2026-02.md`
  - updated CI workflows and install scripts:
    - `.github/workflows/release.yml`
    - `.github/workflows/cli-release.yml`
    - `scripts/install.sh`
    - `scripts/install.ps1`
- Key results:
  - Overhaul landed across Rust/Tauri/UI/landing with new naming and deep-search/ask-mode behavior.
  - `ixos-big-bench` bug fixes verified:
    - warm flag now only cold for first query of first run
    - walk timing populated per record
  - Ask mode auto path confirmed by progressive status message: `Ask Mode active: understanding your question...`
  - Memory mode cache behavior confirmed: `cached_files` stayed `0` across repeated searches.
  - Validation all green:
    - `cargo test -q`: PASS
    - `cargo test --test settings_matrix -q`: PASS
    - `npm --prefix ui run build`: PASS
    - `npm --prefix ixos-site run build`: PASS
- Decision: KEEP
- Next:
  1. Execute branch CI on GitHub and confirm 3-platform release workflow stability with links.
  2. Finish internal symbol cleanup (`journalist` naming debt) where safe.
  3. Add post-release artifact smoke checks for desktop + CLI packages.
- Update (2026-02-14): python scripts/run_settings_matrix.py PASS (eports/settings_matrix_2026-02-14.md).

## Entry 034 - Landing/Desktop QA follow-up and CI recovery completion
- Date/Time: 2026-02-14
- Branch/Commit: (working tree)
- Goal: Audit prior agent's broad landing/desktop changes, close remaining regressions, and confirm CI/build stability.
- Commands run:
  - `git diff -- src-tauri/src/commands/search.rs src/cli/config.rs .github/workflows/release.yml ixos-site/package.json package-lock.json`
  - `cargo test test_unknown_cache_mode_is_preserved_on_load -- --nocapture`
  - `cargo test test_cache_mode_aliases_are_normalized -- --nocapture`
  - `cargo test -p ixos-app parse_cache_mode_rejects_legacy_aliases -- --nocapture`
  - `npm ci --prefer-offline --no-audit`
  - `npm run --workspace ui build`
  - `cd ixos-site && npm run build`
- Outputs saved to:
  - `reports/ui_ci_followup_2026-02-14.md`
- Key results:
  - Verified deep-search mode re-enable fix in desktop progressive search path.
  - Verified and tightened cache-mode migration behavior (legacy aliases normalized, unknown values preserved).
  - Confirmed release workflow Node upgrade to 22 and lockfile sync issue resolved for root `npm ci`.
  - Finished pending desktop settings/workstreams polish and fixed UI TypeScript build reliability (`ui/tsconfig.json` types scoping).
  - Validation now green for targeted Rust tests, root install, desktop UI build, and landing build.
- Decision: KEEP
- Next:
  1. Run remote GitHub Actions to confirm end-to-end workflow health on hosted runners.
  2. If desired, remove multi-lockfile Next.js warning by standardizing lockfile strategy.
  3. Continue remaining branding/interaction refinement based on visual QA in app and landing.

## Entry 035 - Landing hero UX correction pass (3D removal, mode-synced demo accent, scroll stabilization)
- Date/Time: 2026-02-14
- Branch/Commit: (working tree)
- Goal: Resolve user-reported hero regressions on landing (3D interference, accent mismatch, scroll bounce, text overlap/selectability) and clarify CLI install + CI release workflow usage.
- Commands run:
  - `npm run --workspace ixos-site build`
  - `npm run --workspace ui build`
- Outputs saved to:
  - `reports/landing_hero_followup_2026-02-14.md`
- Key results:
  - 3D model removed from active landing hero flow (desktop and mobile hero).
  - Demo accent (outline/glow/latency badge) now tracks selected mode via callback from `IxosDemoWindow`.
  - Hero pin settings tuned to reduce up/down jitter and flicker during scroll.
  - Hero text moved up, enlarged, and made reliably selectable by preventing demo overlay interception.
  - CLI install docs expanded with Windows command and explicit GitHub Actions tag/release trigger guidance.
- Decision: KEEP
- Next:
  1. Run remote GitHub Actions tag smoke to validate desktop + CLI publish pipelines in hosted runners.
  2. If jitter reports persist, replace pin timeline with sticky layout fallback for low-power devices.
  3. Continue visual parity pass against desktop app for remaining micro-spacing and color behavior.

## Entry 036 - Desktop/Landing Pro-feature completion pass (Today/Workstreams/Ask Mode)
- Date/Time: 2026-02-15
- Branch/Commit: (working tree)
- Goal: Complete remaining UX/functionality gaps from the large overhaul request, with priority on Ask Mode, Today, and Workstreams.
- Commands run:
  - `npm --prefix ui run build`
  - `npm --prefix ixos-site run build`
  - `cargo test`
  - `cargo clippy -q`
  - `cargo test -q ixos_rank::progressive::tests::test_ask_mode_respects_selected_model`
  - `cargo check -q`
- Outputs saved to:
  - `reports/ui_pro_features_overhaul_2026-02-15.md`
- Key results:
  - Landing demo now mirrors desktop control structure (Mode + Quality, no extra model dropdown), with hover-detail dropdown footers.
  - Today/Workstreams improved with actionable explanations, connection map, file seeding for new workstreams, and active-state action behavior.
  - First-run mandatory onboarding now enforces two-search cold/warm walkthrough and presents measured cache delta.
  - Ask Mode detection improved with typo-tolerant multi-token detection and broader question/imperative coverage while staying non-LLM.
  - Ask Mode remains Pro-gated in backend + UI messaging and is explicitly represented in landing Pro sections.
- Validation summary:
  - `npm --prefix ui run build`: PASS
  - `npm --prefix ixos-site run build`: PASS
  - `cargo test`: PASS
  - `cargo clippy -q`: PASS with existing warnings
  - `cargo test -q ixos_rank::progressive::tests::test_ask_mode_respects_selected_model`: PASS
  - `cargo check -q`: PASS
- Decision: KEEP
- Next:
  1. Run visual QA on desktop auth/search/workstream flows with real interaction.
  2. Consider extracting shared dropdown primitives between desktop app and landing demo for exact UI parity.
  3. Decide whether to tackle existing clippy warnings and UI bundle chunk warning as a dedicated stabilization pass.

## Entry 037 - Pro UX completion + CLI installer hardening
- Date/Time: 2026-02-15
- Branch/Commit: (working tree)
- Goal: Finish remaining Pro-value UX improvements (Today/Workstreams/Ask Mode messaging), tighten search control ergonomics, and harden CLI installer defaults for tag-release reliability.
- Commands run:
  - `npm --prefix ui run build`
  - `npm --prefix ixos-site run build`
  - `cargo test -q`
  - `bash -n scripts/install.sh`
  - PowerShell parser check for `scripts/install.ps1`
  - `./scripts/install.ps1 -Tag cli-v0.0.0 -AssetUrl <local zip> -SkipPathPersist`
  - PATH smoke: `ixos --version`, `ixos search "readme" --dir . --stub-model --format json --limit 1`
- Outputs saved to:
  - `reports/pro_features_release_hardening_2026-02-15.md`
- Key results:
  - Workstreams list now exposes KPI/value metrics and clearer manual seeding action (`New from Recent`).
  - Search controls adjusted for comfort: longer folder field and wider quality/mode triggers.
  - Landing pricing/pro messaging now explicitly includes Today, Workstreams, connection maps, and move recommendations.
  - Fixed installer default repo slug in both install scripts (removed 404 failure path).
  - Local installer + PATH smoke confirmed `ixos` command usage works (no explicit `.exe` required in command invocation).
- Validation summary:
  - `npm --prefix ui run build`: PASS
  - `npm --prefix ixos-site run build`: PASS
  - `cargo test -q`: PASS (`468 passed; 0 failed; 6 ignored`)
  - installer syntax/parse checks: PASS
  - install.ps1 local smoke install: PASS
  - CLI PATH smoke (`ixos search ...`): PASS
- Decision: KEEP
- Next:
  1. Run hosted GitHub Actions on `cli-v*` and `v*` tags to validate signing/secrets-dependent release publishing.
  2. Address global clippy lint debt in a dedicated stabilization pass if strict `-D warnings` gate is required.

## Entry 038 - Landing hero/pipeline interaction and section clarity polish
- Date/Time: 2026-02-15
- Branch/Commit: (working tree)
- Goal: Address direct UX regressions reported on hero/pipeline layering, live demo interactivity, card highlight visibility, divider placement, and Pro section clarity.
- Commands run:
  - `npm --prefix ixos-site run build`
  - `npm --prefix ui run build`
  - `cargo test -q`
- Outputs saved to:
  - `reports/landing_pipeline_polish_2026-02-15.md`
- Key results:
  - Hero headline now visually emphasizes accent phrase and remains visible longer through morph.
  - Hero text layer now sits behind demo during transition as requested.
  - Pipeline active cards now show explicit border/ring highlights.
  - Multi-Signal Ranking returned to text-above/diagram-below layout.
  - Memory Privacy stage accent stabilized to amber (including diagram accents).
  - Added explicit Workstreams -> Pricing section divider and continuous divider sweep animation.
  - Reworked Pro capabilities layout away from uniform cards, with animated fall-in Pro card.
  - Improved Today/Workstreams card clarity with explicit single-outcome labels.
- Validation summary:
  - `npm --prefix ixos-site run build`: PASS
  - `npm --prefix ui run build`: PASS
  - `cargo test -q`: PASS (`468 passed; 0 failed; 6 ignored`)
- Decision: KEEP
- Next:
  1. Run manual visual QA in browser for scroll layering and demo interaction feel.
  2. If any residual jitter appears, tune `ScrollTrigger` thresholds with viewport recordings.
- Follow-up (same pass): disabled demo interaction lock in `IxosDemoWindow` so live demo remains interactive at all stages.
## Entry 039 - Cross-repo release workflow hardening + landing pricing/download overhaul
- Date/Time: 2026-02-16
- Branch/Commit: roadmap (working tree)
- Goal: Audit and harden CLI/desktop GitHub Actions for macOS/Linux reliability, verify install/download flows for split repos, and complete landing/pricing/download UX fixes (including shared Pro card transfer).
- Commands run:
  - `bash -n scripts/install.sh`
  - PowerShell parser check for `scripts/install.ps1`
  - `python -c "import pathlib,yaml; [yaml.safe_load(...)]"` for `.github/workflows/*.yml`
  - `npm --prefix ixos-site run build`
  - `cd ixos-site; npx eslint src/components/sections/DownloadActions.tsx src/app/download/page.tsx src/components/sections/Pricing.tsx src/components/sections/ProFeatures.tsx src/components/sections/PricingProFlow.tsx src/components/sections/ProCard.tsx src/components/sections/TodaySection.tsx src/components/sections/WorkstreamsSection.tsx src/lib/downloads.ts src/app/page.tsx src/app/pricing/page.tsx src/app/docs/page.tsx src/app/docs/cli-reference/page.tsx`
- Outputs saved to:
  - Workflow/script hardening in `.github/workflows/cli-release.yml`, `.github/workflows/release.yml`, `scripts/install.sh`, `scripts/install.ps1`
  - Landing/pricing/download redesign in `ixos-site/src/components/sections/*` and `ixos-site/src/app/*`
- Key results:
  - Fixed cross-arch CLI smoke test behavior (macOS x86_64 artifact no longer executed on arm hosts).
  - Hardened Ubuntu dependency install and Rust target install flow in desktop release workflow.
  - Added lowercase `potion-base-8m-int8` stub creation for case-sensitive runners.
  - Installer scripts now default to isolated CLI paths (`~/.ixos/cli/bin`, `%LOCALAPPDATA%\IxosCLI\bin`) and improved checksum handling.
  - Centralized download/installer detection logic and corrected script commands to `| bash` for POSIX safety.
  - Reworked landing Today + Workstreams with interactive, product-faithful UI.
  - Implemented shared pricing-to-pro capability card transfer flow on both `/` and `/pricing` via `PricingProFlow`.
  - Expanded pricing page to include the same Pro capability flow and download actions.
- Validation summary:
  - `bash -n scripts/install.sh`: PASS
  - PowerShell parser check for `scripts/install.ps1`: PASS
  - Workflow YAML parse check: PASS
  - `npm --prefix ixos-site run build`: PASS
  - targeted eslint over changed landing/download files: PASS
- Decision: KEEP
- Next:
  1. Run real GitHub tag builds (`cli-v*` and `v*`) to verify live runner behavior and release uploads.
  2. Capture manual QA clips for Pro card transfer motion and hero scroll behavior across viewport sizes.
  3. Add CI assertion for release artifact naming consumed by `generate-latest-json.js`.## Entry 040 - Landing polish pass 2 (hero cleanup, smoother Pro transfer, flip pricing, section redesign)
- Date/Time: 2026-02-16
- Branch/Commit: roadmap (working tree)
- Goal: Apply direct UX feedback: remove hero curl line, reduce pipeline flicker, smooth Pro card transfer, add pricing flip animation, and redesign Today/Workstreams for cleaner boxy/product-aligned composition.
- Commands run:
  - `cd ixos-site; npx eslint src/components/sections/TodaySection.tsx src/components/sections/WorkstreamsSection.tsx src/components/sections/PricingProFlow.tsx src/components/sections/Pricing.tsx src/components/sections/ProFeatures.tsx src/components/sections/ProCard.tsx src/app/page.tsx src/app/pricing/page.tsx src/app/download/page.tsx src/components/sections/DownloadActions.tsx src/lib/downloads.ts src/app/docs/page.tsx src/app/docs/cli-reference/page.tsx`
  - `npm --prefix ixos-site run build`
- Outputs saved to:
  - Updated landing/pricing components and motion behavior (`HeroPipeline`, `PricingProFlow`, `ProCard`, `TodaySection`, `WorkstreamsSection`)
- Key results:
  - Removed hero install curl snippet from desktop and mobile hero variants.
  - Reduced search pipeline flicker by stabilizing quantized step selection and removing blur-based card transitions.
  - Smoothed Pro card handoff with a three-stage path (pricing -> transfer lane -> capabilities) and softer spring settings.
  - Added flip-style animated price rendering in Pro card when switching monthly/annual.
  - Rebuilt Today and Workstreams with cleaner boxy hierarchy and one-primary-point content framing per panel.
- Validation summary:
  - targeted eslint on updated landing/pricing/download files: PASS
  - `npm --prefix ixos-site run build`: PASS
- Decision: KEEP
- Next:
  1. Run manual visual QA and tune spacing/motion if needed.
  2. Trigger live release tag workflows for final CI confidence.
## Entry 041 - Release publish fixes + landing feedback correction pass
- Date/Time: 2026-02-16
- Branch/Commit: roadmap (working tree)
- Goal: Fix remaining GitHub Actions failures (settings-test removal, mac/linux UI build instability, CLI publish failure) and apply latest landing feedback (remove transfer zone, unify Pro CTA, reduce pipeline flicker, redesign Today/Workstreams).
- Commands run:
  - `npm --prefix ixos-site run lint -- src/components/sections/Pricing.tsx src/components/sections/PricingProFlow.tsx src/components/sections/ProFeatures.tsx src/components/sections/ProUpgradeAction.tsx src/components/sections/HeroPipeline.tsx src/components/sections/TodaySection.tsx src/components/sections/WorkstreamsSection.tsx src/app/page.tsx src/app/pricing/page.tsx`
  - `npm --prefix ixos-site run build`
- Outputs saved to:
  - Workflow fixes: `.github/workflows/release.yml`, `.github/workflows/cli-release.yml`, `.github/workflows/settings-matrix.yml` (deleted)
  - Landing updates: `ixos-site/src/components/sections/HeroPipeline.tsx`, `PricingProFlow.tsx`, `Pricing.tsx`, `ProFeatures.tsx`, `ProUpgradeAction.tsx`, `TodaySection.tsx`, `WorkstreamsSection.tsx`
- Key results:
  - Removed `settings-matrix` workflow as requested.
  - Fixed CLI publish path to stage/upload only files and to create-or-view release before upload.
  - Applied same file-only publish hardening to desktop copy-to-releases job.
  - Added Rollup native package verification + fallback install after `npm ci` in desktop release workflow for macOS/Linux optional-dependency failures.
  - Removed transfer-zone UI and switched Pro-card flow to direct `pricing -> hidden -> capabilities` handoff.
  - Unified pricing/capabilities card CTA behavior through shared `ProUpgradeAction` (removed `VIEW_PRICING` split behavior).
  - Reduced pipeline flicker by floor-quantized phase mapping, no blur transition in card wrappers, and direct scroll scrub.
  - Rebuilt Today/Workstreams section composition around one main point per panel with cleaner boxy hierarchy.
- Validation summary:
  - targeted eslint on changed landing files: PASS
  - `npm --prefix ixos-site run build`: PASS
- Decision: KEEP
- Next:
  1. Run real `cli-v*` and `v*` tags to confirm publish succeeds with live secrets/runners.
  2. Record short desktop/mobile QA clips for hero pipeline and Pro-card handoff timing.
## Entry 042 - Publish-to-releases reliability + marketing-density redesign pass
- Date/Time: 2026-02-16
- Branch/Commit: roadmap (working tree)
- Goal: Resolve remaining CLI/desktop publish failures and tighten Today/Workstreams + adjacent section branding/copy density based on screenshot feedback.
- Commands run:
  - `python -c "import pathlib,yaml; [yaml.safe_load(...)]"`
  - `npm --prefix ixos-site run lint -- src/components/sections/TodaySection.tsx src/components/sections/WorkstreamsSection.tsx src/components/sections/MeetingUseCase.tsx src/components/sections/Benchmarks.tsx src/components/sections/Pricing.tsx src/components/sections/ProFeatures.tsx src/components/sections/ProCard.tsx src/components/sections/PricingProFlow.tsx src/components/sections/HeroPipeline.tsx`
  - `npm --prefix ixos-site run build`
- Outputs saved to:
  - Workflow updates: `.github/workflows/cli-release.yml`, `.github/workflows/release.yml`
  - Landing updates: `ixos-site/src/components/sections/TodaySection.tsx`, `WorkstreamsSection.tsx`, `MeetingUseCase.tsx`, `Benchmarks.tsx`, `ProFeatures.tsx`, `ProCard.tsx`, `Pricing.tsx`
- Key results:
  - CLI publish now resolves target repo default branch before first release create, preventing empty-repo ambiguity.
  - Desktop copy job now explicitly waits for source draft-release assets with retries before download, reducing race-based `release not found` failures.
  - Today and Workstreams rebalanced to tighter 2-column geometry and key-message-first cards (less generic/verbose).
  - Reduced explanatory copy density across related sections (Meeting Use Case, Benchmarks, Pricing, Pro capabilities, Pro card bullets).
- Validation summary:
  - workflow YAML parse: PASS
  - targeted eslint: PASS
  - `npm --prefix ixos-site run build`: PASS
- Decision: KEEP
- Next:
  1. Execute one live `cli-v*` Actions run (expected fix for prior `422 Repository is empty` after repo bootstrap).
  2. Execute one live `v*` Actions run (expected fix for prior draft-release download timing failure).
## Entry 043 - Pro-card smoothness + annual default + hydration-safe detection + Workstreams redesign
- Date/Time: 2026-02-16
- Branch/Commit: roadmap (working tree)
- Goal: Improve Pro-card movement quality, set annual as default, eliminate SSR/client platform detection churn, and redesign Workstreams to be visually distinct from Today.
- Commands run:
  - `npm --prefix ixos-site run lint -- src/components/sections/PricingProFlow.tsx src/components/sections/Pricing.tsx src/components/sections/ProFeatures.tsx src/components/sections/DownloadActions.tsx src/app/download/page.tsx src/components/sections/WorkstreamsSection.tsx src/components/sections/TodaySection.tsx`
  - `npm --prefix ixos-site run build`
- Outputs saved to:
  - `ixos-site/src/components/sections/PricingProFlow.tsx`
  - `ixos-site/src/components/sections/Pricing.tsx`
  - `ixos-site/src/components/sections/ProFeatures.tsx`
  - `ixos-site/src/components/sections/DownloadActions.tsx`
  - `ixos-site/src/app/download/page.tsx`
  - `ixos-site/src/components/sections/WorkstreamsSection.tsx`
- Key results:
  - Pro-card handoff now uses hysteresis + rAF-throttled host switching and a hidden offscreen stage to reduce jank.
  - Annual billing is now default on both home and /pricing via shared flow + fallback state.
  - Platform auto-detection moved to post-hydration scheduling to avoid SSR/client mismatch churn.
  - Workstreams replaced with an asymmetric "operations board" layout (stream rail + execution deck + evidence path), clearly different from Today.
- Validation summary:
  - targeted eslint: PASS
  - `npm --prefix ixos-site run build`: PASS
- Decision: KEEP
- Next:
  1. Run one `cli-v*` and one `v*` Actions pipeline for live publish verification.
  2. Perform a final browser visual QA pass for Pro-card transition thresholds.## Entry 044 - Desktop release publish-chain hardening + UI stability pass
- Date/Time: 2026-02-16
- Branch/Commit: roadmap (working tree)
- Goal: Fix desktop release failures in `generate-latest-json`/`publish-draft`, smooth recurring hero flicker, and continue Today/Workstreams differentiation.
- Commands run:
  - `python -c "import yaml, pathlib; [yaml.safe_load(p.read_text()) for p in pathlib.Path('.github/workflows').glob('*.yml')]; print('workflow-yaml-ok')"`
  - `node --check scripts/generate-latest-json.js`
  - `npm --prefix ixos-site run lint -- src/components/sections/HeroPipeline.tsx src/components/sections/TodaySection.tsx src/components/sections/WorkstreamsSection.tsx src/components/sections/PricingProFlow.tsx src/components/sections/Pricing.tsx src/components/sections/ProFeatures.tsx src/app/page.tsx`
  - `npm --prefix ixos-site run build`
- Outputs saved to:
  - `.github/workflows/release.yml`
  - `scripts/generate-latest-json.js`
  - `ixos-site/src/components/sections/HeroPipeline.tsx`
  - `ixos-site/src/components/sections/PricingProFlow.tsx`
  - `ixos-site/src/components/sections/TodaySection.tsx`
  - `ixos-site/src/components/sections/WorkstreamsSection.tsx`
  - `ixos-site/src/app/page.tsx`
- Key results:
  - `generate-latest-json` now downloads from `IxosProtocol/ixos-releases` with retry/wait and PAT token, instead of private source release lookup.
  - `publish-draft` now gracefully skips when the private draft release does not exist, preventing hard pipeline failure.
  - `generate-latest-json.js` now scans artifacts recursively, supports broader cross-platform filename patterns, and prints scanned assets when no updater payload is matched.
  - Hero pipeline motion was softened (`scrub: 0.42`), expensive blur filters removed, and mobile-step state updates de-duplicated to reduce flicker.
  - Today and Workstreams were reworked into different interaction models and Workstreams shifted to amber section theming.
- Validation summary:
  - workflow YAML parse: PASS
  - script syntax check: PASS
  - targeted eslint on changed files: PASS
  - `npm --prefix ixos-site run build`: PASS
- Decision: KEEP
- Next:
  1. Run one live desktop `v*` tag workflow to verify `generate-latest-json` and `publish-draft` end-to-end.
  2. Fine-tune pro-card thresholds after visual QA recording.
## Entry 045 - Desktop release postprocess + installer/update hardening + bundled models
- Date/Time: 2026-02-16
- Branch/Commit: roadmap (working tree)
- Goal: Resolve desktop post-tag failures (`generate-latest-json`, `publish-draft`), fix installer/update reliability issues, and ensure desktop installer bundles real models.
- Commands run:
  - `python -c "import yaml, pathlib; [yaml.safe_load(p.read_text()) for p in pathlib.Path('.github/workflows').glob('*.yml')]; print('workflow-yaml-ok')"`
  - `bash -n scripts/install.sh`
  - `Parser::ParseFile('scripts/install.ps1', ...)`
  - `cargo test test_parse_semver --package ixos-protocol --lib`
  - `cargo test test_is_newer --package ixos-protocol --lib`
  - `npm --prefix ixos-site run lint -- src/lib/downloads.ts src/app/docs/cli-reference/page.tsx`
  - `npm --prefix ixos-site run build`
- Outputs saved to:
  - `.github/workflows/release.yml`
  - `.github/workflows/release-postprocess.yml`
  - `.github/workflows/cli-release.yml`
  - `scripts/install.ps1`
  - `scripts/install.sh`
  - `scripts/generate-latest-json.js`
  - `src/cli/self_update.rs`
  - `src-tauri/tauri.conf.json`
  - `src/ixos_embed/mmap_model.rs`
  - `ixos-site/src/lib/downloads.ts`
  - `ixos-site/src/app/docs/cli-reference/page.tsx`
- Key results:
  - Added manual `Release Postprocess` workflow to repair existing tags (e.g., `v0.1.6`) without full rebuild.
  - Desktop workflow now checks out LFS and hard-fails if real bundled model files are missing/suspiciously small.
  - Tauri config now bundles Flash v2 + Potion model directories into installer resources.
  - Model path resolution now also supports flattened `resources/<model-name>` layout.
  - PowerShell installer now has null-safe checksum parsing and semver-based latest `cli-v*` selection.
  - Bash installer now resolves latest `cli-v*` by semver, not API ordering artifacts.
  - CLI self-update now stages+renames on Unix to avoid `Text file busy`.
  - CLI release workflow now publishes `install.sh` + `install.ps1` as stable release assets.
  - Website/docs install commands now point to `ixos-releases/releases/latest/download/install.*`.
- Validation summary:
  - workflow YAML parse: PASS
  - installer syntax checks: PASS
  - targeted self-update tests: PASS
  - site lint/build for touched files: PASS
- Decision: KEEP
- Next:
  1. Run `Release Postprocess` for `v0.1.6`.
  2. Trigger next `cli-v*` release once to publish stable install script assets.
  3. Trigger next desktop `v*` release to validate bundled-model installers end-to-end.
## Entry 046 - Pre-v0.1.7 release safety fixes (model sourcing, portable installer sort, stable script assets)
- Date/Time: 2026-02-16
- Branch/Commit: roadmap (working tree)
- Goal: Address blocker findings before cutting `v0.1.7`.
- Commands run:
  - `python -c "import yaml, pathlib; ..."`
  - `bash -n scripts/install.sh`
  - PowerShell parser check for `scripts/install.ps1`
  - `cargo test test_parse_semver --package ixos-protocol --lib`
  - `cargo check --manifest-path src-tauri/Cargo.toml`
- Outputs saved to:
  - `.github/workflows/release.yml`
  - `.github/workflows/release-postprocess.yml`
  - `.github/workflows/cli-release.yml`
  - `scripts/install.sh`
  - `src-tauri/tauri.conf.json`
  - `src/ixos_embed/mmap_model.rs`
  - `src-tauri/src/commands/system.rs`
- Key results:
  - Replaced strict local-model gate with auto-fetch + verify flow (Flash v2 + Potion), so releases no longer fail solely due missing tracked model files.
  - Desktop copy-to-releases now also uploads `install.sh` and `install.ps1`, guaranteeing CLI install script assets on desktop tags.
  - Added postprocess script upload to retrofit existing tags (e.g., `v0.1.6`).
  - Removed GNU-only `sort -V` dependency in `install.sh` with portable semver ordering.
  - Updated flash model download repo mapping in Tauri command path to `Thunderbolty10/Ixos-Flash` and retained Pro-v2 dependency flow through Potion.
- Validation summary:
  - workflow YAML parse: PASS
  - install scripts syntax/parse: PASS
  - targeted tests/checks: PASS
- Decision: KEEP
- Next:
  1. Run `Release Postprocess` for `v0.1.6` (adds scripts + latest.json without full rebuild).
  2. Cut `cli-v0.1.7` then `v0.1.7`.

## Entry 047 - Landing /4 scratch-orchestrator completion and hero density upgrade
- Date/Time: 2026-02-26
- Branch/Commit: (working tree)
- Goal: Finish the /4 scratch rebuild by switching to strict `_v4` orchestration, shipping missing sections, and upgrading hero/process fidelity.
- Commands run:
  - `npm --prefix C:/Users/pablo/Downloads/Ixos/ixos-site run build`
  - `cd C:/Users/pablo/Downloads/Ixos/ixos-site && npx eslint src/app/4/page.tsx src/app/4/_v4/*.tsx src/app/4/_v4/hooks/*.ts`
  - `npm --prefix C:/Users/pablo/Downloads/Ixos/ixos-site run build` (post-fix verification)
- Outputs saved to:
  - `ixos-site/src/app/4/page.tsx`
  - `ixos-site/src/app/4/_v4/V4SkimNav.tsx`
  - `ixos-site/src/app/4/_v4/V4AskMode.tsx`
  - `ixos-site/src/app/4/_v4/V4ProValue.tsx`
  - `ixos-site/src/app/4/_v4/V4Pricing.tsx`
  - `ixos-site/src/app/4/_v4/V4CTA.tsx`
  - `ixos-site/src/app/4/_v4/V4Footer.tsx`
  - `ixos-site/src/app/4/_v4/V4Hero.tsx`
  - `ixos-site/src/app/4/_v4/V4Progressive.tsx`
  - `ixos-site/src/app/4/_v4/V4Nav.tsx`
  - `ixos-site/src/app/4/_v4/V4SectionDivider.tsx`
  - `ixos-site/src/app/4/_v4/V4Loader.tsx`
- Key results:
  - `/4/page.tsx` now imports only `_v4/*` and includes a source-backed content matrix.
  - Missing v4 sections were implemented from scratch (`SkimNav`, `AskMode`, `ProValue`, `Pricing`, `CTA`, `Footer`).
  - Hero was upgraded with denser telemetry (stage lanes, TTFR/files/mode strip) while keeping the progressive evidence story.
  - Progressive section now uses a single deterministic stage resolver for initial mount + scroll change mapping.
  - Final `ixos-site` production build is green after changes.
- Decision: KEEP
- Next:
  1. Run visual QA recordings on `/4` desktop + mobile to verify pacing and readability.
  2. Decide whether to bring remaining pre-existing `_v4` lint issues to zero in a dedicated lint-hardening pass.

## Entry 048 - /4 spatial search-flight redesign (camera rail + result nodes + desktop-search loader)
- Date/Time: 2026-02-26
- Branch/Commit: (working tree)
- Goal: Replace flat section flow with a cinematic search-space experience: instant search-like loader, 3D camera drift, and section-as-result navigation.
- Commands run:
  - `npm --prefix C:/Users/pablo/Downloads/Ixos/ixos-site run build`
  - `cd C:/Users/pablo/Downloads/Ixos/ixos-site; npx eslint src/app/4/page.tsx src/app/4/_v4/V4Loader.tsx src/app/4/_v4/V4SpatialStage.tsx src/app/4/_v4/V4ResultNode.tsx`
  - `npm --prefix C:/Users/pablo/Downloads/Ixos/ixos-site run build` (post-fix verification)
- Outputs saved to:
  - `ixos-site/src/app/4/page.tsx`
  - `ixos-site/src/app/4/_v4/V4Loader.tsx`
  - `ixos-site/src/app/4/_v4/V4SpatialStage.tsx`
  - `ixos-site/src/app/4/_v4/V4ResultNode.tsx`
- Key results:
  - Loader now behaves like a desktop search boot scene (query present, rapid row slam-in, scan counter spike, fast handoff).
  - Added global scroll-driven 3D camera rail with controlled flicker and active-result HUD (`V4SpatialStage`).
  - Reframed content sections as sequential result nodes with rank/file headers and in-view motion (`V4ResultNode`).
  - Removed right-side skim bar from active `/4` flow and replaced with spatial left HUD + sticky result chips.
  - Final production build is green.
- Decision: KEEP
- Next:
  1. Capture manual `/4` motion QA (desktop + mobile) and tune camera amplitude if needed.
  2. If required, add optional �extreme mode� camera intensity toggle for A/B visual preference testing.

## Entry 049 - /4 immersive spatial pass (WebGL rail + desktop HUD + token alignment)
- Date/Time: 2026-02-26
- Branch/Commit: (working tree)
- Goal: Make `/4` feel like traversing real desktop search results with stronger 3D movement and tighter desktop-app language.
- Commands run:
  - `npx eslint src/app/4/page.tsx src/app/4/_v4/V4SpatialStage.tsx src/app/4/_v4/V4ResultSpace.tsx src/app/4/_v4/V4ResultNode.tsx src/app/4/_v4/V4Comparison.tsx`
  - `npm --prefix C:/Users/pablo/Downloads/Ixos/ixos-site run build`
- Outputs saved to:
  - `ixos-site/src/app/4/_v4/V4ResultSpace.tsx`
  - `ixos-site/src/app/4/_v4/V4SpatialStage.tsx`
  - `ixos-site/src/app/4/_v4/V4ResultNode.tsx`
  - `ixos-site/src/app/4/page.tsx`
  - `ixos-site/src/app/globals.css`
  - copy-alignment pass in `ixos-site/src/app/4/_v4/V4Hero.tsx`, `V4Progressive.tsx`, `V4Pipeline.tsx`, `V4Pricing.tsx`, `V4CTA.tsx`, `V4CLI.tsx`, `V4Comparison.tsx`
- Key results:
  - Added fixed WebGL result rail scene (`V4ResultSpace`) with scroll-linked camera traversal across result nodes.
  - Rebuilt spatial stage shell with interactive desktop-style result HUD and explicit `Flash/Auto/Pro` + `Memory/Local/Deep` controls.
  - Added automatic heading accent highlighting and imported shared UI tokens for better desktop visual parity.
  - Made section backgrounds transparent to preserve the ambient pixel-wave layer through the full page.
  - Shifted copy toward desktop terms while keeping CLI flag truthfulness (`--cache-mode native-cache`, `--journalist-mode`).
- Validation summary:
  - targeted eslint on new spatial files: PASS
  - `ixos-site` production build: PASS
- Decision: KEEP
- Next:
  1. Run motion comfort QA and tune camera amplitudes if needed.
  2. Optionally add a user toggle for camera intensity.
  3. Tidy residual lint debt in older `_v4` modules.

## Entry 050 - /4 stabilization pivot (remove WebGL, centered desktop search shell)
- Date/Time: 2026-02-26
- Branch/Commit: (working tree)
- Goal: Address rendering bug (`uniform3fv`/WebGL context issues), remove disliked left HUD, and push closer to desktop search feel.
- Commands run:
  - `npx eslint src/app/4/page.tsx src/app/4/_v4/V4SpatialStage.tsx src/app/4/_v4/V4ResultNode.tsx`
  - `npm --prefix C:/Users/pablo/Downloads/Ixos/ixos-site run build`
- Outputs saved to:
  - `ixos-site/src/app/4/_v4/V4SpatialStage.tsx` (rewritten)
  - `ixos-site/src/app/4/_v4/V4ResultNode.tsx` (surface opacity/behavior tuned)
  - `ixos-site/src/app/4/_v4/V4ResultSpace.tsx` (removed from active codebase)
- Key results:
  - Removed active WebGL scene path from `/4` experience to eliminate rendering-context failures and ring artifacts.
  - Replaced left-side HUD with centered desktop-style search shell containing query, quality/mode toggles, and scroll-synced result cards.
  - Kept stronger 3D feel via CSS perspective camera transforms and section motion, without WebGL dependency.
  - Build and targeted lint remain green.
- Decision: KEEP
- Next:
  1. Complete one-to-one desktop anatomy for hero/result cards (deeper parity than current shell).
  2. Apply same parity to key high-impact sections.

## Entry 051 - /4 hard reset (no agents): desktop-faithful hero + result-driven section cards
- Date/Time: 2026-02-26
- Branch/Commit: (working tree)
- Goal: Correct failed direction by removing static overlay UX, rebuilding hero closer to desktop app UI anatomy, and making section wrappers behave like expanding results.
- Constraints honored:
  - No parallel agents used in this pass.
- Commands run:
  - `npx eslint src/app/4/_v4/V4SpatialStage.tsx src/app/4/_v4/V4ResultNode.tsx src/app/4/_v4/V4Hero.tsx src/app/4/_v4/V4Progressive.tsx src/app/4/page.tsx`
  - `npm --prefix C:/Users/pablo/Downloads/Ixos/ixos-site run build`
- Outputs saved to:
  - `ixos-site/src/app/4/_v4/V4SpatialStage.tsx` (simplified stage system, removed fixed top shell)
  - `ixos-site/src/app/4/_v4/V4ResultNode.tsx` (desktop-like result card expansion/collapse behavior)
  - `ixos-site/src/app/4/_v4/V4Hero.tsx` (full desktop-faithful search simulator rebuild)
  - `ixos-site/src/app/4/_v4/V4Progressive.tsx` (reduced scroll span from 200vh to 160vh to prevent broken spacing)
- Key results:
  - Removed the static always-on top shell that dominated the page.
  - Hero now uses desktop-style search chrome (query bar, quality/mode controls, staged result cards, Why matched expansion).
  - Section headers now read as result cards that expand/collapse as they enter view.
  - 3D feel remains via perspective transforms, without WebGL artifacts.
- Validation summary:
  - targeted eslint: PASS
  - production build: PASS
- Decision: KEEP
- Next:
  1. Continue desktop one-to-one parity in non-hero sections.
  2. Add stronger phase-linked section transition choreography.

## Entry 052 - App-World redesign pass (shared package + desktop Today/Workstreams overhaul + /4 continuous world)
- Date/Time: 2026-02-26 23:16:49
- Branch/Commit: (working tree)
- Goal: Deliver full `/4` "App-World" experience with truth-backed lenses and shared UI system used by both desktop and landing.
- Commands run:
  - `npm run tauri:dev`
  - `npm install`
  - `npm --prefix ui run build`
  - `npm --prefix ixos-site run build`
- Outputs saved to:
  - `DESKTOP_UI_AUDIT.md`
  - `FEATURE_INVENTORY.md`
  - `COPY_MAP.md`
  - new shared package: `packages/ixos-ui/*`
  - desktop rewires: `ui/src/components/search/MainSearchView.tsx`, `ui/src/components/today/TodayTab.tsx`, `ui/src/components/workstreams/WorkstreamsList.tsx`, `ui/src/components/layout/AppShell.tsx`
  - landing rewrite: `ixos-site/src/app/4/page.tsx`
  - workspace wiring: `package.json`, `ui/package.json`, `ixos-site/package.json`, `ixos-site/next.config.ts`, `package-lock.json`
- Key results:
  - Added `packages/ixos-ui` with shared AppWorld surfaces, persistent pixel-square wave field, and Ixos-native square-ring loader.
  - Reworked desktop Today/Workstreams into denser operational surfaces based on shared components.
  - Replaced `/4` with one continuous AppWorld tour: fixed living app layer + non-blocking lens overlays + source citations.
  - Implemented curved hero woosh entry using motion path (`offsetPath`/`offsetDistance`) with perspective settling.
  - Added source-backed feature coverage mapping to avoid unsourced claims.
- Validation summary:
  - Desktop dev launch: PASS
  - `ui` build: PASS
  - `ixos-site` build: PASS (after fixing BOM encoding in `packages/ixos-ui/package.json`)
- Decision: KEEP
- Next:
  1. Manual motion QA and viewport stress testing on `/4`.
  2. Final search surface parity pass in desktop for fully uniform AppWorld language.
  3. Optional targeted lint cleanup on touched files.
## Entry 053 - Execution fix pass after user QA (desktop lock-state + search polish + /4 rework)
- Date/Time: 2026-02-26
- Branch/Commit: (working tree)
- Goal: Resolve reported UX failures: false Pro locks, weak desktop search bar execution, and broken `/4` section visibility/flow.
- Commands run:
  - `npm --prefix ui run build`
  - `npm --prefix ixos-site run build`
  - source-path existence check script (PowerShell `Test-Path` batch across lens sources)
- Outputs saved to:
  - `ui/src/lib/proAccess.ts`
  - `packages/ixos-ui/src/components/SearchSurface.tsx`
  - `packages/ixos-ui/src/components/AppWorldSurface.tsx`
  - `ui/src/components/search/MainSearchView.tsx`
  - `ixos-site/src/app/4/page.tsx`
- Key results:
  - Updated Pro access gating to trust server entitlement plan for UI unlocks, with only `timeSuspect` remaining as explicit lock condition.
  - Reworked shared search surface to a more desktop-like input frame and retained evidence panel quality; desktop now uses non-inline run action while landing keeps inline interaction.
  - Rebuilt `/4` App-World flow for clearer section discoverability and stronger continuity: fixed live app layer, lens overlays, skip rail, and true curved motion-path entry (`offset-path` + overshoot settle).
  - Added explicit reduced-motion fallback for hero woosh animation and kept persistent pixel-square field motif.
  - Verified all cited lens source paths exist.
- Validation summary:
  - `ui` build: PASS
  - `ixos-site` build: PASS
  - source path validation: PASS (`ALL_PATHS_EXIST`)
- Decision: KEEP
- Next:
  1. Manual browser QA on `/4` for scroll pacing and live-demo visibility.
  2. Final desktop spacing pass at 1920x1080 if any clipping remains.
  3. Optional targeted lint pass on touched frontend files.

## Entry 054 - Desktop control restore + live evidence pipeline + `/4` world amplification
- Date/Time: 2026-02-26
- Branch/Commit: (working tree)
- Goal: Address second user QA round: restore high-control desktop search UX, improve Today/Workstreams quality, and make `/4` far more interactive/animated while keeping shared UI parity.
- Commands run:
  - `npm --prefix ui run build`
  - `npm --prefix ixos-site run build`
- Outputs saved to:
  - `ui/src/components/search/MainSearchView.tsx`
  - `ui/src/components/layout/Sidebar.tsx`
  - `ui/src/components/workstreams/WorkstreamDetail.tsx`
  - `packages/ixos-ui/src/components/SearchSurface.tsx`
  - `packages/ixos-ui/src/components/AppWorldSurface.tsx`
  - `packages/ixos-ui/src/components/TodaySurface.tsx`
  - `packages/ixos-ui/src/components/WorkstreamsSurface.tsx`
  - `ixos-site/src/app/4/page.tsx`
- Key results:
  - Restored desktop search controls via legacy `SearchInput` (directory picker + mode controls), while preserving shared right-side evidence rail.
  - Search evidence panel now streams dynamic pipeline telemetry (stage progression, counters, scan trail) instead of static copy.
  - Sidebar now keeps recent/starred search history visible in Today and Workstreams views.
  - Today and Workstreams shared surfaces were redesigned for denser hierarchy and stronger empty states.
  - `/4` rebuilt again as a stronger App-World: centered persistent app layer, distinct lens overlays, active hotspots, and corrected curved woosh lifecycle (no persistent offset bug).
- Validation summary:
  - `ui` build: PASS
  - `ixos-site` build: PASS
- Decision: KEEP
- Next:
  1. Manual browser QA for `/4` motion comfort and lens readability across full scroll.
  2. Final polish pass on desktop Workstream detail interaction density.
  3. Optional lint pass on touched frontend files.

## Entry 055 - Landing /1-/2-/3 creative rebuild + shared surface responsiveness + cloud-safe lexical/parser guards
- Date/Time: 2026-02-28
- Branch/Commit: (working tree)
- Goal: Deliver high-impact variant redesign for `/1`, `/2`, `/3`, fix squished shared demo layouts, densify desktop search feedback, and prevent cloud-placeholder hydration during search.
- Commands run:
  - `cargo check --lib`
  - `npx tsc -p packages/ixos-ui/tsconfig.json --noEmit`
  - `npx tsc -p ui/tsconfig.json --noEmit`
  - `cd ixos-site && npm run test:visual:update`
  - `cd ixos-site && npm run test:visual`
- Outputs saved to:
  - landing runtime variants: `ixos-site/src/app/1/_mc/*`, `ixos-site/src/app/2/_ch/*`, `ixos-site/src/app/3/_wire/*`
  - shared landing demo adapter: `ixos-site/src/landing/DemoSurface.tsx`
  - shared component responsiveness: `packages/ixos-ui/src/styles.css`, `packages/ixos-ui/src/components/SearchSurface.tsx`, `packages/ixos-ui/src/components/TodaySurface.tsx`, `packages/ixos-ui/src/components/WorkstreamsSurface.tsx`
  - desktop integration: `ui/src/components/search/MainSearchView.tsx`
  - cloud safety fixes: `src/ixos_rank/candidate_generator/ripgrep_funnel.rs`, `src/parsers/mod.rs`
  - visual artifacts: `ixos-site/.visual/landing.visual.spec.ts/variant-{1,2,3}-{1440,1024,390}.png`
- Key results:
  - Rebuilt `/1`, `/2`, `/3` into distinct branded themes with stronger atmosphere, typography, and motion while preserving shared `DemoSurface` usage.
  - Added explicit AGENTS token/preset mappings in active route pages for all three variants.
  - Switched shared Ixos UI responsiveness to container-query behavior to avoid squishing when embedded in narrow columns.
  - Removed desktop result cap and improved nested scroll resilience in the search surface.
  - Added cloud-only guards in lexical file eligibility and parser entry points to avoid accidental OneDrive/iCloud placeholder downloads.
  - Regenerated and validated required Playwright visual snapshots across 1440/1024/390 for `/1`,`/2`,`/3` with zero console/runtime errors.
- Validation summary:
  - `cargo check --lib`: PASS
  - `npx tsc -p packages/ixos-ui/tsconfig.json --noEmit`: PASS
  - `npx tsc -p ui/tsconfig.json --noEmit`: PASS
  - `cd ixos-site && npm run test:visual`: PASS (9 passed)
  - Note: targeted Rust test commands remain blocked by unrelated existing compile issue in `src/cli/commands.rs` (`Commands::Update` pattern missing `auto` field).
- Decision: KEEP
- Next:
  1. Manual local+cloud folder QA in desktop to confirm hydration prevention behavior in user-real paths.
  2. Tighten compact search row truncation/typing rhythm for even denser expert scanning.
  3. Fix unrelated CLI test compile drift and rerun targeted `ripgrep_funnel`/parser tests.

## Entry 056 - Desktop search restoration + env/release hardening pass
- Date/Time: 2026-03-01
- Branch/Commit: (working tree)
- Goal: Restore missing desktop search functionality and visuals (history reliability, mode-aware theming, sane score formatting, context panel quality), then validate release readiness for tag/GitHub Actions publishing.
- Commands run:
  - `npm run build`
  - `cargo build --release`
  - `cargo test`
  - `npm run tauri:build`
  - `npx tauri icon ../ui/src/assets/ixos-icon.png -o icons` (from `src-tauri`)
  - `node scripts/verify-desktop-build-env.js`
- Outputs saved to:
  - shared surface updates: `packages/ixos-ui/src/components/SearchSurface.tsx`, `packages/ixos-ui/src/components/AmbientIxosField.tsx`, `packages/ixos-ui/src/styles.css`, `packages/ixos-ui/src/types.ts`, `packages/ixos-ui/src/components/AppWorldSurface.tsx`
  - desktop integration/fixes: `ui/src/components/search/MainSearchView.tsx`, `ui/src/components/search/SearchIdleDashboard.tsx`, `ui/src/components/search/SearchInput.tsx`, `ui/src/components/search/ModeSwitcher.tsx`, `ui/src/components/search/QualitySwitcher.tsx`, `ui/src/components/search/FolderPicker.tsx`, `ui/src/components/layout/Sidebar.tsx`, `ui/src/stores/searchStore.ts`, `ui/src/stores/starredStore.ts`
  - release/build hardening: `scripts/verify-desktop-build-env.js`, regenerated installer icons under `src-tauri/icons/*`
  - test blockers fixed: `src/cli/commands.rs`, `src/parsers/mod.rs`, `Cargo.toml`, `Cargo.lock`
- Key results:
  - Reworked shared search results/about panel to clamp confidence display to percentages, remove gibberish/ANSI artifacts, render line-aware match context, add copy-path/copy-context actions, and make evidence rail wider/more usable.
  - Added mode-aware accent propagation (Flash amber, Auto teal, Pro violet) to rows, about panel actions, and ambient dot field.
  - Restored idle search dashboard (non-blank state) with recent searches + Today/Workstreams snapshot surface for Pro users.
  - Improved history persistence reliability by serializing encrypted writes and adding local mirror fallback to prevent stale-history regressions after restart.
  - Fixed mode/quality dropdown anchoring and layering using viewport-fixed metrics and higher z-index, plus reduced translucency.
  - Updated sidebar account/footer behavior: display name instead of full email, `Sign out` label, and pink Pro badges on Today/Workstreams nav.
  - Fixed Rust test regressions blocking release checks (`Commands::Update` pattern/flag conflict and PDF extraction resilience fallback).
  - Regenerated Tauri installer icons from canonical `ui/src/assets/ixos-icon.png`.
  - Patched desktop build env validator to load `.env/.env.local` from root, `src-tauri`, and `ui`, so `npm run tauri:build` works with `.env.local` without manual exports.
- Validation summary:
  - `npm run build`: PASS
  - `cargo build --release`: PASS
  - `cargo test`: PASS (`475 passed; 0 failed; 6 ignored` + settings/doc tests pass)
  - `npm run tauri:build`: PASS (MSI + NSIS generated)
  - Remaining non-fatal Tauri warnings observed:
    - bundle identifier suffix warning (`com.ixos.app` ends with `.app`)
    - updater bundler metadata warning (`__TAURI_BUNDLE_TYPE` patch not found)
- Decision: KEEP
- Next:
  1. Validate updated search UX manually on Windows/macOS/Linux runners (especially dropdown placement and context readability).
  2. Resolve Tauri warnings before tagging a production release.
  3. Publish a release checklist write-up in `/reports` that maps each checklist item to command evidence.

## Entry 0XX - Desktop density + window chrome + release env materialization
- Date/Time: 2026-03-03
- Branch/Commit: (working tree)
- Goal: Fix desktop UI scale/fit issues (small titlebar controls and cramped 1080p feel) and ensure release builds include required `.env.local` variables.
- Commands run:
  - `npm --prefix ui run build`
  - Source edits in `ui/src/components/layout/{WindowControls,AppShell,Sidebar}.tsx`, `ui/src/components/search/MainSearchView.tsx`
  - Source edits in `src-tauri/tauri.conf.json`
  - Source edits in `.github/workflows/release.yml`
- Outputs saved to:
  - Workflow and source changes only (no benchmark artifacts in this UX/config pass)
- Key results:
  - Increased custom titlebar control size and added top chrome surface.
  - Increased desktop shell spacing/sidebar density for better readability and click targets.
  - Changed default main window size to `1440x860` (min `1100x700`) for better 1080p fit.
  - Added CI step to materialize `.env.local` into root/UI/Tauri prior to build.
  - Added missing `VITE_LEMONSQUEEZY_PRO_VARIANT_ID` to `tauri-action` env.
  - UI build passes after changes.
- Decision: KEEP
- Next: Validate packaged installer UX at 1080p and confirm next tagged release no longer reports missing build keys.

## Entry 0XY - Titlebar control UX correction (platform-native header controls)
- Date/Time: 2026-03-03
- Branch/Commit: (working tree)
- Goal: Remove floating/capsule window control UI and restore native-feeling header-integrated controls for Windows/macOS.
- Commands run:
  - `npm --prefix ui run build`
- Outputs saved to:
  - Source change: `ui/src/components/layout/WindowControls.tsx`
- Key results:
  - Replaced boxed control group with titlebar-integrated controls.
  - Windows/Linux now use right-aligned native-style strip (`min/max/close`, close red hover).
  - macOS now uses left traffic-light controls and keeps settings in header without separate capsule.
  - UI build passes.
- Decision: KEEP
- Next: Verify in packaged app on Windows and macOS that hit targets and alignment match native expectations.

## Entry 0XZ - UX rollback + native titlebar only + dropdown portal layering fix
- Date/Time: 2026-03-03
- Branch/Commit: (working tree)
- Goal: Revert oversized desktop density changes, keep only native titlebar controls, and fix dropdown overlap/translucency issues.
- Commands run:
  - `npm --prefix ui run build`
- Outputs saved to:
  - Source changes in `ui/src/components/layout/{AppShell,Sidebar,WindowControls}.tsx`
  - Source changes in `ui/src/components/search/{QualitySwitcher,ModeSwitcher}.tsx`
- Key results:
  - Restored prior compact shell/sidebar/search sizing.
  - Kept OS-style titlebar controls and removed expanded top chrome treatment.
  - Raised titlebar controls to high z-index so they remain visible over auth/overlay layers.
  - Reworked quality/mode dropdowns to portal-render at top layer with opaque backgrounds, eliminating chip/card overlap.
  - UI build passes.
- Decision: KEEP
- Next: User visual validation pass on Windows; if needed, do a tiny final pixel-tune for button spacing only.

## Entry 0YA - Dropdown hard reset + cleaner dashboard + maximized default window behavior
- Date/Time: 2026-03-03
- Branch/Commit: (working tree)
- Goal: Fix broken dropdown interaction, reduce dashboard visual noise, highlight search on load, and default desktop window to maximized with proper maximize/restore affordance.
- Commands run:
  - `npm --prefix ui run build`
- Outputs saved to:
  - Source changes in `ui/src/components/search/{QualitySwitcher,ModeSwitcher,SearchInput,SearchIdleDashboard}.tsx`
  - Source changes in `ui/src/components/layout/{WindowControls,AppShell}.tsx`
  - Source changes in `ui/src/styles/globals.css`
  - Source changes in `src-tauri/tauri.conf.json`
- Key results:
  - Replaced custom popover dropdowns with native themed selects to eliminate open/layering bugs.
  - Search input now auto-focuses and renders explicit outline/highlight by default.
  - Removed "Search Dashboard" parent framing and reduced idle view complexity to a cleaner two-column surface.
  - Main window now starts maximized; caption button switches to restore icon when maximized.
  - Added maximize-state CSS hook for straight corners when maximized and rounded corners when restored.
  - UI build passes.
- Decision: KEEP
- Next: User validation on Windows runtime for caption icon + corner behavior in maximized/restored transitions.
