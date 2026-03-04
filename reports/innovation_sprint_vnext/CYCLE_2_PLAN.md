# CYCLE 2 PLAN

Date: 2026-03-04

## Observe
1. Cycle 1 trust gains are strong but p95 latency is unacceptable.
2. Pro escalation rate at 50% is the dominant tail driver.
3. Need a bounded-compute policy with explicit budget.

## Orient
Prototype controller path remains in `scripts/run_innovation_atlas.py` only.
New hypothesis: budgeted risk score can preserve partial trust gain while capping escalation frequency.

## Diverge (Focused Alternatives)
1. Hard budget cap with risk score threshold.
2. Soft budget via proportional controller.
3. Query-class budgets (anchor vs semantic vs ambiguous).
4. Escalate only when top1 witness is zero.

Selected:
- `risk_budget_v2`: risk scoring + global budget cap.

## Metrics
- Keep: pass/leak/stability constraints.
- Improve vs baseline if possible:
  - `AnchorTop1Hit@1`
  - `PlausibleWrong@k`
- Constrain:
  - `controller_pro_call_rate`
  - latency p95 relative to cycle1 and baseline.

## Kill Test
If budgeted variant gives no trust improvement over baseline while still regressing p95, reject.
