# Gate 8 — verified function-span development evaluation

2026-10-11. Gate7=`c68fcbd`. This gate adds a pinned RepoQA supplied-source adapter, immutable repository splits, strict local source-coordinate audits, actual complete baselines and matched evidence-location follow-ups. Production Rust/defaults/models remain unchanged; original Gate3 held-out results remain frozen. No training, new weights, public push, history rewrite, CI dispatch or release.

## Preparation and integrity

Primary protocol/source links and commands: `docs/evaluation/REPOQA.md`. Pinned release SHA256 c050a2ad…, source revision e3a5710…. It contains60repositories/600targets/six languages, despite the older README's500/five-language statement. Four previously inspected families excluded. Metadata-only plan `eval/repoqa-family-v1.json` canonical SHA2564a9a1ebd… reserves18dev/12validation/26test families,180/120/260descriptions. Target preparation for test requires exact selected config/model/binary freezing. The archive contains all splits; only metadata has been accessed for reserved held-out families. No held-out target inspection, materialization or scoring.

Development: all180needles strictly verified against local UTF-8 byte boundaries/physical LF lines and supplied function catalog. Supplied source inventory constructed before targets. Preserve every target, no range repair/drop. Ten zero-content package files excluded before labeling;2437eligible files/15603485bytes across18families. Actual model-free CLI inventory probes confirm discovered=searchable=expected for all18. Supplied source is a curated upstream subset, not an entire Git checkout; generated descriptions inherit semantic label limitations. Twelve description strings contain the exact target-name substring; report this indicator without silently filtering queries or calling incidental English words deliberate leakage.

Preparation v1 failed after nine valid families on empty package files. Preserved failed receipt/trace; v2 recorded the query-independent zero-content eligibility rule; v3 additionally reconstructs the complete metadata plan before preparation. All18/180v3 pass. Initial metadata schema probe assumed the function catalog was a list, then corrected its dictionary handling before reading any description/target values; no numeric result from that probe.

## Actual baseline results

180unique descriptions/18 repository families/six languages; one repetition/method,720complete searches. Corpus/model identities and all displayed source views verify. Model is the selected real unbounded code parent derivative; loaded fingerprint835fb9be… /actual Windows binary21e9b3fd…. Session off; default context2/limit10/6000bytes. No expected-word scoring.

| Method | nDCG@10 | MRR@10 | File recall@10 | Preview line recall | Mean stdout tokens | Descriptive tool p50 ms |
|---|---:|---:|---:|---:|---:|---:|
| Hybrid, fresh CLI/JIT |0.730582|0.679821|0.888889|0.111051|1028.761|316.28|
| Lexical, fresh CLI |0.630125|0.568677|0.822222|0.084902|1025.728|63.00|
| Prepared in-memory BM25 |0.630125|0.568677|0.822222|0.084902|1054.939|25.89|
| Fresh ranked rg +loaded windows |0.447098|0.368593|0.705556|0.080233|1074.244|108.98|

Zero evidence failures in all720 searches. Hybrid paired family nDCG improvement over lexical/BM25 +0.100457, bootstrap95% interval[0.069239,0.135205]; over rg +0.283484[0.203382,0.358019]. These favor hybrid for this DEVELOPMENT function-description/source inventory. They do not establish commercial product superiority, held-out generalization or task completion. One repetition and prepared/fresh costs differ; table timings are descriptive, not an optimized latency verdict. Diagnostic stderr/request accounting is retained separately in summaries/raw outputs.

Initial four-arm numerical runs all passed, but the aggregation wrapper decoded UTF-8 records with Windows CP1252 and failed on a non-ASCII byte. Explicit UTF-8 decoding plus source/family identity checks and a Unicode regression fix aggregation. Reuse the complete raw runs through `--aggregate-only` into a new receipt directory; no numerical result was overwritten or selectively rerun. Original failing wrapper trace is in Codex tool history; its backend stdout/stderr/provenance remain captured. Successful aggregate source/command is retained in `gate8/aggregation-dev-v2/comparison.json`.

## Matched evidence-location trajectories

Same actual hybrid initial candidate order/scores; original control raw responses byte-identical in180SHA checks. Four source-only anchor strategies, unchanged three-read/optional inline-cue grep/two-read schedule, actual fresh model-free Ixos read/grep. All720trajectories complete; **180unique tasks**, not720 independent labels. Exact source views, unchanged source/model, call/byte ceilings and all initial file scores verify. Mean initial nDCG remains0.730582 for every style.

| Anchor | Initial preview line recall | Cumulative line recall | Cumulative precision | Mean stdout tokens | Tasks with annotated overlap |
|---|---:|---:|---:|---:|---:|
| Current global lexical line |0.111051|0.448021|0.032139|3152.217|92/180|
| Winning stored passage/local line |0.123048|0.457954|0.031455|3159.767|94/180|
| Stored lexical/semantic fusion |0.127682|0.469612|0.031583|3192.539|98/180|
| Bounded query-candidate rerank |0.139499|0.509647|0.036794|3216.422|105/180|

Bounded rerank adds0.061625 cumulative recall (6.1625percentage points) versus control, paired family95% interval[0.014627,0.115977]; stdout increases64.206tokens (about2.04%). It improves21queries, regresses6, leaves153 unchanged. Winning-local and stored-fusion intervals cross zero here. ContextBench's earlier smaller rerank result remains preserved; this new function task changes the candidate evidence rather than replacing an inconvenient prior result.

Average24.728extra query candidate passages beyond stored representatives;80.711total candidates/query, maximum128 below the160ceiling. Shared resident bridge/source selection work averages77.63ms, with lexical preparation separately accounted. All styles share this preparation; **this is not standalone production rerank overhead or end-to-end speed**. No larger ADS/xattr payload/sidecar, model training or default modification. Follow-up schedule averages4.33calls; initial original diagnostics charged equally as reference, actual stdout/request/stderr totals retained.

Regressions matter: exploratory Java mean coverage0.511668→0.466430 while C++/Python/Rust improve; Go/TypeScript mean coverage unchanged. Only3families/30descriptions per language, so no language-specific default is selected. Full per-query/per-language gains/losses and exact controls: `gate8/anchor-diagnostics.json`. Less than all functions receive useful evidence, and annotated overlap is not an LLM solving or understanding the task.

## Validation and next step

Evaluator108tests pass, one Windows symlink skip. Unit fixtures test contracts only; all numerical embeddings load real safetensors. No production Rust edits, so Gate6's verified Windows/Linux source/native-model/cache/package checks remain applicable. Commands, failures, preparation/inventory receipts, baseline outputs and aggregate live under `gate8/`; complete ignored source/bridge/tool traffic under `models/lab/restoration/repoqa-{dev-baselines,anchors-dev}-v1` and `dataset/restoration/repoqa-dev-v3`.

KEEP the bounded query-rerank candidate, with costs and regressions. Continue unchanged candidates on12validation families/120descriptions before deciding a runtime option/default or selection freeze. Then implement/verify exact current runtime behavior, including JIT/native/resident conditions, preserve strong lexical/output controls, freeze identities and prepare26held-out families once. No-answer/drift/edits/low-resource and real blind-agent layers remain necessary beyond function retrieval. Native Mac deferred; historical credential revocation/reviewed history preparation still precede publication.
