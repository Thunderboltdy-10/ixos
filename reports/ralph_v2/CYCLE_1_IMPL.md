# CYCLE 1 IMPL

Date: 2026-03-04
Change type: prototype only, flag-gated

## Implemented Change
File:
- `scripts/run_innovation_atlas.py`

Added:
- Controller mode `risk_budget_v1` (off by default).
- Flash-first retrieval with risk check (`low_confidence`, `anchor_risk`, `short_query_risk`).
- On risk, execute Pro retrieval and fuse with weighted RRF + anchor witness bonus.
- New trust metrics:
  - `AnchorTop1Hit@1`
  - `PlausibleWrong@k`
  - `controller_pro_call_rate`

No production runtime path was modified; only atlas prototype harness changed.

## Flags
- Baseline mode: `--controller baseline`
- Experimental: `--controller risk_budget_v1 --controller-pro-mode pro`

## Revert
- `git restore scripts/run_innovation_atlas.py`
