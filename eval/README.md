# Ixos retrieval evaluation protocol — version 1

The main workload is **code retrieval for agents**. Document retrieval for school/work agents is secondary; human-style search is reported separately. The harness scores retrieved files and the actual source evidence shown to the caller. It never judges relevance by finding expected words in the output.

## Integrity gate before experiments

```sh
python -m unittest discover -s eval -p 'test_*.py' -v
python -m eval.validate --manifest PATH --root CORPUS
```

These checks are mandatory before model/architecture screening. `contract.py` rejects changed source hashes, any extra ordinary corpus files (including hidden files), symlink trees, invalid paths/spans/text, duplicate query IDs, unknown schema fields, family/query/relevant-content leakage across splits and future feedback. Dedicated corpus directories contain sources only; manifests stay outside them. Preparers refuse to merge into existing corpora. Native ADS/xattr do not alter the ordinary file inventory. Ordered session turns and explicit accepted/rejected/unknown feedback are distinct. Label generation and inspection are recorded in dataset provenance. Validation passes are recorded; a passed harness is not proof that external labels are correct.

### Evidence and context cost

- File metrics: MRR@10, recall@10 and graded nDCG@10, with a file credited once even when several passages are returned.
- Evidence metrics: unioned source-line recall and precision over the first ten displayed views; duplicate/overlapping lines cannot inflate coverage. Report whether annotations cover every relevant file. File-only datasets get no invented span score.
- No-answer cases: false-positive rate and abstention, with an independently labeled absent answer. Do not add unanswerable questions to recall/MRR denominators. Silence after a result means unknown feedback.
- Context cost: exact stdout bytes and tokens under a pinned tokenizer, including result metadata and duplicated streaming snapshots. Record stderr separately. Token budgets are checked on the serialized response, not just excerpts. Return byte-budget violations as failures.
- Agent sequences: cumulative tokens, tool calls, time to first gold span and retained coverage after follow-ups, explicit feedback, query drift, resets and edits. Retrieval-only replay is labeled as such; it is not end-to-end coding-task success.

All displayed evidence must match its claimed frozen source lines. A backend adapter must not complete a truncated excerpt or fetch a gold span on the tool's behalf. If a backend returns only a file path, record file retrieval separately from evidence retrieval.

## Workload sources

| Suite | Purpose | Limits |
|---|---|---|
| Controlled source/format fixtures | Unicode, late facts, long mixed topics, ignores, stale-cache edits, source preservation, no-answer literals, session ordering | Correctness evidence and stress tests; never a public quality leaderboard. |
| Ixos self-navigation | Real current Rust code, manually anchored source spans and exact-symbol/concept queries | Development/diagnostic data: the restoring agent has inspected this code, so it cannot be sold as unseen generalization. |
| Pinned public code retrieval | Repository-held-out selection and external comparisons; Semble-compatible corpus/query adapter | Upstream Semble labels were generated/checked by an LLM. Preserve upstream metrics separately, inspect labels and avoid calling them independent human gold. |
| ContextBench | File/symbol/span gold context from real coding tasks; adapter and retrieval replay | Issue context can be broad; one search query is not an entire coding agent. Use its actual protocol for any task-success claim. |
| BEIR SciFact/NFCorpus | Dense-document retrieval with established qrels | Clean text tests model retrieval, not PDF/Office parsing. All public test data remain a frozen final run, not weight-fitting data. |
| Spectra/local collections | Practical agent tasks and mixed-format documents | Add only explicit selected corpora; local data/results stay excluded unless intentionally approved for publication. |

Sources: [Semble benchmark methods](https://github.com/MinishLab/semble/blob/main/benchmarks/README.md), [ContextBench](https://github.com/EuniAI/ContextBench), [BEIR datasets](https://github.com/beir-cellar/beir/wiki/Datasets-available). Cursor's [regex architecture](https://cursor.com/blog/fast-regex-search) and Augment's [eval methodology](https://www.augmentcode.com/blog/you-make-your-evals-then-your-evals-make-you-introducing-augmentqa) inform engineering questions. Their internal numbers do not provide an interchangeable public Ixos leaderboard; do not claim superiority without a matched runnable protocol.

## Selection and interaction matrix

1. Freeze corpus revisions, label provenance, family-based splits, query kinds, expected ignores, task budgets and manifest hashes before scoring configurations. Every external corpus is pinned; queries/gold cannot be passed to a backend's document-preparation stage.
2. Establish the repaired current engine, bounded-context ripgrep and BM25 baselines. Same corpus, ignore policy, result/evidence budgets and CPU; literal/exact regex queries retain their syntax. A raw natural-language phrase passed to grep is not the only lexical comparison. Keyword OR/AND and exact-symbol patterns are separately labeled strategies. Whole-file read costs are an optional reproduction, not the strongest agent baseline.
3. On development families screen feasible combinations of model × representation (prefix / whole-file centroid / intro+uniform / intro+diverse / all-passages reference) × lexical/semantic/hybrid fusion × session policy. Report conditional exclusions: lexical-only does not load a model, and an all-passage quality reference is not a tiny-native-cache claim. Length-dependent representatives are capped; expose selected/processed passages and truncation.
4. Follow up promising interactions with neighboring parameters and negative-case diagnosis. Use validation families to choose a small Pareto set under accuracy, source-span coverage, cold cost, warm latency/RSS/cache bytes and context budgets. Fit any projection/fusion/threshold on development only; selecting on validation is explicitly disclosed. Keep original-query/exact-match and session-off controls. Query rewrite remains conservative and auditable.
5. Freeze selected configs/artifact hashes, then run held-out families once. Any inspection-driven change after the test result requires fresh held-out data or relabeling the result as exploratory. Preserve negative outcomes; do not weaken baselines to manufacture a session win.

Quality sample size is the number of unique labeled queries/families, **not the number of repeated commands**. Aggregate equal-family means with deterministic family bootstrap intervals where there are multiple independent families. Report per-language/query-kind and worst-group results. Use paired family-level differences for comparisons. Small or incomplete label sets cannot support broad superiority claims.

## Timing and cache contract

Record three independent conditions: JIT, native cold-fill and native warm. Fresh process model/startup wall time is distinct from persistent-process query time. Native warm must prove actual disk-cache hits in a fresh process; RAM hits are reported separately. Rewarm after model/recipe changes because native metadata currently has one slot. Source edits must invalidate both memory and disk entries. Native metadata or an application-cache DB may be written; **no embedding sidecars beside corpus files**.

For each run retain command, exit code, raw stdout/stderr, revision/dirty-diff identity, binary/model/tokenizer/config/corpus hashes, hardware/OS, random seed, timing repetitions/order, cache hit/work counts and bytes. Latency uses p50/p95 over repetitions, with warmup labeled rather than removed invisibly. Track fill cost, total allocation and amortization at realistic query counts. Never normalize a small corpus to “ms/1k” without also reporting observed corpus size and raw wall time.

Gate 3 selected compact normalized code representatives and a compressed general centroid on development/validation, then froze `final-selection.json` before held-out scoring. See `reports/restoration/GATE3.md` for actual results and limitations. No new training was performed. Earlier February lab reports and expected-word agent comparisons are historical/exploratory evidence, not the restoration's frozen baseline.

## Executable controlled and document suites

`python -m eval.fixtures --destination dataset/restoration/controlled-v2` creates fixed development stress cases with source-line gold before experiments: exact/concept retrieval, Unicode, a target after 160,000 bytes, unrelated files, absent answers, follow-ups, explicit feedback, query drift and task resets. `eval.session_run` replays its `sessions.json` in order through actual Ixos, rg or BM25. Only previously displayed paths can be accepted/rejected. Unavailable feedback is logged and silence stays unknown. Submitted feedback is charged even when ignored; virtual older baselines have no feedback argument and charge none. The real JSONL backend counts the complete transmitted request, exact stdout and stderr tokens. Older executable baselines measure query text and output, excluding common executable/flag syntax; keep these accounting conditions explicit.

`python -m eval.documents --archive dataset/restoration/scifact.zip` verifies the official archive checksums, preserves all test qrels, and excludes training-query components that share a relevant paper with test. Development/validation use the remaining paper components. This avoids fitting on labels for the same answer documents later reported as unseen test families; it does not prevent unsupervised preparation of the common source corpus. The initial 460/71/300 query split and excluded 278 selection queries are captured in the preparation receipt.

## Experimental quality screen

Build `cargo build --locked --release --bin ixos-lab-embed`, then use `python -m eval.matrix` with explicit manifest/root/model paths and a new output folder. The bridge actually loads the Rust safetensors runtime, verifies its artifact fingerprint, batches CPU inference, and records input/response hashes and inference time. Document preparation receives only frozen sources. Selected query text is embedded after preparation; relevance gold is used solely for scoring.

The feasible matrix compares prefix-512, requested full-token pooling, adaptive introduction+uniform, introduction+lexical-diversity, introduction+vector-diversity and all-passages reference, f16/int8 payload round trips, semantic/RRF/normalized hybrid fusion, and semantic floors. Tokenizer artifact truncation/padding may impose additional limits: inspect identity/settings rather than assuming the API's `None` overrides them. `eval.normalize_tokenizer` creates a separately fingerprinted variant with unchanged weights and no inherited clipping/padding. Prefix-512 still explicitly clips that variant. Earlier capped-artifact scores remain actual numeric results but are not full-token coverage evidence.

Ordered sequences compare session-off, prior-topic EMA, bounded explicit-feedback Rocchio, and their combination. History has at most 16 responses and a four-turn feedback horizon. Revised short-anaphora handling preserves a topic anchor through pronoun-based follow-ups; explicit low-similarity queries reset it. Introduction anchoring, full chunk coverage, processed/retained passages, payload bytes and preparation cost are reported. Version changed algorithms and preserve negative as well as improved results.

This matrix reuses query embeddings and lexical/evidence analyses to screen quality and interactions. Its query-math timings **are not production latency**, and vector payload bytes exclude record/signature/locator overhead. Representation selection and final native-cache/CLI latency must be measured separately on actual production integration. Vector diversity embeds all passages during fill, while uniform and lexical diversity embed only selected passages; this cost difference is explicit. No arbitrary first-dimension truncation is used. The existing baseline is not renamed when a new third-party artifact is tested.
