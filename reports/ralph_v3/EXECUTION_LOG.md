
## SESSION START 2026-03-04 23:30:12 +01:00
- Loaded /CODEX.md and validated stop flag absence.
- Initialized ralph_v3 required files.

\n## PHASE 1 - ARTIFACT MANIFEST
- Time window: 2026-03-03 00:00 to 2026-03-04 08:00 Europe/Madrid
- Command: PowerShell equivalent of find newermt scan over full repo
- Touched files detected: 6406
- Full per-file manifest: ralph_v3/ARTIFACT_MANIFEST.csv
\n### Class Counts
- unknown/junk: 5732
- bench artifact: 319
- report: 159
- research note: 111
- results JSON: 79
- tests: 3
- architecture doc: 3
\n### Active/Dead Counts
- dead: 5732
- active: 674
\n### Top Roots
- (root): 6406
\n### Notes
- Generated build/dependency trees dominate this window; they are marked dead unless they are explicit result/report artifacts.
- Purpose/active judgments are heuristic and intended for shallow Phase 1 triage only.
\n## PHASE 1 - ARTIFACT MANIFEST (CORRECTED PATHS)
- Time window: 2026-03-03 00:00 to 2026-03-04 08:00 Europe/Madrid
- Touched files detected: 6406
- Full per-file manifest: ralph_v3/ARTIFACT_MANIFEST.csv
\n### Class Counts
- bench artifact: 2992
- unknown/junk: 2909
- report: 142
- pipeline code: 137
- research note: 98
- architecture doc: 64
- results JSON: 54
- tests: 10
\n### Active/Dead Counts
- dead: 5921
- active: 485
\n### Top Roots
- target: 2992
- ixos-site: 1948
- dataset: 873
- reports: 165
- src: 101
- docs: 62
- ui: 57
- scripts: 36
- bench: 35
- src-tauri: 29
- corpus_tiny: 27
- packages: 16
- old_docs: 15
- (root): 11
- tests: 7
- models: 7
- shared: 5
- .github: 4
- benches: 4
- corpus_medium: 3
\n### Notes
- Build/dependency artifacts dominate this window; classified as dead for shallow triage.
- Per-file purpose + active/dead values remain heuristic and will be refined only if promoted into active investigation.

## PHASE 2 - CURRENT SYSTEM TRUTH (2026-03-04 23:36:25 +01:00)

### Sources Read (Blind Scope)
- docs/flow-map.md
- docs/ARCHITECTURE_AUDIT_2026-02.md
- reports/innovation_sprint/failure_atlas/CASE_CARDS.md
- reports/innovation_sprint_vnext/atlas/CASE_CARDS.md
- reports/innovation/failure_suite/results_latest.md
- src/main.rs
- src/ixos_rank/mod.rs
- src/ixos_rank/progressive.rs
- src/ixos_rank/candidate_lexical.rs
- src/ixos_rank/candidate_generator/mod.rs
- src/ixos_rank/candidate_generator/path_engine.rs
- src/ixos_rank/candidate_generator/ripgrep_funnel.rs
- src/ixos_rank/candidate_generator/query_preprocess.rs
- src/ixos_rank/candidate_generator/metadata_priors.rs
- src/ixos_rank/semantic_engine.rs
- src/ixos_rank/secure_ranker.rs
- src/ixos_rank/ask_mode/intent_detector.rs
- src/ixos_rank/ask_mode/anchor_extractor.rs
- src-tauri/src/commands/search.rs
- ui/src/stores/searchStore.ts

### Pipeline Stages (Observed Reality)
1. UI sends searchProgressive with selected modelType, proModelType, searchMode, cache mode, and Ask hint (uto/off) (ui/src/stores/searchStore.ts, src-tauri/src/commands/search.rs).
2. Tauri command resolves entitlement and gates Pro/Ask availability (esolve_search_mode, sk_mode_active) and builds ProgressiveSearchConfig (src-tauri/src/commands/search.rs).
3. Lexical phase runs via CandidateLexicalEngine -> CandidateGenerator.generate_streaming: path scoring + capped ripgrep + optional document search + priors + optional Ask-anchor filtering + hard cap truncate (src/ixos_rank/candidate_lexical.rs, src/ixos_rank/candidate_generator/mod.rs).
4. Progressive engine emits lexical batches/results immediately, then semantic rerank via flash or pro primary depending on mode (src/ixos_rank/progressive.rs).
5. Fusion/refinement logic:
   - Pro mode: pro-primary then optional flash refinement + fusion.
   - Auto mode: flash-first publish, then optional Pro top-k refine by heuristic gate (should_refine).
6. Witness guard (if env IXOS_EXPERIMENT_WITNESS_GUARD enabled) can boost witness hits and penalize sensitive paths for non-sensitive queries.
7. Secure ranker computes final composite score (semantic + integrity + temporal + behavior + optional personal signals).
8. Evidence/snippet enrichment is deferred until after first semantic publish.

### Where Anchor Misses Can Happen
- Candidate generation truncation/hard caps (max_candidates, ripgrep timeout/hit caps) can remove true anchor before semantic stage.
- Path scoring tokenization may underweight anchors with punctuation/Unicode/format-specific patterns.
- Ask anchor filtering in candidate generation requires preview/snippet presence; candidates with no preview are dropped (ilter_by_anchors returns false on missing preview).
- Progressive Ask lexical filtering similarly removes lexical candidates by snippet anchor containment and falls back only when set is fully empty; partial false negatives can still survive.
- Semantic rerank limit (lexical_limit) and top-k refinement can exclude anchor documents if they never enter candidate set.
- Secure ranker and min-score filtering can prune weak-but-correct anchor results.

### Where Leaks Can Happen
- Sensitive-path handling is heuristic keyword-based (estricted/secret/private/confidential/credential/password) and not policy/ACL-based; files outside naming patterns can leak.
- Leak suppression in witness guard is conditional (env-flagged, non-sensitive query, sensitive paths in top window, no strong non-sensitive witness). If conditions miss, sensitive results can remain.
- Auto/flash path may publish semantic results before any later refinement suppresses sensitive outliers.
- UI serializes and displays whatever ranked paths are returned; no additional frontend redaction layer is applied.

### Where Flash vs Pro Diverges
- Model loading and primary engine choice: Flash mode always flash primary; Pro mode pro primary; Auto starts flash primary then optionally refines with pro top-k.
- Auto refine gate (should_refine) can skip pro refinement on high-confidence lexical/semantic signals, preserving flash ordering.
- Ask mode explicitly disables auto pro refinement path (processed.mode != QueryMode::Ask gate), which prevents silent Pro forcing in Ask.
- Eager indexing differs: Pro mode eagerly indexes Pro semantic engine; Auto often skips eager Pro index for latency.

### Known Failure Signals From Current Artifacts
- eports/innovation/failure_suite/results_latest.md still records Flash/Auto failures for esults streamed with anchor miss and sensitive leak in top-5, while Pro control passes.
- Newer atlas suites report full pass on broader synthetic card sets; this indicates residual regressions are likely corpus/query-distribution dependent rather than fully resolved globally.

### Immediate Bottleneck Hypotheses (for Divergence Input)
- Candidate recall bottleneck under hard caps and timeouted ripgrep.
- Heuristic sensitive-path suppression (name-based) instead of retrieval-time constraint system.
- Auto refinement gating may under-trigger on ambiguous but anchor-critical queries.
- Anchor filtering dependent on snippet availability rather than robust anchor evidence.
\n- Phase 5 search plan authored in ralph_v3/SEARCH_LOG.md (clustered by ARCH threat families).
- Ingested STREAM C evidence packet (31 sources) into SEARCH_LOG.md + SOURCES.md.
- Added manual stream B/D/E batch logs and 25 additional sources to SEARCH_LOG.md/SOURCES.md.
- Parallel stream execution encountered agent context limits; switched to documented manual time-slicing per CODEX fallback rule.
- Phase 6 novelty matrix completed for ARCH-01..ARCH-40 with explicit verdicts and prior-art mappings.
- BANLIST updated with grouped collapse decisions and closest-prior-art links for killed idea families.
- Phase 7 gatekeeper applied: all provisional survivors vetoed; zero survivors remain.
- Phase 8 reconciliation completed; added RECONCILIATION.md and merged historical citations/collapses into SOURCES/BANLIST.
- Phase 9 mini-batches executed for cycles 1-3; added CY-001..CY-012 sources.

## PHASE 9 PLATEAU TRACKING
- Cycle 1 survivor quality improvement: NONE (0 survivors).
- Cycle 2 survivor quality improvement: NONE (0 survivors).
- Cycle 3 survivor quality improvement: NONE (0 survivors).
- Plateau rule reached: 3 consecutive no-improvement cycles.
- Stop condition satisfied.
- Phase 10 skipped: no gatekeeper-approved survivors.
- FINAL_REPORT.md written with NO SURVIVORS outcome and plateau stop condition.
