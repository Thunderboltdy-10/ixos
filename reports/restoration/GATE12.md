# Gate 12 — owned encoded model rows

The current Rust CLI now retains encoded safetensors rows and decodes the rows actually used by each input. Selected code/document vectors match the eager reference exactly, while measured startup, fresh-call latency and model memory improve on Windows and native Linux/WSL. No weights, selected representations, file ranking formula, persistent payload format or user defaults changed. The public/desktop reference loader remains available.

## Protocol and numerical contract

`gate12/protocol-v1.json` was written before implementing the candidate, against Gate 11 commit `7c9cb46`. This is a performance/equivalence study with no relevance labels, training or tuning on consumed held-out results. Both measured bridge arms use the same executable. CLI arms use the preserved Gate 11 control and current implementation. Exact command lines, source/artifact/binary identities and raw responses are retained.

The fixed input is Gate 11's independent source export: 113 Rust files, 1,610,853 bytes. The bridge splits normalized text into 925 fixed 1,800-character chunks, then also embeds empty, Unicode, multilingual, code, query and long document inputs, with uncapped and explicitly capped variants. It checks 1,865 vectors per process, every F32 bit rather than cosine tolerance. Windows also checks the original pre-change bridge. One warm-up per arm precedes five measured alternating fresh processes per model. Linux repeats the same inputs on ext4; the models are actual pinned artifacts, not stubs.

Six Rust contracts check F32/F16/I8 rows, optional F16/F32/F64 weights, remapping, normalization, unknown tokens, API limits, inherited truncation/padding and different batch sizes against `model2vec-rs 0.1.4`; model ownership after deleting fixture files; invalid tensors/token rows; configured padding IDs; and every finite F16 value plus an unaligned scalar fallback. Metadata, dimensions and fingerprints also agree. The original artifact-fingerprint domain can therefore remain compatible for these supported models/input rules.

## Implementation and rejected attempt

`src/ixos_embed/encoded_model.rs` owns the safetensors allocation. It retains validated tensor ranges, tokenizer and optional token weights/remapping, and decodes used rows into F32 for the original pooling algorithm. No model file is memory mapped; it can be removed after construction without invalidating live model data. No unsafe code or handwritten assembly was added to this loader. F16 conversion uses the existing `half` library's checked slice conversion on aligned little-endian data, with scalar fallback. All accumulation and normalization remain F32, including I8 storage rows.

The initial scalar F16 prototype reduced memory but made the fixed code batch about 38% slower (180.553 → 248.873 ms). Its binary, source snapshot and receipts remain preserved. The SIMD variant removed that regression. A third variant releases duplicated metadata/vocabulary allocations before loading the model; it preserves exact vectors and lowers startup/peak memory further. These are measured implementation changes, not distillation or new model generations.

Windows final bridge medians:

| Model | Eager → encoded load | Ready working set | Peak working set | 925-chunk uncapped inference |
|---|---:|---:|---:|---:|
| code | 187.975 → 129.099 ms | 83.547 → 52.207 MiB | 126.875 → 82.164 MiB | 167.581 → 119.999 ms |
| documents | 180.083 → 129.450 ms | 144.027 → 51.785 MiB | 188.129 → 82.738 MiB | 252.124 → 127.663 ms |

Single-query timings are tiny and do not establish a universal speedup: code query median rose from .0721 to .0756 ms in this bridge run. Model-only bridge memory excludes source preparation. `encoded-comparison-v1/v2/v3.json` retain all repetitions and negative results; final bridge source/binary snapshot distinguishes the subsequent attribution-comment changes.

## Actual CLI costs and output

`scripts/compare_cli_loaders.py` uses the same fixed source, query, isolated TOML, selected model, four I/O workers and 6,000-byte output budget. Each condition has an unmeasured warm-up per arm and five alternating measured processes. Resident JIT has one fill and ten identical warm calls per process; the reported warm value is the median of those per-process medians. Fresh native warm requires actual native hits and zero document embeddings; resident warm requires RAM hits and zero document embeddings. Source bytes/mtime and ordinary adjacent file inventory are checked after all calls.

| Platform / model | Fresh JIT wall | Fresh native warm wall | Resident startup | Resident warm | Prepared-session memory |
|---|---:|---:|---:|---:|---:|
| Windows code | 378.266 → 290.800 ms | 292.118 → 224.534 ms | 205.112 → 150.289 ms | 15.201 → 15.537 ms | 103.758 → 73.211 MiB |
| Windows documents | 555.094 → 379.949 ms | 273.428 → 222.855 ms | 199.196 → 151.425 ms | 15.634 → 15.630 ms | 166.613 → 73.914 MiB |
| Linux code | 410.179 → 304.268 ms | 329.379 → 254.974 ms | 255.463 → 181.890 ms | 12.349 → 12.250 ms | 141.531 → 102.508 MiB |
| Linux documents | 645.573 → 389.225 ms | 358.047 → 250.407 ms | 267.653 → 178.038 ms | 12.312 → 12.282 ms | 251.629 → 152.883 MiB |

Windows memory is sampled working set; Linux is `/proc/PID/status` VmRSS. They differ in OS allocation/accounting and are not directly interchangeable. This is the same Ryzen 7 5800X host, warm OS/toolchain/model files, not weak hardware, bare-metal Linux or Mac proof. Startup and fill are separate; tiny resident timing differences are not a new warm-query speed claim. An earlier single cold-executable startup outlier (~783 ms) is retained but excluded from the paired speed comparisons. No concurrent model benchmark/compiler ran during the numerical comparisons.

All returned JSON fields, paths, scores and views agree exactly between the two loaders **within each cache condition**. The study uncovered an existing JIT/native discrepancy: old and new loaders both show roughly 1e-7 score differences after a native record read, while paths/views match on this probe. Encoding already normalized quantized RAM vectors quantizes them a second time. First helper versions intentionally failed their stronger cross-condition equality check; raw failures and helper snapshots remain retained. The final helper exposes cross-condition hashes and still requires exact loader equality; it does not use rounding tolerance. Correct this separately with a single serialization round-trip and recipe invalidation, rather than misattributing it to the new loader.

## Verification and provenance

Windows full workspace: 544 core, 16 desktop, settings matrix and 13 doc tests pass; six core/two doc existing ignored. Linux release core: 542 pass, six ignored, settings matrix passes. Actual query notation, bounded evidence/native payload, source edit/rename/fallback/feedback and profile contracts pass on both platforms. Windows also agrees with the original frozen Gate 3 binary on its existing authored profile fixture; this is not a rerun or retuning of held-out quality.

Current Windows CLI SHA256: `e18e80ce862896379491630d7476bf6e036f675a16aea6cec995fc82468bcdaf`. Preserved control: `102b39ead184122c8e37d4e3414ef091084985f5fe96e58e3b171081df13c496`. Native Linux CLI: `33e5ca0123ccd3c12483b3c43283b8280425a0a13eddc862403bbd2f6e12a738`; its preserved control is identified in `linux/control-sha256.txt`. Bridge identities and exact model files/fingerprints are in the comparison receipts. Direct safetensors/tokenizers/bytemuck versions reuse already locked dependency versions; no package upgrade occurred.

Raw source/runtime and local package checks live in `gate12/source-package/`; Linux test/model/CLI receipts in `gate12/linux/`; original Windows failures in `gate12/cli-costs*`. The new loader follows MinishLab's pooling semantics, and the upstream MIT notice is included in `docs/licenses/model2vec-rs-MIT.txt` and the package manifest. Minimal packages do not bundle weights, reports, envs or private records. Source exports reuse existing dependency/toolchain caches; they are not clean OS verification.

KEEP the encoded loader for the current CLI and retain eager reference construction for comparisons/legacy compatibility. Disk model sizes and 2375-byte code / 643-byte document native records are unchanged. No embedding sidecars are introduced. Frozen Gate 10 evaluator/recipes remain byte-preserved. Remaining work includes the observed cache rounding issue, realistic agent/session/no-answer/dense-corpus and weak-device validation, native Mac and desktop integration. No public push, history rewrite, remote CI dispatch, release or model upload occurred; historical credential revocation and reviewed remediation remain publication prerequisites.
