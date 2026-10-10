# Ixos restoration

Current working state, 2026-10-10. Earlier working plans/logs/decisions are preserved byte-for-byte in `docs/archive/restoration-pre-2026-10-10/`. Personal contribution/application/chat notes remain locally excluded under `private-process/`.

## Current instructions

- Preserve the monorepo and organize its separate products; engine/CLI and code-agent retrieval are primary.
- Use ADS/xattr; any optional database lives in Ixos's application cache, never beside searched files. Retain JIT.
- Fix confirmed correctness issues before optimization; avoid polishing architecture that experiments will replace.
- Remove paid access/account-device restrictions. Preserve useful desktop behaviour; no general visual redesign.
- Do not train or run architecture/model experiments until the evaluation contract and harness are validated.
- Evaluate interactions, not just isolated components. Passage count depends on document length; preserve introduction and select informative/diverse passages rather than random-only samples.
- Intelligent/session retrieval deserves serious iteration and interaction testing. Keep failures honest; never degrade baselines to force success.
- Choose defaults/profiles from evidence near the end. Update the Ixos agent skill with the final tool contracts.
- User authorized continued implementation and one coherent commit after each gate. Do not stop between gates for routine permission. No public push/history rewrite is part of these local commits.

## Gates

1. Correct caches, freshness/model identity, traversal/exclusions, parsers/evidence and CLI errors/budgets. Regression tests plus real-artifact probes.
2. Free/offline desktop and engine; remove payment/device-lease dependencies; organize active monorepo roots; validate reproducible builds.
3. Freeze validated code-agent/general-agent/user-simulation evals. Run reproducible interaction matrix, diagnose failures, iterate models/representations/session algorithms and select task-specific combinations.
4. Final presets, agent skill, current documentation, cross-platform/release checks and measured technical writeup. Public-release secret remediation requires confirmed revocation/rotation before publishing.

## STATE SNAPSHOT

- Starting HEAD: `d606aa5`, original branch `Ixplore`; implementation branch `codex/restore-ixos` is active.
- Baseline command: `cargo test -p ixos-protocol --lib`; 487 passed, six ignored. Output: `reports/restoration/gate1-baseline-tests.*`.
- Real-Flash audit probe: cold score 0.1049315, unchanged native cached score 0, edited/recomputed score 0.1260700. Cache serializes 64 of 512 dimensions. Correctness fixture, not throughput/quality benchmark.
- Late-file witness at line 903 returns introduction; Unicode passage panic; semantic fallback bypasses ignores; JSON error exits zero; RAM cache can serve edited vectors.
- No new optimized model or valid restoration-wide quality baseline yet. Historical February results are not current held-out results.
- Bottleneck order: cache dimensions/freshness → discovery/evidence/extraction → trustworthy evaluation/instrumentation → measured optimization.
- Corrected gate-1 state: 506 core tests pass, six ignored; 48 settings combinations pass. The locked release and expanded real Flash probes pass, including cache stats/clearing/index warmup. See `reports/restoration/GATE1.md`. No new quality/model baseline yet; natural-language self-navigation still misses relevant code in its first five.
- Next three tasks: remove active payment/account/device-instance restrictions; organize and verify monorepo preparation/builds; validate the evaluation contract/harness before any model or architecture experiments.

## Experiment contract being prepared

Primary: code/AI retrieval. Secondary: other agent document tasks. Tertiary: human-style search. Compare models × adaptive passage policies × lexical/semantic/hybrid retrieval × fusion × session intelligence, with conditional exclusions for meaningless combinations. Stage full feasible screening on development data, interaction follow-ups, validation selection, then frozen held-out test. Separate JIT/cached/startup and output-budget measurements. Record raw outputs, source/model/data/config identities, negative results, source-span quality and total context/tool-call cost. Benchmark integrity tests precede lab execution.
