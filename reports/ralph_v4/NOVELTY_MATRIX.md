# NOVELTY MATRIX

Legend:
- Prosecutor verdict: `NOT_NOVEL`, `INCREMENTAL`, `UNCLEAR`, `POSSIBLY_NOVEL`
- Gatekeeper verdict: `VETO`, `HOLD`, `KEEP_FOR_RESEARCH`

| ARCH ID | Prosecutor | Gatekeeper | Rationale (short) | Evidence |
|---|---|---|---|---|
| ARCH-A01 | POSSIBLY_NOVEL | KEEP_FOR_RESEARCH | Explicit lexical->semantic displacement bound/certificate not yet directly matched in product docs. | L-004 L-006 W-001 W-002 W-022 |
| ARCH-A02 | INCREMENTAL | VETO | Slot/constraint ranking is mature (slot-constrained + constrained ranking papers). | W-006 W-007 |
| ARCH-A03 | UNCLEAR | HOLD | Witness-triggered lexical rescue not clearly found in identical form; may still be variant of selective rerank. | L-006 W-003 W-004 |
| ARCH-A04 | UNCLEAR | KEEP_FOR_RESEARCH | Unsat-core foundations exist, but retrieval-time anchor+leak conflict integration remains unclear. | W-016 W-017 |
| ARCH-A05 | INCREMENTAL | VETO | Bounded demotion aligns with known constrained ranking patterns. | W-001 W-007 |
| ARCH-A06 | INCREMENTAL | VETO | Proof/certificate carrying retrieval already well explored; overhead risk high. | W-009 W-010 W-011 W-012 |
| ARCH-A07 | UNCLEAR | VETO | Geometry-based suppression is active prior art; calibration brittleness and recall risk high. | W-013 W-014 W-015 W-021 |
| ARCH-A08 | INCREMENTAL | VETO | Reversible geometric suppression closely overlaps existing privacy-transform lines. | W-013 W-014 W-015 |
| ARCH-A09 | UNCLEAR | VETO | Transactional rollback analogy plausible but close to continual top-k maintenance; state complexity high. | W-020 W-019 |
| ARCH-A10 | INCREMENTAL | VETO | Rank-delta monotonic update constraints overlap existing ranked enumeration/repair patterns. | W-019 W-005 |
| ARCH-A11 | NOT_NOVEL | VETO | Constrained top-k repair/query refinement already explicit prior art. | W-004 W-005 W-018 |
| ARCH-A12 | INCREMENTAL | VETO | Selective probing/refine under uncertainty is established. | W-003 W-004 |
| ARCH-A13 | INCREMENTAL | VETO | Confidence-bound refinement controller overlaps prior anytime/selective retrieval methods. | W-003 W-008 |
| ARCH-A14 | INCREMENTAL | VETO | Online perturbation stability checks likely robustness variant rather than new architecture. | W-003 |
| ARCH-A15 | INCREMENTAL | VETO | Failure-memory negative constraints map to known hard-negative/rule-based reranking. | W-002 W-007 |
| ARCH-A16 | INCREMENTAL | VETO | Counterfactual top-k repair resembles Why-Not-Yet style repair classes. | W-005 W-018 |
| ARCH-A17 | INCREMENTAL | VETO | Trust-regularized constrained objective falls inside constrained ranking literature. | W-007 W-008 |
| ARCH-A18 | INCREMENTAL | VETO | Evidence-density gating resembles known grounded/evidence rerank heuristics. | W-002 W-003 |
| ARCH-A19 | INCREMENTAL | VETO | Path-risk heuristic suppression is standard safety-layer pattern. | W-021 W-024 W-026 |
| ARCH-A20 | NOT_NOVEL | VETO | Latency-budgeted constrained selection is classic constrained optimization/routing family. | W-004 W-007 W-008 |
| ARCH-B01 | UNCLEAR | HOLD | Hard dual-clause contribution contract not yet directly matched; may collapse to constrained ranking. | W-002 W-007 |
| ARCH-B02 | NOT_NOVEL | VETO | Intent/policy matrix gating is mature in ABAC/RBAC/search security tooling. | W-027 W-021 |
| ARCH-B03 | INCREMENTAL | VETO | Online dual tuning is standard primal-dual adaptation. | W-008 |
| ARCH-B04 | INCREMENTAL | VETO | Disagreement-triggered expansion is selective-routing variant. | W-003 W-004 |
| ARCH-B05 | INCREMENTAL | VETO | Dynamic anchor quota aligns with slot-constrained ranking methods. | W-006 W-007 |
| ARCH-B06 | INCREMENTAL | VETO | Projection to feasible score space maps to constrained optimization formulations. | W-007 W-008 |
| ARCH-B07 | UNCLEAR | VETO | SAT-capsule/proof trace integration unclear but runtime cost/complexity currently too high. | W-016 W-017 W-009 |
| ARCH-B08 | INCREMENTAL | VETO | Minimal repair set concept overlaps top-k repair/query refinement literature. | W-004 W-005 W-018 |
| ARCH-B09 | UNCLEAR | VETO | Phase-scoped anchor replay may be differentiable, but pipeline complexity and drift risk high. | L-006 W-020 |
| ARCH-B10 | INCREMENTAL | VETO | Evidence-first gating exists in grounded retrieval/explanation pipelines. | W-002 W-003 |
| ARCH-B11 | POSSIBLY_NOVEL | KEEP_FOR_RESEARCH | Trust-partial-order delta commits between stream stages have no direct matched source yet. | L-006 W-019 W-020 |
| ARCH-B12 | INCREMENTAL | VETO | Bounded-regret refine decisions are known bandit/anytime pattern. | W-003 W-008 |
| ARCH-B13 | INCREMENTAL | VETO | Abstention corridor is known uncertainty-abstain family. | W-003 |
| ARCH-B14 | INCREMENTAL | VETO | Witness-chain tie-break appears as deterministic heuristic variant. | W-002 |
| ARCH-B15 | INCREMENTAL | VETO | Graph-based suppression resembles existing policy/filtering control families. | W-021 W-024 W-027 |
| ARCH-B16 | INCREMENTAL | VETO | Hash/certificate carrying results strongly overlaps verifiable retrieval lines. | W-009 W-010 W-011 |
| ARCH-B17 | INCREMENTAL | VETO | Partial-order constrained ranking is long-established. | W-005 W-019 |
| ARCH-B18 | INCREMENTAL | VETO | Synonym-perturbation stabilization is robustness variant, not clear architectural novelty. | W-003 |
| ARCH-B19 | UNCLEAR | VETO | Directional semantic quarantine may differ, but current prior art pressure + brittleness risk is high. | W-013 W-014 W-015 |
| ARCH-B20 | INCREMENTAL | VETO | Selective verifier scheduling maps to uncertainty routing family. | W-003 W-012 |

## Pass-1 survivors by status
- `KEEP_FOR_RESEARCH`: ARCH-A01, ARCH-A04, ARCH-B11
- `HOLD`: ARCH-A03, ARCH-B01
- `VETO`: remaining candidates

## Macro-Cycle 2 / Sub-Round 1 - Prosecutor delta
| ARCH ID | Prosecutor | Gatekeeper | Rationale (delta) | Evidence |
|---|---|---|---|---|
| ARCH-A01 | UNCLEAR (downgraded) | KEEP_FOR_RESEARCH | Strong ranking-stability/certified-robustness prior art narrows novelty room; differentiator not yet falsified. | W-028 W-029 W-030 W-038 W-039 |
| ARCH-A04 | UNCLEAR (unchanged) | KEEP_FOR_RESEARCH | Why-not/provenance prior art heavy; still no direct retrieval-time unsat-core integration match with Ixos constraints. | W-031 W-032 W-033 W-036 |
| ARCH-B11 | UNCLEAR (downgraded) | KEEP_FOR_RESEARCH | Continual top-k + production rescore/explain pressure weakens novelty confidence. | W-020 W-031 W-038 W-039 |
| CY2-R1-ARCH-01 | INCREMENTAL | HOLD | Displacement budget maps to ranking stability/certified robustness. | W-028 W-029 |
| CY2-R1-ARCH-02 | INCREMENTAL | HOLD | Envelope constraints align with consistency/constrained ranking lines. | W-028 W-030 |
| CY2-R1-ARCH-03 | INCREMENTAL | HOLD | Why-not-yet explanation graph lineage already strong. | W-031 W-032 |
| CY2-R1-ARCH-04 | INCREMENTAL | HOLD | Minimal patch/repair overlaps top-k repair prior art. | W-031 W-033 |
| CY2-R1-ARCH-05 | NOT_NOVEL | VETO | Semiring provenance explanation is established baseline. | W-034 W-035 |
| CY2-R1-ARCH-06 | INCREMENTAL | VETO | MaxSAT unsat-core machinery is mature; novelty needs stronger retrieval differentiator. | W-036 |
| CY2-R1-ARCH-07 | INCREMENTAL | VETO | Audit token is proof-carrying adaptation with strong prior art pressure. | W-037 |
| CY2-R1-ARCH-08 | NOT_NOVEL | VETO | Rescore explain wrapper is product composition, not architecture novelty. | W-038 W-039 |

## Macro-Cycle 2 / Sub-Round 1 - Gatekeeper delta
| ARCH ID | Gatekeeper | Operational rationale |
|---|---|---|
| ARCH-A01 | KEEP_FOR_RESEARCH | Can be implemented as top-k list contract (no extra model call), moderate p95 risk if bounded to k<=50. |
| ARCH-A04 | HOLD (diagnostic-only path) | Query-time solver path likely too expensive; only viable as offline/debug explanation unless proven under strict timeout. |
| ARCH-B11 | VETO | Stream-state oscillation risk + prior-art pressure + added publish complexity; weak novelty-to-cost ratio. |
| CY2-R1-ARCH-06 | VETO | MaxSAT core extraction too costly for hot path under current Ixos latency constraints. |

## Macro-Cycle 3 / Sub-Round 1 - Prosecutor delta
| ARCH ID | Prosecutor | Gatekeeper | Rationale (delta) | Evidence |
|---|---|---|---|---|
| ARCH-A01 | INCREMENTAL (downgraded) | HOLD | Displacement/continuity guarantees strongly overlap mature top-k approximation and robustness literature. | W-041 W-042 W-047 W-050 |
| ARCH-A04 | UNCLEAR (unchanged) | HOLD (diagnostic-only) | Conflict explanation prior art is heavy, but online retrieval-time unsat-core under Ixos constraints remains undecided. | W-043 W-031 W-036 |
| CY3-R1-ARCH-01 | INCREMENTAL | HOLD | Continuity reserve mirrors known top-k candidate-set maintenance patterns. | W-041 W-042 |
| CY3-R1-ARCH-02 | INCREMENTAL | HOLD | Early termination confidence bounds exist in approximate top-k frameworks. | W-041 W-047 |
| CY3-R1-ARCH-03 | INCREMENTAL | HOLD | Dual-frontier merge resembles mature hybrid approximation/fusion methods. | W-042 W-050 |
| CY3-R1-ARCH-04 | UNCLEAR | KEEP_FOR_RESEARCH | Truncation-debt ledger not directly matched yet; needs adversarial search and cost checks. | W-040 W-041 |
| CY3-R1-ARCH-05 | INCREMENTAL | HOLD | Pre-publish leak checks align with known policy/filter pushdown families. | W-048 W-021 |
| CY3-R1-ARCH-06 | INCREMENTAL | VETO | PIT/snapshot style consistency is established and adds state overhead. | W-045 W-049 |
| CY3-R1-ARCH-07 | INCREMENTAL | HOLD | Stage hash resembles consistency controls already present in production systems. | W-045 W-046 |
| CY3-R1-ARCH-08 | NOT_NOVEL | VETO | Pagination-depth control is direct product prior art. | W-049 |

## Macro-Cycle 3 / Sub-Round 1 - Gatekeeper delta
| ARCH ID | Gatekeeper | Operational rationale |
|---|---|---|
| ARCH-A04 | HOLD (diagnostic-only) | Unsat-core style runtime integration remains high risk for p95 and implementation complexity. |
| CY3-R1-ARCH-04 | KEEP_FOR_RESEARCH | Debt-ledger path can be metadata-first and cheap; one bounded probe may fit latency budget if tightly capped. |
| ARCH-A01 | VETO | Incremental under prior-art pressure; no longer justifies implementation cost. |

## Macro-Cycle 4 / Sub-Round 1 - Prosecutor delta
| ARCH ID | Prosecutor | Gatekeeper | Rationale (delta) | Evidence |
|---|---|---|---|---|
| ARCH-A04 | INCREMENTAL (downgraded) | VETO | MUS/CEGAR/SAT conflict-explanation prior art and overhead risk collapse retrieval-time unsat-core novelty in current form. | W-052 W-054 W-055 |
| CY4-R1-ARCH-01 | INCREMENTAL | HOLD | Conflict bitset sketches align with known approximation/conflict summarization methods. | W-052 W-053 |
| CY4-R1-ARCH-02 | INCREMENTAL | HOLD | CEGAR-lite flow is established abstraction/refinement pattern. | W-052 W-054 |
| CY4-R1-ARCH-03 | INCREMENTAL | HOLD | Min-cut risk partition overlaps mature graph-cut approximation and filter patterns. | W-053 W-048 |
| CY4-R1-ARCH-04 | INCREMENTAL | HOLD | Conflict-core caching resembles known solver reuse strategies. | W-054 W-055 |
| CY4-R1-ARCH-05 | UNCLEAR | KEEP_FOR_RESEARCH | False-positive-sensitive first-publish lexical objective may still be differentiable in Ixos setting. | W-056 W-059 |
| CY4-R1-ARCH-06 | INCREMENTAL | HOLD | Reversible suppression token maps to established auth/recovery controls. | W-057 W-058 |
| CY4-R1-ARCH-07 | INCREMENTAL | HOLD | Quarantine/delayed release resembles query-rules/pinned-stage controls. | W-060 W-061 |
| CY4-R1-ARCH-08 | NOT_NOVEL | VETO | Rule-guided pin/demotion directly productized. | W-060 W-063 |

## Macro-Cycle 4 / Sub-Round 1 - Gatekeeper delta
| ARCH ID | Gatekeeper | Operational rationale |
|---|---|---|
| CY3-R1-ARCH-04 | KEEP_FOR_RESEARCH | Metadata-only debt ledger plus one bounded probe remains operationally plausible. |
| CY4-R1-ARCH-05 | KEEP_FOR_RESEARCH | First-publish lexical FP-sensitive guard can be implemented with cheap deterministic checks. |
| ARCH-A04 | VETO | No cost-feasible hot-path version under current evidence. |

## Macro-Cycle 5 / Sub-Round 1 - Prosecutor delta
| ARCH ID | Prosecutor | Gatekeeper | Rationale (delta) | Evidence |
|---|---|---|---|---|
| CY3-R1-ARCH-04 | INCREMENTAL (downgraded) | VETO | Timeout/debt recovery aligns with anytime and budgeted-recall dynamic-pruning patterns. | W-066 W-074 W-075 |
| CY4-R1-ARCH-05 | UNCLEAR (unchanged) | KEEP_FOR_RESEARCH | FP-sensitive first-publish lexical guard still not directly matched in identical local progressive form. | W-056 W-059 |
| CY5-R1-ARCH-01 | INCREMENTAL | HOLD | Anchor-aware epsilon-safe pruning is threshold adaptation variant. | W-064 W-066 |
| CY5-R1-ARCH-02 | INCREMENTAL | HOLD | Competitive floor tuning overlaps established dynamic pruning controls. | W-065 W-067 |
| CY5-R1-ARCH-03 | INCREMENTAL | HOLD | Interruptible quota contract is anytime top-k variant. | W-074 W-075 |
| CY5-R1-ARCH-04 | INCREMENTAL | HOLD | Recovery micro-pass mirrors budgeted recall rescue patterns. | W-066 W-074 |
| CY5-R1-ARCH-05 | INCREMENTAL | HOLD | WAND witness reservation overlaps weakAnd/BlockMax quota-style controls. | W-069 W-070 |
| CY5-R1-ARCH-06 | INCREMENTAL | VETO | Refinement-by-risk confidence is routing family overlap. | W-072 W-073 |
| CY5-R1-ARCH-07 | INCREMENTAL | VETO | Query/filter context split is product-standard pattern. | W-072 |
| CY5-R1-ARCH-08 | INCREMENTAL | HOLD | Rank-normalization + bonus is tuning variant, not new architecture. | W-073 W-050 |

## Macro-Cycle 5 / Sub-Round 1 - Gatekeeper delta
| ARCH ID | Gatekeeper | Operational rationale |
|---|---|---|
| CY4-R1-ARCH-05 | KEEP_FOR_RESEARCH | Cheap first-publish lexical guard remains operationally plausible and tightly tied to live leak pain-point. |
| CY3-R1-ARCH-04 | VETO | Incremental overlap plus added recovery-pass complexity no longer justified. |
| CY5-R1-ARCH-06 | VETO | Routing-family overlap and potential policy complexity increase without novelty gain. |
