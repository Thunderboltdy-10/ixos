# Gate 24 — executable benchmark controls and development-data limits

The official local SWE-bench runner now executes a verified negative/positive control: the original code fails all 23 regression tests; the upstream reference fix passes them, while 145 existing tests pass in both conditions. This establishes the runner's environment and grading behavior. **It is not an Ixos-generated fix, retrieval gain or agent resolved-task score.** Production source, models, defaults and the previously measured engine binaries are unchanged.

## Data availability and exclusions

The [prospective protocol](gate24/protocol.json) first checks executable labels without showing actor tasks or reference content. The pinned original training parquet has **19,008 rows and zero nonempty `test_patch`, `FAIL_TO_PASS` or `PASS_TO_PASS` fields**. This does not establish that upstream training fixes contain no tests; it establishes that these dedicated fields cannot directly supply the standard resolution benchmark. Gate 20's earlier diagnoses remain source-localization observations.

The original official dev split has 225 rows, all with test patches and failing-test labels, 184 with passing-test labels. Every row belongs to one of the six repository families prospectively excluded in Gate 20 after the dataset viewer exposed reference excerpts. No fresh actor candidates remain. The official evaluation guide additionally displays a Sympy solution example, so that family is excluded too. The exclusions are preserved rather than weakened to obtain a score.

[Selection metadata](gate24/selection.json) materializes only an already-excluded lightweight marshmallow environment control. Within that repository, selection uses the first instance by SHA256 ID, without difficulty/solution inspection. The original first selection attempt assumed Sympy existed in dev and failed; its script and traceback remain. New actor problem/reference/test content was not displayed. Metadata-only checks of multilingual and Pro sources find test-only files; those test splits were not downloaded or relabeled as development data.

## Pinned runtime and real controls

The existing local WSL Docker engine is 29.1.3/Linux. Native `python3 -m venv` first failed because ensurepip/python3.12-venv was unavailable. A separately downloaded **uv0.13.0** binary was verified against its official release digest before execution; its isolated venv installs 75 packages from a generated SHA256 hash lock. No system Python/apt/global environment changes, cloud execution or paid API calls are used.

The official harness is pinned to commit `02e7a74ffd0b707aab73d203fe87bdc7c76afc8e` (package5.0.2). Its newer schema expects image/evaluation fields absent from the original dataset revision. The canonical official dataset at `c6fe717fd7a4c3ac1daa4055a4fd082c6a1d28a2` provides them. Only canonical dev is fetched; the excluded control's original instance/repository/base commit/problem/reference/test patch bytes are verified against the old row before execution. No unofficial schema shim or modified evaluator is used.

| Bound input | Identity |
|---|---|
| Original train parquet | `0ba403a7060af657e1f0476937a703726c07da15b759836694b16e553705a10f` |
| Original dev parquet | `d758d54540aa4140d0274ed0cc93b8288aa6f323c3c603e2557e7666a47fc41b` |
| Canonical dev parquet | `7812438935be9cbe36049b93c73412d523fb07251bd255813168c38c5fc92454` |
| Harness source archive | `d06181d5365b51fc7ff490171581b9ee87d77e19b3a739a8d574bf25d9ef9479` |
| Verified uv release archive | `b0828fc4cdc47d65951e94b5f0a15a5364420e8dcd88723f3b21e7a2eb30bbc3` |
| Excluded control | `marshmallow-code__marshmallow-2123`, base `5a10e83c557d2ee97799c2b85bec49fc90381656` |
| Docker image | `swebench/sweb.eval.x86_64.marshmallow-code_1776_marshmallow-2123@sha256:9da3669fe99dede23ecf75b8f5b50198d304808f51c9ba828ac26c9eaab3163f` |

The image is amd64/Linux, 1,013,638,656 reported bytes. Its immutable RepoDigest replaces the mutable tag in the actual control input. The harness normally skips an empty prediction patch; the base arm therefore adds a harmless new marker file only inside its disposable benchmark container. It changes no application/test behavior. The gold arm uses the original upstream reference patch. Each arm has its own run ID to avoid reusing cached results.

| Actual test result | Original behavior + marker | Upstream reference fix |
|---|---:|---:|
| Regression tests pass / fail |0 /23|23 /0|
| Existing tests pass / fail |145 /0|145 /0|
| Official resolved flag |false|true|
| Infrastructure/error/empty-patch outcomes |0|0|

Both containers are removed by the harness; no unrelated containers/images are pruned. Raw test stdout, reports, evaluation scripts, applied patches, runner logs, environment lock/install receipts and exact recipes are retained under [gate24/linux](gate24/linux/). These controls are excluded from future actor evaluation. Test durations are runner sanity observations, not Ixos search latency or throughput measurements.

## Verification, attribution and decision

[Independent audit](gate24/audit.json) verifies raw capture hashes, identical regression/passing test sets, identical evaluation scripts, actual exit codes, pinned control/image/marker identities, preserved exclusions and all119 unchanged normalized engine/manifests/catalog files. Windows and native Linux executables retain Gate23 SHA256 identities; frozen evaluator aggregate remains `95afba09dd7c77e0fc56ed4e922d508116f701bb679f52c0844ed7725fc14297`. No new Rust test run is asserted for this preparation-only change. Existing Gate23 correctness/model results retain their original scope, including deferred Mac execution.

Capture V1 incorrectly assumed the canonical dataset card included a license field; it failed when that metadata was absent. The corrected capture records null rather than inventing a dataset license. Audit V1 referenced an incorrect aggregate key; the helper/traceback remain. Sources and reference excerpts retain [upstream notices](gate24/ATTRIBUTION.md); complete dataset/model/source downloads remain ignored.

The staged whitespace check passes for authored files. Six exact upstream raw files (both `eval.sh`, both `test_output.txt`, and the gold `patch.diff`/`run_instance.log`) retain their original trailing spaces and are excluded from that check; their complete byte hashes are verified by the capture audit. Runner `.log` files are staged explicitly because the repository's general log ignore rule applies to them.

```powershell
# Original research paths are recorded in the scripts; use a fresh run ID/workspace
# for new patches. The recipes require the separately downloaded pinned inputs.
wsl -d Ubuntu-24.04 -- bash /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate24/setup-linux.sh
wsl -d Ubuntu-24.04 -- bash /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate24/smoke-linux.sh
python reports/restoration/gate24/capture.py
python reports/restoration/gate24/audit.py
```

**KEEP:** pinned local executable negative/positive controls and their failures. **DO NOT PROMOTE:** a solved-agent benchmark score, stronger session defaults or claims against commercial context engines. Next, inspect training patch/test availability through aggregate-only parsing or find another legitimate development source, then validate fresh ordered-task feedback comparisons. Official held-out recipes and test splits stay reserved; no tuning from exposed solutions, public push, history rewrite or release.
