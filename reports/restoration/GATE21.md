# Gate 21 — optional bounded grep diversity

An explicit per-file match cap prevents repeated hits in one file from occupying an entire compact grep response. Defaults and the existing `grep` API remain unchanged. On the preserved Docker diagnostic, cap 1 exposes five files instead of one and uses 370 stdout tokens instead of 407; this is a response-budget improvement, not a measured bug-resolution gain.

## Baseline and implementation

[Protocol](gate21/protocol.json) and [baseline](gate21/baseline.json) precede edits. The original `tty|attach_socket` regex, context 2 / limit 5 / 6,000 bytes, returns five overlapping rows from `compose/cli/formatter.py`, despite 19 matching lines across the original source corpus. This consumes the current compact result limit without displaying other files.

`grep --max-matches-per-file N` and resident `"max_matches_per_file":N` accept 1–10,000. Omitted/null preserves existing path/line ordering and within-file results up to the global limit/budget. The new helper retains at most `min(global_limit, cap)` match coordinates per file while still scanning every eligible source and counting every matching line. It adds no model, semantic ranking, persisted setting or sidecar. A cap can hide a useful later line inside a file; use uncapped inspection when that is the task.

With a cap, diagnostics add `maxMatchesPerFile` and `matchesSuppressedByFileCap`. Suppression counts matching lines beyond each file's cap, including lines also omitted by the global output limit. Existing `matchingLines`, ignored-source rules, byte fallback, `truncated` and model-free behavior remain intact. The legacy helper delegates with no cap, preserving callers.

## Recorded result and cost

Seven fresh processes per arm/OS alternate original and current binaries; two warmups per arm are excluded from descriptive medians. Compilation and model probes finish before timing begins. This is one consumed task diagnostic, **not** seven independently labeled tasks or a new relevance evaluation.

| Arm | Distinct files / five rows | Stdout tokens | Output bytes | Total matches / cap-suppressed |
|---|---:|---:|---:|---:|
| Original | 1 | 407 | 1,354 | 19 / 0 |
| Current default | 1 | 407 | 1,354 | 19 / 0 |
| Cap 1 | 5 | 370 | 1,401 | 19 / 11 |
| Cap 2 | 3 | 387 | 1,429 | 19 / 7 |

Tokens use cl100k_base. Cap 1 saves 37 stdout tokens while adding 47 bytes; smaller token cost does not imply smaller serialized JSON. Result diversity does not guarantee relevance: `prettydate` still matches the deliberately broad `tty` regex. No default cap is selected from this single case.

| Arm | Windows fresh process / grep phase median ms | Linux fresh process / grep phase median ms |
|---|---:|---:|
| Original | 52.209 / 19.822 | 10.211 / 4.427 |
| Current default | 51.277 / 19.174 | 9.855 / 4.405 |
| Cap 1 | 55.440 / 20.546 | 10.042 / 4.312 |
| Cap 2 | 61.122 / 19.481 | 10.021 / 4.332 |

Five post-warmup samples/arm on the same Ryzen 7 5800X Windows/WSL host do not establish a throughput improvement, native ripgrep parity or worst-device behavior. Process time includes startup; phase time includes the actual grep scan. Default outputs match their original control bytes in every run. All 28 corresponding platform stdout records also match exactly. Linux originally records token fields as null because its Python lacks a tokenizer; [audit](gate21/audit.json) independently scores its preserved bytes on Windows instead of reporting unavailable values as zero.

## Correctness and platform checks

Two meaningful engine regressions verify repeated-file distribution, total matching counts, ignore rules, exact Unicode evidence, invalid cap bounds, byte limits and long-line file-only fallback. Windows full workspace: **549 core, 16 desktop, settings matrix, 13 doc tests pass**, with six core/two doc tests ignored. Linux core: **547 pass**, six ignored, plus settings matrix. Eight actual code/document profile contracts per OS still match the previous binary and preserve source/cache/config behavior.

The real CLI probe exercises one resident capped request, invalid zero/large/type requests, then a successful default request and explicit null override, plus no-match behavior. Invalid requests do not kill the session or persist the cap. Standalone invalid caps return nonzero without successful stdout. Sources retain exact bytes/mtime and ordinary-file inventory. The archived 127-file native corpus matches the original source inventory. All **118** normalized core/manifests/catalog files agree between platforms; frozen evaluator hash remains `95afba09dd7c77e0fc56ed4e922d508116f701bb679f52c0844ed7725fc14297`. Skill validation passes.

Control binaries: Windows `7aab8d7d627e98f190e3af2519b4b520722d9d23663d377bc496a3e6b4ed1418`; Linux `b3c9427f211ec0adb15ef043da27d7975db2eb9a1ff23d278e0afe268a5a4f41`. Current: Windows `7aefee83a857f0592be6e320abe8729655ce2f35b2f18f3e9cc1204c96fb4c6f`; Linux `0149c3451680283b5301178bdab807ab41a562719cc150bebbef9bdc9eee4a9e`. Selected model artifacts/defaults are unchanged. Older local packages retain their original binary identities.

## Retained failures and recipes

The first Linux full-workspace command attempted the desktop and failed because this WSL environment lacks pkg-config/native GUI build dependencies. Its output is preserved; scoped engine/settings checks and the release build subsequently pass. The first helper script's final tar command included a Windows CR and failed to find the extraction directory; an explicit LF command completed the transfer without rebuilding or hiding the failure. The initial Windows probe assumed stderr was one JSON document and rejected verbose missing-config logging. Its exception output is retained; the corrected probe uses an existing empty isolated config and parses the final stats record while preserving complete raw stderr. These are harness/environment failures, not removed benchmark rows.

```powershell
cargo test --workspace --locked --jobs 2
cargo build --release --locked --bin ixos
python reports/restoration/gate21/probe.py --binary target/release/ixos.exe --control .tmp/gate21/control-ixos.exe --source .tmp/gate20/data/sources/C01 --output reports/local-grep-cap/windows
python scripts/verify_restored_cli.py --binary target/release/ixos.exe --code-model .tmp/gate4/reviewer-models/potion-code-16M-v2-unbounded --documents-model .tmp/gate4/reviewer-models/potion-retrieval-32M-row-int8 --frozen-binary .tmp/gate21/control-ixos.exe --output reports/local-grep-cap/profiles.json
python reports/restoration/gate21/audit.py
```

Native Linux uses scoped `cargo test -p ixos-protocol --lib --locked --jobs 2`, settings matrix and release build. [Native probe recipe](gate21/probe-linux.sh) records the isolated paths/environment and `--no-tokenizer`; the raw original compiler/probe outputs remain under `gate21/linux/`. All probe output paths must be new. Source/model setup is covered by the earlier installation/task guides; source excerpts retain Gate 20's notices. No model training, defaults promotion, publication or history rewrite occurred. Keep this opt-in operation and continue with stronger test-backed tasks and explicit evidence/session experiments.
