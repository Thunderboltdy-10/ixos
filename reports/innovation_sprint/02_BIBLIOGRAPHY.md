# 02 Bibliography

Generated: 2026-03-03 21:50 UTC

## Method
- Seeded from `docs/research/lit_scan_bibliography.md` (56 numbered high-signal sources).
- Filtered to sources with direct mechanism relevance to Ixos constraints:
  - local-first privacy,
  - progressive retrieval,
  - latency tail control,
  - lexical+semantic trust calibration.
- Format per source: citation + link + short summary + why relevant.

## Coverage Snapshot
- Catalogued in this sprint file: `24` sources (high-priority subset).
- Imported source pool currently available in repo: `56` sources.
- Gap to target (`>=200`) remains open; expansion required in next cycles.

## Prior-Art Entries

### Retrieval efficiency / cascades
1. Broder et al., WAND two-level retrieval process  
   https://www.semanticscholar.org/paper/Efficient-Query-Evaluation-using-a-Two-Level-Broder-Carmel/c8f7e4b8335ef76864ef4b74f66f7f09a0a5097d  
   Introduces dynamic pruning for top-k retrieval using upper bounds.  
   Relevant because Ixos candidate/rank tails can be cut with bounded pruning.

2. Ding and Suel, Block-Max WAND  
   https://dl.acm.org/doi/10.1145/2009916.2010198  
   Extends WAND with block-level max scores for stronger pruning guarantees.  
   Relevant for reducing candidate scoring cost under strict latency budgets.

3. Turtle and Flood, MaxScore-style top-k retrieval  
   https://dl.acm.org/doi/10.1145/215206.215331  
   Early formulation of safe pruning under score upper bounds.  
   Relevant baseline for any “guaranteed no-loss” pruning claim.

4. Mackenzie et al., Tail-latency in multi-stage retrieval  
   https://arxiv.org/abs/1711.11086  
   Quantifies tail behavior across staged retrieval pipelines.  
   Relevant to Ixos p95/p99 objective and Ralph loop interpretation.

### Hybrid sparse+dense retrieval
5. Cormack et al., Reciprocal Rank Fusion  
   https://doi.org/10.1145/1571941.1572114  
   Strong robust baseline for combining heterogeneous rankers.  
   Relevant comparator for any custom fusion in Ixos.

6. Robertson and Zaragoza, BM25 review  
   https://dl.acm.org/doi/10.1561/1500000019  
   Canonical lexical relevance baseline and design intuition.  
   Relevant for defining lexical witness signals and calibrating fusion.

7. Khattab and Zaharia, ColBERT  
   https://arxiv.org/abs/2004.12832  
   Late interaction dense retrieval preserving token-level evidence.  
   Relevant when considering witness granularity beyond single vectors.

8. ColBERTv2  
   https://arxiv.org/abs/2112.01488  
   Improves quality/efficiency tradeoffs for late interaction retrieval.  
   Relevant as advanced dense baseline against Ixos rerank logic.

9. PLAID  
   https://arxiv.org/abs/2205.09707  
   Fast late-interaction serving for large corpora.  
   Relevant for low-latency dense retrieval approximations.

10. SPLADE (Formal et al.)  
    https://arxiv.org/abs/2109.10086  
    Sparse expansion model bridging lexical interpretability and semantic reach.  
    Relevant to “witness-preserving semantic retrieval” candidates.

11. DPR (Karpukhin et al.)  
    https://arxiv.org/abs/2004.04906  
    Dense passage retrieval baseline and training setup.  
    Relevant for nearest-neighbor semantic retrieval comparisons.

12. BEIR benchmark (Thakur et al.)  
    https://arxiv.org/abs/2104.08663  
    Cross-domain benchmark showing sparse/dense/hybrid variation.  
    Relevant for avoiding overfitting claims from tiny deterministic corpora.

### Desktop/local search systems
13. Stuff I’ve Seen (Microsoft)  
    https://www.microsoft.com/en-us/research/publication/stuff-ive-seen-a-system-for-personal-information-retrieval-and-re-use/  
    Personal desktop retrieval with rich local context and history.  
    Relevant systems prior for Ixos local file search UX expectations.

14. Personal Information Search (CACM)  
    https://cacm.acm.org/research/personal-information-search-challenges-and-methods/  
    Surveys personal IR challenges including ambiguity and recency effects.  
    Relevant to workstream/session-aware routing ideas.

15. Raycast Root Search docs  
    https://manual.raycast.com/root-search  
    Product-level baseline for interactive local search and query flow.  
    Relevant for UX truthfulness and responsiveness comparison.

16. Everything (Voidtools) docs  
    https://www.voidtools.com/support/everything/  
    Fast filename indexing baseline for local-first retrieval.  
    Relevant lower-bound for lexical/path stage performance.

### Filesystem/indexing infrastructure
17. Watchman docs  
    https://facebook.github.io/watchman/  
    File change watching for incremental indexing pipelines.  
    Relevant to eliminating repeated directory-walk tails.

18. Linux inotify  
    https://man7.org/linux/man-pages/man7/inotify.7.html  
    Kernel event API for file system changes.  
    Relevant to OS-journal/delta index architecture candidates.

19. Apple FSEvents  
    https://developer.apple.com/documentation/coreservices/file_system_events  
    Native file event stream on macOS.  
    Relevant for cross-platform incremental indexing design.

20. Microsoft USN Change Journal  
    https://learn.microsoft.com/windows/win32/fileio/change-journals  
    NTFS journal for cheap incremental file-state updates.  
    Relevant to low-latency local index freshness guarantees.

21. Sourcegraph Zoekt  
    https://github.com/sourcegraph/zoekt  
    Trigram-based code search engine with low-latency candidate retrieval.  
    Relevant to lexical prefilter and block-pruning ideas.

22. Russ Cox on trigram indexing  
    https://swtch.com/~rsc/regexp/regexp4.html  
    Classic explanation of regex acceleration with trigram indexes.  
    Relevant to replacing repeated broad ripgrep scans.

### Learned controllers / query planning
23. Bao learned query optimizer  
    https://arxiv.org/abs/2004.03814  
    Learned planner balancing execution plans with feedback.  
    Relevant to query-time controller selection for Ixos search modes.

24. LinUCB contextual bandit  
    https://www.microsoft.com/en-us/research/publication/a-contextual-bandit-approach-to-personalized-news-article-recommendation/  
    Lightweight online policy for context-dependent decisions.  
    Relevant candidate for compute-aware routing with latency constraints.
