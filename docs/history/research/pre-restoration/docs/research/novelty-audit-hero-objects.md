# Novelty Audit for Hero Objects
Date: 2026-02-25

## Audit method

Goal:
- Evaluate closest prior art for each hero object.
- Avoid overclaiming novelty.
- Rewrite each hero object to reduce nearest collisions.

Primary query families used:
- "certified recall retrieval pruning"
- "probe-based miss detection retrieval cascade"
- "budgeted query planning retrieval latency"
- "stopping rule progressive retrieval bound"
- "sketch-based lexical filtering guarantee"

Scoring:
- Closeness 5: nearly same core object.
- Closeness 0: only background relevance.

Truthfulness rule used:
- Do not label anything "novel" without showing source collisions and gaps.

---

## Hero Object A audit

Initial object:
- Probe-Miss Risk Certificate Planner (PMRCP)

### Closest sources (10-20)

| Source + link | Contribution | Closeness (0-5) | Missing vs PMRCP |
|---|---|---:|---|
| Certified Error Control Candidate Set Pruning for Two-Stage Retrieval [link](https://escholarship.org/uc/item/0b05w82w) | Risk-controlled pruning with formal error control | 5 | Not probe-miss certificate across full multi-stage local pipeline |
| TRAQ: Trustworthy Retrieval Augmented Question Answering [link](https://aclanthology.org/2024.naacl-long.210/) | Calibrated retrieval confidence | 4 | Not budgeted stage planner for search latency and work removal |
| Principled Context Engineering for RAG [link](https://arxiv.org/abs/2511.17908) | Coverage/risk framing in retrieval context assembly | 4 | Not filesystem/local-search stage optimization object |
| Risk-Controlling Prediction Sets [link](https://arxiv.org/abs/2101.02703) | Formal risk-control foundations | 3 | General method, not retrieval-stage action planner |
| Active Anytime-Valid Risk-Controlling Prediction Sets [link](https://www.microsoft.com/en-us/research/publication/active-anytime-valid-risk-controlling-prediction-sets/) | Sequential, anytime validity tools | 3 | No direct miss-risk planning for retrieval workloads |
| Selective Query Processing under Risk-sensitive Contexts [link](https://arxiv.org/abs/2305.18311) | Risk-aware selective processing | 4 | No explicit probe-miss certificate object |
| Learning to Efficiently Rank [link](https://research.google/pubs/learning-to-efficiently-rank/) | Efficiency-aware staged ranking | 3 | No calibrated recall bound certificate |
| A Cascade Ranking Model for Efficient Ranked Retrieval [link](https://ir.webis.de/anthology/2011.sigirconf_conference-2011.13/) | Cost-effective cascade ranking | 4 | Not certified miss-risk control |
| Cascade Ranking for Operational E-commerce Search [link](https://arxiv.org/abs/1706.02093) | Industrial cascade with latency-quality balance | 3 | No formal recall certificate |
| Query Performance Prediction survey [link](https://dl.acm.org/doi/10.1145/1458082.1458102) | Predictive query difficulty methods | 3 | Predictive, not certified control |
| QPP-GenRE [link](https://arxiv.org/abs/2404.01012) | Recent QPP approach | 2 | No constrained risk guarantee |
| EcoRank [link](https://arxiv.org/abs/2402.10866) | Budget-oriented ranking strategy | 2 | Different objective and no miss-risk certification |

### A-collision assessment

- Strong collision with certified-pruning literature exists.
- The differentiator must be the specific object:
  - probe-driven miss process
  - anytime-valid certificate
  - explicit latency budget actions
  - no-global-DB local deployment constraints

### A rewrite to reduce collision

Rewritten A:
- **Probe-Miss Martingale Certificate (PMMC)**
- Uses online miss-indicator martingale / confidence sequence rather than static calibration only.
- Applies certificate to cross-stage action policy in progressive retrieval.

Re-audit result for A:
- Still adjacent to certified pruning.
- Defensible contribution language: integration object + guarantees + systems evidence, not new primitive claim.

---

## Hero Object B audit

Initial object:
- Anytime Top-k Stability Certificate (ATSC)

### Closest sources (10-20)

| Source + link | Contribution | Closeness (0-5) | Missing vs ATSC |
|---|---|---:|---|
| Optimal Aggregation Algorithms for Middleware [link](https://arxiv.org/abs/cs/0204046) | Foundational top-k stopping guarantees | 5 | Does not target modern multi-stage lexical+semantic pipelines |
| Efficient Query Evaluation using a Two-Level Retrieval Process (WAND) [link](https://www.semanticscholar.org/paper/Efficient-Query-Evaluation-using-a-Two-Level-Broder-Carmel/c8f7e4b8335ef76864ef4b74f66f7f09a0a5097d) | Dynamic top-k pruning | 5 | No probabilistic certificate object framed across progressive pipeline |
| Block-Max WAND [link](https://dl.acm.org/doi/10.1145/2009916.2010198) | Safe block-level upper-bound pruning | 5 | Mainly lexical index pruning |
| Faster BlockMax WAND [link](https://dblp.org/rec/conf/sigir/MalliaOPTV17) | Practical pruning improvements | 5 | Same family of stopping/pruning concepts |
| MaxScore roots (Turtle/Flood lineage) [link](https://www.sciencedirect.com/science/article/abs/pii/030645739500020H) | Early top-k query termination | 5 | Core overlap is high |
| Efficient and Effective Tail Latency Minimization in Multi-Stage Retrieval [link](https://arxiv.org/abs/1711.11086) | Tail latency controls in multi-stage retrieval | 4 | Lacks one explicit confidence certificate object |
| Wacky Weights: Query Evaluation in Learned Sparse Retrieval [link](https://arxiv.org/abs/2110.11540) | Modern sparse retrieval evaluation tradeoffs | 3 | Not generalized stop-certificate framework |
| Block-Max Pruning for Learned Sparse Retrieval [link](https://arxiv.org/abs/2405.01117) | New sparse retrieval pruning methods | 4 | Still first-stage sparse focus |
| Dynamic Superblock Pruning [link](https://arxiv.org/abs/2504.17045) | Hierarchical pruning techniques | 4 | Not full progressive-system certificate |
| Many are Better than One: query-algorithm selection [link](https://doi.org/10.1016/j.ipm.2023.103359) | Per-query algorithm selection | 3 | Different object than top-k stability certificate |

### B-collision assessment

- Collision is very high with classic and modern top-k stopping/pruning.
- Even rewritten variants remain in a saturated area.

### B rewrite to reduce collision

Rewritten B:
- **Cross-Stage Stability Certificate (CSSC)**:
  - Combines lexical, semantic, and evidence-stage uncertainty bounds in one stop condition.

Re-audit result for B:
- Novelty risk remains high.
- Best framed as systems engineering, not as strong new-method claim.

---

## Hero Object C audit

Initial object:
- Certified Mandatory-Anchor Signature (CMAS)

### Closest sources (10-20)

| Source + link | Contribution | Closeness (0-5) | Missing vs CMAS |
|---|---|---:|---|
| Bloom Filter (1970) [link](https://dl.acm.org/doi/10.1145/362686.362692) | Fundamental AMQ structure | 5 | Not retrieval policy for mandatory anchors |
| Inverted Files vs Signature Files [link](https://dl.acm.org/doi/10.1145/290941.291025) | Signature file tradeoffs in IR | 5 | Not modern no-global-DB local-search constraints |
| BitFunnel (SIGIR 2017) [link](https://ir.webis.de/anthology/2017.sigirconf_conference-2017.63/) | Large-scale signature-based search design | 5 | Different deployment assumptions (global engine scale) |
| Sequence Bloom Tree [link](https://www.biorxiv.org/content/10.1101/118273v1) | Hierarchical Bloom filtering with guarantees | 4 | Domain-specific, not desktop file retrieval |
| AllSome Sequence Bloom Trees [link](https://pubmed.ncbi.nlm.nih.gov/29620920/) | Improved SBT pruning bounds | 4 | Not mandatory-anchor mixed exact/probabilistic policy |
| RAMBO [link](https://arxiv.org/abs/1910.04358) | Repeated merged Bloom architecture | 4 | Global/filter-bank style, not tiny per-file object |
| Cuckoo Filter [link](https://dl.acm.org/doi/10.1145/2674005.2674994) | Compact AMQ alternative | 3 | Does not define retrieval-stage decision policy |
| Xor Filters [link](https://arxiv.org/abs/1912.08258) | Very compact AMQ structure | 3 | No mandatory-anchor guarantee design |
| Learned Bloom Filters [link](https://arxiv.org/abs/1802.00884) | ML-assisted AMQ | 3 | Requires training assumptions outside Ixos simplicity goal |
| MinHash near-duplicate detection [link](https://cs.brown.edu/courses/cs253/papers/nearduplicate.pdf) | Similarity signatures | 3 | Not anchor containment guarantees |
| SimHash (Charikar) [link](https://dl.acm.org/doi/10.1145/509907.509965) | Similarity hashing theory | 3 | Different objective from lexical containment filter |

### C-collision assessment

- Core building blocks are classic.
- Strong practical systems fit, but novelty is mostly in constrained composition and evaluation.

### C rewrite to reduce collision

Rewritten C:
- **Dual-Bound Anchor Signature (DBAS)**:
  - exact rare-anchor component
  - probabilistic broad sketch
  - explicit uncertain branch and certified rejection policy

Re-audit result for C:
- Moderate novelty at best.
- Defensible as high-value systems method, not as new primitive.

---

## Cross-object decision from audit

Novelty/impact balance:
1. Hero A (rewritten as PMMC) - best balance.
2. Hero C (rewritten as DBAS) - strongest practical speed potential, moderate novelty.
3. Hero B (rewritten as CSSC) - highest prior-art collision.

## Safe novelty language template

Use:
- "Our contribution is ..."
- "To our knowledge, we did not find prior work combining these constraints and object design in this exact form."

Avoid:
- "first to ..."
- "novel primitive ..."
