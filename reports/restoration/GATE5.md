# Gate 5 — source discovery and independent context diagnostics

October11,2026; Windowsx86-64 / Ryzen7 5800X. Gate4 is `61b43e7`. Gate3 frozen results/selection remain unchanged; no new model/fusion/passage/session selection or training occurred here. Latest runtime SHA256 `dd56a5b93afcb43846385ed920d8e8717b1f14e5a2cfb02b15374a45ea9ecd03`.

## Source correctness findings

The new code-context work exposed two discovery errors before ranking:

1. Every directory named `build` was excluded. This hides actual modules such as Clap's `src/build/app/`. Remove the name-only blacklist; repository ignore rules still exclude generated outputs and dependency directories stay pruned.
2. `require_git(false)` allowed ignore files **above a nested Git root** to affect its sources. Set Git semantics when a `.git` boundary exists among the search root's ancestors; keep ordinary-folder `.gitignore` support outside Git. This protects a foreign repo's own rules while still inheriting the containing repo's rules when searching its `src/`.

The first new Rust regression failed before implementation and now passes; the nested-boundary regression and the full workspace pass. Initial one-off source probes inherited the host checkout's ignore rules and remained empty. Their failure is retained; the final controlled probe uses a dedicated nested repository with `/build/` ignoring generated output while preserving `src/build/`.

| Same authored probe | Gate4 independently built binary | Current binary |
|---|---:|---:|
| Searchable files | 1 | 2 |
| Expected `src/build/app/mod.rs` retrieved | No | Yes, first |
| Generated root `build/` output returned | No | No |

[Failing regression](gate5/gate5-build-regression-before.stdout), [isolated old CLI](gate5/gate5-build-isolated-before.stdout), [final CLI](gate5/gate5-build-isolated-final.stdout), [final counts](gate5/gate5-build-isolated-final.stderr). No primary file content is modified by these searches.

## ContextBench integrity before comparison

The metadata-only plan `eval/contextbench-dev-v1.json` selects eight distinct-language repositories / one issue each from pinned verified training450rows. The Hugging Face revision, file size/SHA256, instance IDs, source commits, policy and seed are versioned. The adapter reads issue/context columns without solution patch/test patch/hints. Corpus preparation receives only exact source archives; relevance processing happens afterwards. No held-out partition was downloaded.

The **strict** audit failed7/8 selected tasks: annotations can extend beyond base-source EOF or their captured content can differ from the pinned revision. Preserve that result rather than silently discarding the cases. An explicit **upstream-compatible** run uses the upstream reader's start/end/EOF interpretation and separately reports content mismatches. This is not an independently repaired human span label set. [Strict failures](gate5/gate5-contextbench-preparation.json), [coordinate audit](gate5/gate5-contextbench-coordinate-audit.json), [successful compatibility preparation](gate5/gate5-contextbench-isolated.json), [protocol](../../docs/evaluation/CONTEXTBENCH.md).

The coverage guard then rejected an incomplete CodeServer corpus139/154. A new evaluation-container Git boundary alone did not isolate it while the runtime still used `require_git(false)`; neither incomplete run is counted. With the corrected walker, every selected source is discovered/extracted. The evaluation `.git` boundary lies outside all source corpora and is never created by runtime search. One early adapter retry also failed because corpus-policy metadata shadowed the coordinate-policy variable; that exception is retained and corrected.

## First development result

Sequential actual CPU hybrid/JIT, prepared BM25 and ranked bounded-context rg; eight unique issues/eight repository families/eight languages; one repetition each. Same frozen corpus, count10/context2/6,000bytes. All24 final runs pass inventory and displayed-source contracts, with zero evidence failures. Original Gate3 recipe/model retained. Exact commands, summaries, per-task metrics, binary/model/source identities: [comparison](gate5/contextbench-v3/comparison.json), [commands](gate5/contextbench-v3/commands.json); raw wire/source snapshots remain under ignored `models/lab/restoration/contextbench-dev-v3/`.

| Method | nDCG@10 | MRR@10 | File recall@10 | Line recall | Stdout tokens | Detailed total tokens | Observed p50 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Hybrid, fresh JIT CLI | 0.43047 | 0.33452 | 0.72917 | 0.00868 | 1090.5 | 1434.4 | 427.5ms |
| BM25, prepared memory | 0.39536 | 0.34271 | 0.62500 | 0.00805 | 1130.4 | 1130.4 | 35.7ms |
| rg, fresh process plus loaded-source windows | 0.28677 | 0.29063 | 0.47917 | 0.00758 | 1178.8 | 1178.8 | 115.4ms |

Timing conditions differ; only eight one-shot observations support these medians, not hardware/product latency guarantees. Hybrid minus BM25 nDCG is+.03511, paired family95% interval[-.02846,+.10283]. Hybrid minus rg is+.14370, interval[-.03731,+.34216]. Both intervals include zero. MRR is slightly below BM25; missed/worse cases remain in the aggregate.

The weak preview coverage is useful diagnostic evidence. Many gold contexts contain whole files:123–986 annotated lines in seven tasks,58 in CodeServer. Search returns one view per file; with context2, even an ideal five-line view covers only a small portion of these annotations. The recorded [preview upper bounds](gate5/gate5-contextbench-preview-ceiling.json) explain that constraint without replacing the real metric. Pytest's target is missed entirely; several correct files show none of the annotated range. A file-ranking win is therefore insufficient to establish useful task evidence.

These are **inspected development, single-query, restricted-inventory line metrics**. The published ContextBench benchmark evaluates coding-agent trajectories with byte/symbol/edit metrics. We do not compare these numbers directly with its leaderboard or claim coding-task success, language generalization, Cursor/Augment superiority or a universal retrieval replacement. Annotation/base-content mismatches also limit interpretation.

## Verification and next engineering question

- `cargo test --workspace --locked --jobs 2`:529core/sixignored,16desktop,48-combination integration,13doc/twoignored. [Receipt](gate5/gate5-final-workspace.stdout).
- Release build passed. [Receipt](gate5/gate5-release-build-boundary.stderr).
- Evaluator77tests/onehostskip, including11new context-adapter/partial-comparison tests. [Receipt](gate5/gate5-final-eval-runner.stderr).
- Eight actual-model profile/config/protocol checks passed; default/explicit/frozen fixture output remains equal. [Receipt](gate5/gate5-final-profile-contract.json).
- Eight native/source/fallback/feedback probes passed with the latest binary. [Receipt](gate5/gate5-final-native-contract.json).

An independent staged source export2191files contained no local envs/private/weights/build outputs and again preserved98archive/453raw hashes. A fresh target source build passed5m33s with two jobs; separately built executable SHA256 `e50d62729cb3be246ccc21ef9dc62cc9f91e028a79528addf9d59ac5e21afdcb`. Eight profile checks, frozen-fixture equivalence and the actual build-source discovery probe pass from that export. The packaged executable was extracted and ran the model-free source query successfully; no weights are bundled. This reused the installed toolchain/Cargo registry and previously independently downloaded pinned models, not a clean OS. [Source receipt/commands](gate5/gate5-reviewer-source.json), [build](gate5/gate5-reviewer-build.stderr), [profiles](gate5/gate5-reviewer-profile.json), [package](gate5/gate5-reviewer-package-smoke.stdout). Subsequent edits only update current guides/state/receipt text; runtime and model setup remain the tested source.

Next: a no-gold search/read/grep trajectory protocol with cumulative tokens, meaningful source-span coverage, tool calls and time to first useful evidence; independently held-out repository families before further recipe selection; no-answer/drift and low-resource coverage. Investigate query construction/evidence location from development failures while preserving exact/stateless/strong lexical controls. The changes here repair discovery and benchmark integrity; they do not solve all evidence selection or full agent workflows.

Mac/Linux native execution remains unverified and the user deferred Mac testing. Provider credential revocation/rotation and reviewed history remediation still precede publication. No public push, CI dispatch, history rewrite, deployment, upload or release occurred.
