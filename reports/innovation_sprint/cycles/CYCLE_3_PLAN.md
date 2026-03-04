# CYCLE 3 PLAN

Generated: 2026-03-03 23:00 UTC

## Observe
- Cycle 2 closed the restricted-leak failure but still missed the obvious anchor in exact_anchor_results_streamed_flash.
- Root-cause trace (--verbose) showed lexical candidate generation can be empty due ignore rules (*.log), forcing pure-semantic fallback.
- With low --limit, pure fallback truncated candidate coverage before witness correction could surface logs/app.log.

## Orient
### Success criteria
- Improve atlas from 15/16 to 16/16 with flag ON.
- Preserve large-directory stress pass.
- Keep volatility stable across 5 reruns.
- Keep default behavior unchanged (flag OFF).

### Constraints
- No invariant break: no persistence semantics changes, no model override, no gating bypass.
- Minimal, reversible code only in src/ixos_rank/progressive.rs.

## Diverge
1. Post-rank lexical anchor injection from lexical lookup.
2. Semantic candidate overfetch in all guard-on paths.
3. Pure fallback overfetch only when trust-risk pattern is detected.
4. Guard score recalibration + re-sort after similarity edits.
5. Content witness fallback when lexical snippet witness missing.
6. Guard activation gate: skip if top window already has strong non-sensitive witness.
7. Counterfactual rerank branch (remove sensitive candidates, compare delta).
8. Directory-prior boost for command-path queries (src-tauri/src/commands/*).

## Converge
- Chosen primary approach:
  - conditional pure-fallback overfetch (semantic_pure_limit) only when:
    - lexical phase is empty,
    - query is non-sensitive,
    - initial top results contain sensitive paths.
- Supporting changes:
  - content witness fallback for anchor promotion,
  - post-adjustment re-sort,
  - skip guard when top window already has strong non-sensitive witness.

## Act
- Implement all changes behind existing runtime flag IXOS_EXPERIMENT_WITNESS_GUARD.
- Add focused unit tests for:
  - pure/lexical limit helpers,
  - guard reorder behavior,
  - guard skip behavior,
  - content-fallback anchor promotion.

## If Pablo Has Only 2 Hours, Do This Next
1. Prototype a risk-calibrated controller so witness guard only activates when a trust-failure score exceeds a threshold.
2. Re-run Ralph with and without that controller to reduce p95 regressions while preserving 16/16 atlas.
