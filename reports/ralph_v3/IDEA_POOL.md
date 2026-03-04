
# IDEA POOL


## PHASE 3 - DIVERGENCE ROUND 1 (BATCH 1)

### ARCH-01
- Core insight: Add a hard retrieval constraint layer that blocks candidates violating query-intent safety invariants before semantic rerank.
- Targets: leak, anchor miss.
- Why this might be 1D/2D novelty: blends intent-aware safety constraints with lexical candidate admission, not just post-rank filtering.
- Mechanism steps:
  1. Infer query intent class (benign/info/explicit-sensitive).
  2. Compile intent into constraint predicates over path/content tags.
  3. During candidate merge, reject predicate-violating candidates.
  4. Track rejected-high-score items for audit diagnostics.
  5. Relax constraints only when explicit-sensitive intent is high-confidence.
  6. Pass constrained set to semantic rerank unchanged.
- Minimal prototype path (<200 LOC, behind flag): src/ixos_rank/candidate_generator/mod.rs + flag IXOS_EXPERIMENT_INTENT_CONSTRAINT_GATE.
- Kill test: benign query suite still surfaces restricted paths in top-k with gate enabled.
- Expected accuracy gain without p95 tail regression: lower leak@k with minimal latency since filtering is O(n) over in-memory candidates.

### ARCH-02
- Core insight: Allocate candidate budget adaptively using anchor-confidence, not fixed multipliers.
- Targets: anchor miss, flash-pro inversion.
- Why this might be 1D/2D novelty: dynamic cap budgeting from anchor confidence at retrieval time rather than static max-candidate constants.
- Mechanism steps:
  1. Compute anchor confidence from query structure + lexical exactness.
  2. If confidence low, raise path/ripgrep budgets; if high, shrink.
  3. Reserve guaranteed slots for exact/path-anchor hits.
  4. Emit budget profile in stream stats for observability.
  5. Feed budget profile into auto refine gate.
- Minimal prototype path (<200 LOC, behind flag): src/ixos_rank/progressive.rs + candidate_generator/mod.rs + flag IXOS_EXPERIMENT_ADAPTIVE_CANDIDATE_BUDGET.
- Kill test: no anchor hit-rate lift on failure suite while candidate count increases >20%.
- Expected accuracy gain without p95 tail regression: selective budget raises on hard queries, preserving median path on easy anchors.

### ARCH-03
- Core insight: Build two independent top-k lists (exact-anchor and semantic) then perform rank-safe constrained union.
- Targets: anchor miss, flash-pro inversion.
- Why this might be 1D/2D novelty: rank-safe merge with explicit guarantee that certified anchor hits cannot be evicted by semantic drift.
- Mechanism steps:
  1. Produce exact-anchor list via filename/path/quoted literal matcher.
  2. Produce semantic list via current reranker.
  3. Assign confidence certificates per candidate (anchor, semantic, mixed).
  4. Merge by constrained interleaving with minimum anchor quota.
  5. Backfill with semantic when anchor confidence weak.
- Minimal prototype path (<200 LOC, behind flag): src/ixos_rank/progressive.rs merge stage + flag IXOS_EXPERIMENT_CERTIFIED_UNION.
- Kill test: exact-anchor queries still miss required witness in top-5.
- Expected accuracy gain without p95 tail regression: mostly ranking-layer operation over existing top-k vectors.

### ARCH-04
- Core insight: Detect semantic outliers by disagreement between lexical witness and embedding neighborhood, then suppress outliers.
- Targets: leak, plausible-wrong drift.
- Why this might be 1D/2D novelty: uses disagreement geometry as an explicit online safety signal at rerank time.
- Mechanism steps:
  1. Compute lexical witness score per semantic candidate.
  2. Compute local neighborhood agreement score among top semantic hits.
  3. Mark high-semantic/low-witness outliers.
  4. Apply penalty only for benign non-sensitive intents.
  5. Preserve explicit-sensitive override path.
- Minimal prototype path (<200 LOC, behind flag): src/ixos_rank/progressive.rs witness guard extension + flag IXOS_EXPERIMENT_DISAGREEMENT_PENALTY.
- Kill test: leak@k unchanged on benign queries or explicit-sensitive recall drops.
- Expected accuracy gain without p95 tail regression: uses existing scores; no extra model calls.

### ARCH-05
- Core insight: Convert sensitive retrieval into a two-key handshake (query intent key + document sensitivity key) to authorize ranking eligibility.
- Targets: leak.
- Why this might be 1D/2D novelty: retrieval authorization expressed as composable ranking key agreement, not static path blacklist.
- Mechanism steps:
  1. Tag candidates with sensitivity signals from path/content headers.
  2. Derive query authorization key from intent parser.
  3. Allow candidate only if key agreement holds.
  4. Log denied-but-high-score candidates for forensic analysis.
  5. Include explicit-sensitive user intent as positive key.
- Minimal prototype path (<200 LOC, behind flag): src/ixos_rank/progressive.rs + simple sensitivity tagger in candidate stage, flag IXOS_EXPERIMENT_AUTH_KEY_RETRIEVAL.
- Kill test: benign leakage persists without measurable precision gain.
- Expected accuracy gain without p95 tail regression: constant-time key checks per candidate.

### ARCH-06
- Core insight: Force semantic rerank to honor a minimum lexical coverage floor for top slots.
- Targets: anchor miss, flash-pro inversion.
- Why this might be 1D/2D novelty: explicit top-slot lexical coverage constraints integrated with semantic scores.
- Mechanism steps:
  1. Estimate lexical term coverage for each top semantic candidate.
  2. Define top-slot coverage floor by query length/type.
  3. Reorder candidates violating floor below compliant candidates.
  4. Relax floor for paraphrase-intent queries.
  5. Track floor-violation counts in metrics.
- Minimal prototype path (<200 LOC, behind flag): src/ixos_rank/progressive.rs ranking stage, flag IXOS_EXPERIMENT_TOP_SLOT_COVERAGE.
- Kill test: top1 anchor hit does not improve on anchor_exactness cases.
- Expected accuracy gain without p95 tail regression: no additional I/O/model operations.

### ARCH-07
- Core insight: Add adversarial lexical probe terms to test candidate stability before finalizing top-k.
- Targets: flash-pro inversion, plausible wrong.
- Why this might be 1D/2D novelty: online self-adversarial perturbation used as ranking confidence test.
- Mechanism steps:
  1. Generate 1-2 perturbation probes from query terms.
  2. Re-evaluate only top-k candidates under probes.
  3. Downweight candidates unstable to small perturbations.
  4. Keep stable anchor candidates unchanged.
  5. Skip probe on very short queries.
- Minimal prototype path (<200 LOC, behind flag): src/ixos_rank/progressive.rs with lightweight lexical recheck, flag IXOS_EXPERIMENT_PERTURB_STABILITY.
- Kill test: perturbation score fails to correlate with wrong-results cases.
- Expected accuracy gain without p95 tail regression: reuses lexical engine on tiny k subset.

### ARCH-08
- Core insight: Route between Flash and Pro using calibrated risk budget from observed uncertainty and safety risk.
- Targets: flash-pro inversion, leak.
- Why this might be 1D/2D novelty: budgeted routing objective combining risk and latency into a single control policy.
- Mechanism steps:
  1. Compute uncertainty vector (gap, entropy, lexical consensus).
  2. Compute safety risk vector (sensitive-path pressure, witness absence).
  3. Trigger Pro refine only when expected risk reduction exceeds budget cost.
  4. Cap refinement timeout by dynamic budget.
  5. Persist calibration stats offline.
- Minimal prototype path (<200 LOC, behind flag): extend should_refine in progressive.rs, flag IXOS_EXPERIMENT_RISK_BUDGET_ROUTER.
- Kill test: Pro call-rate rises significantly without improvement in agreement/leak metrics.
- Expected accuracy gain without p95 tail regression: targeted Pro usage rather than blanket escalation.

### ARCH-09
- Core insight: Build query-specific negative lexical model from high-scoring false neighbors and suppress them in rerank.
- Targets: anchor miss, plausible wrong.
- Why this might be 1D/2D novelty: online negative model inferred per query at retrieval time.
- Mechanism steps:
  1. Identify high-score candidates with low lexical witness.
  2. Extract dominant off-topic tokens from those candidates.
  3. Form negative token mask.
  4. Penalize candidates matching negative mask strongly.
  5. Recompute final top-k with penalties.
- Minimal prototype path (<200 LOC, behind flag): progressive.rs post-rerank penalty pass, flag IXOS_EXPERIMENT_QUERY_NEGATIVE_MASK.
- Kill test: false-positive reduction absent or true anchors also penalized.
- Expected accuracy gain without p95 tail regression: string/token operations on top-k only.

### ARCH-10
- Core insight: Replace binary sensitive-path heuristic with learned sensitivity posterior from metadata + content cues.
- Targets: leak.
- Why this might be 1D/2D novelty: probabilistic sensitivity posterior integrated into rank penalties.
- Mechanism steps:
  1. Extract lightweight sensitivity features (path tokens, section headers, filename patterns).
  2. Compute posterior score via calibrated logistic weights.
  3. Enforce posterior-dependent penalties under benign intent.
  4. Bypass penalties for explicit-sensitive queries.
  5. Emit posterior explanations in evidence.
- Minimal prototype path (<200 LOC, behind flag): progressive.rs + small scorer helper, flag IXOS_EXPERIMENT_SENSITIVITY_POSTERIOR.
- Kill test: posterior fails to separate restricted vs non-restricted files on atlas cards.
- Expected accuracy gain without p95 tail regression: no model inference; cheap feature scoring.

### ARCH-11
- Core insight: Reserve path-exact candidates through full pipeline using non-evictable anchor lanes.
- Targets: anchor miss.
- Why this might be 1D/2D novelty: lane-based non-eviction policy for exact anchors in progressive streaming retrieval.
- Mechanism steps:
  1. Detect path-exact/filename-exact candidates early.
  2. Allocate fixed lane slots in top-k.
  3. Allow eviction only by stronger exact candidates.
  4. Fill remaining slots by semantic rank.
  5. Disable lane when query is broad/ambiguous.
- Minimal prototype path (<200 LOC, behind flag): progressive.rs final merge, flag IXOS_EXPERIMENT_ANCHOR_LANES.
- Kill test: exact filename cases still miss top-k inclusion.
- Expected accuracy gain without p95 tail regression: rank list bookkeeping only.

### ARCH-12
- Core insight: Add confidence-calibrated abstention for unstable top-k and trigger micro-retrieval expansion.
- Targets: anchor miss, flash-pro inversion.
- Why this might be 1D/2D novelty: abstain-then-expand behavior inside search ranker instead of fixed retrieval depth.
- Mechanism steps:
  1. Estimate calibration confidence from score distribution + witness.
  2. If confidence below threshold, run micro expansion (extra lexical + rerank on delta set).
  3. Merge only if confidence improves.
  4. Abort expansion on timeout budget.
  5. Log abstention frequency.
- Minimal prototype path (<200 LOC, behind flag): progressive.rs with one extra rerank call, flag IXOS_EXPERIMENT_ABSTAIN_EXPAND.
- Kill test: low-confidence cases do not improve while latency tail worsens.
- Expected accuracy gain without p95 tail regression: expansion gated to small subset of uncertain queries.

### ARCH-13
- Core insight: Precompute per-directory lexical priors from failure cards and inject during candidate merge.
- Targets: anchor miss.
- Why this might be 1D/2D novelty: failure-atlas-informed directory priors applied online as uncertainty-aware priors.
- Mechanism steps:
  1. Build directory prior map from historical misses.
  2. Match query token families to prior map.
  3. Apply bounded boost only if lexical evidence supports.
  4. Decay priors over time.
  5. Store audit trace on applied prior.
- Minimal prototype path (<200 LOC, behind flag): candidate_generator/metadata_priors.rs, flag IXOS_EXPERIMENT_FAILURE_PRIORS.
- Kill test: priors overfit and degrade unrelated query quality.
- Expected accuracy gain without p95 tail regression: simple score adjustments during existing prior pass.

### ARCH-14
- Core insight: Build a small constraint SAT check for top-k ordering invariants (must-include/must-exclude) before emit.
- Targets: leak, anchor miss.
- Why this might be 1D/2D novelty: formal constraint satisfaction on top-k emission integrated with retrieval.
- Mechanism steps:
  1. Derive constraints from query intent and anchor detectors.
  2. Validate top-k candidate set against constraints.
  3. If violated, run minimal repair swaps from tail candidates.
  4. Emit repaired list with reason codes.
  5. Fail-open only on explicit-sensitive request.
- Minimal prototype path (<200 LOC, behind flag): progressive.rs emit stage, flag IXOS_EXPERIMENT_TOPK_CONSTRAINT_REPAIR.
- Kill test: repaired lists still violate constraints or produce unstable ranking oscillation.
- Expected accuracy gain without p95 tail regression: operates on small top-k/tail buffers.

### ARCH-15
- Core insight: Multi-view rerank using separate embeddings for filename/path snippet and content snippet with disagreement penalty.
- Targets: anchor miss, flash-pro inversion.
- Why this might be 1D/2D novelty: explicit multi-view consistency objective in local retrieval without full model retraining.
- Mechanism steps:
  1. Build two text views per candidate (path-focused, content-focused).
  2. Embed both views once for top candidates.
  3. Score each view against query.
  4. Penalize large divergence unless query is abstract.
  5. Fuse into final similarity.
- Minimal prototype path (<200 LOC, behind flag): semantic_engine.rs rerank path, flag IXOS_EXPERIMENT_MULTIVIEW_CONSISTENCY.
- Kill test: divergence penalties suppress true paraphrase matches.
- Expected accuracy gain without p95 tail regression: limited to top candidates and shared embed batch.

### ARCH-16
- Core insight: Uncertainty-aware snippet extraction that requires anchor overlap before evidence can boost ranking.
- Targets: anchor miss, plausible wrong.
- Why this might be 1D/2D novelty: evidence extraction becomes ranking gatekeeper, not only explanation layer.
- Mechanism steps:
  1. Extract semantic passage for top candidates.
  2. Compute anchor overlap between passage and query terms.
  3. Use overlap as ranking correction term.
  4. Downweight candidates with low-overlap passages.
  5. Exempt explicit exploratory queries.
- Minimal prototype path (<200 LOC, behind flag): progressive.rs evidence section, flag IXOS_EXPERIMENT_EVIDENCE_GATED_RANK.
- Kill test: overlap gating does not improve plausible-wrong metric.
- Expected accuracy gain without p95 tail regression: uses already-extracted passages in deferred stage.

### ARCH-17
- Core insight: Add corpus-partition routing where sensitive partitions are searched only if intent authorizes.
- Targets: leak.
- Why this might be 1D/2D novelty: retrieval partition routing for privacy invariants in local-first search.
- Mechanism steps:
  1. Build lightweight partition labels from paths (restricted/public/code/docs/etc.).
  2. Route lexical scan to authorized partitions by intent.
  3. Keep emergency fallback to all partitions on explicit-sensitive.
  4. Track partition hit contribution in stream stats.
  5. Audit unauthorized partition suppression.
- Minimal prototype path (<200 LOC, behind flag): candidate_generator/path_engine.rs + ipgrep_funnel.rs, flag IXOS_EXPERIMENT_PARTITION_ROUTING.
- Kill test: benign leak remains or recall collapses on normal docs queries.
- Expected accuracy gain without p95 tail regression: smaller search surface for most benign queries.

### ARCH-18
- Core insight: Learn per-query-type fusion weights online from recent success/failure outcomes.
- Targets: flash-pro inversion, anchor miss.
- Why this might be 1D/2D novelty: on-device adaptive fusion policy tied to query clusters, not static global weights.
- Mechanism steps:
  1. Cluster queries by lexical/semantic signatures.
  2. Maintain rolling success stats per cluster.
  3. Adjust fusion weights (flash/pro/lexical) within safe bounds.
  4. Freeze updates when volatility is high.
  5. Snapshot weights for reproducibility.
- Minimal prototype path (<200 LOC, behind flag): progressive.rs fusion config adjuster, flag IXOS_EXPERIMENT_CLUSTER_ADAPTIVE_FUSION.
- Kill test: adaptation oscillates and worsens stability metrics.
- Expected accuracy gain without p95 tail regression: no extra retrieval calls; only weight updates.

### ARCH-19
- Core insight: Tail-candidate rescue for exact anchors missed by semantic rerank via lexical witness backfill.
- Targets: anchor miss.
- Why this might be 1D/2D novelty: deterministic backfill rescue based on lexical witness from truncated tail.
- Mechanism steps:
  1. Keep compressed witness metadata for tail lexical candidates.
  2. After ranking, check if top-k has any strong witness.
  3. If none, inject highest-witness tail candidate.
  4. Evict lowest-confidence semantic candidate.
  5. Record rescue event metric.
- Minimal prototype path (<200 LOC, behind flag): progressive.rs ranking post-pass, flag IXOS_EXPERIMENT_TAIL_WITNESS_RESCUE.
- Kill test: rescue introduces irrelevant file more often than true anchor.
- Expected accuracy gain without p95 tail regression: no extra model inference; uses already-collected lexical data.

### ARCH-20
- Core insight: Formalize retrieval as constrained optimization maximizing relevance under leak-risk budget.
- Targets: leak, flash-pro inversion.
- Why this might be 1D/2D novelty: explicit objective with leak-risk term and budgeted optimization in local search.
- Mechanism steps:
  1. Compute per-candidate relevance and leak-risk scores.
  2. Solve top-k selection with risk budget (greedy approximation).
  3. Enforce mandatory anchor constraints when present.
  4. Emit both objective components for explainability.
  5. Tune budget by query intent class.
- Minimal prototype path (<200 LOC, behind flag): progressive.rs selection routine, flag IXOS_EXPERIMENT_RISK_BUDGET_TOPK.
- Kill test: risk-budget selector reduces relevance more than leak improvements.
- Expected accuracy gain without p95 tail regression: greedy selection over small candidate pool is low overhead.

## PHASE 4 - DIVERGENCE ROUND 2 (BATCH 2, FRESH RESTART)
- Reset note: Generated from Phase 2 system-truth + case-card failure mechanics only.

### ARCH-21
- Core insight: Require a top-k stability certificate showing anchors cannot drop below k after semantic refinement.
- Targets: anchor miss, flash-pro inversion.
- Why this might be 1D/2D novelty: introduces certifiable monotonic constraints between lexical and semantic stages.
- Mechanism steps:
  1. Compute lexical anchor confidence bounds.
  2. Predict max semantic displacement for anchored items.
  3. If displacement may violate top-k, reserve anchor slots.
  4. Emit certificate status with each result set.
  5. Fallback to safe merge when uncertified.
- Minimal prototype path (<200 LOC, behind flag): progressive.rs merge logic + SearchEvent::Status tag under IXOS_EXPERIMENT_TOPK_CERT.
- Kill test: certified runs still show anchor missing from required top-k.
- Expected accuracy gain without p95 tail regression: arithmetic checks over top candidates only.

### ARCH-22
- Core insight: Add a directory-planning pre-step that predicts likely folders before candidate generation.
- Targets: anchor miss, flash-pro inversion.
- Why this might be 1D/2D novelty: planning-level routing integrated ahead of path/ripgrep scoring.
- Mechanism steps:
  1. Build query-to-directory prior from token overlap and recent hits.
  2. Allocate retrieval budget per predicted directory.
  3. Run ripgrep/path scoring with directory-aware quotas.
  4. Backfill globally when predicted buckets underperform.
  5. Track planner hit-rate per query class.
- Minimal prototype path (<200 LOC, behind flag): candidate_generator/mod.rs, flag IXOS_EXPERIMENT_DIR_PLANNER.
- Kill test: planner bias causes more misses on out-of-distribution queries.
- Expected accuracy gain without p95 tail regression: narrows scan scope on average.

### ARCH-23
- Core insight: Represent anchors as lattice constraints (exact phrase > filename > path token > snippet token) and rank by highest satisfied tier.
- Targets: anchor miss.
- Why this might be 1D/2D novelty: partial-order anchor lattice used as ranking control variable.
- Mechanism steps:
  1. Define anchor tier levels.
  2. Assign each candidate highest satisfied tier.
  3. Rank first by tier, then by semantic score.
  4. Allow semantic override only within same tier.
  5. Emit tier labels in evidence.
- Minimal prototype path (<200 LOC, behind flag): progressive.rs ranking pass, flag IXOS_EXPERIMENT_ANCHOR_LATTICE.
- Kill test: tiering fails to improve exact anchor top-1/top-3 metrics.
- Expected accuracy gain without p95 tail regression: deterministic scoring augmentation only.

### ARCH-24
- Core insight: Treat retrieval channels as bandit arms (path, ripgrep, document, semantic-pure) with per-query adaptive pull budget.
- Targets: anchor miss, flash-pro inversion.
- Why this might be 1D/2D novelty: online explore/exploit budget policy for retrieval channel mix.
- Mechanism steps:
  1. Initialize per-channel priors by query features.
  2. Pull low-cost channels first.
  3. Update expected gain from observed witness improvements.
  4. Stop when confidence threshold met.
  5. Penalize expensive channels in reward.
- Minimal prototype path (<200 LOC, behind flag): wrapper in progressive.rs, flag IXOS_EXPERIMENT_CHANNEL_BANDIT.
- Kill test: channel exploration adds latency without measurable quality lift.
- Expected accuracy gain without p95 tail regression: cost-aware stopping keeps tail bounded.

### ARCH-25
- Core insight: Build a query-conditioned forbidden zone in embedding space around known sensitive distractors for benign intent.
- Targets: leak.
- Why this might be 1D/2D novelty: geometric exclusion zone for sensitive distractors in semantic ranking.
- Mechanism steps:
  1. Compute centroids for sensitive candidate embeddings.
  2. Under benign intent, penalize candidates within sensitive radius unless lexical witness exists.
  3. Keep explicit-sensitive bypass.
  4. Tune radius via failure-suite leak cases.
  5. Log zone-triggered suppressions.
- Minimal prototype path (<200 LOC, behind flag): semantic_engine.rs similarity adjustment, flag IXOS_EXPERIMENT_SENSITIVE_EMBED_ZONE.
- Kill test: benign leak remains or explicit-sensitive recall collapses.
- Expected accuracy gain without p95 tail regression: one extra distance check per candidate.

### ARCH-26
- Core insight: Generate counterfactual queries (“without secret”, “exact filename only”) and verify top-k consistency.
- Targets: leak, anchor miss.
- Why this might be 1D/2D novelty: self-consistency checking with counterfactual retrieval constraints.
- Mechanism steps:
  1. Build 1-2 deterministic counterfactual query variants.
  2. Re-score only top candidates under variants.
  3. Penalize candidates unstable across counterfactuals.
  4. Boost candidates stable under exactness variant.
  5. Skip when query already explicit-sensitive.
- Minimal prototype path (<200 LOC, behind flag): progressive.rs top-k verification, flag IXOS_EXPERIMENT_COUNTERFACTUAL_CHECK.
- Kill test: consistency signal does not correlate with failures.
- Expected accuracy gain without p95 tail regression: re-check over tiny candidate set.

### ARCH-27
- Core insight: Require provenance-chain completeness score before high placement in top-k.
- Targets: plausible wrong, anchor miss.
- Why this might be 1D/2D novelty: provenance completeness used as first-class ranking prior.
- Mechanism steps:
  1. Score candidates on evidence-chain completeness (lexical, semantic, path tags).
  2. Penalize high-score candidates with sparse provenance.
  3. Prioritize candidates with multi-source evidence.
  4. Cap provenance influence to avoid semantic collapse.
  5. Surface provenance score to UI debug.
- Minimal prototype path (<200 LOC, behind flag): progressive.rs evidence summary/rank hook, flag IXOS_EXPERIMENT_PROVENANCE_SCORE.
- Kill test: provenance scoring fails to reduce plausible wrong rate.
- Expected accuracy gain without p95 tail regression: reuses already computed evidence artifacts.

### ARCH-28
- Core insight: Add reversible ranking transitions so semantic phase can rollback if it worsens anchor/safety constraints.
- Targets: anchor miss, leak, flash-pro inversion.
- Why this might be 1D/2D novelty: transactional ranking with constraint-based rollback in progressive search.
- Mechanism steps:
  1. Snapshot lexical top-k with witnesses and safety tags.
  2. Apply semantic rerank transition.
  3. Evaluate delta against constraint rules.
  4. If violated, partially rollback offending moves.
  5. Emit rollback reason in status event.
- Minimal prototype path (<200 LOC, behind flag): progressive.rs around semantic publish, flag IXOS_EXPERIMENT_RANK_ROLLBACK.
- Kill test: rollback oscillates or hides true semantic improvements.
- Expected accuracy gain without p95 tail regression: no extra retrieval calls, only list-delta checks.

### ARCH-29
- Core insight: Compile structured query tokens into finite-state matcher and use it as high-precision candidate filter.
- Targets: anchor miss.
- Why this might be 1D/2D novelty: deterministic finite-state anchor enforcement layered atop fuzzy retrieval.
- Mechanism steps:
  1. Parse query into literals/operators/date tokens.
  2. Build finite-state matcher for required token sequences.
  3. Validate candidate previews/paths with matcher.
  4. Promote matches; demote non-matches for exact-like queries.
  5. Relax for paraphrase-intent queries.
- Minimal prototype path (<200 LOC, behind flag): candidate_generator/query_preprocess.rs + progressive.rs, flag IXOS_EXPERIMENT_FSM_ANCHOR_FILTER.
- Kill test: exact-literal cards do not improve despite matcher activation.
- Expected accuracy gain without p95 tail regression: finite-state checks are cheap string scans.

### ARCH-30
- Core insight: Use policy grammar for sensitive-intent detection instead of raw keyword heuristics.
- Targets: leak.
- Why this might be 1D/2D novelty: grammar-constrained intent parser feeding retrieval authorization.
- Mechanism steps:
  1. Define minimal sensitive-intent grammar (request verbs + secret object classes).
  2. Parse query into grammar tree.
  3. Derive authorization confidence from parse coverage.
  4. Apply graded sensitivity penalties by confidence.
  5. Keep fallback to keyword heuristic when parse fails.
- Minimal prototype path (<200 LOC, behind flag): sk_mode/intent_detector.rs + progressive.rs, flag IXOS_EXPERIMENT_SENSITIVE_GRAMMAR.
- Kill test: grammar confidence does not improve leak suppression over heuristic baseline.
- Expected accuracy gain without p95 tail regression: local parser costs are negligible.

### ARCH-31
- Core insight: Anytime retrieval with stopping certificate: stop only when anchor/safety confidence exceeds thresholds.
- Targets: anchor miss, leak, flash-pro inversion.
- Why this might be 1D/2D novelty: confidence-certified stopping replacing fixed-stage boundaries.
- Mechanism steps:
  1. Start with lexical candidate pass.
  2. Compute anchor confidence and leak risk.
  3. If uncertified, incrementally expand candidate/rerank depth.
  4. Stop when certified or timeout budget reached.
  5. Return certificate metadata with results.
- Minimal prototype path (<200 LOC, behind flag): progressive.rs control loop, flag IXOS_EXPERIMENT_ANYTIME_CERT_STOP.
- Kill test: certificate rarely achieved or worsens p95 without quality gain.
- Expected accuracy gain without p95 tail regression: early stop on easy queries protects median latency.

### ARCH-32
- Core insight: Use Flash-Pro disagreement as explicit risk signal and run targeted correction only on disputed items.
- Targets: flash-pro inversion, anchor miss.
- Why this might be 1D/2D novelty: disagreement-indexed correction path instead of full Pro refine.
- Mechanism steps:
  1. Compute overlap/disagreement on top-k between flash and pro scores.
  2. Isolate disputed candidates.
  3. Re-evaluate disputed set with lexical witness + evidence constraints.
  4. Apply local reorder only within disputed subset.
  5. Skip correction when disagreement is low.
- Minimal prototype path (<200 LOC, behind flag): progressive.rs refine section, flag IXOS_EXPERIMENT_DISAGREEMENT_LOCAL_FIX.
- Kill test: disputed-set correction fails to improve agreement@k or anchor top1.
- Expected accuracy gain without p95 tail regression: correction bounded to small disputed subset.

### ARCH-33
- Core insight: Build ephemeral query-time graph over candidates (shared entities/path neighborhoods) and re-rank by graph support.
- Targets: plausible wrong, anchor miss.
- Why this might be 1D/2D novelty: temporary graph coherence as rerank prior in local file retrieval.
- Mechanism steps:
  1. Construct graph nodes from top candidates.
  2. Add edges from shared terms, directory proximity, citations.
  3. Compute support centrality per node.
  4. Downweight isolated high-similarity outliers.
  5. Blend centrality with semantic score.
- Minimal prototype path (<200 LOC, behind flag): progressive.rs post-rerank graph scorer, flag IXOS_EXPERIMENT_QUERY_GRAPH_SUPPORT.
- Kill test: graph centrality correlates poorly with ground truth.
- Expected accuracy gain without p95 tail regression: tiny graph over top-N only.

### ARCH-34
- Core insight: Introduce restricted-aware hard negatives into online calibration to sharpen benign-query boundary.
- Targets: leak.
- Why this might be 1D/2D novelty: hard-negative boundary calibration performed online without retraining base embedder.
- Mechanism steps:
  1. Collect restricted candidates surfaced in benign queries.
  2. Build hard-negative feature bank.
  3. Apply additive penalty when candidate resembles hard negatives.
  4. Age out stale negatives.
  5. Protect explicit-sensitive path with bypass.
- Minimal prototype path (<200 LOC, behind flag): progressive.rs penalty bank, flag IXOS_EXPERIMENT_HARD_NEGATIVE_BOUNDARY.
- Kill test: leak rates unchanged after calibration window.
- Expected accuracy gain without p95 tail regression: feature-bank lookup on top candidates is cheap.

### ARCH-35
- Core insight: Split retrieval budget by directory entropy, giving more budget to uncertain high-entropy regions.
- Targets: anchor miss.
- Why this might be 1D/2D novelty: entropy-weighted budget allocation across directory topology.
- Mechanism steps:
  1. Compute entropy from query-term distribution across directories.
  2. Allocate larger candidate quotas to high-entropy dirs.
  3. Keep minimum quota for low-entropy dirs.
  4. Merge with witness-preserving policy.
  5. Track entropy-vs-hit correlations.
- Minimal prototype path (<200 LOC, behind flag): candidate_generator/path_engine.rs quota logic, flag IXOS_EXPERIMENT_ENTROPY_BUDGET_SPLIT.
- Kill test: entropy splitting increases misses on exact filenames.
- Expected accuracy gain without p95 tail regression: quota computation based on existing path index stats.

### ARCH-36
- Core insight: Add lexical signature hash checks to confirm anchor token presence before final emission.
- Targets: anchor miss, leak.
- Why this might be 1D/2D novelty: lightweight signature verification as final safety/anchor validator.
- Mechanism steps:
  1. Build per-candidate minhash of token windows.
  2. Compare with query anchor signature.
  3. Penalize low-overlap top candidates.
  4. Reward high-overlap candidates from lower ranks.
  5. Expose signature-overlap score for debugging.
- Minimal prototype path (<200 LOC, behind flag): progressive.rs top-k validator, flag IXOS_EXPERIMENT_SIGNATURE_VALIDATOR.
- Kill test: signature overlap fails to discriminate failures from passes.
- Expected accuracy gain without p95 tail regression: minhash on small snippets is low cost.

### ARCH-37
- Core insight: Use filesystem permission + gitignore provenance as retrieval-access prior to reduce unintended restricted surfacing.
- Targets: leak.
- Why this might be 1D/2D novelty: combines OS/file provenance signals into rank-access scoring.
- Mechanism steps:
  1. Extract read permission and ignore/provenance flags.
  2. Build access prior score.
  3. Penalize low-access-prior files in benign queries.
  4. Override for explicit-sensitive intent.
  5. Log provenance reasons in evidence.
- Minimal prototype path (<200 LOC, behind flag): candidate_generator/path_engine.rs metadata + progressive.rs, flag IXOS_EXPERIMENT_ACCESS_PRIOR.
- Kill test: leaks persist while benign recall drops.
- Expected accuracy gain without p95 tail regression: metadata lookups are cached/lightweight.

### ARCH-38
- Core insight: Replace absolute scoring with pairwise tournament where safety/anchor veto can defeat raw similarity.
- Targets: anchor miss, leak.
- Why this might be 1D/2D novelty: pairwise constrained tournament ranking in local semantic retrieval.
- Mechanism steps:
  1. Sample pairwise comparisons among top semantic candidates.
  2. Use comparator combining similarity, witness, sensitivity risk.
  3. Apply veto rules for obvious safety violations.
  4. Aggregate wins into final order.
  5. Limit tournament rounds for latency control.
- Minimal prototype path (<200 LOC, behind flag): progressive.rs alternative ranker, flag IXOS_EXPERIMENT_TOURNAMENT_RANK.
- Kill test: tournament gives unstable ordering across repeated runs.
- Expected accuracy gain without p95 tail regression: bounded rounds on top-k only.

### ARCH-39
- Core insight: For long files, extract anchor-first windows before embedding instead of generic head chunks.
- Targets: anchor miss.
- Why this might be 1D/2D novelty: query-anchored content slicing before embedding in rerank phase.
- Mechanism steps:
  1. Detect anchor positions in file previews.
  2. Build focused windows centered on anchors.
  3. Embed focused windows for similarity.
  4. Fallback to standard chunking when anchors absent.
  5. Cache focused windows per query session.
- Minimal prototype path (<200 LOC, behind flag): semantic_engine.rs read/extract path, flag IXOS_EXPERIMENT_ANCHOR_WINDOW_EMBED.
- Kill test: no improvement on long-document anchor cases.
- Expected accuracy gain without p95 tail regression: fewer, higher-signal chunks for top candidates.

### ARCH-40
- Core insight: Enforce monotonic rank update rule: semantic phase may only demote lexical anchors by bounded delta unless contradictory evidence exists.
- Targets: anchor miss, flash-pro inversion.
- Why this might be 1D/2D novelty: bounded monotonicity constraint between lexical and semantic ranks with evidence override.
- Mechanism steps:
  1. Capture lexical rank positions and anchor flags.
  2. After semantic rerank, compute demotion deltas.
  3. Clamp excessive demotions unless evidence contradiction threshold is met.
  4. Re-normalize final ranks.
  5. Emit clamped-demotion counts.
- Minimal prototype path (<200 LOC, behind flag): progressive.rs final rank combiner, flag IXOS_EXPERIMENT_BOUNDED_DEMOTION.
- Kill test: bounded demotion harms semantic paraphrase quality more than anchor gain.
- Expected accuracy gain without p95 tail regression: pure ranking rule, no extra retrieval phases.

## PHASE 9 - ITERATIVE LOOP

### CYCLE 1 - Bias Reset
- Over-focus risk identified: policy-gating and filter-only designs (already saturated by BAN-01/BAN-04/BAN-09).
- Constraint for new candidates: avoid pure ACL/filter/routing clones; prioritize verification/certification mechanics.

#### New Candidates (ARCH-41..ARCH-50)
- ARCH-41: Proof-carrying top-k result bundles with verifiable anchor/safety claims.
- ARCH-42: Lexical contradiction detector that blocks semantic promotions when contradiction evidence exists.
- ARCH-43: Interval-bound score certificates for rank displacement limits.
- ARCH-44: Query-family leak propensity memory as a safety prior for future ranking.
- ARCH-45: Suffix-automaton anchor matcher for punctuation-heavy exact literals.
- ARCH-46: Directory-entropy monotonic fusion controller with bounded update rule.
- ARCH-47: Primal-dual constrained top-k selector with explicit leak budget.
- ARCH-48: Bi-directional query-doc consistency score (query->doc and doc->query).
- ARCH-49: Uncertain-directory abstention with targeted micro-scan fallback.
- ARCH-50: Proof-carrying search events in streaming protocol.

### CYCLE 2 - Bias Reset
- Over-focus risk identified: certificate/proof language without practical low-latency path.
- Constraint for new candidates: keep mechanisms deployable under strict p95 budget.

#### New Candidates (ARCH-51..ARCH-60)
- ARCH-51: Constant-cost sentinel checks that estimate leak risk without second-pass retrieval.
- ARCH-52: Rank-jitter detector over repeated micro-queries to reject unstable top-k candidates.
- ARCH-53: Hybrid rank Jacobian approximation to detect over-sensitive candidates.
- ARCH-54: Dynamic contradiction cache keyed by query intent + path family.
- ARCH-55: Anchor-preserving permutation layer before secure ranker composition.
- ARCH-56: Multi-threshold emission (provisional, certified, finalized) with automatic demotion controls.
- ARCH-57: Counter-leak canary injection and canary-trigger penalties.
- ARCH-58: Latency-aware verifier that spends verification budget only on top-risk slots.
- ARCH-59: Metadata trust score learned from historical leak incidents.
- ARCH-60: Cross-model veto voting (flash/pro/lexical) with deterministic tie-break.

### CYCLE 3 - Bias Reset
- Over-focus risk identified: stability diagnostics that may become expensive second systems.
- Constraint for new candidates: only mechanisms that can run on top-k without extra corpus scans.

#### New Candidates (ARCH-61..ARCH-70)
- ARCH-61: Top-k witness quorum requirement (at least q evidence tags among first k).
- ARCH-62: Path-token adversarial detector for synthetic keyword-stuffing artifacts.
- ARCH-63: Softmax-temperature guardrail tuned by ambiguity class.
- ARCH-64: Structured-query compiler for quoted/date/operator intents with fallback fusion.
- ARCH-65: Leak-aware reciprocal-rank fusion with bounded sensitive exposure term.
- ARCH-66: Time-decayed violation memory that penalizes repeatedly leaking path clusters.
- ARCH-67: Streaming rank contract checker rejecting illegal stage transitions.
- ARCH-68: Minimal unsat-core extraction when top-k constraints conflict.
- ARCH-69: Two-pass tiny verifier using only snippets and path tokens.
- ARCH-70: Rank monotonicity ledger for post-hoc invariant auditing and online penalties.
