# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the Rust core library and CLI (`src/main.rs`, `src/lib.rs`) plus domain modules (e.g., `src/ixos_rank`, `src/ixos_embed`, `src/security`).
- `src-tauri/` holds the Tauri desktop shell (Rust commands under `src-tauri/src/` plus `tauri.conf.json`).
- `ui/` is the Vite + React front-end for the desktop app (`ui/src/`).
- `landing/` is the Next.js marketing site (`landing/app`, `landing/components`, `landing/public`).
- `scripts/` includes Python and PowerShell utilities for model work and deployment.

## Build, Test, and Development Commands
- `cargo build` builds the Rust workspace (core + Tauri).
- `cargo test` runs Rust unit tests (many modules have inline `mod tests`).
- `npm run tauri:dev` starts the Tauri app with the UI.
- `npm run tauri:build` builds the Tauri app.
- `npm run dev` (from repo root) runs the Vite UI in `ui/`.
- `cd landing && npm run dev` runs the Next.js site.

## Coding Style & Naming Conventions
- Rust uses edition 2021; follow standard `rustfmt` defaults and keep modules in `snake_case`.
- React components in `ui/src/components/**` use `PascalCase` filenames (e.g., `SearchResults.tsx`).
- Tailwind is the styling system in `ui/` and `landing/`; keep utility class blocks grouped by layout, spacing, color.

## Testing Guidelines
- Rust tests live alongside modules with `mod tests` and use `#[test]` or `#[tokio::test]`.
- Run `cargo test` before changes that touch ranking, embedding, or compliance logic.
- Frontend tests are not configured yet; validate UI changes via `npm run dev` in `ui/`.

## Commit & Pull Request Guidelines
- Commit messages follow a Conventional Commit style (e.g., `feat: add secure embedder`).
- PRs should include a short summary, testing notes, and screenshots/GIFs for UI changes.
- Link any relevant issues or roadmap docs when applicable.

## Configuration & Data Notes
- The marketing site expects environment variables based on `landing/.env.example`.
- Large assets and model artifacts live under `models/` and `dataset/`; avoid committing derived outputs unless required.

# Ixos Agent Operating System (AGENTS.md)

This repo is optimized for autonomous agents (Codex). Follow this file as the top-level operating contract.

## North Star
Ship **Flash v2** and **Pro v2** (true Pro, not legacy), and materially improve **end-to-end search** speed + accuracy with reproducible evidence.

## Authoritative context
- Treat the user-provided **Ixos Model Optimization Context Report (2026-02-02)** as CANON until measurements prove otherwise.
- If repo docs/code contradict it, reconcile and **update repo docs/code** to match reality.

## Hard non-negotiables
1) **No stubs**: benches must run on real model artifacts (safetensors actually loaded).
2) **Measure-first**: no optimization without baseline and profiling.
3) Every claim must have:
   - command(s)
   - captured output artifact under `/reports` or `/models/lab`
   - before/after table
4) **Privacy**: preserve “zero-index philosophy”. Any indexing must be optional, gated, documented, and privacy-safe.
5) **Naming clarity**: eliminate model naming confusion globally.

## Persistent memory (compaction-proof)
Maintain these files continuously:
- `PLAN.md` (current goals + next steps + state snapshot)
- `RUNLOG.md` (append-only experiment log; include command outputs or references)
- `DECISIONS.md` (why we chose X over Y; short bullets)
- `/reports/` (benchmark tables, profiling notes, final writeups)

### State snapshot rule
Before ANY compaction or large pivot:
- write a **STATE SNAPSHOT** block into `PLAN.md` including:
  - current baseline numbers
  - current best v2 numbers
  - current bottleneck ranking
  - what's next (top 3 tasks)
This rule exists so the agent can resume even if all chat context is lost.

## The Ralph Loop (required workflow)
Repeat until targets hit or progress plateaus:

**Observe → Hypothesize → Implement → Measure → Decide → Document → Repeat**

Each loop iteration must end with:
- PLAN.md updated (what’s next)
- RUNLOG.md appended (what changed + outputs)
- DECISIONS.md updated if a choice was made (KEEP/REVERT/PIVOT)

## Versioning & naming policy (mandatory)
Canonical model ids/folders:
- `ixos-flash-v1` = legacy/current production baseline (keep for comparison)
- `ixos-flash-v2` = NEW generation (not a rename)
- `ixos-pro-v1` = legacy (hidden; never presented as “Pro”)
- `ixos-pro-v2` = NEW true Pro definition (may be fusion system, but version it)
- `potion-base-8m-int8` = internal dependency (not user-facing mode)

You must audit and fix:
- registry ids
- CLI flags
- UI switcher labels
- docs and screenshots
- any “flash-v2” that is actually v1

## Bench & profile: required commands (update if repo differs)
You must run baseline and final, and store outputs.

- Build release:
  - `cargo build --release`

- Quality eval (canonical):
  - `python scripts/ixos_eval.py --suite both --output models/lab/results_*.json ...`
  - Include Flash, Potion, Pro fusion, legacy pro-v1 for evidence, then v2s.

- Performance:
  - `./target/release/ixos-bench --dir dataset --runs 10 --cache-mode jit --model <...>`
  - `./target/release/ixos-profile --dir dataset --model <...> --cache-mode jit`

Artifacts:
- `/reports/baseline_*`
- `/reports/v2_*`
- `/reports/V2_FINAL_WRITEUP.md`
- Update `/models/lab/CANONICAL_RESULTS.md` if it is the repo source-of-truth.

## Performance targets (extreme)
Strive for:
- Flash v2: MRR@10 ≥ 0.85 AND latency < 350 ms/1k AND model footprint < 50MB
- Pro v2: MRR@10 ≥ 0.95 AND latency < 550 ms/1k (or progressive TTFR win)
- TTFR: < 35 ms warm-cache
- Ask Mode: must NOT force Pro; must respect selected model; remain fast

If impossible on current hardware, maximize improvement % and explain limits.

## Ask Mode rule (critical)
Ask Mode is query understanding + evidence extraction. It must:
- respect user-selected model
- never silently force slow Pro path
- keep progressive search snappy

## Shipping checklist (must pass before stop)
- full bench suite before/after
- docs updated and consistent
- installer/model download manifests updated
- HF upload playbook written
- CLI + UI verified end-to-end

### Diagram Ban
- Do not ship generic AI flowcharts, node-link diagrams, or decorative architecture maps.
- Any explanatory surface must be built from real product UI primitives: chips, rows, result cards, source badges, drawers, and real labels.

### Shared Demo Surface Requirement
- Landing variants must use the shared desktop surfaces from `@ixos/ixos-ui` through `src/landing/DemoSurface.tsx` and `src/landing/DemoSurfaceShell.tsx`.
- No one-off fake app mockups per route.
