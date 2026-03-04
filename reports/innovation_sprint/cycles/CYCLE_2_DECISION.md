# CYCLE 2 DECISION

Generated: 2026-03-03 22:02 UTC

## Decision
- Status: `KEEP behind flag (default OFF)`
- Outcome: partial success

## Why
- Flag-on run improves atlas pass from `14/16` to `15/16`.
- Sensitive leak failure in auto mode is resolved.
- Large-directory stress regression seen in first flag attempt was removed by targeted activation.
- Remaining anchor miss (`results streamed` flash) still unresolved.

## Evidence
- `reports/innovation_sprint/cycles/CYCLE_2_ATLAS_BASELINE.json`
- `reports/innovation_sprint/cycles/CYCLE_2_ATLAS_FLAG_ON_v2.json`
- `reports/innovation_sprint/cycles/CYCLE_2_MEASURE.md`

## Risks
- Overfitting to sensitive-path heuristics.
- Remaining flash anchor miss could still erode trust in obvious-log queries.
- Run-to-run Ralph variance can mask small latency regressions.

## Follow-up Plan
1. Add post-rank anchor injection (flagged) when:
   - strong lexical witness exists outside top-k,
   - query non-sensitive,
   - current top-k lacks any strong witness.
2. Re-run atlas A/B and require:
   - `>=15/16` pass retained,
   - no new failure in large-directory stress,
   - no explicit-secret regression.
3. Expand atlas with additional real-repo trust cases.

## If Pablo Has Only 2 Hours, Do This Next
1. Implement flagged post-rank anchor injection in `progressive.rs`.
2. Run `run_failure_atlas.py` once with flag off and once with flag on.
3. Keep only if remaining flash anchor miss closes and no new fails appear.
