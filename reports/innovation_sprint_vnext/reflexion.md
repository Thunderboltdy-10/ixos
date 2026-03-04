# Reflexion Log

## Cycle 1 (risk_budget_v1)
- What failed: p95 exploded due high (50%) synchronous Pro escalations.
- Why: escalation trigger was too broad and Pro path is expensive in this harness.
- What to change: enforce explicit compute budget and avoid unconditional paired calls.

## Cycle 2 (risk_budget_v2)
- What failed: budgeted routing still did not achieve strong simultaneous speed+trust gains.
- Why: even sparse synchronous Pro calls disproportionately affect p95; extremely low budget removes trust gains.
- What to change next: move trust improvement into score-level constrained optimization and/or asynchronous anytime refinement rather than blocking escalation.
