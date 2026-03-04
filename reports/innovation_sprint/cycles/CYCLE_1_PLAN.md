# CYCLE 1 PLAN

Generated: 2026-03-03 21:50 UTC

## Observe
- Failure atlas baseline (`16` cases) shows `2` failures:
  - `exact_anchor_results_streamed_flash`: misses obvious anchor `logs/app.log`, leaks `restricted/secret.txt`.
  - `semantic_drift_results_streamed_auto_secret`: leaks `restricted/secret.txt`.
- Volatility check is stable (`5x`, mean top1 flip `0.0`, mean Jaccard `1.0`), so failures are deterministic enough for intervention.
- Ralph Tier-C harsh baseline remains walk/ripgrep tail-sensitive; no evidence that trust issues come from random ordering noise.

## Orient
### Metrics for this cycle
- `AtlasPass`: passed cases / total cases.
- `TrustFailCount`: count of failures in `exact_anchor`, `semantic_drift`, `privacy_guard`.
- `RestrictedLeakCount`: cases where `restricted/secret.txt` appears in forbidden top-k.
- `RalphTotalP95`: Tier-C harsh `total_p95_ms`.

### Success thresholds (set before act)
- Improve `AtlasPass` without increasing `TrustFailCount`.
- Reduce `RestrictedLeakCount` from `2` to `<=1`.
- Keep core test matrix green.
- Avoid product-code refactor in first cycle (reports-only feasibility check).

## Diverge (10 approaches)

1. `Witness-Guard Rerank` (retrieval grounding):
   Re-rank an expanded pool with lexical witness bonus and restricted-path penalty unless query explicitly requests sensitive terms.
   Expected: fewer anchor misses and fewer privacy leaks.
   Risk: over-penalize semantically valid but weak-lexical files.
   Kill test: if anchor recall does not improve on failing cases.

2. `Counterfactual Anchor Drop Test` (calibration):
   Remove each top lexical witness candidate and check rank stability; high instability implies fragile trust.
   Expected: measurable trust score for UI badge.
   Risk: extra compute.
   Kill test: no correlation between instability and user-visible errors.

3. `Candidate Pool Expansion on Uncertainty` (controller):
   Increase lexical candidate limit only when top-k entropy/gap signals are weak.
   Expected: recover false negatives without always paying latency.
   Risk: tail latency spikes.
   Kill test: p95 latency rises >15% for <=1% quality gain.

4. `Restricted-Path Soft Firewall` (safety/trust):
   Add path-class penalty for restricted directories unless query has explicit sensitive anchors.
   Expected: eliminate privacy drift.
   Risk: blocks legitimate access patterns.
   Kill test: explicit secret-request cases regress.

5. `BM25-ish Lexical Witness Score in Final Rank` (fusion):
   Inject explicit lexical witness channel into final score breakdown with capped weight.
   Expected: top-k grounding improvement.
   Risk: semantic relevance suppressed for paraphrases.
   Kill test: drop in semantic-only query success.

6. `Anytime Stop/Refine Gate via Confidence Sequences` (routing):
   Replace fixed heuristic refine signals with bounded confidence stop rule.
   Expected: lower average latency on easy queries.
   Risk: calibration drift under dataset shift.
   Kill test: increase in uncertainty misclassification on failure atlas.

7. `Directory Topology Prior Reweighting` (structure-aware):
   Amplify directory priors when query contains path-like anchors.
   Expected: improved file/path precision.
   Risk: bias against cross-directory semantic hits.
   Kill test: reduced recall on broad conceptual queries.

8. `OS-Journal Delta Candidate Cache` (filesystem acceleration):
   Feed incremental changed-file set into candidate generator to cut repeated walk costs.
   Expected: TTFR and p95 reductions in large trees.
   Risk: stale cache correctness bugs.
   Kill test: mismatch between full walk and incremental universe.

9. `Dual-Witness Badge` (UX truthfulness):
   Show lexical witness + semantic witness separately and suppress strong semantic claims when lexical witness is absent.
   Expected: fewer trust failures even when ranking is imperfect.
   Risk: UX complexity.
   Kill test: no measurable reduction in trust-failure complaints.

10. `Bandit Mode Router` (compute-aware controller):
    Contextual bandit chooses flash/auto/pro and candidate depth by query hardness.
    Expected: better speed-quality frontier.
    Risk: unstable policy and cold-start behavior.
    Kill test: no Pareto improvement after offline replay.

## Converge

### Rubric (1-5, higher is better)
| Idea | Impact | Novelty | Impl risk | Measurement clarity | Invariant alignment | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Witness-Guard Rerank | 4 | 3 | 4 | 5 | 5 | 21 |
| Restricted-Path Soft Firewall | 4 | 2 | 4 | 5 | 5 | 20 |
| Counterfactual Anchor Drop Test | 3 | 4 | 3 | 4 | 5 | 19 |
| Candidate Expansion on Uncertainty | 3 | 3 | 3 | 4 | 4 | 17 |

### Selected for ACT
- Primary: `Witness-Guard Rerank` (reports-only prototype).
- Secondary (not implemented this cycle): `Counterfactual Anchor Drop Test`.

## Act
- Implemented non-invasive prototype script:
  - `reports/innovation_sprint/cycles/cycle_1_witness_guard_prototype.py`
- Kept product runtime unchanged; no `src/` behavior change yet.

## If Pablo Has Only 2 Hours, Do This Next
1. Implement witness-guard inside `progressive.rs` behind env flag `IXOS_EXPERIMENT_WITNESS_GUARD=1` with default `off`.
2. Re-run failure atlas + Ralph and accept only if trust failures drop with <=10% p95 regression.
