# PRIOR COMPARISON

Generated: 2026-03-04
Prerequisite satisfied: completed two independent cycles before reading prior innovation artifacts.
Compared against: `reports/innovation_sprint/*`.

## What We Rediscovered
1. Witness/trust guard concept was already explored previously.
- Prior: witness-guard controller and restricted-path penalties (`reports/innovation_sprint/03_NOVELTY_MATRIX.md`, cycle docs).
- Current sprint: rediscovered as trust-aware escalation/gating and witness-weighted fusion.

2. Risk-aware refine/escalation idea was already present in prior framing.
- Prior: RCAR (risk-calibrated anytime refine).
- Current sprint: `risk_budget_v1/v2` controller prototypes in atlas runner.

3. Same core tradeoff reappears.
- Prior and current both observe trust gains can come with tail-latency penalties if heavy path is called synchronously.

## What Is Truly New In This Sprint
1. Explicit trust-failure formalization and metric split in the harness.
- Added `AnchorTop1Hit@1` and `PlausibleWrong@k` (distinct from hit@k).
- Prior artifacts emphasized pass/fail and leak counts; this sprint introduces top1 trust failure accounting directly in cycle gates.

2. Budgeted escalation Pareto sampling in one controlled harness.
- Measured multiple policy points:
  - baseline
  - risk_v1
  - risk_v2 (25%)
  - risk_v2 (3%)
- This produced a clear speed-trust frontier with escalation call-rate as an explicit control variable.

3. Deterministic 30-case atlas with category balance and 5x stability baked into runner.
- Prior atlas had smaller scope and different case taxonomy.
- Current atlas separates anchor/paraphrase/privacy/ambiguous stress with deterministic isolated execution.

## Old Ideas We Now Reject
1. Synchronous heavy-path fallback as default trust fix.
- Rejected again by measured p95 tails.

2. Treating hit@k as sufficient trust signal.
- Rejected; top1 plausible-wrong remains visible even when hit@k is perfect.

3. Extremely low escalation budgets as effective trust strategy.
- Budget ~3% restored latency but erased trust gains; not useful beyond control baseline.

## Updated Position
- Keep witness/trust concepts, but shift novelty claim toward formal constrained optimization and confidence-bound control, not heuristic fallback routing.
- Next experiments should prioritize score-level trust constraints and uncertainty stopping that avoid synchronous Pro latency spikes.
