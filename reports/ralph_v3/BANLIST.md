
# BANLIST


## PHASE 6 BANLIST ENTRIES

### BAN-01 Policy/Authorization-Gated Retrieval (Killed)
- Collapsed ARCH IDs: ARCH-01, ARCH-05, ARCH-17, ARCH-30, ARCH-37
- Verdict: NOT NOVEL / INCREMENTAL
- Strongest collapse reason: ABAC/ReBAC and enterprise search DLS/FLS/ACL filtering already implement policy-gated retrieval and visibility control at query time.
- Closest prior art links:
  - https://csrc.nist.gov/pubs/sp/800/162/upd2/final
  - https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/
  - https://docs.opensearch.org/latest/security/access-control/document-level-security/
  - https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/controlling-access-at-document-field-level
  - https://docs.aws.amazon.com/kendra/latest/dg/user-context-filter.html

### BAN-02 Constrained/Rule-Based Top-k Ranking (Killed)
- Collapsed ARCH IDs: ARCH-03, ARCH-06, ARCH-14, ARCH-20, ARCH-23, ARCH-29, ARCH-38
- Verdict: INCREMENTAL
- Strongest collapse reason: constrained optimization and rule-based ranking layers are established (fairness constraints, LTR/function queries, custom ranking/rules).
- Closest prior art links:
  - https://arxiv.org/abs/1809.04572
  - https://solr.apache.org/guide/solr/latest/query-guide/learning-to-rank.html
  - https://solr.apache.org/guide/solr/latest/query-guide/function-queries.html
  - https://www.algolia.com/doc/guides/managing-results/must-do/custom-ranking
  - https://www.algolia.com/doc/guides/managing-results/rules/merchandising-and-promoting/in-depth/optional-filters

### BAN-03 Cascade/Routing/Budget Allocation Family (Killed)
- Collapsed ARCH IDs: ARCH-02, ARCH-08, ARCH-12, ARCH-18, ARCH-22, ARCH-24, ARCH-31, ARCH-32, ARCH-35
- Verdict: INCREMENTAL
- Strongest collapse reason: selective reranking, cascaded ranking, and query routing under cost/quality constraints are already core system design patterns.
- Closest prior art links:
  - https://arxiv.org/abs/2502.02853
  - https://arxiv.org/abs/2505.23795
  - http://www.cs.otago.ac.nz/homepages/andrew/papers/2011-2.pdf
  - https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-hybrid-query.html

### BAN-04 Filtered ANN + Vector Access Control (Killed)
- Collapsed ARCH IDs: ARCH-10, ARCH-20, ARCH-34
- Verdict: INCREMENTAL
- Strongest collapse reason: metadata filtering and access-controlled vector retrieval are active product capabilities and paper topics.
- Closest prior art links:
  - https://proceedings.mlr.press/v267/gupta25g.html
  - https://arxiv.org/abs/2503.09044
  - https://qdrant.tech/documentation/concepts/filtering/
  - https://milvus.io/docs/filtered-search.md

### BAN-05 Multi-View / Evidence / Graph Heuristics (Killed)
- Collapsed ARCH IDs: ARCH-04, ARCH-15, ARCH-16, ARCH-26, ARCH-27, ARCH-33, ARCH-36, ARCH-39
- Verdict: INCREMENTAL
- Strongest collapse reason: these are feature-engineering variants of known reranking signals (multi-view fusion, evidence scoring, consistency checks, graph coherence).
- Closest prior art links:
  - https://arxiv.org/abs/2104.07186
  - https://dl.acm.org/doi/10.1145/3404835.3462939
  - https://solr.apache.org/guide/solr/latest/query-guide/learning-to-rank.html

### BAN-06 Prior-Learned Priors from Feedback (Killed)
- Collapsed ARCH IDs: ARCH-13
- Verdict: INCREMENTAL
- Strongest collapse reason: online adjustment from historical outcomes is standard LTR/personalization practice.
- Closest prior art links:
  - https://solr.apache.org/guide/solr/latest/query-guide/learning-to-rank.html
  - https://github.com/vespa-engine/sample-apps

### BAN-07 Secure/Encrypted Retrieval Novelty Overclaim Guard (Killed as novelty claim)
- Collapsed ARCH IDs: ARCH-25, ARCH-34 (novelty overclaim component)
- Verdict: INCREMENTAL unless stronger differentiation is proven
- Strongest collapse reason: large SSE leakage-abuse literature and defenses already cover many secure retrieval claims.
- Closest prior art links:
  - https://eprint.iacr.org/2016/718
  - https://eprint.iacr.org/2017/046
  - https://eprint.iacr.org/2020/233
  - https://eprint.iacr.org/2022/1531

### BAN-08 Patent/Implementation Saturation Alert
- Collapsed ARCH IDs: architecture naming-based novelty claims across all candidates
- Verdict: KILLED AS EVIDENCE TYPE
- Strongest collapse reason: existing patents/repos demonstrate many mechanism families in practical use; naming is not novelty evidence.
- Closest prior art links:
  - https://patents.google.com/patent/US7600263B2/en
  - https://github.com/deepmipt/qdrant
  - https://github.com/weaviate/weaviate

### BAN-09 Adaptive Escalation from Uncertainty (Historical Duplicate)
- Collapsed ARCH IDs: ARCH-08, ARCH-12, ARCH-24, ARCH-31
- Verdict: INCREMENTAL
- Strongest collapse reason: prior Ralph notes already cite Self-RAG/FLARE as direct analogs for uncertainty-triggered retrieval escalation.
- Closest prior art links:
  - https://arxiv.org/abs/2310.11511
  - https://arxiv.org/abs/2305.06983

### BAN-10 Proof/Certificate Layering Over Retrieval Output
- Collapsed ARCH IDs: ARCH-41, ARCH-43, ARCH-50, ARCH-56, ARCH-67
- Verdict: INCREMENTAL
- Collapse reason: proof-carrying authorization/data patterns pre-exist; retrieval integration is adaptation with high complexity cost.
- Links: https://www.cs.princeton.edu/research/techreps/451 ; https://en.wikipedia.org/wiki/Proof-carrying_data ; https://blog.succinct.xyz/spacetime/

### BAN-11 Stability/Monitoring Instrumentation Family
- Collapsed ARCH IDs: ARCH-52, ARCH-53, ARCH-54, ARCH-58, ARCH-69, ARCH-70
- Verdict: INCREMENTAL
- Collapse reason: these are observability/calibration/risk-control add-ons, not new retrieval architecture families.
- Links: https://arxiv.org/abs/2410.01231 ; https://arxiv.org/abs/2209.12682 ; https://solr.apache.org/guide/solr/latest/query-guide/learning-to-rank.html

### BAN-12 Constraint Objective Variants
- Collapsed ARCH IDs: ARCH-47, ARCH-61, ARCH-65
- Verdict: INCREMENTAL
- Collapse reason: constrained optimization formulations are already broad prior art in ranking/control literature.
- Links: https://arxiv.org/abs/1809.04572 ; https://arxiv.org/abs/2202.09604
