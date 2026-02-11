# Settings Matrix Report

- Generated: 2026-02-10T19:53:11.526267Z
- Corpus: `corpus_tiny`

| # | Cache | Privacy | Search | Progressive | Format | Status | Invariant | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | jit | normal | flash | off | human | PASS | Baseline: produces results | OK |
| 2 | jit | normal | flash | off | json | PASS | JSON output parses | OK |
| 3 | jit | normal | flash | on | human | PASS | Progressive events stream | OK |
| 4 | jit | normal | auto | off | human | PASS | Auto routes to flash (no Pro) | OK |
| 5 | jit | journalist | flash | off | human | PASS | No writes, no learning | OK |
| 6 | jit | journalist | flash | off | json | PASS | No writes + valid JSON | OK |
| 7 | cache | normal | flash | off | human | PASS | Cache writes allowed | OK |
| 8 | cache | normal | flash | off | json | PASS | Cache writes + valid JSON | OK |
| 9 | cache | normal | auto | off | human | PASS | Auto + cache | OK |
| 10 | cache | journalist | flash | off | human | PASS | Journalist forces JIT (no cache writes) | OK |
| 11 | cache | normal | flash | on | human | PASS | Progressive + cache | OK |
