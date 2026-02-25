# Literature + Product Scan Log and Bibliography

Date: 2026-02-23  
Purpose: Phase 2 broad scan for high-impact levers that can improve both latency and retrieval success under Ixos constraints (local-first, progressive streaming, privacy modes).

## Scan method

- Query strategy: broad multi-family web search over desktop search, filesystem indexing/watchers, learned planning, retrieval cascades, hybrid lexical/semantic retrieval, and personalization/privacy.
- Coverage approach: each query was run against web-scale search indexes; manual review focused on high-signal primary sources (papers, official docs, product docs).
- Selection rule for this bibliography: retain sources with direct systems/mechanism relevance to reducing walk/scan/embed/rank or improving candidate quality.
- Safety rule used: no novelty claim based on one paper; each final claim must survive a closest-prior-art check.

## Query log (representative)

### Desktop search / personal IR
- `desktop search architecture indexing file system watcher`
- `personal information retrieval desktop search paper`
- `local-first desktop search progressive results`
- `Stuff I've Seen personal information retrieval`
- `Apple Spotlight indexing guide`
- `Windows Search indexing FAQ`
- `Raycast root search`
- `Alfred usage ranking`

### Incremental indexing / filesystem watchers
- `USN journal desktop search`
- `FSEvents API file indexing`
- `inotify watcher indexing`
- `fanotify filesystem monitoring`
- `Watchman file watching`
- `near real time indexing Lucene`
- `incremental indexing local file search`
- `Zoekt trigram index`

### Stop scanning / grep alternatives
- `trigram code search index`
- `ripgrep performance and prefilter`
- `Bloom filter prefilter text retrieval`
- `substring search index trigram`
- `code search at scale indexing`
- `Google code search trigram`

### Learned query planning / cost-based optimization
- `learned query optimizer Neo Bao`
- `cost-based query planner with latency objective`
- `query performance prediction information retrieval`
- `learned optimizer latency SLA`

### Retrieval cascades / early exit
- `WAND block-max WAND top-k retrieval`
- `tail latency minimization multi-stage retrieval`
- `early exit neural retrieval cascade`
- `anytime retrieval ranking`
- `conformal early exit retrieval`

### Hybrid lexical + semantic retrieval
- `hybrid BM25 dense retrieval RRF`
- `BEIR benchmark sparse dense`
- `SPLADE sparse retrieval`
- `ColBERTv2 PLAID retrieval`
- `Vespa phased ranking`
- `Weaviate hybrid search`
- `Elasticsearch reciprocal rank fusion`
- `OpenSearch hybrid search`
- `Qdrant hybrid queries`

### Behavior-aware routing / personalization
- `Hawkes process personalized search`
- `temporal point process retrieval ranking`
- `contextual bandit retrieval routing`
- `session-based retrieval optimization`
- `workstream-aware ranking`

### Privacy-safe personalization
- `federated averaging paper`
- `local differential privacy RAPPOR`
- `privacy-preserving personalization on device`
- `DP-SGD`
- `federated contextual bandit`

## Bibliography (retained high-signal sources)

## A) Desktop search, local IR, and product baselines
1. Stuff I've Seen (Microsoft Research): https://www.microsoft.com/en-us/research/publication/stuff-ive-seen-a-system-for-personal-information-retrieval-and-re-use/
2. Personal Information Search (CACM): https://cacm.acm.org/research/personal-information-search-challenges-and-methods/
3. Instant Search via Query Segmentation (Microsoft Research): https://www.microsoft.com/en-us/research/publication/instant-search-via-query-segmentation/
4. Apple Spotlight user guide: https://support.apple.com/guide/mac-help/spotlight-mchlp1008/mac
5. Windows indexing FAQ: https://support.microsoft.com/en-us/windows/indexing-in-windows-faq-da061c83-af6b-095c-0f7a-4dfecda4d15a
6. Raycast Root Search: https://manual.raycast.com/root-search
7. Raycast Search Files: https://manual.raycast.com/search-files
8. Alfred docs (usage-adaptive launcher baseline): https://www.alfredapp.com/help/getting-started/what-is-alfred/
9. Everything (Voidtools) docs: https://www.voidtools.com/support/everything/

## B) Filesystem watchers and incremental indexing
10. Watchman docs: https://facebook.github.io/watchman/
11. Linux inotify man page: https://man7.org/linux/man-pages/man7/inotify.7.html
12. Linux fanotify man page: https://man7.org/linux/man-pages/man7/fanotify.7.html
13. Apple File System Events docs: https://developer.apple.com/documentation/coreservices/file_system_events
14. Microsoft USN change journals: https://learn.microsoft.com/windows/win32/fileio/change-journals
15. Lucene near-real-time search docs: https://lucene.apache.org/core/9_9_0/core/org/apache/lucene/index/package-summary.html#near-real-time-search
16. Sourcegraph Zoekt repository: https://github.com/sourcegraph/zoekt
17. Russ Cox on trigram indexing (regular expression/code search): https://swtch.com/~rsc/regexp/regexp4.html
18. zoxide (frecency routing baseline): https://github.com/ajeetdsouza/zoxide

## C) Learned planning and cost-based optimization
19. Selinger et al., System R access path selection (classical CBO): https://dl.acm.org/doi/10.1145/582095.582099
20. Marcus et al., Neo learned query optimizer: https://arxiv.org/abs/1904.03711
21. Marcus et al., Bao learned query optimizer: https://arxiv.org/abs/2004.03814
22. Li et al., Contextual bandit for personalized recommendation (LinUCB): https://www.microsoft.com/en-us/research/publication/a-contextual-bandit-approach-to-personalized-news-article-recommendation/
23. Joachims et al., counterfactual learning to rank (IPS/DTR): https://dl.acm.org/doi/10.1145/3018661.3018699
24. Query performance prediction survey (resource selection context): https://dl.acm.org/doi/10.1145/1458082.1458102

## D) Retrieval cascades and early exit
25. Broder et al., WAND two-level retrieval process: https://www.semanticscholar.org/paper/Efficient-Query-Evaluation-using-a-Two-Level-Broder-Carmel/c8f7e4b8335ef76864ef4b74f66f7f09a0a5097d
26. Ding and Suel, Block-Max WAND: https://dl.acm.org/doi/10.1145/2009916.2010198
27. Turtle and Flood, MaxScore-style efficient top-k retrieval: https://dl.acm.org/doi/10.1145/215206.215331
28. Mackenzie et al., tail-latency minimization in multi-stage retrieval: https://arxiv.org/abs/1711.11086
29. Dai and Callan, Deeper and Wider Pooling with ColBERT/late interaction context: https://arxiv.org/abs/1910.11420
30. ColBERTv2: https://arxiv.org/abs/2112.01488
31. PLAID: https://arxiv.org/abs/2205.09707

## E) Hybrid lexical + semantic retrieval
32. Robertson and Zaragoza, BM25 review: https://dl.acm.org/doi/10.1561/1500000019
33. Karpukhin et al., DPR: https://arxiv.org/abs/2004.04906
34. Formal et al., SPLADE: https://arxiv.org/abs/2109.10086
35. Formal et al., SPLADE v2 efficiency/relevance: https://arxiv.org/abs/2109.10086
36. Khattab and Zaharia, ColBERT: https://arxiv.org/abs/2004.12832
37. Thakur et al., BEIR benchmark: https://arxiv.org/abs/2104.08663
38. Cormack et al., Reciprocal Rank Fusion: https://doi.org/10.1145/1571941.1572114
39. Elastic RRF docs: https://www.elastic.co/guide/en/elasticsearch/reference/current/rrf.html
40. Vespa phased ranking docs: https://docs.vespa.ai/en/phased-ranking.html
41. Weaviate hybrid search docs: https://weaviate.io/developers/weaviate/search/hybrid
42. OpenSearch hybrid search docs: https://opensearch.org/docs/latest/search-plugins/hybrid-search/
43. Qdrant hybrid queries docs: https://qdrant.tech/documentation/concepts/hybrid-queries/

## F) Behavior-aware routing and personalization
44. Xu et al., Effective Personalized Search with Heterogeneous Graph Based Hawkes Process (IEEE TBDATA 2024): https://doi.org/10.1109/TBDATA.2024.3403392
45. Mei and Eisner, Neural Hawkes Process: https://arxiv.org/abs/1612.09328
46. Trivedi et al., DyRep: https://openreview.net/forum?id=HyePrhR5KX
47. Rossi et al., Temporal Graph Networks: https://arxiv.org/abs/2006.10637
48. Rendle et al., session-based recommendation context: https://arxiv.org/abs/1511.06939
49. Sutton and Barto (RL basis for adaptive routing): http://incompleteideas.net/book/the-book.html

## G) Privacy-preserving personalization
50. McMahan et al., Federated Averaging: https://arxiv.org/abs/1602.05629
51. Dwork and Roth, Differential Privacy foundations: https://www.cis.upenn.edu/~aaroth/Papers/privacybook.pdf
52. Abadi et al., Deep Learning with Differential Privacy (DP-SGD): https://arxiv.org/abs/1607.00133
53. Erlingsson et al., RAPPOR (local differential privacy): https://research.google/pubs/pub42852/
54. Apple Differential Privacy overview: https://www.apple.com/privacy/docs/Differential_Privacy_Overview.pdf
55. Kairouz et al., Advances and Open Problems in Federated Learning: https://arxiv.org/abs/1912.04977
56. Hard et al., Federated learning for mobile keyboard query suggestion: https://arxiv.org/abs/1811.03604

## Scan synthesis notes

- Strongly repeated pattern across systems literature and products: large gains usually come from **avoiding work** (indexing, pruning, gating), not making every stage slightly faster.
- Desktop systems that feel instant (Everything/Spotlight-style behavior) rely on **continuous background state** plus fast query-time lookup.
- Retrieval literature supports multi-stage cascades with dynamic pruning/early exit for tail-latency control.
- Personalization papers often optimize ranking quality, but Ixos-specific contribution space appears to be constrained combination: local-first + progressive stream + privacy fallback + optional indexing.
