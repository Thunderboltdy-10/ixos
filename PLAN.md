# PLAN.md - Ixos Flash v2 + Pro v2 + Search vNext

## STATE SNAPSHOT (update frequently)
- Date: 2026-02-09
- Current baseline models: Flash v1 (legacy), Pro fusion baseline = Flash v1 + Potion + lexical (see models/lab/results_baseline_fusion_2026-02-02.json)
- Baseline quality (MRR@10 / Recall@10): Flash v1 0.8399 / 0.93; Potion 0.8073 / 0.90; Pro v1 0.7354 / 0.855; Pro fusion 0.9233 / 0.97 (real_corpus_v2)
- Baseline perf (p50/p95, ms/1k, TTFR): Flash v1 JIT total 70/337, TTFR 47/73; Potion JIT total 71/202, TTFR 45/61; Pro v1 JIT total 72/401, TTFR 45/62
- Current v2 models: Flash v2 (int8, 512d) default; Pro v2 = Flash v2 + Potion + lexical cascade
- Current v2 quality metrics: Flash v2 MRR@10 0.8340, Recall@10 0.925, 339.76 ms/1k (canonical). Pro v2 canonical: MRR@10 0.9209, Recall@10 0.97, 430.57 ms/1k.
- Current repo-scale E2E perf (`--dir .`, JIT, 3 queries x2 runs): Flash avg 16,838.65 ms; Auto avg 15,754.25 ms (see reports/v2_repo_latency_after_auto_index_fix_summary_2026-02-05_221919.json)
- Previous repo-scale E2E perf before rescue: Flash avg 17,153.32 ms; Auto avg 33,289.55 ms; Pro avg 32,985.66 ms (see reports/v2_repo_latency_summary_2026-02-05_213420.json)
- Delta achieved in this pass: Auto -52.68% average latency on large repo (33,289.55 -> 15,754.25 ms)
- CLI cleanup (2026-02-09): Removed Pro-gated commands (workstream, activity, ranking) from CLI; CLI now shows only core commands (search, index, config, daemon, cache, compliance, doctor, version, model)
- Recent regression fix (2026-02-05): Candidate document phase is now gated by query/path document signals to avoid unconditional binary parsing on code-only queries.
- Recent correctness fix (2026-02-05): `.env` removed from shared hardcoded skip list so env files are not silently excluded by walker entry-name filtering.
- Recent UX/runtime fix (2026-02-05): Streaming deck now resets per-search and stage updates are normalized; Auto mode no longer eagerly indexes Pro in Tauri path, improving perceived startup responsiveness for stream events.
- Recent landing/docs pass (2026-02-06): Hero + search pipeline storytelling was rebuilt with smoother scroll choreography, auth readability hardening landed for web/desktop, and docs were centralized with a full markdown inventory index.
- Feedback revision (2026-02-06): Pipeline demo now runs in scroll-guided mode without autonomous loops, hero demo remains visible/centered from initial hero state, diagrams were upgraded with richer motion semantics, docs were split into multi-page IA, and non-operational root markdown files were moved into `docs/archive/root`.
- Feedback revision (2026-02-06, pass 2): Removed hero radiating pulse effect, reduced hero demo height / widened layout for better proportion, stabilized controlled stage progression by pause-resume (no repeated scan/embed/rank restarts), simplified pipeline story block to text-forward copy, and upgraded docs readability with dedicated docs nav + long-form typography system.
- Feedback revision (2026-02-06, pass 3): Increased hero/pipeline scale after pass-2 overshrink, widened central demo and surrounding stage tiles, and raised baseline contrast/opacity for inactive and complete cards to improve readability.
- Feedback revision (2026-02-08, release hardening): Desktop now uses channel-only progressive event delivery, Pro access checks are unified across tabs, pricing overlay events are wired globally, release env validation was added (`tauri:build:prod`), footer `/terms` routing was corrected, and hero demo interactivity is restored in hero stage while remaining frozen in scroll-guided pipeline mode.
- Feedback revision (2026-02-08, prod entitlement hardening pass 2): Pro-mode search is now capability-gated in Rust (free users are forced to Flash for Auto and blocked from Pro), token-plan fallback no longer promotes free users to Pro in desktop UI, lease refresh/transfer confirm now issue subscription-bounded tokens, Firefox arc-noise parity fallback shipped, and release script `tauri:build` now enforces required prod env vars by default.
- Feedback revision (2026-02-08, prod entitlement hardening pass 3): startup Pro mode preference is no longer downgraded during transient entitlement load, desktop can fetch/install JWT verification public key at runtime (`/api/desktop/entitlement-key` + `set_entitlement_public_key`) to recover release builds missing compile-time key, entitlement refresh now actively re-syncs backend token/status, and landing demo loop/result visibility and Firefox noise parity were further stabilized.
- Feedback revision (2026-02-08, prod entitlement hardening pass 4): backend now permits Flash fallback when entitlement token sync is missing (while still blocking Pro mode), auth bootstrap now purges invalid cached tokens, Pro status polling is token-aware to avoid transient startup expiry mislabels, dropdown/sidebar/settings sizing was normalized for consistency, and golden harness path normalization removed Windows prefix false negatives.
- Feedback revision (2026-02-08, prod entitlement hardening pass 5): desktop JWT verification now refreshes runtime keys without sticky cache, landing/desktop logos were replaced with regenerated high-coverage icon packs (including tray/favicon/bundles), Firefox arc-noise intensity was reduced to match Chromium, hero demo handoff threshold was tuned to avoid frozen loop state when returning to hero, and local release packaging now passes end-to-end with MSI + NSIS artifacts built.
- Feedback revision (2026-02-08, search correctness patch): Flash/Auto desktop searches now run lexical preflight and force semantic eager indexing only when lexical hits are zero, restoring pure-semantic fallback while preserving low-latency lexical-first behavior.
- Feedback revision (2026-02-08, Phase 0.1 reliability patch): removed dead `index --watch` exposure, hid daemon `--status/--stop` from help, implemented `cache mode` persistence to config, implemented `index --clear` cache deletion, and implemented functional `cache rebuild` embedding warmup.
- Feedback revision (2026-02-08, Phase 0-2 closure pass): added doctor diagnostics end-to-end (CLI + desktop), shipped settings matrix automation + CI workflow, implemented encrypted activity/workstream persistence with autosave, shipped personal ranking (pin/ignore/not-relevant + explain path), fixed workstream persistence path mismatch, and validated release packaging (MSI + NSIS) plus golden/contract/settings matrix/doctor sweeps.
- Feedback revision (2026-02-08, cache truthfulness hardening): CLI search now respects persisted cache mode (unless explicitly overridden), cache stats are model-aware with fallback detection for mixed fingerprints, and cache clear/index-clear now reliably clear ADS/xattr plus LMDB fallback state.
- Cache correctness update (2026-02-08): embedding caches are now validated by both file hash and model fingerprint; edited files and model switches trigger recomputation automatically.
- Top bottlenecks (ranked): Directory walk/candidate generation on large trees; ripgrep scan I/O; semantic embedding on cold runs; completion-path evidence extraction tail
- Open risks / unknowns: Multilingual routing remains unevaluated (ES/FR/DE slice pending); remaining golden retrieval mismatches (`q1_financial_report`, `q2_financial_report`, `privacy_policy`, `config_json`, `todo_refine`, `logs_streamed`) require ranking/candidate investigation; lexical-preflight branch should be profiled on very large trees to quantify preflight overhead; cache rebuild still precomputes sequentially (`workers` currently informational only).
- Next 3 actions: (1) run multilingual ES/FR/DE quality slice for decision gate, (2) investigate remaining golden retrieval mismatches, (3) profile lexical-preflight overhead on large trees

---

## Objectives
1) Flash v2: faster + equal/better relevance than Flash v1
2) Pro v2: true Pro (fusion/cascade or single model distill) beats current Pro fusion or matches with lower latency
3) End-to-end search: reduce p95 materially; improve perceived latency
4) Naming: eliminate "pro-v1" confusion; make IDs canonical
5) Ship: docs + manifests + HF upload plan

---

## Workstreams
### WS1 - Reality map & naming audit
- [x] Map current defaults (CLI/UI/registry)
- [x] Identify where "Pro" is forced
- [x] Locate any "flash-v2" that is actually v1 renamed
- [x] Draft naming migration plan

### WS2 - Baseline measurement (real models)
- [x] Build release
- [x] Run canonical evals (Flash/Potion/Pro fusion/legacy pro-v1)
- [x] Run perf bench/profile
- [x] Store outputs under /reports + /models/lab

### WS3 - Bottlenecks & pipeline speedups
- [x] Instrument stage timings if missing
- [x] Profile ranking vs embedding vs ripgrep vs candidate gen
- [x] Implement top-ROI changes (ranking top-k, cached file list reuse, Pro v2 cascade)

### WS4 - Flash v2 model generation
- [x] Candidate strategy list (>=6)
- [x] Train/bake-off
- [x] Select winner, export, document

### WS5 - Pro v2 definition + implementation
- [x] Decide: fusion v2 vs single model distill
- [x] Implement cascade/fusion improvements
- [x] Re-eval and finalize (smoke)

### WS6 - Multilingual decision
- [ ] ES/FR/DE eval slice
- [ ] Decide route/optional models/backlog

### WS7 - Shipping
- [x] Update docs + changelogs + final writeup
- [x] Update installer/manifests
- [x] HF upload playbook
- [x] Verify CLI+UI

---

## Exit criteria
- [ ] Flash v2 + Pro v2 integrated and selectable correctly
- [ ] Benchmarks: before/after captured
- [ ] Docs updated, naming clean
- [ ] HF plan written

---

## STATE SNAPSHOT
- Date: 2026-02-10
- Current baseline numbers:
  - Flash v1: MRR@10 0.8399, Recall@10 0.93, 423.09 ms/1k
  - Pro fusion baseline: MRR@10 0.9233, Recall@10 0.97 (real_corpus_v2)
- Current best v2 numbers:
  - Flash v2: MRR@10 0.8340, Recall@10 0.925, 339.76 ms/1k
  - Pro v2 fusion: MRR@10 0.9209, Recall@10 0.97, 430.57 ms/1k
- Current bottleneck ranking:
  1. Candidate generation and directory walk on large trees
  2. Ripgrep scan I/O on broad queries
  3. Semantic embedding cold-path startup and tail extraction
- Current pass validation (2026-02-10):
  - `cargo test -q`: PASS (`466 passed; 0 failed; 6 ignored`)
  - `npm --prefix ui run build`: PASS
  - `npm --prefix ixos-site run build`: PASS
  - `python scripts/run_settings_matrix.py`: PASS (`reports/settings_matrix_2026-02-10.md`)
  - `cargo run --quiet --bin ixos -- doctor --json`: PASS (`8 pass; 0 warn; 0 fail; 2 info`)
- What is next (top 3 tasks):
  1. Complete explicit E2E auth/billing/lease transfer matrix run and capture a dedicated report
  2. Add deeper landing Strategy section lock tests on low-end hardware profiles
  3. Expand move recommendation feedback loop (accept/dismiss) and add persistence-backed evaluation hooks
