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
- Decision: Move late-phase Ixplorer intelligence surfacing into the existing right rail instead of adding more sidebar/dashboard chrome
- Options considered: Keep Today/resume emphasis in the sidebar; open separate explanation/intelligence panes; use the existing rail as the main context surface
- Why chosen: The user explicitly wanted a neater File Explorer / Notion-style shell, and the rail is the correct place to make recovery/resume/predicted context visible without cluttering the left navigation column
- Evidence (links to /reports or output files): reports/ixplorer_intelligence_integration_2026-03-11.md, ixplorer/src/widgets/IxosRail.cpp, ixplorer/src/app/MainWindow.cpp, ixplorer/src/widgets/AppSidebar.cpp
- Risks: If the rail stays hidden too often, some intelligence may still feel discoverability-limited
- Follow-ups: Add stronger entry points/toggles and more command-palette coverage for rail-context actions

- Decision: Clean Tauri release output directories before local/CI desktop packaging
- Options considered: Trust clean-checkout behavior only; inspect every `_up_` directory after build; proactively remove stale bundle/updater outputs before packaging
- Why chosen: Local packaging showed stale bundle artifacts could coexist with fresh output and blur payload verification; explicit cleanup makes local and CI release behavior more deterministic
- Evidence (links to /reports or output files): package.json, scripts/clean-tauri-output.js, .github/workflows/release.yml
- Risks: Cleaning removes prior local bundle artifacts before packaging
- Follow-ups: Validate one real GitHub tag release to confirm the workflow behaves cleanly across all runners

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

- Decision: Introduce a capability-based workspace file policy and keep unsupported/app-like content external
- Options considered: Keep revealing files then defer to the OS; try to embed every file type; add a narrow allowlist with preview/edit/external branches
- Why chosen: The center pane needed real embedded value without unsafe or fake hosting. A narrow allowlist gives stable in-app editing for text/code, true preview for supported images, and explicit external handling for executables/installers/Office/PDF/app-like content.
- Evidence (links to /reports or output files): reports/ixplorer_workspace_search_pass_2026-03-10.md, ixplorer/src/utils/FileOpenPolicy.cpp, ixplorer/src/widgets/DocumentPane.cpp, ixplorer/src/widgets/TabWorkspace.cpp
- Risks: Preview coverage is intentionally incomplete; users may expect PDF/media support that is still external.
- Follow-ups: Evaluate Qt PDF/media hosting separately and only extend the allowlist when the lifecycle is stable.

- Decision: Reuse a single search preview tab for top-result auto-open instead of spawning a new tab on every query update
- Options considered: Open every auto-opened result in a fresh tab; replace the current explorer tab; keep a reusable preview tab
- Why chosen: Live search would create noisy tab churn otherwise. A reusable preview tab preserves the explorer context, keeps auto-open focused, and still lets explicit opens promote into durable document tabs.
- Evidence (links to /reports or output files): reports/ixplorer_workspace_search_pass_2026-03-10.md, ixplorer/src/widgets/TabWorkspace.cpp, ixplorer/src/widgets/IxosRail.cpp
- Risks: Preview-tab semantics need manual QA around promotion/edit/close flows.
- Follow-ups: Add GUI smoke coverage for preview-tab reuse and promotion to editable tabs.
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
- Decision: Remove legacy runtime cache aliases (`jit`, `cache`, `persistent`, `nativecache`) from CLI/Tauri parsing paths while preserving canonical `local/native-cache` and `memory/ephemeral`.
- Options considered: keep all legacy aliases; remove aliases only in UI; remove aliases in all runtime entrypoints.
- Why chosen: User requirement was explicit to remove JIT/Cache compatibility and keep naming coherent.
- Evidence (links to /reports or output files): src/main.rs, src/cli/commands.rs, src/cli/config.rs, src-tauri/src/commands/search.rs, src/bin/ixos-perf-suite.rs
- Risks: Older scripts/config snippets using removed aliases now fail fast.
- Follow-ups: Update remaining doc examples/scripts to only use local/memory wording.

- Decision: Ask mode UI override was removed and frontend now always sends `isAskMode: auto` while backend intent detection drives activation.
- Options considered: keep UI toggle; soft-deprecate toggle; fully remove override and centralize in backend.
- Why chosen: Fixes keyword-toggle brittleness and aligns behavior between desktop and CLI.
- Evidence (links to /reports or output files): ui/src/stores/searchStore.ts, ui/src/lib/types.ts, src/ixos_rank/ask_mode/intent_detector.rs, src-tauri/src/commands/search.rs
- Risks: Users lose manual forced-ask control in UI.
- Follow-ups: If needed, reintroduce explicit advanced setting later with clear semantics.

- Decision: Replace journalist privacy behavior with deep-search thoroughness behavior and preserve search history in deep-search mode.
- Options considered: keep journalist semantics; dual-mode split; repurpose mode as deep-search.
- Why chosen: Matches product direction (comprehensive search mode, Pro value) and removes forced memory-only side effects.
- Evidence (links to /reports or output files): src/journalist_mode.rs, src/ixos_rank/semantic_engine.rs, src/main.rs, ui/src/stores/searchStore.ts
- Risks: Internal `journalist` symbol debt remains in some compatibility paths.
- Follow-ups: complete symbol cleanup pass in non-user-facing modules.

- Decision: CI release workflow now treats models as runtime downloads (not bundled resources) and adds resilient UI dependency installation.
- Options considered: keep current resource globs and strict install; create placeholder dirs only; remove bundled resources + add install fallback + Windows stubs.
- Why chosen: Fixes cross-platform packaging failures (Rollup optional binary issue, missing model paths in Windows Tauri builds).
- Evidence (links to /reports or output files): .github/workflows/release.yml, src-tauri/tauri.conf.json
- Risks: Requires runtime model downloader path to remain healthy.
- Follow-ups: add workflow smoke checks for runtime download path after release.

- Decision: Add dedicated CLI release pipeline and install scripts (`install.sh`, `install.ps1`) keyed to `cli-v*` tags.
- Options considered: keep pro-module artifact workflow only; add partial packaging scripts; full multi-platform CLI release with checksums.
- Why chosen: Establishes explicit install/distribution story for CLI.
- Evidence (links to /reports or output files): .github/workflows/cli-release.yml, scripts/install.sh, scripts/install.ps1
- Risks: Tag naming and asset naming must stay aligned with installer expectations.
- Follow-ups: publish and verify first `cli-v*` release artifacts and checksums in CI logs.

- Decision: Keep legacy-cache alias migration strict but non-silent for unknown values (`load_from` normalizes known legacy aliases only; unknown values remain explicit and fail later runtime validation as designed).
- Options considered: map unknown values to `native-cache`; preserve unknown values while normalizing only known legacy aliases.
- Why chosen: avoids silently masking user/config mistakes while still migrating real legacy values (`jit`, `cache`, `persistent`, `nativecache`, `memory-only`).
- Evidence (links to /reports or output files): src/cli/config.rs, reports/ui_ci_followup_2026-02-14.md
- Risks: Existing corrupted configs with unknown values still require user correction.
- Follow-ups: consider adding explicit warning in `IxosConfig::load_from` when unknown cache mode is detected.

- Decision: Scope desktop UI ambient TypeScript types in `ui/tsconfig.json` (`types: ["vite/client", "node"]`) to prevent workspace-wide implicit `@types/*` pickup from unrelated workspaces.
- Options considered: keep implicit ambient types; add missing `@types/*` packages for every transitive workspace type; explicitly scope types per workspace.
- Why chosen: deterministic and low-risk; restores `ui` build reliability without coupling it to every dependency type package present in monorepo root.
- Evidence (links to /reports or output files): ui/tsconfig.json, reports/ui_ci_followup_2026-02-14.md
- Risks: if future UI code needs additional global ambient libs, they must be added intentionally.
- Follow-ups: document per-workspace TypeScript type scoping policy in frontend dev docs.

- Decision: Remove hero 3D mark from active landing flow and promote larger selectable typography with elevated z-index.
- Options considered: keep 3D and adjust pointer events only; replace with static image; remove component entirely from rendered hero.
- Why chosen: 3D interaction surface was blocking/selectability and causing visual overlap risk; removal directly restores clarity and interaction reliability.
- Evidence (links to /reports or output files): ixos-site/src/components/sections/HeroPipeline.tsx, reports/landing_hero_followup_2026-02-14.md
- Risks: reduced visual flourish in hero.
- Follow-ups: consider non-interactive decorative mark later if it cannot intercept input layers.

- Decision: Bind hero demo chrome accents to actual selected mode via callback from `IxosDemoWindow`.
- Options considered: keep phase-driven accent mapping; infer mode from phase heuristics; wire explicit mode state.
- Why chosen: removes mismatch where Local mode was teal internally but frame/latency remained amber.
- Evidence (links to /reports or output files): ixos-site/src/components/hero/IxosDemoWindow.tsx, ixos-site/src/components/sections/HeroPipeline.tsx, reports/landing_hero_followup_2026-02-14.md
- Risks: none material; mode callback introduces minor state churn.
- Follow-ups: extend to model-based secondary glow modulation if product decides to surface model tinting.

- Decision: Keep a single quality selector path (Flash/Auto/Pro) and remove duplicate model-selection behavior from active desktop and landing-demo search controls.
- Options considered: keep dual dropdowns; hide one dropdown conditionally; unify to one selector with richer option descriptions.
- Why chosen: Removes user confusion, matches requested interaction model, and aligns Ask Mode/Pro gating to one canonical selection path.
- Evidence (links to /reports or output files): ui/src/components/search/SearchInput.tsx, ixos-site/src/components/hero/IxosDemoWindow.tsx, reports/ui_pro_features_overhaul_2026-02-15.md
- Risks: Demo and app dropdowns are still implemented separately (possible future drift).
- Follow-ups: Extract shared dropdown UX primitive for full cross-surface parity.

- Decision: Make first-run onboarding mandatory with a two-search cold/warm cache demonstration before normal usage.
- Options considered: optional onboarding; static tutorial only; mandatory measured walkthrough.
- Why chosen: Directly addresses user confusion about core behavior and demonstrates practical speed/value in-product with measurable evidence.
- Evidence (links to /reports or output files): ui/src/components/layout/AppShell.tsx, ui/src/components/onboarding/FirstRunOnboarding.tsx, reports/ui_pro_features_overhaul_2026-02-15.md
- Risks: Slight onboarding friction for returning power users on fresh installs.
- Follow-ups: Add skip option controlled by enterprise policy/config if needed.

- Decision: Improve Ask Mode detection via deterministic typo-tolerant multi-token intent heuristics (no LLM dependency).
- Options considered: keep first-token heuristics only; model-embedding detector overhaul immediately; deterministic heuristic expansion now.
- Why chosen: Delivers immediate robustness gains with low risk and no model-serving complexity.
- Evidence (links to /reports or output files): src/ixos_rank/ask_mode/intent_detector.rs, src-tauri/src/commands/search.rs, reports/ui_pro_features_overhaul_2026-02-15.md
- Risks: Heuristic false positives/negatives still possible on highly unusual phrasing.
- Follow-ups: Add trigger-reason telemetry and calibration loop from real usage.

- Decision: Treat Today + Workstreams + Ask Mode as the primary Pro value triangle across both desktop UX and landing pricing copy.
- Options considered: keep Ask Mode as primary differentiator only; market only deep-search/model benefits; balanced Pro messaging with workflow continuity value.
- Why chosen: user feedback indicated weak perceived value of Workstreams/Today unless tied to concrete productivity outcomes (resume flow, recommendations, reorganization).
- Evidence (links to /reports or output files): ui/src/components/workstreams/WorkstreamsList.tsx, ixos-site/src/components/sections/Pricing.tsx, ixos-site/src/components/sections/ProFeatures.tsx, ixos-site/src/components/sections/WorkstreamsSection.tsx, reports/pro_features_release_hardening_2026-02-15.md
- Risks: messaging can overpromise if recommendation precision is not continuously validated with real usage telemetry.
- Follow-ups: add accept/dismiss feedback loop for move recommendations and report precision/utility metrics.

- Decision: Fix CLI installer default repository slug to `Thunderboltdy10/Ixos` in both shell and PowerShell scripts.
- Options considered: require explicit `IXOS_REPO` always; leave default as-is; correct default + preserve override.
- Why chosen: default path must work out-of-the-box for first-time users and CI smoke paths.
- Evidence (links to /reports or output files): scripts/install.sh, scripts/install.ps1, reports/pro_features_release_hardening_2026-02-15.md
- Risks: if upstream repo ownership changes, defaults must be updated again.
- Follow-ups: add a lightweight CI check that validates installer default repo returns release metadata.

- Decision: Prioritize deterministic visual layering and interaction correctness in hero/pipeline over aggressive decorative effects.
- Options considered: preserve existing z/animation layering with minor tweaks; full static fallback; targeted z-index + timing + interaction-lock adjustments.
- Why chosen: user reported concrete regressions (text over demo, non-interactive demo, clipping/flicker); targeted fixes address root causes with low blast radius.
- Evidence (links to /reports or output files): ixos-site/src/components/sections/HeroPipeline.tsx, ixos-site/src/components/hero/IxosDemoWindow.tsx, reports/landing_pipeline_polish_2026-02-15.md
- Risks: scroll choreography remains sensitive to device/browser variance.
- Follow-ups: collect visual QA clips across common viewport sizes and adjust trigger thresholds if needed.

- Decision: Harden release workflows for cross-arch and cross-runner reliability (CLI + desktop).
- Options considered: keep existing matrix/scripts and rely on reruns; only patch failing jobs ad hoc; make deterministic workflow hardening changes with runner/arch guards.
- Why chosen: macOS/Linux failures were tied to deterministic config issues (cross-arch smoke execution, package naming/casing, and brittle dependency setup), so targeted hardening is lower risk than repeated manual retries.
- Evidence (links to /reports or output files): .github/workflows/cli-release.yml, .github/workflows/release.yml, RUNLOG.md (Entry 039)
- Risks: hosted runner images can still change package availability over time.
- Follow-ups: run real `cli-v*` and `v*` tag releases and capture logs/artifacts in `/reports`.

- Decision: Isolate CLI installer paths from desktop app install roots by default.
- Options considered: keep shared `Ixos` install root; require users to pass custom install dirs; switch defaults to dedicated CLI roots while preserving overrides.
- Why chosen: avoids path/asset collisions when users install both desktop and CLI, especially on Windows where `%LOCALAPPDATA%\\Ixos` can overlap app-owned files.
- Evidence (links to /reports or output files): scripts/install.sh, scripts/install.ps1, ixos-site/src/lib/downloads.ts
- Risks: users with old PATH entries may have stale CLI paths until they reinstall/update PATH.
- Follow-ups: add migration note in CLI docs and optional cleanup helper.

- Decision: Replace duplicated Pro capability pricing card with a shared transfer flow component across home and `/pricing`.
- Options considered: keep duplicated static cards; animate independent cards; use one shared component with layout transfer and section handoff.
- Why chosen: directly satisfies the requirement that the same Pro card component visually continues into capabilities, reducing duplicated UI and improving continuity.
- Evidence (links to /reports or output files): ixos-site/src/components/sections/PricingProFlow.tsx, ixos-site/src/components/sections/Pricing.tsx, ixos-site/src/components/sections/ProFeatures.tsx
- Risks: transfer timing may need tuning per viewport height.
- Follow-ups: record manual QA for mobile/desktop transition thresholds and retune observer root margins if needed.

- Decision: Convert Pro-card handoff to a three-stage motion path and add flip-style price animation.
- Options considered: keep two-position snap handoff; use a fully free-floating overlay; use a bridge lane plus softer spring and animated price glyph flips.
- Why chosen: bridge lane smooths abrupt travel without obscuring content columns, while digit-flip price animation makes monthly/annual changes legible and premium.
- Evidence (links to /reports or output files): ixos-site/src/components/sections/PricingProFlow.tsx, ixos-site/src/components/sections/ProCard.tsx
- Risks: bridge lane spacing can still feel heavy on short laptop viewports.
- Follow-ups: tune bridge lane height and spring constants after recorded visual QA.

- Decision: Rebuild Today/Workstreams into cleaner boxy panels with one core message per panel.
- Options considered: keep previous dense interactive cards; add minor spacing tweaks only; full section composition rewrite with explicit main-point framing.
- Why chosen: screenshot feedback showed uneven density and generic feel; rewrite improves hierarchy, readability, and product-context clarity while preserving site visual language.
- Evidence (links to /reports or output files): ixos-site/src/components/sections/TodaySection.tsx, ixos-site/src/components/sections/WorkstreamsSection.tsx
- Risks: copy tone and information density may still need final brand/marketing polish.
- Follow-ups: run live stakeholder review on desktop/mobile and trim/expand copy where needed.

- Decision: Remove the `settings-matrix` PR workflow entirely.
- Options considered: keep and debug failing combinations; keep but make non-blocking; remove workflow per user request.
- Why chosen: requested explicitly, and failing matrix combinations were not release-critical to current shipping goals.
- Evidence (links to /reports or output files): .github/workflows/settings-matrix.yml (deleted)
- Risks: reduced early detection for settings-combination regressions.
- Follow-ups: reintroduce only with a narrower, validated matrix if needed.

- Decision: Harden release publish steps to upload files only and ensure release exists before upload.
- Options considered: keep `artifacts/*` glob upload; retry around failures; stage and upload explicit file list.
- Why chosen: fixes deterministic failure where `gh release` received directories and aborted (`is a directory` / `release not found`).
- Evidence (links to /reports or output files): .github/workflows/cli-release.yml, .github/workflows/release.yml
- Risks: filename collisions when flattening artifacts must remain controlled.
- Follow-ups: add a CI check that asserts expected unique artifact names before publish.

- Decision: Add a post-`npm ci` Rollup native-package verification and fallback install in desktop release workflow.
- Options considered: rely on reruns; regenerate lockfiles; install rollup native package when missing.
- Why chosen: directly addresses macOS/Linux runner failure from npm optional dependency omission.
- Evidence (links to /reports or output files): .github/workflows/release.yml
- Risks: if npm optional-dependency behavior changes again, fallback may need adjustment.
- Follow-ups: monitor one full successful `v*` run and keep fallback until lockfile generation is stable.

- Decision: Replace the visible Pro-card transfer lane with direct `pricing -> hidden -> capabilities` handoff.
- Options considered: keep bridge lane; full free-floating card across viewport; direct disappear/reappear handoff.
- Why chosen: user requested no transfer-zone UI and smoother non-obstructive behavior during scroll.
- Evidence (links to /reports or output files): ixos-site/src/components/sections/PricingProFlow.tsx
- Risks: transition timing still depends on viewport thresholds.
- Follow-ups: tune thresholds after manual browser recordings if handoff feels early/late.

- Decision: Use one shared Pro CTA component (`ProUpgradeAction`) in both pricing and capabilities cards.
- Options considered: separate CTA implementations (`VIEW_PRICING` in capabilities); duplicate auth logic in each section; shared action component.
- Why chosen: enforces consistent card behavior and avoids divergent CTAs between sections.
- Evidence (links to /reports or output files): ixos-site/src/components/sections/ProUpgradeAction.tsx, ixos-site/src/components/sections/Pricing.tsx, ixos-site/src/components/sections/ProFeatures.tsx
- Risks: duplicate subscription fetches are possible if both cards mount in future layouts.
- Follow-ups: move subscription state to shared context if both cards are ever rendered concurrently.
- Decision: Gate desktop artifact copy on draft-release asset availability with explicit source repo targeting and retries.
- Options considered: immediate one-shot download; switch to workflow artifacts; source-release polling and explicit repo download.
- Why chosen: fixes intermittent `release not found` in copy step caused by timing/visibility gaps after matrix publishing.
- Evidence (links to /reports or output files): .github/workflows/release.yml
- Risks: if `tauri-action` fails to publish assets entirely, job still fails (expected).
- Follow-ups: optionally move to direct workflow artifact fan-in for complete decoupling from draft releases.

- Decision: Require default branch resolution before first CLI release create in `ixos-releases`.
- Options considered: blind `gh release create`; hard fail with repository-empty guidance; resolve default branch and create against it.
- Why chosen: removes hidden assumption and gives deterministic behavior for newly initialized release repos.
- Evidence (links to /reports or output files): .github/workflows/cli-release.yml
- Risks: repo must still have at least one commit/default branch.
- Follow-ups: keep README/bootstrap step in `ixos-releases` permanently.

- Decision: Shift Today/Workstreams and adjacent sections toward key-message-first marketing density.
- Options considered: keep detailed explanatory copy; small spacing tweaks only; concise copy + balanced card geometry + focused cues.
- Why chosen: aligns with user feedback that sections felt generic, text-heavy, and visually unbalanced.
- Evidence (links to /reports or output files): ixos-site/src/components/sections/TodaySection.tsx, ixos-site/src/components/sections/WorkstreamsSection.tsx, ixos-site/src/components/sections/MeetingUseCase.tsx, ixos-site/src/components/sections/Benchmarks.tsx, ixos-site/src/components/sections/ProFeatures.tsx, ixos-site/src/components/sections/ProCard.tsx, ixos-site/src/components/sections/Pricing.tsx
- Risks: copy may need one final tone pass after stakeholder review.
- Follow-ups: capture screenshot/video QA and iterate micro-copy.
- Decision: Stabilize Pro-card handoff with hysteresis + rAF-throttled host switching and an offscreen hidden host.
- Options considered: simple threshold switching; bridge-zone UI; hysteresis state machine plus offscreen hidden stage.
- Why chosen: removes oscillation/jank near scroll boundaries while preserving the no-transfer-zone visual requirement.
- Evidence (links to /reports or output files): ixos-site/src/components/sections/PricingProFlow.tsx, ixos-site/src/components/sections/Pricing.tsx, ixos-site/src/components/sections/ProFeatures.tsx
- Risks: exact threshold feel still depends on viewport height.
- Follow-ups: final micro-tune after recorded browser QA.

- Decision: Make annual billing the default in shared pricing flow and pricing component fallback state.
- Options considered: keep monthly default; set default only in wrapper; set default in wrapper + component fallback.
- Why chosen: guarantees annual default across both home and /pricing and any direct component usage.
- Evidence (links to /reports or output files): ixos-site/src/components/sections/PricingProFlow.tsx, ixos-site/src/components/sections/Pricing.tsx
- Risks: none material.
- Follow-ups: none.

- Decision: Defer platform auto-detection until after hydration using post-mount scheduling.
- Options considered: server-time detection fallback only; immediate effect setState; post-hydration scheduled update.
- Why chosen: prevents SSR/client platform mismatch markup on macOS/Linux while satisfying lint and avoiding hydration churn.
- Evidence (links to /reports or output files): ixos-site/src/components/sections/DownloadActions.tsx, ixos-site/src/app/download/page.tsx
- Risks: one-frame Windows default before update on non-Windows clients.
- Follow-ups: optional cookie/localStorage hint if zero-flip UX is needed.

- Decision: Redesign Workstreams into an asymmetric operations-board layout to differentiate it from Today.
- Options considered: iterate existing two-column template; minor spacing tweaks; full layout differentiation with stream rail + execution deck + evidence path.
- Why chosen: user feedback required non-generic, non-template feel and clear visual distinction from Today.
- Evidence (links to /reports or output files): ixos-site/src/components/sections/WorkstreamsSection.tsx
- Risks: may need one more brand-polish pass after visual review.
- Follow-ups: capture screenshot/video QA and tune spacing/accent intensity.- Decision: Move `generate-latest-json` artifact download source from private repo release to `IxosProtocol/ixos-releases`, with asset-availability retries.
- Options considered: keep source-repo download; immediate one-shot against releases repo; releases-repo download with retry/wait.
- Why chosen: desktop publish now targets a dedicated releases repo; the manifest job must read from the same source of truth and tolerate propagation delay.
- Evidence (links to /reports or output files): .github/workflows/release.yml
- Risks: requires valid `RELEASES_PAT` scope for releases repo.
- Follow-ups: confirm live `v*` run completes generate-latest-json without manual rerun.

- Decision: Make `publish-draft` non-fatal when the source private release is absent.
- Options considered: hard fail; create missing release; skip with explicit log.
- Why chosen: avoids blocking public desktop distribution when private draft publication is not present or not required.
- Evidence (links to /reports or output files): .github/workflows/release.yml
- Risks: private repo may stay draft/absent silently if expected by internal process.
- Follow-ups: if internal distribution depends on source release publish, add explicit policy gate env flag.

- Decision: Broaden updater artifact matching and recursive scan in `generate-latest-json.js`.
- Options considered: strict top-level patterns; update a few regexes only; recursive scan + broader filename support + debug listing.
- Why chosen: eliminates false negatives across runner-specific artifact naming and folder structures.
- Evidence (links to /reports or output files): scripts/generate-latest-json.js
- Risks: basename dedupe could pick first duplicate asset name across folders.
- Follow-ups: enforce unique artifact names in release pipeline if duplicates ever appear.
- Decision: Add a manual `Release Postprocess` workflow for existing desktop tags.
- Options considered: force new tag rebuild only; edit old tag; manual postprocess workflow against `ixos-releases`.
- Why chosen: allows repairing `generate-latest-json` / `publish-draft` failures for already-cut tags without another full matrix build.
- Evidence (links to /reports or output files): .github/workflows/release-postprocess.yml
- Risks: relies on `RELEASES_PAT` correctness and existing tag assets in `ixos-releases`.
- Follow-ups: keep this workflow for emergency recovery and release operations.

- Decision: Bundle real Flash v2 and Potion models in desktop installers and fail CI on missing/pointer assets.
- Options considered: keep stub directories; optional model download post-install; ship required model files in bundle.
- Why chosen: user requirement is zero post-install model download and deterministic offline readiness.
- Evidence (links to /reports or output files): .github/workflows/release.yml, src-tauri/tauri.conf.json, src/ixos_embed/mmap_model.rs
- Risks: larger installer size.
- Follow-ups: monitor installer size growth and, if needed, split optional models while keeping required defaults bundled.

- Decision: Switch CLI install entrypoint URLs to release assets and publish install scripts with each CLI release.
- Options considered: keep raw GitHub repo scripts; publish scripts to release assets and reference latest download URLs.
- Why chosen: decouples install entrypoint from source repo branch churn and aligns with release-driven distribution.
- Evidence (links to /reports or output files): .github/workflows/cli-release.yml, ixos-site/src/lib/downloads.ts, ixos-site/src/app/docs/cli-reference/page.tsx
- Risks: release assets must include installer scripts before latest URLs become valid.
- Follow-ups: run one `cli-v*` release to publish `install.sh`/`install.ps1` assets.

- Decision: Replace Unix self-update copy-over with staged rename to fix ETXTBSY.
- Options considered: direct overwrite; delete+copy; staged sibling copy + atomic rename.
- Why chosen: avoids writing to running executable and resolves Linux `Text file busy` failures.
- Evidence (links to /reports or output files): src/cli/self_update.rs
- Risks: staged file cleanup if rename fails mid-flight.
- Follow-ups: add integration test coverage for replace path behavior when test harness is available.
- Decision: Replace strict local-model presence gate with auto-fetch + validate in desktop release workflow.
- Options considered: keep strict gate; remove gate entirely; fetch missing models and then enforce validation.
- Why chosen: avoids guaranteed release failures on repos that do not track model weights while still ensuring installers include real model assets.
- Evidence (links to /reports or output files): .github/workflows/release.yml
- Risks: release job now depends on upstream model hosts availability.
- Follow-ups: set `FLASH_MODEL_REPO/REF/SUBDIR` repository variables for deterministic source pinning.

- Decision: Ensure CLI install scripts are uploaded by desktop releases too.
- Options considered: rely on latest CLI release only; make install command dynamic; upload scripts from both desktop and CLI release pipelines.
- Why chosen: prevents `latest/download/install.*` 404 when newest release is desktop-tagged.
- Evidence (links to /reports or output files): .github/workflows/release.yml, .github/workflows/cli-release.yml, .github/workflows/release-postprocess.yml
- Risks: duplicated script assets across release types.
- Follow-ups: keep script versions in sync via shared repo files (already sourced from checkout).

- Decision: Replace `sort -V` in installer with portable semver ordering.
- Options considered: keep `sort -V`; require GNU coreutils on macOS; implement POSIX-compatible ordering.
- Why chosen: macOS/BSD `sort` compatibility for advertised Darwin one-liner install path.
- Evidence (links to /reports or output files): scripts/install.sh
- Risks: none material for x.y.z tag format.
- Follow-ups: keep tags strictly in `cli-vMAJOR.MINOR.PATCH` format.

- Decision: Enforce strict `/4` scratch namespace orchestration (`_v4` only) and complete missing sections with source-backed claims.
- Options considered: keep mixed legacy imports; partially wire `_v4` while leaving older components active; full `_v4`-only page orchestrator with newly built missing modules.
- Why chosen: satisfies rebuild contract, removes ambiguity about active implementation, and keeps claims tied to explicit source paths.
- Evidence (links to /reports or output files): `ixos-site/src/app/4/page.tsx`, `ixos-site/src/app/4/_v4/V4AskMode.tsx`, `ixos-site/src/app/4/_v4/V4ProValue.tsx`, `ixos-site/src/app/4/_v4/V4Pricing.tsx`.
- Risks: existing `_v4` lint debt remains in previously authored files not touched in this pass.
- Follow-ups: run a dedicated lint-hardening pass for legacy `_v4` files (`V4CLI`, `V4Pipeline`, `V4Stats`, `useReducedOrLowEnd`) without changing shipped behavior.

- Decision: Keep pricing copy qualitative on `/4` and avoid unsourced numeric plan claims.
- Options considered: keep prior `$9/mo` style claims; infer price from older section variants; remove unsourced numbers and point to live pricing route.
- Why chosen: avoids truthfulness violations while still guiding users to a current source of plan details.
- Evidence (links to /reports or output files): `ixos-site/src/app/4/_v4/V4Pricing.tsx`, `ixos-site/src/app/pricing/page.tsx`.
- Risks: less immediate pricing specificity on `/4` hero flow.
- Follow-ups: if product wants inline pricing numbers, wire them from a verified runtime source or shared pricing config.

- Decision: Pivot `/4` from linear section browsing to a spatial search-flight metaphor (sections as result nodes with a camera rail).
- Options considered: keep right skim nav and flat stack; keep section wrappers only; introduce global camera rail + result-node framing + search-like boot.
- Why chosen: directly aligns with user request for stronger 3D spatial movement and �explore each result� feel while staying non-WebGL and stable.
- Evidence (links to /reports or output files): `ixos-site/src/app/4/_v4/V4SpatialStage.tsx`, `ixos-site/src/app/4/_v4/V4ResultNode.tsx`, `ixos-site/src/app/4/page.tsx`.
- Risks: camera amplitude may need per-device tuning for motion comfort.
- Follow-ups: perform device QA and consider a reduced-amplitude user toggle if needed.

- Decision: Replace minimalist loader branding with a desktop-search style instant-results loader.
- Options considered: keep logo-only loader; remove loader entirely; simulate real search frame on first paint.
- Why chosen: user asked first-load emotional moment to feel like using the desktop app search instantly.
- Evidence (links to /reports or output files): `ixos-site/src/app/4/_v4/V4Loader.tsx`.
- Risks: if too fast/short, some users may miss the setup narrative.
- Follow-ups: tune loader duration by QA (currently ~1.36s end-to-end).

- Decision: Introduce a true WebGL search-space rail (`V4ResultSpace`) and sync it with section/result traversal.
- Options considered: keep CSS-only transforms; increase 2D parallax only; add fixed R3F camera rail bound to scroll progress.
- Why chosen: user explicitly requested stronger spatial 3D motion where sections feel like zooming into real results.
- Evidence (links to /reports or output files): `ixos-site/src/app/4/_v4/V4ResultSpace.tsx`, `ixos-site/src/app/4/_v4/V4SpatialStage.tsx`.
- Risks: high camera amplitude can reduce readability/motion comfort on some screens.
- Follow-ups: tune amplitudes after manual QA and optionally expose intensity toggle.

- Decision: Keep `/4` source sections visually translucent and import shared desktop token source (`packages/ui/src/tokens/tokens.css`).
- Options considered: leave opaque per-section backgrounds; partially reduce opacity in each component; enforce global transparent section layer + shared tokens.
- Why chosen: preserves ambient brand field visibility and aligns colors/typography closer to desktop app styling without mutating desktop code.
- Evidence (links to /reports or output files): `ixos-site/src/app/globals.css`.
- Risks: low-contrast combinations can appear in some sections if local card backgrounds remain too dark.
- Follow-ups: section-by-section contrast QA and selective card surface adjustments.

- Decision: Shift copy to desktop terminology while keeping canonical CLI flags in code examples.
- Options considered: purely user-facing terms everywhere; raw flag-only language; mixed approach (desktop labels in prose, real flags in commands).
- Why chosen: preserves truthfulness and avoids inventing unsupported CLI syntax while improving branding consistency.
- Evidence (links to /reports or output files): `ixos-site/src/app/4/_v4/V4CLI.tsx`, `V4CTA.tsx`, `V4Progressive.tsx`, `V4Pipeline.tsx`, `V4Pricing.tsx`, `V4Hero.tsx`.
- Risks: some mixed terminology still needs final editorial harmonization.
- Follow-ups: final copy pass across remaining `_v4` files.

- Decision: Remove active `/4` WebGL rail and ship a no-WebGL 3D camera system for now.
- Options considered: keep WebGL and debug shader/uniform path; add optional WebGL toggle; remove WebGL from active path and rely on CSS 3D.
- Why chosen: user hit live rendering failures/artifacts and requested stability plus better readability while keeping strong motion.
- Evidence (links to /reports or output files): `ixos-site/src/app/4/_v4/V4SpatialStage.tsx`, deletion of `ixos-site/src/app/4/_v4/V4ResultSpace.tsx` usage.
- Risks: less extreme spatial depth than a polished WebGL scene.
- Follow-ups: reintroduce WebGL only behind strict capability checks after full parity + stability.

- Decision: Replace left fixed HUD with centered desktop-style search shell.
- Options considered: keep left nav/HUD; disable HUD entirely; center shell that mirrors desktop search interaction model.
- Why chosen: user explicitly rejected left panel and asked for sections to feel like real search results expanding/collapsing.
- Evidence (links to /reports or output files): `ixos-site/src/app/4/_v4/V4SpatialStage.tsx`.
- Risks: still not full 1:1 desktop visual parity until per-section card internals are rebuilt.
- Follow-ups: continue section-by-section parity rebuild.

- Decision: Remove fixed top shell and shift search-result affordances into hero and per-section result cards.
- Options considered: keep fixed overlay shell; hide shell only after hero; remove shell and embed result interaction into section flow.
- Why chosen: user explicitly rejected static overlay behavior and asked for sections to feel like expandable/collapsible results.
- Evidence (links to /reports or output files): `ixos-site/src/app/4/_v4/V4SpatialStage.tsx`, `ixos-site/src/app/4/_v4/V4ResultNode.tsx`.
- Risks: less persistent global navigation state than fixed shell.
- Follow-ups: add optional compact progress indicator if needed.

- Decision: Rebuild hero around desktop search anatomy (search bar + quality/mode controls + result cards + Why matched expansion).
- Options considered: incremental tweaks to old hero; keep cinematic mock panel; full hero rewrite aligned to desktop interaction model.
- Why chosen: user requested one-to-one desktop style and rejected prior mock-up feel.
- Evidence (links to /reports or output files): `ixos-site/src/app/4/_v4/V4Hero.tsx`.
- Risks: other sections still need similar parity work to fully match hero quality.
- Follow-ups: propagate this anatomy to key sections next.

- Decision: Create a new shared package at `packages/ixos-ui` and consume it from both desktop UI and `ixos-site`.
- Options considered: keep shared UI only in existing `packages/ui`; duplicate demo components under `ixos-site/src`; build a new package and wire both apps.
- Why chosen: satisfies Vercel root constraints while enforcing landing/desktop component parity for `/4` App-World.
- Evidence (links to /reports or output files): `packages/ixos-ui/package.json`, `package.json`, `ui/package.json`, `ixos-site/package.json`, `ixos-site/next.config.ts`.
- Risks: temporary visual mismatch can remain where legacy desktop search components still diverge from shared surface internals.
- Follow-ups: continue search-surface parity pass and prune redundant legacy component paths.

- Decision: Rebuild `/4` as one continuous AppWorld layer with lens overlays instead of stacked section cards.
- Options considered: keep prior `_v4` section stack; incremental polish on card sections; full AppWorld world-layer + lens overlay architecture.
- Why chosen: directly addresses non-negotiables (no repetitive section cards, same app surface continuity, non-blocking overlays).
- Evidence (links to /reports or output files): `ixos-site/src/app/4/page.tsx`, `FEATURE_INVENTORY.md`, `COPY_MAP.md`.
- Risks: scroll pacing can feel heavy on smaller screens if lens spacing is not tuned.
- Follow-ups: run mobile QA and adjust section heights/trigger margins.

- Decision: Use source-cited lens claims only and remove unsupported numeric marketing claims.
- Options considered: preserve prior benchmark-heavy hero language; add new numbers; strictly qualitative + source path citations.
- Why chosen: preserves truthfulness constraints and prevents fabricated benchmark/comparison statements.
- Evidence (links to /reports or output files): `FEATURE_INVENTORY.md`, `ixos-site/src/app/4/page.tsx` (lens `source` strings), `DESKTOP_UI_AUDIT.md`.
- Risks: less flashy copy compared to unsourced quantitative claims.
- Follow-ups: wire any future numeric claims only from canonical report files.
- Decision: Trust `entitlement.plan === "pro"` for desktop UI unlocks, with only `timeSuspect` as a local hard-lock override.
- Options considered: keep requiring local `proStatus` active/grace; trust plan with explicit expired lock; trust plan except anti-tamper lock.
- Why chosen: fixes false-lock UX where account shows Pro but Today/Workstreams appear locked during status drift/bootstrap while preserving anti-tamper behavior.
- Evidence (links to /reports or output files): `ui/src/lib/proAccess.ts`, user-reported lock mismatch in desktop nav/surfaces.
- Risks: temporary grace for users with stale `expired` status until entitlement sync updates.
- Follow-ups: if backend adds authoritative `plan_effective` flag, switch UI gating to that explicit field.

- Decision: Keep a unified shared search surface but split CTA framing by context (`showInlineRunButton`).
- Options considered: revert fully to old desktop search components; force one identical run-button layout everywhere; shared component with context-specific run affordance.
- Why chosen: keeps landing/desktop component parity while restoring desktop ergonomics closer to prior behavior and preserving landing interactivity.
- Evidence (links to /reports or output files): `packages/ixos-ui/src/components/SearchSurface.tsx`, `ui/src/components/search/MainSearchView.tsx`, `packages/ixos-ui/src/components/AppWorldSurface.tsx`.
- Risks: subtle visual differences remain between desktop shell chrome and landing world framing.
- Follow-ups: continue parity pass on micro-spacing and typography tokens.

- Decision: Rebuild `/4` hero entry with true curved motion-path woosh (`offset-path`) and strengthen lens discoverability.
- Options considered: keep framer x/y tween path approximation; use GSAP motion path; CSS `offset-path` + fallback.
- Why chosen: satisfies explicit curved-path requirement with low runtime cost and clean reduced-motion fallback.
- Evidence (links to /reports or output files): `ixos-site/src/app/4/page.tsx` (`.ixos-woosh-entry`, `@keyframes ixosWooshPath`, lens sections and skip rail).
- Risks: browser support edge cases for motion path on older clients.
- Follow-ups: if needed, add explicit non-motion-path JS fallback for unsupported browsers.

- Decision: Restore desktop search control surface to legacy `SearchInput` while retaining shared `SearchSurface` for results/evidence.
- Options considered: keep fully shared all-in-one search bar; revert entirely to old desktop stack; hybrid approach with legacy controls + shared results/evidence.
- Why chosen: user explicitly requested old-style controls/directory handling while still requiring identical shared components/tokens for the landing demo.
- Evidence (links to /reports or output files): `ui/src/components/search/MainSearchView.tsx`, `packages/ixos-ui/src/components/SearchSurface.tsx`.
- Risks: two-part search layout increases integration surface between input and results.
- Follow-ups: continue trimming spacing and interaction seams between top controls and shared evidence rail.

- Decision: Keep recent/starred history visible in sidebar across Search, Today, and Workstreams.
- Options considered: search-only history visibility; compact history widget outside Search; always-visible history list.
- Why chosen: directly addresses workflow continuity issue reported by user and preserves context when switching views.
- Evidence (links to /reports or output files): `ui/src/components/layout/Sidebar.tsx`.
- Risks: sidebar vertical density can become tight on shorter displays.
- Follow-ups: if needed, add collapsible history section for small heights.

- Decision: Rebuild `/4` lens overlays as distinct toy-driven experiences with active app hotspots, instead of repeated card blocks.
- Options considered: keep repeated lens cards; increase styling variance only; full toy-driven lens variants with hotspot linkage and stronger world choreography.
- Why chosen: user explicitly rejected repetitive sections and requested a more animated, high-impact "App-World" tour.
- Evidence (links to /reports or output files): `ixos-site/src/app/4/page.tsx`.
- Risks: motion complexity may need further tuning for comfort on low-end devices.
- Follow-ups: run manual QA and tune transform amplitudes and lens pacing.

- Decision: Move shared desktop/landing shell responsiveness from viewport media queries to container-query behavior.
- Options considered: keep viewport-only breakpoints; duplicate variant-specific demo wrappers; make `@ixos/ixos-ui` container-responsive.
- Why chosen: runtime variants embed shared surfaces inside narrower columns on wide viewports; container-based adaptation prevents visual squish and preserves cross-product component parity.
- Evidence (links to /reports or output files): `packages/ixos-ui/src/styles.css`, `packages/ixos-ui/src/components/SearchSurface.tsx`, `packages/ixos-ui/src/components/TodaySurface.tsx`, `packages/ixos-ui/src/components/WorkstreamsSurface.tsx`.
- Risks: container-query behavior can differ from prior screenshots and may require token tuning per host container.
- Follow-ups: validate on additional host layouts and adjust compact thresholds if needed.

- Decision: Enforce cloud-placeholder skip in lexical eligibility and parser entry points.
- Options considered: rely on existing semantic/snippet guards only; add path blacklist in UI; guard lexical funnel + parser core.
- Why chosen: lexical ripgrep and parser reads occur earlier than semantic safeguards and can hydrate cloud-only placeholders.
- Evidence (links to /reports or output files): `src/ixos_rank/candidate_generator/ripgrep_funnel.rs`, `src/parsers/mod.rs`.
- Risks: false-positive cloud detection could skip legitimate files in uncommon provider setups.
- Follow-ups: run manual OneDrive/iCloud edge-case QA and log provider-specific exceptions if observed.

- Decision: Keep `/1`, `/2`, `/3` runtime pages on shared `DemoSurface` while rebuilding each with distinct visual language and explicit preset/token contracts.
- Options considered: use `src/landing/variants/*` wrappers; create route-specific fake app mockups; keep active `src/app/{1,2,3}` and strengthen them with shared demo primitives.
- Why chosen: satisfies AGENTS shared-surface guardrail and avoids divergence between landing demos and desktop components.
- Evidence (links to /reports or output files): `ixos-site/src/app/1/_mc/MissionControlPage.tsx`, `ixos-site/src/app/2/_ch/ChamberPage.tsx`, `ixos-site/src/app/3/_wire/WirePage.tsx`, `ixos-site/src/landing/DemoSurface.tsx`, Playwright visuals under `ixos-site/.visual/landing.visual.spec.ts/*`.
- Risks: high visual complexity increases maintenance overhead across three route-specific themes.
- Follow-ups: extract reusable structural primitives if repeated patterns grow.

- Decision: Normalize UI confidence scores from raw ranking scores before rendering in shared search surfaces.
- Options considered: display raw backend score (can exceed 1.0); clamp raw score directly; derive normalized confidence from score breakdown with fallback normalization.
- Why chosen: user-facing match confidence must remain 0-100% and comparable across Flash/Auto/Pro while preserving backend ranking semantics.
- Evidence (links to /reports or output files): `ui/src/components/search/MainSearchView.tsx`, `packages/ixos-ui/src/components/SearchSurface.tsx`, `packages/ixos-ui/src/types.ts`.
- Risks: confidence remains an inferred normalization when backend emits non-probabilistic ranking sums.
- Follow-ups: expose explicit backend confidence field to remove UI-side inference.

- Decision: Keep desktop and landing aligned through shared `@ixos/ixos-ui` surfaces, but feed desktop-specific controls and richer data mapping from `MainSearchView`.
- Options considered: revert to legacy desktop-only result components; force one rigid shared search bar flow everywhere; hybrid shared surface + desktop control shell.
- Why chosen: preserves mandatory shared-component parity while restoring advanced desktop behavior (folder/model controls, streaming telemetry, about panel actions).
- Evidence (links to /reports or output files): `packages/ixos-ui/src/components/SearchSurface.tsx`, `ui/src/components/search/MainSearchView.tsx`, `ui/src/components/search/SearchInput.tsx`.
- Risks: adapter/mapping layer in desktop can drift from backend schema over time.
- Follow-ups: add small mapper tests for score/context conversion.

- Decision: Serialize encrypted history writes and add a local mirror fallback for search threads.
- Options considered: keep fire-and-forget encrypted saves; fetch sidebar history from backend only; queued encrypted writes plus mirror.
- Why chosen: addresses restart inconsistency where stale/old searches sometimes replaced newer ones due asynchronous write races.
- Evidence (links to /reports or output files): `ui/src/stores/starredStore.ts`.
- Risks: local mirror can diverge if storage corruption occurs in both stores.
- Follow-ups: add integrity checksum + periodic self-heal merge strategy.

- Decision: Hydrate desktop build env requirements from `.env.local` files in root, `src-tauri`, and `ui` before failing validation.
- Options considered: require explicit shell export only; only read root `.env.local`; load all relevant env files with shell vars overriding.
- Why chosen: fixes local release build failures when variables are correctly set in project env files but not exported in shell/session.
- Evidence (links to /reports or output files): `scripts/verify-desktop-build-env.js`, `npm run tauri:build` PASS after patch.
- Risks: developers may assume CI also reads these files (it should still use secrets/vars explicitly).
- Follow-ups: document CI vs local precedence in release docs.

- Decision: Increase desktop chrome/control density and reduce default window footprint for 1080p-friendly startup
- Options considered: Keep 1920x1080 default and only enlarge icons; add global zoom/scaling hacks; resize default window + increase titlebar/sidebar target sizes
- Why chosen: The oversized logical window and very small custom controls made desktop UX feel non-native and cramped/off on common displays.
- Evidence (links to /reports or output files): src-tauri/tauri.conf.json, ui/src/components/layout/WindowControls.tsx, ui/src/components/layout/AppShell.tsx, ui/src/components/layout/Sidebar.tsx, ui/src/components/search/MainSearchView.tsx
- Risks: Slightly denser layout may require additional tuning on very small displays.
- Follow-ups: Validate final packaged app on 1366x768 and 1536x864.

- Decision: Materialize `.env.local` files in release workflow and pass full Vite env set to `tauri-action`
- Options considered: Keep env only in step-level vars; rely on local file presence in CI; generate `.env.local` for all build roots and include missing env in tauri-action
- Why chosen: Tauri build can re-run frontend build paths; missing per-step env propagation caused packaged binaries to miss required runtime keys.
- Evidence (links to /reports or output files): .github/workflows/release.yml
- Risks: CI-generated env files live in runner workspace during job execution (ephemeral but should remain non-artifacted).
- Follow-ups: Confirm next tagged release run is key-complete and update release checklist evidence.

- Decision: Restore platform-native titlebar controls and remove floating control capsule UI
- Options considered: Keep enlarged capsule; partially restyle capsule; implement OS-specific titlebar-integrated controls
- Why chosen: User feedback and screenshot showed the capsule looked non-native and detached from app chrome; native-style header controls improve desktop legitimacy immediately.
- Evidence (links to /reports or output files): ui/src/components/layout/WindowControls.tsx, RUNLOG.md (Entry 0XY)
- Risks: Minor visual differences may still need per-platform fine-tuning in packaged runtime.
- Follow-ups: Validate Windows and macOS packaged builds and tweak spacing per OS if needed.

- Decision: Roll back broad desktop density scaling and keep only titlebar-control modernization
- Options considered: Keep larger sidebar/shell spacing; partial rollback; full density rollback with control-only retention
- Why chosen: User explicitly requested pre-change sizing feel and only asked for better top controls.
- Evidence (links to /reports or output files): ui/src/components/layout/AppShell.tsx, ui/src/components/layout/Sidebar.tsx, ui/src/components/layout/WindowControls.tsx, RUNLOG.md (Entry 0XZ)
- Risks: Some users on very high DPI might still prefer larger controls/content.
- Follow-ups: Optional per-platform compact/comfortable density toggle later.

- Decision: Render search dropdown menus via portal with top-layer z-index and opaque surfaces
- Options considered: Increase local z-index only; refactor stacking contexts; portal to document body with fixed positioning
- Why chosen: Screenshot showed chips/cards painting above dropdown panels; portal removes stacking-context conflicts reliably.
- Evidence (links to /reports or output files): ui/src/components/search/QualitySwitcher.tsx, ui/src/components/search/ModeSwitcher.tsx, RUNLOG.md (Entry 0XZ)
- Risks: Needs careful position syncing on scroll/resize (handled with listeners).
- Follow-ups: Add viewport-edge collision handling for very small widths if needed.

- Decision: Replace custom popover mode switchers with native themed selects
- Options considered: Keep portal popovers; keep absolute popovers with higher z-index; use native selects styled to match app
- Why chosen: Native selects are platform-robust and remove interaction/race/stacking bugs observed in production screenshots.
- Evidence (links to /reports or output files): ui/src/components/search/QualitySwitcher.tsx, ui/src/components/search/ModeSwitcher.tsx, RUNLOG.md (Entry 0YA)
- Risks: Slightly less bespoke micro-interaction than custom popovers.
- Follow-ups: Reintroduce richer visuals later only if interaction remains deterministic.

- Decision: Start main window maximized and track runtime maximize state for caption icon/corner shape
- Options considered: Keep fixed-size startup; maximize manually after launch; set maximized in config + synchronize frontend state
- Why chosen: User requirement is desktop-app behavior that fills available work area by default and shows correct restore/maximize affordance.
- Evidence (links to /reports or output files): src-tauri/tauri.conf.json, ui/src/components/layout/WindowControls.tsx, ui/src/styles/globals.css, RUNLOG.md (Entry 0YA)
- Risks: Some users may prefer restored launch size.
- Follow-ups: Optional "launch maximized" user setting in future settings panel.

## 2026-03-04 Innovation Sprint vNEXT Decisions
- KEEP (prototype only): risk_budget_v1 controller as quality-heavy Pareto reference.
- REJECT for shipping: synchronous Pro escalation defaults (p95 regression too large).
- KEEP for further study: risk_budget_v2 formalized budget/risk scoring framework.
- PIVOT: pursue trust-constrained score optimization and confidence-bound stopping instead of blocking heavy-path fallbacks.

## 2026-03-04 Ralph v3 Decisions
- Decision: Accept NO SURVIVORS as the valid Ralph v3 outcome for this run (plateau stop).
- Options considered: force-select weakest survivor to continue prototyping; continue infinite search despite 3-cycle plateau; stop with evidence-saturated banlist and explicit next search directions.
- Why chosen: forcing convergence violates Ralph anti-bias/anti-settling constraints and would reduce rigor; evidence showed repeated collapse to known prior art or gatekeeper vetoes.
- Evidence (links to /reports or output files): ralph_v3/FINAL_REPORT.md, ralph_v3/NOVELTY_MATRIX.md, ralph_v3/BANLIST.md, ralph_v3/FAILURES.md, ralph_v3/SOURCES.md.
- Risks: a truly novel architecture may still exist outside explored query neighborhoods.
- Follow-ups: next cycle must start from the five new search directions and use adversarial prior-art search before any survivor promotion.

- Decision: Treat control-plane documentation (ralph_v3/* + root state snapshot/log/decisions) as mandatory deliverable equal to candidate generation.
- Options considered: keep findings only in chat; partial file logging; full durable logging for compaction resilience.
- Why chosen: mission explicitly assumes context loss and requires resumability without chat history.
- Evidence (links to /reports or output files): ralph_v3/EXECUTION_LOG.md, ralph_v3/TASK_QUEUE.md, PLAN.md latest snapshot.
- Risks: documentation overhead can reduce experiment throughput.
- Follow-ups: keep logs concise but complete; avoid deep prose when tabular entries suffice.


## 2026-03-05 Ralph v4 Bootstrap Decisions
- Decision: Treat v4 as active/incomplete and explicitly forbid plateau stop until hard minimum budget gates are met.
- Options considered: keep v3 3-cycle plateau; allow early no-survivor stop after first pass; enforce v4 hard minimum budget.
- Why chosen: user contract in `/CODEX.md` explicitly requires longer-run saturation and stronger negative-result standards.
- Evidence (links to /reports or output files): `reports/ralph_v4/FINAL_REPORT.md`, `reports/ralph_v4/TASK_QUEUE.md`, `/CODEX.md`.

- Decision: Keep only `ARCH-A01`, `ARCH-A04`, and `ARCH-B11` as provisional survivors after pass-1 prosecutor+gatekeeper.
- Options considered: keep broader UNCLEAR set; force-select one survivor; kill all immediately.
- Why chosen: these three have the strongest remaining differentiators while still falsifiable; others collapsed to established families or failed gatekeeper risk checks.
- Evidence (links to /reports or output files): `reports/ralph_v4/NOVELTY_MATRIX.md`, `reports/ralph_v4/BANLIST.md`, `reports/ralph_v4/SURVIVORS.md`.

- Decision: No prototype/harness coding in this pass.
- Options considered: immediate prototype for momentum; tiny harness now; defer until survivor survives stronger prosecution.
- Why chosen: v4 prototyping policy requires a stronger survivor signal first; current run is still in saturation stage.
- Evidence (links to /reports or output files): `reports/ralph_v4/FINAL_REPORT.md`, `reports/ralph_v4/SURVIVORS.md`.
## 2026-03-09 Ixplorer search integration boundary
- Decision: keep Ixplorer as a native Qt Widgets app and integrate Ixos search through the existing local `ixos` CLI JSON/progressive contract.
- Options considered:
  - Add a brand-new Rust FFI boundary for Ixplorer.
  - Reuse the Tauri backend command surface directly.
  - Use the existing `ixos search --json --progressive --show-scores --evidence` process boundary.
- Why chosen:
  - It already exists in-repo, preserves Ixos search-mode/fallback semantics, stays robust on Windows, and is easy to debug independently from the Qt UI.
  - It avoided duplicating search logic or creating a second native API surface for the same Rust engine.
  - It let the biggest implementation pass focus on explorer usability and result flow instead of plumbing risk.
- Evidence:
  - `ixplorer/src/search/IxosCliSearchProvider.cpp`
  - `ixplorer/src/search/SearchTypes.h`
  - `reports/ixplorer_major_pass_2026-03-09.md`

## 2026-03-09 Ixplorer explorer-core direction
- Decision: upgrade the existing `QFileSystemModel`/`QTreeView` explorer instead of replacing the center pane with a custom file model.
- Options considered:
  - Rebuild the explorer center pane around a custom model/view layer.
  - Keep Qt filesystem primitives and add the missing navigation/file-operation/state behaviors around them.
- Why chosen:
  - The existing Qt primitives already handle most Windows-first filesystem behavior well enough; the missing value was shell behavior and state management, not a lack of native file listing.
  - This kept drag/drop, rename, sort, and filesystem refresh grounded in Qt rather than reimplementing them under schedule pressure.
- Evidence:
  - `ixplorer/src/widgets/ExplorerPane.cpp`
  - `ixplorer/src/widgets/TabWorkspace.cpp`
  - `reports/ixplorer_major_pass_2026-03-09.md`

## 2026-03-09 Ixplorer search shell behavior
- Decision: make the top toolbar search the default Ixos entry point and keep the right rail closed by default, opening it only when the user explicitly toggles it or runs a folder search.
- Options considered:
  - Keep the rail always visible and treat top search as a secondary shortcut.
  - Move search into the center pane or bottom tray.
  - Use toolbar search as the primary Ixos flow and make the rail collapsible.
- Why chosen:
  - It matches the requested product shape better: browse-first by default, search when needed, and no permanent right-side crowding.
  - It preserves the right rail as a useful inspect surface without forcing the user to give up workspace width when they are just browsing files.
  - It makes search feel native to Ixplorer instead of like a bolted-on side widget.
- Evidence:
  - `ixplorer/src/widgets/ExplorerToolbar.cpp`
  - `ixplorer/src/widgets/IxosRail.cpp`
  - `ixplorer/src/app/MainWindow.cpp`

## 2026-03-10 Ixplorer native host-window strategy
- Decision: pivot Ixplorer document tabs from internal faux previews/editors to Windows foreign-window hosting of the file’s exact associated app window whenever the association is document-like and safe to host.
- Options considered:
  - Keep the custom Qt preview/editor approach and broaden type coverage manually.
  - Launch everything externally except a tiny allowlist of native Qt previews.
  - Host the real associated app window inside the workspace, with denylist fallback for browser/terminal/installer/game-like associations.
- Why chosen:
  - The product requirement is that the user sees the exact app chrome they would have opened normally, not a simulated editor surface.
  - On Windows, Qt foreign-window support plus Win32 parent/style control is the most practical path available in the current architecture without rebuilding around app-specific COM/OLE integrations.
  - It preserves a future path toward per-app hardening while already delivering the defining UX difference for Office/PDF/image/text-style associations that cooperate.
- Evidence:
  - `ixplorer/src/widgets/DocumentPane.cpp`
  - `ixplorer/src/utils/FileOpenPolicy.cpp`
  - `reports/ixplorer_workspace_search_pass_2026-03-10.md`

## 2026-03-10 Ixplorer search-open behavior
- Decision: make rail result selection drive a single reusable center preview surface by default, keep explicit new-tab open as a separate action, and default the Qt search boundary to `native-cache`.
- Options considered:
  - Leave selection passive and only open on explicit button clicks.
  - Keep auto-open only for the top result while explicit clicks created separate tabs.
  - Reuse one preview host for result browsing and reserve new tabs for intentional multi-open workflows.
- Why chosen:
  - It reduces navigation drift and makes the rail behave like a focused search/browser surface instead of a disconnected launcher.
  - Cached search is the right default for the desktop UX target here because the progressive UI already exists and cold-path waits were the visible pain point.
- Evidence:
  - `ixplorer/src/widgets/IxosRail.cpp`
  - `ixplorer/src/app/MainWindow.cpp`
  - `ixplorer/src/search/IxosCliSearchProvider.cpp`

## 2026-03-10 Ixplorer supported-host policy
- Decision: stop broad “embed whatever the associated app opens” behavior and restrict exact-window hosting to an explicit supported desktop-app set.
- Options considered:
  - Keep broad hosting and continue refining heuristics around it.
  - Fall back to external open for everything except a tiny hand-built preview system.
  - Use a capability allowlist for stable desktop apps and reject unsupported/UWP/browser/terminal-style associations up front.
- Why chosen:
  - The broad strategy was capturing unrelated windows and producing broken embeds for apps that do not behave like stable embeddable document hosts.
  - The user’s core requirement is reliability and intentional behavior, not accidental “sometimes it embeds.”
  - This keeps the exact-window differentiator where it works while making failures explicit and future-proof.
- Evidence:
  - `ixplorer/src/utils/FileOpenPolicy.cpp`
  - `ixplorer/src/widgets/DocumentPane.cpp`

## 2026-03-10 Ixplorer embedded-window chrome policy
- Decision: strip top-level non-client controls from hosted windows and treat the embedded app as content inside Ixplorer rather than a draggable desktop window.
- Options considered:
  - Preserve the full native title bar and controls.
  - Build custom fake chrome around the embedded app.
  - Remove top-level non-client chrome and resize the hosted child window to the pane.
- Why chosen:
  - The embedded window should not expose maximize/minimize/close buttons or drag affordances that make sense only for a free desktop window.
  - Removing that chrome reduces visual clash and makes the hosted view behave like part of the workspace.
- Evidence:
  - `ixplorer/src/widgets/DocumentPane.cpp`

## 2026-03-10 Ixplorer navigation icon strategy
- Decision: remove private-use font-glyph icons from core navigation surfaces and switch those surfaces back to standard Qt/system icons plus measured text overflow.
- Options considered:
  - Keep the current icon-font approach and try to harden the fallback font path.
  - Bundle a custom SVG/icon asset pack immediately.
  - Use Qt/system icons now for reliability, then revisit a custom asset language later if needed.
- Why chosen:
  - The current font-glyph path was the direct source of the broken square-box UI and tab/sidebar/breadcrumb instability.
  - Core navigation needs reliable symbols first; custom icon polish can come later without risking basic usability again.
- Evidence:
  - `ixplorer/src/widgets/AppSidebar.cpp`
  - `ixplorer/src/widgets/ExplorerToolbar.cpp`
  - `ixplorer/src/widgets/BreadcrumbBar.cpp`
  - `ixplorer/src/widgets/TabWorkspace.cpp`
  - `ixplorer/src/theme/ThemedFileIconProvider.cpp`

## 2026-03-10 Ixplorer host-failure behavior
- Decision: stop auto-launching external viewers immediately when a host attempt misses on the first pass; keep the tab in-app and fall back to preview/state where possible.
- Options considered:
  - Continue external fallback immediately on any host miss.
  - Keep the tab alive and use a preview/state fallback path for safe formats.
  - Block the UI in a long “connecting” state until hosting succeeds or times out.
- Why chosen:
  - Immediate external open made the app feel broken for many extensions and prevented the user from staying in the workspace.
  - A host-first, preview-second flow is closer to the intended product shape while still avoiding unsafe embeds.
- Evidence:
  - `ixplorer/src/widgets/DocumentPane.cpp`
  - `ixplorer/src/widgets/TabWorkspace.cpp`
  - `ixplorer/src/utils/FileOpenPolicy.cpp`

## 2026-03-10 Ixplorer host stabilization policy
- Decision: prioritize host stability over live chrome tint churn by throttling shell recoloring, avoiding repeated frame-change resizes, and tightening executable-aware window matching before any further UI polish.
- Options considered:
  - Keep the aggressive live backdrop sampling and full-shell restyling loop for maximum color sync.
  - Disable shell tone propagation entirely and keep the host pane isolated.
  - Keep tone propagation, but make it sparse and thresholded while reducing resize/style churn in the hosted window path.
- Why chosen:
  - The aggressive path was a likely source of the visible shaking/displacement behavior and made the app feel broken even when hosting technically succeeded.
  - Exact-window embedding is already a fragile integration surface; stability has to come before aesthetic responsiveness.
  - A slower, thresholded tone sync still preserves the “embedded content belongs here” goal without hammering the whole shell every few hundred milliseconds.
- Evidence:
  - `ixplorer/src/widgets/DocumentPane.cpp`
  - `ixplorer/src/app/MainWindow.cpp`
  - `ixplorer/src/widgets/TabWorkspace.cpp`

## 2026-03-11 Ixplorer Auto-search latency policy
- Decision: keep Ixplorer/CLI default search mode on Auto, but avoid eager semantic indexing unless lexical preflight fails to produce usable hits.
- Options considered:
  - Keep eager semantic indexing for every Auto search.
  - Disable semantic escalation entirely in Auto.
  - Use lexical preflight and only pay the semantic indexing cost when lexical confidence is weak.
- Why chosen:
  - The user’s complaint was real latency, not a lack of semantic capability.
  - Lexical preflight preserves the fast path while keeping semantic escalation available for weaker or ambiguous queries.
- Evidence:
  - `src/main.rs`
  - `reports/ixplorer_intelligence_integration_2026-03-11.md`

## 2026-03-11 Embedded-surface reliability policy
- Decision: prefer internal viewers for code/text, images, media, and web-like documents, and reserve associated-window hosting for the file types where native embedding still adds value.
- Options considered:
  - Keep hosting associated apps broadly for most file types.
  - Drop hosting entirely and rely only on internal previews/external launch.
  - Use internal viewers for the stable/common formats and keep foreign-window hosting as a narrower capability.
- Why chosen:
  - The broad hosting path was the direct source of many “embedded app was closed” failures and inconsistent behavior across extensions.
  - Internal viewers resize naturally, remove stray desktop chrome, and better satisfy the requirement that embedded content feels native inside Ixplorer.
- Evidence:
  - `ixplorer/src/utils/FileOpenPolicy.cpp`
  - `ixplorer/src/widgets/DocumentPane.cpp`
  - `reports/ixplorer_intelligence_integration_2026-03-11.md`

## 2026-03-11 Ixplorer intelligence ownership
- Decision: integrate activity/session/workstream/resumption ownership directly into `MainWindow` now instead of waiting for a larger architecture pass.
- Options considered:
  - Leave the intelligence files present on disk but unattached until a later shell refactor.
  - Build a separate controller layer before any runtime integration.
  - Wire the data layer into the current shell first, then refine architecture once runtime behavior is proven.
- Why chosen:
  - The user asked for working behavior, not just scaffolding.
  - `MainWindow` already owns the relevant cross-widget lifecycle, so it is the pragmatic place to attach activity logging, session persistence, and workstream switching without blocking on a larger refactor.
- Evidence:
  - `ixplorer/src/app/MainWindow.cpp`
  - `ixplorer/src/widgets/AppSidebar.cpp`
  - `ixplorer/src/widgets/TabWorkspace.cpp`

## 2026-03-12 Ixplorer embedded-window ownership policy
- Decision: enforce one hosted top-level foreign window per Ixplorer pane and reject/avoid recapturing already-hosted HWNDs.
- Options considered:
  - Allow recapture of any matching window title/process and reparent freely.
  - Force unique hosted-window ownership per pane and require fresh captures.
- Why chosen:
  - Reparenting the same external HWND across panes was the direct cause of grouped files, ghost outlines, and crash-prone reopen behavior.
  - Per-pane ownership gives deterministic lifecycle and prevents pane content theft.
- Evidence:
  - `ixplorer/src/widgets/DocumentPane.cpp`
  - `ixplorer/src/widgets/DocumentPane.h`

## 2026-03-12 File-open policy rollback from "embed everything"
- Decision: replace forced associated-window embedding for all extensions with a type-aware reliability-first classifier.
- Options considered:
  - Keep global force-embed behavior.
  - Fully abandon embedding and always external-open.
  - Use mixed strategy: in-app stable renderers + embedded associated apps for code/text + external-only denylist.
- Why chosen:
  - Global force-embed caused broad extension failures and unstable hosted-window behavior.
  - Mixed strategy keeps the intended embedded-editor experience while restoring predictable behavior across common file types.
- Evidence:
  - `ixplorer/src/utils/FileOpenPolicy.cpp`

## 2026-03-12 Pane navigation interaction policy
- Decision: allow pane dragging via tab bar only, with synchronized widget-stack reorder.
- Options considered:
  - Keep non-movable tabs.
  - Enable tab drag visuals only (without stack reorder).
  - Enable drag + synchronize actual pane stack indices.
- Why chosen:
  - User-requested pane drag from tab navigation is satisfied only if both tab order and backing content order move together.
- Evidence:
  - `ixplorer/src/widgets/TabWorkspace.cpp`
  - `ixplorer/src/widgets/TabWorkspace.h`

## 2026-03-12 Fallback-first pane policy for Ixplorer
- Decision: prioritize guaranteed in-app pane content over fragile cross-process embedding for common file classes.
- Options considered:
  - Keep associated-app embedding as the default for all editable types.
  - Disable associated-app embedding entirely.
  - Keep associated-app embedding as best-effort for edge formats, but default common formats to deterministic in-app renderers.
- Why chosen:
  - Runtime behavior showed repeated host-capture failure and dead panes; user-visible reliability was unacceptable.
  - Qt documents hard limitations for embedded foreign windows (stacking/focus/performance), and Win32 `SetParent` documents cross-process/DPI pitfalls.
- Evidence:
  - `ixplorer/src/utils/FileOpenPolicy.cpp`
  - `ixplorer/src/widgets/DocumentPane.cpp`
  - [Qt QWidget docs](https://doc.qt.io/qt-6.5/qwidget.html)
  - [Win32 SetParent docs](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setparent)

## 2026-03-12 CODEX visibility wiring decision
- Decision: treat feature surfacing bugs as functional incompleteness and wire Home/Today signals before additional visual polish.
- Options considered:
  - Keep current hidden/partial surfacing and focus only on host embedding.
  - Fix visibility wiring now (Today section hide bug, Home startup routing, dashboard signal bridging).
- Why chosen:
  - User feedback confirms perceived absence of features beyond workstreams.
  - Surfacing and interaction wiring is required for features to be considered implemented in practice.
- Evidence:
  - `ixplorer/src/widgets/AppSidebar.cpp`
  - `ixplorer/src/app/MainWindow.cpp`
  - `ixplorer/src/widgets/TabWorkspace.cpp`

## 2026-03-12 Hosted-app-first open policy (Ixplorer)
- Decision: default regular files back to associated-app embedding (hosted desktop UI) instead of internal renderers.
- Options considered:
  - Keep fallback-first in-app renderers for most types.
  - Host associated app by default with explicit external-only denylist.
- Why chosen:
  - User requirement is explicit: preserve exact external app/editor UI in pane, not a custom Ixplorer renderer.
  - Fallback-first solved dead panes but violated product intent and expected UX.
- Evidence:
  - `ixplorer/src/utils/FileOpenPolicy.cpp`
  - `ixplorer/src/widgets/DocumentPane.cpp`

## 2026-03-12 Hosted process ownership + app-specific launch args
- Decision: track ownership of launched hosted processes and use app-specific launch args for multi-pane reliability.
- Options considered:
  - Generic association command launch only.
  - Direct executable launch with known per-app flags and ownership tracking.
- Why chosen:
  - Generic association commands (notably Office/DDE paths) can produce file-open errors and ambiguous capture.
  - Ownership tracking prevents closing unrelated user windows and reduces cross-pane ghost/reuse issues.
- Evidence:
  - `ixplorer/src/widgets/DocumentPane.h`
  - `ixplorer/src/widgets/DocumentPane.cpp`

## 2026-03-12 Context panel de-clutter policy
- Decision: de-emphasize recovery/resume chrome and keep right rail useful in idle mode.
- Options considered:
  - Keep RECOVERY/CONTINUE framing and hide panel when no suggestion.
  - Use calmer framing + idle guidance action when not searching.
- Why chosen:
  - User feedback identified current framing as overwhelming and visually noisy.
  - Reduced attention cost while preserving access to recovery/resume actions.
- Evidence:
  - `ixplorer/src/widgets/IxosRail.cpp`
  - `ixplorer/resources/styles/ixplorer_dark.qss`
  - `ixplorer/src/data/TodaySection.cpp`

## 2026-03-12 Hosting strategy adjustment: less style mutation, more capture control
- Decision: stop aggressively rewriting hosted window styles on heartbeat/recovery and prioritize parent+geometry control with fast redraw.
- Why chosen:
  - User-observed failures (non-docx host close/not-embedded, bad size adaptation) are consistent with fragile cross-process style surgery.
  - Keeping native app styles closer to original preserves exact app UI intent and improves compatibility.
- Evidence:
  - `ixplorer/src/widgets/DocumentPane.cpp`

## 2026-03-12 Capture UX policy: hide-first during discovery
- Decision: proactively hide candidate windows while capture is still resolving.
- Why chosen:
  - User explicitly rejected visible top-level app flash before embedding.
  - Better to show loading state in pane than expose the temporary external window.
- Evidence:
  - `ixplorer/src/widgets/DocumentPane.cpp`

## 2026-03-13 Host detection policy update: PID-first tolerance for slow-title apps
- Decision: accept candidate windows when launched PID matches even if title match is late.
- Why chosen:
  - Many apps (Office/browser/UWP wrappers) do not expose final file-title immediately, causing strict title-gated capture to fail.
- Evidence:
  - `ixplorer/src/widgets/DocumentPane.cpp`

## 2026-03-13 UWP safety rule in style mutation
- Decision: skip WS_POPUP/WS_CHILD style rewriting for `ApplicationFrameWindow` candidates.
- Why chosen:
  - User reported instant close behavior on image host path consistent with UWP frame breakage when style-mutated.
- Evidence:
  - `ixplorer/src/widgets/DocumentPane.cpp`

- Decision: Bootstrap Ixplorer implementation governance in `CODEX.md` and treat it as the live source of truth for subsystem-level work tracking
- Options considered: Keep tracking split only across PLAN/RUNLOG; create ad-hoc per-feature notes; centralize subsystem execution status in CODEX + keep PLAN/RUNLOG/DECISIONS for experiment/state continuity
- Why chosen: The implementation scope is multi-part and long-running; subsystem grouping with explicit `DONE/PARTIAL/BLOCKED/TODO` prevents vague progress claims and keeps non-negotiables visible
- Evidence (links to /reports or output files): CODEX.md, reports/ixplorer_foundation_bootstrap_2026-03-13.md
- Risks: Tracker drift if not updated after each batch
- Follow-ups: Enforce updates to CODEX.md in every Ixplorer batch

- Decision: Fix Home restore behavior by checking full restored tab set for Home presence and persisting dashboard tabs in tab snapshots
- Options considered: Keep current `currentDashboard()` post-restore check; remove Home fallback entirely; include Home in capture/restore and only append fallback when missing
- Why chosen: Current behavior could append unnecessary Home tabs and steal focus; presence-based fallback with snapshot round-trip addresses root cause directly
- Evidence (links to /reports or output files): ixplorer/src/app/MainWindow.cpp, ixplorer/src/widgets/TabWorkspace.cpp, reports/ixplorer_foundation_bootstrap_2026-03-13.md
- Risks: Session migration edge cases for older snapshots
- Follow-ups: Add regression tests for mixed dashboard/document restore scenarios

- Decision: Wire rail "View Workstreams" CTA to open/focus Home dashboard immediately
- Options considered: Leave CTA inert; remove CTA; connect CTA to concrete shell navigation path
- Why chosen: Dead CTA harms trust; immediate actionable routing is required even before richer workstream management is implemented
- Evidence (links to /reports or output files): ixplorer/src/widgets/IxosRail.{h,cpp}, ixplorer/src/app/MainWindow.cpp, reports/ixplorer_foundation_bootstrap_2026-03-13.md
- Risks: Home dashboard is an interim action surface, not final dedicated workstream panel
- Follow-ups: Replace/augment with dedicated Workstreams view as `IXP-104` lands

- Decision: Replace session-only workstream grouping with decayed relation graph + incremental clustering in Ixplorer runtime
- Options considered: Keep fixed session slicing; add small heuristics only; implement weighted edge graph with temporal decay and cluster extraction
- Why chosen: The product requires workstreams as evolving task structure across files/folders/searches/actions, which needs edge scoring and cluster updates rather than static lists
- Evidence (links to /reports or output files): ixplorer/src/data/WorkstreamManager.{h,cpp}, reports/ixplorer_integration_batch_2026-03-13.md
- Risks: Cluster quality depends on event signal richness and thresholds
- Follow-ups: Add replay/eval harness and threshold tuning support

- Decision: Gate top-hit auto-open via witness + stability + risk budget instead of score-gap alone
- Options considered: Keep score-gap heuristic; disable auto-open entirely; add calibrated risk-aware gate with witness/stability telemetry
- Why chosen: Improves trust and reduces wrong-path auto-opens while preserving fast confident paths
- Evidence (links to /reports or output files): ixplorer/src/widgets/IxosRail.{h,cpp}, ixplorer/src/data/Orchestrator.{h,cpp}, reports/ixplorer_integration_batch_2026-03-13.md
- Risks: Conservative thresholds may suppress useful auto-open in some workflows
- Follow-ups: Add replay metrics and tune thresholds against task traces

- Decision: Expand resumption packet and predictive bundle schemas to include explanatory/context fields
- Options considered: Keep minimal path-only packets; add richer schema with timescale-aware scoring and explicit next actions
- Why chosen: Resumption quality and explainability are central product wedge; richer schema is required for reliable Today/bundle surfaces
- Evidence (links to /reports or output files): ixplorer/src/data/ResumptionEngine.{h,cpp}, ixplorer/src/data/BundlePredictor.{h,cpp}, reports/ixplorer_integration_batch_2026-03-13.md
- Risks: More fields increase UI complexity if not curated
- Follow-ups: add packet/bundle acceptance metrics and prune low-value fields if needed

## 2026-03-13 Sidebar Today reintegration decision
- Decision: re-enable Today/resumption as a live sidebar surface instead of leaving `setTodayPacket` disabled.
- Options considered:
  - Keep Today disabled in sidebar and rely only on Home/rail.
  - Re-enable Today in sidebar with direct resume/support path actions.
- Why chosen:
  - The product wedge is resumption + predictive bundles + workstreams; disabling Today in a primary navigation surface undercuts that wedge.
  - Sidebar Today now complements (not duplicates) Home and rail context.
- Evidence:
  - `ixplorer/src/widgets/AppSidebar.cpp`
  - `ixplorer/src/widgets/AppSidebar.h`
  - `ixplorer/resources/styles/ixplorer_dark.qss`

## 2026-03-13 Workstream replay metadata decision
- Decision: persist deterministic replay metadata with each workstream snapshot and surface it in the eval harness.
- Options considered:
  - Keep only workstream list JSON without rebuild provenance.
  - Persist graph/rebuild metadata and include in replay metrics reports.
- Why chosen:
  - Workstream clustering is temporal and incremental; replay/debug requires explicit signatures and source-event accounting.
  - This gives a low-cost deterministic trace baseline before heavier replay tooling.
- Evidence:
  - `ixplorer/src/data/WorkstreamManager.h`
  - `ixplorer/src/data/WorkstreamManager.cpp`
  - `scripts/ixplorer_eval.py`
  - `reports/ixplorer_eval_2026-03-13.md`
