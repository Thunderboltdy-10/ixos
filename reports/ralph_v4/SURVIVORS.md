# SURVIVORS

Status scope: pass-1 only. No survivor promoted beyond provisional.

## Provisional survivors

### ARCH-A01 (POSSIBLY_NOVEL, KEEP_FOR_RESEARCH)
- Distinct claim: runtime lexical->semantic displacement certificate with bounded repair in hybrid streaming search.
- Why still alive: direct product/paper match for explicit displacement bound + repair not yet found.
- What can kill it:
  - any retrieval system/paper showing equivalent displacement contract + enforcement.
  - evidence that it materially harms semantic relevance on broad intents.
- Required deciding evidence:
  - adversarial prior-art batch focused on "rank displacement guarantees" and "hybrid monotonic constraints".
  - minimal harness result on anchor-critical cases (A05/A08/R02-like failures).
- Gatekeeper risk notes: moderate risk of over-anchoring lexical noise if bounds too tight.

### ARCH-A04 (UNCLEAR, KEEP_FOR_RESEARCH)
- Distinct claim: retrieval-time unsat-core extraction for conflicting anchor/safety constraints with explicit fallback semantics.
- Why still alive: MUS/unsat-core foundations exist, but retrieval-specific online integration remains unproven.
- What can kill it:
  - prior retrieval system with same unsat-core conflict handling at query time.
  - measured latency overhead that violates p95 targets.
- Required deciding evidence:
  - prior-art search in IR + constraint programming crossover venues.
  - bounded-latency prototype sketch over top-k only.
- Gatekeeper risk notes: solver overhead and implementation complexity are significant.

### ARCH-B11 (POSSIBLY_NOVEL, KEEP_FOR_RESEARCH)
- Distinct claim: trust-partial-order differential commit between semantic and refine stream stages.
- Why still alive: no direct analog found for stage-delta trust commit contract in progressive local search.
- What can kill it:
  - existing streaming retrieval protocols that already enforce trust-monotone delta commit.
  - empirical evidence that commit filtering increases top1 errors.
- Required deciding evidence:
  - adversarial search in stream ranking/event consistency literature.
  - harness with staged publish/retract behavior and trust metrics.
- Gatekeeper risk notes: must avoid UI-state oscillation and repeated reorders.

## Hold candidates (need more evidence before promote/kill)
- ARCH-A03
- ARCH-B01

## Non-survivor note
- Majority of A/B candidates were collapsed by established constrained ranking, routing, proof-carrying, or productized filtering prior art.

## Macro-Cycle 2 / Sub-Round 1 survivor status delta
- ARCH-A01: downgraded to UNCLEAR after direct stability/consistency prior-art hits (W-028..W-030).
- ARCH-A04: remains UNCLEAR; unresolved differentiator is online retrieval-time unsat-core integration under tight p95 budget.
- ARCH-B11: downgraded to UNCLEAR due continual-top-k + rescore/explain overlap pressure.
- No POSSIBLY_NOVEL candidates currently active after Chunk C.

## Macro-Cycle 2 closeout survivor board
- Active research survivor:
  - `ARCH-A01` (`UNCLEAR`, `KEEP_FOR_RESEARCH`)
- Diagnostic hold (not shippable path):
  - `ARCH-A04` (`UNCLEAR`, `HOLD diagnostic-only`)
- Removed this cycle:
  - `ARCH-B11` (`VETO`, moved to BAN-V4-09)

## Macro-Cycle 3 / Sub-Round 1 survivor status delta
- `ARCH-A01`: downgraded to `INCREMENTAL`; removed from active survivor board.
- `ARCH-A04`: remains `UNCLEAR` (`HOLD diagnostic-only`).
- New provisional candidate:
  - `CY3-R1-ARCH-04` (`UNCLEAR`, `KEEP_FOR_RESEARCH`) - truncation-debt ledger for admission-stage loss.

## Macro-Cycle 3 closeout survivor board
- Active research survivor:
  - `CY3-R1-ARCH-04` (`UNCLEAR`, `KEEP_FOR_RESEARCH`)
- Diagnostic hold:
  - `ARCH-A04` (`UNCLEAR`, `HOLD diagnostic-only`)
- Removed this cycle:
  - `ARCH-A01` (`VETO` after incremental collapse)

## Macro-Cycle 4 / Sub-Round 1 survivor status delta
- `ARCH-A04`: downgraded to incremental and removed from survivor board.
- `CY3-R1-ARCH-04`: remains `UNCLEAR`.
- New provisional candidate:
  - `CY4-R1-ARCH-05` (`UNCLEAR`, `KEEP_FOR_RESEARCH`).

## Macro-Cycle 4 closeout survivor board
- Active research survivors:
  - `CY3-R1-ARCH-04` (`UNCLEAR`, `KEEP_FOR_RESEARCH`)
  - `CY4-R1-ARCH-05` (`UNCLEAR`, `KEEP_FOR_RESEARCH`)
- Removed this cycle:
  - `ARCH-A04` (`VETO`)

## Macro-Cycle 5 / Sub-Round 1 survivor status delta
- `CY3-R1-ARCH-04`: downgraded to incremental and removed.
- `CY4-R1-ARCH-05`: remains sole active `UNCLEAR` survivor.
- No new survivors from Cycle 5 candidate set.

## Macro-Cycle 5 closeout survivor board
- Active research survivor:
  - `CY4-R1-ARCH-05` (`UNCLEAR`, `KEEP_FOR_RESEARCH`)
- Removed this cycle:
  - `CY3-R1-ARCH-04` (`VETO`)
