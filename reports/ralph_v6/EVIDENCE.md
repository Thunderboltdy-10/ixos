# Ralph v6 Evidence

## Local Code Sources

- `src/ixos_rank/ask_mode/intent_detector.rs`
  - Contribution: showed Ask-mode activation is prefix matching plus lightweight char-ngram template similarity.
- `src/ixos_rank/ask_mode/anchor_extractor.rs`
  - Contribution: showed anchors are IDF-filtered query terms, not a new retrieval object.
- `src/ixos_rank/ask_mode/snippet_trust.rs`
  - Contribution: showed trusted snippet selection is anchor coverage plus semantic score.
- `src/ixos_rank/candidate_generator/query_preprocess.rs`
  - Contribution: showed Ask-mode query rewriting, semantic terms, anchor creation, and mode detection.
- `src/ixos_rank/progressive.rs`
  - Contribution: primary source for lexical anchor filtering, progressive stages, auto-refine heuristics, evidence deferral, witness guard, and the Ask-mode selected-model test.
- `src/ixos_rank/semantic_engine.rs`
  - Contribution: primary source for directory centroid boosts and FSTD topology prior.
- `src/ixos_rank/secure_ranker.rs`
  - Contribution: primary source for integrity/behavior/personal trust-aware ranking.
- `src-tauri/src/commands/search.rs`
  - Contribution: primary source for entitlement-gated model routing, Ask-mode activation, Flash/Pro loading rules, and progressive-search setup.

## Web Sources Actually Used

- [Certified Error Control of Candidate Set Pruning for Two-Stage Relevance Ranking](https://aclanthology.org/2022.findings-emnlp.156/)
  - Query: `Certified Error Control of Candidate Set Pruning for Two-Stage Relevance Ranking`
  - Contribution: anchored the formal risk-controlled pruning family used to attack `C20`.
- [Efficient and Effective Tail Latency Minimization in Multi-Stage Retrieval Systems](https://arxiv.org/abs/1711.11086)
  - Query: `site:arxiv.org tail latency multi-stage retrieval systems`
  - Contribution: established that latency/quality control in multi-stage retrieval is already a mature family, killing weak "smart stage scheduler" variants.
- [Cascade Ranking for Operational E-commerce Search](https://arxiv.org/abs/1706.02093)
  - Query: `1706.02093 cascade ranking`
  - Contribution: anchored industrial cascade ranking as known prior art against Ixos stage composition and Pro/Flash fusion claims.
- [Learning to Rank for Justification Selection in Explainable QA](https://arxiv.org/abs/2104.00673)
  - Query: `Learning to Rank for Justification Selection in Explainable QA`
  - Contribution: collapsed trusted-snippet and answer-justification candidates into known answer sentence selection / justification ranking work.
- [Hierarchical Semantic Retrieval with Cobweb: Efficient Exploration of Tree-Structured Memory](https://arxiv.org/abs/2502.02690)
  - Query: `2502.02690 hierarchical semantic retrieval cobweb`
  - Contribution: collapsed filesystem-topology-only prior claims toward known hierarchy-aware retrieval.
- [PrivacyBench: Measuring Privacy Leakage in Retrieval-Augmented Generation](https://arxiv.org/abs/2408.08037)
  - Query: `PrivacyBench Measuring Privacy Leakage in Retrieval-Augmented Generation`
  - Contribution: established privacy leakage as a real retrieval-adjacent failure surface relevant to `C19`.
- [Privacy-Aware Decoding Strikes Back? Revisiting Privacy Risks in RAG via Counterfactual Beam Search](https://arxiv.org/abs/2411.05004)
  - Query: `Privacy-Aware Decoding Strikes Back counterfactual beam search`
  - Contribution: provided an adjacent privacy-control family that did not collapse `C19`, because it acts at decoding time rather than retrieval exposure time.
- [Ranking Counterfactual Explanations](https://arxiv.org/abs/2408.08067)
  - Query: `Ranking Counterfactual Explanations`
  - Contribution: helped kill explanation/conflict candidates that were only new phrasings of ranking-explanation work.
- [Counterfactual Explanations for Document Ranking](https://arxiv.org/abs/2310.02324)
  - Query: `Counterfactual Explanations for Document Ranking`
  - Contribution: strengthened the kill case against static displacement/explanation candidates that collapsed to pairwise rank explanation.
- [Selective Question Answering under Domain Shift](https://arxiv.org/abs/2006.12435)
  - Query: `Selective Question Answering under Domain Shift`
  - Contribution: killed generic answerability-certificate and abstention-style Ask Mode claims.
- [QUARK: Query-Aware Ranking with Multimodal Documents for Visually Rich Information Retrieval](https://arxiv.org/abs/2501.13373)
  - Query: `QUARK visually rich information retrieval`
  - Contribution: strengthened the kill case against non-faithful-query and anchor-recovery candidates.
- [Tree of Clarifications: Answering Ambiguous Questions with Retrieval-Augmented Large Language Models](https://arxiv.org/abs/2410.12946)
  - Query: `Tree of Clarifications ambiguous questions`
  - Contribution: killed ambiguity-preserving multi-hypothesis result-set candidates as a known clarification family.
- [Evidence Ranking](https://arxiv.org/abs/2602.05126)
  - Query: `Evidence Ranking`
  - Contribution: killed evidence-sufficiency-first ranking as its own candidate family.
- [Stochastic Retrieval-Conditioned Reranking](https://arxiv.org/abs/2602.10001)
  - Query: `Stochastic Retrieval-Conditioned Reranking`
  - Contribution: killed staged retrieval-conditioned reranking candidates.
- [Learning to Select Rankers and Classifiers in Information Retrieval](https://dl.acm.org/doi/10.1145/3397271.3401087)
  - Query: `Learning to Select Rankers and Classifiers in Information Retrieval`
  - Contribution: strengthened the kill case against routing-regret and disagreement-gate candidates.

## Source Gaps That Matter

- I did not find a paper that clearly states a witness-obligation certificate for sensitive local retrieval exposure.
- I did not find a paper that clearly states an anytime probe-miss certificate across lexical -> semantic -> refine -> evidence progressive local search.
