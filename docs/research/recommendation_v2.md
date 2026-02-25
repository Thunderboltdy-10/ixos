# Recommendation V2: One Best Research Direction

Date: 2026-02-23  
Selected direction: **ODIP-RG** = Optional Delta Index Planner + Recall Guard (with conformal cascade and privacy-mode degradation).

## Best CS-style research question

Can a local-first, optional-index query planner that combines incremental filesystem state, progressive stage budgeting, and calibrated fallback guards reduce TTFR/Total tail latency while increasing opened-file-in-top-k success under strict privacy-mode constraints?

## Hypotheses and success thresholds

Baseline for thresholds: Flash v2 from `reports/PERF_BOTTLENECKS.md` (TTFR p95 68 ms, Total p95 315 ms).

- H1 (TTFR): ODIP-RG achieves **TTFR p95 <= 34 ms** (>=2x improvement).
- H2 (Total): ODIP-RG achieves **Total p95 <= 220 ms** (>=30% improvement).
- H3 (retrieval success): opened-file-in-top-k within 1s improves by **>=8 percentage points** and within 2s by **>=5 points** over current Ixos.
- H4 (quality safety): MRR@10 is non-inferior (drop <=1%) and Recall@10 is non-inferior (drop <=1%) vs current Ixos.
- H5 (privacy degradation): journalist/deep-search mode keeps deterministic zero-retention semantics and remains no worse than baseline latency by more than 5% on first query; multi-query sessions should still improve.

## Baselines

1. Current Ixos baseline:
- Existing pipeline (`walk -> ripgrep -> embed -> rank`) with current Auto refine logic.

2. Simplest strong heuristic baseline:
- Recency/workstream-root heuristic scope ordering + fixed lexical-consensus refine gate.
- No learned planner, no persistent delta index.

3. Proposed method (ODIP-RG):
- Optional watcher-fed delta index.
- Learned/cost-based stage-budget planner.
- Conformal refine/early-exit gate.
- Recall guard (low-rate global probe + automatic scope expansion on miss risk).
- Session-ephemeral index path in privacy modes.

## Systems mechanism (why this can exceed 30% + 2x)

- Remove work in multiple heavy stages simultaneously, not one stage only.
- Walk reduction: index-first + frontier fallback prevents full walk on p95 path.
- Scan reduction: index postings/prefilters narrow ripgrep fanout.
- Embed/rank reduction: conformal gate skips expensive refine when confidence is high.
- Recall guard prevents retrieval collapse from over-pruning.

Upper-bound grounded expectation from `docs/research/upper_bounds.md`:
- plausible range: **31-38% Total p95** gain under mixed workloads.
- TTFR p95 can reach **~2x** if p95 path keeps walk reduction >=50% (frontier fallback requirement).

## Novelty wording (safe)

Use this wording:
- "We did not find prior work combining optional local delta indexing, progressive stage-budget planning, and privacy-mode-safe degradation in one desktop local-search pipeline."
- "Our contribution is systems integration and empirical evidence under Ixos constraints, not a claim of novelty for indexing, Hawkes, or early-exit methods individually."

Avoid this wording:
- "first indexing system"
- "novel Hawkes search"
- "state-of-the-art retrieval algorithm"

## EE vs paper structure

### EE (4,000 words)

Include:
- Problem framing with measured bottlenecks and Amdahl bounds.
- Ixos constraints (local-first, progressive stream, privacy modes).
- Method architecture (ODIP-RG) with clear stage-by-stage mechanism.
- Experimental protocol and reproducibility commands.
- Core results table (latency + success + quality + privacy-mode behavior).
- Failure cases and rollback logic.
- Practical implications and limits.

### Paper version (adds beyond EE)

Add:
- Formal planner objective and constrained optimization details.
- Calibration and uncertainty methodology for early exit.
- Full ablations (component removal, stress/churn scenarios, privacy-mode variants).
- Statistical rigor (confidence intervals, significance tests, robustness checks).
- Extended related-work and novelty-audit appendix.
- Artifact appendix (query sets, environment controls, reproducibility checklist).

## 6-week research plan (no code details)

## Week 1: Ground truth and instrumentation lock
- Freeze baseline metrics and confirm measurement harness consistency.
- Define evaluation cohorts: cold/warm, churn level, query intent classes.
- Artifacts:
- `reports/research_v2_week1_baseline.md`
- `reports/research_v2_metric_contract.md`

## Week 2: ODIP-RG design spec and offline replay plan
- Finalize planner inputs, recall-guard rules, and privacy-mode degradation contract.
- Prepare offline replay dataset for plan selection.
- Artifacts:
- `docs/research/odip_rg_spec.md`
- `reports/research_v2_replay_protocol.md`

## Week 3: Pilot experiment (small scale)
- Run pilot A/B/C: baseline vs heuristic vs ODIP-RG on controlled corpora.
- Validate metric stability and identify failure modes.
- Artifacts:
- `reports/research_v2_pilot_results.md`
- `reports/research_v2_failure_catalog.md`

## Week 4: Full benchmark matrix
- Execute full benchmark and profiling matrix across datasets and modes.
- Capture stage-level deltas and success-under-time curves.
- Artifacts:
- `reports/research_v2_full_matrix.csv`
- `reports/research_v2_profile_breakdown.md`

## Week 5: Ablations and novelty defense
- Run ablations: remove planner, remove recall guard, remove conformal gate, remove optional index.
- Finalize closest-prior-art comparison with conservative claim language.
- Artifacts:
- `reports/research_v2_ablations.md`
- `docs/research/novelty_position_v2.md`

## Week 6: Final synthesis and publication package
- Produce final decision report with go/no-go thresholds.
- Prepare EE narrative and paper-expanded appendix materials.
- Artifacts:
- `reports/V2_FINAL_WRITEUP.md`
- `docs/research/ee_outline_v2.md`
- `docs/research/paper_outline_v2.md`

## Go/No-go decision rule

- GO if H1-H4 pass and privacy degradation is verified.
- CONDITIONAL GO if speed targets pass but retrieval success gains are below threshold and can be recovered by guard calibration.
- NO-GO if gains are mostly warm-cache artifacts or if privacy-mode behavior violates zero-retention requirements.
