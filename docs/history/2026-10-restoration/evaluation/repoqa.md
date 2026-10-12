# RepoQA function-span retrieval protocol

This adaptation tests a specific question: can Ixos locate a described function and return its source evidence under a compact tool budget? It complements the human-issue ContextBench diagnostic, whose broad/mismatched annotations make small previews hard to assess. It is not an autonomous coding task or the official RepoQA generated-function syntax-similarity score.

## Pinned source and family split

Official supplied-source release: [evalplus/repoqa_release at e3a5710](https://github.com/evalplus/repoqa_release/tree/e3a571033de99d0b9dcaccd25577a75d4b1c70b1), `repoqa-2024-06-23.json.gz`. Compressed SHA256 `c050a2ad90a7df89d9dc1f1c3b3b20683edd20a56293b35fcaae43dec115d681`,12525636bytes; decoded71510991bytes/SHA256 `bd3f7cab47283cdeccee20daea31af587b680cf8f9db192ab4da1037730cd6e2`. The download also matches the official Git blob SHA1. This snapshot contains60repositories/600needles/six languages, including Rust. The older project README/paper's500/five-language description is not silently substituted for this file.

`eval/repoqa-family-v1.json` is metadata-derived and frozen before description/target values are inspected. Canonical plan SHA256 `4a9a1ebdf425f648b08f4257f3a391afb07c8206d81556743dd7b325d5a5b1b1`. Previously inspected repository families `google/gson`, `expressjs/express`, `axios/axios` and `serde-rs/serde` are excluded in their entirety. Within each remaining language, SHA256(`ixos-repoqa-family-v1/`+casefold(repository)) orders families: first3dev, next2validation, remainder test.

| Split | Repository families | Function descriptions |
|---|---:|---:|
| Development |18|180|
| Validation |12|120|
| Held-out reservation |26|260|

The single downloaded archive includes every split. Preparation accesses descriptions/target coordinates only for its requested split. Held-out target preparation requires a freeze containing the matching plan, selected config hashes, model fingerprints and binary identity. Reconstructing the complete plan from metadata prevents silent family reassignment or removal. No held-out descriptions/targets have been inspected/prepared/scored in Gate8. Unknown model pretraining overlap remains; repository splits do not make upstream models unexposed to GitHub code.

## Source and labels

Preserve the supplied `content` strings as exact UTF-8 files and original relative paths. These are curated snapshots, not complete fresh Git checkouts. Inventory is constructed before reading targets; empty/whitespace-only files are excluded with recorded reasons because the engine cannot search them. Every one of the ten needles/family must still validate. Targets outside the searchable inventory, invalid coordinates, duplicate catalog matches, oversized/binary sources or incomplete families fail preparation; no harder query is silently dropped.

The [upstream function collector](https://github.com/evalplus/repoqa/blob/main/scripts/curate/function_analysis.py) uses zero-based starts and exclusive local byte ends. Independently compute physical LF line coverage from supplied UTF-8 bytes, enforce UTF-8 character boundaries, and match the exact local function catalog entry. Do not use upstream global byte offsets, which are unnecessary for file retrieval. No range shifting or content matching to a convenient different function. This verifies coordinates/source identity; it does not independently re-annotate function meaning.

The query is the verbatim upstream natural-language description. The [upstream annotation process](https://github.com/evalplus/repoqa/blob/main/scripts/curate/needle_annotation.py) generates descriptions from code; these are not independent human issues. Count exact case-sensitive target-name substrings separately, without filtering or rewriting queries. A substring match can be incidental natural language, so it is not automatically an identifier leak verdict. Generated descriptions, comment content and unknown pretraining overlap limit generalization claims.

```powershell
python -m unittest eval.test_repoqa eval.test_anchors
python -m eval.repoqa freeze --metadata reports/restoration/gate8/repoqa-download-metadata.json --output NEW_PLAN.json
python -m eval.repoqa prepare --plan eval/repoqa-family-v1.json --archive dataset/restoration/repoqa-download/repoqa-2024-06-23.json.gz --split dev --destination NEW_CORPUS_FOLDER --receipt NEW_PREPARATION.json
python -m eval.repoqa_run --preparation NEW_PREPARATION.json --binary target/release/ixos.exe --model-path MODEL_FOLDER --output NEW_BASELINE_FOLDER --receipts NEW_RECEIPT_FOLDER
```

Download the pinned public artifact URL/hash from the release metadata receipt. NumPy/tiktoken are needed for numeric screening; preparation uses the standard library/shared contract. Original data, sources, descriptions, models and raw source views stay ignored. All public receipts retain protocol/identities/counters rather than redistributing source corpora.

## Comparisons and evidence

Four complete baseline arms: actual fresh Ixos hybrid JIT, actual model-free Ixos lexical, prepared in-memory BM25, and fresh ranked ripgrep with loaded-source windows. Same source/queries/limit10/context2/6000-byte output ceiling. Capture exact stdout, diagnostic stderr, source/model/config/binary identity and every failure. Full discovery/extraction must equal the frozen eligible inventory; verify models actually load. Timing is descriptive with one repetition and mixed fresh/prepared conditions; it is not a stable latency study or a fair complete-product speed comparison.

After baseline completion, `eval.anchor_run` accepts the repository preparation and hybrid reference directory. It preserves each actual initial candidate order/score/control response and runs the four [evidence-location strategies](ANCHORS.md) with real Rust embeddings and identical actual read/grep follow-ups. The policy uses returned observations/descriptions only; gold scores finished schedules. Shared candidate/lexical preparation is a quality screen, separately recorded, not end-to-end production arm timing. Exact output budgets and unioned displayed-line metrics apply throughout.

Gate8 reports development only. Its promising bounded query-rerank result is retained for unchanged validation, then exact runtime/recipe freezing and fresh held-out execution. Do not optimize on reserved test scores, copy official leaderboard values onto Ixos line metrics, or present these deterministic tool schedules as LLM task success. See `reports/restoration/GATE8.md` for results and preserved negative cases.

## Prospective actual-runtime held-out protocol

Gate 9 verifies the actual Rust policy on all development/validation descriptions, repairs random lexical-preview ties and incomplete-word evidence at chunk boundaries, and keeps bounded reranking opt-in. Its report separates actual query inference, output tokens, native-cache hits and resident memory/latency. The older full-precision lab screen is retained as exploratory evidence.

`eval/repoqa-test-selection-v1.json` freezes five methods, the actual binary/model fingerprints, configuration hashes, evaluator source hash and fixed follow-up policy before reserved target preparation. Canonical selection SHA256 is `52fd9a94331a603b4fa2e62f329a01396b10df299dd22b091d674044f9a9344d`. The default remains global-line regardless of this test; no model, threshold, passage or fusion tuning follows from reserved targets. Each method gets one fresh/JIT repetition, with the existing distinctions for prepared BM25 and ranked ripgrep timing.

Preparation adds the immutable selection hash to its receipt. `eval.selection` then binds the complete prepared dataset fingerprints into a separate run-selection record, preserving every frozen recipe. The runner verifies the original freeze, preparation and evaluator source on every invocation. Changed recipes, sources, missing families or partial method outputs fail; every one of the 260 descriptions must complete. The binding step records source identities derived after preparation and does not introduce parameters chosen from target results.

```sh
python -m eval.repoqa prepare --plan eval/repoqa-family-v1.json --archive dataset/restoration/repoqa-download/repoqa-2024-06-23.json.gz --split test --selection eval/repoqa-test-selection-v1.json --destination NEW_TEST_CORPORA --receipt NEW_TEST_PREPARATION.json
python -m eval.repoqa_test_run --freeze eval/repoqa-test-selection-v1.json --preparation NEW_TEST_PREPARATION.json --binary FROZEN_BINARY --model-path FROZEN_MODEL --output NEW_TEST_RUNS --receipts NEW_TEST_RECEIPTS
python -m eval.evidence_run --preparation NEW_TEST_PREPARATION.json --control NEW_TEST_RUNS/hybrid --candidate NEW_TEST_RUNS/bounded-rerank --selection NEW_TEST_RECEIPTS/run-selection.json --binary FROZEN_BINARY --model-path FROZEN_MODEL --output NEW_TEST_TRAJECTORIES --receipt NEW_TRAJECTORY_RECEIPT.json
```

Use fresh paths throughout. The original freeze and evaluator sources are immutable once reserved targets are accessed; later experiment changes need new held-out material or an explicit exploratory label. Source preparation, functions, queries and full raw traffic remain ignored. Public receipts contain identities, commands, counts and aggregate/per-task measurements. The original Gate 3 selection and held-out results remain separate and untouched.
