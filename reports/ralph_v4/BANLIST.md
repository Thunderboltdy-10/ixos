# BANLIST

## Carry-over hostile ground from v3 (imported)
1. Policy/authorization-gated retrieval as novelty claim.
2. Constrained/rule-based top-k variants without hard differentiator.
3. Cascade/routing/uncertainty budget families without new formal mechanism.
4. Filtered ANN + vector access-control novelty overclaims.
5. Generic secure retrieval novelty overclaims.

## V4 Pass-1 bans

### BAN-V4-01 Constrained ranking and slot policies (collapsed)
- Collapsed ARCH IDs: A02, A05, A11, A16, A17, A20, B05, B06, B08, B17
- Verdict: NOT NOVEL / INCREMENTAL
- Strongest reason: slot constraints, constrained repair, and feasibility ranking are already explicit in ranking/DB literature.
- Evidence links:
  - https://www.cs.cornell.edu/people/tj/publications/guo_etal_24a.pdf
  - https://www.vldb.org/pvldb/vol16/p2377-chen.pdf
  - https://arxiv.org/abs/1809.04572
  - https://arxiv.org/abs/2403.17786

### BAN-V4-02 Selective refinement / uncertainty routing family (collapsed)
- Collapsed ARCH IDs: A12, A13, A14, B04, B12, B13, B18, B20
- Verdict: INCREMENTAL
- Strongest reason: uncertainty-triggered retrieval/refinement and abstain/expand behavior are mature families.
- Evidence links:
  - https://arxiv.org/abs/2310.11511
  - https://arxiv.org/abs/2202.09604

### BAN-V4-03 Proof/certificate carrying retrieval overclaim (collapsed)
- Collapsed ARCH IDs: A06, B16
- Verdict: INCREMENTAL
- Strongest reason: verifiable retrieval and secure top-k proof frameworks already exist; overhead remains major blocker.
- Evidence links:
  - https://arxiv.org/abs/2602.14648
  - https://arxiv.org/abs/1510.05175
  - https://arxiv.org/abs/0911.4238

### BAN-V4-04 Policy matrix / graph suppression as novelty (collapsed)
- Collapsed ARCH IDs: B02, B15, A19
- Verdict: NOT NOVEL / INCREMENTAL
- Strongest reason: policy/rbac/filtering and risk path suppression are commodity in product systems.
- Evidence links:
  - https://docs.weaviate.io/deploy/configuration/rbac
  - https://docs.opensearch.org/docs/latest/vector-search/filter-search-knn/index/
  - https://qdrant.tech/documentation/concepts/filtering/

### BAN-V4-05 Generic optimization-controller framing (collapsed)
- Collapsed ARCH IDs: B03, A20
- Verdict: INCREMENTAL
- Strongest reason: adaptive primal-dual and constrained controllers are broad prior art, lacking retrieval-specific differentiator.
- Evidence links:
  - https://arxiv.org/abs/2202.09604
  - https://arxiv.org/abs/1809.04572

## UNCLEAR but not banned yet
- A01, A03, A04, B01, B11 remain outside banlist pending deeper adversarial evidence.

## V4 Pass-2 bans (Macro-Cycle 2 SR1)

### BAN-V4-06 Generic displacement-budget certificates without retrieval-specific differentiator (collapsed)
- Collapsed ARCH IDs: CY2-R1-ARCH-01, CY2-R1-ARCH-02
- Verdict: INCREMENTAL
- Strongest reason: ranking stability/certified robustness/consistency prior art already captures broad displacement guarantees.
- Evidence links:
  - https://arxiv.org/abs/2506.02257
  - https://arxiv.org/abs/1912.04210
  - https://www.microsoft.com/en-us/research/publication/on-the-consistency-of-top-k-ranking/

### BAN-V4-07 Provenance explanation object family as novelty claim (collapsed)
- Collapsed ARCH IDs: CY2-R1-ARCH-03, CY2-R1-ARCH-04, CY2-R1-ARCH-05
- Verdict: INCREMENTAL / NOT_NOVEL
- Strongest reason: why-not-yet/provenance-graph/semiring explanations are mature and directly overlapping.
- Evidence links:
  - https://www.vldb.org/pvldb/vol16/p2377-chen.pdf
  - https://arxiv.org/abs/1701.05699
  - https://db.cs.washington.edu/projects/provenance/

### BAN-V4-08 Explain-wrapper and audit-token composition over existing engines (collapsed)
- Collapsed ARCH IDs: CY2-R1-ARCH-07, CY2-R1-ARCH-08
- Verdict: INCREMENTAL / NOT_NOVEL
- Strongest reason: auditable retrieval and rescore/explain APIs already exist; composition is engineering, not new mechanism.
- Evidence links:
  - https://arxiv.org/abs/2503.23281
  - https://www.elastic.co/guide/en/elasticsearch/reference/current/rrf.html
  - https://lucene.apache.org/core/10_2_2/core/org/apache/lucene/search/Rescorer.html

### BAN-V4-09 Stream-stage differential commit as novelty (collapsed in current form)
- Collapsed ARCH IDs: `ARCH-B11`
- Verdict: INCREMENTAL (gatekeeper veto)
- Strongest reason: overlaps continual top-k maintenance/rescore practices and adds stream-state complexity/oscillation risk.
- Evidence links:
  - https://arxiv.org/abs/1103.2651
  - https://www.elastic.co/guide/en/elasticsearch/reference/current/rrf.html
  - https://lucene.apache.org/core/10_2_2/core/org/apache/lucene/search/Rescorer.html

### BAN-V4-10 Candidate continuity/approximation guarantees as novelty (generic form collapsed)
- Collapsed ARCH IDs: `ARCH-A01`, `CY3-R1-ARCH-01`, `CY3-R1-ARCH-02`, `CY3-R1-ARCH-03`, `CY3-R1-ARCH-08`
- Verdict: INCREMENTAL / NOT_NOVEL
- Strongest reason: probabilistic/exact top-k continuity and approximation guarantees are longstanding; product systems already expose approximation controls.
- Evidence links:
  - https://www.vldb.org/conf/2004/RS17P3.PDF
  - https://www.vldb.org/pvldb/vol11/p866-mouratidis.pdf
  - https://opensearch.org/blog/OpenSearch-Approximation-Framework/
  - https://opensearch.org/blog/navigating-pagination-in-hybrid-queries-with-the-pagination_depth-parameter/

### BAN-V4-11 Retrieval-time unsat-core/conflict explanation in generic form (collapsed)
- Collapsed ARCH IDs: `ARCH-A04`, `CY4-R1-ARCH-01`, `CY4-R1-ARCH-02`, `CY4-R1-ARCH-04`
- Verdict: INCREMENTAL
- Strongest reason: MUS/SAT/CEGAR conflict extraction and refinement families are mature with strong direct overlap.
- Evidence links:
  - https://en.wikipedia.org/wiki/Counterexample-guided_abstraction_refinement
  - https://arxiv.org/abs/2106.10278
  - https://arxiv.org/abs/2306.01308

### BAN-V4-12 Rule-based pre-publish suppression controls as novelty (collapsed)
- Collapsed ARCH IDs: `CY4-R1-ARCH-07`, `CY4-R1-ARCH-08`
- Verdict: INCREMENTAL / NOT_NOVEL
- Strongest reason: query rules, pinned query controls, and ACL filtering already provide equivalent behavior.
- Evidence links:
  - https://www.elastic.co/guide/en/elasticsearch/reference/current/search-using-query-rules.html
  - https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-pinned-query.html
  - https://docs.aws.amazon.com/kendra/latest/dg/filtering.html

### BAN-V4-13 Dynamic-pruning/budgeted-recall guarantee family (generic form collapsed)
- Collapsed ARCH IDs: `CY3-R1-ARCH-04`, `CY5-R1-ARCH-01`, `CY5-R1-ARCH-02`, `CY5-R1-ARCH-03`, `CY5-R1-ARCH-04`, `CY5-R1-ARCH-05`, `CY5-R1-ARCH-08`
- Verdict: INCREMENTAL
- Strongest reason: safe/quantized/hardware-aware dynamic pruning and anytime top-k frameworks already cover these mechanisms broadly.
- Evidence links:
  - https://arxiv.org/abs/2505.05422
  - https://arxiv.org/abs/2407.15759
  - https://arxiv.org/abs/1909.13082
  - https://arxiv.org/abs/1807.04865
  - https://lucene.apache.org/core/10_3_0/core/org/apache/lucene/search/package-summary.html
