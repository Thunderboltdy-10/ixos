# Gate 23 — explicit read/grep feedback with bounded lazy vectors

An agent can now explicitly retain a displayed resident read/grep view for acceptance or rejection on a later search. Inspection alone does not change the query/topic anchor. Actual-model checks establish correctness and bounded overhead; they do **not** establish better task success. In the own-source diagnostic, accepting the exact inspection file still does not bring it into the first five semantic results. Keep the feature optional and evaluate stronger feedback candidates on fresh ordered tasks.

## Baseline and contract

[Protocol](gate23/protocol.json) and [actual baseline](gate23/before/receipt.json) precede implementation. Both selected parents show that an ordinary read/grep ID cannot supply feedback. Existing behavior remains the default.

Resident `remember:true` requires a semantic model and a feedback/combined/context session. The response adds a `remembered` array of eligible original indices. Reads, including exact character slices, use zero; grep can leave index gaps when an oversized or file-only view cannot be stored. A path aliases the first remembered view of that file; indices are preferable when there are multiple views. Lexical-only, off and related sessions reject remembering. No standalone grep model dependency or implicit external-tool observation is introduced.

`src/retrieval/inspections.rs` holds a separate RAM history, capped at 16 responses/16 views per response and 8,192 bytes of text/path/record allowance per response. It stores complete displayed text, never a silently clipped substitute. Vectors are created only when explicit feedback selects valid views, and reused on repeated selection. Retained vector memory additionally depends on model dimension. Nothing is written to a database, document cache or ordinary sidecar.

Read supplies its same-read raw/extracted source hash. Remembered grep computes the hash from bytes/text already used in its scan, avoiding a second file read that might observe a different version. The next search's normal full-source refresh validates current hashes; changed/excluded files cannot contribute. Inspection history is inserted only after its stdout response is flushed. A bounded metadata reservation is applied before reading/scanning; rejected envelopes cannot create remembered results.

The existing +0.15/-0.07 Rocchio-style query adjustments apply. References are deduplicated and reduced in canonical index order; distinct displayed views of one file remain distinct views. Four intervening successful search turns are allowed. Reset and detected topic drift clear records. A search/remembered inspection replaces an earlier record with its ID; use unique IDs across the task. An ordinary untracked read/grep changes neither the anchor nor the feedback history. No user model is trained.

## Correctness and platform proof

Two Rust regressions check full-view storage, Unicode slices, oversized/unhashed/file-only exclusion, ID replacement, response bounds and search-turn expiry. Focused 22 retrieval tests pass. Windows workspace: **552 core, 16 desktop, settings matrix and 13 doc tests pass**, six core/two doc tests ignored. Native Linux: **550 core pass**, six ignored, plus settings matrix and release build.

The main actual-model V2 probe checks 27 conditions across two parents and JIT/persistence-enabled modes:108 sequences/platform. V3 adds 8 combined/context sequences with prior topic queries. Total **116 sequences/412 requests per platform**, covering stale equal-length edits, ignore rules, unseen indices/paths, silence, repeated/lazy feedback, acceptance/rejection, canonical aliases/permutations, expiry boundaries, reset/drift, ID replacement, caps, memory limits, unsupported policies, invalid flags, character slices, escaped IDs and metadata rejection. All 116 corresponding stdout sequences match exact bytes across Windows/native Linux; every response fits its limit and source bytes/mtime/ordinary inventory are preserved except the explicitly authored freshness edit.

Default/control output pairs match. The earlier 18 actual-model JSONL envelope sequences and eight profile contracts also pass each OS. All **119 normalized core/manifests/catalog files** match; skill/YAML validate. Frozen evaluator aggregate remains `95afba09dd7c77e0fc56ed4e922d508116f701bb679f52c0844ed7725fc14297`. [Audit](gate23/audit.json) binds helpers, models, binaries and outputs. The CI real-model matrix includes the full probe; it was not remotely dispatched. Native execution remains the existing WSL/ext4 host, not a clean OS or Mac/desktop Linux validation.

| Platform | G22 control SHA256 | Current SHA256 |
|---|---|---|
| Windows | `3cced96ba3f8210ee92062543ebb6dcb297e9a703be509d18c33d238518a83b3` | `c16766b9f72eabccc48e9dc37112aa895803ba13f2904c8157caaccbf9147897` |
| Linux | `32cceb30d3a4439ba05dc4c807faa4294c9804a8fef68d0a8af6d854eb8bbb53` | `eadc59ceace98a7c2e539c5adafd9deedb6dac4d98a6444ebf5dadbace2d8802` |

Pinned parent fingerprints remain code `835fb9be0368efb6a64fd54039d4e79100add78ac50e2dc219daca32a62f5972` and documents `6966e61ba93fe416b36af3190469553e7c5447c8e3675ec034d4ee7ec0223f88`. No weights, representation defaults or frozen evaluation recipes changed. Older packages/compiler receipts retain their original identities.

## Sequential own-source cost diagnostic

[Prospective cost protocol](gate23/cost-protocol.json) fixes 116 Rust files/1,638,110 bytes copied from current Ixos source. This is already-informed navigation, not an unseen relevance task. Each process makes three calls: semantic search for `cache source freshness validation`, exact grep for `doc.source_hash == view.source_hash`, then the same search with or without explicit acceptance of the grep view. Four alternating arms use the preserved G22 control, current default, remembered silence and remembered acceptance.

Seven fresh processes/arm/parent/JIT-or-persistence condition, with first two per arm excluded from descriptive medians: **112 processes/336 calls per OS**. Windows and Linux run sequentially after compilers/correctness probes finish. Follow-ups are resident in both conditions. All measured persistence-enabled initial searches report 116 native hits, all follow-ups 116 RAM hits. Every default/control stdout pair and all 112 corresponding platform stdout files match exactly. Remembered silence differs only by its eligibility metadata.

| Parent / initial condition | Windows resident follow default → accepted ms | Linux resident follow default → accepted ms | Windows / Linux selected-view inference ms |
|---|---:|---:|---:|
| Code / JIT |14.870→15.263|12.577→12.987|0.072/0.105|
| Code / native warm |14.427→14.534|12.386→12.164|0.074/0.070|
| Documents / JIT |13.603→14.101|11.668→11.838|0.079/0.067|
| Documents / native warm |13.424→13.920|12.437→12.355|0.075/0.070|

These five-sample descriptive medians are noisy; negative differences are not speedup claims. Fresh-process/model-load/grep timings and every raw phase are also retained, not replaced by the resident numbers. One 196-byte displayed view is stored and one vector embedded on acceptance; silence embeds zero. General CPU/latency results do not follow from this small controlled source witness.

Across three calls, default stdout is 1,027 code/993 document cl100k_base tokens; remembered silence adds 5 tokens. Accepted output is 1,031 code/998 document tokens, including changed floating scores. Requests use 67 default, 71 remembered-silence and 83 accepted tokens. Windows total diagnostics, including ready, average 708–719 default versus 753–764 accepted tokens depending on parent/condition; they remain separate from stdout and are optional through `quiet-stats`. Exact averages/counters and independently scored native bytes are in the audit. Linux original token fields are null because its Python lacks tiktoken; the audit scores preserved bytes on Windows rather than inventing values. These totals exclude agent reasoning and are not billed-context or full-task-cost estimates.

The accepted grep correctly exposes the freshness comparison in `retrieval/inspections.rs`. Subsequent top-five results still include broad cache-related files rather than that file. Feedback adjusts query semantics modestly while lexical/file-representative evidence can dominate; this diagnostic does not justify a stronger default or a forced accepted-file pin. A fresh ordered-task A/B study must test whether passage feedback, file priors or other bounded combinations improve evidence discovery without hiding useful alternatives. Do not tune against consumed held-out RepoQA or the frozen live submissions.

## Failures, commands and decision

The initial Windows workspace build failed with linker LNK1104 opening a scale-bench test executable. Its log is retained; retry passes without a source change. Probe V1 stopped at lexical startup because the harness supplied unsupported `--mode` instead of `--retrieval`. The original helper, partial records, exception and standalone error reproduction are preserved. V2 corrects the flag and captures startup output on errors. V3 adds the combined/context supplement; it does not overwrite V2 identities or pretend those earlier checks used the later helper.

```powershell
cargo test --workspace --locked --jobs 2
cargo build --release --locked --bin ixos --jobs 2
python scripts/verify_inspection_feedback.py --binary target/release/ixos.exe --control .tmp/gate23/control-ixos.exe --code-model .tmp/gate4/reviewer-models/potion-code-16M-v2-unbounded --documents-model .tmp/gate4/reviewer-models/potion-retrieval-32M-row-int8 --output reports/local-inspections/contracts
python reports/restoration/gate23/cost.py --binary target/release/ixos.exe --control .tmp/gate23/control-ixos.exe --source .tmp/gate23/perf-source --code-model .tmp/gate4/reviewer-models/potion-code-16M-v2-unbounded --documents-model .tmp/gate4/reviewer-models/potion-retrieval-32M-row-int8 --output reports/local-inspections/cost
python reports/restoration/gate23/audit.py
```

Use new output directories. Helpers under `gate23/helpers/` retain exact versions; use their original script location/import context when replaying them. Native [build/baseline](gate23/linux.sh), [main probes](gate23/probe-linux.sh) and [cost/supplement](gate23/cost-linux.sh) recipes bind isolated paths; Linux cost uses `--no-tokenizer`. The current full probe includes all 116 conditions; original V2 ran 108 and V3 separately ran 8. Frozen source snapshots/models are ignored local research inputs, not installation requirements.

**KEEP OPTIONAL:** bounded explicit inspection feedback with measured correctness/cost and a retained ranking limitation. No default promotion, new training/distillation, task-success score, publication or history rewrite. Next: fresh human test-backed/ordered code tasks and fair feedback A/B candidates, followed by final source/package/agent documentation checks.
