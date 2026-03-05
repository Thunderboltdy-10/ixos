# FAILURES

## Prosecutor failures (pass-1)
- A02/A05/A11/A16/A17/A20/B05/B06/B08/B17 collapsed as constrained ranking variants.
- A06/B16 collapsed as proof-carrying or verifiable-retrieval adaptations with strong prior art.
- A12/A13/A14/B04/B12/B13/B18/B20 collapsed as selective-refine/routing/abstention family.
- B02/B15/A19 collapsed as policy/filtering/risk-suppression implementations already in production systems.

## Gatekeeper vetoes (pass-1)
- A07/A08/B19 vetoed: calibration brittleness and false-suppression risk for geometry-based suppression.
- A09 vetoed: rollback/state complexity and potential stream instability.
- B07 vetoed: SAT/proof integration complexity and p95 overhead risk.
- B09 vetoed: phase-replay complexity and possible stale-anchor overpromotion.
- Most incremental candidates vetoed for weak novelty-to-complexity ratio.

## Residual unresolved risks
1. Anchor-top1 misses remain unsolved without costly refine escalation.
2. Leak controls still mostly heuristic; no formal retrieval-time guarantee in current code path.
3. Mixed-cache top1 instability remains open in baseline artifacts.

## Macro-Cycle 2 / Sub-Round 1 - Prosecutor failures
- CY2-R1-ARCH-01, CY2-R1-ARCH-02: collapsed into stability/consistency prior art (incremental only).
- CY2-R1-ARCH-03, CY2-R1-ARCH-04, CY2-R1-ARCH-05: collapsed into why-not/provenance/semiring explanation families.
- CY2-R1-ARCH-07, CY2-R1-ARCH-08: collapsed into existing auditable retrieval + rescore explain tooling.
- Survivor pressure updates:
  - ARCH-A01 downgraded POSSIBLY_NOVEL -> UNCLEAR
  - ARCH-B11 downgraded POSSIBLY_NOVEL -> UNCLEAR
  - ARCH-A04 remains UNCLEAR under heavy prior-art pressure.

## Macro-Cycle 2 / Sub-Round 1 - Gatekeeper failures
- `ARCH-B11` vetoed: stage-delta commit introduces state complexity and potential UI/result oscillation with weak differentiator.
- `ARCH-A04` restricted to diagnostic-only candidate: no hot-path promotion until strict timeout evidence exists.
- `CY2-R1-ARCH-06` vetoed for p95 risk (solver overhead).

## Macro-Cycle 3 / Sub-Round 1 - Prosecutor failures
- `ARCH-A01` collapsed to incremental under strong top-k approximation/stability prior art pressure.
- `CY3-R1-ARCH-01/02/03/08` collapsed as continuity/approximation control variants.
- `CY3-R1-ARCH-05/06/07` treated as incremental consistency/policy adaptations.
- New holdout: `CY3-R1-ARCH-04` (`UNCLEAR`) pending deeper adversarial prior-art search.

## Macro-Cycle 4 / Sub-Round 1 - Prosecutor failures
- `ARCH-A04` collapsed to incremental and vetoed under strong MUS/CEGAR conflict-explanation prior art.
- `CY4-R1-ARCH-01/02/03/04/06/07` collapsed as incremental conflict-approximation or policy-control variants.
- `CY4-R1-ARCH-08` collapsed as direct product-feature equivalence (not novel).
- New holdout: `CY4-R1-ARCH-05` (`UNCLEAR`) for first-publish false-positive-sensitive lexical guard.

## Macro-Cycle 5 / Sub-Round 1 - Prosecutor failures
- `CY3-R1-ARCH-04` downgraded and collapsed into dynamic-pruning/anytime recovery prior art.
- `CY5-R1-ARCH-01..08` all classified incremental (no novel differentiator found).
- Survivor board narrows to one `UNCLEAR` candidate: `CY4-R1-ARCH-05`.
