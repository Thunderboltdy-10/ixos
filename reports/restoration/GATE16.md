# Gate 16 — declared minimum Rust compiler verified

The Linux core CLI builds and runs with the advertised **Rust 1.89.0** minimum. Locked dependencies remain unchanged; 545 core tests, the settings matrix, ten actual-model diagnostic commands, twenty cache precision comparisons and eight current profile/source contracts pass. Twenty complete saved process stdout outputs match the same-host Rust1.92 reference byte-for-byte. No production source, weights, retrieval settings or cache recipe changes.

## Before / after and identity

[Protocol](gate16/protocol.json) written before toolchain installation. Gate15 source `c8a9daa`, already normalized across all118core/manifests/catalog files. Existing isolated Ubuntu24.04/WSL/ext4 checkout and pinned parent artifacts; this is native Linux on the same Ryzen host, not bare-metal/Mac/clean-OS evidence. Exact minimum toolchain installed under the previously isolated `RUSTUP_HOME`, without changing the user's global toolchain or the current 1.92 release binary. A **separate fresh** target directory compiles locked dependencies with the new compiler; dependency download cache is reused.

| Contract | Rust1.92 control (Gate15) | Rust1.89 candidate |
|---|---|---|
| Declared minimum directly exercised | No: newer compiler | Yes:1.89.0 x86_64-unknown-linux-gnu, LLVM20.1.7 |
| CLI binary SHA256 | `dccda0113a72083b138513de5fc9ac59387ab572f79dc963258d78437cb54b40` | `999a20f25c59e1e9b60293609f7e6757d4c275421f235f19bffe9f063a2ea0f8` |
| Linux core/settings | 545 / matrix passed | 545 / matrix passed, six existing core ignores |
| Actual code256/document512 diagnostics | Ten commands passed | Ten commands passed |
| JIT/native/resident/global/bounded/feedback precision |20/20 exact within control |20/20 exact within candidate |
| Cross-compiler complete stdout | Reference retained |20/20 exact process output files, including three-response session trajectories |
| Current profile/cache/source operations | Eight contracts passed | Eight passed |
| Cargo.lock and Cargo.toml | Captured before | Exact raw bytes/hashes unchanged |

Twenty files/comparisons are authored repeated correctness contracts, not twenty independent labeled quality tasks. Same fixed113Rustsource/1,610,853-byte corpus and source hashes/nanosecond mtime/no adjacent files; actual code/document fingerprints remain `835fb9be…`/`6966e61b…`. Diagnostics timing differs normally and is not compared. There is no performance claim about one compiler being faster.

`Cargo.lock` Linux raw SHA256 `a28b7d6820b2b5ac15478fc27b55923b2a6a5ea8369ea01daa1e3585d93e3e5e`; manifest `c942a61db5852d9b78de36c73c7f7b8a3886624ef09bd5419d1e1d322cc4747c`. Control/final receipts verify both; Windows lock matches normalized LF. [Compiler identity](gate16/linux/rustc-version.stdout), [response comparison](gate16/linux/comparison.json), [test output](gate16/linux/tests.stdout).

## Commands and documentation

```sh
rustup toolchain install 1.89.0 --profile minimal --no-self-update
cargo +1.89.0 build --release --locked --bin ixos --jobs 2 --target-dir NEW_TARGET
cargo +1.89.0 test --release --locked -p ixos-protocol --lib --bin ixos --test settings_matrix --jobs 2 --target-dir NEW_TARGET
python scripts/verify_doctor.py --binary NEW_TARGET/release/ixos --code-model CODE --documents-model DOC --output NEW_DOCTOR
python scripts/verify_cache_precision.py --binary NEW_TARGET/release/ixos --code-model CODE --documents-model DOC --root FIXED_SRC --output NEW_PRECISION
python scripts/verify_restored_cli.py --binary NEW_TARGET/release/ixos --code-model CODE --documents-model DOC --output NEW_PROFILES.json
```

[Saved run recipe](gate16/run.sh) contains the exact isolated paths and trap preserving outputs on failure; [comparison recipe](gate16/compare.py) checks original/candidate successful status, source identities, every stdout byte and control executable/lock identity. Replays require new receipt/target paths; do not overwrite historical outputs. No failure occurred in this minimum-compiler study.

Installation/release guides now distinguish tested Linux minimum from newer Windows checks and unverified native Mac/desktop combinations. Engine CI includes a locked Linux1.89 core/settings guard; actual-model multi-OS checks remain in its stable-toolchain matrix. Local YAML parsing verifies the workflow structure; no remote workflow dispatch or CI success claim.

The active [evidence index](INDEX.md) now covers all16gates in a compact table. Its previous six-gate/raw-capture index is copied byte-for-byte to `gate6/CAPTURE_INDEX.md`, verified before replacing active navigation; [preservation identity](gate16/evidence-index-preservation.json). Original path-map/hash records and all raw receipts remain intact. Archived plans/architectures were not edited.

**KEEP** declared core minimum1.89 and its CI guard. No public release/package replacement is implied by this guide/index update; Gate15 local packages and their exact documentation snapshots retain their own identities. Next investigation: potential nondeterminism from multiple accepted/rejected feedback vectors aggregated through a HashSet; reproduce on actual models before fixing. Broader fresh agent/session/no-answer/dense-document evaluation remains separate from these authored compatibility contracts. Native Mac and provider credential revocation/history preparation remain external publication conditions.
