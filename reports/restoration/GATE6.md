# Gate 6 — native platform proof and cumulative evidence

October 11, 2026. Gates 4/5 are `61b43e7` / `298088f`. The Gate 3 model/search recipes and original held-out results remain frozen. This gate repairs Windows metadata behavior, checks the CLI on Linux, and evaluates two bounded navigation schedules without choosing new production defaults.

## Native source and cache behavior

An exported `298088f` source archive was built on Ubuntu 24.04/WSL, x86-64, ext4. Rustup 1.28.2 was downloaded from its official versioned URL and checked against its published SHA256; Rust 1.92.0, Cargo registry and all application directories were isolated under `/home/thunderboltdy/.cache/ixos-review-298088f-20261011`. The code parent was independently downloaded and transformed from pinned public files. The previously independently prepared document model was copied and every expected file hash/runtime fingerprint verified. No global Rust configuration or other WSL project was changed.

The first source build returned success under `/tmp`, but WSL cleared that directory on restart before detailed receipts could be collected. It is not used as detailed reproduction proof. The persistent repeat passed. Core tests then exposed a stale legacy Qwen missing-artifact test expectation, masked on Windows by an installed old artifact. Correct the test to describe the actual legacy alias and lazy constructor. An initial test-repair compile referenced a nonexistent field; the Windows compiler failure is retained. A Linux retry overwrote that intermediate compiler log; its original missing-model failure and final successful run remain retained. Do not count either failed run as passing.

Updated Rust files and the portable probe were copied into the isolated source tree; the final source build/test/probe/package commands ran there. All115 core Rust/manifest/catalog identities match current source after declared CRLF/LF normalization, with actual byte hashes retained in [the native source receipt](gate6/native-source.json). Final Linux executable SHA256: `d3591c6110aac9a86929cce73aa3efdc74a8e47fb712e7c30d0d8c2d3e79726d`. Final Windows executable: `21e9b3fd1aee11b6308f3f2de4344ccf2a0081bb264dbb9ec93d40a729318eee`. These different platform binaries are not the frozen Gate 3 timing binary.

| Verification | Windows | Linux/WSL ext4 |
|---|---|---|
| Core unit tests | 532 pass, 6 ignored | 530 pass, 6 ignored |
| Settings matrix | 48 combinations pass | 48 combinations pass |
| Desktop tests | 16 pass | Not run; this is core CLI proof |
| Doc tests | 13 pass, 2 ignored | Not part of this core-only command |
| Actual-model cache/source/protocol probes | 9 pass | 9 pass |
| Actual-model profile/config probes | 8 pass, including frozen-fixture equality | 8 pass |
| Evaluator contracts | 87 pass, one Windows symlink skip | Python evaluator suite not rerun here |

Linux probes show actual `nativeCacheHits=1` on the second long-source query and after rename, zero re-embedded passages when warm, recomputation after an equal-length edit, and application-DB hits after a read-only source rejects native writes. Unicode directory/file names and source content work, malformed JSONL requests do not kill the next request, stale feedback is rejected, and no adjacent files appear. These are authored contracts, not relevance labels or low-resource performance claims. The extracted model-free Linux package also runs successfully.

Receipts: [Linux initial failure](gate6/linux/core-tests.stdout), [final tests](gate6/linux/core-tests-final.stdout), [native probes](gate6/linux/native-contract-final.json), [profiles](gate6/linux/profile-contract-final.json), [package](gate6/linux/package.stdout), [Windows final tests](gate6/windows/workspace-tests-corrected.stdout), [Windows native probes](gate6/windows/windows-native-contract-corrected.json), [profiles](gate6/windows/windows-profile-contract.json), [evaluator](gate6/windows/eval-tests-current.stderr). A second [reviewed Linux package](gate6/linux/package-reviewed.stdout) includes the latest architecture/CLI/skill text and passes actual-model search plus leading-hyphen grep syntax; no weights are bundled. Exact bootstrap/refresh commands are captured under `gate6/`. The first Windows attempt had a linker output-file error; the single-job retry and subsequent full run passed without changing implementation for that failure.

## Windows modification-time correction

The enhanced real-model probe showed that `std::fs::write` to an ADS changes the primary file's modification time although primary bytes stay identical. That can cause unnecessary rebuilds or watcher activity. Windows streams [share primary timestamps](https://learn.microsoft.com/en-us/windows/win32/fileio/file-streams).

The shared helper in `src/storage/ads_windows.rs` opens the existing primary first, holds it against rename/delete during the short write, opens the cache stream without truncation, and calls [`SetFileTime` with the handle-local suppression sentinel](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-setfiletime) **before** truncation/write. Deletion uses the configured stream handle and disposition API. It never saves/restores an old timestamp across a write. The current document record, retained embedding cache and retained personal signals all use this helper. Failed native writes retain application-cache fallback.

| Same primary-file property | Original Windows writer | Corrected writer |
|---|---|---|
| Primary bytes | Preserved | Preserved |
| Modification time after warm record creation | Changed | Preserved |
| Record replacement/deletion | Ordinary stream operations | Preserve primary modification time in regression |
| Concurrent primary edit while cache handle is open | No restoration protection tested | Its edited bytes/timestamp survive |
| Missing primary at cache-write entry | Could create it through stream creation | Fails, leaves no primary/adjacent file |

The [baseline metadata receipt](gate6/windows/windows-native-contract.json), [focused API probe](gate6/windows/ads-time-probe.stdout), [missing-primary baseline](gate6/windows/missing-primary-baseline.stdout), three new Windows regressions and final actual-model probe establish the change. Ordinary named-stream creation on an absent primary produced an empty primary in the controlled baseline; the corrected helper rejects it. This does not promise invisible filesystem updates: stream changes can still produce events, and Linux xattr writes change ctime while preserving mtime. No timestamp restoration is used to hide a primary edit.

An actual own-code query, “how cache metadata writes preserve the original file modification time”, returns `storage/ads_windows.rs` first. Exact grep verifies `SetFileTime`. A final native-warm query has **112/112 actual native hits, zero passages recomputed**, with every primary source byte and modification time unchanged. The first native call can reuse existing records; it is not labeled cold. [Own-source receipt](gate6/windows/own-source.json). This is an authored navigation/cache check, not independent task gold or a controlled speed comparison.

## Multi-call development pilot

`eval/trajectory.py` supplies only issue text and returned observations to the follow-up policy. Gold scores the completed sequence, never chooses a path/range, supplies feedback or stops the run. `eval/trajectory_run.py` validates every displayed view against exact source lines, unions all cumulative ranges, records duplicates, charges canonical request/stdout/stderr tokens, and retains actual raw calls. All source/model identities are checked before/after. [Protocol](../../docs/evaluation/TRAJECTORIES.md).

The original eight ContextBench **development** tasks remain fixed, including the explicit upstream-compatible EOF policy and content-mismatch caveats. Four initial methods—actual hybrid JIT CLI, actual lexical CLI, prepared BM25, ranked rg—share the same model-free Ixos read/grep follow-ups. This compares initial retrieval under a fixed navigation policy, not full products/agents. Maximum seven calls and 6,000 bytes per response. The first attempt failed when the adapter passed a literal `--repo` as a CLI option. Use an argument separator with positional values; preserve the failed attempt without counting its one completed task. The CLI guide/skill now include this syntax.

The completed first schedule reads three ranked results, optionally greps the first qualifying inline-backtick cue, and reads up to two grep anchors. The development A/B instead reads six initial results and omits cue grep, with the same seven-call ceiling. It was proposed after inspecting the first pilot; neither schedule is selected as a production default. Both completed all 32 trajectories, with no invalid displayed evidence. The 64 trajectories are still **eight unique tasks**, not 64 independent samples.

| Initial method / navigation | Initial line recall | Cumulative line recall | Cumulative precision | Mean calls | Stdout tokens | Stderr tokens | Request tokens | Mean tool time |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Hybrid / three-plus-cue | 0.00868 | 0.08646 | 0.10849 | 4.5 | 3,481.1 | 342.3 | 231.5 | 614.4 ms |
| Lexical / three-plus-cue | 0.00805 | 0.08974 | 0.09864 | 4.5 | 3,508.0 | 299.0 | 233.4 | 303.5 ms |
| Prepared BM25 / three-plus-cue | 0.00805 | 0.08974 | 0.09864 | 4.5 | 3,538.0 | 0 | 233.4 | 197.1 ms |
| Ranked rg / three-plus-cue | 0.00758 | 0.02898 | 0.04594 | 4.5 | 3,808.9 | 0 | 230.4 | 335.8 ms |
| Hybrid / six reads | 0.00868 | 0.09885 | 0.08743 | 7 | 5,059.8 | 342.8 | 303.5 | 708.0 ms |
| Lexical / six reads | 0.00805 | 0.10303 | 0.09747 | 7 | 5,273.6 | 299.3 | 303.3 | 375.8 ms |
| Prepared BM25 / six reads | 0.00805 | 0.09821 | 0.08507 | 7 | 5,308.1 | 0 | 303.3 | 292.6 ms |
| Ranked rg / six reads | 0.00758 | 0.04137 | 0.04658 | 7 | 5,644.8 | 0 | 304.9 | 428.9 ms |

Tool time excludes source preparation/controller validation/logging/LLM reasoning. Prepared BM25 additionally reports about 127 ms corpus preparation per task in the first pilot. Every follow-up uses fresh CLI processes; these are not resident/native-warm timing trials. Diagnostic stderr is charged; canonical request JSON is a shared proxy rather than a vendor's full wrapper. Whole-file annotations and mismatched captured content make overlap a limited evidence metric, not proven usefulness or coding success.

Hybrid minus lexical cumulative recall is -0.00328 (paired 95% interval [-0.03653, +0.02542]) in the first pilot. Its +0.05748 difference against ranked rg also has an interval crossing zero. In the second policy most differences occur in only one task; zero is on the interval boundary for some paired comparisons. No significance/product-generalization claim follows from those eight inspected tasks. [Aggregates and paired differences](gate6/trajectory-comparison.json), [first commands](gate6/trajectory-v2/commands.json), [A/B commands](gate6/trajectory-top6-v1/commands.json). Source/binary/wire snapshots remain ignored under `models/lab/restoration/contextbench-trajectories-*`.

## What the failures tell us

More reading improves coverage at a real context cost, but **the same four tasks have no annotated overlap with hybrid in both schedules**. Six reads add about 1,579 stdout tokens for +1.24 percentage points mean coverage and reduce precision. The fixed policy has diminishing returns; it is not justified as a new default.

- Pytest's annotated implementation file is absent from the top ten. This is a retrieval/query problem, not something bigger read windows can repair.
- Clap's `src/parse/validator.rs` is rank five, but the shown/read anchor covers lines35–95; the annotation is400–501. The six-read policy reaches the right file but the wrong region.
- CodeServer's two annotated files appear in the results, but the reads miss their annotated ranges. Ranking files is not enough to locate evidence within them.
- Ranked rg reaches some annotated CodeServer lines only on a subsequent read. A semantic ranking win cannot be assumed to dominate every exact/navigation case.

Next targeted experiments should compare query construction and evidence location separately: use the winning semantic representative's existing locator, combine local lexical anchors with representative candidates, and consider bounded symbol/function expansion. Preserve the current recipe/baselines, charge all extra context, keep negative examples and test fresh repository families before selecting defaults. A blind real-agent trajectory remains a separate evaluation layer; this deterministic pilot does not replace it.

Native Mac testing remains deferred. Provider credential revocation/rotation and a reviewed history-remediation plan still precede publishing. No push, rewrite, remote CI dispatch, release, deployment or model training occurred.
