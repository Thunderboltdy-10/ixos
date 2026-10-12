# Retrieval results

The final CLI was evaluated once on 260 RepoQA held-out descriptions in 26 repository families and all 300 SciFact test claims over 5,183 papers. These held-out sets were evaluated earlier during development; no cleanup choice was tuned on them.

| Suite | Method | nDCG@10 | MRR@10 | File recall@10 |
|---|---|---:|---:|---:|
| RepoQA | Hybrid | 0.6937 | 0.6212 | 0.9231 |
| RepoQA | BM25 | 0.6066 | 0.5326 | 0.8423 |
| RepoQA | Ranked ripgrep | 0.4469 | 0.3614 | 0.7231 |
| SciFact | Hybrid | 0.6950 | 0.6665 | 0.8067 |
| SciFact | BM25 | 0.6645 | 0.6342 | 0.7764 |
| SciFact | Ranked ripgrep | 0.5361 | 0.5172 | 0.6267 |

All methods use limit 10, context 2 and a 6,000-byte response ceiling. Metrics give equal weight to repository families or SciFact relevant-paper components. Ixos runs through resident MCP with persistent caching disabled; BM25 prepares a full-text index, and ripgrep ranks files by distinct matched query terms and bounded match counts. Only serialized source lines count toward snippet recall.

RepoQA hybrid line recall is 14.26%, against 10.51% for BM25 and 9.06% for ranked ripgrep. This single-search metric differs from the restoration's cumulative search/read schedule, where query-time passage selection improved line recall by 5.26 percentage points.

The code snippet experiment raised development line recall from 13.95% to 25.77%, but increased tokens by 50.57%, exceeding its 10% limit. The prototype was deleted; see [the plan and decision](../eval/EXPERIMENTS.md).

These are file-retrieval results on supplied code snapshots and clean title/abstract text. RepoQA descriptions are generated and pretraining overlap is unknown. The suites do not measure agent task completion or PDF/Office extraction quality. [Per-query results, configuration and hashes](../eval/results/) and [reproduction commands](../eval/README.md) are available.

## Search timings


One before/after check used a local NTFS location with 9,892 files (65.0 MB): four copies of the already prepared RepoQA development source snapshots. Both release binaries used the code model, native records and the same query; their JSON outputs were identical. The fresh-process number includes model loading; the warm number is the second search through MCP, after its initial search and a two-second pause.

| Search | Before | After |
|---|---:|---:|
| Fresh process | 3,167 ms | 2,873 ms |
| Warm MCP process | 981 ms | 573 ms |

Resident searches now reuse text and vectors when size, modified time and file identity match outside the two-second timestamp window. BM25 statistics update only for changed files. These single observations show an improvement but miss the one-second fresh-process target and the few-hundred-millisecond resident target; directory walking and ranking still run on every request.

## Record size

A record occupies `80 + passages * (28 + dimensions)` bytes. The code profile uses 256 dimensions: 364 bytes for one passage, up to 2,352 bytes for eight. The documents profile uses one 512-dimensional passage: 620 bytes per file. Filesystem allocation and fallback-database overhead are additional.

## What we learned

- An earlier cache stored only 64 of 512 dimensions. Records now preserve every dimension, with source and model fingerprints and a checksum.
- In the original fresh-process comparison, native records saved about 10% on code and about half the time on documents. Static embeddings are cheap; file I/O accounts for much of the remaining cost.
- Session learning did not improve retrieval. Even accepting the correct file did not reliably put it into the next top five, so the feature was removed.
- On unseen RepoQA repository families, hybrid nDCG@10 exceeds full-text BM25 by 8.72 percentage points. This describes this retrieval suite, not general product superiority.

Earlier configurations and outputs remain at the local `restoration-end` tag. [Project history](history/README.md) explains the restoration and cleanup.
