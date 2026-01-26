# Ixos Model Lab Plan (2026-01-26)

## Current Map (from docs + lab outputs)
- Flash: `ixos-flash-v2` (Model2Vec, 512d, float16) is default; preloaded via Tauri `preload_model`.
- Pro: not a stronger embedder today; quality comes from fusion + TinyBERT reranker on top of Flash; Auto routes on gap/lexical/entropy/short queries.
- Bottlenecks: P95 JIT shows ranking (~2934ms) and embedding (~839ms) dominate; TTFR ~288ms. Ripgrep + directory walk also significant.
- Eval suites: `scripts/ixos_eval.py` synthetic_ambiguity_v1 + real_corpus_v2; perf harness in `bench/` (PERF_JIT/CACHE + perf_suite).

## Short Plan
1. Reproduce baseline metrics with `scripts/ixos_eval.py --suite both` and capture run artifacts in `models/lab/`.
2. Flash speed wins: test smaller dims + quantized variants + faster dot products/batching; record Pareto improvements.
3. Pro quality wins: evaluate stronger student distill or cheaper reranker/fusion routing; quantify latency tradeoffs.
4. Documentation + licensing: model cards, PROCESS, TIERS, STRATEGY, and experiment log/leaderboard updates.
