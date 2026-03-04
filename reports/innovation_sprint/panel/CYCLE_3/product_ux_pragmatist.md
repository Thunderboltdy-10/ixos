# Product UX Pragmatist — Cycle 3

## Top 3 Objections
1. Quality gains are invisible without explanation surfaces.
2. Users cannot tell why restricted files were demoted/suppressed.
3. Latency regressions are more noticeable than hidden accuracy gains.

## Falsification Experiments
- Add experimental metadata badges in JSON output (witness_dual, suppressed_sensitive).
- Run quick UX probe: can users explain result ordering with and without labels?
- Track query-completion time for trust-critical tasks under ON/OFF variants.

## If You Only Change One Thing, Change THIS
- Surface witness/confidence badges so ranking behavior is auditable in the UI.
