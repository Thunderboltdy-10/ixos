# Ralph v6 Plan

## Search Space

- Current-engine novelty only: Ask-mode preprocessing, lexical funnel, progressive search, evidence/trust, secure ranking, topology priors, Tauri routing, and premium-exposed engine behavior.
- Excluded by contract: `report/ralph_v0..5/**` and `reports/ralph_v0..5/**`.

## Cycle List

1. Cycle 1: code map and candidate generation. Status: complete.
   - Mapped `ask_mode`, `query_preprocess`, `progressive`, `secure_ranker`, `semantic_engine`, and `src-tauri/src/commands/search.rs`.
   - Generated candidate pool `C01` through `C23`.
2. Cycle 2: prosecutor pass 1. Status: complete.
   - Attacked candidates against known families:
     - intent detection
     - query rewriting / expansion
     - answer sentence selection / justification ranking
     - explanation / confidence layers
     - cascade ranking / selective query processing
     - hierarchy-aware retrieval priors
     - trust-aware reranking
   - Live after pass 1: `C14`, `C19`, `C20`.
3. Cycle 3: prosecutor pass 2. Status: complete.
   - Re-attacked witness-style candidates against privacy and retrieval-control literature.
   - Killed `C14` as a heuristic score-shift, not a new object.
   - Kept `C19` and `C20`.
4. Cycle 4: cheap empirical probes. Status: complete.
   - Ran witness-guard unit probe.
   - Ran Ask-mode selected-model invariant probe.
   - Captured direct code artifact for progressive heuristics.
   - Ran real `ixos-scale-bench` flash/auto/pro probes on `dataset` and confirmed the routing family still behaves like ordinary adaptive tradeoffs.

## Current Hypotheses

- H1: novelty is not in Ixos's current heuristics by themselves; it is in converting them into first-class obligations or certificates.
- H2: any candidate that needs "filesystem", "local-first", or "premium" as a third qualifier collapses.
- H3: the strongest unoccupied space in this repo is a measurable failure/control object for progressive search.

## Active Attack Angles

- Rename test: if a simpler established term describes it, kill it.
- 3D collapse test: if it only works as `new X for Y in Z`, kill it.
- Family test: prosecute against answer selection, cascade ranking, selective processing, hierarchy priors, trust-aware reranking, and ranking explanations.
- Repo-plausibility test: if it cannot be instrumented cheaply in Ixos, downgrade it.

## Outcome

- 23 distinct candidate objects evaluated.
- 2 full prosecutor passes completed.
- 2 live candidates remain with clear next experiments.
- Hard stop satisfied on 2026-03-06.

## Resume Order

1. Build the `C19` exposure benchmark.
2. Instrument the `C20` miss-risk features and top-k swap logs.
3. Try to collapse `C19` and `C20` one more time with any stronger retrieval/privacy prior art before implementation.
