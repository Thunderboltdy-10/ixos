# Release preparation

The source restoration is local. No public push, Git history rewrite, new binary release or model upload has been performed. The CLI and desktop remain one monorepo; automatic partial mirroring and Pro-module publication workflows are preserved inactive under `legacy/release-workflows/`.

## Runtime checks

Build/test on Windows, Linux and native macOS with actual pinned model artifacts. `engine-ci.yml` defines core/evaluation/model/cache/profile checks on all three OSes; it has not run on remote CI during this restoration. Mac desktop testing must include launch without signup, search with the selected model, progressive events, file open/reveal and multiple instances. Test ARM and x86 where supported; a cross-build is not native runtime proof.

```sh
cargo test --locked -p ixos-protocol --lib --bin ixos --test settings_matrix --jobs 2
cargo build --release --locked --bin ixos
python scripts/setup_models.py --profile all
python scripts/verify_retrieval_engine.py --binary PATH --model CODE_MODEL --output RECEIPT.json
python scripts/verify_restored_cli.py --binary PATH --code-model CODE_MODEL --documents-model DOC_MODEL --output RECEIPT.json
python scripts/verify_evidence_policy.py --binary PATH --model CODE_MODEL --output NEW_EVIDENCE_RECEIPTS
python scripts/verify_query_literals.py --binary PATH --model CODE_MODEL --output NEW_QUERY_RECEIPTS
python scripts/verify_cache_precision.py --binary PATH --code-model CODE_MODEL --documents-model DOC_MODEL --root src --output NEW_PRECISION_RECEIPTS
```

Capture actual xattr/ADS hits, failed-native fallback, equal-length edits, rename, ignore policy, long Unicode sources and no adjacent files. Read-only probes must not change source content. Report failures without relabeling fallback as a native hit. Document/low-memory/real agent-task evidence remains separate from authored contract checks.

Local source/runtime proof now covers Windows and Ubuntu24.04/WSL x86-64 on ext4 with the pinned models; [Gate6](../../reports/restoration/GATE6.md) records core tests, nine native/cache/source probes, eight profile checks, Windows timestamp preservation and Linux package execution. WSL uses a native Linux executable/kernel/filesystem, not bare-metal or Mac proof. The Mac checks remain deferred by the owner. Run `cargo test --workspace --locked --jobs 2` separately for desktop/workspace verification with the desktop's platform system dependencies installed.

[Gate 9](../../reports/restoration/GATE9.md) adds actual-model preview/cache bounds and stable anchor checks. [Gate 11](../../reports/restoration/GATE11.md) repeats Windows/Linux core and actual model/source contracts after identifier parsing fixes and verifies extracted local packages. The CI matrix now includes evidence and query probes; it has not been dispatched remotely. The numerical held-out [Gate 10](../../reports/restoration/GATE10.md) keeps its original exact binary/model/evaluator freeze, rather than silently relabeling those measurements as a later build.

[Gate 13](../../reports/restoration/GATE13.md) verifies exact current JIT/native/resident output precision and exported-source/local-package execution on Windows/Linux after the loader/cache repair. [Gate 14](../../reports/restoration/GATE14.md) separately records constrained CPU/address-space behavior, an allocation abort and allocator regressions. Follow [resource guidance](RESOURCES.md) without interpreting virtual caps as physical RAM or promoting a global allocator setting.

## Historical credentials while preserving development

Ignore rules prevent new env staging; they do not remove old blobs. Keep local env files excluded. First revoke/rotate every formerly usable credential at its provider and invalidate dependent sessions. The agent cannot establish provider-side revocation from a file scan; owner confirmation is required before publishing.

Prepare a backup and a **separate disposable mirror clone**, then inspect all reachable refs with a secret scanner configured to redact values. The review artifact should list provider/type, path, commit/ref and whether revocation is confirmed, never secret values. Decide which paths/blobs need removal; preserve the rest of the commit graph and useful documentation.

| Option | Use and tradeoff |
|---|---|
| Remove historical env/credential paths with `git filter-repo` in a reviewed mirror | Preserves development sequence/messages but changes affected descendant commit IDs; simplest for files that should never have been public |
| Targeted replacement of secret strings in selected blobs | Preserves more historical file content, but must handle encoded/duplicate copies and scanner misses; reviewed private replacement map required |
| Public historical redacted snapshot plus private original | Only if a full review cannot safely preserve publishable history; loses normal public commit chronology and is not the current preferred route |

Do not execute broad filtering against the active checkout. Review the exact proposed path list/ref scope, backup and resulting mirror before any force push. Test a clean public clone, verify absent secret blobs and intended commit progression, run model/profile/cache checks, then coordinate any affected collaborators. Existing remote forks/caches require provider/GitHub remediation where applicable; local filtering alone is insufficient. Follow [GitHub's sensitive-data guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).

## Packaging

`scripts/package_cli.py --binary PATH --output NAME.zip|NAME.tar.gz` packages the executable, pinned model setup/catalog, minimal transform modules, current CLI/architecture guides, license and agent skill. No model weights, corpora, envs or private records are bundled. Test extraction and model setup from the package with no source checkout dependency. Verify SHA256s and native execution after download.

The CLI tag workflow is manual (`workflow_dispatch`) and creates a **draft** on the same repository, without a cross-repository token or force mirror. Dispatch/publishing still require explicit owner action. Old desktop release flows remain inactive because they use unpinned legacy models and private cross-repository publication; desktop packaging must be rebuilt/verified before restoring a release workflow. The existing released-binary installers/update endpoint have not been redirected or published by this work.

Landing download/install commands still point at `IxosProtocol/ixos-releases` and its earlier executables. Before publishing the restored site or directing reviewers to those buttons, publish and natively verify the free restored artifacts, then update/verify those links. Current source installation is the verified route; old binaries do not establish current behavior.
