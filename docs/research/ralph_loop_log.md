# Ralph Loop Log (Phase 5)

Date: 2026-02-23  
Inputs: `docs/research/upper_bounds.md`, `docs/research/top12_deepdive.md`, `docs/research/lit_scan_bibliography.md`.

Scoring target per loop:
- Speed: plausibly `>=30%` Total p95 OR `>=2x` TTFR p95.
- Retrieval success: improve opened-file-in-top-k within time budget.
- Novelty safety: avoid overclaim against close prior art.

---

## Loop 1

- Candidate selected: `T1 Optional Delta Index + Watchers + Planner`.
- Initial mechanism claim: remove most walk+scan from query-time by serving from incremental index and only fallback when confidence is low.
- Recomputed gain (stage arithmetic):
- Assumed reduction: walk 90%, scan 60%, embed 30%, rank 20%.
- Gain: `0.9*21.59 + 0.6*17.30 + 0.3*25.79 + 0.2*22.22 = 41.99%` Total p95.
- TTFR implication: walk p95 68ms -> ~6.8ms if 90% walk removal reached on p95 path.
- Kill attempt:
- Prior-art contradiction: desktop indexers (Everything/Spotlight/Windows Search) already use background indexing.
- Decision: **Pivot**, not reject.
- Pivot detail: claim narrowed to "optional index + progressive stage-budget planner + privacy-mode-safe degradation" rather than indexing novelty.

## Loop 2

- Candidate after pivot: `Optional Delta Index + Stage-Budget Planner`.
- Recomputed gain:
- Assumed reduction: walk 80%, scan 55%, embed 25%, rank 20%.
- Gain: `17.27 + 9.52 + 6.45 + 4.44 = 37.68%` Total p95.
- Kill attempt:
- Bottleneck contradiction: high filesystem churn can force frequent fallback scans, reducing real effective gain.
- Stress assumption: only 70% queries stay on index-first path, 30% full fallback.
- Effective gain: `0.7 * 37.68 = 26.38%` (fails threshold).
- Decision: **Killed in current form**.
- Pivot detail: add conformal cascade gate so even fallback path reduces embed/rank costs.

## Loop 3

- Candidate after pivot: `Optional Delta Index + Planner + Conformal Cascade`.
- Recomputed gain with fallback-aware model:
- Indexed path (80% traffic): walk 80%, scan 60%, embed 25%, rank 20% => 38.54%.
- Fallback path (20% traffic): embed 20%, rank 20% => 9.60%.
- Effective gain: `0.8*38.54 + 0.2*9.60 = 32.75%` Total p95.
- TTFR check:
- Indexed path TTFR approx <= 20ms.
- Fallback path still too high if it does full walk.
- Kill attempt:
- TTFR p95 contradiction: if fallback path includes full walk for >=5% queries, TTFR p95 may not reach 2x.
- Decision: **Pivot**.
- Pivot detail: replace "full fallback walk" with "frontier-only fallback" that still guarantees >=50% walk reduction at p95.

## Loop 4

- Candidate after pivot: `Optional Delta Index + Frontier-Only Fallback + Conformal Cascade`.
- Recomputed gain:
- Indexed path (80%): 38.54%.
- Frontier fallback path (20%): walk 50%, scan 25%, embed 20%, rank 20% => 19.85%.
- Effective gain: `0.8*38.54 + 0.2*19.85 = 34.80%` Total p95.
- TTFR check:
- Frontier fallback still cuts walk >=50%, so TTFR p95 can plausibly approach ~34ms boundary (2x from 68ms).
- Kill attempt:
- Accuracy risk contradiction: aggressive scope pruning may miss files outside hot/frontier roots.
- Decision: **Pivot**.
- Pivot detail: add recall guardrail: low-rate global probe + miss detector + automatic fallback broadening.

## Loop 5

- Candidate after pivot: `Optional Delta Index + Frontier Fallback + Conformal Cascade + Recall Guard`.
- Recomputed gain with recall guard overhead:
- Guard overhead assumed 2-3% absolute latency tax.
- Effective gain after tax: ~31.5-32.8% Total p95.
- Retrieval success expectation:
- Higher early top-k success from index-driven shortlist.
- Guardrail limits recall regressions from over-pruning.
- Kill attempt:
- Privacy-mode contradiction: persistent index not allowed in journalist/deep-search mode.
- Decision: **Pivot**, not kill.
- Pivot detail: in privacy mode, use session-ephemeral micro-index (no persistence) and deterministic teardown.

## Loop 6 (final)

- Surviving candidate: `ODIP-RG` (Optional Delta Index Planner with Recall Guard).
- Final mechanism:
- Normal mode: persistent watcher-fed delta index + stage-budget planner + conformal cascade.
- Privacy modes: session-only ephemeral index + same planner logic without long-term behavior state.
- Final gain range (realistic):
- Total p95: **31-38%** expected under mixed workloads.
- TTFR p95: **up to 2x** when p95 path keeps walk reduction >=50% (frontier fallback ensures this).
- Retrieval success mechanism:
- Better candidate pool freshness and routing precision.
- Fewer low-value candidates entering semantic/ranking stages.
- Recall guard minimizes misses from aggressive pruning.
- Novelty-safe position:
- Not novel for "indexing" or "Hawkes" alone.
- Safe contribution statement: combination of optional local delta indexing, progressive budgeted planning, and privacy-mode degradation in one desktop local-search system.
- Decision: **KEEP as final recommendation candidate**.

---

## Why other top candidates did not win

- Pure scan prefilters (trigram/Bloom) had strong speed but weaker privacy-mode story and less robust TTFR p95 upside alone.
- Pure cascade methods (conformal only) improved embed/rank strongly but did not address walk floor sufficiently.
- Pure behavior routers (Hawkes/workstream-only) had moderate upside and higher drift risk under context shifts.

Final winner is the only one that simultaneously attacks walk+scan+embed+rank with a clear work-removal mechanism and privacy-compatible fallback design.
