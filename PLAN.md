# PLAN.md - Ixos Flash v2 + Pro v2 + Search vNext

## STATE SNAPSHOT (update frequently)
- Date: 2026-02-05
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
- Top bottlenecks (ranked): Directory walk/candidate generation on large trees; ripgrep scan I/O; semantic embedding on cold runs; completion-path evidence extraction tail
- Open risks / unknowns: Multilingual routing remains unevaluated (ES/FR/DE slice pending); Auto quality impact from stricter refinement gate needs focused relevance eval on long-tail queries
- Next 3 actions: (1) Run Tauri manual smoke on large repo and capture streaming stage/timing evidence in `/reports`, (2) run quality A/B for new Auto gate on real queries, (3) decouple evidence extraction from blocking CLI completion path

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
