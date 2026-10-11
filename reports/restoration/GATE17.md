# Gate 17 — deterministic feedback aggregation

Equivalent feedback sets now produce identical follow-up responses in the actual-model checks on Windows, Linux and Rust1.89. Previously the same accepted/rejected files produced tiny floating-point score variations because a HashSet determined the vector summation order. The fix deduplicates and orders these paths with a BTreeSet before summing. It changes neither feedback weights nor document/model/cache representations.

## Prospective contract and before / after

[Protocol](gate17/protocol.json) preceded execution. Control source is Gate16 `2e36ff0`; the fixed Gate11 corpus contains113Rust files/1,610,853bytes. Both pinned actual parents are loaded: code256 (`835fb9be…`) and document512 (`6966e61b…`). Each model/cache condition uses a resident combined session with context0, limit10,6000-byte output and typo correction off. Each of twenty trajectories resets history, repeats an identical seed, then submits the same feedback sets with permutations, duplicates and equivalent path/index references.

The first six displayed files are arbitrarily accepted and the next up to four rejected. This is synthetic correctness feedback, not human relevance gold. Twenty trajectories per four conditions mean80trajectories/240requests per study, including80resets and160searches. Repeated calls are not independent labeled quality tasks. Stable seed bytes, bounded feedback consumption, real resident hits after the first repetition and source hash/mtime/no adjacent-file preservation are required.

| Model / mode | Windows distinct follow outputs, before → after | Linux, before → after | Linux Rust1.89 after |
|---|---:|---:|---:|
| Code / JIT |3 →1|3 →1|1|
| Code / native |3 →1|3 →1|1|
| Documents / JIT |2 →1|3 →1|1|
| Documents / native |2 →1|3 →1|1|

The maximum observed before variation was about6×10⁻⁸ in score. File ordering stayed unchanged in every observed control condition; there is **no demonstrated relevance gain**. Exact candidate follow-up bytes also match between JIT/native, Windows/Linux and the two Linux compilers for the corresponding model. This fixes numerical reproducibility, without treating random prior outputs as different retrieval judgments. [Audit and exact hashes](gate17/audit.json).

## Implementation and verification

Only the collection used for feedback-vector reduction changes. Displayed/current-source checks,16-response history limit, four-turn feedback limit, +0.15accepted/−0.07rejected adjustments and topic-drift handling remain as before. Existing unrelated HashSets retain their purpose. The current architecture guide describes the canonical reduction order.

| Binary | SHA256 |
|---|---|
| Windows control |`e72e219eb83453702c45db0cdc9c2dfbb8580928281c07da98108c19f1259fb5`|
| Windows fixed |`7aab8d7d627e98f190e3af2519b4b520722d9d23663d377bc496a3e6b4ed1418`|
| Linux control, Rust1.92 |`dccda0113a72083b138513de5fc9ac59387ab572f79dc963258d78437cb54b40`|
| Linux fixed, Rust1.92 |`b3c9427f211ec0adb15ef043da27d7975db2eb9a1ff23d278e0afe268a5a4f41`|
| Linux fixed, Rust1.89 |`b578f13727f6de1eb568238ee92e0b93ae67c19ab556053e2e81b7a23b54192b`|

Windows full workspace checks pass547core/16desktop/settings/13documentation tests, with the existing six core/two documentation ignores. Linux1.92 and1.89 core/settings checks pass545core, with six existing ignores. Both platforms also pass20cache-precision comparisons, ten diagnostic cases and eight CLI profile/source contracts. Windows verifies the existing original frozen-model fixture. All118current core/manifests/catalog files match across the Windows/Linux sources after LF normalization. Linux1.89 reuses the separate Gate16 target directory and recompiles the changed source; it is not another fresh dependency compilation.

```sh
cargo test --workspace --locked --jobs 2
cargo build --release --locked --bin ixos --jobs 2
python scripts/verify_session_stability.py --binary CONTROL --code-model CODE --documents-model DOC --root FIXED_SRC --output NEW_BEFORE --expect-variation
python scripts/verify_session_stability.py --binary CANDIDATE --code-model CODE --documents-model DOC --root FIXED_SRC --output NEW_AFTER
python scripts/verify_cache_precision.py --binary CANDIDATE --code-model CODE --documents-model DOC --root FIXED_SRC --output NEW_PRECISION
python scripts/verify_doctor.py --binary CANDIDATE --code-model CODE --documents-model DOC --output NEW_DOCTOR
python scripts/verify_restored_cli.py --binary CANDIDATE --code-model CODE --documents-model DOC --output NEW_PROFILES.json
```

Exact paths/arguments/receipts: [Windows checks](gate17/windows_checks.py), [Linux checks](gate17/linux_checks.sh), [minimum compiler](gate17/msrv_checks.sh), [audit recipe](gate17/audit.py). Use new output directories for replays. The probe captures request/stdout/stderr bytes on failure and applies process/response timeouts. Stable CI adds the real-model regression; local workflow parsing passes, with no remote CI dispatch.

**KEEP** canonical feedback reduction. No scoring thresholds, presets, parents, cache recipe or frozen evaluator changes; no latency/quality improvement claim. Gate15 local packages retain their older binary identity and will be refreshed at release preparation, rather than mislabeled as this build. Native Mac remains deferred. Next work broadens fresh agent/session/no-answer/long-document evaluation before considering further retrieval changes. Public history/provider credential remediation remains a separate publication condition.
