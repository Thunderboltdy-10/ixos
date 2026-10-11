# Gate 10 — prospective held-out function retrieval

The frozen bounded evidence candidate improves retrieval of function lines on the reserved repository families. The same experiment confirms that hybrid file ranking beats the supplied lexical baselines for these descriptions. Defaults remain unchanged, as specified before test preparation. This is evidence for a useful optional retrieval policy, not autonomous agent success or a commercial product claim.

## Freeze and complete sources

Selection `eval/repoqa-test-selection-v1.json`, canonical SHA256 `52fd9a94331a603b4fa2e62f329a01396b10df299dd22b091d674044f9a9344d`, was written before reserved descriptions/function coordinates were prepared. It fixes the actual Gate 9 binary, real code model fingerprint, five method recipes/config hashes, public evaluator source hash and gold-blind follow-up policy. No model, threshold, passage, fusion or defaults tuning followed from this test.

The prepared receipt binds that original selection hash. A separate run-selection adds complete dataset fingerprints without altering recipes. Every invocation rechecks the original freeze/preparation/evaluator source. Unit contracts reject recipe/source/harness drift, missing families and partial aggregation; 112 evaluator tests pass with one known Windows symlink skip. These are contract fixtures, while all numerical inference uses the actual safetensors model.

All 260 descriptions across 26 repository families/six languages prepare and complete. Source inventory: 3,924 eligible files, 28,485,649 primary bytes; 23 zero-content exclusions recorded before targets. All targets retain strict local UTF-8/LF/catalog validation, with no range repair, target-specific source filter or dropped function. These are curated supplied-source snapshots, not complete fresh Git checkouts. Generated descriptions and unknown pretraining overlap remain limitations.

## Actual initial retrieval

Five complete arms, 1,300 searches on 260 unique descriptions. Same source/query/output ceilings: limit 10, context 2, 6,000 serialized bytes. Hybrid/global-line and bounded-rerank use the identical actual binary/model; lexical loads no model. Every displayed view is source-verified, with zero evidence failures.

| Method | nDCG@10 | MRR@10 | File recall@10 | Preview line recall | Mean stdout tokens | Descriptive p50 ms |
|---|---:|---:|---:|---:|---:|---:|
| hybrid | 0.693721 | 0.621154 | 0.923077 | 0.130338 | 1045.242 | 304.04 |
| bounded-rerank | 0.693721 | 0.621154 | 0.923077 | 0.142640 | 1045.238 | 319.97 |
| lexical | 0.606556 | 0.532634 | 0.842308 | 0.105077 | 1042.115 | 60.18 |
| bm25 | 0.606556 | 0.532634 | 0.842308 | 0.105077 | 1071.931 | 20.79 |
| rg | 0.446901 | 0.361416 | 0.723077 | 0.090583 | 1096.450 | 110.13 |

One fresh CLI/JIT repetition per Ixos method. Prepared in-memory BM25 and fresh ranked rg with loaded-source windows have different preparation/startup costs. Timings are descriptive, not a complete-product speed comparison or stable latency estimate. Ranked rg receives the same natural-language description; this does not represent every way an agent might construct a sharper literal query.

Hybrid minus lexical nDCG: +0.087165, paired family bootstrap 95% interval [0.067061, 0.106789].
Hybrid minus bm25 nDCG: +0.087165, paired family bootstrap 95% interval [0.067061, 0.106789].
Hybrid minus rg nDCG: +0.246819, paired family bootstrap 95% interval [0.203733, 0.289480].

## Matched actual search/read/grep trajectories

Both policies use their actual initial search response and the identical frozen follow-up schedule. The controller receives description text and returned observations only; labels score the finished schedule. All 520 trajectories complete on the same 260 descriptions. No acceptance feedback, annotation-based stopping or widened reading budget is introduced.

| Preview policy | Initial line recall | Cumulative line recall | Cumulative precision | Mean stdout tokens | Mean diagnostic tokens | Tasks with annotated overlap |
|---|---:|---:|---:|---:|---:|---:|
| global-line | 0.130338 | 0.452262 | 0.030039 | 3189.412 | 340.388 | 141/260 |
| bounded-rerank | 0.142640 | 0.504845 | 0.033779 | 3182.919 | 381.496 | 153/260 |

Bounded reranking adds 5.258 percentage points of cumulative line recall, paired family 95% interval [2.283, 8.717]. 17 descriptions improve, 2 regress and 241 are unchanged. File ranking nDCG is identical. Mean stdout decreases 6.492 tokens; counting actual diagnostic stderr gives a net increase of 34.615 tokens (about 0.98%). Both schedules average 4.231 calls.

This covers roughly half the annotated function lines, not every relevant function or a complete answer. Overlap in 153 tasks still leaves 107 without any annotated overlap under this fixed schedule. Line precision counts annotated versus displayed lines; it is not a confidence or answer-accuracy probability. Canonical request tokens are a tool-wrapper proxy, while actual stdout/stderr and commands are retained.

## Cost and interpretation

The policy averages 79.342 candidate vectors/query and 25.092 extra passage embeddings, with maximum 149 candidates below the 160 ceiling. Extra CPU inference averages 5.618 ms; selection including inference averages 22.550 ms. Extra vectors do not enlarge the persistent ADS/xattr record. Selected ones may be retained only in the explicitly enabled bounded RAM history.

Gate 9 separately verifies JIT/native agreement, real native/RAM hits, source preservation and the unchanged 2,375-byte eight-vector record. Its resident own-source cost rises from about 15 to 32 ms for the code profile and 17 to 56 ms for documents; those fixed-query Windows measurements are not low-end-device proof. The present held-out quality study does not replace that cache/OS characterization.

KEEP the opt-in candidate and the source/tie correctness fixes. Preserve the predeclared global-line default and original model attribution. The result supports this particular supplied-source description task; it does not establish full real-agent coding success, no-answer calibration, dense-document behavior, image/OCR support, or superiority over Cursor/Augment. Official RepoQA scores generated-function syntax similarity, while this adaptation scores ranked files and exact source lines.

The reserved split is now consumed. Any new inspection-driven retrieval/model/threshold changes need new held-out material or explicit exploratory labeling; do not reuse these scores as an untouched selection set. Original Gate 3 frozen results remain separate and unchanged. Native Mac is deferred; no public push, history rewrite, release, deployment, model training or remote CI dispatch. Historical key rotation/reviewed history remediation still precede publishing.

The final index-export check also caught platform-dependent evaluator line endings. Explicit Git attributes retain three older CRLF files, one mixed-ending file byte-for-byte and LF for the remaining Python. A fresh checkout-index export of all 68 evaluator files matches the prospectively frozen harness hash exactly; no measured Python source bytes were changed. Failed intermediate checks and the resolved condition are recorded in `gate10/checkout-integrity.json`.

## Reproducibility

Commands and complete preparation/selection/aggregate/per-task receipts: `gate10/commands.json`, `gate10/preparation-v1.json`, `gate10/prospective-freeze.json`, `gate10/baselines-v1/`, `gate10/trajectories-v1.json`, `gate10/diagnostics.json`. Exact binary SHA256 remains `9596b928852289d5b3e4e8bd1c3e70bf397be9ed38b8455143e8bba679a3d351`; code model fingerprint `835fb9be0368efb6a64fd54039d4e79100add78ac50e2dc219daca32a62f5972`. Complete raw traffic/source snapshots are ignored under `models/lab/restoration/repoqa-test-*`, and prepared corpus/labels under `dataset/restoration/repoqa-test-v1`.

Protocol and primary upstream source attribution: `docs/evaluation/REPOQA.md`. Current tool behavior: `docs/CLI.md`, `docs/ARCHITECTURE.md`, `skills/ixos-retrieval/SKILL.md`.
