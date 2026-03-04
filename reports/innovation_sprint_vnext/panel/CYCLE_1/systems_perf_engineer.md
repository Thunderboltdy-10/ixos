# Systems Perf Engineer Critique

- Main concern: controller that calls Pro path too often will destroy p95 tails.
- Must report escalation call rate and tail impact separately from median.
- Demand cold/mixed separation; no warm-cache-only claims.
- Accept only if trust gain has a Pareto explanation and bounded call budget.
