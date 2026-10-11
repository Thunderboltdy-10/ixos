# Gate 3 — measured retrieval engine

Date: 2026-10-11. Windows x86-64, AMD Ryzen 7 5800X (8 cores / 16 logical processors). Gates 1/2: `6a7ec7f`, `8afa75f`. Gate 3 adds a measured CPU retrieval path; convenient defaults and current product documentation follow in Gate 4.

## Frozen held-out result

The selected code and document recipes outperform the strong lexical baselines on these **restricted, frozen retrieval suites**. They do not establish general superiority over Cursor/Augment or autonomous agent task success.

| Held-out suite / engine | nDCG@10 | MRR@10 | Recall@10 | Mean stdout tokens |
|---|---:|---:|---:|---:|
| Code: selected hybrid | 0.69568 | 0.64528 | 0.9000 | 729 |
| Code: BM25 | 0.63974 | 0.58357 | 0.8750 | 780 |
| Code: ranked ripgrep | 0.57062 | 0.52732 | see aggregate | 729 |
| Code: Ixos lexical-only | 0.63974 | 0.58357 | 0.8750 | 732 |
| Code: repaired legacy Flash | 0.45508 | 0.42176 | see aggregate | 998 |
| Documents: selected hybrid | 0.69741 | 0.66806 | 0.8121 | 1,343 |
| Documents: BM25 | 0.66212 | 0.63369 | 0.7690 | 1,353 |
| Documents: ranked ripgrep | 0.53073 | 0.51579 | 0.6115 | 1,334 |
| Documents: Ixos lexical-only | 0.66354 | 0.63402 | see aggregate | 1,343 |
| Documents: repaired legacy Flash | 0.02810 | 0.02875 | see aggregate | 1,090 |

Code comprises 40 upstream Semble questions on Requests/Axum (18/79 eligible sources), repository-held-out from FastAPI/Serde development and Axios/Tokio validation. These are upstream LLM-generated labels and a restricted source policy, not the full Semble leaderboard. Only two test repositories limit generalization and uncertainty. Sparse/incomplete code span annotations must not be described as comprehensive human ground truth. Model pretraining overlap is not ruled out.

Documents comprise all 300 SciFact test questions, 247 answer-paper components, over 5,183 clean-text papers. Development/validation excluded training components sharing relevant papers with test. Corpus-only preparation was allowed; test labels did not select the recipes. This measures document retrieval, not PDF/Office extraction or user task success.

Equal-family means and 2,000 deterministic family bootstrap resamples are used. Paired hybrid-minus-BM25 nDCG differences are code **+0.05594** (95% interval +0.02455 to +0.08733; only two families) and documents **+0.03529** (+0.01983 to +0.05231; 247 families). Full per-dataset/kind results and all paired comparisons are in `gate3-final-comparisons.json`. The report stores differences right-minus-left; signs depend on the listed ordering.

## Latency and actual context cost

| Condition | Code p50 / p95, ms | Documents p50 / p95, ms |
|---|---:|---:|
| Selected hybrid, fresh JIT | 271.83 / 310.12 | 1,636.61 / 1,675.99 |
| Selected hybrid, fresh native warm | 244.32 / 280.93 | 717.00 / 749.74 |
| Ixos lexical-only, fresh process | 43.83 / 53.24 | 434.47 / 448.63 |
| Ranked rg, fresh process plus loaded-source windows | 27.84 / 46.08 | 266.26 / 364.71 |
| BM25, persistent prepared index | 13.41 / 17.64 | 12.21 / 19.81 |
| Repaired legacy Flash, fresh JIT | 193.48 / 225.21 | 714.83 / 725.67 |

**Timing conditions differ.** BM25 excludes source/index preparation; rg includes parsing/ranking and windows from a loaded corpus. Ixos includes model/process/source preparation. Code uses three repetitions per question (120 runs per engine); dense held-out quality uses one run per question (300 runs), with separate 3/5-run fixed-query phase profiles. These are observed Windows measurements, not worst-device guarantees or equivalent indexed-system speed comparisons.

Native-warm runs prove actual disk-cache hits and zero recomputed document embeddings. JIT uses the same int8 representation precision; rankings and quality are equal here. Tiny floating-point differences can change score serialization and one budget-bound view, so displayed-view counts need not be bit-identical. Every retained view was source-verified; all twelve final runs have zero evidence failures.

The 6,000-byte output ceiling applies to serialized JSON, with at most ten file results and two context lines. Detailed diagnostics were requested for all Ixos runs and counted separately. Selected code native warm averages 729 stdout / **1,067 total response tokens**; documents 1,343 / **1,692**. BM25 has no diagnostic stderr and averages 780 / 1,353 total. Ordinary standalone Ixos calls can omit `--stats`; do not claim a total-context reduction by ignoring diagnostics. The tokenizer is pinned `tiktoken 0.12.0`, `cl100k_base`.

Small excerpts are navigation, not full answers. Code's annotated displayed-span recall is only 0.03224 on five questions in one test family; the annotations are broad and incomplete. A useful agent must follow search with precise `read`/`grep`, and those calls count toward actual task/context cost. No no-answer calibration claim comes from these answerable public test suites; authored absent-answer cases remain separate diagnostics.

## Selection and models

`eval/final-selection.json` froze eight exact run identities, three model fingerprints, three corpus hashes and binary SHA256 **2c641a2f4af7a7d0a2428eecbc462ba76152d0bd48bb80803c84948c747c6685** before held-out scoring. No search/model/threshold changes followed test inspection.

- Code: attributed **minishlab/potion-code-16M-v2**, pinned `e9d2a44ca6a05ac6685f3b23709ea57eb7352d5b`, unchanged weights, explicit tokenizer-unbounded variant; intro/spaced representatives, normalized hybrid, int8 document records. Runtime fingerprint `835fb9be0368efb6a64fd54039d4e79100add78ac50e2dc219daca32a62f5972`. Artifact bytes: 33,514,284.
- Documents: attributed **minishlab/potion-retrieval-32M**, pinned `6fc8051fab2a1e0ee76689cf08c853792ac285e7`, row-int8 storage derivative; full-token centroid, normalized hybrid. Artifact bytes: 34,048,476, down from 130,703,808. Rust expands rows to F32: this is storage quantization, not integer inference or an established RAM reduction.
- Both parents are MIT-licensed. Original model cards, hashes and transformation recipes are preserved. No new training/distillation was performed. Historical Flash/Pro IDs remain baselines; a missing Pro-v2 artifact is not a newly shipped “true Pro” model.

The original development screen covered **three models, 1,728 feasible configurations and 35,640 retrieval trials over 141 distinct labeled questions**, then explicit validation shortlists and tokenizer-normalization/compression follow-ups. Repeated commands/configurations are not independent labeled sample size. Screening reuses math/embeddings and its times are not production latency. Families rather than queries were held out.

Normalized code compact validation nDCG is 0.74935; its all-passages reference is 0.76046. The compact recipe trades some potential coverage for a fixed payload. Document compressed centroid validation is 0.70703. Choices were made before test. The evaluator compares f16/int8, six representation policies, semantic/RRF/normalized hybrid, floors and conditional session settings; unused alternatives and negative receipts are retained.

## Concrete fixes and measured decisions

| Observation | Decision and evidence |
|---|---|
| Discarded lexical preflight and repeated linear merging/metadata lookup dominated old dense cost | Consume once and use hash maps; old Flash dense JIT p50 3,578.97 → 708.66 ms on the same development sample. Quality still inadequate (0.01585), prompting representation/model work. |
| `None` API token cap did not override tokenizer settings | Original Flash clips at 128, code parent at 512; normalized variants preserve weights, change fingerprints and are evaluated separately. Three actual-model single/batch invariants pass. Earlier purported full-input coverage receipts are corrected. |
| Generic `env/` pruning lost three Axios source files | Require `pyvenv.cfg`; discovered/searchable 64 → 67. Coverage guard now rejects partial eligible corpora. Production validation 0.74013 → 0.74935 matches lab. Earlier affected runs remain discovery-gap evidence. |
| Native-cache source and metadata reads are separate costs | Bounded I/O workers; four selected from 1/2/4/8 profiles. Dense fixed-query fresh JIT/native-warm/resident-warm measured 1,628.8/730.6/154.0 ms with four workers. Worker-summed times are not wall time. |
| Naive evidence windows reduced real span coverage | Reject default window scoring: controlled span recall 0.98182 → 0.74849; retain line anchors and exact bounded read. |
| Ordinary-word transpositions hurt development retrieval | Optional unique adjacent-transposition correction: 31 derived queries nDCG 0.59387 → 0.67729; clean development quality unchanged. Derived narrow diagnostic, not broad spelling-correction proof. |
| Session v1 cleared context on short pronoun follow-ups | Revise bounded topic retention/reset; preserve failed v1 and v2 controls. Same-artifact off/combined/context replays captured. |
| Context gains were much smaller on own-code replay | Retain experimental lexical-topic context; authored own-code MRR 0.55556 → 0.57407. Do not infer real agent success from templated ambiguous-sequence wins. |
| Long lines and repeated serialization could waste output/time | Incremental bounded rows; explicit file-only results, exact Unicode slices, logarithmic whole-range budget fitting, indexed feedback tied to displayed rows. |
| Office expansion and invalid text decoding could yield partial/misleading sources | Declared ZIP expansion ≤32 MiB, XML entry ≤8 MiB, strict UTF-8/UTF-16 and extracted-text ceiling. Real fixtures pass; third-party PDF parsing is not a hard RSS/time sandbox. |
| An hour subtracted from a monotonic timestamp could panic after boot on Windows | Use saturating elapsed durations; failing workspace tests reproduced and pass after repair. |

Own-code fixed-query resident warm p50/p95 is 14.17/14.41 ms over 111 frozen Rust sources. This still reads/hashes primary bytes. It is a separately labeled persistent profile, not a fresh-process guarantee. No formal process-RSS profile is claimed in Gate 3.

## Native cache and agent interface

New records store complete dimensions of at most eight int8 vectors plus scales, locators, recipe/source identities and HMAC. Payload is `103 + N*(28+dims)`: eight 256-dimensional vectors = 2,375 bytes; one 512-dimensional vector = 643 bytes. Filesystem allocation overhead is additional. ADS/xattr first, application-cache LMDB on actual native failure, no adjacent sidecars. Same-filesystem rename works; copying/export can discard metadata and a different signing key causes recomputation. Fallback entries are bounded by 64 MiB; there is no global eviction/sweep claim.

Opt-in `search --retrieval lexical|semantic|hybrid --model-path ...` supports exact JSON views and diagnostics. `grep` uses the Rust grep crates, `read` provides bounded lines/character slices, `serve` is bounded JSONL with search/read/grep/reset. No hidden stub substitution. Queries source-check edits; model/recipe changes invalidate records.

Sessions cap response history at 16 entries and feedback at four turns. Explicit path/zero-based index feedback must refer to an actually displayed result and current source. Silence is unknown; external rg calls are not observed. `context` remains an experimental option, and stateless retrieval the selected held-out condition.

## Verification and reproduction

Final checks: **525 core tests / six ignored**, **15 desktop tests**, **48-combination Rust integration matrix**, **13 core doc tests / two ignored**, **66 evaluator tests / one host symlink skip**, **eight real-model cache/protocol probes** and real-Flash legacy CLI probes. An old extra Python stub settings runner failed due to incompatible threshold/model-fingerprint assumptions; `gate3-final-settings.*` and `reports/settings_matrix_2026-10-11.md` preserve this stale-tooling result. It is not counted as passing or a quality benchmark.

```text
cargo test --workspace --locked --jobs 2
cargo build --release --locked --bin ixos
python -m unittest discover -s eval -t .
python scripts/verify_retrieval_engine.py --binary target/release/ixos.exe --model models/lab/artifacts/potion-code-16M-v2-unbounded --output REPORT.json
python scripts/verify_cli_contract.py --binary target/release/ixos.exe --output REPORT.json
```

See `eval/README.md` for preparation/integrity/selection contracts. Actual invocations, raw responses, exact source/binary captures and model/corpus/config identities are under ignored `models/lab/restoration/test-*`. Public aggregates are `gate3-final-comparisons.json`, individual `gate3-test-*.stdout`, source/transform receipts and fixed-query profile logs. Original early baselines lack every intermediate source snapshot; their hashes/raw captures are retained and that reproduction limit is explicit. Do not overwrite a frozen selection to tune on test; use new held-out data for subsequent selection.

Native Mac/Linux execution, worst-device/resource coverage, ContextBench trajectory integration, actual Spectra tasks and public-history credential revocation/remediation remain release/follow-up work. No public push or history rewrite occurred.

Primary references: [Semble](https://github.com/MinishLab/semble), [BEIR datasets](https://github.com/beir-cellar/beir/wiki/Datasets-available), [Potion code parent](https://huggingface.co/minishlab/potion-code-16M-v2), [Potion general parent](https://huggingface.co/minishlab/potion-retrieval-32M), [Cursor regex architecture](https://cursor.com/blog/fast-regex-search), [Augment evaluation methodology](https://www.augmentcode.com/blog/you-make-your-evals-then-your-evals-make-you-introducing-augmentqa). Product-internal eval values are not interchangeable with these file-retrieval metrics.
