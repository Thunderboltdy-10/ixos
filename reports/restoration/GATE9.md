# Gate 9 — bounded evidence in the actual engine

The Rust CLI now offers opt-in `--evidence-policy bounded-rerank`. It preserves the compact native record and file ranking, and selects query-relevant evidence from stored representatives plus up to eight lexical candidate chunks/file. Limits are ten files/sixteen candidates per file. Extra inference is separate from document-cache work. The default remains `global-line`.

## Correctness before selection

The development/validation lab screen used full-precision candidate vectors. The actual engine normalizes a compact int8 round trip for document vectors even in JIT mode; new candidate vectors use the same precision. The selected query-time vectors do not enter ADS/xattr. Unused vectors are discarded; explicit bounded RAM sessions can retain selected result vectors for later feedback. No cache recipe/payload expansion, sidecars, model training or new model branding.

Runtime-v1 exposed nondeterministic lexical previews: random HashSet iteration changes floating-point sums of equally relevant term sets. Twenty identical authored fresh lexical calls produced five distinct anchors/output hashes. Stable unique-term summation now selects the same earliest line in all twenty calls. Forty-two of 180 original development responses changed their views on an unchanged control rerun, with no changed path order. Final runtime-v3 uses the corrected binary for both policies. The older control sometimes happened to show a more useful later line: its validation cumulative recall was 0.516562 versus 0.491924 after deterministic ties. This correctness fix is not a claimed quality optimization; the older comparisons remain available.

A passage boundary could also turn part of a long identifier into an apparent exact query word. The runtime excludes incomplete alphanumeric edge fragments from lexical evidence, conservatively including a split camel-case run. Original embedding input/quotes are retained. Tests cover both leading/trailing fragments and partial physical lines. The older lab screen/receipts remain unchanged and exploratory. Its renderer included false evidence_omitted fields; actual serialization omits them, so actual context costs supersede the screen estimate.

## Final actual-runtime comparison

300 unique descriptions: 180 development across 18 families, 120 validation across 12. Each policy completes all descriptions, with one actual fresh CLI/JIT search followed by the same gold-blind three-read/optional inline-cue grep schedule. Quotes, source/model/binary identity and budgets are verified. Initial search cost and diagnostic stderr are actual captured traffic, not shared synthetic preparation. Labels score only the finished schedule. These are supplied-source function retrieval diagnostics, not autonomous reasoning, official RepoQA generated-function scores or product superiority.

| Split/policy | Initial preview line recall | Cumulative line recall | Cumulative precision | Mean stdout tokens | Mean stderr tokens | Tasks with overlap |
|---|---:|---:|---:|---:|---:|---:|
| dev/global-line | 0.110301 | 0.447272 | 0.032103 | 3150.789 | 340.050 | 92/180 |
| dev/bounded-rerank | 0.139499 | 0.509647 | 0.036794 | 3145.767 | 382.528 | 105/180 |
| validation/global-line | 0.133416 | 0.491924 | 0.033806 | 3333.008 | 339.467 | 66/120 |
| validation/bounded-rerank | 0.145551 | 0.556384 | 0.039237 | 3342.800 | 380.292 | 73/120 |

File ranking nDCG stays 0.730582 on development and 0.778721 on validation in both arms. Scores/order are unchanged by the policy; different excerpts can still affect trailing row budget fitting, so retained file metrics are verified rather than assumed.

dev: paired family cumulative recall difference +0.062375, bootstrap 95% interval [0.015658,0.116467]; 21 improve/5 regress/154 unchanged. Mean stdout+stderr increases 37.456 tokens. This is evidence for a prospective held-out candidate, not a universal-default decision.
validation: paired family cumulative recall difference +0.064460, bootstrap 95% interval [0.001914,0.139460]; 10 improve/1 regress/109 unchanged. Mean stdout+stderr increases 50.617 tokens. This is evidence for a prospective held-out candidate, not a universal-default decision.

Request costs use canonical tool JSON, rather than a vendor-specific shell wrapper. All actual command traffic and stdout/stderr are retained. The reported line precision measures annotated lines divided by displayed lines, not answer correctness.

## Actual work and cache conditions

| Split | Mean candidate vectors | Mean extra vectors | Extra inference ms | Selection including inference ms |
|---|---:|---:|---:|---:|
| dev | 80.711 | 24.728 | 5.455 | 20.309 |
| validation | 76.583 | 22.975 | 5.108 | 19.866 |

These are measured CPU query-time phases, not standalone model microbenchmarks. Each fresh numerical search has one repetition; end-to-end timings are descriptive and vary with process startup/OS cache. All 120 native-warm validation requests have verified native/application hits and zero document embeddings. Their file metrics and displayed views match all 120 JIT candidate responses; evidence inference remains separately counted. See final-diagnostics.json and costs-v3 commands/raw outputs.

| Resident profile/policy | Warm p50 ms | Observed peak working set MiB |
|---|---:|---:|
| code-resident-global-line | 14.667 | 129.44 |
| code-resident-bounded-rerank | 31.977 | 129.55 |
| documents-resident-global-line | 16.699 | 198.62 |
| documents-resident-bounded-rerank | 55.964 | 198.06 |

Resident profiles use the same 113 own-source files/fingerprints, isolated hybrid/session-off configuration, one fill followed by ten fixed-query samples. Every warm request has113 RAM hits and zero document embeddings, while all primary sources are still read/hashed. OS working set is not disk footprint or a low-end-device guarantee. Reranking increases resident latency, especially the document model; no free semantic gain is implied. Fixed own-source queries are performance contracts, not independent quality labels.

## Verification and identities

- Final Windows binary SHA256: `9596b928852289d5b3e4e8bd1c3e70bf397be9ed38b8455143e8bba679a3d351`.
- Final native Linux SHA256: `40b216ed019fdac1a89379561b80ba9c5efcff49d9ef437fc1846795c9a3f38d`; ext4 xattr and fallback contracts, source hashes/commands/logs under gate9/linux-v3.
- Code model fingerprint 835fb9be…: attributed unbounded Potion code parent derivative; same weights as earlier selected code profile. Document row-storage derivative retains parent attribution and full CPU weights at runtime.
- Final Windows: 536 core tests plus settings matrix; Linux: 534 core plus settings matrix; six existing model-dependent tests ignored on each. Earlier full workspace passed 16 desktop and 13 doc tests after a transient Windows linker retry; failure retained. Evaluator: 109 tests pass, one Windows symlink skip. Agent skill validates with local ignored dependency installation.
- Actual-model policy probes verify 2,375-byte eight-vector payload invariance, source bytes/mtime, no adjacent files, JIT/native agreement, bounded policy errors, resident override/error recovery, and editable config. Existing native engine/profile contracts pass on Windows/Linux; Windows additionally checks the unchanged original frozen retrieval fixture.
- CLI search/serve, retrieval.evidence_policy and request-local JSONL evidence_policy are documented. Diagnostics expose candidate count, extra inference and total selection time. Feedback vectors use the selected passage for displayed results when sessions are explicitly enabled.

## Own-source use and remaining limits

The coding agent used the real CLI to investigate the new implementation. A broad concept query ranked retrieval/evidence.rs first, but both policies initially showed its statistics fields rather than the computational loop. Exact grep exposed both the declaration and the counting statement; a second bounded read reached the actual batching/selection code. Reranking helped other returned snippets but did not solve this first preview. Source bytes/mtime were preserved. Raw traffic under gate9/own-cli; authored navigation, not independent quality or controlled timing.

KEEP the bounded policy as an opt-in candidate and the deterministic/fragment correctness fixes. Preserve global-line as the default and all earlier screens/negative results. More embeddings cannot repair a relevant file missing from the initial ranking. Four/eight representatives still approximate multi-topic sources; no-answer calibration, realistic ordered session/feedback interactions, blind agent tasks and constrained-device checks remain distinct layers. Native Mac is deferred; the desktop retains its earlier progressive engine.

Next: commit this coherent gate, freeze exact prospective configurations/model/binary/policy before preparing 26 reserved repository families/260 descriptions, and evaluate every selected target without tuning on those results. No public push, destructive history rewrite, remote CI dispatch, release or training. Provider key rotation/reviewed history remediation still precede publication. Private authorship/application records remain git-excluded.

Commands, failed/retried logs, earlier runtime-v1, final runtime-v3, native/OS profiles and per-task paired receipts live under gate9/. Complete source snapshots and tool traffic remain in ignored models/lab/restoration/repoqa-runtime-*. The frozen Gate3 selection/results are untouched.
