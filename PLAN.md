# PLAN.md - Ixos Flash v2 + Pro v2 + Search vNext

## STATE SNAPSHOT (update frequently)
- Date: 2026-02-06
- Current baseline models: Flash v1 (legacy), Pro fusion baseline = Flash v1 + Potion + lexical (see models/lab/results_baseline_fusion_2026-02-02.json)
- Baseline quality (MRR@10 / Recall@10): Flash v1 0.8399 / 0.93; Potion 0.8073 / 0.90; Pro v1 0.7354 / 0.855; Pro fusion 0.9233 / 0.97 (real_corpus_v2)
- Baseline perf (p50/p95, ms/1k, TTFR): Flash v1 JIT total 70/337, TTFR 47/73; Potion JIT total 71/202, TTFR 45/61; Pro v1 JIT total 72/401, TTFR 45/62
- Current v2 models: Flash v2 (int8, 512d) default; Pro v2 = Flash v2 + Potion + lexical cascade
- Current v2 quality metrics: Flash v2 MRR@10 0.8340, Recall@10 0.925, 339.76 ms/1k (canonical). Pro v2 canonical: MRR@10 0.9209, Recall@10 0.97, 430.57 ms/1k.
- Current repo-scale E2E perf (`--dir .`, JIT, 3 queries x2 runs): Flash avg 16,838.65 ms; Auto avg 15,754.25 ms (see reports/v2_repo_latency_after_auto_index_fix_summary_2026-02-05_221919.json)
- Previous repo-scale E2E perf before rescue: Flash avg 17,153.32 ms; Auto avg 33,289.55 ms; Pro avg 32,985.66 ms (see reports/v2_repo_latency_summary_2026-02-05_213420.json)
- Delta achieved in this pass: Auto -52.68% average latency on large repo (33,289.55 -> 15,754.25 ms)
- Recent regression fix (2026-02-05): Candidate document phase is now gated by query/path document signals to avoid unconditional binary parsing on code-only queries.
- Recent correctness fix (2026-02-05): `.env` removed from shared hardcoded skip list so env files are not silently excluded by walker entry-name filtering.
- Recent UX/runtime fix (2026-02-05): Streaming deck now resets per-search and stage updates are normalized; Auto mode no longer eagerly indexes Pro in Tauri path, improving perceived startup responsiveness for stream events.
- Recent landing/docs pass (2026-02-06): Hero + search pipeline storytelling was rebuilt with smoother scroll choreography, auth readability hardening landed for web/desktop, and docs were centralized with a full markdown inventory index.
- Feedback revision (2026-02-06): Pipeline demo now runs in scroll-guided mode without autonomous loops, hero demo remains visible/centered from initial hero state, diagrams were upgraded with richer motion semantics, docs were split into multi-page IA, and non-operational root markdown files were moved into `docs/archive/root`.
- Feedback revision (2026-02-06, pass 2): Removed hero radiating pulse effect, reduced hero demo height / widened layout for better proportion, stabilized controlled stage progression by pause-resume (no repeated scan/embed/rank restarts), simplified pipeline story block to text-forward copy, and upgraded docs readability with dedicated docs nav + long-form typography system.
- Feedback revision (2026-02-06, pass 3): Increased hero/pipeline scale after pass-2 overshrink, widened central demo and surrounding stage tiles, and raised baseline contrast/opacity for inactive and complete cards to improve readability.
- Feedback revision (2026-02-08, release hardening): Desktop now uses channel-only progressive event delivery, Pro access checks are unified across tabs, pricing overlay events are wired globally, release env validation was added (`tauri:build:prod`), footer `/terms` routing was corrected, and hero demo interactivity is restored in hero stage while remaining frozen in scroll-guided pipeline mode.
- Feedback revision (2026-02-08, prod entitlement hardening pass 2): Pro-mode search is now capability-gated in Rust (free users are forced to Flash for Auto and blocked from Pro), token-plan fallback no longer promotes free users to Pro in desktop UI, lease refresh/transfer confirm now issue subscription-bounded tokens, Firefox arc-noise parity fallback shipped, and release script `tauri:build` now enforces required prod env vars by default.
- Top bottlenecks (ranked): Directory walk/candidate generation on large trees; ripgrep scan I/O; semantic embedding on cold runs; completion-path evidence extraction tail
- Open risks / unknowns: Multilingual routing remains unevaluated (ES/FR/DE slice pending); Auto quality impact from stricter refinement gate needs focused relevance eval on long-tail queries
- Next 3 actions: (1) Run packaged desktop smoke with production env (`npm run tauri:build`) and verify Pro/free/transfer/refresh flows end-to-end, (2) capture updated desktop auth/dropdown/settings visuals + Firefox arc-noise parity screenshot evidence in `/reports`, (3) execute targeted security cleanup backlog from `npm audit` (Next.js/Nodemailer advisories) before release cut.

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
