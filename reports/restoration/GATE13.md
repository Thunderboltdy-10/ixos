# Gate 13 — one cache quantization round-trip

Fresh JIT, native cached and resident searches now use the same document-vector precision. The earlier pipeline rounded/normalized vectors in RAM, then serialized those rounded vectors with another quantization step. Reading that record could slightly change scores and session feedback. The new pipeline serializes original model output once and derives live vectors through the same byte/scale decode and normalization as the disk record.

## Reproduction and result

The actual Gate 12 executable is preserved as the control, not rebuilt or relabeled. `scripts/verify_cache_precision.py` runs both selected models on the fixed 113-source Gate 11 export with default and bounded evidence, then explicit combined-session feedback referring to a genuinely displayed result. It checks fresh/native-first/native-warm/resident output and the full feedback trajectory with exact JSON equality. It preserves source bytes/mtime and the ordinary adjacent-file inventory. These are twenty authored contract comparisons, not twenty independent relevance labels.

| Platform | Control output mismatches | Repaired output mismatches | Native warm document inference |
|---|---:|---:|---:|
| Windows | 15 / 20 | 0 / 20 | zero; actual native hits |
| Native Linux/WSL ext4 | 14 / 20 | 0 / 20 | zero; actual native hits |

The old failures involve small floating-point differences, not an observed source corruption or a claim that every old query ranked differently. Exact agreement is required, without tolerance or rounding away returned scores. The first harness invocation used an incorrect `--session-policy` spelling and was rejected; its raw output and helper are retained. The corrected harness uses the documented `--session` flag. Production CLI parsing did not change for that harness correction.

## Implementation

`src/retrieval/cache.rs` shares `row_scale` and `row_byte` between serialization and RAM quantization. Byte decoding canonicalizes signed zero. `src/retrieval/mod.rs` writes original model rows before applying that one RAM round-trip. Failed writes still receive the same live precision; persistence remains optional.

The recipe now includes `int8-single-roundtrip-v2`, so old records cannot silently supply their double-rounded vectors. They are recomputed on the next search. The IXD1 layout and file-attached namespace stay the same: eight 256-dimensional code passages remain 2375 bytes; one 512-dimensional document centroid remains 643 bytes. No sidecars or additional per-model caches are introduced. Model files/fingerprints and primary source bytes are unchanged.

A new Rust contract compares every F32 bit after serialization/decode versus live quantization for forty vectors with dimensions 1–4096, zero/negative-zero, constant and mixed signed values. The actual integration probe verifies that the engine supplies original vectors in the right order, including optional evidence and feedback. CI includes the real-artifact probe on the current source tree; remote CI has not been dispatched. The cost helper also preserves unavailable OS memory as null instead of attempting to iterate it; native Mac execution remains unverified.

## Verification, source and package proof

Windows full workspace: 545 core, 16 desktop, settings matrix and 13 doc tests pass; six core/two doc existing ignored. Linux release: 543 core and settings matrix pass; six ignored. Actual evidence, quoted/multi-term queries, source freshness/rename/fallback/feedback and profile contracts pass on both platforms. The original frozen Gate 3 profile fixture also agrees on Windows. No frozen evaluator source or recipe has been changed; older held-out quality/cost numbers retain their original executable identities.

Current Windows executable SHA256: `afbbbfe2df00d1fa6bfb031fb7a5fba5a29ace7cb1295552d66c7a38dbb06bb3`. Preserved Windows control: `e18e80ce862896379491630d7476bf6e036f675a16aea6cec995fc82468bcdaf`. Native Linux executable: `823b1e77daba847591fefb937e3edadc2e7141088da0204715c463fe7929a883`. Source/build logs, exact commands and all before/after responses live under `gate13/`.

`gate13/final/` records a fresh source-index export/rebuild with a separate existing dependency target and an extracted Windows package/profile check. Pinned model downloads from Gate 11 are reused without checkout imports. This is not a clean OS or new-download proof. Linux local package refresh is recorded separately. Current architecture, CLI and release guides document old-record invalidation and exact precision; archived guides remain unchanged.

## Using Ixos on Ixos

The exploratory query “where are embedding vectors converted to bytes before writing native cache” ranks the retained semantic engine first and the current retrieval pipeline second. It omits `retrieval/cache.rs` from the top ten, and the pipeline preview shows I/O bookkeeping rather than the serializer. This is an honest navigation failure; cache precision/memory improvements do not solve broad semantic relevance or preview selection.

Ixos's exact `grep -F quantize` locates the current cache helper and its call sites, then two bounded `read` calls verify the serializer and write-before-quantize pipeline. Raw responses and coordinates are retained. The four outputs total 2694 stdout tokens plus 351 diagnostic tokens (3045 total using cl100k_base/tiktoken 0.12.0); tool-call input is not included in that output subtotal. The defect was already understood when this trace was performed; this is not a blind autonomous debugging benchmark. Follow-up lexical/read commands remain useful within the unified CLI, and general semantic retrieval still requires broader agent-task evaluation.

KEEP the single round-trip and automatic recipe invalidation. Gate 12 memory/latency claims remain on its earlier binary; this correctness gate does not infer new performance numbers. Remaining priorities are realistic agent/session/no-answer/dense-document and resource validation, native Mac/desktop integration and public-history preparation. No public push, history rewrite, training, release, remote CI or model upload occurred.
