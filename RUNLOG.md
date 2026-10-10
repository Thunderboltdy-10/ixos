# Restoration run log

## 2026-10-10 — implementation authorized

- User approved implementation through the gates and one coherent commit after each gate; clarified no adjacent sidecar files, retain monorepo/JIT, defer preset choices, evaluate interactions and adaptive passage counts, prioritize AI/code and intelligent session retrieval.
- Preserved old root working-memory files under `docs/archive/restoration-pre-2026-10-10/`, hashes recorded privately. Existing plans were not rewritten.
- Baseline: `cargo test -p ixos-protocol --lib`; 487 passed, six ignored. Raw stdout/stderr in `reports/restoration/gate1-baseline-tests.*`.
- Added a dimension-preservation regression before cache implementation changes; baseline serializer is limited to 64 dimensions while production Flash is 512-dimensional.
- No model/architecture experiments or training have started. No public push, env-history rewrite or publication performed.

## Gate 1 — correctness repairs

- Repaired dimension-aware cache serialization, artifact/preparation/source identities, candidate-only persistence, RAM freshness, fallback lifecycle/keys/deletion and native source preservation. Added meaningful regressions before/after the failing dimension test.
- Unified ignore-aware discovery, fixed hidden flags, excluded symlink files/dependency trees, removed stale/configuration-blind shared path manifests and refreshed discovery on subsequent queries.
- Fixed Unicode display/source offsets, propagated lexical witness locations, added bounded source windows and removed fabricated first-line evidence when no keyword matched. Parsed stable document bytes rather than falling back to binary container text.
- Found another hidden cap: the embedding wrapper truncated fast-mode inputs to 2,048 characters. Fast mode now preserves caller input; timing mode's preparation has a separate identity. Model2Vec's 512-token default remains explicit outstanding coverage work.
- Repaired CLI config precedence, noninteractive retrieval, error exits, explicit-only stubs, result-batch bounds, optional final-output/snippet budgets and stage-based diagnostics. Removed default file-age/revisit penalties and refreshed edited integrity entries.
- Validation: `cargo test --locked -p ixos-protocol --lib --bin ixos --test settings_matrix`: 506 core tests pass, six ignored; settings matrix passes. `cargo check --offline -p ixos-protocol --bins` passes. Release build and real-model contract probes are captured in `reports/restoration/`; final verification precedes the gate commit.
- No lab quality/architecture experiment has run. A first probe-harness assertion used the wrong JSON line-number field; corrected to the actual schema, with incremental raw-output capture so future failures retain evidence.
- Final utility probes exposed unreliable `Path::exists` for Windows ADS; presence now opens the stream. Utilities share search identities and report actual vector sizes. Index warms real embeddings; targeted clear preserves source bytes. The stale fixture uses an in-place stream edit because file recreation can remove ADS.
- Final locked release and expanded real-model contract probes passed. A settings-test linker attempt could not open its executable; retry passed, with failure retained in `gate1-link-retry.stderr`. Self-navigation natural language missed the key cache module in top five; exact `memory_cache` ranked it first. No speedup/superiority claim follows from these probes.

## Gate 2 — free local access and workspace preparation

- Removed engine capability/entitlement gates, desktop auth/payment/device-lease paths, single-instance plugin and account SDK dependencies. Local search, Ask, Today/workstreams and ranking configuration remain available. Desktop model initialization and input errors now propagate explicitly.
- Replaced paid site sections/routes and removed subscription/control-plane services. Kept existing layouts and animations. Enabling type-enforced builds exposed genuine site errors; repaired the actual adapter API, UI prop/type mismatches, imports and cancellable debounce. The verified site build uses Webpack.
- Archived outdated root/site inventories/specifications without rewriting their contents, and moved retired loose source to legacy. Removed payment/account env fields without logging values; retained local env files and untracked/excluded them.
- Added short application-directory OS locks for key creation and local-state I/O. These do not restrict instances or solve stale-state merging. Concurrent key-creation and separate-handle serialization regressions pass.
- Final workspace tests pass 508 engine tests (six ignored), 15 desktop tests and 48 settings combinations. UI and site typechecks/builds pass. Evidence is under `reports/restoration/gate2-*`.
- Initial 13 browser checks passed, but screenshot review showed hidden scroll-triggered sections. The harness now scrolls/reveals and asserts free-access content before captures; final results and review follow in the same gate.
- No model/architecture experiment, public push or credential-history rewrite has occurred. Native macOS execution and credential revocation/rotation remain outstanding release checks.
- Revised browser checks: 13 pass, with free-access content visible; all four variant-1 checks pass again after the last obsolete paid-tier FAQ was removed (`gate2-site-visual-faq.*`). Screenshot crops were visually inspected. These are reviewed captures, not a claim of deterministic animated-page pixel equality. Generated browser output and old `.tmp` data are excluded/untracked.
