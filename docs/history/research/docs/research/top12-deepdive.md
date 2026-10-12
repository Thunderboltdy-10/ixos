# Top 12 Deep Dives (High-Headroom Only)

Date: 2026-02-23  
Selection gate: each candidate has plausible headroom for `>=30% Total p95` OR `>=2x TTFR p95`, plus measurable retrieval-success improvement.

## Shortlist summary

| ID | Candidate | Stage reduction target | Theoretical headroom from upper bounds |
|---|---|---|---|
| T1 | Optional Delta Index + Watchers + Planner | walk, scan, embed | ~38-48% Total p95 and >=2x TTFR p95 (if walk mostly off critical path) |
| T2 | Trigram/Bloom Scan Elimination | scan, embed, rank | ~31-41% Total p95 |
| T3 | Learned Cost-Based Query Planner | walk, scan, embed, rank | ~35-52% Total p95 |
| T4 | Conformal Cascade Early Exit | embed, rank, scan | ~30-39% Total p95 |
| T5 | Block-Max/WAND Lexical Pruning + Adaptive Top-k | scan, rank, embed | ~30-35% Total p95 |
| T6 | Hybrid Sparse-Dense Preselector (RRF) | scan, embed, rank, walk | ~31-35% Total p95 |
| T7 | Workstream-Scoped First Pass + Global Fallback | walk, scan, embed, rank | ~35-43% Total p95 and up to 2x TTFR cohort-level |
| T8 | Cost-Aware Hawkes Folder Router | walk, scan, embed | ~34-39% Total p95 and up to 2x TTFR cohort-level |
| T9 | ANN Reuse Cache + Approximate Rerank | embed, rank, scan | ~31-36% Total p95 |
| T10 | Latency Knapsack Stage Allocator | walk, scan, embed, rank | ~30-48% Total p95 |
| T11 | Session Ephemeral Micro-Index (privacy mode) | walk, scan, embed | ~30-36% Total p95 in-session and strong privacy-mode UX |
| T12 | On-Device Contextual Bandit Mode+Budget Router | walk, scan, embed, rank | ~30-40% Total p95 after convergence |

## T1) Optional Delta Index + Watchers + Planner

- Core idea: maintain an optional local delta index (postings + path map) using filesystem watchers and route most queries to index lookup instead of full walk+grep.
- Math foundation: cost-constrained optimization. Maximize `E[success@k,t] - lambda*latency` under stage-cost budget with a fallback constraint.
- Systems mechanism: journal events update index incrementally; query planner executes `index lookup -> confidence test -> fallback scan only if needed`, removing walk and broad scan from hot path.
- Integration points: `CandidateGenerator::build_index`, `CandidateGenerator::generate`, `CandidateGenerator::generate_streaming`, `search_progressive` in [progressive.rs](/C:/Users/pablo/Downloads/Ixos/src/ixos_rank/progressive.rs).
- Telemetry needed: index hit-rate, stale-hit rate, fallback frequency, opened-file@k-in-time, TTFR/Total stage ms. Privacy degradation: disable persistence in journalist mode and run session-only index.
- Evaluation plan: baseline Ixos vs recency-scope heuristic vs T1. Stratify by cold/warm cache and high-churn repos. Primary metrics: TTFR p95, Total p95, opened-file-in-top-k within 1s/2s.
- Novelty audit:
- Windows Search indexing docs and Spotlight docs show indexing pattern but not Ixos-style progressive cascade + privacy fallback.
- Watchman/inotify/USN docs show watcher mechanics, not retrieval planner design.
- Lucene NRT explains incremental index serving, not local-first progressive file-search constraints.
- Honest risks: index staleness and watcher drop events can hurt recall. Fails under rapid mass rename unless fallback scan is robust.

## T2) Trigram/Bloom Scan Elimination Layer

- Core idea: build lightweight trigram postings and Bloom sketches so ripgrep runs only on plausibly matching files.
- Math foundation: probabilistic filtering; optimize false-positive rate `p` vs CPU/memory to minimize expected scan cost.
- Systems mechanism: `query -> trigram candidate file set -> Bloom confirmation -> ripgrep only on survivors`; cut scan fanout and downstream embedding/ranking workload.
- Integration points: `ripgrep_funnel` and candidate merge path in [mod.rs](/C:/Users/pablo/Downloads/Ixos/src/ixos_rank/candidate_generator/mod.rs), semantic stage in [semantic_engine.rs](/C:/Users/pablo/Downloads/Ixos/src/ixos_rank/semantic_engine.rs).
- Telemetry needed: filter pass rate, false-negative audits, scan bytes avoided, candidate quality at K. Privacy degradation: sketches can be session-only in deep-search.
- Evaluation plan: compare no-filter, trigram-only, trigram+Bloom. Evaluate high-entropy vs low-entropy query classes.
- Novelty audit:
- Russ Cox trigram indexing and Zoekt already show trigram speedups.
- Everything/Code-search systems use prefiltering patterns.
- Ixos contribution would be integration with progressive stream + privacy-mode switch.
- Honest risks: false negatives if tokenizer mismatch is wrong. Fails on very short/regex-like queries unless bypass rules exist.

## T3) Learned Cost-Based Query Planner

- Core idea: learned planner chooses stage sequence and budgets per query (`walk/scan/embed/rank`) using predicted gain-per-ms.
- Math foundation: constrained Markov decision process / cost-based policy optimization.
- Systems mechanism: pre-query feature extraction (query stats, repo stats, cache state), then choose one of several plans; expensive stages are skipped when marginal gain is low.
- Integration points: `ProgressiveSearchConfig`, `search_progressive`, `should_refine`, mode resolution in [search.rs](/C:/Users/pablo/Downloads/Ixos/src-tauri/src/commands/search.rs).
- Telemetry needed: predicted vs realized latency, plan regret, quality delta, fallback-trigger rate. Privacy degradation: planner runs with non-personal features when privacy mode is on.
- Evaluation plan: baseline static pipeline vs hand heuristic planner vs learned planner. Add regret and SLA violation metrics.
- Novelty audit:
- System R (classical CBO), Neo, Bao establish learned planning foundations.
- Retrieval literature has stage-aware heuristics but less local-desktop privacy framing.
- Novelty should be phrased as local-progressive constrained planning, not optimizer novelty.
- Honest risks: policy drift and unstable plans. Fails if offline labels are not representative.

## T4) Conformal Cascade Early Exit

- Core idea: use conformal confidence bounds to decide whether to run/continue semantic and Pro refine stages.
- Math foundation: conformal prediction and selective classification under risk control.
- Systems mechanism: after lexical and early semantic batches, compute uncertainty. If confidence in top-k is high, stop embedding/ranking early.
- Integration points: `should_refine`, `rank_semantic_candidates`, streaming batches in [progressive.rs](/C:/Users/pablo/Downloads/Ixos/src/ixos_rank/progressive.rs).
- Telemetry needed: uncertainty distribution, false-stop rate, quality loss tails, savings in embed/rank ms. Privacy degradation: same logic works without personal features.
- Evaluation plan: current gate vs conformal gate at several risk levels. Report latency-quality Pareto and coverage.
- Novelty audit:
- Multi-stage retrieval early-exit and tail-latency papers are close.
- Ixos-specific part is calibration under progressive streaming and privacy fallback.
- Prior art means no "first" claim; claim should be risk-controlled cascade for local file search.
- Honest risks: bad calibration on rare queries. Fails if nonstationary workloads drift without recalibration.

## T5) Block-Max/WAND Pruning + Adaptive Top-k

- Core idea: dynamic pruning for lexical scoring plus adaptive top-k handoff to semantic reranker.
- Math foundation: upper-bound pruning (WAND/BMW) and adaptive budget allocation.
- Systems mechanism: skip scoring non-competitive docs, pass only promising candidates to semantic stage, shrink ranking work.
- Integration points: lexical scoring path and candidate cap in [mod.rs](/C:/Users/pablo/Downloads/Ixos/src/ixos_rank/candidate_generator/mod.rs), semantic rerank entry in [semantic_engine.rs](/C:/Users/pablo/Downloads/Ixos/src/ixos_rank/semantic_engine.rs).
- Telemetry needed: postings visited, pruned docs, recall@candidate-set, downstream embed/rank ms.
- Evaluation plan: compare fixed full lexical score vs BMW pruning vs BMW+adaptive top-k.
- Novelty audit:
- WAND and Block-Max WAND are established.
- New value is combining with Ixos progressive stream and Auto/Pro gating.
- Risk of overclaim if positioned as algorithm novelty.
- Honest risks: pruning aggressiveness can hurt recall on rare-term queries.

## T6) Hybrid Sparse-Dense Preselector (RRF)

- Core idea: run sparse retrieval and dense retrieval in parallel lightweight mode, fuse with RRF, and rerank only fused shortlist.
- Math foundation: rank fusion (RRF) and multi-objective candidate set optimization.
- Systems mechanism: reduces broad scan and unnecessary embedding/ranking by improving first-stage candidate quality.
- Integration points: candidate merge and priors in [mod.rs](/C:/Users/pablo/Downloads/Ixos/src/ixos_rank/candidate_generator/mod.rs), fusion in [progressive.rs](/C:/Users/pablo/Downloads/Ixos/src/ixos_rank/progressive.rs).
- Telemetry needed: sparse/dense overlap, fused shortlist recall@k, marginal gain per stage.
- Evaluation plan: lexical-only vs dense-only vs hybrid-RRF with fixed latency budgets.
- Novelty audit:
- RRF, BEIR, SPLADE/ColBERT papers and Vespa/Elastic docs cover hybrid retrieval.
- Ixos novelty angle is local-first, stage-budgeted progressive deployment.
- Honest risks: extra first-stage complexity may negate gains on tiny corpora.

## T7) Workstream-Scoped First Pass + Global Fallback

- Core idea: use current workstream/session state to run a narrow, high-probability first pass, then broaden only if confidence is low.
- Math foundation: hidden/semi-Markov state model over workstreams with confidence-triggered expansion.
- Systems mechanism: cuts walk+scan first-pass scope and often avoids heavy semantic work when early confidence is high.
- Integration points: workstream clustering in [workstreams/mod.rs](/C:/Users/pablo/Downloads/Ixos/src/workstreams/mod.rs), activity signals in [activity_ledger/mod.rs](/C:/Users/pablo/Downloads/Ixos/src/activity_ledger/mod.rs), planner in [progressive.rs](/C:/Users/pablo/Downloads/Ixos/src/ixos_rank/progressive.rs).
- Telemetry needed: first-pass success rate, expansion trigger rate, context-shift errors.
- Evaluation plan: global-only baseline vs workstream-first with rollback, stratified by query reformulation sessions.
- Novelty audit:
- Session/search personalization literature exists.
- Workstream abstractions exist in Ixos but not yet used as explicit budgeted routing.
- Honest risks: misclassified workstream causes misses. Fails on cross-project broad queries unless fallback is quick.

## T8) Cost-Aware Hawkes Folder Router

- Core idea: model folder-intensity from user events and combine with estimated stage cost to choose next folders to search.
- Math foundation: marked Hawkes process + knapsack-style budget selection.
- Systems mechanism: reduces walk and scan in low-yield folders; lowers embedding work by improving candidate precision.
- Integration points: folder priors and candidate ordering in [mod.rs](/C:/Users/pablo/Downloads/Ixos/src/ixos_rank/candidate_generator/mod.rs), refine decision in [progressive.rs](/C:/Users/pablo/Downloads/Ixos/src/ixos_rank/progressive.rs).
- Telemetry needed: folder-hit precision, intensity drift, fallback recall.
- Evaluation plan: baseline vs recency heuristic vs Hawkes router with matched budgets.
- Novelty audit:
- Hawkes personalized search exists (IEEE TBDATA 2024).
- Novelty-safe framing is systems integration with local progressive privacy constraints.
- Honest risks: overfit to recent bursts. Fails for new users and abrupt context switches unless reset logic exists.

## T9) ANN Reuse Cache + Approximate Rerank

- Core idea: maintain reusable embedding index for hot files and do approximate rerank first; exact rerank only on uncertain margin cases.
- Math foundation: ANN search and margin-based selective refinement.
- Systems mechanism: shrinks embedding and ranking compute by avoiding full exact scoring for all candidates.
- Integration points: embedding cache/index path in [semantic_engine.rs](/C:/Users/pablo/Downloads/Ixos/src/ixos_rank/semantic_engine.rs), mode/caching controls in [search.rs](/C:/Users/pablo/Downloads/Ixos/src-tauri/src/commands/search.rs).
- Telemetry needed: ANN recall@k, margin-trigger frequency, exact-rerank fallback rate, warm/cold cache delta.
- Evaluation plan: exact-only rerank vs ANN-first rerank with uncertainty threshold sweeps.
- Novelty audit:
- ANN and late interaction acceleration (ColBERTv2/PLAID) are prior art.
- Ixos contribution would be stage-cascade integration + privacy-mode cache semantics.
- Honest risks: ANN approximation errors can degrade critical queries if margin thresholds are weak.

## T10) Latency Knapsack Stage Allocator

- Core idea: per query, allocate a fixed latency budget across walk/scan/embed/rank based on predicted gain per millisecond.
- Math foundation: 0/1 or fractional knapsack with learned gain estimates.
- Systems mechanism: explicitly prevents one stage from consuming full budget; high-yield operations execute first.
- Integration points: `ProgressiveSearchConfig` and stream loop in [progressive.rs](/C:/Users/pablo/Downloads/Ixos/src/ixos_rank/progressive.rs), candidate stage timers in instrumentation.
- Telemetry needed: stage utility estimates, budget exhaustion causes, success-under-budget metric.
- Evaluation plan: fixed timeouts baseline vs knapsack allocator across query families.
- Novelty audit:
- Budgeting exists in systems and retrieval literature.
- Novelty-safe claim: unified stage-budget control in local progressive desktop retrieval.
- Honest risks: utility model errors produce wrong budget splits. Fails under unseen query classes without fallback safeguards.

## T11) Session Ephemeral Micro-Index (Privacy Mode)

- Core idea: in journalist/deep-search mode, build a temporary session micro-index to avoid repeated walk/scan while preserving zero-retention semantics.
- Math foundation: online indexing with bounded-lifetime state and deterministic teardown.
- Systems mechanism: first query pays setup cost, subsequent session queries run near indexed speed; index is destroyed at session end.
- Integration points: privacy mode controls in [PROJECT_GUIDE.md](/C:/Users/pablo/Downloads/Ixos/docs/PROJECT_GUIDE.md), search mode/cache handling in [search.rs](/C:/Users/pablo/Downloads/Ixos/src-tauri/src/commands/search.rs).
- Telemetry needed: in-session warmup curve, teardown verification, privacy mode residual-state checks.
- Evaluation plan: privacy baseline (no persistence) vs ephemeral micro-index across multi-query sessions.
- Novelty audit:
- Session caches are known; privacy-preserving personalization is known.
- Combination with strict zero-retention + progressive stage targets is less documented.
- Honest risks: first-query cold penalty and memory spikes in large repos.

## T12) On-Device Contextual Bandit Mode+Budget Router

- Core idea: on-device bandit chooses `Flash/Auto/Pro` and stage budgets using local context features and reward combining success + latency.
- Math foundation: contextual bandits (LinUCB/Thompson) with constrained action set.
- Systems mechanism: reduces overuse of heavy modes and stages while preserving quality through exploration-exploitation.
- Integration points: mode resolution and ask-mode logic in [search.rs](/C:/Users/pablo/Downloads/Ixos/src-tauri/src/commands/search.rs), refine path in [progressive.rs](/C:/Users/pablo/Downloads/Ixos/src/ixos_rank/progressive.rs).
- Telemetry needed: reward proxy (`opened_file_topk_within_t`), regret estimates, mode-switch outcomes.
- Evaluation plan: static policy baseline vs heuristic router vs bandit router under identical workloads.
- Novelty audit:
- Contextual bandits are established.
- Novelty-safe angle: privacy-mode aware, local-only, progressive desktop routing with explicit fallback.
- Honest risks: exploration penalties for users and nonstationarity in habits.

## Cross-candidate evaluation design (shared)

- Metrics:
- TTFR p50/p95
- Total p50/p95
- Stage p50/p95 (walk, scan, embed, rank)
- opened-file-in-top-k within 1s and 2s
- MRR@10, Recall@10
- Method:
- Same query suites and corpora for all candidates.
- Compare baseline Ixos, strong heuristic baseline, and each candidate.
- Include cold and warm cache splits.
- Report confidence intervals across repeated runs.

## Filter outcome

- Candidates retained for Phase 5 because they have clear work-removal mechanisms and headroom beyond "~10% faster".
- Candidates rejected from top-12 at this stage were mostly micro-optimizations that could not clear 30% Total p95 or 2x TTFR p95 under realistic assumptions.
