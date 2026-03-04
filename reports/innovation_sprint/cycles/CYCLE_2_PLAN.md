# CYCLE 2 PLAN

Generated: 2026-03-03 22:02 UTC

## Observe
- Cycle 1 prototype showed feasibility of witness-aware trust correction.
- Baseline atlas still had two deterministic trust failures (`results streamed` flash/auto).
- Need product-path evidence, not only reports-only rerank.

## Orient
### Success criteria
- Improve atlas pass count relative to baseline (`14/16`) with feature flag enabled.
- Reduce restricted-file leak failures.
- Keep full validation matrix green.
- Preserve large-directory stress case behavior.

### Constraints
- No default behavior change (flag must be off by default).
- No entitlement/privacy invariant break.

## Diverge (abbreviated for cycle focus)
1. Integrate witness guard in semantic similarity space only.
2. Integrate witness guard in final ranked results space.
3. Activate guard only when sensitive-path drift is detected.
4. Add hard path blacklist in non-sensitive queries.
5. Increase candidate depth when guard active.
6. Add counterfactual rerank branch for top-10 only.
7. Add UX witness badge only (no ranking change).
8. Add policy-only sensitive leak filter.

## Converge
- Chosen approach:
  - runtime flag `IXOS_EXPERIMENT_WITNESS_GUARD`
  - guard applied in semantic stage
  - activation only when:
    - query is non-sensitive
    - sensitive paths appear in semantic candidates

## Act
- Implement guard in `src/ixos_rank/progressive.rs`.
- Add unit tests for:
  - sensitive query detection,
  - sensitive path detection,
  - witness promotion + sensitive penalty.

## If Pablo Has Only 2 Hours, Do This Next
1. Add post-rank anchor injection for top-k when guard is active and obvious lexical witness exists.
2. Re-run atlas with flag and check whether remaining `exact_anchor_results_streamed_flash` failure closes.
