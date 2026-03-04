# Systems Perf Engineer Critique

- Budget must be explicit and measurable (`controller_pro_call_rate`).
- Watch p95, not only p50.
- If even 5-10% escalations explode p95, explore asynchronous/progressive strategies instead of synchronous fallback.
