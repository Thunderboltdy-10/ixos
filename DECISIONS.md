# DECISIONS.md - Ixos v2

## Decision template
- Decision:
- Options considered:
- Why chosen:
- Evidence (links to /reports or output files):
- Risks:
- Follow-ups:

---

## Decisions
- Decision: Establish Phase 0 tracking files and start reality check from repo docs
- Options considered: Start with baseline measurements; start with code search only
- Why chosen: Required by task instructions; provides compaction-safe state
- Evidence (links to /reports or output files): reports/REALITY_MAP.md, PLAN.md, RUNLOG.md
- Risks: None
- Follow-ups: Complete Phase 0 ingest and fill Reality Map
- Decision: Add heavy-format parsing with byte caps (pdf/docx/xlsx/pptx) and PPTX extraction; treat RTF as plain text; add fixtures + parser tests
- Options considered: Skip heavy formats; parse without caps; rely on external tools
- Why chosen: Meets Gate B parsing requirements while keeping hot-path caps for privacy/perf
- Evidence (links to /reports or output files): reports/PARSING_STATUS.md, tests/fixtures/*, src/parsers/mod.rs
- Risks: Some large docs skipped due to cap; PPT binary unsupported
- Follow-ups: Run cargo test; document limits in final writeup

- Decision: Implement Pro v2 cascade as potion fast pass with flash refinement only on top-K/uncertain region
- Options considered: Keep flash-first auto; always run flash; full dual-embed for all candidates
- Why chosen: Matches required cascade design, reduces flash work to top-K, tunable via auto_mode thresholds
- Evidence (links to /reports or output files): src/ixos_rank/progressive.rs
- Risks: Auto quality regression if refinement thresholds too lax; tune after eval
- Follow-ups: Re-run evals/perf; adjust auto_mode thresholds if needed

- Decision: Add top-K partial selection in semantic rerank (select_nth_unstable_by + sort_unstable_by)
- Options considered: Full sort; SIMD batch cosine; persistent buffers
- Why chosen: Meets ranking improvement requirement with minimal API changes and lower sort cost on large candidate sets
- Evidence (links to /reports or output files): src/ixos_rank/semantic_engine.rs
- Risks: If limit mis-specified, could truncate useful results; limit set by callers
- Follow-ups: Confirm perf delta in profile runs
- Decision: Promote ixos-flash-v2 (int8, 512d) as production default (derived from ixos-flash-v4-int8-512)
- Options considered: Keep flash v1; ship v4-int8-512 as a separate fast variant
- Why chosen: Large size/latency reduction with minimal quality loss; aligns with new naming
- Evidence (links to /reports or output files): models/lab/results_flash_v2_2026-02-03.json, reports/model_v2_benchmark_report.md
- Risks: Slight MRR regression vs flash v1 on canonical suite
- Follow-ups: Full pro v2 fusion rerun on canonical suite

- Decision: Define Pro v2 as cascade/fusion (Flash v2 + Potion + lexical) and hide Potion from UI/CLI
- Options considered: Expose Potion as Pro; keep ixos-pro-v1 as Pro
- Why chosen: Pro quality is fusion; legacy pro underperforms flash
- Evidence (links to /reports or output files): models/ixos-pro-v2/pro_v2.json, reports/REALITY_MAP.md
- Risks: Pro v2 latency if refinement triggers too often
- Follow-ups: Tune auto routing thresholds if needed

- Decision: Add Ask Mode regression test to ensure selected model is respected
- Options considered: Manual check only; no regression test
- Why chosen: Prevents silent regression where Ask Mode forces Pro
- Evidence (links to /reports or output files): src/ixos_rank/progressive.rs (test_ask_mode_respects_selected_model)
- Risks: Test may be sensitive to lexical stub behavior
- Follow-ups: Expand test to validate pro engine not called in Flash mode

- Decision: Reduce Pro v2 fusion eval to smoke sample due to runtime constraints
- Options considered: Full 200/200 canonical run; skip Pro v2 eval
- Why chosen: Required real-model evaluation while keeping runtime manageable
- Evidence (links to /reports or output files): models/lab/results_v2_fusion_flashv2_real_2026-02-03.json, ..._synth_...
- Risks: Small sample may overstate quality
- Follow-ups: Re-run full canonical suite on dedicated machine

- Decision: Skip drive root in scale bench selection
- Options considered: Allow root; require manual path
- Why chosen: Root caused access denied; requirement forbids asking user
- Evidence (links to /reports or output files): scripts/scale_bench.py
- Risks: Auto-discovery may miss largest corpus if stored at root
- Follow-ups: Add allowlist override in future
- Decision: Re-run Pro v2 fusion with --only-ids to avoid full manifest sweep
- Options considered: Let full manifest run complete; skip canonical Pro v2
- Why chosen: Full manifest evaluation was impractically slow; only Flash v2 + Potion are required for Pro v2 metrics
- Evidence (links to /reports or output files): models/lab/results_v2_fusion_flashv2_2026-02-03.json
- Risks: None (canonical settings preserved)
- Follow-ups: None

- Decision: Update Pro v2 fusion weights to new learned values
- Options considered: Keep legacy weights (0.2697/0.2672/0.4631); retune on different suite
- Why chosen: New weights derived from Flash v2 canonical run match current default model
- Evidence (links to /reports or output files): models/lab/results_v2_fusion_flashv2_2026-02-03.json, models/ixos-pro-v2/pro_v2.json
- Risks: Minor behavior shift vs legacy weights
- Follow-ups: Monitor Auto routing thresholds if quality shifts
- Decision: Skip eager Pro index initialization in CLI Auto mode
- Options considered: Keep indexing both engines in Auto; index Pro lazily only when refinement triggered; disable Pro refinement entirely in Auto
- Why chosen: Auto refinement reranks top-K lexical candidates and does not require a full Pro index upfront; eager indexing made Auto as slow as Pro on large repos
- Evidence (links to /reports or output files): src/main.rs, reports/v2_repo_latency_summary_2026-02-05_213420.json, reports/v2_repo_latency_after_auto_index_fix_summary_2026-02-05_221919.json, reports/v2_rescue_search_pass_2026-02-05.md
- Risks: If future Auto path needs Pro pure search with empty lexical candidates, lazy/no index path may underperform for that edge case
- Follow-ups: Add conditional lazy Pro indexing only when an Auto path actually requires Pro pure search

- Decision: Tighten Auto refinement gate and cap refinement timeout at 2.5s
- Options considered: Always refine Auto; keep existing OR-based heuristic; disable refinement for short queries entirely
- Why chosen: Existing heuristic over-triggered refinement on short queries and hurt perceived latency; multi-signal gating preserves refinement for low-confidence cases while reducing unnecessary Pro work
- Evidence (links to /reports or output files): src/ixos_rank/progressive.rs, reports/v2_repo_latency_after_auto_gate_v2_summary_2026-02-05_220605.json, reports/v2_repo_latency_after_auto_index_fix_summary_2026-02-05_221919.json
- Risks: Possible quality loss for ambiguous short queries where refinement is now skipped
- Follow-ups: Run relevance A/B on real user query logs and retune thresholds if recall drops

- Decision: Clamp lexical match ratio to [0,1]
- Options considered: Keep unbounded ratio values; rescale thresholds only in Auto heuristic
- Why chosen: Ratio values above 1.0 break the intended semantics of matched_terms/total_terms and distort downstream gating/fusion
- Evidence (links to /reports or output files): src/ixos_rank/types.rs, src/ixos_rank/progressive.rs
- Risks: Small score distribution shift in components that previously relied on over-1 ratios
- Follow-ups: Verify fusion relevance on canonical eval suite after clamp

- Decision: Gate document extraction phase behind explicit document intent or document-path signals
- Options considered: Keep unconditional document search; disable document search globally; run document phase only when ripgrep returns zero hits
- Why chosen: Unconditional parsing caused avoidable latency on code-only queries; intent/path gating preserves document retrieval paths while removing the default penalty
- Evidence (links to /reports or output files): src/ixos_rank/candidate_generator/mod.rs, reports/document_search_gate_fix_2026-02-05.md
- Risks: Some document-only queries without explicit signals may skip document phase
- Follow-ups: Add telemetry/profile run to tune gate criteria if recall drops on document-heavy workloads

- Decision: Remove `.env` from hardcoded skip list used by path/ripgrep/document walkers
- Options considered: Keep `.env` in list; move `.env` behind config flag; remove `.env` from shared hardcoded list
- Why chosen: `.env` is a file (not a directory) and is often a relevant search target for config keys; hard-skipping it causes silent misses
- Evidence (links to /reports or output files): src/ixos_rank/candidate_generator/path_engine.rs, reports/dotenv_skiplist_fix_2026-02-05.md
- Risks: Slightly more files may be traversed in hidden-enabled scans
- Follow-ups: Add end-to-end test with hidden scanning enabled to validate `.env` retrieval path

- Decision: Skip eager Pro indexing in Tauri Auto mode and start stream path from Flash immediately
- Options considered: Keep eager Pro indexing for all modes; disable Pro refinement in Auto; lazily index only for Pro-primary mode
- Why chosen: Eager Pro index delayed first streaming updates and made Auto feel frozen on large repos; Pro-primary still indexes explicitly
- Evidence (links to /reports or output files): src-tauri/src/commands/search.rs, reports/ui_streaming_classification_fix_2026-02-05.md
- Risks: If future Auto path requires full Pro index earlier, this may need conditional lazy init logic
- Follow-ups: Add explicit instrumentation for "time-to-first-stream-event" in Tauri integration tests

- Decision: Use one shared score-based classifier for result badge and "Why this matched"
- Options considered: Keep threshold rule in results and separate proxy logic in explanation; hide classification badges entirely; centralize scoring interpretation
- Why chosen: Removes contradictory UI signals and ensures ranking explanation mirrors score breakdown data
- Evidence (links to /reports or output files): ui/src/lib/matchClassification.ts, ui/src/components/search/SearchResults.tsx, ui/src/components/search/WhyMatched.tsx, reports/ui_streaming_classification_fix_2026-02-05.md
- Risks: Labels like "Integrity" may be less intuitive than a simple text/semantic dichotomy
- Follow-ups: Validate label comprehension with a short usability pass and adjust naming if needed

- Decision: Rebuild landing hero + pipeline as one scroll-driven storyboard with progress-derived state
- Options considered: Keep existing GSAP timeline with ad-hoc fades; split hero and pipeline into separate sections; rebuild as one pinned section with deterministic progress mapping
- Why chosen: Progress-derived state gives smooth reverse-scroll behavior, cleaner active-step synchronization, and direct control over demo lift/reveal timing
- Evidence (links to /reports or output files): ixos-site/src/components/sections/HeroPipeline.tsx, reports/ui_docs_refresh_2026-02-06.md
- Risks: Scroll choreography is more custom and may need breakpoint tuning on edge viewport sizes
- Follow-ups: Run manual viewport sweep and capture updated visuals for QA artifacts

- Decision: Enforce uppercase `//` divider labels from shared components instead of per-call-site policing
- Options considered: Update every call site manually; leave mixed casing; normalize in shared component
- Why chosen: One normalization point avoids regressions and keeps landing + desktop consistent automatically
- Evidence (links to /reports or output files): ixos-site/src/components/ui/SectionDivider.tsx, ui/src/components/ui/SectionDivider.tsx, reports/ui_docs_refresh_2026-02-06.md
- Risks: None
- Follow-ups: Keep uppercase in any non-shared custom `//` labels where semantic casing matters

- Decision: Organize markdown discoverability via docs hub + generated inventory instead of mass file moves
- Options considered: Move all markdown files into new folders; keep current spread with no index; add centralized catalog + taxonomy docs
- Why chosen: Avoids breaking existing references while making every markdown file discoverable and grouped
- Evidence (links to /reports or output files): docs/MARKDOWN_INVENTORY.md, docs/README.md, docs/engineering/MARKDOWN_ORGANIZATION.md, reports/ui_docs_refresh_2026-02-06.md
- Risks: Physical file sprawl remains; organization is index-driven rather than path-cleanup
- Follow-ups: Optional second pass to migrate selected legacy docs into archive folders with link updates

- Decision: Run pipeline demo in fully scroll-guided controlled mode (no autonomous query cycle while section is active)
- Options considered: Keep time-based query loop and only map highlight state; disable demo state changes entirely; drive query/stage transitions from scroll step only
- Why chosen: Removes the "off" feeling from autonomous loops and aligns visual meaning to scroll intent
- Evidence (links to /reports or output files): ixos-site/src/components/hero/IxosDemoWindow.tsx, ixos-site/src/components/sections/HeroPipeline.tsx, reports/ui_docs_refresh_2026-02-06.md
- Risks: Controlled flow is less varied (single guided query) unless intentionally expanded later
- Follow-ups: Add optional set of scroll-scripted queries for future narrative variants

- Decision: Replace single docs page with multi-page docs IA and move non-operational root markdown into docs archive
- Options considered: Keep card-heavy one-page docs; split content partially but keep root markdown sprawl; full docs route segmentation + root cleanup
- Why chosen: Significantly improves readability/discoverability and removes root clutter while preserving operational root files required by agent workflow
- Evidence (links to /reports or output files): ixos-site/src/app/docs/layout.tsx, ixos-site/src/app/docs/getting-started/page.tsx, ixos-site/src/app/docs/desktop-app/page.tsx, ixos-site/src/app/docs/models/page.tsx, ixos-site/src/app/docs/benchmarking/page.tsx, ixos-site/src/app/docs/agents/page.tsx, docs/archive/root/, docs/MARKDOWN_INVENTORY.md, reports/ui_docs_refresh_2026-02-06.md
- Risks: Existing external links targeting old root markdown paths may need redirect/update
- Follow-ups: Add explicit redirect notes in docs for moved archival files if needed

- Decision: Replace controlled-stage search restarts with pause-resume stage progression and remove hero pulse effect
- Options considered: Keep restarting search on each stage step; fully freeze demo state between stages; pause-resume current search run and only restart on backward jumps
- Why chosen: Restarting caused visible scan/embed/rank cycling jitter; pause-resume preserves narrative continuity and keeps scroll behavior deterministic, while pulse removal reduces visual noise
- Evidence (links to /reports or output files): ixos-site/src/components/hero/fakeSearch.ts, ixos-site/src/components/hero/IxosDemoWindow.tsx, ixos-site/src/components/sections/HeroPipeline.tsx, reports/ui_docs_refresh_2026-02-06.md
- Risks: Controlled flow now favors one guided query, so variety is reduced during the section
- Follow-ups: Add optional curated query scripts as an explicit variant instead of autonomous looping

- Decision: Move docs rendering away from minimal prose defaults to dedicated docs typography + active side navigation
- Options considered: Keep existing prose-only styles; convert each section into separate card components; add docs-specific long-form styles with single-flow content
- Why chosen: User requested readable documentation without fragmented heading cards; custom docs styles increase contrast, spacing, and scanability while preserving one continuous page flow per topic
- Evidence (links to /reports or output files): ixos-site/src/app/globals.css, ixos-site/src/components/docs/DocsSideNav.tsx, ixos-site/src/app/docs/layout.tsx, ixos-site/src/app/docs/page.tsx
- Risks: Styling now depends on global docs class names and should be kept consistent on future docs pages
- Follow-ups: Add screenshot-based visual regression for docs pages at mobile/tablet/desktop breakpoints

- Decision: Increase hero/pipeline layout scale and raise baseline stage-card contrast
- Options considered: Keep compact layout and only tweak font size; increase only hero demo dimensions; increase full section grid dimensions plus card opacity/contrast
- Why chosen: User feedback indicated both size and brightness issues across hero demo and surrounding how-it-works components; combined sizing + contrast changes address both simultaneously
- Evidence (links to /reports or output files): ixos-site/src/components/sections/HeroPipeline.tsx, RUNLOG.md (Entry 017)
- Risks: On smaller laptop heights, larger grid may feel denser
- Follow-ups: Validate 1366x768 and 1440x900 visual balance in manual QA

- Decision: Use Channel-only delivery for progressive search events in desktop backend
- Options considered: Keep dual transport (Channel + global event bus); keep dual transport and widen dedupe window; channel-only for progressive path
- Why chosen: Dual transport caused duplicate event processing when fallback bus events arrived outside dedupe window
- Evidence (links to /reports or output files): src-tauri/src/commands/search.rs, ui/src/hooks/useTauriEvent.ts, reports/desktop_release_hardening_2026-02-08.md
- Risks: Legacy integrations relying on `search-event` must explicitly opt-in with `VITE_LEGACY_SEARCH_EVENT_BUS=1`
- Follow-ups: Remove legacy bus hook entirely after one release cycle if no regressions are reported

- Decision: Centralize Pro-access evaluation in one helper and reuse across desktop views
- Options considered: Keep per-component Pro checks; centralize in store selector; centralize in shared helper
- Why chosen: Inconsistent checks caused Pro users to appear locked in Today/Workstreams/Related files while other views showed Pro
- Evidence (links to /reports or output files): ui/src/lib/proAccess.ts, ui/src/components/today/TodayTab.tsx, ui/src/components/workstreams/WorkstreamsList.tsx, reports/desktop_release_hardening_2026-02-08.md
- Risks: Any future entitlement model changes must update the helper
- Follow-ups: Move helper into store-level derived selector in a later cleanup pass

- Decision: Add production desktop build env gate via `tauri:build:prod`
- Options considered: Rely on docs only; fail at runtime when env is missing; fail at build time with explicit validation script
- Why chosen: Missing `VITE_API_URL`/`IXOS_JWT_PUBLIC_KEY` caused release-only entitlement failures; build-time validation prevents shipping broken binaries
- Evidence (links to /reports or output files): scripts/verify-desktop-build-env.js, package.json, release/CHECKLIST.md, reports/desktop_release_hardening_2026-02-08.md
- Risks: Developers must set env vars explicitly for production packaging
- Follow-ups: Integrate env validation in CI release workflow as a required gate

- Decision: Enforce Pro search mode in Rust backend and downgrade Auto->Flash when Pro capability/status is unavailable
- Options considered: Keep UI-only locks; allow Auto/Pro for all users; backend capability enforcement with graceful Auto downgrade
- Why chosen: UI-only checks are bypassable and previously allowed free users into Pro paths; backend enforcement guarantees entitlement correctness while preserving free-user search availability
- Evidence (links to /reports or output files): src-tauri/src/commands/search.rs, RUNLOG.md (Entry 019), reports/desktop_release_hardening_2026-02-08.md
- Risks: Users with stale/misconfigured entitlement tokens will be forced to Flash until refresh succeeds
- Follow-ups: Add explicit in-app messaging for backend token-verify failures in packaged release QA

- Decision: Make Pro fallback evaluation plan-aware in UI helper (`token.plan == pro`) instead of status-only
- Options considered: Entitlement-only checks; status-only fallback; entitlement-or-(status+plan) fallback
- Why chosen: Status reflects token liveness, not subscription tier, so status-only fallback can falsely unlock Pro for free users
- Evidence (links to /reports or output files): ui/src/lib/proAccess.ts, ui/src/components/today/TodayTab.tsx, ui/src/components/workstreams/WorkstreamsList.tsx, RUNLOG.md (Entry 019)
- Risks: If backend stops including `plan` in token payload, fallback path will deny Pro until entitlement object is present
- Follow-ups: Keep token claim schema (`plan`) as required contract in control-plane docs

- Decision: Issue subscription-bounded entitlement tokens on lease refresh and transfer-confirm endpoints
- Options considered: Keep TTL-only tokens on refresh/transfer; force online check every search; refresh/transfer with `subscriptionEnd` bounded expiry
- Why chosen: TTL-only refresh/transfer could allow Pro tokens beyond actual subscription lifecycle edges (renewal/cancel timing)
- Evidence (links to /reports or output files): ixos-site/src/app/api/desktop/lease/refresh/route.ts, ixos-site/src/app/api/desktop/lease/transfer/confirm/route.ts, RUNLOG.md (Entry 019)
- Risks: Requires reliable subscription period data in control-plane DB path
- Follow-ups: Add lifecycle integration tests for cancel->grace->free and renew->pro transitions

- Decision: Add runtime entitlement public-key bootstrap path for desktop auth
- Options considered: Require compile-time key only; allow unsigned token fallback; runtime key fetch + backend install with strict JWT verification preserved
- Why chosen: Packaged builds missing `IXOS_JWT_PUBLIC_KEY` caused token validation failures in production; runtime bootstrap restores secure verification without weakening signature checks
- Evidence (links to /reports or output files): src-tauri/src/commands/auth.rs, ixos-site/src/app/api/desktop/entitlement-key/route.ts, ui/src/components/auth/AuthGate.tsx, RUNLOG.md (Entry 020), reports/desktop_release_hardening_2026-02-08.md
- Risks: If key endpoint is unavailable, token sync can still fail until env is fixed
- Follow-ups: Keep build-time env gate as primary guardrail and treat runtime bootstrap as recovery path

- Decision: Remove startup auto-downgrade writes of search mode (Auto/Pro -> Flash) when Pro status is transiently unknown
- Options considered: Keep eager downgrade; gate downgrade behind explicit loading flag; remove auto-write and enforce locks at interaction/backend boundaries
- Why chosen: Eager downgrade permanently reset saved preferences for legitimate Pro users during initial auth load
- Evidence (links to /reports or output files): ui/src/components/search/SearchInput.tsx, ui/src/components/settings/SearchSettings.tsx, ui/src/lib/proAccess.ts, RUNLOG.md (Entry 020)
- Risks: Non-Pro users may still see stored Auto/Pro preference in config until they interact
- Follow-ups: Add explicit entitlement loading state in auth store to make lock states and persisted preferences more transparent

- Decision: Skip eager semantic indexing for low-latency Flash/Auto non-Ask desktop searches
- Options considered: Always eager index; fully remove indexing; conditional eager index (Ask/Pro only) with immediate stream bootstrap
- Why chosen: Eager indexing on large trees delayed first visible progress, making search appear frozen before lexical streaming
- Evidence (links to /reports or output files): src-tauri/src/commands/search.rs, RUNLOG.md (Entry 020), reports/desktop_release_hardening_2026-02-08.md
- Risks: Pure-semantic fallback quality can be reduced when lexical phase yields nothing in non-Ask/Flash paths
- Follow-ups: Add targeted benchmark for zero-lexical query cases and decide whether to reintroduce deferred/lazy indexing fallback

- Decision: Allow Flash search fallback when backend entitlement token is missing, but keep Pro mode strictly blocked
- Options considered: Hard-fail all searches without token; allow all modes without token; allow Flash/Auto fallback while rejecting Pro
- Why chosen: Prevents production "authentication required" dead-ends for baseline search while preserving entitlement enforcement for Pro paths
- Evidence (links to /reports or output files): src-tauri/src/commands/search.rs, RUNLOG.md (Entry 021), reports/release_smoke_matrix_2026-02-08.md
- Risks: Users with broken entitlement sync may temporarily run Flash instead of intended Pro mode until refresh succeeds
- Follow-ups: Add explicit UI prompt when backend is in Flash-fallback mode due missing token

- Decision: Gate Pro status polling on token presence and clear cached token when backend validation fails
- Options considered: Keep polling regardless of token state; only suppress UI rendering; token-aware polling + stale token purge
- Why chosen: Prevents transient startup "expired" states and avoids lingering invalid cached tokens that break backend auth/search consistency
- Evidence (links to /reports or output files): ui/src/components/auth/AuthGate.tsx, RUNLOG.md (Entry 021)
- Risks: Requires successful lease/token refresh for Pro reactivation after stale token purge
- Follow-ups: Add a dedicated auth-store loading flag for entitlement/pro-status phases

- Decision: Normalize Windows extended path prefixes in golden harness before comparison
- Options considered: Update expected fixtures to Windows absolute paths; disable golden on Windows; path normalization in test harness
- Why chosen: Removed false negatives from `\\?\`/`//?/` path formatting without weakening retrieval correctness assertions
- Evidence (links to /reports or output files): scripts/run_golden.py, RUNLOG.md (Entry 021), reports/release_smoke_matrix_2026-02-08.md
- Risks: None significant; normalization is purely representational
- Follow-ups: Address remaining true golden retrieval mismatches separately (ranking/candidate behavior)

- Decision: Remove sticky JWT decoding-key cache in desktop auth verification path
- Options considered: Keep `OnceLock` key cache; add cache invalidation; parse decoding key on each verify call
- Why chosen: `OnceLock` can preserve stale compile-time keys in production builds and block runtime key refresh from `/api/desktop/entitlement-key`; parsing per verify ensures runtime key rotation/recovery always takes effect
- Evidence (links to /reports or output files): src-tauri/src/commands/auth.rs, RUNLOG.md (Entry 022)
- Risks: Slight extra CPU per token verification call
- Follow-ups: If needed, reintroduce a refreshable cache with explicit invalidation semantics rather than immutable `OnceLock`

- Decision: Use versioned filename (`logo-v3.png`) instead of query-string cache busting for landing logos
- Options considered: Keep static filename with browser cache; append query string (`?v=...`); publish new file path and update references
- Why chosen: Next image optimizer rejected query-string local images in current config; versioned path preserves cache busting and passes production build
- Evidence (links to /reports or output files): ixos-site/src/components/ui/Nav.tsx, ixos-site/src/components/sections/Footer.tsx, ixos-site/src/components/auth/AuthScreen.tsx, ixos-site/src/app/layout.tsx, RUNLOG.md (Entry 022)
- Risks: Multiple logo files may accumulate if not cleaned periodically
- Follow-ups: Add an asset versioning note in docs and prune superseded logo files in a future housekeeping pass

- Decision: Use lexical preflight to conditionally restore semantic eager indexing in Flash/Auto desktop searches
- Options considered: Keep eager index skipped always; always restore eager indexing; lazy-index inside semantic engine fallback path
- Why chosen: Keeps low-latency lexical-first startup for common queries while guaranteeing non-empty pure-semantic fallback when lexical candidates are zero
- Evidence (links to /reports or output files): src-tauri/src/commands/search.rs, reports/semantic_fallback_regression_fix_2026-02-08.md, RUNLOG.md (Entry 023)
- Risks: Adds one lexical probe per non-Ask/non-Pro query; should be measured on very large trees to confirm minimal overhead
- Follow-ups: Add settings-matrix or integration coverage for zero-lexical semantic fallback scenarios (Flash/Auto + non-Ask)

- Decision: Remove dead `index --watch` exposure and hide daemon status/stop controls from CLI help until IPC paths are implemented
- Options considered: Keep flags with TODO messaging; fully remove daemon subcommand; hide unsupported controls while preserving working foreground path
- Why chosen: Avoids shipping misleading toggles while keeping the working foreground daemon flow available
- Evidence (links to /reports or output files): src/cli/commands.rs, src/main.rs, reports/phase0_cli_reliability_patch_2026-02-08.md
- Risks: Power users lose discoverability of future daemon IPC controls until reintroduced
- Follow-ups: Implement daemon IPC status/stop and then unhide with real behavior

- Decision: Implement `cache rebuild` as real index + embedding warmup using configured Flash model, and run inside the existing async runtime
- Options considered: Keep placeholder text; stub-model rebuild; nested runtime `block_on` wrapper
- Why chosen: Delivers functional cache warmup with real model embeddings and avoids nested Tokio runtime panics
- Evidence (links to /reports or output files): src/main.rs, src/ixos_rank/semantic_engine.rs, reports/phase0_cli_reliability_patch_2026-02-08.md
- Risks: Warmup is currently sequential; `workers` is not yet used for true concurrency
- Follow-ups: Add bounded parallel embedding warmup and benchmark before/after on medium/large corpora

- Decision: Bind embedding-cache validity to both file hash and active model fingerprint
- Options considered: File-hash-only invalidation; manual cache clear on model switch; model+file coupled validity
- Why chosen: Guarantees stale embeddings are recomputed both after file edits and after model changes, without requiring user intervention
- Evidence (links to /reports or output files): src/storage/mod.rs, src/storage/ads_windows.rs, src/storage/xattr_unix.rs, src/storage/sidecar_lmdb.rs, src/ixos_rank/semantic_engine.rs, docs/product/PHASES_0_2_IMPLEMENTATION_AND_TESTING.md
- Risks: Model switching can increase first-search latency because cache reuse is intentionally prevented across different model fingerprints
- Follow-ups: Consider background warming for newly selected model to reduce first-hit latency

- Decision: Persist workstreams on every mutating operation and unify encrypted storage path to app config dir
- Options considered: Recluster-only persistence; UI-triggered explicit save only; backend mutation autosave + periodic/close autosave
- Why chosen: Recluster-only save path lost manual operations across restarts and used a path inconsistent with load/save commands
- Evidence (links to /reports or output files): src-tauri/src/commands/workstreams.rs, src-tauri/src/lib.rs, docs/product/PHASES_0_2_IMPLEMENTATION_AND_TESTING.md
- Risks: More frequent writes under heavy edit operations
- Follow-ups: Add debounce/coalescing if write amplification is observed in telemetry

- Decision: Honor CLI `--config` path in `config` and `cache mode` command handlers
- Options considered: Keep default-path-only behavior; partial path override; full path override support for read/write handlers
- Why chosen: Previous behavior silently wrote to default config even when `--config` was provided, breaking deterministic automation
- Evidence (links to /reports or output files): src/main.rs, RUNLOG.md (Entry 020)
- Risks: None significant; behavior now matches user expectation for global config override
- Follow-ups: Extend same override consistency check to any future command that writes config

- Decision: Force Flash/JIT mode in golden harness query executions
- Options considered: Keep mode implicit from default config; lock to Auto; lock to Flash baseline mode
- Why chosen: Golden expectations are authored as baseline ranking assertions and became unstable when Auto/Pro routing varied by local model availability
- Evidence (links to /reports or output files): scripts/run_golden.py, RUNLOG.md (Entry 021)
- Risks: Golden no longer validates Auto/Pro ranking behavior
- Follow-ups: Add separate mode-specific golden suites for Auto and Pro if those paths require strict regression gates

- Decision: Make CLI `search` cache-mode resolution config-aware by default (`--cache-mode` overrides; otherwise persisted config applies)
- Options considered: Keep hardcoded CLI default `jit`; require explicit `--cache-mode` every search; optional CLI override with config fallback
- Why chosen: Hardcoded default made `cache mode persistent` appear broken and violated user expectation that settings persist across sessions
- Evidence (links to /reports or output files): src/cli/commands.rs, src/main.rs, RUNLOG.md (Entry 025), reports/settings_matrix_2026-02-08.md
- Risks: Existing scripts relying on implicit `jit` must explicitly pass `--cache-mode jit`
- Follow-ups: Add a short note in CLI docs showing precedence: CLI flag > config > journalist override

- Decision: Treat cache clearing as two paths: per-file metadata delete attempts + unconditional LMDB sidecar clear
- Options considered: Per-file deletes only; LMDB-only clear; hybrid clear path
- Why chosen: LMDB keying uses hashed `(path+hash)` and cannot be deleted per path through current trait API; hybrid guarantees actual cleanup on all filesystems
- Evidence (links to /reports or output files): src/main.rs, src/storage/sidecar_lmdb.rs, RUNLOG.md (Entry 025), reports/phase0_2_validation_2026-02-08.md
- Risks: LMDB clear is global (not directory-scoped) until a directory-aware key index is introduced
- Follow-ups: Add optional LMDB namespace-by-root to support directory-scoped clear in a future pass

- Decision: Cache stats should count both model-matching entries and detectable mixed-fingerprint blobs
- Options considered: Strict model-fingerprint-only counts; blob-presence-only counts; model-match-first with fallback blob detection
- Why chosen: Strict model-only counts broke settings-matrix cache invariants when `--stub-model` was used; fallback detection preserves truthfulness for cache-write checks while still preferring active-model validation
- Evidence (links to /reports or output files): src/main.rs, scripts/run_settings_matrix.py, RUNLOG.md (Entry 025), reports/settings_matrix_2026-02-08.md
- Risks: `cached_files` may include stale blobs from old fingerprints if users switch models frequently
- Follow-ups: Add split fields (`cached_files_model_match`, `cached_files_any_blob`) in a backwards-compatible CLI JSON v2 payload

- Decision: Reject desktop/control-plane requests when bearer token is present but fails verification
- Options considered: Always fallback to cookie/session auth; fallback only when no bearer header; strict bearer-only for API paths
- Why chosen: Bearer-present fallback is an auth ambiguity that can mask invalid token states and create unintended privilege paths across mixed client contexts
- Evidence (links to /reports or output files): ixos-site/src/lib/controlPlane.ts, RUNLOG.md (Entry 027)
- Risks: Some mixed browser/API flows with stale bearer headers now fail fast (expected)
- Follow-ups: Add route-level explicit policy docs (`desktop API: bearer-required`) and integration tests for invalid bearer cases

- Decision: Enforce Pro status + capability checks inside personal-ranking Tauri commands
- Options considered: UI-only gating; config-flag-only gating; command-level entitlement enforcement
- Why chosen: Command-level checks prevent bypass via direct invoke/scripted calls even if UI state is manipulated
- Evidence (links to /reports or output files): src-tauri/src/commands/personal_ranking.rs, RUNLOG.md (Entry 027)
- Risks: Users with temporarily stale entitlement token lose personal ranking actions until refresh
- Follow-ups: Add explicit UI error toast mapping for personal ranking entitlement failures

- Decision: Implement low-end landing Strategy mode as pinned hard-lock with reduced FX (instead of disabling pin)
- Options considered: keep full effects on all devices; disable pin on low-end; hard-lock + reduced effects
- Why chosen: Preserves narrative/stage progression while reducing frame load and limiting scroll drift artifacts on constrained hardware
- Evidence (links to /reports or output files): ixos-site/src/components/sections/HeroPipeline.tsx, RUNLOG.md (Entry 027)
- Risks: Visual richness is reduced on low-end devices by design
- Follow-ups: Add telemetry or synthetic perf checks to tune reduced-FX thresholds over real device profiles

- Decision: Ship move recommendations only after repeated evidence threshold, with low one-off weight
- Options considered: one-click recommendation; recency-only rule; repeated-query/folder evidence with thresholding
- Why chosen: Reduces noisy suggestions and matches product requirement that one-off interactions should not dominate
- Evidence (links to /reports or output files): src/activity_ledger/mod.rs, src-tauri/src/commands/activity.rs, ui/src/components/today/TodayTab.tsx, RUNLOG.md (Entry 027)
- Risks: Sparse activity histories may produce no recommendations initially
- Follow-ups: Add accept/dismiss feedback loops to personalize confidence scoring over time

- Decision: Introduce dedicated `ixos-big-bench` harness with Tier A/B/C PASS/FAIL gates and per-query stage/cache telemetry.
- Options considered: Keep using `ixos-bench` only; add ad-hoc scripts around existing profile output; create a dedicated benchmark binary with machine-readable + markdown outputs.
- Why chosen: Phase 1 requires large-root truth metrics, embedded gates, and reproducible artifacts that can be consumed by Ralph loop and landing refresh workflows.
- Evidence (links to /reports or output files): src/bin/ixos-big-bench.rs, bench/big_root_queries.json, reports/ralph/big_bench_20260213_174232.json, reports/ralph/big_bench_20260213_174232.md
- Risks: Current `evidence_ms` is placeholder zero (no direct evidence timing hook in this harness yet).
- Follow-ups: Wire explicit evidence-stage timing once Ask CLI path is integrated in Phase 6.

- Decision: Expand settings matrix contract to full 5-dimensional combinatorics (48 combos) and validate progressive JSON as NDJSON.
- Options considered: Keep previous 11-combo matrix; expand combos but skip progressive JSON parsing; use only Rust integration tests.
- Why chosen: The CLI emits multiple JSON envelopes in progressive mode; NDJSON validation prevents false negatives while preserving contract checks (no crash, parseable payloads, results present).
- Evidence (links to /reports or output files): scripts/run_settings_matrix.py, reports/settings_matrix_2026-02-13.md, tests/settings_matrix.rs
- Risks: Runtime of live matrix increases with full combinatorics.
- Follow-ups: Add `--subset`/`--smoke` options for faster pre-commit checks while keeping full matrix in release gates.

- Decision: Add `release-check` as an explicit CLI stub in Phase 1 instead of waiting for Phase 7 implementation.
- Options considered: No command until full implementation; add hidden/internal command; add visible stub with clear guidance.
- Why chosen: Locks CLI surface early for automation and avoids interface churn before full release-check orchestration lands.
- Evidence (links to /reports or output files): src/cli/commands.rs, src/main.rs
- Risks: Users may expect full functionality immediately.
- Follow-ups: Replace stub body with full orchestrated flow in Phase 7 (matrix + golden + formatting + smoke + doctor).

- Decision: Make `ixos-big-bench` return non-zero when tier gate fails.
- Options considered: Keep informational PASS/FAIL only; emit warnings in markdown only; fail process on gate miss.
- Why chosen: Ralph loop regression control depends on command exit codes; informational-only FAIL allowed bad checkpoints to pass.
- Evidence (links to /reports or output files): src/bin/ixos-big-bench.rs, reports/ralph/iteration_8_20260213_174830.md, reports/ralph/iteration_9_20260213_174857.md
- Risks: Users running quick one-pass Tier C benches (`--runs 1`) will now get intentional non-zero exits.
- Follow-ups: Document minimum run counts per tier (`runs >= 2` for warm gate semantics, `runs >= 3` recommended).

- Decision: Add `objective-profile` support to `ixos-big-bench` with a new `harsh` profile and stage p95 gate reporting.
- Options considered: Keep only roadmap-tier defaults; externalize targets in scripts only; embed standard+harsh targets in benchmark binary.
- Why chosen: Enables strict local/CI gating without bespoke wrapper scripts and gives comparable machine-readable outputs per iteration.
- Evidence (links to /reports or output files): src/bin/ixos-big-bench.rs, reports/ralph/big_bench_20260213_180844.json, reports/ralph/comparison_11_20260213_180754.md
- Risks: Bench failures become more sensitive to machine variance under strict profiles.
- Follow-ups: Add variance-aware stability rule (e.g., median of multiple benchmark batches) for release-grade claims.

- Decision: Integrate automatic before/after comparator into Ralph loop (`compare_perf` step) instead of manual ad-hoc comparison.
- Options considered: Manual report generation only; comparator script not in loop; explicit `compare_perf` command step after each bench.
- Why chosen: Makes regressions visible at every checkpoint and keeps iteration artifacts self-contained.
- Evidence (links to /reports or output files): scripts/compare_performance.py, scripts/ralph_loop.py, reports/ralph/iteration_12_20260213_181349.md
- Risks: Quality comparisons can mislead if suite scopes differ.
- Follow-ups: Enforce same-suite quality input validation in comparator.

- Decision: Harden release/build workflows for reproducibility and artifact integrity.
- Options considered: Keep existing workflows; partial token fix only; full pass (lockfile install, token fix, matrix test expansion, packaged docs/license).
- Why chosen: Current CI failures and release inconsistencies were caused by token/env/reproducibility gaps.
- Evidence (links to /reports or output files): .github/workflows/release.yml, .github/workflows/settings-matrix.yml, .github/workflows/build-pro-module.yml
- Risks: Requires required secrets/vars to be configured in GitHub repository settings.
- Follow-ups: Add workflow-level smoke test for missing secret diagnostics.

- Decision: Keep legacy internal `cache/jit` UI enums for now but update user-facing labels and compatibility mappings to `NativeCache`/`Ephemeral`.
- Options considered: Full internal enum migration in one pass; leave all legacy naming untouched; staged migration with user-facing alignment first.
- Why chosen: Reduces immediate user confusion while minimizing risk of wide UI regression in one iteration.
- Evidence (links to /reports or output files): ui/src/components/search/ModeSwitcher.tsx, ui/src/components/search/SearchDeck.tsx, ui/src/components/search/CommandPalette.tsx, ixos-site/src/app/docs/*
- Risks: Internal naming debt remains and can cause future mismatch bugs.
- Follow-ups: Complete type-level migration to canonical names across stores/components.

- Decision: Move non-operational root markdown files into `docs/archive/root` and regenerate markdown inventory.
- Options considered: Keep root clutter; delete stale docs; archive under docs taxonomy.
- Why chosen: Improves repository hygiene and aligns with documented markdown organization policy.
- Evidence (links to /reports or output files): docs/archive/root/PROJECT_REVIEW_REPORT.md, docs/archive/root/PRODUCTION_AND_STRATEGY_GAPS_2026-02-10.md, docs/MARKDOWN_INVENTORY.md
- Risks: Historical links to old root paths may break in older notes.
- Follow-ups: Sweep docs for stale path references and add redirect notes where needed.

- Decision: Complete internal desktop mode enum migration to canonical `native-cache` / `ephemeral`, keeping legacy `cache/jit` only at ingestion compatibility boundaries.
- Options considered: Keep mixed legacy internals; full breaking rename with no aliases; canonical internals + compatibility normalization for persisted/config legacy values.
- Why chosen: Removes the remaining mis-hook risk from mixed enum usage while preserving backwards compatibility for existing persisted data and older config values.
- Evidence (links to /reports or output files): ui/src/stores/searchStore.ts, ui/src/stores/starredStore.ts, ui/src/components/search/ModeSwitcher.tsx, ui/src/components/search/SearchResults.tsx, ui/src/components/search/SearchInput.tsx, ui/src/components/search/ResultCard.tsx
- Risks: Shared UI library components (`SearchBar`) still use legacy tone keys, requiring local mapping in app code.
- Follow-ups: Migrate shared `@ixos/ui` `SearchBar` tone contract to canonical names to remove adapter mapping.

- Decision: Rename `ModelType::Potion` display branding to `Potion Core` (and keep `Pro Prism` as the user-facing Pro mode/cascade label).
- Options considered: Keep Potion labeled as Pro Prism; expose raw potion identifier only; split branding (`Potion Core` internal model, `Pro Prism` mode).
- Why chosen: Avoids model/mode conflation and keeps branding consistent with docs and UI.
- Evidence (links to /reports or output files): src/ixos_embed/mmap_model.rs, docs/models/BRANDING.md, ui/src/components/search/ModelSwitcher.tsx
- Risks: Existing scripts parsing prior display text may need updates.
- Follow-ups: Add explicit note in CLI docs that model IDs are canonical and display labels are presentation-only.

- Decision: Keep harsh objective profile active in Ralph checkpoints despite mild latency regressions versus prior run, because gates remain passing and quality is unchanged.
- Options considered: Revert to standard profile; tune code immediately for micro-regression; keep harsh profile and continue iterative measurement.
- Why chosen: Harsh objectives are intended to expose drift early; current regression is measurable but not target-breaking.
- Evidence (links to /reports or output files): reports/ralph/iteration_13_20260213_231055.md, reports/ralph/comparison_13_20260213_231055.md, reports/ralph/comparison_turn_20260213_231310.md, models/lab/results_prism_iter_2026-02-13_post_ui.json
- Risks: Short-term variance noise can trigger churn if interpreted as structural regression.
- Follow-ups: Add repeated-batch median and jitter controls to comparator/report pipeline.
