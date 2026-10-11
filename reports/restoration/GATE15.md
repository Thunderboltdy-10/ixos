# Gate 15 — current installation diagnostics

`ixos doctor` now diagnoses the current CLI/profile instead of treating legacy Flash/Potion loads and a stub progressive pipeline as proof that the restored engine works. It honors the effective explicit configuration and model precedence, performs real encoded-row inference, checks current lexical source evidence, distinguishes native cache storage from the application database, and returns nonzero for failed checks in JSON **and** human output. Existing user files are not indexed or modified by the diagnostic.

## Before and after

Prospective [protocol](gate15/protocol.json); previous executable preserved at `.tmp/gate15/control-ixos.exe`, SHA256 `afbbbfe2df00d1fa6bfb031fb7a5fba5a29ace7cb1295552d66c7a38dbb06bb3`. No retrieval weights/defaults/model artifacts/cache recipe/evaluator changes.

| Situation | Before | After |
|---|---|---|
| Current pinned code/document installation | Doctor checks old Flash/Potion, unrelated to selected current profile | Actual local code256/document512 inference, model path/fingerprint reported |
| Explicit `--config` | Main parses it, doctor independently loads default path | Same parsed config and selected path passed to current diagnostic |
| Model selection | Hardcoded legacy models | Same profile/explicit path → environment → config → installed profile precedence as search |
| JSON report with a FAIL | Returns zero after printing JSON; reproduced on Linux with missing legacy model | Missing selected model/root returns full FAIL report and nonzero; human also nonzero |
| Cache capability | Directory-level legacy probe reports LMDB on this ADS volume | Isolated signed current-record write/read/remove reports actual native or application-DB result |
| Lexical installation | Legacy model failure can imply a failed installation | No model required; real lexical witness returns exact evidence |
| Read-only search folder | No current-engine contract | Unable to create isolated witness is an explicit warning; does not falsely fail a potentially usable read-only search |
| Legacy config persistence probe | Fixed `config.doctor.tmp.toml` can overwrite/remove an existing file | Unique UUID probe name; desktop compatibility API retained |

Old Windows report: [doctor-before.stdout](gate15/doctor-before.stdout), eight passes based on legacy facilities. Authored old-control override receipt [before](gate15/before/receipt.json) verifies the wrong default config path despite a selected lexical config. Linux [before report](gate15/linux/doctor-before.stdout) contains a model FAIL with [exit zero](gate15/linux/doctor-before.exit). The config probe collision is a code finding; no historical user-data loss is asserted.

## Implementation and boundaries

`src/diagnostics/retrieval.rs` contains the current diagnostic; `src/main.rs` passes already validated effective config, and `doctor --profile/--model-path/--dir` mirrors relevant search choices. Existing `run_doctor` remains callable by the retained desktop. CLI JSON still prints the structured report before returning a failing exit; malformed configuration fails before diagnosis and is preserved.

The current diagnostic creates a UUID directory under the selected filesystem, containing only its own witness. Current lexical retrieval runs on it; a selected semantic model is loaded through the exact current encoded loader and emits a finite/nonzero correctly dimensioned vector. Persistent mode writes/inspects/removes a signed `DocumentCache` record using that real vector and a dedicated diagnostic recipe. Primary witness bytes/mtime and cleanup are checked. A storage capability result does not assert every existing file is writable or production-recipe compatible. Persistent cache off/lexical/missing model cases do not write an embedding record. Existing sources are never searched by doctor; a real corpus search remains necessary.

No stub inference or progressive-event claim is included in the current report. These authored diagnostic witnesses establish installation contracts, not relevance quality/performance or desktop integration. A read-only-folder warning explicitly leaves runtime/cache capability unverified.

## Validation

| Layer | Windows | Native Ubuntu24.04/WSL/ext4 |
|---|---|---|
| Core suite | **547 passed**, six existing ignored | **545 passed**, six existing ignored |
| Workspace/settings/docs | 16 desktop, settings matrix, 13 doc tests; two existing doc ignores | Core/settings only; desktop system libraries not tested here |
| Actual doctor contracts | Ten commands pass | Same ten pass |
| Source preservation | Existing file bytes/mtime, no temporary leftovers | Same, plus non-root read-only-folder probe |
| Cache precision | 20/20 JIT/native/resident/global/bounded/feedback comparisons exact on both actual models | 20/20 exact |
| Current profile/source operations | Eight authored contracts pass, including original frozen Gate3 reference | Eight pass |
| Installation/package | Fresh source export/rebuild and extracted Windows ZIP pass doctor/profiles | Extracted local tarball passes doctor/profiles |

Two new meaningful regressions: a lexical installation with missing model preserves an existing file and cleans up; missing required semantic model fails even when lexical retrieval succeeds. Baseline Windows full workspace ran before edits. All **118** normalized current core Rust/manifests/catalog files match between Windows and the isolated Linux build. Frozen Gate10 evaluator Python bytes match the fresh index export; its consumed quality study and original binaries are untouched.

Current Windows CLI SHA256 `e72e219eb83453702c45db0cdc9c2dfbb8580928281c07da98108c19f1259fb5`; Linux `dccda0113a72083b138513de5fc9ac59387ab572f79dc963258d78437cb54b40`; fresh exported-source Windows `f92a833300f6520a4b5c53b70fd2a057254be65671b1da6ba4769378c0f8e115`. Code/document fingerprints remain `835fb9be…` / `6966e61b…`; ten saved selection outputs independently audit exact expected fingerprints across config/env/explicit precedence.

Windows fresh export contains 4,639 tracked staged files, excludes local env/weights/build/private records, and reuses the separate toolchain/dependency target. Extracted local packages run without PYTHONPATH/checkout imports. Setup verifies the pinned Gate11 independently downloaded parents; no new download or clean-OS claim. Documentation-only final package refreshes preserve unchanged tested executables and old package receipts. Resource guide is now bundled, and installation/CLI/agent skill describe the actual diagnostic. Skill validates with the existing skill-creator validator. CI includes the real diagnostic probe; no remote workflow was dispatched.

## Commands and receipts

```sh
cargo test --workspace --locked --jobs 2
cargo build --release --locked --bin ixos --jobs 2
python scripts/verify_doctor.py --binary PATH --code-model CODE --documents-model DOC --output NEW_RECEIPTS
python scripts/verify_cache_precision.py --binary PATH --code-model CODE --documents-model DOC --root FIXED_SRC --output NEW_RECEIPTS
python scripts/verify_restored_cli.py --binary PATH --code-model CODE --documents-model DOC --output RECEIPT.json
python reports/restoration/gate15/audit_reports.py
python reports/restoration/gate15/source_identity.py
```

Exact local commands/logs: [Windows orchestration](gate15/windows_checks.py)/[commands](gate15/commands.json), [Linux recipe](gate15/linux_checks.sh), [read-only recipe](gate15/readonly_probe.sh), [source/package recipe](gate15/final_checks.py)/[receipt](gate15/final/receipt.json), [Linux package recipe](gate15/linux_package.sh). Final documentation-only packages use [Windows refresh](gate15/refresh_package.py) and [Linux refresh](gate15/linux_refresh_package.sh); hashes retained in their receipts. Replays use new directories; scripts refuse overwrites.

Own current CLI query `where does the CLI choose which model to diagnose` returns `main.rs`, `cli/commands.rs`, and `diagnostics/retrieval.rs` first through third. Exact Ixos grep and bounded read reveal the implementation; doctor succeeds on the actual source filesystem. All existing `src` bytes/mtime unchanged and probe directory removed. [Own-use receipt](gate15/own-cli/receipt.json) is already-informed exploratory navigation after the fix, not a blind agent task score.

**KEEP** the current diagnostic and dedicated module, explicit failure status and unique legacy probe name. Next: verify the declared Rust1.89 source-install minimum and advance fresh realistic agent/session/no-answer/dense-document evaluation. No model/quality retuning, public push/history rewrite/release, Mac runtime or genuinely small-device guarantee in this gate.
