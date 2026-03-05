# SOURCES

## Local Artifact Sources (Priority A/B)
| ID | Type | Link/Artifact | Key takeaway | Threatens ARCH IDs |
|---|---|---|---|---|
| L-001 | Control-plane memory | `/PLAN.md` | Latest snapshot sets baseline AnchorTop1Hit@1=0.80 and flags candidate recall + leak + routing bottlenecks. | all |
| L-002 | Execution history | `/RUNLOG.md` | Ralph v3 ended NO SURVIVORS; 72 sources and 21 batches indicate early plateau risk. | all |
| L-003 | Decision log | `/DECISIONS.md` | Prior decision: no forced survivor promotion; evidence logging is mandatory deliverable. | all |
| L-004 | Pipeline code | `/src/ixos_rank/candidate_generator/mod.rs` | Hard candidate cap and ask-anchor filter can prune anchor-bearing candidates before rerank. | A01 A03 A04 A05 B01 B05 B09 |
| L-005 | Pipeline code | `/src/ixos_rank/candidate_generator/ripgrep_funnel.rs` | `timeout_ms=300` and hit cap can truncate lexical evidence; cloud placeholders skipped. | A01 A03 A09 B04 B09 |
| L-006 | Pipeline code | `/src/ixos_rank/progressive.rs` | Auto refine gating, witness guard env flag, heuristic sensitive suppression, early lexical streaming. | A01 A04 A07 A08 A09 B11 B19 |
| L-007 | Command layer | `/src-tauri/src/commands/search.rs` | Auto downgrades to Flash without Pro; Ask mode affects Pro path load/refine behavior. | A09 B11 B12 |
| L-008 | Semantic layer | `/src/ixos_rank/semantic_engine.rs` | Pure semantic path uses capped file subset; rerank/search_pure behaviors differ by cache mode. | A01 A03 A09 B04 |
| L-009 | Current benchmark reality | `/reports/innovation_sprint_vnext/01_BASELINE.md` | Non-progressive matrix failures and high mixed-cache top1 variance remain unresolved. | A10 A13 B11 B12 |
| L-010 | Current quality baseline | `/reports/innovation_sprint_vnext/atlas/results_baseline_flash.md` | AnchorTop1Hit@1=0.8, PlausibleWrong@k=0.1333, SensitiveLeak@k=0 on tiny corpus. | A01 A04 A07 B11 |
| L-011 | Current latest atlas | `/reports/innovation_sprint_vnext/atlas/results_latest.md` | ControllerProCallRate low (0.0133) with no trust gain over baseline and slight latency increase. | A13 B12 B20 |
| L-012 | Architecture map | `/reports/innovation_sprint_vnext/00_ARCH_MAP.md` | Pipeline stages + cache layers identify where trust checks can be cheap vs expensive. | all |

## Web Prior-Art Sources
| ID | Year | Type | Link | Key takeaway | Threatens ARCH IDs |
|---|---:|---|---|---|---|
| W-001 | 2021 | Paper | https://arxiv.org/abs/2104.07186 | COIL preserves lexical exact-match signals in neural retrieval; anchor-preservation is established. | A02 A05 B05 |
| W-002 | 2023 | Paper | https://aclanthology.org/2023.findings-acl.880/ | Sparse+dense complementarity objectives already formalize hybrid fusion behavior. | A02 A17 B01 |
| W-003 | 2023 | Paper | https://arxiv.org/abs/2310.11511 | Self-RAG demonstrates uncertainty-triggered retrieval escalation as known pattern. | A12 A13 B12 B20 |
| W-004 | 2024 | Paper | https://arxiv.org/abs/2403.17786 | Query refinement for diverse top-k uses constrained optimization and refinement loops. | A11 A20 B08 B17 |
| W-005 | 2023 | Paper | https://www.vldb.org/pvldb/vol16/p2377-chen.pdf | Why-not-yet top-k repair already addresses constrained rank fixing. | A11 A16 B08 B17 |
| W-006 | 2024 | Paper | https://www.cs.cornell.edu/people/tj/publications/guo_etal_24a.pdf | Slot-constrained ranking formalizes reserved slots and feasibility algorithms. | A02 B05 |
| W-007 | 2018 | Paper | https://arxiv.org/abs/1809.04572 | Constrained ranking objectives are mature; many trust-constrained formulations are incremental. | A17 A20 B03 B06 |
| W-008 | 2022 | Paper | https://arxiv.org/abs/2202.09604 | Primal-dual constrained optimization methods cover budget-aware control families. | A20 B03 B12 |
| W-009 | 2026 | Paper | https://arxiv.org/abs/2602.14648 | Verifiable vector DB design indicates proof/verification in retrieval stacks is active prior art. | A06 B16 |
| W-010 | 2015 | Paper | https://arxiv.org/abs/1510.05175 | Provably secure top-k over encrypted databases exists; secure-top-k novelty bar is high. | A06 B16 |
| W-011 | 2009 | Paper | https://arxiv.org/abs/0911.4238 | Secure top-k/range/skyline queries in tiered sensor networks are longstanding prior art. | A06 B16 |
| W-012 | 2019 | Paper | https://arxiv.org/abs/1904.02033 | Secure k-NN with approximate top-k circuits already studied with high overhead. | A06 B16 B20 |
| W-013 | 2025 | Paper | https://arxiv.org/abs/2508.08285 | ALGEN shows latent-space obfuscation/recovery for privacy in vector retrieval. | A07 A08 B19 |
| W-014 | 2025 | Paper | https://arxiv.org/abs/2504.12369 | Universal inversion attacks undermine assumptions about embedding-space privacy. | A07 A08 B19 |
| W-015 | 2025 | Paper | https://arxiv.org/pdf/2506.21761 | Transform-before-query defenses for RAG retrieval already exist. | A07 A08 B19 |
| W-016 | 2023 | Paper | https://arxiv.org/abs/2303.09522 | MUS enumeration is mature for SAT/SMT conflict explanation. | A04 B07 B08 |
| W-017 | 2024 | Paper | https://arxiv.org/abs/2408.10153 | Graph pruning for MUS extraction improves scalability, reducing novelty of raw unsat-core use. | A04 B07 |
| W-018 | 2024 | Paper | https://www.vldb.org/pvldb/vol17/p106-li.pdf | Query refinement under diversity constraints reinforces constrained-fix family saturation. | A11 A20 B08 |
| W-019 | 2024 | Paper | https://arxiv.org/abs/2409.08142 | Ranked enumeration with monotonic ranking functions is now broad prior art. | A10 B17 |
| W-020 | 2011 | Paper | https://arxiv.org/abs/1103.2651 | Continual top-k maintenance and incremental updates predate transactional-rank claims. | A09 B11 |
| W-021 | 2026 | Product doc | https://docs.opensearch.org/docs/latest/vector-search/filter-search-knn/index/ | Filtered ANN is commodity production behavior. | A07 A08 B19 |
| W-022 | 2026 | Product doc | https://www.elastic.co/docs/solutions/search/hybrid-search/ | Hybrid lexical+semantic ranking stacks are mainstream in production systems. | A01 A02 A17 B01 |
| W-023 | 2026 | Product doc | https://docs.vespa.ai/en/nearest-neighbor-search-guide.html | ANN + ranking profiles + filtering are mature in Vespa. | A07 A08 B19 |
| W-024 | 2026 | Product doc | https://qdrant.tech/documentation/concepts/filtering/ | Predicate filtering in vector search is first-class and well-known. | A07 A08 B19 |
| W-025 | 2026 | Product doc | https://milvus.io/docs/filtered-search.md | Filtered vector search is productized and non-novel as a class. | A07 A08 B19 |
| W-026 | 2026 | Product doc | https://learn.microsoft.com/en-us/azure/search/vector-search-filters | Pre-/post-filter placement tradeoffs already documented for vector retrieval. | A07 A08 B19 |
| W-027 | 2026 | Product doc | https://docs.weaviate.io/deploy/configuration/rbac | RBAC + retrieval access controls are mature system capability, not novel mechanism. | B02 B15 |

## Web Prior-Art Sources (Cycle 3 SR1 Chunk B additions)
| ID | Year | Type | Link | Key takeaway | Threatens ARCH IDs |
|---|---:|---|---|---|---|
| W-040 | 2019 | Issue/discussion | https://github.com/BurntSushi/ripgrep/issues/1497 | Ripgrep explicitly frames exhaustive matching and rejects ranking semantics, reinforcing post-lexical continuity design need. | CY3-R1-ARCH-01 CY3-R1-ARCH-02 |
| W-041 | 2004 | Paper | https://www.vldb.org/conf/2004/RS17P3.PDF | Approximate top-k with probabilistic precision/recall guarantees is longstanding prior art. | A01 CY3-R1-ARCH-01 CY3-R1-ARCH-03 |
| W-042 | 2018 | Paper | https://www.vldb.org/pvldb/vol11/p866-mouratidis.pdf | Exact processing of uncertain top-k and candidate supersets already studied deeply. | CY3-R1-ARCH-01 CY3-R1-ARCH-03 CY3-R1-ARCH-04 |
| W-043 | 2020 | Paper | https://www.vldb.org/pvldb/vol13/p2146-issa.pdf | Top-k under inconsistency degrees provides formal ranking under conflicting constraints. | A04 CY3-R1-ARCH-04 CY3-R1-ARCH-05 |
| W-044 | 2023 | Journal paper | https://vldb.org/vldb_journal/index.php/component/remository/Published-Articles/Volume-17/Number-1/TopX-efficient-and-versatile-top--k-query-processing-for-semistructured-data/?Itemid=60 | Efficient top-k query processing over semistructured data is an active mature systems area. | CY3-R1-ARCH-02 CY3-R1-ARCH-03 |
| W-045 | 2026 | Product doc | https://www.elastic.co/guide/en/elasticsearch/reference/8.19/paginate-search-results.html | `search_after` requires stable sort/query; pagination consistency requires PIT for stronger stability. | CY3-R1-ARCH-06 CY3-R1-ARCH-07 |
| W-046 | 2026 | Product doc | https://www.elastic.co/guide/en/elasticsearch/reference/8.19/consistent-scoring.html | Consistent scoring controls (`dfs_query_then_fetch`) are established for cross-shard drift mitigation. | CY3-R1-ARCH-07 |
| W-047 | 2025 | Product blog | https://opensearch.org/blog/OpenSearch-Approximation-Framework/ | Early termination with correctness guarantees already implemented in production query engine internals. | CY3-R1-ARCH-01 CY3-R1-ARCH-02 CY3-R1-ARCH-06 |
| W-048 | 2025 | Product blog | https://opensearch.org/blog/introducing-common-filter-support-for-hybrid-search-queries/ | Early filter pushdown in hybrid retrieval is productionized to reduce work and maintain relevance. | CY3-R1-ARCH-05 CY3-R1-ARCH-08 |
| W-049 | 2025 | Product blog | https://opensearch.org/blog/navigating-pagination-in-hybrid-queries-with-the-pagination_depth-parameter/ | Hybrid pagination depth controls expose bounded-depth retrieval tradeoffs in production. | CY3-R1-ARCH-06 CY3-R1-ARCH-07 |
| W-050 | 2025 | Product blog | https://opensearch.org/blog/introducing-reciprocal-rank-fusion-hybrid-search/ | Rank-based fusion stability via RRF is mature and documented in production. | A01 CY3-R1-ARCH-08 |
| W-051 | 2025 | Product blog | https://opensearch.org/blog/reducing-hybrid-query-latency-in-opensearch-3-1-with-efficient-score-collection/ | Hybrid latency reduction via low-level score collection optimization is mainstream systems engineering. | CY3-R1-ARCH-02 CY3-R1-ARCH-08 |

## Web Prior-Art Sources (Cycle 4 SR1 Chunk B additions)
| ID | Year | Type | Link | Key takeaway | Threatens ARCH IDs |
|---|---:|---|---|---|---|
| W-052 | 2026 | Reference | https://en.wikipedia.org/wiki/Counterexample-guided_abstraction_refinement | CEGAR-style coarse-to-fine conflict refinement is established formal-methods practice. | CY4-R1-ARCH-01 CY4-R1-ARCH-02 |
| W-053 | 2023 | Paper | https://arxiv.org/abs/2308.03022 | Approximate min-cut computation at scale is mature, lowering novelty of generic conflict-sketch based cuts. | CY4-R1-ARCH-01 CY4-R1-ARCH-03 |
| W-054 | 2021 | Paper | https://arxiv.org/abs/2106.10278 | Efficient MUS/MCS enumeration strongly pressures conflict-core novelty claims. | A04 CY4-R1-ARCH-02 CY4-R1-ARCH-04 |
| W-055 | 2023 | Paper | https://arxiv.org/abs/2306.01308 | SAT-based conflict generation for over-constrained systems demonstrates mature conflict-explanation mechanisms. | A04 CY4-R1-ARCH-04 |
| W-056 | 2022 | Paper | https://arxiv.org/abs/2204.00971 | False-positive-sensitive information retrieval formalizes leak-control tradeoffs beyond naive filters. | CY4-R1-ARCH-05 CY4-R1-ARCH-06 |
| W-057 | 2024 | Paper | https://arxiv.org/abs/2403.14379 | Robust role-based access controls in RAG increase prior-art pressure on retrieval-time leak constraints. | CY4-R1-ARCH-06 CY4-R1-ARCH-08 |
| W-058 | 2024 | Paper | https://arxiv.org/abs/2402.05785 | CRAFT framework addresses context-aware authorization and trust in retrieval systems. | CY4-R1-ARCH-06 CY4-R1-ARCH-08 |
| W-059 | 2025 | Paper | https://arxiv.org/abs/2504.06604 | Contextual chunking for sensitive leakage prevention is already studied in retrieval/RAG settings. | CY4-R1-ARCH-05 CY4-R1-ARCH-07 |
| W-060 | 2026 | Product doc | https://www.elastic.co/guide/en/elasticsearch/reference/current/search-using-query-rules.html | Query rules/pinning/demotion are commodity controls in production retrieval. | CY4-R1-ARCH-07 CY4-R1-ARCH-08 |
| W-061 | 2026 | Product doc | https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-pinned-query.html | Pinned-query ranking control further narrows novelty for publish-time rank overrides. | CY4-R1-ARCH-07 |
| W-062 | 2026 | Product doc | https://docs.weaviate.io/weaviate/search/filters | Hybrid filter capabilities are mature and configurable in vector+keyword search. | CY4-R1-ARCH-06 CY4-R1-ARCH-08 |
| W-063 | 2026 | Product doc | https://docs.aws.amazon.com/kendra/latest/dg/filtering.html | Query-time access filters and ACL-linked retrieval are mature enterprise patterns. | CY4-R1-ARCH-08 |

## Web Prior-Art Sources (Cycle 5 SR1 Chunk B additions)
| ID | Year | Type | Link | Key takeaway | Threatens ARCH IDs |
|---|---:|---|---|---|---|
| W-064 | 2025 | Paper | https://arxiv.org/abs/2505.05422 | Epsilon-safe dynamic pruning with tight predictions indicates strong existing safety-efficiency formalization. | CY5-R1-ARCH-01 CY5-R1-ARCH-02 |
| W-065 | 2024 | Paper | https://arxiv.org/abs/2407.15759 | Quantized dynamic pruning further matures budgeted retrieval under efficiency constraints. | CY5-R1-ARCH-02 CY5-R1-ARCH-03 |
| W-066 | 2019 | Paper | https://arxiv.org/abs/1909.13082 | Dynamic pruning efficiency/effectiveness tradeoffs are well-characterized empirically. | CY5-R1-ARCH-01 CY5-R1-ARCH-04 |
| W-067 | 2025 | Paper | https://arxiv.org/abs/2504.15394 | Hardware-aware top-k dynamic pruning extends optimization space and prior-art pressure. | CY5-R1-ARCH-02 CY5-R1-ARCH-03 |
| W-068 | 2024 | Paper | https://aclanthology.org/2024.emnlp-main.1256.pdf | Tiered dynamic pruning with BMw and MaxScore adaptation is already advanced. | CY5-R1-ARCH-01 CY5-R1-ARCH-04 |
| W-069 | 2026 | API doc | https://lucene.apache.org/core/10_3_0/core/org/apache/lucene/search/package-summary.html | Lucene exposes BlockMax/competitive score pruning primitives in core search internals. | CY5-R1-ARCH-05 CY5-R1-ARCH-08 |
| W-070 | 2026 | Product doc | https://docs.vespa.ai/en/using-wand-with-vespa.html | weakAnd/WAND behavior for top-k retrieval is productized and configurable. | CY5-R1-ARCH-05 CY5-R1-ARCH-08 |
| W-071 | 2026 | Product doc | https://docs.opensearch.org/docs/latest/vector-search/filter-search-knn/index/ | Filter placement + ANN constraints in OpenSearch are already mature budget controls. | CY5-R1-ARCH-06 CY5-R1-ARCH-08 |
| W-072 | 2026 | Product doc | https://www.elastic.co/guide/en/elasticsearch/reference/current/query-filter-context.html | Query/filter context separation is established mechanism for speed/recall tradeoffs. | CY5-R1-ARCH-06 CY5-R1-ARCH-07 |
| W-073 | 2025 | Product blog | https://opensearch.org/blog/hybrid-search-optimization-using-rank-normalization-in-opensearch/ | Rank-normalization optimizations are productionized for hybrid recall/latency balance. | CY5-R1-ARCH-07 CY5-R1-ARCH-08 |
| W-074 | 2007 | Paper | https://arxiv.org/abs/0707.1797 | Anytime algorithm foundations for interruptible optimization are longstanding. | CY5-R1-ARCH-03 CY5-R1-ARCH-04 |
| W-075 | 2018 | Paper | https://arxiv.org/abs/1807.04865 | Anytime top-k processing in metric spaces pressures novelty of interruptible top-k guarantees. | CY5-R1-ARCH-03 CY5-R1-ARCH-04 |
