# Gate 11 — literal-query correctness and local installation

The restored CLI now handles identifier notation consistently through standalone calls and JSONL. Matching outer ASCII quotes no longer become required characters in a source identifier; tabs, newlines and Unicode whitespace separate terms. Exact punctuation remains available through `grep -F`. No scoring formula, model, cache payload or default preview policy changes.

## Observed failure and bounded fix

Using the actual CLI on Ixos located `retrieval/mod.rs` first for the literal-guard question, but its initial view showed diagnostic fields. Exact grep plus a bounded read found the implementation. The before/after observations remain under `query-before/` and `own-cli-after/`; this is authored navigation evidence, not an independent quality benchmark.

A two-file fixture contains an unquoted `fn raw_hash()` implementation and a quoted string occurrence in another file:

| Actual query contents | Implementation before | Implementation after |
|---|---|---|
| `raw_hash` | Found | Found |
| `"raw_hash"` (quote characters inside the argument/JSON) | Missed | Found |
| `'raw_hash'` | Missed | Found |
| `raw_hash` + tab + `cache_key` | Missed | Found |
| `raw_hash` + newline + `cache_key` | Missed | Found |

Previously the guard tested only ASCII space and included literal quotes in its substring. `identifier_literal` strips one matching outer ASCII quote pair for identifier checking, rejects every Unicode whitespace separator as a single identifier, and leaves the normal multi-term ranking path intact. A mismatched quote pair remains literal. This is not a general phrase parser; semantic input retains the supplied query, so quote variants need not have identical hybrid scores. Lexical replies do agree across the verified quote/whitespace variants.

Two meaningful Rust regressions cover notation and actual engine output. `scripts/verify_query_literals.py` exercises fresh CLI and resident JSONL in model-free lexical and real-model hybrid modes: matching quoted code, multi-term separation, absent-literal silence, source bytes/mtime and no adjacent files. An absent identifier is not general no-answer calibration.

## Verification

| Check | Result |
|---|---|
| Windows full workspace | 538 core, 16 desktop, settings matrix and 13 doc tests pass; six core/two doc existing ignored tests |
| Linux core/release | 536 core and settings matrix pass; six existing ignored tests |
| Actual model/cache/profile checks | Nine native/source/fallback/feedback contracts, eight profile contracts, bounded evidence and literal-query probes pass on both platforms |
| Original frozen fixture | Windows current and exported executable agree with the original frozen binary on the existing authored profile fixture |
| Source export/build | 2,931 staged tracked files; no local envs, downloaded weights, private records or build outputs; rebuilt executable passes model/query/evidence/source probes |
| Agent skill | Narrow query update validates through skill-creator's validator |
| Prospective evaluator | Current export retains the exact Gate 10 harness bytes; no `eval/*.py` changes |

The CI matrix now runs bounded evidence/stability/literal probes alongside its existing native/profile checks. It has not been remotely dispatched. Settings matrix uses stub infrastructure for combinations; all numerical/model/cache probes separately load actual pinned safetensors.

## Package proof and identities

Local Windows ZIP and Linux tar.gz packages contain the executable, current CLI/architecture/installation guides, agent skill, license, pinned model catalog and minimal setup modules. No weights, corpus, envs or private records are bundled. Source-repository report links are explicitly distinguished from the minimal runtime package.

The extracted Windows package independently downloads/validates both parents and prepares both selected derivatives. Code setup uses `python -S` with the standard library; document conversion uses NumPy 2.3.5. Searches and query/evidence contracts run from the extracted folder with `PYTHONPATH` and `IXOS_MODEL_PATH` removed. Linux similarly downloads/prepares code from its extracted package using `python3 -S` and runs real model/query checks. Final documentation-only package refreshes reuse these independently verified downloads; original receipts are retained.

| Executable | SHA256 |
|---|---|
| Previous benchmark Windows build, preserved `.tmp/gate11/pre-fix-ixos.exe` | `9596b928852289d5b3e4e8bd1c3e70bf397be9ed38b8455143e8bba679a3d351` |
| Current Windows build | `102b39ead184122c8e37d4e3414ef091084985f5fe96e58e3b171081df13c496` |
| Separate exported-source Windows build | `d3266ae1ea09f1fabab4525a3235ce1c84ac58f890db1883c584f424b831bddb` |
| Native Linux build | `72e42612ff096d888b66fb625e925f8dc8e006bb28bff42310bdddc6267c4391` |

Build paths can change executable hashes; source identities and actual runtime contracts are retained. The platform source receipt compares every current core Rust file, manifests and model catalog after explicit line-ending normalization. Current Windows/package model fingerprints remain those in `config/retrieval-models.json`.

Windows final local archive: `package-final/receipt.json`; Linux final archive/hash and query receipt: `linux-final/package.stdout`, `linux-final/query/receipt.json`. The archives themselves remain ignored local artifacts. Neither source build is a clean OS; dependency/toolchain caches are reused. WSL is native Linux/kernel/ext4 execution, not bare-metal or Mac proof. Native Mac remains deferred.

## Commands and limits

Raw compile/test logs and current contracts are in this folder. `query-before/commands.json`, `query-after/commands.json`, `package/commands.json`, `package-final/commands.json`, `source-runtime/commands.json`, `linux-checks.sh` and `linux-final.sh` record exact commands; the three one-off package/source orchestration scripts are preserved here too. No source/cache operation creates ordinary sidecars. Intermediate export-name verification used Windows default decoding and was rejected; explicit UTF-8 verifies every path without dropping anything. See `source-export.json`.

KEEP these narrow query fixes and package/CI contracts. Gate 10 numerical results remain attached to their prospectively frozen previous binary; do not relabel them as this build. No retrieval tuning used consumed held-out targets. Remaining work includes lower-memory/startup characterization, real-agent/no-answer/dense-document tasks, optional session interaction validation, native Mac and desktop integration/packaging. Public history still needs provider-side key rotation plus reviewed remediation before publication. No public push, history rewrite, remote CI, release or deployment occurred.
