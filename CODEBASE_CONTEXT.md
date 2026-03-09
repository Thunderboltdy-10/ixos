# CODEBASE_CONTEXT.md
**Curated AI onboarding index — last updated 2026-03-05**

This file is the entry point for any AI assistant helping with Ixos development. Read this first, then pull the files listed below on-demand. Files are grouped by purpose and ranked within each group by usefulness.

---

## What is Ixos?

Ixos is a **privacy-first semantic file search library** written in Rust, with a cross-platform CLI and a Tauri desktop app. Core differentiators:
- HMAC-signed embedding cache stored in NTFS ADS (Windows) or xattr (Unix) — zero external database
- Model2Vec embeddings (flash-v2 / potion-8m-int8) — fast, quantized, local-only
- Adaptive hybrid search (lexical + semantic) with degradation-attack detection
- Configurable timing attack protection, mlock-backed secure buffers, Ed25519 attestation
- EU AI Act / GDPR / CCPA compliance module built-in
- Pro tier: multi-model fusion (Flash v2 + Potion + lexical cascade), personal ranking, workstreams
- Free tier: Flash v2 single-model search
- Distribution: CLI binary (Windows/Mac/Linux) + Tauri desktop app + ixos-site (Next.js landing)

Current status: V2 shipped (Flash v2 default, Pro v2 fusion). Working toward V3 (novelty differentiation).

---

## Top 25 Context Files

### TIER 1 — Always load these first (core state + architecture)

| # | File | What it gives you |
|---|------|-------------------|
| 1 | `CLAUDE.md` | Build commands, CLI usage, module map, key design patterns, implementation status. Start here. |
| 2 | `AGENTS.md` | Repo conventions, coding style, commit rules, test commands. Essential for any code changes. |
| 3 | `PLAN.md` | Live state snapshot: current model metrics, perf baselines, recent decisions, what changed and why. Updated frequently. |
| 4 | `FEATURE_INVENTORY.md` | Source-of-truth feature checklist mapped to source file paths. Use to find where any feature lives. |
| 5 | `Cargo.toml` | Workspace layout and all dependencies with versions. Shows what's available to use. |

### TIER 2 — Architecture, roadmap, and product decisions

| # | File | What it gives you |
|---|------|-------------------|
| 6 | `docs/Ixos_Master_Roadmap.md` | Full phased roadmap (P0–P3+), completion status, what's next. |
| 7 | `CODEX.md` | Operating manual for autonomous agents (Ralph); defines truthfulness contract, loop structure, output format. |
| 8 | `DECISIONS.md` | Full decision log — every major architectural choice with rationale. ~1000 lines. Use when asking "why does X work this way?" |
| 9 | `docs/ARCHITECTURE_AUDIT_2026-02.md` | February 2026 audit identifying architectural gaps, tech debt, and priorities. |
| 10 | `docs/capability-matrix.md` | Feature × tier matrix (Free vs Pro). Shows exactly what's gated behind Pro. |

### TIER 3 — Performance benchmarks and model data

| # | File | What it gives you |
|---|------|-------------------|
| 11 | `reports/model_v2_benchmark_report.md` | Full V2 model benchmark: MRR@10, Recall@10, latency for Flash v2, Potion, Pro v2. Ground truth numbers. |
| 12 | `bench/results/FINAL_FLASH_JIT.md` | Final optimized Flash v2 + JIT bench results (latency, throughput). |
| 13 | `bench/results/FINAL_POTION_JIT.md` | Final optimized Potion + JIT bench results. |
| 14 | `reports/PERF_BOTTLENECKS.md` | Identified performance bottlenecks and optimization strategies. |
| 15 | `reports/SCALE_BENCH.md` | Large-scale (big root) benchmark results and analysis. |

### TIER 4 — Engineering references

| # | File | What it gives you |
|---|------|-------------------|
| 16 | `docs/engineering/SEARCH_MODE_FALLBACKS.md` | How Auto/Flash/Pro modes fall back under different conditions. Critical for search correctness. |
| 17 | `docs/modeling/RANKING_OPTIMIZATIONS.md` | Deep dive on hybrid ranking, centroid boost, reranking strategies. |
| 18 | `docs/engineering/BENCHMARKING.md` | How to run benchmarks, interpret results, perf budget rules. |
| 19 | `reports/security_hardening_and_recommendations_2026-02-10.md` | Security audit findings and remaining hardening tasks. |
| 20 | `docs/product/TIERS.md` | Detailed tier specification: what each tier includes, Pro gating logic, entitlement flow. |

### TIER 5 — Novelty research and future directions

| # | File | What it gives you |
|---|------|-------------------|
| 21 | `reports/RELEASE_READINESS_2026-03-01.md` | Current release readiness assessment (most recent). Shows what's blocking and what's done. |
| 22 | `reports/V2_FINAL_WRITEUP.md` | Complete V2 retrospective: what shipped, what worked, what didn't. |
| 23 | `reports/ralph_v5/FINAL_REPORT.md` | Most recent Ralph novelty-hunt final report — what features were considered, what survived evaluation. |
| 24 | `reports/innovation_sprint_vnext/FINAL.md` | Latest innovation sprint final outcomes — winning directions, implementation recommendations. |
| 25 | `docs/research/final_best_direction.md` | Synthesized recommendation from research: best differentiation direction for V3+. |

---

## Key Source Code Entry Points

For context, these are the most important source files (not in the 25 above, but frequently referenced):

- `src/storage/mod.rs` — EmbeddingCache trait, auto-detection logic
- `src/ixos_rank/hybrid_engine.rs` — Adaptive hybrid search, attack detection
- `src/ixos_rank/secure_ranker.rs` — Integrity-verified ranking
- `src/ixos_embed/secure_embedder.rs` — Timing protection, embedding pipeline
- `src/journalist_mode.rs` — Maximum privacy mode
- `src/cli/commands.rs` — All CLI commands
- `src/compliance/` — EU AI Act / GDPR / CCPA modules
- `src/attestation/mod.rs` — Ed25519 attestation service

---

## Repository Structure (post-cleanup)

```
Ixos/
├── CLAUDE.md              # Dev guidance (BUILD HERE)
├── AGENTS.md              # Repo conventions
├── CODEX.md               # Agent operating manual
├── PLAN.md                # Live state snapshot
├── DECISIONS.md           # Decision history
├── RUNLOG.md              # Append-only execution log
├── FEATURE_INVENTORY.md   # Feature → source path map
├── CODEBASE_CONTEXT.md    # This file
├── Cargo.toml / Cargo.lock
├── package.json           # For ixos-site (Next.js)
├── src/                   # Core Rust library
├── src-tauri/             # Tauri desktop app (Rust backend & bundling)
├── ui/                    # Desktop app frontend (React + Vite)
├── packages/              # Shared logic and UI components
│   ├── ixos-ui/           # Core UI component library
│   └── ui/                # Shared utilities and hooks
├── ixos-site/             # Next.js landing page
├── ixos-pro/              # Pro module
├── bench/                 # Benchmark suite
│   └── results/           # Benchmark results (FINAL_* = canonical)
├── benches/               # Rust criterion benchmarks
├── docs/
│   ├── Ixos_Master_Roadmap.md
│   ├── ARCHITECTURE_AUDIT_2026-02.md
│   ├── CHANGELOG_MODELS.md / CHANGELOG_SEARCH.md
│   ├── capability-matrix.md / flow-map.md / gaps.md
│   ├── agents/            # Agent skills and workflows
│   ├── engineering/       # Search fallbacks, benchmarking, etc.
│   ├── modeling/          # Ranking optimizations, perf profiles
│   ├── models/            # Per-model spec sheets
│   ├── product/           # Tiers, desktop app, CLI reliability
│   ├── research/          # Novelty research and directions
│   ├── licensing/         # Licensing strategy
│   └── archive/           # Historical docs (don't update these)
├── reports/
│   ├── RELEASE_READINESS_2026-03-01.md   ← most current
│   ├── V2_FINAL_WRITEUP.md
│   ├── model_v2_benchmark_report.md
│   ├── PERF_BOTTLENECKS.md
│   ├── REALITY_MAP.md
│   ├── RESEARCH_NOTES.md
│   ├── settings_matrix_2026-03-03.md     ← most current settings
│   ├── ralph_v3/ v4/ v5/  # Novelty hunt final summaries only
│   ├── innovation_sprint/  # Sprint architecture + final
│   └── innovation_sprint_vnext/  # Latest sprint final
├── models/                # Model weights (do not commit large files)
├── scripts/               # Python utility scripts
├── media/                 # Reference videos (competitor products)
├── corpus_tiny/           # Small test dataset
├── corpus_medium/         # Medium test dataset
├── corpus_edgecases/      # Edge case test data
├── golden_data/           # Golden reference results
├── tests/                 # Integration tests
├── release/               # Release checklist
├── features/              # Feature flags registry
└── _trash/                # ← DELETE THIS FOLDER (cleanup artifacts)
```

---

## Current Performance Baselines (V2, as of 2026-02-09)

| Model | MRR@10 | Recall@10 | p50 ms/1k | p95 ms/1k |
|-------|--------|-----------|-----------|-----------|
| Flash v2 (default) | 0.8340 | 0.925 | ~70 | ~337 |
| Potion 8m-int8 | 0.8073 | 0.90 | ~71 | ~202 |
| Pro v2 (fusion) | 0.9209 | 0.970 | ~430 | — |

Repo-scale E2E (large repo, JIT): Flash avg ~16.8s, Auto avg ~15.7s

---

## Quick Decision Guide

| Question | File to read |
|----------|-------------|
| "What does this module do?" | `CLAUDE.md` → module structure section |
| "Why was X implemented this way?" | `DECISIONS.md` |
| "What's the current quality bar?" | `reports/model_v2_benchmark_report.md` |
| "What's left to build?" | `docs/Ixos_Master_Roadmap.md` |
| "What's blocking release?" | `reports/RELEASE_READINESS_2026-03-01.md` |
| "What should we build next?" | `reports/innovation_sprint_vnext/FINAL.md` + `docs/research/final_best_direction.md` |
| "How does search fallback work?" | `docs/engineering/SEARCH_MODE_FALLBACKS.md` |
| "What's in Pro vs Free?" | `docs/capability-matrix.md` + `docs/product/TIERS.md` |
| "What are the perf bottlenecks?" | `reports/PERF_BOTTLENECKS.md` |
| "How do I run benchmarks?" | `docs/engineering/BENCHMARKING.md` |

---

## Desktop App Build Chain

The Ixos Desktop App is built using **Tauri**, which bridges the Rust backend with a web-based frontend.

- **Frontend (`ui/`)**: A React + Vite application that serves as the user interface. It consumes shared components from `packages/` and communicates with the Rust backend via the Tauri IPC bridge.
- **Backend (`src-tauri/`)**: A Rust crate that manages the native OS window, system tray, and provides access to the core Ixos library (`src/`).
- **Build Process**:
  1. The frontend is compiled into static assets (`npm run build` within `ui/` → `ui/dist`).
  2. The Tauri CLI (`tauri build`) compiles the Rust backend and embeds the static assets into a native binary.
  3. The result is a platform-specific installer (e.g., `.exe`, `.msi` on Windows) located in `src-tauri/target/release/bundle`.

To add a new desktop app to the project, you would typically create a new folder for the frontend, add a corresponding `src-tauri` configuration, and register the new workspace in the root `package.json`.
