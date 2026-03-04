# 03 Novelty Matrix

Generated: 2026-03-04
Input bibliography: `reports/innovation_sprint_vnext/02_BIBLIOGRAPHY.md`
Rule: if an idea is only a rename of known method, mark `KILL`.

| Candidate Idea | Closest Prior Art | What Is Different In Ixos | Kill Test | EE Framing Verdict |
| --- | --- | --- | --- | --- |
| Risk-Budgeted Escalation (Flash->Pro) with explicit trust penalties | Cascade ranking, dynamic early-exit, selective reranking | Adds local-first privacy constraints + bounded escalation budget + trust objective (plausible-wrong and leak penalties) in one controller | If fixed-threshold heuristic performs identically and no budget/trust frontier appears | KEEP (system-level novelty via constrained multi-objective control) |
| Confidence-Sequence Compute Allocation | Anytime retrieval, uncertainty stopping | Use confidence sequences to bound risk of anchor miss while minimizing expected latency under private local corpus | If empirical risk bounds are vacuous or calibration fails under shift | INVESTIGATE |
| Constrained Trust-Relevance Lagrangian | Multi-objective ranking, fairness constraints | Optimize relevance score minus lambda*(leak risk + anchor miss risk + instability), with lambda adapted by query risk | If static lambda dominates and no measurable trust reduction | KEEP |
| Counterfactual Stability Regularizer for local search | Counterfactual LTR, robust ranking | Penalize score sensitivity to perturbations (query typo, paraphrase, path-noise) measured on local corpus variants | If robustness regularizer hurts recall with no stability gain | KEEP |
| BlockMaxWAND + topology-aware block priors | WAND/BlockMaxWAND | Integrate directory/workstream priors into block upper bounds for candidate skipping in local trees | If skip rate does not improve p95 without recall drop | KEEP |
| Witness-Chain Verification Before promotion | Grounded retrieval and evidence chaining | Require lightweight witness chain (anchor/snippet/path evidence) before allowing top1 promotion on risky queries | If witness chain only reorders noise and does not reduce plausible-wrong | KEEP |
| Query Performance Prediction (QPP) as escalation trigger | QPP in IR | QPP drives budgeted model escalation and candidate width for local private corpora | If QPP scores are not predictive of failures in atlas | KEEP |
| ANN sidecar for warmed embeddings with privacy-safe gating | ANN/HNSW/IVF retrieval | Optional local ANN sidecar only when explicitly enabled, preserving zero-index default and strict local scope | If ANN sidecar breaks privacy posture or increases cold TTFR | INVESTIGATE |
| Topology Matryoshka Routing | Matryoshka embeddings | Use directory topology as routing prior across dimensions/models (cheap->expensive) | If topology prior overfits folder naming and hurts cross-folder recall | INVESTIGATE |
| IO-Scheduler Coupled Candidate Scan | OS/filesystem optimization | Couple ripgrep/path walk concurrency to observed storage pressure and query risk | If IO adaptation adds overhead without tail gain | INVESTIGATE |
| Lexical Witness Guard 2.0 with calibrated penalties | Heuristic witness reweighting | Replace fixed boosts with calibrated probability of anchor validity, plus uncertainty intervals | If calibration does not improve anchor top1 hit or trust failures | KEEP |
| Pure-Pro default in Ask mode | Existing fallback pattern | None (already-known expensive path) | If this is proposed as novelty, reject immediately | KILL (rename-only / non-novel) |

## Top-2 by Self-Consistency Voting
Independent rankings (3 passes) consistently selected:
1. Risk-Budgeted Escalation with trust penalties.
2. Constrained Trust-Relevance Lagrangian with stability regularization.

Reason: both connect directly to measurable Ixos pain points (p95 tails + plausible-wrong failures) and admit formal analysis (constraints, regret/bounds, dual variables).
