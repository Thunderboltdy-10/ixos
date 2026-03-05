# BIBLIOGRAPHY

Structured entries: link + 2-4 line summary + why relevant.

1) ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction over BERT (Khattab & Zaharia, 2020)
- Link: https://arxiv.org/abs/2004.12832
- Summary: Introduces late interaction retrieval: query/document are encoded independently, then matched via lightweight fine-grained similarity. Shows high effectiveness with much lower query-time cost than full cross-encoders.
- Why relevant: core reference for witness-style semantic evidence and efficient multi-stage retrieval.

2) SPLADE v2: Sparse Lexical and Expansion Model for Information Retrieval (Formal et al., 2021)
- Link: https://arxiv.org/abs/2109.10086
- Summary: Learns sparse lexical/expansion representations that preserve exact-match strengths while remaining neural. Reports strong BEIR performance and efficiency/effectiveness tradeoffs.
- Why relevant: key prior art for lexical witnesses and sparse+dense complementarity.

3) BEIR: A Heterogenous Benchmark for Zero-shot Evaluation of IR Models (Thakur et al., 2021)
- Link: https://arxiv.org/abs/2104.08663
- Summary: Broad benchmark across 18 datasets, comparing lexical, dense, sparse, and late-interaction systems. Finds BM25 robust and late-interaction/rerank stronger but costlier.
- Why relevant: grounding for multi-dimensional evaluation and why hybrid/witness controllers matter.

4) Conformal Risk Control (Angelopoulos et al., ICLR 2024)
- Link: https://openreview.net/forum?id=33XGfHLtZg
- Summary: Generalizes conformal prediction to control expected monotone losses with finite-sample guarantees. Includes extensions for distribution shift and multiple risks.
- Why relevant: mathematical basis for risk-bounded retrieval controllers and abstain/escalate policies.

5) Time-uniform Chernoff bounds via nonnegative supermartingales (Howard et al., 2020)
- Link: https://arxiv.org/abs/1808.03204
- Summary: Provides anytime-valid concentration bounds for sequential decisions using supermartingales. Unifies classical inequalities in a time-uniform framework.
- Why relevant: foundation for anytime recall certificates in progressive search loops.

6) Not All Relevance Scores are Equal: Efficient Uncertainty and Calibration Modeling for Deep Retrieval Models (Cohen et al., 2021)
- Link: https://arxiv.org/abs/2105.04651
- Summary: Adds uncertainty and calibration modeling to retrieval scores with low overhead, enabling risk-aware reranking and confidence-aware behavior.
- Why relevant: direct precedent for score trustworthiness calibration.

7) TRAQ: Trustworthy Retrieval Augmented QA via Conformal Prediction (Li et al., 2024)
- Link: https://arxiv.org/abs/2307.04642
- Summary: Uses conformal prediction for end-to-end correctness guarantees in RAG settings. Demonstrates statistical guarantees while reducing prediction-set size.
- Why relevant: evidence that conformal methods can operationalize trust guarantees in retrieval pipelines.

8) Query Performance Prediction for Neural IR: Are We There Yet? (Faggioli et al., 2023)
- Link: https://arxiv.org/abs/2302.09947
- Summary: Evaluates many QPP methods across sparse and neural systems, showing neural IR prediction remains harder and less reliable in key settings.
- Why relevant: warns against over-trusting simple confidence proxies; motivates explicit guarantees.

9) Cascade Ranking for Operational E-commerce Search (Liu et al., 2017)
- Link: https://arxiv.org/abs/1706.02093
- Summary: Real-world multi-stage cascade optimizing relevance, latency, result size, and CPU cost at production scale.
- Why relevant: strongest operational prior art for staged ranking/control in large retrieval systems.

10) Unbiased Learning-to-Rank with Biased Feedback (Joachims et al., 2016)
- Link: https://arxiv.org/abs/1608.04468
- Summary: Counterfactual propensity-weighted framework for de-biasing click feedback and learning rankings under implicit feedback bias.
- Why relevant: causal/counterfactual logic inspiring runtime counterfactual anchor-sensitivity checks.

11) Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning Methods (Cormack et al., SIGIR 2009)
- Link: https://dblp.org/rec/conf/sigir/CormackCB09
- Summary: Classic rank-fusion reference showing robust fusion behavior using reciprocal ranks.
- Why relevant: baseline prior for combining retrieval channels; useful comparator against witness-consistency constraints.

12) Learning to efficiently rank (Wang, Lin, Metzler; SIGIR 2010 metadata)
- Link: https://research.google/pubs/learning-to-efficiently-rank/
- Summary: Early formulation of optimizing relevance-efficiency tradeoff in ranking/cascade settings.
- Why relevant: foundational context for compute-aware routing and budget allocation in candidate generation.
