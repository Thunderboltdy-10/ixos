# Ralph v6 Banlist

## Dead Families

- Query-intent detectors and template similarity.
  - Why they collapse: `C01` and parts of `C02` are standard intent classification / template matching under latency constraints.
- Query rewriting, typo correction, synonym expansion, and extension-hint injection.
  - Why they collapse: `C02` and `C03` are preprocessing, not a new retrieval object.
- Constrained candidate filtering and answer sentence selection.
  - Why they collapse: `C04`, `C05`, and `C06` reduce cleanly to known answer-justification / evidence selection work.
- Explanation layers and heuristic confidence scores.
  - Why they collapse: `C07`, `C08`, and weak forms of `C09` are standard explanation UX or heuristic confidence estimation.
- Uncertainty routing, selective query processing, and general cascade ranking.
  - Why they collapse: `C10` and weak forms of `C20` become known multi-stage control heuristics unless they expose a sharper certificate.
- Weighted fusion and hybrid reranking.
  - Why they collapse: `C11` is generic.
- Hierarchy-aware retrieval priors framed as filesystem-only tricks.
  - Why they collapse: `C12` and `C13` become known priors unless the object survives without the filesystem wrapper.
- Witness boosting without a formal obligation.
  - Why they collapse: `C14`, `C15`, and `C16` are heuristics and policy exceptions, not a new object.
- Trust-aware reranking with integrity/behavior/personal features.
  - Why they collapse: `C17` is squarely in known trust-aware ranking space.
- Product invariants and entitlement routing.
  - Why they collapse: `C18` is important product behavior, but not research novelty.

## Patterns To Avoid

- "Novel because local-first"
- "Novel because combined"
- "Novel because adapted to files"
- "Novel because premium gating changes the path"
- Heuristic thresholds disguised as certificates
- Any candidate that needs a third qualifier to sound interesting

