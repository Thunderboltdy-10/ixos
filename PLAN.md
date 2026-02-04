# PLAN.md - Ixos Flash v2 + Pro v2 + Search vNext

## STATE SNAPSHOT (update frequently)
- Date: 2026-02-03
- Current baseline models: Flash v1 (legacy), Pro fusion baseline = Flash v1 + Potion + lexical (see models/lab/results_baseline_fusion_2026-02-02.json)
- Baseline quality (MRR@10 / Recall@10): Flash v1 0.8399 / 0.93; Potion 0.8073 / 0.90; Pro v1 0.7354 / 0.855; Pro fusion 0.9233 / 0.97 (real_corpus_v2)
- Baseline perf (p50/p95, ms/1k, TTFR): Flash v1 JIT total 70/337, TTFR 47/73; Potion JIT total 71/202, TTFR 45/61; Pro v1 JIT total 72/401, TTFR 45/62
- Current v2 models: Flash v2 (int8, 512d) default; Pro v2 = Flash v2 + Potion + lexical cascade
- Current v2 metrics: Flash v2 MRR@10 0.8340, Recall@10 0.925, 339.76 ms/1k (canonical). Pro v2 canonical: MRR@10 0.9209, Recall@10 0.97, 430.57 ms/1k.
- Perf after (JIT): Flash v2 total p50/p95 132/315, TTFR 46/68; Potion total 70/195, TTFR 51/61
- Scale bench: 50 queries on C:\\Users\\pablo\\Downloads (322,184 files, 87.6 GB), TTFR p50/p95 87/371, total p50/p95 1065/6520
- Top bottlenecks (ranked): Directory walk overhead; ripgrep scan I/O; embedding spikes on cold runs; ranking P95 (improved)
- Open risks / unknowns: Multilingual routing remains unevaluated (ES/FR/DE slice pending)
- Next 3 actions: (1) Final doc/changelog pass, (2) run cargo fmt, (3) finalize final report + cleanup

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
