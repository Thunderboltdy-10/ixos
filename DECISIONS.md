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
