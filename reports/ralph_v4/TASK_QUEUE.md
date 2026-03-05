# TASK QUEUE

## Contract
- Source: `/CODEX.md`
- Mode: Ralph v4 continuous run
- Stop policy: plateau stop forbidden until hard minimum budget is satisfied

## V4 START STATE
- Imported baseline from `PLAN.md` and `reports/innovation_sprint_vnext`:
  - AnchorTop1Hit@1: `0.80`
  - PlausibleWrong@k: `0.1333`
  - SensitiveLeak@k: `0.0`
  - Baseline latency p50/p95: `633.57 / 762.57 ms`
- Imported v3 terminal status from `reports/ralph_v3/FINAL_REPORT.md`:
  - `NO SURVIVORS`
  - sources=`72`, batches=`21`, plateau=`3 no-improvement cycles`
- Imported hostile ground from v3 banlist:
  - policy-gated retrieval
  - constrained/rule top-k variants
  - cascade/routing uncertainty families
  - filtered ANN + access-control claims
  - generic secure retrieval novelty overclaims

## Hard-budget tracker (live)
- Macro-cycles: `0 / 12 min`
- Sources: `0 / 250 min`
- Search batches: `0 / 60 min`
- Elapsed wall-clock: `~0h / 8h min`
- Novelty neighborhoods: `0 / 8 min`
- Reconciliation passes: `0 / 2 min`

## Phase checklist
- [x] Phase 0: Resume + state load complete.
- [x] Phase 1: Blind current-system truth complete.
- [x] Phase 2: Divergence batch A drafted (`ARCH-A01..ARCH-A20`).
- [x] Phase 3: Divergence batch B drafted (`ARCH-B01..ARCH-B20`).
- [x] Phase 4: Initial saturation batches started.
- [x] Phase 5: Initial prosecutor pass executed.
- [x] Phase 6: Initial gatekeeper pass executed.
- [x] Phase 7: Reconciliation pass 1 complete.
- [x] Phase 8: Macro-cycle logging started.
- [ ] Phase 9+: Continue macro-cycles until hard budget gates are satisfied.
- [ ] Prototype/harness work only after survivor earns it.

## Active stream ledger (max 6)
- Stream A (Scholar Hunter): ACTIVE
- Stream B (Systems Hunter): ACTIVE
- Stream C (Security/Leak Hunter): ACTIVE
- Stream D (Product/Production Hunter): ACTIVE
- Stream E (Prior Ralph Archaeologist): ACTIVE
- Stream F (Prosecutor): ACTIVE

## Immediate next 10 actions
1. Expand web saturation to 30+ batches with adversarial prior-art queries.
2. Grow source table toward 250 entries with threat mapping per ARCH ID.
3. Run prosecutor pass on every remaining `UNCLEAR/POSSIBLY NOVEL` candidate.
4. Run gatekeeper pass for complexity/p95 risk on survivors.
5. Start macro-cycle 2 with a fresh bias reset and 8-15 new ARCH-C candidates.
6. Add reconciliation pass 2 against `reports/innovation*` and `reports/ralph*`.
7. Keep BANLIST updated immediately upon each collapse.
8. Keep NOVELTY_MATRIX synchronized after each batch.
9. Do not start prototype unless a candidate survives prosecutor + gatekeeper.
10. Keep FINAL_REPORT in running state only (no early stop language).

## RUN POINTER UPDATE (after Cycle 2 close)
- Current counted macro-cycles: `2`
- Current source count (v4): `51`
- Current search batch count (v4): `9`
- Next exact chunk: `Macro-Cycle 3 / Sub-Round 1 / Chunk A`
- Next neighborhoods (1-2 max for Chunk A selection):
  1. `N5 continuity-aware candidate generation under ripgrep caps/timeouts`
  2. `N6 leak-safe pre-publish verifier contract for lexical streaming`
- Next web query pack for Chunk B (max 12):
  1. `candidate generation continuity guarantees retrieval`
  2. `anytime retrieval candidate truncation regret bounds`
  3. `ripgrep timeout search recall tradeoff`
  4. `progressive retrieval early publish safety`
  5. `streaming search pre-publish verifier`
  6. `lexical stage leakage prevention retrieval`
  7. `top-k under truncation guarantees`
  8. `safe early results information retrieval`
  9. `incremental search result verification`
  10. `Elasticsearch search_after consistency guarantees`
  11. `Lucene early termination accuracy tradeoff`
  12. `OpenSearch hybrid early result controls`

## RUN POINTER UPDATE (after Cycle 3 close)
- Current counted macro-cycles: `3`
- Current source count (v4): `63`
- Current search batch count (v4): `10`
- Next exact chunk: `Macro-Cycle 4 / Sub-Round 1 / Chunk A`
- Next neighborhoods (1-2 max for Chunk A selection):
  1. `N7 conflict-sketch explanation (solver-light alternatives to unsat cores)`
  2. `N8 benign-intent leak prevention before first publish`
- Next web query pack for Chunk B (max 12):
  1. `approximate unsat core extraction streaming constraints`
  2. `conflict sketch explanation constraints`
  3. `minimal conflict set approximation algorithms`
  4. `counterexample-guided abstraction ranking constraints`
  5. `benign query sensitive leak prevention retrieval`
  6. `retrieval-time suppression with explicit intent recovery`
  7. `pre-publish safety checks search streaming`
  8. `false positive mitigation sensitive filtering retrieval`
  9. `Elasticsearch query rules pinned demotion`
  10. `Vespa query profile filtering security`
  11. `Weaviate hybrid filter explain`
  12. `Amazon Kendra result filtering access control`

## RUN POINTER UPDATE (after Cycle 4 close)
- Current counted macro-cycles: `4`
- Current source count (v4): `75`
- Current search batch count (v4): `11`
- Next exact chunk: `Macro-Cycle 5 / Sub-Round 1 / Chunk A`
- Next neighborhoods (1-2 max for Chunk A selection):
  1. `N9 budgeted-recall admission control under hard timeouts`
  2. `N10 dynamic pruning guarantees vs anchor recall`
- Next web query pack for Chunk B (max 12):
  1. `approximate nearest neighbor recall guarantees under budget`
  2. `anytime top-k interruptible guarantees`
  3. `admission control algorithms search systems`
  4. `lossy channel error correction retrieval candidates`
  5. `streaming heavy hitters recall guarantees`
  6. `retrieval under timeout resilience methods`
  7. `query-time budgeted recall optimization`
  8. `dynamic pruning impact on recall top-k`
  9. `Lucene block max WAND early termination`
  10. `Elasticsearch block max WAND`
  11. `Vespa weakAnd recall`
  12. `OpenSearch dynamic pruning BM25`

## RUN POINTER UPDATE (after Cycle 5 close)
- Current counted macro-cycles: `5`
- Current source count (v4): `87`
- Current search batch count (v4): `12`
- Next exact chunk: `Macro-Cycle 6 / Sub-Round 1 / Chunk A`
- Next neighborhoods (1-2 max for Chunk A selection):
  1. `N11 contradiction-aware query rewrite triggers (anchor-protective)`
  2. `N12 explanation-object protocols for user-visible trust debugging`
- Next web query pack for Chunk B (max 12):
  1. `query performance prediction rewrite triggers retrieval`
  2. `anchor-aware query rewriting information retrieval`
  3. `counterfactual explanations ranking systems retrieval`
  4. `why this result not that result search interface formal`
  5. `explanation objects for search ranking`
  6. `diagnostic telemetry for retrieval pipelines`
  7. `progressive search UI consistency trust`
  8. `streamed result retraction user perception`
  9. `Elasticsearch explain API ranking`
  10. `Lucene Explanation class ranking`
  11. `Vespa query tracing ranking`
  12. `OpenSearch profile API search`
