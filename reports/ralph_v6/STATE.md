# Ralph v6 State

- Date: 2026-03-06
- Position: prosecutor pass 2 complete
- Hard stop: SATISFIED
- Candidates evaluated: 23
- Remaining live candidates: 2
- Forbidden Ralph folders: not read; only top-level names under `reports/` were listed to confirm exclusion

## What Was Just Learned

- The current Ixos engine already ships several sharp-sounding heuristics, but most collapse to known families: intent detection, answer sentence selection, explanation layers, cascade ranking, uncertainty routing, hierarchy priors, and trust-aware reranking.
- The current code already encodes two important invariants:
  - Ask Mode does not force Pro when Flash is selected.
  - Witness guard behavior is tested for promotion, reordering, and skip cases.
- A real progressive-search benchmark on `dataset` did not surface a sharper routing object:
  - `flash`: total p50 `203 ms`, p95 `520 ms`
  - `auto`: total p50 `199 ms`, p95 `383 ms`
  - `pro`: total p50 `206 ms`, p95 `413 ms`
  - the scale-bench implementation still maps `ixos-pro-v2` to `Potion`, so the current Pro benchmark path is not a distinct true-Pro object
- The novelty left in this repo is not the existing heuristic layer itself. The remaining live space is in formalizing what current heuristics only approximate.

## Exact Next Action

- If resumed after this hard-stop-complete run, start Experiment A for `C19` by building a synthetic sensitive-path exposure benchmark from `dataset/`.
- If that is blocked, start Experiment B for `C20` by instrumenting progressive-search stage deltas and top-k swaps in `src/ixos_rank/progressive.rs`.

## Current Best Read

- `C19`: witness-obligation certificate for sensitive local retrieval exposure
- `C20`: probe-miss risk certificate for progressive local search
