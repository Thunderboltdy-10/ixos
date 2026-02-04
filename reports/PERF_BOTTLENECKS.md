# PERF_BOTTLENECKS.md

**Date:** 2026-02-03

**Baseline sources (2026-02-02):**
- `reports/baseline_profile_flash_2026-02-02.json`
- `reports/baseline_profile_potion_2026-02-02.json`
- `reports/baseline_profile_prov1_2026-02-02.json`

**After sources (2026-02-03):**
- `reports/profile_flashv2_2026-02-03.json`
- `reports/profile_potion_2026-02-03.json`

---

## Baseline Summary (JIT)

| Model | TTFR p50 / p95 (ms) | Total p50 / p95 (ms) | Note |
| --- | --- | --- | --- |
| Flash v1 | 47 / 73 | 70 / 337 | Legacy default | 
| Potion | 45 / 61 | 71 / 202 | Fast baseline |
| Pro v1 | 45 / 62 | 72 / 401 | Legacy, slow |

## After Summary (JIT)

| Model | TTFR p50 / p95 (ms) | Total p50 / p95 (ms) | Note |
| --- | --- | --- | --- |
| Flash v2 | 46 / 68 | 132 / 315 | New default (int8) |
| Potion | 51 / 61 | 70 / 195 | Fast baseline |

---

## Stage Breakdown (After)

### Flash v2 (p50 / p95)

| Stage | p50 (ms) | p95 (ms) |
| --- | --- | --- |
| Directory walk | 68.0 | 68.0 |
| Path scoring | 0.0 | 0.75 |
| Ripgrep scan | 43.5 | 54.5 |
| Candidate selection | 1.5 | 7.5 |
| Embedding | 12.5 | 81.25 |
| Ranking | 0.5 | 70.0 |

### Potion (p50 / p95)

| Stage | p50 (ms) | p95 (ms) |
| --- | --- | --- |
| Directory walk | 67.0 | 67.0 |
| Path scoring | 0.0 | 0.75 |
| Ripgrep scan | 47.5 | 53.75 |
| Candidate selection | 1.5 | 7.25 |
| Embedding | 5.0 | 35.5 |
| Ranking | 0.0 | 38.0 |

---

## Delta Highlights

1) **Ranking P95 reduced** (Flash: ~111ms -> ~70ms) after top-K selection.
2) **Ripgrep P95 improved slightly** (~58.8ms -> ~54.5ms), still a major I/O cost.
3) **Directory walk remains constant** (~68ms), still dominant on warm runs.
4) **Embedding spikes persist** (Flash P95 ~81ms), but reduced total P95 vs baseline.

---

## Decision
- Keep top-K ranking and cached file list reuse. Next targets: directory walk skip on unchanged roots and further embedding batching/caching.
