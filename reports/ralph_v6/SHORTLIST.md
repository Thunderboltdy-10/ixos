# Ralph v6 Shortlist

## C19: Witness-Obligation Certificate for Sensitive Local Retrieval

- One sentence: This is a new witness-obligation certificate for privacy-safe local retrieval.
- Why it is still live: current Ixos code contains a witness-guard heuristic, but I did not find a first-class retrieval object that requires explicit witness support or sensitive-query intent before sensitive-looking hits can outrank safer candidates.
- Kill attempts survived:
  - Collapsed against safe-search / privacy-control work: adjacent, but mostly generation-time or benchmark-focused.
  - Collapsed against Ixos's existing witness guard: current code only shifts scores; it does not define a formal exposure obligation.
- Clear empirical path:
  - Build a synthetic benchmark with sensitive-looking paths plus semantically tempting false positives.
  - Compare baseline, current witness guard, and certificate-style obligation on false sensitive exposure rate, MRR@10, and latency.

## C20: Probe-Miss Risk Certificate for Progressive Local Search

- One sentence: This is a new probe-miss risk certificate for progressive local search.
- Why it is still live: Ixos currently uses heuristics such as `should_refine`, eager-index switching, and witness-guard toggles, but not an anytime estimate of whether remaining work can still change top-k.
- Kill attempts survived:
  - Collapsed against risk-controlled pruning and tail-latency work: same family, but not the same explicit miss-risk certificate over lexical -> semantic -> refine -> evidence stages.
  - Collapsed against generic cascade ranking: existing work optimizes stage budgets; it does not give Ixos a repo-calibrated miss-risk object.
- Clear empirical path:
  - Log top-k changes after each stage.
  - Fit a conservative miss-risk bound using gap, entropy, lexical witness count, and candidate pool width.
  - Compare certificate-driven stopping against current heuristic refine decisions.

