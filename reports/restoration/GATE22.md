# Gate 22 — visible JSONL responses before session updates

A search rejected for exceeding the outer response budget could still enter feedback history. A rejected reset could clear that history. The CLI now accounts for the JSON-escaped request ID before either operation runs, so a hidden result cannot supply feedback to the next search. Ordinary-ID responses preserve their previous bytes.

## Reproduction and change

[Prospective protocol](gate22/protocol.json) and [initial actual-model witness](gate22/baseline.json) precede the change. A request ID may contain up to 256 UTF-8 bytes, but 256 NUL characters serialize to 1,538 JSON bytes. The fixed 300-byte reservation did not cover that expansion. At a 512-byte output limit the original CLI searched, remembered the results, then replaced its oversized response with an error. Accepting index zero from that unseen response on the next ordinary query reported `feedbackConsumed:true`. The reset variant destroyed an earlier visible search's history before its response was rejected.

`src/retrieval/commands.rs` calculates insertion overhead as the serialized ID value plus six bytes for the object field/comma. It rejects requests that cannot fit a minimal payload before search/reset changes session state. Otherwise the effective inner budget is the smaller of the previous reservation and the space remaining after the actual ID overhead. Search restores its normal budget on success and error; read/grep use the same effective payload bound. No model, score weight, history limit or default output size changes. IDs should be unique within active task history to distinguish earlier successful responses from failed requests.

| Authored contract, both actual parents | Original | Current |
|---|---|---|
| Rejected search followed by acceptance of its unseen row | Feedback consumed | Feedback ignored |
| Visible seed, rejected reset, acceptance of seed | Seed forgotten | Seed retained |
| Valid 256-NUL ID with a 6,000-byte budget | Outer error after searching | Visible, bounded results |
| Ordinary-ID output | Control | Exact control bytes |
| Escaped-ID read/grep and restored budget after errors | Captured | Bounded and session recoverable |

The new Rust regression covers escape arithmetic and real serialization for NUL, quote, backslash, ASCII, multibyte Unicode and emoji IDs. The actual-model probe also checks invalid enum and empty-query errors, source bytes/mtime and ordinary-file inventory. It does not turn authored cases into independent relevance labels or use their diagnostic durations as a latency benchmark.

## Verification and identities

Windows workspace checks pass **550 core tests, 16 desktop tests, settings matrix and 13 doc tests**; six core/two doc tests remain ignored. Native Linux core checks pass **548 tests**, six ignored, plus settings matrix and release build. Both pinned parents are actually loaded: code fingerprint `835fb9be0368efb6a64fd54039d4e79100add78ac50e2dc219daca32a62f5972`; documents `6966e61ba93fe416b36af3190469553e7c5447c8e3675ec034d4ee7ec0223f88`.

Each platform runs 18 final sequences: nine contracts for each parent, 46 main requests and four standalone/control requests in 22 processes. All 18 corresponding stdout sequences match **exact bytes** across Windows/native Linux; every serialized response fits its advertised budget. Sources remain unchanged, all **118** normalized core/manifests/catalog files match between platforms, the agent skill validates, and the frozen evaluator aggregate remains `95afba09dd7c77e0fc56ed4e922d508116f701bb679f52c0844ed7725fc14297`. [Audit](gate22/audit.json) binds the helper versions, models, raw outputs and current binaries.

| Platform | Original G21 control SHA256 | Current SHA256 |
|---|---|---|
| Windows | `7aefee83a857f0592be6e320abe8729655ce2f35b2f18f3e9cc1204c96fb4c6f` | `3cced96ba3f8210ee92062543ebb6dcb297e9a703be509d18c33d238518a83b3` |
| Linux | `0149c3451680283b5301178bdab807ab41a562719cc150bebbef9bdc9eee4a9e` | `32cceb30d3a4439ba05dc4c807faa4294c9804a8fef68d0a8af6d854eb8bbb53` |

Native execution is on the existing isolated WSL/ext4 host, not a fresh operating system or Mac. Desktop Linux dependencies remain unavailable as recorded in Gate 21; these native checks cover the engine/settings. Older exported packages and minimum-compiler receipts retain their original binaries. CI now includes the probe in its real-model platform matrix; the YAML is validated locally, not remotely dispatched.

## Retained helper versions and recipes

The original V1 probe and its before receipts remain unchanged under `gate22/helpers/before-v1.py`, `gate22/before/` and `gate22/linux/before/`. V2 adds an empty-query failure after the request's temporary budget is applied; a malformed enum alone fails too early to check restoration. Final V2 receipts are `gate22/after-v2/` and `gate22/linux/after-v2/`, with its exact helper in `gate22/helpers/after-v2.py`. The first native V1 after-run is also retained. No test failure is concealed by replacing its original helper or output.

```powershell
cargo test --workspace --locked --jobs 2
cargo build --release --locked --bin ixos
python -m scripts.verify_jsonl_envelopes --binary target/release/ixos.exe --code-model .tmp/gate4/reviewer-models/potion-code-16M-v2-unbounded --documents-model .tmp/gate4/reviewer-models/potion-retrieval-32M-row-int8 --control .tmp/gate22/control-ixos.exe --output reports/local-envelopes/windows
python reports/restoration/gate22/audit.py
```

Probe output directories must be new. Use `--expect-bug` with the preserved old binary to reproduce the failure; use the exact V1 snapshot when recreating the original baseline. [First native recipe](gate22/linux.sh) records core/settings/build and V1 probes; [V2 native recipe](gate22/linux-v2.sh) records the final probe. Original stdout/stderr/requests and command arguments remain in the receipts. No training, quality retuning, default promotion, publication or history rewrite occurred. Proceed to explicit bounded inspection feedback, then fresh test-backed code tasks.
