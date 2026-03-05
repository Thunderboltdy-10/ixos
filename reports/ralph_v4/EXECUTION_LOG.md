# EXECUTION LOG

## Session Metadata
- Run ID: `ralph_v4_bootstrap_2026-03-05`
- Timezone: `Europe/Madrid`
- Started: `2026-03-05`
- Contract source: `/CODEX.md`
- Operating mode: continuous Ralph loop, anti-convergence, no premature stop

## Phase 0 - Resume + State Load

### Files loaded (required set)
- `/PLAN.md`
- `/RUNLOG.md`
- `/DECISIONS.md`
- `/reports/ralph_v3/TASK_QUEUE.md`
- `/reports/ralph_v3/FINAL_REPORT.md`
- `/reports/ralph_v3/BANLIST.md`
- `/reports/ralph_v3/SURVIVORS.md`
- `/reports/ralph_v3/FAILURES.md`

### V4 START STATE
- Control-plane baseline (latest snapshot in `PLAN.md` and innovation vNEXT):
  - AnchorTop1Hit@1 baseline flash: `0.80`
  - PlausibleWrong@k baseline flash: `0.1333`
  - SensitiveLeak@k baseline flash: `0.0`
  - Latency baseline flash p50/p95: `633.57 / 762.57 ms`
- Best trust point observed in prior sprint (not ship-safe):
  - `risk_budget_v1` with AnchorTop1Hit@1 `1.00`, PlausibleWrong@k `0.0333`, p95 `1725.16 ms`
- Best speed-trust compromise from prior sprint:
  - `risk_budget_v2 budget25` with AnchorTop1Hit@1 `0.88`, PlausibleWrong@k `0.1067`, p95 `1439.39 ms`
- Ralph v3 terminal state:
  - `NO SURVIVORS`
  - plateau triggered at 3 cycles
  - `72` sources, `21` search batches
  - banlist dominated by policy-gating, constrained top-k variants, cascade/routing, filtered ANN + access-control, secure retrieval overclaims

### v4 hard-budget tracker at bootstrap
- Macro-cycles completed: `0 / 12 minimum`
- Sources logged: `0 / 250 minimum`
- Search batches logged: `0 / 60 minimum`
- Wall-clock elapsed: `~0h / 8h minimum`
- Distinct novelty neighborhoods explored: `0 / 8 minimum`
- Reconciliation passes completed: `0 / 2 minimum`

## Phase 1 - Blind Current-System Truth (code + current artifacts only)

### Where anchor misses can happen
1. Candidate-generation hard caps and early exits can hide anchor-bearing files before semantic rerank:
   - `MAX_CANDIDATES_FOR_EMBEDDING = 3000` (`src/ixos_rank/candidate_generator/mod.rs:72`)
   - `RIPGREP_MAX_HITS = 5000`, `RIPGREP_TIMEOUT_MS = 300` (`src/ixos_rank/candidate_generator/ripgrep_funnel.rs:19-20`)
   - timeout / hit-cap early return in ripgrep funnel (`ripgrep_funnel.rs:167,180,237,250,378,391`)
2. Ask-mode anchor filter can over-prune when snippets/previews are missing:
   - `filter_by_anchors` requires preview/snippet; missing preview returns false (`candidate_generator/mod.rs:530-548`)
3. Progressive lexical phase has timeout fallback to empty lexical set, forcing semantic fallback path (`progressive.rs` lexical timeout path in `search_progressive`).
4. Pure semantic fallback is itself capped by candidate limits in `search_pure` (`semantic_engine.rs:812-819`), so lexical miss + cap can still miss anchors.
5. Auto-mode Pro refine under-trigger risk:
   - short queries require 4 uncertainty signals to refine (`progressive.rs:1569-1575`), which can under-trigger on ambiguous anchor-critical short queries.

### Where leaks can happen
1. Sensitive suppression is heuristic keyword/path based, not formal policy isolation:
   - query sensitive term list (`progressive.rs:1754-1767`)
   - path sensitive term list (`progressive.rs:1769-1782`)
2. Witness guard is environment-flag gated, not always-on:
   - `IXOS_EXPERIMENT_WITNESS_GUARD` gate (`progressive.rs:1657-1666`)
3. Lexical results are streamed before deeper semantic/evidence checks:
   - early `SearchEvent::LexicalResults` emission (`progressive.rs:597`)
   - leakage risk exists if restricted paths appear in lexical top window for benign queries.
4. Current leak checks in atlas prove `SensitiveLeak@k=0.0` on `corpus_tiny`, but do not prove robustness on large real corpora or non-keyword sensitive patterns.

### Where Flash vs Pro diverges
1. Entitlement and mode resolution in Tauri command:
   - Auto downgraded to Flash when Pro unavailable (`src-tauri/src/commands/search.rs:424-434`, tests at `787-842`)
2. Ask-mode interaction with Pro loading:
   - `use_pro = Pro || (Auto && !ask_mode_enabled)` (`search.rs:597-598`)
3. Auto path is Flash-first with optional Pro top-k refine only if heuristic says refine (`progressive.rs:922` onward).
4. Pro mode is Pro-primary and may run Flash secondary refine/fusion (`progressive.rs:820-900`).

### What current tests/artifacts prove
- `search_mode` gating behavior is explicitly tested (`src-tauri/src/commands/search.rs` tests).
- Ask mode does not silently force Pro path in progressive unit tests (`progressive.rs` test `test_ask_mode_respects_selected_model`).
- Atlas baseline/current show:
  - AnchorHit@k `1.0`
  - AnchorTop1Hit@1 `0.8`
  - SensitiveLeak@k `0.0`
  - PlausibleWrong@k `0.1333`
  - baseline p50/p95 around `633.57/762.57 ms`, latest around `642.08/816.49 ms`
  - sources: `reports/innovation_sprint_vnext/atlas/results_baseline_flash.md`, `results_latest.md`

### What current tests/artifacts do NOT prove
- No proof of anchor-top1 robustness on real large corpora under ripgrep timeout/cap pressure.
- No formal guarantee against benign-query leakage beyond heuristic terms and tiny-suite exclusions.
- Settings-matrix evidence shows non-progressive combinations still producing empty results in multiple combos (`reports/innovation_sprint_vnext/01_BASELINE.md`).
- Native-cache mixed-run top1 instability (`23/40 unstable queries`) indicates unresolved ranking variance under realistic cache states.

## Phase status
- Phase 0: COMPLETE
- Phase 1: COMPLETE (initial blind map)
- Phase 2: IN PROGRESS (ARCH-A batch)
- Phase 3: IN PROGRESS (ARCH-B batch)
- Phase 4+: STARTED (initial saturation batches logged)

## Macro-Cycle 2 Start (2026-03-05)

### STEP 1 - BIAS RESET
- Over-focus risk:
  1. treating constrained-ranking mathematics as novelty by rephrasing old optimization forms,
  2. over-indexing on SAT/proof ideas that may be elegant but operationally expensive,
  3. assuming stream-stage semantics are novel without checking stream-IR/database literature.
- BANLIST categories to avoid unless hard differentiator appears:
  - policy/authorization retrieval framing,
  - generic cascade/routing uncertainty policies,
  - filtered ANN + access-control packaging,
  - proof-carrying overclaims without cost model.
- Underexplored adjacent fields:
  - stream consistency/serializability protocols,
  - provenance semirings and factorized explanation systems,
  - model-checking/runtime verification for ranking contracts,
  - regret-bounded safe control in online decision systems,
  - constraint explanation in database query optimizers.
- Potential misleading assumptions to challenge:
  - assumption that displacement contracts are absent in IR (may already exist under monotonic ranking terms),
  - assumption that unsat-core extraction is too expensive at top-k scale,
  - assumption that trust-delta commit semantics are unique to Ixos-like streaming.

### STEP 2 - INNOVATION SPARK (5+ methods)
1. Inversion: what if semantic phase is provisional and lexical anchors are the commit baseline, not vice versa?
2. First-principles decomposition: ranking = candidate generation + evidence validity + ordering commit; novelty may live in commit contracts, not scoring.
3. Transfer from adjacent fields: borrow serializable transaction commit/rollback invariants for stage transitions.
4. Failure-driven design: anchor misses mostly happen before semantic scoring; target pre-rerank candidate admission and post-rerank bounded repair.
5. Theorem hunt: seek formal displacement bound theorem for hybrid rank transitions with bounded regret.
6. Bottleneck reframing: p95 risk comes from extra model calls; favor algebraic/list-level validators over extra embedding passes.
7. Trust/safety reframing: leakage and anchor correctness as a single satisfiability object over top-k.
8. User mental-model reframing: user expects deterministic exact hits to persist; novelty candidate should preserve this mental contract explicitly.
9. Conflict/explanation reframing: unsat-core may be valuable as a debugging/explanation object even if not used every query.
10. Broad-X reframing: “commit-consistent retrieval protocols” might generalize beyond desktop local search.

### STEP 3 - Cycle 2 novelty neighborhoods
- N1: lexical->semantic displacement guarantees with bounded repair
- N2: stream-stage trust-delta commit protocols (semantic/refine publish contract)
- N3: retrieval-time constraint conflict explanation (unsat-core/MUS at top-k)
- N4 (outside prior center): serializability/runtime verification analogs for streamed ranking transitions

## Macro-Cycle 2 / Sub-Round 1 / Chunk B complete (bounded research flush)
- Status: COMPLETE
- Focus neighborhoods: N1 displacement guarantees, N3 constraint conflict explanation
- Budgets respected exactly:
  - searches=12, opened pages=4, extracted sources=12
- Appended artifacts:
  - eports/ralph_v4/SEARCH_LOG.md (Batch W8)
  - eports/ralph_v4/SOURCES.md (W-028..W-039)
- Immediate next step: Chunk C prosecutor pass over ARCH-A01, ARCH-A04, ARCH-B11, CY2-R1-ARCH-01..08.

## Macro-Cycle 2 / Sub-Round 1 / Chunk C complete (prosecutor flush)
- Touched ideas prosecuted: ARCH-A01, ARCH-A04, ARCH-B11, CY2-R1-ARCH-01..08
- New candidate count this chunk: 8
- Prosecutor outcomes:
  - NOT_NOVEL: 2
  - INCREMENTAL: 6
  - UNCLEAR: 3 (A01, A04, B11)
  - POSSIBLY_NOVEL: 0
- Append-only ledgers updated:
  - IDEA_POOL.md
  - NOVELTY_MATRIX.md
  - BANLIST.md
  - FAILURES.md
  - SURVIVORS.md
- Immediate next step: Chunk D gatekeeper pass + next deterministic query pack in TASK_QUEUE.

## Macro-Cycle 2 / Sub-Round 1 / Chunk D complete (gatekeeper + state + handoff)
- Gatekeeper outcomes applied for touched candidates.
- Macro-Cycle 2 closed as counted lightweight cycle.
- Next action pointer written to TASK_QUEUE for crash-safe deterministic continuation.

## Macro-Cycle 3 Start

### Sub-Round 1 / Chunk A - Bias reset + spark + neighborhoods
- Over-focus risks right now:
  1. over-indexing on formal guarantee language without admission-stage fixes,
  2. turning explanation objects into novelty claims,
  3. ignoring cheap pre-publish leak controls because they feel "incremental".
- BANLIST categories to avoid repeating:
  - constrained ranking repackaging,
  - provenance-only explanation novelty claims,
  - stream commit semantics without hard differentiator.
- Underexplored adjacent fields:
  - anytime algorithms under truncation,
  - early termination correctness in IR systems,
  - stream verifier contracts from event systems.
- Assumptions to challenge:
  - assumption that candidate truncation is unavoidable quality loss,
  - assumption that early lexical publish cannot be safety-verified cheaply.

#### Innovation spark set (>=5 methods)
1. Inversion: delay semantic confidence until lexical safety gate passes rather than publish-first suppress-later.
2. First principles: anchor miss is primarily an admission error, not a scorer error.
3. Failure-driven design: treat ripgrep timeout/cap as a first-class adversary with explicit continuity objective.
4. Systems bottleneck reframing: no new model calls; optimize candidate carry-forward state under strict caps.
5. Trust/safety reframing: lexical pre-publish verifier as cheap invariant checker, not policy engine.
6. Transfer: borrow early-termination correctness bounds from top-k query processing.

#### Neighborhoods selected for Cycle 3 SR1
- N5: continuity-aware candidate generation under hard caps/timeouts.
- N6: leak-safe pre-publish verifier contract for lexical streaming.

## Macro-Cycle 3 / Sub-Round 1 / Chunk B complete (bounded research flush)
- Status: COMPLETE
- Focus neighborhoods: `N5 continuity-aware candidate generation`, `N6 pre-publish safety verifier`
- Budgets respected exactly:
  - searches=`12`, opened pages=`4`, extracted sources=`12`
- Appended artifacts:
  - `reports/ralph_v4/SEARCH_LOG.md` (Batch W9)
  - `reports/ralph_v4/SOURCES.md` (W-040..W-051)
- Immediate next step: Chunk C prosecutor pass on `CY3-R1-ARCH-01..08` + active survivors pressure test.

## Macro-Cycle 3 / Sub-Round 1 / Chunk C complete (prosecutor flush)
- Touched ideas prosecuted: `ARCH-A01`, `ARCH-A04`, `CY3-R1-ARCH-01..08`
- New candidate count this chunk: `8`
- Prosecutor outcomes:
  - `NOT_NOVEL`: 1
  - `INCREMENTAL`: 7 (including `ARCH-A01`)
  - `UNCLEAR`: 2 (`ARCH-A04`, `CY3-R1-ARCH-04`)
  - `POSSIBLY_NOVEL`: 0
- Append-only ledgers updated: IDEA_POOL, NOVELTY_MATRIX, BANLIST, FAILURES, SURVIVORS.
- Immediate next step: Chunk D gatekeeper closeout and next cycle pointer.

## Macro-Cycle 3 / Sub-Round 1 / Chunk D complete (gatekeeper + state + handoff)
- Gatekeeper outcomes applied; Cycle 3 closed as counted lightweight macro-cycle.
- Active survivor board pivoted from A01 to CY3-R1-ARCH-04.
- Next action pointer written to TASK_QUEUE.

## Macro-Cycle 4 Start

### Sub-Round 1 / Chunk A - Bias reset + spark + neighborhoods
- Over-focus risks right now:
  1. equating any conflict explanation with novelty,
  2. solver-heavy thinking despite strict p95 constraints,
  3. neglecting benign-intent leak control at first publish boundary.
- BANLIST categories to avoid repeating:
  - generic top-k approximation guarantees,
  - policy-filtering repackaging,
  - proof/explain wrappers over existing engines.
- Underexplored adjacent fields:
  - approximation algorithms for conflict sets,
  - CEGAR-style refinement for constraints,
  - safety invariants for streaming outputs.
- Assumptions to challenge:
  - assumption that conflict cores require SAT/MILP on hot path,
  - assumption that leak checks must be semantic-model heavy.

#### Innovation spark set (>=5 methods)
1. Inversion: explain conflicts first, solve them later; hot path only needs compact conflict sketches.
2. First principles: leak risk at first publish can be reduced with static/path evidence before semantic scoring.
3. Transfer: adopt CEGAR-style coarse-to-fine conflict refinement from formal verification.
4. Failure-driven: prioritize lexical pre-publish leaks and anchor suppression collisions.
5. Bottleneck reframing: favor deterministic bitset/index operations over query-time optimization.
6. Trust reframing: return machine-checkable contradiction snippets for debugging without runtime solver.

#### Neighborhoods selected for Cycle 4 SR1
- N7: conflict-sketch explanation (solver-light alternatives to unsat cores).
- N8: benign-intent leak prevention before first publish.

## Macro-Cycle 4 / Sub-Round 1 / Chunk B complete (bounded research flush)
- Status: COMPLETE
- Focus neighborhoods: `N7 conflict-sketch explanation`, `N8 first-publish leak prevention`
- Budgets respected exactly:
  - searches=`12`, opened pages=`4`, extracted sources=`12`
- Appended artifacts:
  - `reports/ralph_v4/SEARCH_LOG.md` (Batch W10)
  - `reports/ralph_v4/SOURCES.md` (W-052..W-063)
- Immediate next step: Chunk C prosecutor pass on `CY4-R1-ARCH-01..08`.

## Macro-Cycle 4 / Sub-Round 1 / Chunk C complete (prosecutor flush)
- Touched ideas prosecuted: `ARCH-A04`, `CY4-R1-ARCH-01..08`
- New candidate count this chunk: `8`
- Prosecutor outcomes:
  - `NOT_NOVEL`: 1
  - `INCREMENTAL`: 7 (including `ARCH-A04`)
  - `UNCLEAR`: 2 (`CY3-R1-ARCH-04`, `CY4-R1-ARCH-05` active)
  - `POSSIBLY_NOVEL`: 0
- Immediate next step: Chunk D gatekeeper closeout and cycle handoff.

## Macro-Cycle 4 / Sub-Round 1 / Chunk D complete (gatekeeper + state + handoff)
- Gatekeeper outcomes applied and Cycle 4 closed as counted lightweight macro-cycle.
- Survivor board now centered on admission-loss debt and first-publish FP-sensitive guard ideas.
- Next action pointer written to TASK_QUEUE.

## Macro-Cycle 5 Start

### Sub-Round 1 / Chunk A - Bias reset + spark + neighborhoods
- Over-focus risks right now:
  1. repeatedly reframing admission control without concrete differentiator,
  2. importing ANN recall theory too directly into lexical+semantic progressive flow,
  3. under-testing pruning-induced anchor loss mechanisms.
- BANLIST categories to avoid repeating:
  - generic approximation guarantees,
  - policy-filter wrappers,
  - explainability composition over existing APIs.
- Underexplored adjacent fields:
  - interruptible/anytime top-k with hard budgets,
  - dynamic pruning correctness envelopes,
  - error-correction analogs for missed candidate recovery.
- Assumptions to challenge:
  - assumption that pruning guarantees transfer unchanged to anchor-heavy workloads,
  - assumption that budgeted recall cannot be made deterministic enough for Ixos constraints.

#### Innovation spark set (>=5 methods)
1. Inversion: treat timeout as a signal to launch deterministic recovery micro-pass, not hard failure.
2. First principles: admission loss is an information-loss channel; use lightweight error-correction analogs.
3. Transfer: borrow heavy-hitter sketch guarantees for candidate class preservation.
4. Bottleneck reframing: dynamic pruning should emit confidence metadata for missing-anchor risk.
5. Failure-driven: focus on queries where exact anchor is missing but semantically close neighbors survive.
6. Theorem hunt: look for recall lower-bound contracts under bounded early termination.

#### Neighborhoods selected for Cycle 5 SR1
- N9: budgeted-recall admission control under hard timeouts.
- N10: dynamic pruning guarantees vs anchor recall.

## Macro-Cycle 5 / Sub-Round 1 / Chunk B complete (bounded research flush)
- Status: COMPLETE
- Focus neighborhoods: `N9 budgeted-recall admission control`, `N10 dynamic pruning guarantees`
- Budgets respected exactly:
  - searches=`12`, opened pages=`4`, extracted sources=`12`
- Appended artifacts:
  - `reports/ralph_v4/SEARCH_LOG.md` (Batch W11)
  - `reports/ralph_v4/SOURCES.md` (W-064..W-075)
- Immediate next step: Chunk C prosecutor pass on `CY5-R1-ARCH-01..08`.

## Macro-Cycle 5 / Sub-Round 1 / Chunk C complete (prosecutor flush)
- Touched ideas prosecuted: `CY3-R1-ARCH-04`, `CY4-R1-ARCH-05`, `CY5-R1-ARCH-01..08`
- New candidate count this chunk: `8`
- Prosecutor outcomes:
  - `NOT_NOVEL`: 0
  - `INCREMENTAL`: 9
  - `UNCLEAR`: 1 (`CY4-R1-ARCH-05`)
  - `POSSIBLY_NOVEL`: 0
- Immediate next step: Chunk D gatekeeper closeout and Cycle 5 handoff.

## Macro-Cycle 5 / Sub-Round 1 / Chunk D complete (gatekeeper + state + handoff)
- Gatekeeper outcomes applied and Cycle 5 closed as counted lightweight macro-cycle.
- Requested threshold reached: at least 5 counted cycles completed tonight.
- Execution loop remains active; next cycle pointer written to TASK_QUEUE.

## Macro-Cycle 6 Start

### Sub-Round 1 / Chunk A - Bias reset + spark + neighborhoods
- Over-focus risks:
  1. recasting explanation UX as novelty without mechanism,
  2. overfitting to one remaining UNCLEAR survivor,
  3. neglecting contradiction-aware rewrite evidence.
- BANLIST focus: no return to generic dynamic pruning or policy wrappers.
- Selected neighborhoods:
  - N11 contradiction-aware query rewrite triggers (anchor-protective)
  - N12 explanation-object protocols for trust debugging
- Next step: execute Cycle 6 Chunk B query pack from TASK_QUEUE under strict 12/4/12 web budget.
