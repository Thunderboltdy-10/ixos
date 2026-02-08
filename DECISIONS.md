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
