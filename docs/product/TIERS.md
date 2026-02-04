# Search Modes: Fast vs Accurate

> **Update 2026-01-27:** Pro features are now free. Marketing simplified to two concepts: **Fast** and **Accurate**.

This document defines the user-facing search modes for Ixos.

## Fast Mode (Default)

**What it is:** Single-embedder semantic rerank on top of the lexical funnel.

**Pipeline:**
```
Query -> Lexical funnel -> Flash embedder rerank -> Secure ranking -> Evidence
```

**Performance (canonical):**
| Metric | Value |
|--------|-------|
| MRR@10 | 0.8340 |
| Recall@10 | 0.925 |
| Latency | ~339.76 ms/1k candidates |
| Peak RAM | ~45 MB |

**Default model:** `ixos-flash-v2` (512d, int8)

**Use when:**
- Speed matters most
- Working with large file counts
- Typical desktop searches

## Accurate Mode

**What it is:** Dual-embedder fusion pipeline combining Flash + Potion + lexical signals.

**Pipeline:**
```
Query -> Lexical funnel -> Flash rerank -> Auto routing check
    -> [if ambiguous] Pro rerank (Potion) -> Fusion blend
    -> Secure ranking -> Evidence
```

**Performance (canonical):**
| Metric | Value | vs Fast |
|--------|-------|---------|
| MRR@10 | 0.9209 | +10.4% |
| Recall@10 | 0.97 | +4.9% |
| Latency | ~430.57 ms/1k candidates | +27% |
| Peak RAM | ~102 MB | +57% |

**Fusion weights (learned):**
| Signal | Weight |
|--------|--------|
| Flash semantic | 0.2672 |
| Potion semantic | 0.2725 |
| Lexical match | 0.4602 |
| Directory prior | 0.0000 |

**Default models:**
- Flash: `ixos-flash-v2` (512d, int8)
- Pro v2 (fusion): `ixos-pro-v2` (Flash v2 + Potion int8 + lexical)

**Use when:**
- Quality matters most
- Searching ambiguous or short queries
- Working with specialized terminology

## Auto Mode (Default Behavior)

Auto mode dynamically routes to Accurate only when needed, keeping most queries at Fast latency.

**Routing triggers (any of):**
- Score gap < 0.05 (top results too close)
- Lexical match ratio < 0.15 (poor keyword overlap)
- Query length <= 2 words (ambiguous)
- Score entropy > 0.9 (flat distribution)

**Pro top-K:** 120 candidates refined when triggered

This provides Accurate wins on difficult queries without Accurate latency on easy ones.

## Advanced: Eco Mode (Hidden)

For battery-constrained or low-end devices, available under Advanced settings.

**Pipeline:** Same as Fast, with smaller model

**Performance:**
| Metric | ixos-flash-v4-int8-192 | vs Fast |
|--------|------------------------|---------|
| MRR@10 | 0.7950 | -5.3% |
| Latency | ~389 ms/1k | -15% |
| Peak RAM | ~60 MB | -68% |

**Use when:**
- On battery power
- Low-end hardware (4GB RAM)
- Extremely large corpora

## Model Selection Guide

| Scenario | Recommended Mode | Why |
|----------|------------------|-----|
| Desktop daily use | Auto (default) | Best balance |
| Code search | Fast | Speed + good quality |
| Legal/medical docs | Accurate | Precision critical |
| Laptop on battery | Eco (advanced) | Power efficiency |
| >10k files | Fast or Eco | Memory constraints |

## Ship Configuration Summary

| Mode | Embedder(s) | MRR@10 | Latency | RAM |
|------|-------------|--------|---------|-----|
| **Fast** | Flash-v2 | 0.834 | ~340ms | ~45MB |
| **Accurate** | Pro v2 (Flash-v2 + Potion) | 0.921 | ~431ms | ~102MB |
| **Auto** | Adaptive | 0.834-0.921 | ~340-431ms | ~45-102MB |
| **Eco** | Flash-v4-192 | 0.80 | ~389ms | ~60MB |

## Local-First Trust

All modes run entirely on-device. No remote inference, no data collection.

## Canonical Benchmarks

See `models/lab/CANONICAL_RESULTS.md` for verified, reproducible metrics.
