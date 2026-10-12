# Gate 25 — executable synthetic training tasks for retrieval development

There is now a usable development source beyond the exhausted original SWE-bench dev split: **50,908 pinned SWE-smith Python training tasks**, each with failing-test labels and an image name. An excluded environment control verifies the official runner: two regression tests fail on corrupted code, both pass after the reference repair, and 671 other tests pass in both conditions. This validates one environment and the repair/grading direction. **No new Ixos actor task, retrieval gain or solved-task percentage is claimed.**

## Availability before scoring

The [prospective protocol](gate25/protocol.json) starts with aggregate-only inspection of original human SWE-bench training patches. Of19,008 rows,18,539 have nonempty patches;18,538 parse under the strict Git-header reader, one header is unsupported and469 patches are empty. No candidate Python test-path signal appears among parsed rows. The unsupported row stays unexamined; these heuristics do not establish that upstream projects contain no executable tests. Together with Gate24's empty dedicated test fields, this source cannot directly supply a standard patch-resolution benchmark.

Primary-source metadata/file-list discovery finds an official language-specific [SWE-smith Python training dataset](https://huggingface.co/datasets/SWE-bench/SWE-smith-py/tree/77cab9055d42ab4a5c25c89a8f937096db13558e). All11training shards are fetched at that revision and verified against their pinned LFS SHA256/size. Full data remains ignored. Aggregate inspection loads test/image/evaluation columns, without emitting individual task descriptions, paths, patches or expected tests. All50,908rows have FAIL_TO_PASS labels;50,432have PASS_TO_PASS labels. Independent audit verifies50,908nonempty `image_name` values. The first availability reader reports zero `image` values because that column does not exist in this older schema; this is distinct from `image_name` and does not mean the corpus lacks images.

These tasks synthesize bugs in real repositories. They are legitimate training/development inputs, with a different distribution from human issues and unknown parent-model pretraining overlap. They cannot be relabeled as human SWE-bench performance. No model training, task scoring or default selection has begun here. Official Live metadata is also checked; no Live task rows or official test split is downloaded or relabeled as development.

A search result accidentally shows an OAuthlib solution excerpt from a dataset viewer. Its canonical family and benchmark forks are excluded prospectively, in addition to all Gate24 exclusions. Only an already-excluded OAuthlib control is materialized, selected by first SHA256 instance ID across940metadata candidates. No fresh actor problem/reference content is emitted or actor tasks selected.

## Compatible official runner and real control

The pinned original SWE-smith schema uses `image_name` and repository profiles, rather than the new canonical SWE-bench v5image/eval-script fields. A separate native WSL venv installs the official SWE-smith source with its minimal validation dependencies plus local Docker/datasets and **swebench4.1.0**. The hash lock, installed versions and CLI help are retained. Gate24's v5environment stays unchanged. No unofficial grading shim, inference/generation extra, model API or cloud job is used.

| Identity | Value |
|---|---|
| Training dataset revision | `77cab9055d42ab4a5c25c89a8f937096db13558e` |
| SWE-smith source commit | `9b74ac08118a85c39c356802f7961893af73e07f` |
| Source archive SHA256 | `2e5b7930d3546680bfc63849e10675c8d90ecd95da60201d4c5817cf841a0469` |
| Excluded control | `oauthlib__oauthlib.1fd52536.func_basic__i6lxix6t` |
| Original source commit | `1fd5253630c03e3f12719dd8c13d43111f66a8d2` |
| Materialized control input SHA256 | `6fe065618096c2b82975bfaf05134888d07e32b166cfb6e9004fae52536d063e` |
| Image RepoDigest | `swebench/swesmith.x86_64.oauthlib_1776_oauthlib.1fd52536@sha256:fb7e947b29f9c1cfb58245f9f290e072827e577225469648e53139580d2471c9` |

All individual shard hashes/sizes are in [training input receipts](gate25/synthetic-training-inputs.json). The image is amd64/Linux,1,336,034,879reported bytes. The official profile invokes its normal locally pulled tag; exact image ID/RepoDigests/size are identical before and after both sequential controls. This is recorded image-content proof, rather than a claim that the runner's profile itself accepts a digest override.

SWE-smith's stored `patch` introduces corruption, so its gold repair **reverses** that patch. The official runner checks out the task branch and restores failing tests from the prior commit before execution. The base arm's harmless new marker changes no source/test behavior; the gold arm is an upstream reference reversal, not an Ixos-authored repair. Separate run IDs prevent cached-result reuse. Tests run through the upstream normal profile rather than a hand-selected reduced test subset.

| Actual result | Buggy code + marker | Reference reversal |
|---|---:|---:|
| Regression tests pass / fail |0 /2|2 /0|
| Other labeled tests pass / fail |671 /0|671 /0|
| Tests skipped |2|2|
| Official resolved flag |false|true|

Both containers are removed by the runner. Raw test stdout, grading reports, evaluation scripts, applied patches and runner/install logs remain under [gate25/linux](gate25/linux/). These controls test one excluded environment; other families still require their own source/environment validation before actor evaluation. Their durations are not Ixos latency measurements.

## Audit and next experiment

[Audit](gate25/audit.json) verifies captured bytes, all11shard hashes/sizes, exact regression/passing sets, skipped counts, identical eval scripts, removal logs, stable image contents, input/source bindings and environment version/help. All119normalized current engine/manifests/catalog files are unchanged and still match native Linux. Windows/Linux engine executables and frozen evaluator retain Gate23/Gate24 identities. No new engine tests, minimum-compiler/package/Mac proof or search performance numbers are asserted.

Initial source discovery resolves upstream main once, with its script and receipt retained. The supported replay helper requires an explicit40-character commit, replayed here at the same pinned source SHA with identical archive bytes. Availability scripts and originals remain bound in the audit. Complete data/source/runtime binaries stay excluded from Git; the actual probes use the isolated native cache workspace.

The staged whitespace check passes for authored files. The exact upstream gold `patch.diff` retains its original trailing spaces and is excluded from that check; its complete bytes remain verified by the capture audit. Both runner `.log` files are staged explicitly under the public receipt whitelist.

```powershell
# Python3.12 + pyarrow21.0.0. Downloaded data stays under ignored .tmp/.
python reports/restoration/gate25/fetch_synthetic_training.py
python reports/restoration/gate25/fetch_harness_source.py --commit 9b74ac08118a85c39c356802f7961893af73e07f
python reports/restoration/gate25/select_control.py
wsl -d Ubuntu-24.04 -- bash /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate25/setup-linux.sh
wsl -d Ubuntu-24.04 -- bash /mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate25/smoke-linux.sh
python reports/restoration/gate25/capture.py
python reports/restoration/gate25/audit.py
```

Use new native workspaces/run IDs for changed inputs; the checked-in shell recipes record original local research paths. Generated locks/raw receipts are immutable evidence, not additional product install requirements. Source/test excerpts retain [attribution and notices](gate25/ATTRIBUTION.md).

**KEEP:** pinned executable synthetic training source and verified excluded control. Next, freeze metadata-only family/task selection for ordered retrieval development, retain stateless/search-feedback/inspection-feedback and lexical controls, verify source/citation/budget contracts, then measure evidence discovery and actual complete-task costs. Wrong acceptance, reset/drift and no-answer limits must remain visible. Reserve fresh human/held-out tasks for the final frozen comparison; no stronger defaults, training or commercial superiority claim follows from these setup controls.
