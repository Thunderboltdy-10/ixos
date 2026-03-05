# IDEA POOL

## Divergence Batch A (Fresh)
Constraint: generated before deep old-pool reading; placeholders only.

### ARCH-A01
- Core insight: enforce a per-query bound on lexical anchor displacement after semantic rerank.
- Targets: anchor misses, Flash-vs-Pro inversion.
- Novelty hypothesis: 1D if no existing hybrid system exposes explicit displacement bounds at runtime.
- Mechanism steps: detect lexical anchor set; rerank semantically; compute max anchor rank drop; if bound violated apply bounded repair swap.
- Falsification kill test: find prior production/paper with explicit lexical->semantic displacement certificates plus bounded repair.
- Minimal implementation path: add post-rerank rank-delta check in `progressive.rs` before final publish.
- p95 rationale: O(k) rank-delta pass and at most small swap operations.

### ARCH-A02
- Core insight: reserve a tiny anchor escrow window in top-k that can only be consumed by strong semantic wins.
- Targets: anchor misses.
- Novelty hypothesis: 2D if escrow + semantic-overrule threshold is jointly formalized.
- Mechanism steps: mark escrow slots from lexical anchors; allow override only when semantic margin exceeds threshold.
- Falsification kill test: prior art showing slot-reservation in hybrid retrieval with formal override rule.
- Minimal implementation path: small window policy in rank merge stage.
- p95 rationale: no extra model calls.

### ARCH-A03
- Core insight: if top1 lacks anchor witness, run a constrained lexical backfill probe before commit.
- Targets: anchor misses.
- Novelty hypothesis: 1D if backfill is triggered by top1 witness absence and limited to micro-budget.
- Mechanism steps: compute top1 witness score; if low, fetch lexical candidates not in top-k; re-evaluate small set.
- Falsification kill test: documented witness-triggered lexical rescue policy in prior retrieval stacks.
- Minimal implementation path: reuse lexical engine with tiny limit and merge pass.
- p95 rationale: bounded micro-probe (e.g., 10 candidates max).

### ARCH-A04
- Core insight: model anchor and leak constraints as SAT clauses and surface minimal unsat core when conflict appears.
- Targets: anchor misses and leaks.
- Novelty hypothesis: 2D if unsat-core explanations are retrieval-time and user-visible.
- Mechanism steps: encode constraints from current top-k; solve; if unsat extract minimal core; apply deterministic fallback policy.
- Falsification kill test: prior retrieval system with online unsat-core extraction for top-k anchor/safety conflicts.
- Minimal implementation path: lightweight SAT wrapper over top-k metadata only.
- p95 rationale: constraint size capped to top-k (small clause set).

### ARCH-A05
- Core insight: semantic demotion cannot exceed a query-adaptive delta unless contradictory evidence is explicit.
- Targets: anchor misses.
- Novelty hypothesis: 1D if delta policy is adaptive and evidence-conditioned.
- Mechanism steps: estimate confidence/ambiguity; derive demotion delta; clamp semantic demotion; allow exceptions with explicit contradiction signal.
- Falsification kill test: existing bounded-demotion hybrid policies with contradiction exceptions.
- Minimal implementation path: rank post-processor in `progressive.rs`.
- p95 rationale: arithmetic-only post-pass.

### ARCH-A06
- Core insight: each top result carries a compact witness obligation vector that must pass before final ordering freeze.
- Targets: leaks, plausible-wrong top1.
- Novelty hypothesis: 2D if obligation vectors are retrieval-specific and enforced pre-commit.
- Mechanism steps: compute obligations (anchor hit, benign intent compatibility, path risk); fail-soft demote when unmet.
- Falsification kill test: retrieval systems already using explicit obligation vectors with commit gate.
- Minimal implementation path: extend evidence object and scoring penalty.
- p95 rationale: reuses already-extracted signals.

### ARCH-A07
- Core insight: create a query-local sensitive direction and orthogonalize candidate scores away from it for benign queries.
- Targets: leaks.
- Novelty hypothesis: 2D if suppression geometry preserves explicit-sensitive recall when intent flips.
- Mechanism steps: infer sensitive axis from known risky tokens/paths; project candidate embeddings; apply intent-conditioned penalty.
- Falsification kill test: equivalent intent-conditioned geometric suppression in retrieval literature/products.
- Minimal implementation path: add vector projection term in similarity stage.
- p95 rationale: linear algebra on already available vectors.

### ARCH-A08
- Core insight: build a reversible exclusion cone in embedding space around sensitive exemplars for benign intent only.
- Targets: leaks.
- Novelty hypothesis: 1D if cone is reversible with explicit-sensitive intent override.
- Mechanism steps: maintain exemplar centroids; compute cone membership; suppress for benign intent; disable when sensitive intent explicit.
- Falsification kill test: prior reversible cone suppression with explicit-intent recovery.
- Minimal implementation path: add cone score feature in rerank.
- p95 rationale: constant-time per candidate with precomputed centroids.

### ARCH-A09
- Core insight: treat semantic rerank as a two-phase commit with rollback on violated trust constraints.
- Targets: anchor misses, leaks, inversion.
- Novelty hypothesis: 1D if commit/rollback semantics are explicit in retrieval pipeline.
- Mechanism steps: stage candidate reorder; validate constraints; commit if pass else rollback to safe snapshot.
- Falsification kill test: known retrieval architecture with transactional rank commits under trust constraints.
- Minimal implementation path: keep lexical snapshot and apply rollback policy before publish.
- p95 rationale: no extra embedding calls.

### ARCH-A10
- Core insight: maintain a rank-delta ledger and only allow monotone trust-improving edits between stream phases.
- Targets: plausible-wrong top1, instability.
- Novelty hypothesis: 2D if ledger enforces directional trust improvement during streaming.
- Mechanism steps: annotate each update with trust deltas; reject updates worsening anchor/leak score beyond budget.
- Falsification kill test: existing streaming search with trust-monotone edit contracts.
- Minimal implementation path: add ledger checks in semantic/refine publish path.
- p95 rationale: metadata checks only.

### ARCH-A11
- Core insight: solve top-k selection as tiny constrained beam search over candidate pool.
- Targets: anchor misses and leaks.
- Novelty hypothesis: likely incremental unless constraint structure is new.
- Mechanism steps: maintain beam states with constraint slack; pick highest feasible sequence.
- Falsification kill test: constrained top-k reranking beam already standard.
- Minimal implementation path: local beam over top-50.
- p95 rationale: capped beam width.

### ARCH-A12
- Core insight: run micro semantic probes only for candidates on anchor-risk frontier, not full top-k.
- Targets: anchor misses, inversion.
- Novelty hypothesis: likely incremental selective-rerank family.
- Mechanism steps: identify frontier by lexical/semantic disagreement; probe subset with secondary model.
- Falsification kill test: selective reranking under uncertainty already established.
- Minimal implementation path: reuse existing Auto refine top-k path with frontier selector.
- p95 rationale: fewer refinement calls than current top-k refine.

### ARCH-A13
- Core insight: compute upper/lower confidence bounds for each candidate and defer displacement unless bounds separate.
- Targets: inversion, plausible-wrong top1.
- Novelty hypothesis: 1D if bound policy is retrieval-stage specific and calibrated.
- Mechanism steps: estimate score variance from perturbations/cache state; allow reorder only if confidence margin positive.
- Falsification kill test: existing confidence-sequence retrieval controllers with same rule.
- Minimal implementation path: confidence estimator over top-k scores.
- p95 rationale: avoids expensive Pro refine when bounds are decisive.

### ARCH-A14
- Core insight: certify top1 robustness under small lexical paraphrase perturbations before final commit.
- Targets: anchor misses, instability.
- Novelty hypothesis: 2D if used as runtime gate rather than offline robustness metric.
- Mechanism steps: generate 2-3 perturbations; check top1 persistence; if unstable trigger safe fallback.
- Falsification kill test: online perturbation gate in production retrieval already documented.
- Minimal implementation path: tiny query rewrites in-process.
- p95 rationale: small bounded perturbation set.

### ARCH-A15
- Core insight: compile recurring failure cards into negation clauses that suppress known semantic confounders.
- Targets: plausible-wrong top1.
- Novelty hypothesis: likely incremental hard-negative memory pattern.
- Mechanism steps: mine false positives; attach negative clauses per query shape; apply at rerank.
- Falsification kill test: prior hard-negative retrieval memory with query-shape matching.
- Minimal implementation path: table-driven penalty rules.
- p95 rationale: lookup-based, no extra embedding.

### ARCH-A16
- Core insight: perform a counterfactual top1 swap check against best anchor-consistent challenger before finalization.
- Targets: anchor misses.
- Novelty hypothesis: 1D if swap check uses explicit trust gain criterion.
- Mechanism steps: identify top anchor-consistent alternative; compare trust objective; swap when objective improves.
- Falsification kill test: existing counterfactual swap policies in hybrid retrieval.
- Minimal implementation path: one extra comparison stage on ranked list.
- p95 rationale: no heavy compute.

### ARCH-A17
- Core insight: optimize a trust-regularized ranking objective with explicit anchor slack variables.
- Targets: anchor misses, inversion.
- Novelty hypothesis: likely incremental constrained-ranking variant.
- Mechanism steps: score = relevance - penalties + slack-weighted anchor term; tune slack by ambiguity.
- Falsification kill test: constrained ranking objectives already cover this formulation.
- Minimal implementation path: score post-processing behind feature flag.
- p95 rationale: arithmetic only.

### ARCH-A18
- Core insight: require minimum snippet evidence density for candidates promoted by semantic-only signal.
- Targets: plausible-wrong top1, leaks.
- Novelty hypothesis: 1D if density is intent-conditioned and top1-critical.
- Mechanism steps: compute snippet density / anchor overlap; gate promotions lacking evidence density.
- Falsification kill test: existing evidence-density gates in retrieval ranking.
- Minimal implementation path: leverage current evidence extraction outputs.
- p95 rationale: post-evidence filter only.

### ARCH-A19
- Core insight: detect path-prior contradictions (e.g., risky path + weak lexical evidence) and cap rank.
- Targets: leaks.
- Novelty hypothesis: likely incremental heuristic safety layer.
- Mechanism steps: compute contradiction score; apply cap unless sensitive intent explicit.
- Falsification kill test: prior risk-path heuristics already in enterprise systems.
- Minimal implementation path: path token classifier in rank stage.
- p95 rationale: token checks only.

### ARCH-A20
- Core insight: solve a tiny latency-budgeted constraint selection problem each query to choose safest feasible top-k.
- Targets: anchor misses, leaks, inversion.
- Novelty hypothesis: likely incremental because budgeted constrained selection is mature.
- Mechanism steps: formulate cost-constrained objective; run fast optimizer on top-N.
- Falsification kill test: constrained optimization + budget allocation already documented for ranking.
- Minimal implementation path: top-30 ILP/greedy approximation.
- p95 rationale: tiny N, bounded solver time.

## Divergence Batch B (Hard Reset)
Constraint: generated without referencing Batch A entries during drafting.

### ARCH-B01
- Core insight: split query into anchor clause and semantic clause, then require both clauses to contribute to top1.
- Targets: anchor misses.
- Novelty hypothesis: 1D if dual-clause satisfaction is a hard runtime contract.
- Mechanism steps: parse clauses; score each candidate on both; enforce min contribution from each clause.
- Falsification kill test: prior dual-clause hard contracts in hybrid retrieval.
- Minimal implementation path: clause-aware score decomposition.
- p95 rationale: no extra model calls.

### ARCH-B02
- Core insight: benign-intent mode applies privacy guardrail matrix; sensitive-intent mode lifts only matched guardrails.
- Targets: leaks.
- Novelty hypothesis: likely incremental policy matrix pattern.
- Mechanism steps: classify intent; apply matrix penalties/blocks; lift targeted constraints on explicit-sensitive queries.
- Falsification kill test: policy matrices already common in secure retrieval systems.
- Minimal implementation path: intent + rule matrix before final rank.
- p95 rationale: constant-time checks.

### ARCH-B03
- Core insight: online dual-variable tuner adjusts trust penalty weights from observed query risk signals.
- Targets: inversion, plausible-wrong top1.
- Novelty hypothesis: 1D if adaptation is local-first and bounded by latency budget.
- Mechanism steps: initialize lambdas; update by uncertainty and failure memory; apply in score blend.
- Falsification kill test: adaptive Lagrangian controllers already common in constrained ranking.
- Minimal implementation path: maintain small state in process.
- p95 rationale: arithmetic updates only.

### ARCH-B04
- Core insight: when lexical and semantic disagree sharply, expand only disagreement region with extra candidates.
- Targets: anchor misses.
- Novelty hypothesis: likely incremental selective expansion family.
- Mechanism steps: detect disagreement set; request extra lexical paths around it; rerank local expansion.
- Falsification kill test: selective disagreement expansion already in routing/cascade literature.
- Minimal implementation path: targeted generator rerun on disagreement tokens.
- p95 rationale: bounded region expansion.

### ARCH-B05
- Core insight: reserve a dynamic anchor quota proportional to query specificity score.
- Targets: anchor misses.
- Novelty hypothesis: 1D if quota adapts per query with provable bounds.
- Mechanism steps: compute specificity; map to quota; enforce quota in top-k unless confidence override.
- Falsification kill test: dynamic quota constraints already present in ranking literature.
- Minimal implementation path: quota enforcement in rerank output.
- p95 rationale: O(k) post-pass.

### ARCH-B06
- Core insight: project dense scores into constraint-feasible manifold before final ordering.
- Targets: leaks, anchor misses.
- Novelty hypothesis: 2D if manifold projection is retrieval-time and cheap.
- Mechanism steps: define feasibility constraints; project score vector; sort projected scores.
- Falsification kill test: prior constrained projection ranking frameworks with same semantics.
- Minimal implementation path: projected-gradient step on top-k vector.
- p95 rationale: tiny vector projection.

### ARCH-B07
- Core insight: compile each query to a SAT capsule and output both ranking and satisfiability proof trace.
- Targets: anchor misses, leaks.
- Novelty hypothesis: 2D if proof trace is retrieval-native and low latency.
- Mechanism steps: encode constraints, solve, output model + compact trace; fallback on unsat.
- Falsification kill test: existing SAT-backed retrieval with proof traces.
- Minimal implementation path: top-k SAT encoding service in-process.
- p95 rationale: capped clause count.

### ARCH-B08
- Core insight: compute minimal correction set to transform unsafe ranking into safe ranking with least relevance loss.
- Targets: leaks, plausible-wrong top1.
- Novelty hypothesis: 1D if minimal correction is explicit and deterministic.
- Mechanism steps: detect violations; search minimal swaps/demotions; apply smallest fix set.
- Falsification kill test: minimal repair ranking methods already published for similar constraints.
- Minimal implementation path: local greedy repair over top-k.
- p95 rationale: bounded top-k repair search.

### ARCH-B09
- Core insight: keep a short-lived privileged anchor replay queue across stream phases to prevent anchor disappearance.
- Targets: anchor misses during progressive updates.
- Novelty hypothesis: 1D if queue semantics are strictly phase-scoped and trust-aware.
- Mechanism steps: capture lexical anchors; replay candidates in semantic/refine checkpoints; expire at completion.
- Falsification kill test: prior phase-scoped anchor replay in progressive search.
- Minimal implementation path: attach queue in progressive state.
- p95 rationale: metadata queue only.

### ARCH-B10
- Core insight: decompose ranking into evidence-first and relevance-second for top1 only.
- Targets: plausible-wrong top1, leaks.
- Novelty hypothesis: likely incremental evidence-gated rerank.
- Mechanism steps: compute evidence gate; only candidates above threshold enter relevance comparison for top1.
- Falsification kill test: evidence-first gating already common in grounded retrieval.
- Minimal implementation path: top1 gate on existing evidence summary.
- p95 rationale: reuses existing evidence stage.

### ARCH-B11
- Core insight: differential top-k commit publishes only trust-improving deltas between semantic and refine stages.
- Targets: inversion, instability.
- Novelty hypothesis: 1D if delta commit uses explicit trust partial-order.
- Mechanism steps: compute stage diff; accept only deltas that improve trust objective; hold harmful deltas.
- Falsification kill test: prior partial-order constrained streaming commit protocols.
- Minimal implementation path: compare old/new ranked vectors before emit.
- p95 rationale: diff over top-k vectors.

### ARCH-B12
- Core insight: apply bounded-regret policy to decide when Pro refinement is worth latency cost.
- Targets: inversion, p95 risk.
- Novelty hypothesis: likely incremental bandit/routing class.
- Mechanism steps: estimate expected trust gain vs latency regret; refine only above threshold.
- Falsification kill test: established anytime/bandit refinement policies in retrieval.
- Minimal implementation path: gate function around existing refine branch.
- p95 rationale: should reduce unnecessary refinements.

### ARCH-B13
- Core insight: semantic abstention corridor suppresses overconfident top1 when score margin is ambiguous.
- Targets: plausible-wrong top1.
- Novelty hypothesis: likely incremental abstention family.
- Mechanism steps: compute margin corridor; if inside corridor, promote anchor-backed alternative.
- Falsification kill test: abstention corridors already documented for ranking/routing.
- Minimal implementation path: margin rule in rank finalization.
- p95 rationale: no model overhead.

### ARCH-B14
- Core insight: use witness chain completeness score as hard tiebreaker before semantic similarity ties.
- Targets: anchor misses, plausible-wrong top1.
- Novelty hypothesis: 1D if chain completeness is formalized as deterministic tie-break contract.
- Mechanism steps: compute chain score (path+snippet+anchor); apply in ties/near-ties only.
- Falsification kill test: prior deterministic witness-chain tiebreak in hybrid retrieval.
- Minimal implementation path: tiebreak function in ranker.
- p95 rationale: cheap deterministic comparison.

### ARCH-B15
- Core insight: construct path-token risk graph and apply min-cut demotion for benign intent leakage candidates.
- Targets: leaks.
- Novelty hypothesis: 2D if graph cut is query-local and preserves explicit-sensitive recall.
- Mechanism steps: build graph from path tokens and candidate links; run min-cut to isolate risky group; demote only cut side.
- Falsification kill test: existing graph-cut suppression for retrieval leakage.
- Minimal implementation path: graph over top-50 paths.
- p95 rationale: tiny graph sizes.

### ARCH-B16
- Core insight: emit compact hash-based constraint certificate per top result for fast verifier checks.
- Targets: trust/verification.
- Novelty hypothesis: likely incremental proof-carrying adaptation.
- Mechanism steps: hash constraints + evidence pointers; verify hash contract on client.
- Falsification kill test: proof/certificate carrying retrieval outputs already present.
- Minimal implementation path: add certificate field in result payload.
- p95 rationale: hashing overhead only.

### ARCH-B17
- Core insight: represent ranking as partial order with forbidden inversions instead of total order optimization.
- Targets: anchor misses, inversion.
- Novelty hypothesis: 1D if forbidden inversions are derived from trust constraints.
- Mechanism steps: create pairwise precedence rules; topologically sort with relevance weights.
- Falsification kill test: partial-order constrained ranking with precedence rules already established.
- Minimal implementation path: build precedence matrix on top-k.
- p95 rationale: small-k topological sort.

### ARCH-B18
- Core insight: derive robustness envelope from synonym expansion disagreement and use it to cap risky reorders.
- Targets: instability, inversion.
- Novelty hypothesis: 1D if envelope directly controls reorder depth.
- Mechanism steps: run synonym variants from preprocessor; measure rank spread; cap reorder when spread high.
- Falsification kill test: synonym-perturbation stabilization already used online in ranking stacks.
- Minimal implementation path: leverage existing preprocessor synonyms.
- p95 rationale: tiny set of expansion variants.

### ARCH-B19
- Core insight: apply directional semantic quarantine to candidates near sensitive manifold, with explicit-intent recovery route.
- Targets: leaks.
- Novelty hypothesis: 2D if quarantine is directional and reversible.
- Mechanism steps: estimate sensitive manifold; detect directional proximity; quarantine for benign intent; recover on explicit sensitive intent.
- Falsification kill test: equivalent reversible manifold quarantine in retrieval prior art.
- Minimal implementation path: manifold score feature + intent gate.
- p95 rationale: vector ops on top-k only.

### ARCH-B20
- Core insight: learn lightweight per-query verifier policy that predicts which trust checks are mandatory under latency budget.
- Targets: p95 risk while preserving trust.
- Novelty hypothesis: likely incremental policy/routing family.
- Mechanism steps: featurize query; choose mandatory checks subset; run checks; finalize ranking.
- Falsification kill test: selective verification scheduling already established in systems literature.
- Minimal implementation path: heuristic policy table first, learned model later.
- p95 rationale: can skip unnecessary heavy checks.

## Macro-Cycle 2 / Sub-Round 1 - Candidate set (Chunk C scope only)

### CY2-R1-ARCH-01
- Mechanism: enforce per-rank displacement budgets from lexical baseline into semantic publish (delta_i <= b_i) with bounded local repair.
- Why 1D/2D novelty candidate: 1D only if hybrid lexical->semantic displacement budget is retrieval-stage explicit and low-cost.
- Kill test: prior ranking-stability/certified-robustness already equivalent at top-k publish layer.
- Minimal implementation path: rank-diff calculator on top-k plus one-pass local swap repair.
- Ixos relevance: directly targets anchor displacement under progressive publish.
- Prosecutor verdict: INCREMENTAL (W-028/W-029/W-030).

### CY2-R1-ARCH-02
- Mechanism: dual envelope contract (lexical floor + semantic ceiling) limiting reorder depth for anchor-bearing candidates.
- Why 1D/2D novelty candidate: 1D if envelope is query-adaptive and stage-specific beyond known constrained ranking.
- Kill test: overlap with consistency/robustness + constrained ranking literature.
- Minimal implementation path: per-query envelope from anchor evidence counts; enforce at finalize step.
- Ixos relevance: prevents weak semantic neighbors displacing exact anchors.
- Prosecutor verdict: INCREMENTAL (W-028/W-030/W-038).

### CY2-R1-ARCH-03
- Mechanism: construct conflict witness graph for missing-anchor explanations using why-not-yet style constraints.
- Why 1D/2D novelty candidate: 2D only if graph is computed online at low overhead for live retrieval.
- Kill test: why-not-yet and provenance graph prior art already equivalent.
- Minimal implementation path: emit graph nodes from violated anchor/safety constraints on top-20.
- Ixos relevance: gives actionable reason for anchor misses and leak suppressions.
- Prosecutor verdict: INCREMENTAL (W-031/W-032/W-033).

### CY2-R1-ARCH-04
- Mechanism: minimal conflict-core patch operator proposes smallest rank edits satisfying anchor + safety constraints.
- Why 1D/2D novelty candidate: 1D if core extraction + patch objective is retrieval-time bounded and deterministic.
- Kill test: top-k repair literature already does minimal correction in comparable form.
- Minimal implementation path: greedy minimal patch on top-k with violation scoring.
- Ixos relevance: could repair flash/pro divergence and anchor miss cases.
- Prosecutor verdict: INCREMENTAL (W-031/W-033).

### CY2-R1-ARCH-05
- Mechanism: semiring-encoded explanation object attached to each top-k result for conflict traceability.
- Why 1D/2D novelty candidate: low; semiring provenance is mature.
- Kill test: semiring provenance already standard in DB explanation ecosystems.
- Minimal implementation path: map existing evidence fields into semiring provenance tuple.
- Ixos relevance: explanation/debugging object for trust decisions.
- Prosecutor verdict: NOT_NOVEL (W-032/W-034/W-035).

### CY2-R1-ARCH-06
- Mechanism: micro-MaxSAT unsat-core extraction only on top-20 constraints, with strict timeout fallback.
- Why 1D/2D novelty candidate: 1D if top-k micro-core budget makes solver viable at p95.
- Kill test: if MaxSAT core extraction tutorials/solvers already cover equivalent bounded workflow.
- Minimal implementation path: offline/diagnostic mode first with 5-10 ms cap.
- Ixos relevance: conflict explanation for anchor-vs-safety collisions.
- Prosecutor verdict: INCREMENTAL (W-036).

### CY2-R1-ARCH-07
- Mechanism: lightweight audit token binding conflict-core ID to emitted ranking delta for verifier replay.
- Why 1D/2D novelty candidate: 1D only if materially different from existing auditable vector search/proof-carrying lines.
- Kill test: auditable/provable retrieval already equivalent.
- Minimal implementation path: hash tuple (query_digest, core_digest, delta_digest).
- Ixos relevance: trust debugging for flash/auto stage transitions.
- Prosecutor verdict: INCREMENTAL (W-037).

### CY2-R1-ARCH-08
- Mechanism: expose stage-transition invariant report using Lucene/Elastic rerank explain primitives as contract evidence.
- Why 1D/2D novelty candidate: very low; mostly composition of existing explain APIs.
- Kill test: production docs already provide same primitives.
- Minimal implementation path: adapter wrapper around existing explain outputs.
- Ixos relevance: improves observability but unlikely architecture novelty.
- Prosecutor verdict: NOT_NOVEL (W-038/W-039).

## Macro-Cycle 3 / Sub-Round 1 - Candidate set (Chunk C scope only)

### CY3-R1-ARCH-01
- Mechanism: continuity reserve set that guarantees anchor-bearing lexical hits are carried into semantic stage regardless of truncation pressure.
- Why 1D/2D novelty candidate: 1D only if continuity reserve is formalized with hard bounds and low overhead.
- Kill test: prior exact/uncertain top-k candidate-superset maintenance already equivalent.
- Minimal implementation path: reserve `m` anchor-tagged candidates from lexical stage before cap pruning.
- Ixos relevance: directly targets ripgrep timeout/hit-cap anchor misses.
- Prosecutor verdict: `INCREMENTAL` (W-041/W-042/W-047).

### CY3-R1-ARCH-02
- Mechanism: early termination confidence bound derived from collector statistics to decide if truncation is safe.
- Why 1D/2D novelty candidate: 1D if confidence bound is retrieval-stage explicit and cheap.
- Kill test: approximate top-k and production approximation frameworks already provide equivalent confidence controls.
- Minimal implementation path: add bound estimator to candidate generator metrics.
- Ixos relevance: reduces unnecessary expansions while guarding anchor recall.
- Prosecutor verdict: `INCREMENTAL` (W-041/W-047/W-051).

### CY3-R1-ARCH-03
- Mechanism: dual-frontier expansion where lexical and semantic frontiers each contribute mandatory candidates under truncation debt.
- Why 1D/2D novelty candidate: 2D only if debt policy differs materially from known top-k approximation flows.
- Kill test: prior top-k exact/approximate processing plus hybrid fusion already equivalent.
- Minimal implementation path: bounded two-list merge before final rerank.
- Ixos relevance: addresses flash semantic overtake of exact anchors.
- Prosecutor verdict: `INCREMENTAL` (W-041/W-042/W-050).

### CY3-R1-ARCH-04
- Mechanism: truncation-debt ledger records likely-missed anchor classes and triggers one bounded cheap recovery probe.
- Why 1D/2D novelty candidate: 1D if debt signal is deterministic and specific to admission-stage loss.
- Kill test: find existing retrieval system with equivalent debt ledger semantics in progressive local search.
- Minimal implementation path: maintain debt counters from lexical timeout/cap telemetry; optional targeted probe.
- Ixos relevance: direct fit to known Ixos candidate admission bottleneck.
- Prosecutor verdict: `UNCLEAR` (not yet directly matched in opened sources).

### CY3-R1-ARCH-05
- Mechanism: pre-publish lexical leak invariant checker blocks emit when benign intent conflicts with sensitive path risk.
- Why 1D/2D novelty candidate: low; resembles policy/filtering safeguards.
- Kill test: production hybrid filter pushdown and policy filtering already equivalent.
- Minimal implementation path: invariant check over top-k lexical previews before first stream emit.
- Ixos relevance: addresses semantic-before-suppression leak risk.
- Prosecutor verdict: `INCREMENTAL` (W-048/W-021/W-024).

### CY3-R1-ARCH-06
- Mechanism: local snapshot token across progressive stages (PIT-like) to prevent state drift across publishes.
- Why 1D/2D novelty candidate: low; pagination/snapshot consistency is mature.
- Kill test: search_after/PIT style consistency already equivalent in production retrieval.
- Minimal implementation path: per-query snapshot ID bound to stage emits.
- Ixos relevance: could reduce flash/pro stage drift.
- Prosecutor verdict: `INCREMENTAL` (W-045/W-049).

### CY3-R1-ARCH-07
- Mechanism: stage consistency hash validates ranking stability before publish transitions.
- Why 1D/2D novelty candidate: 1D only if hash captures trust-invariant semantics beyond known consistent scoring controls.
- Kill test: existing consistent scoring + stable sort controls already equivalent.
- Minimal implementation path: compute transition hash from candidate IDs + evidence bits.
- Ixos relevance: prevents publish oscillation and reorder surprises.
- Prosecutor verdict: `INCREMENTAL` (W-045/W-046).

### CY3-R1-ARCH-08
- Mechanism: explicit pagination-depth style knob for local hybrid candidate window to bound latency/quality tradeoff.
- Why 1D/2D novelty candidate: minimal; productized already.
- Kill test: direct prior-art match in OpenSearch pagination depth controls.
- Minimal implementation path: expose depth knob in candidate generator config.
- Ixos relevance: controls recall vs p95 under hard caps.
- Prosecutor verdict: `NOT_NOVEL` (W-049).

## Macro-Cycle 4 / Sub-Round 1 - Candidate set (Chunk C scope only)

### CY4-R1-ARCH-01
- Mechanism: conflict bitset sketch generated from violated anchor/safety clauses at publish boundary.
- Why 1D/2D novelty candidate: 1D only if sketch is retrieval-specific and materially cheaper than known conflict-core methods.
- Kill test: approximation/min-cut conflict summarization already equivalent.
- Minimal implementation path: build bitset over top-k candidates and violated predicates.
- Ixos relevance: fast explanation for anchor vs leak suppression conflicts.
- Prosecutor verdict: `INCREMENTAL` (W-052/W-053).

### CY4-R1-ARCH-02
- Mechanism: CEGAR-lite two-tier verifier: coarse conflict check on hot path, optional refine pass on demand.
- Why 1D/2D novelty candidate: 2D if retrieval-stage abstraction/refinement is specialized and cost-bounded.
- Kill test: established CEGAR + MUS pipelines already equivalent in control flow.
- Minimal implementation path: boolean coarse guard + optional refinement module.
- Ixos relevance: reduces expensive checks while preserving debuggability.
- Prosecutor verdict: `INCREMENTAL` (W-052/W-054).

### CY4-R1-ARCH-03
- Mechanism: path-risk min-cut sketch separates risky candidate cluster before first publish for benign intent.
- Why 1D/2D novelty candidate: low; graph cut safety controls are broad prior art.
- Kill test: min-cut approximation + filter-pushdown patterns already mature.
- Minimal implementation path: tiny graph over top-30 paths and cut threshold.
- Ixos relevance: early leak control with deterministic operations.
- Prosecutor verdict: `INCREMENTAL` (W-053/W-048).

### CY4-R1-ARCH-04
- Mechanism: query-shape keyed conflict-core cache to reuse prior minimal conflict sets.
- Why 1D/2D novelty candidate: 1D if cache key semantics and eviction preserve correctness cheaply.
- Kill test: existing MUS/SAT conflict reuse methods already equivalent.
- Minimal implementation path: hash query predicates + violation classes to cache prior cores.
- Ixos relevance: lowers overhead for repeated ambiguous queries.
- Prosecutor verdict: `INCREMENTAL` (W-054/W-055).

### CY4-R1-ARCH-05
- Mechanism: false-positive-sensitive lexical guard optimizing benign-intent precision while preserving explicit-sensitive recall path.
- Why 1D/2D novelty candidate: 1D if adapted specifically to first lexical publish and not generic policy gating.
- Kill test: direct prior-art match for first-publish lexical FP-sensitive objective in local progressive search.
- Minimal implementation path: threshold over path/token risk with explicit-intent override switch.
- Ixos relevance: direct fix for benign-query leak risk without forcing Pro.
- Prosecutor verdict: `UNCLEAR` (W-056/W-059 pressure but no direct first-publish local-search match yet).

### CY4-R1-ARCH-06
- Mechanism: reversible suppression token enabling explicit-intent recovery from pre-publish blocks.
- Why 1D/2D novelty candidate: low; role/access frameworks already cover recovery semantics.
- Kill test: RAG authorization frameworks already equivalent.
- Minimal implementation path: suppression token metadata and explicit-intent replay path.
- Ixos relevance: avoids irreversible false suppression.
- Prosecutor verdict: `INCREMENTAL` (W-057/W-058/W-062).

### CY4-R1-ARCH-07
- Mechanism: first-publish quarantine window with delayed release if risk signal decays after semantic evidence.
- Why 1D/2D novelty candidate: low; equivalent to staged demotion/pinning heuristics.
- Kill test: query rules/pinned controls already enable similar behavior.
- Minimal implementation path: temporary hold bucket in progressive stream.
- Ixos relevance: mitigates early lexical leaks.
- Prosecutor verdict: `INCREMENTAL` (W-060/W-061).

### CY4-R1-ARCH-08
- Mechanism: rule-guided pinned demotion for risky docs on benign intent.
- Why 1D/2D novelty candidate: minimal; direct product feature analog.
- Kill test: direct prior-art match in Elastic/Kendra/Weaviate controls.
- Minimal implementation path: map risk rules to pin/demote API in local ranker.
- Ixos relevance: practical but non-novel control.
- Prosecutor verdict: `NOT_NOVEL` (W-060/W-061/W-063).

## Macro-Cycle 5 / Sub-Round 1 - Candidate set (Chunk C scope only)

### CY5-R1-ARCH-01
- Mechanism: anchor-aware epsilon-safe pruning threshold that tightens/loosens pruning by anchor evidence confidence.
- Why 1D/2D novelty candidate: 1D only if anchor-aware thresholding is formally distinct from existing epsilon-safe pruning controls.
- Kill test: safe dynamic pruning literature already covers equivalent safety-threshold adaptation.
- Minimal implementation path: add anchor-evidence feature into pruning bound estimator.
- Ixos relevance: targets anchor misses under early termination.
- Prosecutor verdict: `INCREMENTAL` (W-064/W-066).

### CY5-R1-ARCH-02
- Mechanism: competitive score floor with anchor bonus to resist premature pruning of exact-match candidates.
- Why 1D/2D novelty candidate: low; likely threshold tuning variant.
- Kill test: dynamic pruning tuning and hardware-aware threshold adaptation already equivalent.
- Minimal implementation path: adjust competitive floor function with anchor bit.
- Ixos relevance: cheap mitigation for anchor displacement.
- Prosecutor verdict: `INCREMENTAL` (W-065/W-067).

### CY5-R1-ARCH-03
- Mechanism: interruptible retrieval with mandatory anchor-class quotas before stopping.
- Why 1D/2D novelty candidate: 1D only if quota contract materially differs from anytime top-k constraints.
- Kill test: anytime/interruptible top-k already support constrained early stop strategies.
- Minimal implementation path: enforce quota counters in retrieval loop.
- Ixos relevance: protects exact-match presence under hard timeout.
- Prosecutor verdict: `INCREMENTAL` (W-074/W-075).

### CY5-R1-ARCH-04
- Mechanism: timeout recovery micro-pass seeded by heavy-hitter sketch of likely missed anchor classes.
- Why 1D/2D novelty candidate: 1D if sketch-based recovery is deterministic and bounded enough for hot path.
- Kill test: equivalent budgeted recall recovery already present in dynamic pruning/anytime literature.
- Minimal implementation path: run one small recovery probe using sketch hints after timeout.
- Ixos relevance: direct response to ripgrep truncation misses.
- Prosecutor verdict: `INCREMENTAL` (W-066/W-074/W-075).

### CY5-R1-ARCH-05
- Mechanism: WAND witness reservation keeps a small anchor witness subset immune to competitive pruning.
- Why 1D/2D novelty candidate: 1D only if reservation invariants are new and cheap.
- Kill test: weakAnd/BlockMax controls plus quota-style constraints already equivalent.
- Minimal implementation path: reserve witness slots before WAND competitive elimination.
- Ixos relevance: candidate admission robustness without model calls.
- Prosecutor verdict: `INCREMENTAL` (W-069/W-070).

### CY5-R1-ARCH-06
- Mechanism: dynamic pruning confidence metadata triggers optional refine only when anchor-loss risk exceeds threshold.
- Why 1D/2D novelty candidate: low; routing/uncertainty family overlap.
- Kill test: selective refinement/uncertainty gating prior art already strong.
- Minimal implementation path: confidence score in candidate generator -> refine gate.
- Ixos relevance: avoids unnecessary Pro refine while protecting anchor-critical cases.
- Prosecutor verdict: `INCREMENTAL` (W-072/W-073).

### CY5-R1-ARCH-07
- Mechanism: dual query/filter context precheck for benign-risk guard before ranking finalization.
- Why 1D/2D novelty candidate: low; direct policy/filter context adaptation.
- Kill test: Elasticsearch query/filter context already equivalent.
- Minimal implementation path: split predicates into scoring vs safety filter branch.
- Ixos relevance: cheap pre-publish leak mitigation.
- Prosecutor verdict: `INCREMENTAL` (W-072).

### CY5-R1-ARCH-08
- Mechanism: rank-normalization with anchor-debt bonus to restore missed exact-match competitiveness.
- Why 1D/2D novelty candidate: low; fusion/rank-normalization tuning class.
- Kill test: existing normalization and hybrid optimization methods already equivalent.
- Minimal implementation path: apply debt bonus in fusion stage only.
- Ixos relevance: may reduce semantic-only misordering.
- Prosecutor verdict: `INCREMENTAL` (W-073/W-050).
