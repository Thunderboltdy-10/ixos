# SEARCH LOG

## Search Strategy Snapshot (V4 Bootstrap)
- Objective: saturate prior art around five seed directions while branching into adjacent neighborhoods.
- Streams active: A Scholar, B Systems, C Security/Leak, D Product, E Archaeology, F Prosecutor.
- Anti-bias rule applied: two fresh divergence batches completed before deep old-pool convergence.

## Batch R0 - Blind Local System Truth
- Family: local artifact reality (Priority A/B)
- Queries/actions:
  - Read control-plane files: `PLAN.md`, `RUNLOG.md`, `DECISIONS.md`
  - Read v3 stop artifacts: `reports/ralph_v3/{FINAL_REPORT,BANLIST,SURVIVORS,FAILURES,TASK_QUEUE}.md`
  - Read pipeline and command entry points: `progressive.rs`, `candidate_generator/*`, `semantic_engine.rs`, `src-tauri/.../search.rs`
- Links opened: local repo artifacts only.
- Takeaways:
  - Anchor risk concentrated in candidate caps/timeouts and snippet-dependent anchor filters.
  - Leak control remains heuristic and partly env-gated.
  - Auto refine under-trigger remains plausible on short ambiguous queries.
- Threatened ARCH IDs: all candidates needing assumptions about current-system behavior.

## Batch W1 - Hybrid Displacement / Constrained Ranking
- Family: Scholar + Systems
- Queries:
  - `hybrid lexical semantic complementarity objective`
  - `slot constrained ranking top-k`
  - `why not yet top-k ranking`
  - `constrained ranking fairness top-k`
- Links opened:
  - https://aclanthology.org/2023.findings-acl.880/
  - https://www.cs.cornell.edu/people/tj/publications/guo_etal_24a.pdf
  - https://www.vldb.org/pvldb/vol16/p2377-chen.pdf
  - https://arxiv.org/abs/1809.04572
- Takeaways:
  - Constrained top-k and slot-constrained policies are deep prior art.
  - Hybrid objective shaping is broadly covered; static fusion claims are weak novelty.
- Threatened ARCH IDs: A02 A05 A11 A16 A17 A20 B05 B06 B08 B17.

## Batch W2 - Refinement / Continual Top-k / Transactional Analogs
- Family: Systems
- Queries:
  - `continual top-k keyword search`
  - `ranked enumeration monotonic ranking functions`
  - `top-k query refinement under diversity constraints`
- Links opened:
  - https://arxiv.org/abs/1103.2651
  - https://arxiv.org/abs/2409.08142
  - https://www.vldb.org/pvldb/vol17/p106-li.pdf
  - https://arxiv.org/abs/2403.17786
- Takeaways:
  - Incremental top-k maintenance and ranked-enumeration foundations are old and strong.
  - Any transactional-ranking claim must show a new differentiator beyond incremental maintenance.
- Threatened ARCH IDs: A09 A10 A11 A20 B04 B08 B11 B17.

## Batch W3 - Retrieval Verification / Proof Carrying
- Family: Scholar + Security
- Queries:
  - `verifiable vector database`
  - `secure and verifiable top-k query processing`
  - `secure top-k query processing over encrypted database`
- Links opened:
  - https://arxiv.org/abs/2602.14648
  - https://arxiv.org/abs/1510.05175
  - https://arxiv.org/abs/0911.4238
  - https://arxiv.org/abs/1904.02033
- Takeaways:
  - Verifiable retrieval and secure top-k have long prior art with heavy overhead.
  - Proof/certificate-only novelty claims likely incremental unless retrieval-specific low-cost differentiator exists.
- Threatened ARCH IDs: A06 B16 B20.

## Batch W4 - Geometry-Based Leak Suppression / Retrieval Privacy
- Family: Security/Leak
- Queries:
  - `retrieval latent space privacy defense`
  - `embedding inversion retrieval attacks`
  - `transform before query retrieval privacy`
- Links opened:
  - https://arxiv.org/abs/2508.08285
  - https://arxiv.org/abs/2504.12369
  - https://arxiv.org/pdf/2506.21761
- Takeaways:
  - Geometry/privacy defenses and inversion attacks are active and quickly evolving.
  - Raw geometric suppression is likely not novel without strong retrieval-time guarantees and explicit-sensitive recall preservation.
- Threatened ARCH IDs: A07 A08 B19.

## Batch W5 - Unsat Core / MUS Neighborhood
- Family: Scholar (formal methods)
- Queries:
  - `minimal unsatisfiable subset extraction SAT`
  - `graph pruning MUS extraction`
  - `unsat core explainable constraints ranking`
- Links opened:
  - https://arxiv.org/abs/2303.09522
  - https://arxiv.org/abs/2408.10153
- Takeaways:
  - MUS extraction is mature in SAT/SMT ecosystems; novelty must be retrieval-specific integration and operational fit.
- Threatened ARCH IDs: A04 B07 B08.

## Batch W6 - Product/Production Prior Art Saturation
- Family: Product docs
- Queries:
  - `OpenSearch filtered k-NN`
  - `Elastic hybrid search`
  - `Vespa nearest neighbor search guide`
  - `Qdrant filtering`
  - `Milvus filtered search`
  - `Azure vector search filters`
  - `Weaviate RBAC`
- Links opened:
  - https://docs.opensearch.org/docs/latest/vector-search/filter-search-knn/index/
  - https://www.elastic.co/docs/solutions/search/hybrid-search/
  - https://docs.vespa.ai/en/nearest-neighbor-search-guide.html
  - https://qdrant.tech/documentation/concepts/filtering/
  - https://milvus.io/docs/filtered-search.md
  - https://learn.microsoft.com/en-us/azure/search/vector-search-filters
  - https://docs.weaviate.io/deploy/configuration/rbac
- Takeaways:
  - Filtered ANN, hybrid retrieval, and access controls are commodity in major engines.
- Threatened ARCH IDs: A07 A08 B02 B15 B19.

## Batch W7 - Adversarial "already exists" pass
- Family: Prosecutor adversarial
- Queries:
  - `closest prior art to lexical semantic displacement guarantee`
  - `transactional ranking rollback retrieval already exists`
  - `proof carrying retrieval results already exists`
  - `unsat core extraction ranking constraints retrieval`
- Links opened:
  - https://www.vldb.org/pvldb/vol16/p2377-chen.pdf
  - https://arxiv.org/abs/1103.2651
  - https://arxiv.org/abs/2602.14648
  - https://arxiv.org/abs/2303.09522
- Takeaways:
  - Strong direct analogs exist for constrained repair, continual top-k maintenance, proof-carrying verification, and unsat-core extraction foundations.
  - Remaining novelty room appears narrow and integration-specific.
- Threatened ARCH IDs: A04 A09 A11 A16 B07 B11 B16.

## Coverage counters (current)
- Search batches logged: `8`
- Distinct neighborhoods covered: `7`
  - hybrid displacement constraints
  - transactional/incremental top-k
  - verifiable retrieval
  - geometric leak suppression
  - unsat-core/MUS
  - production filtered ANN/access control
  - adversarial prior-art collapse

## Batch W9 - Macro-Cycle 3 / Sub-Round 1 / Chunk B (N5+N6 bounded)
- Family: Systems + Product + Prosecutor adversarial (candidate continuity and pre-publish safety)
- Budget guardrails (enforced):
  - web searches: `12/12`
  - opened pages: `4/4`
  - extracted sources: `12/12`
- Query pack executed:
  1. `candidate generation continuity guarantees retrieval`
  2. `anytime retrieval candidate truncation regret bounds`
  3. `ripgrep timeout search recall tradeoff`
  4. `progressive retrieval early publish safety`
  5. `streaming search pre-publish verifier`
  6. `lexical stage leakage prevention retrieval`
  7. `top-k under truncation guarantees`
  8. `safe early results information retrieval`
  9. `Elasticsearch search_after consistency guarantees`
  10. `Lucene early termination accuracy tradeoff`
  11. `OpenSearch hybrid early result controls`
  12. `incremental search result verification streaming`
- Opened pages:
  - https://www.vldb.org/conf/2004/RS17P3.PDF
  - https://www.vldb.org/pvldb/vol11/p866-mouratidis.pdf
  - https://www.elastic.co/guide/en/elasticsearch/reference/8.19/paginate-search-results.html
  - https://opensearch.org/blog/OpenSearch-Approximation-Framework/
- Takeaways:
  - Continuity and approximation under top-k truncation are mature topics with probabilistic/error-guarantee lineage; novelty room is narrow.
  - Product systems already formalize early termination with correctness and pagination consistency caveats (`search_after` + PIT).
  - Ripgrep itself avoids ranking semantics by design; Ixos continuity guarantees must be downstream of lexical hit capture.
  - Pre-publish safety appears feasible as cheap invariant checks, but generic "early safe publish" claims likely incremental.
- Threatened ARCH IDs:
  - Active: `ARCH-A01`, `ARCH-A04`
  - Cycle-local pending prosecutor: `CY3-R1-ARCH-01..CY3-R1-ARCH-08`

## Batch W10 - Macro-Cycle 4 / Sub-Round 1 / Chunk B (N7+N8 bounded)
- Family: Scholar + Security + Product (conflict-sketch explanation and first-publish leak controls)
- Budget guardrails (enforced):
  - web searches: `12/12`
  - opened pages: `4/4`
  - extracted sources: `12/12`
- Query pack executed:
  1. `approximate unsat core extraction streaming constraints`
  2. `conflict sketch explanation constraints`
  3. `minimal conflict set approximation algorithms`
  4. `counterexample-guided abstraction ranking constraints`
  5. `benign query sensitive leak prevention retrieval`
  6. `retrieval-time suppression with explicit intent recovery`
  7. `pre-publish safety checks search streaming`
  8. `false positive mitigation sensitive filtering retrieval`
  9. `Elasticsearch query rules pinned demotion`
  10. `Vespa query profile filtering security`
  11. `Weaviate hybrid filter explain`
  12. `Amazon Kendra result filtering access control`
- Opened pages:
  - https://en.wikipedia.org/wiki/Counterexample-guided_abstraction_refinement
  - https://arxiv.org/abs/2204.00971
  - https://www.elastic.co/guide/en/elasticsearch/reference/current/search-using-query-rules.html
  - https://docs.aws.amazon.com/kendra/latest/dg/filtering.html
- Takeaways:
  - Conflict approximation/refinement lineages (CEGAR, min-cut approximations, MUS enumeration) are mature; raw sketching claims collapse quickly.
  - Leak prevention with explicit false-positive/false-negative tradeoffs has strong existing literature in retrieval and RAG access-control spaces.
  - Product engines already support query rules, pinning, filtering, and access controls; wrapper-based novelty is weak.
  - Remaining room is narrow: extremely cheap first-publish lexical guard that is not policy-gating and preserves explicit-sensitive recall.
- Threatened ARCH IDs:
  - Active: `ARCH-A04`, `CY3-R1-ARCH-04`
  - Cycle-local pending prosecutor: `CY4-R1-ARCH-01..CY4-R1-ARCH-08`

## Batch W11 - Macro-Cycle 5 / Sub-Round 1 / Chunk B (N9+N10 bounded)
- Family: Systems + Scholar + Product (budgeted recall and dynamic pruning)
- Budget guardrails (enforced):
  - web searches: `12/12`
  - opened pages: `4/4`
  - extracted sources: `12/12`
- Query pack executed:
  1. `approximate nearest neighbor recall guarantees under budget`
  2. `anytime top-k interruptible guarantees`
  3. `admission control algorithms search systems`
  4. `lossy channel error correction retrieval candidates`
  5. `streaming heavy hitters recall guarantees`
  6. `retrieval under timeout resilience methods`
  7. `query-time budgeted recall optimization`
  8. `dynamic pruning impact on recall top-k`
  9. `Lucene block max WAND early termination`
  10. `Elasticsearch block max WAND`
  11. `Vespa weakAnd recall`
  12. `OpenSearch dynamic pruning BM25`
- Opened pages:
  - https://arxiv.org/abs/2505.05422
  - https://aclanthology.org/2024.emnlp-main.1256.pdf
  - https://lucene.apache.org/core/10_3_0/core/org/apache/lucene/search/package-summary.html
  - https://docs.vespa.ai/en/using-wand-with-vespa.html
- Takeaways:
  - Dynamic pruning with safety/recall tradeoffs is deeply saturated in IR literature and production engines.
  - BlockMax WAND/weakAnd style mechanisms are commodity; novelty cannot be "use dynamic pruning".
  - Remaining plausible room: anchor-aware correction terms layered on pruning confidence metadata under strict budget.
  - Timeout resilience may be improved with deterministic micro-recovery, but prior-art pressure is strong.
- Threatened ARCH IDs:
  - Active: `CY3-R1-ARCH-04`, `CY4-R1-ARCH-05`
  - Cycle-local pending prosecutor: `CY5-R1-ARCH-01..CY5-R1-ARCH-08`
