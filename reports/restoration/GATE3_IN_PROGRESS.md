# Gate 3 — retrieval evaluation and experiments

Historical progress checkpoint, retained to show the experiment sequence. Gate 3 is now complete; use [GATE3.md](GATE3.md) and `gate3-final-comparisons.json` for frozen final results. Earlier Axios production captures below missed three valid `env/` sources; the corrected complete-corpus validation and final held-out runs are documented there.

Gate 3 is open. Gates 1 and 2 are committed as `6a7ec7f` and `8afa75f`. The restored current engine is now measured against source-grounded baselines; no selected replacement, final preset or held-out superiority claim exists yet.

## What the current results establish

| Development suite | Current Flash | Ranked rg context | BM25 |
|---|---:|---:|---:|
| FastAPI + Serde, 40 queries, nDCG@10 | 0.4409 | 0.4992 | 0.5649 |
| FastAPI + Serde, MRR@10 | 0.3716 | 0.4321 | 0.4953 |
| FastAPI + Serde, mean visible output tokens | 1,097 | 826 | 856 |
| SciFact sample, 80 queries / 5,183 documents, nDCG@10 | 0.0071 | 0.4632 | 0.6463 |

Code uses a restricted pinned Semble subset with upstream LLM labels; document results use established SciFact qrels and a deterministic development-only sample. Timing repetitions do not increase labeled sample size. These are matched-corpus retrieval diagnostics, not complete Semble/ContextBench leaderboards or an end-to-end agent comparison. Model pretraining overlap with public corpora is not ruled out.

Current Flash is not a credible general dense-document retriever on this evidence. The code results also do not justify a claim that it beats strong lexical retrieval. Both findings are useful: they expose candidate/coverage/fusion problems which old expected-word relevance checks could conceal.

## Latency observations

On the small code suite, initial Flash fresh-process p50 is 226.56 ms JIT, 227.42 ms cold native fill, and 212.27 ms verified native warm. Warm runs have real disk hits and zero recomputed candidate embeddings. Initial SciFact JIT p50 is 3,578.97 ms and p95 3,725.62 ms; initial native-warm p50 is 3,566.42 ms.

A sampled dense request spent roughly 2 seconds before the search pipeline and 1.5 seconds within it, versus ~20 ms embedding 50 candidates. The CLI discarded a full lexical preflight then repeated candidate generation; candidate merging and metadata lookup repeatedly scanned growing vectors. Consuming the preflight once and using hash maps reduced dense JIT p50 to 708.66 ms (80.2% reduction), with the original model/representation. Quality remained inadequate (nDCG 0.015845), so the representation/funnel needed further work.

rg timings include a fresh process, parsing/ranking and source windows from the already loaded corpus; BM25 timings are persistent in-memory queries excluding index preparation. Initial rg captures also include raw-log writing overhead. These timings must not be advertised as equivalent fresh CLI pipelines. The old profile's lexical-stage TTFR excludes model/setup work.

## Validated evaluator and concrete bugs

- Exact source hashes, ordinary-file inventory, source coordinates and displayed text; native ADS/xattr are allowed, adjacent files are not.
- Repository/paper family splits, query/content leakage checks, deduplicated file/span metrics, false positives for absent answers and exact output tokens.
- Ordered replay with cumulative cost, first relevant file/span, follow-ups, available feedback, drift and resets. Feedback for an unseen result is filtered out; silence remains unknown. This is retrieval replay, not autonomous coding-task success.
- JSON source highlighting was reproduced as a failing Rust regression and repaired. Missing context gets file credit only.
- Another UTF-8 truncation/overlap panic was reproduced in the old chunker and repaired, including tiny chunk budgets that could stop advancing.
- An obsolete hidden corpus inventory and Python U+2028 JSONL splitting were detected and fixed before further scoring. Preparers now reject merges into old corpora.

The latest evaluator integrity run passes 65 tests; one directory-symlink test is skipped because this host cannot create that fixture. The new engine passes 521 core tests with six ignored, plus seven real-artifact cache/protocol probes. Desktop final verification remains pending. New production cost repairs and opt-in retrieval compile and have actual after measurements.

## Experiment controls

The CPU bridge loads actual safetensors and verifies the artifact identity. Source-only preparation compares prefix-512, full-token pooling, adaptive introduction+uniform, introduction+lexical diversity, introduction+vector diversity, and all-passages reference. f16/int8 round trips retain every model dimension. Fusion and bounded query-history/feedback policies are crossed where meaningful.

Quality screening reuses query embeddings and lexical/evidence analysis; its math timing is not native-cache or CLI latency. Report fill cost, all/selected passages and vector payload bytes separately from eventual signed-record overhead. Vector diversity embeds every passage at fill; lexical diversity/uniform embed only the chosen passages. No winner is presumed.

**Coverage correction:** inspecting tokenizer artifacts exposed inherited truncation/padding: current Flash caps at 128 tokenizer tokens, and the code parent at 512. `encode_with_args(..., None)` removes only the API limit; it does not remove tokenizer settings. Earlier screen preparation receipts overstated full-token coverage for these artifacts. Their numerical results remain actual-artifact results, but prefix/full-centroid equivalence can reflect the hidden cap. General retrieval's tokenizer has neither setting, so its full-token document comparison is unaffected. Separate normalization variants preserve weights, remove truncation/padding, receive new fingerprints and must be evaluated again. This also removes potential batch-padding dependence; batch invariance will be explicitly tested rather than assumed.

External candidates preserve attribution: [Potion code 16M v2](https://huggingface.co/minishlab/potion-code-16M-v2) is a 256-dimensional static model distilled from CodeRankEmbed and further trained on code retrieval data; [Potion retrieval 32M](https://huggingface.co/minishlab/potion-retrieval-32M) is a general static retrieval model. Their published results motivate candidates, not a claim that those results transfer to Ixos. Exact pinned revisions are in `eval/model_candidates.json`.

## Development, validation and the actual CLI

The full development screen completed 1,728 configurations / 35,640 retrieval trials on 141 distinct labeled questions. Three modern/current model candidates, six representation policies, two vector precisions, three retrieval modes and conditional session settings are compared. Configuration count is not an independent-question count.

The general model with spaced representatives led development code nDCG (0.710220). A frozen six-recipe shortlist was then run on Axios/Tokio and separate SciFact families. Validation favored the code parent with intro-uniform representatives: nDCG 0.740127 versus general spaced 0.690806. The all-passages code reference was 0.751235, at a larger metadata cost. No test data determined these choices.

The Rust CLI agrees with the screen: code development 0.691360 and validation 0.740127. Normal JSON now retains source views and a score, while detailed lexical/semantic breakdowns require `--show-scores`. Compact native-warm development output averages 801 stdout tokens versus 1,335 before removing routine hashes/breakdowns. p50 is 247.12 ms; persistent-process timing is measured separately. Diagnostics tokens on stderr are counted by the newer evaluator as well.

`search --retrieval hybrid --model-path ...` is opt-in until final selection. `search --retrieval lexical` does not load a model. `grep` uses embedded grep crates for exact regex/fixed-string matching; `read` supplies exact bounded lines. `serve` provides JSONL search/read/grep/reset and explicit accepted/rejected feedback. Freshness is verified against complete bounded source snapshots; files beyond the stated 16 MiB per-file limit are reported as skipped, and the 256 MiB in-memory corpus budget fails explicitly rather than silently truncating the corpus. PDF/Office evidence coordinates refer to extracted text. Source extraction/evidence still needs wider validation.

Document records contain every dimension of one/four/eight int8 vectors, per-vector scales and source locators. Signed payload is 103 + N×(28 + dimensions) bytes: eight 256-dimensional vectors are 2,375 bytes. This excludes filesystem allocation overhead. ADS/xattr are preferred; actual native write failure uses the user's application-cache LMDB, bounded at 64 MiB, never source-folder sidecars. Native same-filesystem renaming preserves the record; unsupported copies/exports can discard it. Record freshness/model/recipe checks still apply after renaming.

General-model storage quantization reduced model/tokenizer/config bytes from 130,703,808 to 34,048,476. Development ranking is unchanged to reported precision and a separate compressed validation screen passes. This is storage quantization, not new training/distillation or integer inference; the Rust loader still expands vocabulary rows to F32. Compressed dense production matches the screen (nDCG 0.648937): fresh native-warm p50/p95 996.99/1050.99 ms, JIT 1738.51/1833.03 ms across 5,183 documents. These include process/model/source preparation. Persistent requests are a separate condition.

## Bounded session iteration

The first algorithm erased context on anaphoric follow-ups because query cosine looked like drift. Revised short-pronoun handling retains a bounded topic anchor and clears explicit low-similarity changes. Real Rust replay on eight authored sequences / 40 questions matches the lab: stateless MRR 0.603839, related/combined 0.9875; follow-up-only MRR 0.339732 → 0.979167, explicit turns stay 1.0. Feedback-only reaches 0.650923. These small templated stress cases demonstrate the mechanism, not real-world coding-agent superiority. Persistent queries are about 2.3 ms here on eight small files.

History is limited to 16 returned-response records, feedback to four turns, and vectors to displayed files. Silence never means acceptance. Source edits invalidate old feedback; reset clears the session. A malformed JSONL request returns an error and the next request can succeed. The current protocol sees its own search/read/grep calls; it does not observe external ripgrep calls or maintain an unbounded learning database.

Seven actual-model probes cover native fill/hit, equal-length edits, rename, JIT, clear, malformed-request recovery, stale feedback and reset. `scripts/verify_retrieval_engine.py` captures these checks. Future runs retain exact engine/evaluator source and binary snapshots; the earliest baseline runs retained identity hashes/raw results without every intermediate source snapshot, a reproducibility limitation.

Raw commands, responses, provenance and summaries remain under ignored `models/lab/restoration/`; reproducible code and aggregate receipts are tracked. Held-out test remains unopened for selection. Mac execution and credential revocation/history preparation still precede a public release.

The tokenizer-normalized code parent validates at nDCG 0.749354 with compact intro-uniform representatives (all-passages reference 0.760462); normalized Flash reaches 0.672375. Removing clipping changes quality rather than guaranteeing improvement. Actual single/batch embedding invariants pass on three models. A naive evidence-window A/B reduced controlled span recall 0.981818 to 0.748485 and FastAPI 0.15 to 0.05; it is rejected as the default. Held-out test has not been used.
