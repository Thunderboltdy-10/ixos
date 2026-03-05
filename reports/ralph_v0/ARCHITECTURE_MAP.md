# Architecture Map (Observe)

## Search Pipeline (current)

```text
UI query -> Tauri search_progressive
  -> resolve mode + entitlement gate + model selection
  -> CandidateLexicalEngine search + lexical batches (TTFR path)
  -> semantic query rewrite / ask-intent handling
  -> Semantic rerank (Flash primary for Auto/Flash, Pro primary for Pro)
  -> optional refinement pass (Auto uncertainty gate -> Pro top-K)
  -> secure ranking + threshold filter
  -> deferred evidence/snippet enrichment
  -> streaming events (Lexical -> Semantic -> Refining/Tail)
```

## Critical Constraints
- Zero-index philosophy: search works without persistent mandatory index.
- Ask mode must not silently override selected model.
- Pro gating enforced by entitlement in Tauri backend.
- Labels and actual behavior should remain aligned.

## Observed Hotspots
- Ralph run (2026-03-03) regressed cold TTFR gate (131ms vs harsh target 120ms).
- Walk p95 jumped to 174ms in latest harsh benchmark, dominating stage regression.
- Flash/Auto can miss obvious exact-hit file in top-5 on `results streamed`.
