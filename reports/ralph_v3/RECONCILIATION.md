# RECONCILIATION (Phase 8)

## Scope reviewed
- reports/ralph/research_notes_20260213.md
- reports/ralph/iteration_20_20260303_225705.md
- reports/ralph/iteration_21_20260303_233530.md
- reports/ralph/comparison_21_20260303_233530.md

## Duplicate idea families found
1. Flash-first with uncertainty-triggered escalation appears in prior notes (Self-RAG/FLARE framing).
   - Duplicates ARCH-08 / ARCH-12 / ARCH-24 / ARCH-31 concept family.
2. Tight quality+latency dual gating already established in prior loop process.
   - Supports gatekeeper veto against heavy/unstable survivors.
3. Existing loop artifacts already report query-level regressions and stage-p95 regressions.
   - Reinforces requirement that novelty candidates must preserve p95/TTFR constraints.

## Contradictions detected
- Failure suite (eports/innovation/failure_suite/results_latest.md) still shows Flash/Auto anchor+leak regressions for esults streamed while newer atlas packs show broad pass rates.
- Interpretation: current mechanisms likely overfit to synthetic card distributions; global robustness remains uncertain.

## Negative evidence harvested
- Iteration 20 failed harsh gate (cold TTFR p50 regression) and iteration 21 still showed total p95 regression despite median improvements.
- This supports rejecting high-complexity candidate architectures without clear accuracy win.

## Citations merged from prior Ralph notes
- MTEB (2022) and BEIR (2021) benchmark framing.
- Self-RAG (2023) and FLARE (2023) adaptive retrieval methods.

## Reconciliation outcome
- No previously reviewed artifact provided strong novelty evidence for current survivors.
- Prior notes mostly strengthen BANLIST collapses for adaptive routing/cascade families.
