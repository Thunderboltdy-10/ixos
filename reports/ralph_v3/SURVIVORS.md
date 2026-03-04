# SURVIVORS

## PHASE 6 PROVISIONAL SURVIVORS (UNCLEAR / POSSIBLY NOVEL)

### ARCH-07 (UNCLEAR)
- Distinct claim: perturbation-stability veto integrated directly into retrieval ranking.
- Missing evidence to decide: prior work explicitly using online query perturbation as runtime top-k guard (not offline robustness eval).
- What would kill it: production/system paper showing same perturb-stability guard in retrieval stack.

### ARCH-09 (UNCLEAR)
- Distinct claim: query-specific negative lexical mask generated from current false neighbors.
- Missing evidence to decide: direct prior on dynamic per-query negative mask in candidate rerank.
- What would kill it: documented dynamic-negative rerank mechanism with same loop.

### ARCH-11 (UNCLEAR)
- Distinct claim: non-evictable anchor lanes spanning lexical->semantic transition.
- Missing evidence to decide: prior system with hard anchor lane reservation in hybrid retrieval.
- What would kill it: explicit anchor-lane/slot guarantee implementation references.

### ARCH-19 (UNCLEAR)
- Distinct claim: deterministic tail witness rescue after semantic truncation.
- Missing evidence to decide: prior art on witness-rescue backfill with bounded swap policy.
- What would kill it: similar post-rerank witness rescue described in papers/docs.

### ARCH-21 (POSSIBLY NOVEL)
- Distinct claim: certificate that lexical anchors cannot be displaced beyond bounded delta by semantic stage.
- Missing evidence to decide: formal/production prior on displacement certificates for hybrid top-k.
- What would kill it: any top-k certificate framework covering lexical-semantic displacement invariants.

### ARCH-25 (UNCLEAR)
- Distinct claim: benign-intent sensitive embedding forbidden zone used as leak suppression control.
- Missing evidence to decide: prior work on geometric exclusion zones for sensitivity in retrieval ranking.
- What would kill it: filtered ANN/safety paper with equivalent embedding-zone suppression.

### ARCH-28 (POSSIBLY NOVEL)
- Distinct claim: transactional rollback of semantic reordering when anchor/safety constraints are violated.
- Missing evidence to decide: prior production retrieval architecture with rollback semantics on rank transitions.
- What would kill it: existing rollback/reversible rank pipeline references.

### ARCH-40 (UNCLEAR)
- Distinct claim: bounded semantic demotion rule with contradiction-evidence exception.
- Missing evidence to decide: prior explicit bounded-demotion hybrid ranking policy.
- What would kill it: published monotonic hybrid rank policy with similar override rule.

## PHASE 7 GATEKEEPER (ACCURACY + PERF + COMPLEXITY VETO)

### Gatekeeper verdicts
- ARCH-07: VETO (extra probe calls add tail risk; unclear net gain).
- ARCH-09: VETO (high false-suppression risk on paraphrase queries).
- ARCH-11: VETO (anchor lanes risk hurting semantic relevance for broad queries).
- ARCH-19: VETO (rescue swaps can inject noisy anchors under ambiguity).
- ARCH-21: VETO (requires formal certificate machinery + proof burden not met; implementation complexity high for uncertain gain).
- ARCH-25: VETO (sensitivity zone likely brittle and difficult to calibrate safely).
- ARCH-28: VETO (rollback oscillation/instability risk; complex state semantics in streaming UI pipeline).
- ARCH-40: VETO (bounded demotion may lock in lexical noise and reduce semantic lift).

## Gatekeeper Outcome
- Survivors remaining after veto: 0
- Status: NO SURVIVORS (current cycle)
