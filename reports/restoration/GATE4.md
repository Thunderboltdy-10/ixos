# Gate 4 — usable CLI integration and current documentation

October 11, 2026. Windows x86-64 / Ryzen 7 5800X. Gate 3 is `e438eec`; Gates 1/2 are `6a7ec7f` / `8afa75f`. Frozen Gate 3 identities/timings remain unchanged. The integrated binary is SHA256 `5f52682d4321df0207937052bfaed5321cbeb60f352331d0eb219bf43ad7c027`.

## Result

The measured engine is now the default standalone CLI. Code, documents and lexical profiles select the validated model/representation recipes; explicit flags and persistent settings remain editable. A pinned installer reproduces exact derivatives outside Git, with no credentials or paid feature unlock. Search/grep/read/serve and cache warm/stats/clear form the practical agent interface. The desktop retains its earlier pipeline.

Normal standalone search emits no detailed stats unless requested. Resident `--quiet-stats` suppresses routine search/grep diagnostics; a request can set `stats:true`. The ready record remains. Context/count/byte budgets fit complete source evidence; file-only results stay explicit. Session intelligence remains optional, bounded and resettable. No new scoring/representation selection or held-out tuning occurred in this gate.

## Integration corrections

| Finding | Correction |
|---|---|
| Earlier active defaults required many flags and referred to old models | Default current profiles; editable `[retrieval]`; explicit legacy boundary and actionable missing-model error |
| Malformed configuration could silently fall back/overwrite | Strict CLI load and validation; invalid updates preserve state; explicit reset recovers |
| Desktop conversion lacked the new config field and would discard CLI preferences | Preserve retrieval/index sections when applying desktop preferences; regression test |
| Cache stats/index targeted only earlier vectors | Current document `warm`/`stats`; explicitly qualified recipe compatibility; earlier stats require `--legacy` |
| Quiet resident mode still emitted grep stats | Apply quiet policy to grep; allow request-level diagnostics |
| Foreground daemon nested a Tokio runtime inside the CLI runtime | Use existing async runtime and propagate startup/signal errors |
| Application DB could copy an oversized record before rejection | Reject length before copying; valid record behavior unchanged |
| Release-check stub returned success with stale instructions | Return a visible failure and point to actual native/model/history checks |
| Site/desktop text still implied Pro-only features; cache diagram claimed discarded 64 dimensions/225 bytes | Remove paid eligibility labels/status handling; correct actual dimensions/payload, CPU runtime and exaggerated claims without general UI redesign |
| Old release flow force-pushed a partial CLI mirror and used private cross-repository publication | Preserve inactive legacy workflows; manual same-monorepo draft workflow, actual model checks, packaged setup; no dispatch/publish |
| Active guides/lab reference described obsolete models and commercial plans | Byte-preserve history and replace active entry points; archive retired stub settings runner and Blob uploader/dependency |

## Verification

| Check | Result | Receipt |
|---|---|---|
| `cargo test --workspace --locked --jobs 2` | 527 core passed / six ignored; 16 desktop; 48-combination integration; 13 doc tests / two ignored | [workspace](gate4/gate4-final-workspace.stdout) |
| `python -m unittest discover -s eval -t .` | 66 tests, one host symlink skip | [evaluation](gate4/gate4-eval-final.stderr) |
| Release build | Passed | [build](gate4/gate4-final-build.stderr) |
| Actual-model profiles/config/output/protocol | Eight checks passed; default/explicit/frozen outputs byte-equal on authored fixture | [profile contract](gate4/gate4-final-profile-contract.json) |
| Actual-model native/cache/edits/rename/feedback/read-only fallback | Eight probes passed | [cache probes](gate4/gate4-final-real-probes.json) |
| Retained real Flash CLI | Passed before the final bounded-read/help-only integration patch; raw identity retained | [legacy contract](gate4/gate4-legacy-contract.json) |
| Model setup | Both exact derivatives installed offline; repeat no-op; fresh pinned public code download passed | [setup](gate4/gate4-model-setup.stdout), [download](gate4/gate4-network-setup.stdout) |
| Standalone package | Extracted Windows binary executes; package code setup works with Python `-S`, without checkout or third-party packages | [package](gate4/gate4-final-package.stdout), [isolated setup](gate4/gate4-package-setup.stdout) |
| UI/site builds | Both passed; existing nonfatal bundle/Browserslist warnings retained | [UI](gate4/gate4-ui-build.stdout), [site](gate4/gate4-site-build.stdout) |
| Site browser checks | 13 passed, including 1440/1024/390 snapshots for /1,/2,/3 and overflow checks; intentional text snapshots refreshed | [browser run](gate4/gate4-site-visual.stdout) |
| Coverage explainer | JIT/centroid/resident interactions and 736/320 viewport layouts in light/dark; no runtime errors | [checks](gate4/gate4-cache-visual.json) |
| Historical docs preservation | 98 archived originals verified byte-for-byte | [manifest](gate4/gate4-archive-manifest.json), [verification](gate4/gate4-archive-verify.stdout) |
| Independent source installation | Staged source export, fresh target build, independent public model downloads; eight profile checks plus eight native/source/cache probes passed | [source receipt](gate4/gate4-reviewer-source.json), [build](gate4/gate4-reviewer-build.stderr), [profiles](gate4/gate4-reviewer-profile-contract.json), [native probes](gate4/gate4-reviewer-native-contract.json) |

Failures remain captured: first cache integration could not access the crate-private byte parser; first workspace run caught the desktop initializer; early profile harness used a nonexistent stats field and then caught unsuppressed grep diagnostics. Failed captures are not included as passing checks. Their corrections are above.

### Reviewer source reproduction

`git checkout-index --all --prefix=.tmp/gate4/clean-source/` exported the staged tree `8f6715cfca9f3b4add2a66eb86485a06fa8693c8`: 2,088 tracked files, no local envs, private records, model weights, target or node_modules. Archive98/receipt453 hashes were verified again in the exported files. `cargo build --release --locked --bin ixos --manifest-path .tmp/gate4/clean-source/Cargo.toml --target-dir .tmp/gate4/reviewer-target` passed in 2m12s. This reused the installed C/Rust toolchain and Cargo registry cache, with a fresh source/target; it is not a clean-OS installation claim. The separately built executable SHA256 is `e1fb2500023e6c099f3fcda85eb1a680e9c3c4555509f8025cef8c50feedabe4`. Embedded build paths can change the executable hash; actual authored-fixture output equivalence to the frozen binary passed.

From that export, `python -S scripts/setup_models.py --profile code --destination CUSTOM_MODELS` and normal Python document setup downloaded/verified the pinned public artifacts without using earlier local weights. NumPy2.3.5 was already installed for the document conversion. The profile harness used an explicit temporary config; the native harness reused ordinary OS signing-key/application-cache facilities with an explicit fresh model path. No Windows known-folder redirection or separate user/VM was simulated. [Code installation](gate4/gate4-reviewer-code-setup.stdout), [documents](gate4/gate4-reviewer-documents-setup.stdout), exact commands/identities in the source receipt.

Default-recipe concept search over the exported `src/` returned `retrieval/cache.rs` first; bounded source read and exact grep succeeded. The first one-off smoke command incorrectly added `--json` to grep, which already emits JSON; its failing capture is retained, and the corrected retry passed without an engine change. Current CLI guide/skill state this explicitly. [Search](gate4/gate4-reviewer-concept.stdout), [read](gate4/gate4-reviewer-read.stdout), [grep](gate4/gate4-reviewer-grep.stdout), [initial failure](gate4/gate4-reviewer-smoke.stderr), [retry](gate4/gate4-reviewer-smoke-retry.stdout). Source-audit/smoke scripts are retained beside the receipts; these are reproduction diagnostics, not unseen quality evaluations.

Final staging review caught seven superseded guide deletions missing from the earlier index export. Staged those deletions and exported again; archive/raw-byte integrity and absence of local artifacts passed. All Rust sources, Cargo metadata/lock, model catalog, setup transforms and contract harnesses match the tested export byte-for-byte. [Final source inventory and runtime hashes](gate4/gate4-reviewer-final-source.json), [equivalence](gate4/gate4-reviewer-runtime-equivalence.stdout). The final export adds receipt/current documentation changes, without changing the compiled runtime or installed model recipes.

## Actual agent use and resource profile

A default JIT concept query over `src/` returned `retrieval/cache.rs` first. Bounded read inspected its actual native-write/fallback behavior; exact grep used the storage sources. [Search](gate4/gate4-self-search.json), [read](gate4/gate4-self-read.json), [grep](gate4/gate4-self-grep.json). This was an inspected own-code trial, not unseen benchmark gold.

Sequential fixed-query resident profiling used 112 current Ixos sources / roughly 1.55 MB primary input, full raw reads/hashes, five warm requests after one fill, JIT persistence disabled. Code/documents here both searched the same **code corpus**; these figures are not the SciFact timings.

| Profile | Model-ready working set | Working set after last query | Peak working set | Warm p50 |
|---|---:|---:|---:|---:|
| Code representatives | 86.8 MiB | 105.5 MiB | 131.0 MiB | 14.73 ms |
| General document centroid | 148.6 MiB | 168.4 MiB | 202.9 MiB | 14.52 ms |

The Windows process API measures working set/peak working set; private committed bytes are separately captured. Artifact size is not RSS. Code startup was207 ms, general201 ms in these individual processes; do not treat five repeats of one own-code query as broad latency evidence. [Code profile](gate4/gate4-resident-code.json), [general profile](gate4/gate4-resident-documents.json), executable `scripts/profile_resident.py`.

A private JIT Spectra source trial returned the streaming hook first but an import-only view; exact/read follow-up was necessary. It used the Windows–WSL path while other checks ran, so neither its timing nor retrieval is published as controlled task success. No persistent Spectra embeddings or adjacent files were written; excerpts remain excluded.

## Evidence and organization

453 earlier raw receipts were grouped into gate folders without changing their bytes. [PATH_MAP.json](PATH_MAP.json) maps original command paths to current locations and SHA256; [INDEX.md](INDEX.md) provides browsing. Frozen raw JSON/commands are not rewritten to pretend the move happened before measurement. Current guides: root README/AGENTS, docs hub/CLI/architecture/features/models/release, scripts guide, per-product READMEs and `skills/ixos-retrieval/SKILL.md`. Older docs/research/plans remain in the archive; Ixplorer remains retired in legacy. Private contribution/application/context notes remain excluded.

## Remaining work and limits

Native Mac/Linux CI is configured, including Mac ARM/Intel runners, but has not executed remotely here. User Mac testing must cover default CLI models/xattrs/fallback, desktop launch without signup, search/open/reveal and multiple instances. Historical credentials still require actual provider revocation/rotation and reviewed history remediation before public release. Local ignore rules and a cleanup runbook do not establish that old keys are safe.

Further quality work should add independently anchored code/span/agent-task evidence (ContextBench adaptation and selected practical tasks), no-answer/query-drift cases and low-end/resource coverage. The small code suite/incomplete spans remain real limitations. A future memory experiment can test pooling directly from mapped compressed rows rather than expanding the complete table; it needs runtime/batch equivalence and measured CPU tradeoffs before selection. Current third-party weights, transformations and established algorithms are attributed; no new distillation or universal superiority claim.

No public push, history rewrite, CI dispatch, model upload, deployment or release publication occurred.
