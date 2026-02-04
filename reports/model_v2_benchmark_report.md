# Model v2 Benchmark Report

## Baseline (Before) - 2026-02-02

### Quality (real_corpus_v2, 200 docs / 200 queries)
Source: `models/lab/results_baseline_2026-02-02.json`

| Model ID | MRR@10 | Recall@10 | Latency ms/1k | Notes |
| --- | --- | --- | --- | --- |
| ixos-flash-v1 (legacy) | 0.8399 | 0.93 | 423.09 | Baseline Flash (pre-rename) |
| potion-base-8m-int8 | 0.8073 | 0.90 | 219.18 | Fast baseline |
| ixos-pro-v1 | 0.7354 | 0.855 | 1436.50 | Legacy Pro (slow + worse quality) |

### Pro Fusion Baseline (Flash v1 + Potion + lexical)
Source: `models/lab/results_baseline_fusion_2026-02-02.json`

| Suite | MRR@10 | Recall@10 | Latency ms/1k | Weights (flash/pro/lex/dir) |
| --- | --- | --- | --- | --- |
| real_corpus_v2 | 0.9233 | 0.97 | 581.68 | 0.2697 / 0.2672 / 0.4631 / 0.0000 |
| synthetic_ambiguity_v1 | 0.9833 | 1.00 | 242.32 | 0.2402 / 0.3415 / 0.1754 / 0.2429 |

### Performance (end-to-end, JIT, 1036 files)
Sources: `reports/baseline_profile_*_2026-02-02.json`

| Model | TTFR p50 / p95 (ms) | Total p50 / p95 (ms) |
| --- | --- | --- |
| Flash v1 | 47 / 73 | 70 / 337 |
| Potion | 45 / 61 | 71 / 202 |
| Pro v1 | 45 / 62 | 72 / 401 |

---

## V2 Results (After) - 2026-02-03

### Flash v2 Canonical (real_corpus_v2, 200/200)
Source: `models/lab/results_flash_v2_2026-02-03.json`

| Suite | MRR@10 | Recall@10 | Latency ms/1k |
| --- | --- | --- | --- |
| real_corpus_v2 | 0.8340 | 0.925 | 339.76 |
| synthetic_ambiguity_v1 | 0.9444 | 1.00 | 111.26 |

### Pro v2 Fusion (Flash v2 + Potion) - Canonical
Source: `models/lab/results_v2_fusion_flashv2_2026-02-03.json`

| Suite | MRR@10 | Recall@10 | Latency ms/1k | Weights (flash/pro/lex/dir) |
| --- | --- | --- | --- | --- |
| real_corpus_v2 | 0.9209 | 0.97 | 430.57 | 0.2672 / 0.2725 / 0.4602 / 0.0000 |
| synthetic_ambiguity_v1 | 0.9833 | 1.00 | 131.83 | 0.2361 / 0.3435 / 0.1771 / 0.2433 |

### Performance (end-to-end, JIT, 1036 files)
Sources: `reports/profile_flashv2_2026-02-03.json`, `reports/profile_potion_2026-02-03.json`

| Model | TTFR p50 / p95 (ms) | Total p50 / p95 (ms) |
| --- | --- | --- |
| Flash v2 | 46 / 68 | 132 / 315 |
| Potion | 51 / 61 | 70 / 195 |

### Scale Bench (Auto, 50 queries)
Sources: `reports/scale_bench.json`, `reports/SCALE_BENCH.md`

- Directory: `C:\Users\pablo\Downloads` (322,184 files, 87,634.93 MB)
- TTFR p50/p95: 87 / 371 ms
- Total p50/p95: 1065 / 6520 ms
- Failures: 0

---

## Delta Summary (Flash v1 → Flash v2, real_corpus_v2)

| Metric | Flash v1 | Flash v2 | Delta |
| --- | --- | --- | --- |
| MRR@10 | 0.8399 | 0.8340 | -0.0059 (-0.7%) |
| Recall@10 | 0.93 | 0.925 | -0.005 |
| Latency ms/1k | 423.09 | 339.76 | -83.33 (-19.7%) |
| Model size (safetensors) | 44.46 MB | 16.58 MB | -62.7% |

## Delta Summary (Pro baseline → Pro v2, real_corpus_v2)

| Metric | Pro baseline (Flash v1+Potion) | Pro v2 (Flash v2+Potion) | Delta |
| --- | --- | --- | --- |
| MRR@10 | 0.9233 | 0.9209 | -0.0024 (-0.3%) |
| Recall@10 | 0.97 | 0.97 | 0.00 |
| Latency ms/1k | 581.68 | 430.57 | -151.11 (-26.0%) |

---

## Repro Commands

```bash
# Build release
cargo build --release

# Baseline evals (Flash v1 / Potion / Pro v1)
python scripts/ixos_eval.py --suite both \
  --only-ids ixos-flash-v1,potion-base-8m-int8,ixos-pro-v1 \
  --output models/lab/results_baseline_2026-02-02.json \
  --csv models/lab/results_baseline_2026-02-02.csv

# Flash v2 canonical
python scripts/ixos_eval.py --suite both \
  --only-ids ixos-flash-v2 \
  --output models/lab/results_flash_v2_2026-02-03.json \
  --csv models/lab/results_flash_v2_2026-02-03.csv

# Pro v2 fusion (Flash v2 + Potion)
python scripts/ixos_eval.py --suite both \
  --only-ids ixos-flash-v2,potion-base-8m-int8 \
  --fusion learned \
  --flash-id ixos-flash-v2 \
  --pro-id potion-base-8m-int8 \
  --output models/lab/results_v2_fusion_flashv2_2026-02-03.json \
  --csv models/lab/results_v2_fusion_flashv2_2026-02-03.csv

# Perf profiles
cargo run --release --bin ixos-profile -- --dir dataset --runs 6 --cache-mode jit --model ixos-flash-v2 --out reports/profile_flashv2_2026-02-03.json --slow-threshold-ms 1500 --slow-out reports/slow_flashv2_2026-02-03.json
cargo run --release --bin ixos-profile -- --dir dataset --runs 6 --cache-mode jit --model potion --out reports/profile_potion_2026-02-03.json --slow-threshold-ms 1500 --slow-out reports/slow_potion_2026-02-03.json

# Scale bench (auto-discover)
python scripts/scale_bench.py --search-mode auto --cache-mode jit --model ixos-flash-v2 --pro-model ixos-pro-v2 --max-queries 50
```
