# Retrieval results

These are results from the October restoration, before cleanup. The final binary will be evaluated after the desktop and MCP work is complete.

| Suite | Method | nDCG@10 | MRR@10 | File recall@10 |
|---|---|---:|---:|---:|
| RepoQA, 260 descriptions / 26 held-out repository families | Hybrid | 0.6937 | 0.6212 | 0.9231 |
| Same RepoQA sources | BM25 | 0.6066 | 0.5326 | 0.8423 |
| Same RepoQA sources | Ranked ripgrep | 0.4469 | 0.3614 | 0.7231 |
| SciFact, 300 test questions / 5,183 papers | Hybrid | 0.6974 | 0.6681 | 0.8121 |
| Same SciFact sources | BM25 | 0.6621 | 0.6337 | 0.7690 |

RepoQA uses supplied source snapshots and generated function descriptions. SciFact tests title and abstract retrieval. Neither suite measures completion of an agent task or PDF extraction quality.

Query-time passage selection raised cumulative RepoQA line recall from 45.23% to 50.48% under the same follow-up schedule, a 5.26 percentage point increase (paired family 95% interval: 2.28–8.72 points). File ranking stayed the same.

The restoration found a cache storing only 64 of 512 dimensions. After fixing it, native records saved about 10% of code search time and about half of document search time in the original fresh-process comparison. Static embeddings are cheap enough that file I/O remains a large part of the cost. These timings describe those original inputs and binaries.

Session learning did not improve retrieval and is being removed. Accepting a correct file did not reliably put it in the following top five.

Original outputs and configurations remain in Git at `restoration-end`. See [project history](history/README.md) for the development record.
