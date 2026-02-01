# Ixos Master Roadmap — Product, UX, Performance, Monetization, Marketing

_Last updated: 2026-01-23 (Europe/Madrid)._

This roadmap merges:
- the **103-page Ixos research PDF** (No Index Tax, mode-based design, retention engines, landing copy),
- your existing Ixos internal docs (Hybrid Cascade / performance architecture, JIT embeddings, model lab harness),
- and your current plan: **make the desktop app match the landing page**, and replace the hero video with an **interactive desktop-app mock** on the website.

The roadmap is intentionally “long” and phase-based so you can execute it with AI agents in one-shot chunks.

---

## Non‑negotiable pillars (must show up in product + marketing)
1) **No Index Tax** (default behavior is zero persistent index)
2) **Speed you can feel** (streaming + perceived-performance)
3) **Trust** (preview + explainability + privacy proof)
4) **Power when needed** (modes, not clutter)
5) **Cross-surface parity** (desktop + CLI stay consistent)

---

## Workstreams (run in parallel, but phase-gated)
A. **Engine & Performance** (Hybrid Cascade, funnel strategy, caching philosophy)  
B. **Desktop UI & Design System** (theme parity with landing page)  
C. **Search Experience** (result card, preview, evidence, actions)  
D. **Retention & “Pro” Value** (saved searches, Watch & Notify, projects)  
E. **Integrations** (CLI, quick actions, VS Code, launcher hooks)  
F. **Security & Enterprise** (Journalist Mode, audit logs, encryption choices)  
G. **Quality / Testing / Release** (feature registry, E2E, perf CI, installers)  
H. **Marketing & Web** (interactive demo, docs, benchmarks, launch assets)  
I. **Monetization** (licensing, tiers, paywall that respects trust)

---


## Phase 1 — Measurement & bottleneck surgery (internal P1)
**Goal:** stop guessing. Make latency measurable and regressions visible.

**Key tasks**
- Engine spans & telemetry (local-only): scan → candidate gen → embed → rerank → render
- Benchmark harness: small/medium/huge corpora fixtures
- Budgets: first-result time, full-results time, memory, CPU

**Outputs**
- `bench/` harness runnable on any machine
- Perf report generated in CI (as artifacts)
- “slow query” profiler output for real user corpora (opt-in)

**Acceptance**
- You can pinpoint the top 2 bottlenecks in any query.
- You have a perf budget file that fails CI when violated.

---

## Phase 2 — Desktop UI redesign: match the landing page
**Goal:** the desktop app should feel like the product you’re marketing.

**Key tasks**
- Build a **shared design system** used by both Desktop (Tauri/React) and Web (Next/Tailwind):
  - shared Tailwind preset
  - shared tokens (CSS variables): background elevations, borders, radii, typography
  - shared components: SearchBar, ResultCard, Tabs, Badges, Buttons, Panels
- Replace “boxy” layout with a tighter, hardware-grade instrument feel:
  - fewer nested rectangles
  - consistent 1px borders, controlled rounding
  - calmer hierarchy, better typographic scale
- Motion discipline: one signature animation (search “power-up”) + subtle micro-interactions only

**Outputs**
- `packages/ui` (or equivalent) consumed by both apps
- Theme parity checklist: colors, font, spacing, shadows, radii, icon style

**Acceptance**
- Side-by-side screenshot: landing mock + desktop app match visually.
- No “old theme” remnants.

---

## Phase 3 — Search experience overhaul (internal P3 perceived performance)
**Goal:** make search feel alive and fast even on big corpora.

**Key tasks**
- True streaming UI:
  - show “first credible results” fast
  - progressively enrich (snippets, highlights, score reasons)
- Remove repetitive skeleton artifacts; reduce dead space
- Result cards:
  - consistent preview block
  - match evidence highlighting
  - quick actions row (open/reveal/copy path)
- “Why matched” toggle (default off; power users can open)

**Outputs**
- New SearchDeck timeline + streaming pipeline
- ResultCard v2 with evidence + actions

**Acceptance**
- The experience feels instant even when full computation continues.
- Users can see *why* a result is relevant.

---

## Phase 4 — Scale: candidate generation without touching everything (internal P2 + P4)
**Goal:** semantic search at scale without cheating the wedge.

**Key tasks**
- Hybrid cascade candidate stage:
  - fast lexical/metadata prefilter
  - directory centroids / smart narrowing
- Funnel strategy:
  - embed only what you must
  - batch & prioritize
- Optional micro-caching that respects No Index Tax:
  - xattr/ADS bytes
  - opt-in encrypted local cache (bounded + transparent)

**Outputs**
- Candidate engine + routing rules
- Cache modes UX: Off / Ephemeral / xattr / Encrypted

**Acceptance**
- Large corpora queries stay within budgets without a heavy persistent index.
- Cache behavior is transparent, reversible, and explained.

---

## Phase 5 — Evidence engine + directory-aware relevance (internal P6)
**Goal:** make results feel smarter than competitors with minimal compute.

**Key tasks**
- Evidence payload per result (top-K): snippet spans, match explanation, folder context
- Directory awareness: project detection, locality + recency heuristics
- UI explainability: minimal by default, rich on demand

**Outputs**
- Evidence schema shared across Desktop + CLI
- CLI `--json` parity for evidence

**Acceptance**
- Relevance improves measurably on benchmark queries.
- Evidence is consistent across surfaces.

---

## Phase 6 — Retention engines (turn Ixos into a daily tool)
**Goal:** shift from “occasionally useful” to “always running because it pays off”.

**Key tasks**
- Saved searches (pin, rename, tags)
- **Watch & Notify**:
  - background file watching
  - notify when new/changed files match a saved semantic query
  - rate limits + quiet hours
- Projects/workspaces: scoped search + presets
- Search history with privacy controls + Journalist Mode overrides

**Outputs**
- Saved search library + watcher system
- Notification UX + preferences

**Acceptance**
- There is at least one feature users *want running* (Watchers).
- Pro tier has an obvious reason to exist.

---

## Phase 7 — Integrations + workflow accelerators
**Goal:** make Ixos plug into real workflows.

**Key tasks**
- CLI parity (first-class): same engine, same evidence, stable contract tests
- Quick actions: open, reveal, copy, batch operations
- Developer hooks: semantic-grep mode, optional IDE integration later
- Optional launcher bridging: hotkey + quick search

**Outputs**
- CLI docs + examples
- Thin integration interface / plugin system (if needed)

**Acceptance**
- Every feature declares whether it exists on CLI and why.
- CLI and Desktop outputs match for the same query.

---

## Phase 8 — Security & enterprise hardening (trust moat)
**Goal:** become the tool professionals can install without fear.

**Key tasks**
- **Journalist Mode**: no history, no caches, wipe ephemeral artifacts, panic shortcut
- Audit logs: prove offline behavior, show what is stored and where
- Installer hardening: signing, notarization, auto-updates you can trust

**Outputs**
- Understandable security settings panel
- Exportable audit report (explicit consent)

**Acceptance**
- A security-conscious user can verify Ixos is not leaking data.
- Modes are clear and reversible.

---

## Phase 9 — Model suite + routing (internal P7)
**Goal:** accuracy + speed under constraints, with measurable routing.

**Key tasks**
- Model harness + registry
- Auto routing logic (speed vs quality)
- Regression tests for relevance and speed

**Outputs**
- Model compatibility matrix + CI benchmarks
- “Why this model” debug output (optional)

**Acceptance**
- Switching models never breaks the pipeline.
- Auto routing decisions are explainable.

---

## Phase 10 — Ship the moat (internal P8 + P10)
**Goal:** deliver the thing nobody else has that still respects No Index Tax.

Pick one primary first:
- FSTD / topology-distilled re-ranking prior
- directory-centroid intelligence (practical moat)
- ultra-light caching (xattr/ADS) + transparency UX
- evidence engine + explainability as a product feature (trust moat)

**Outputs**
- A single headline-worthy differentiator
- Benchmark + demo proving it

**Acceptance**
- A before/after demo is obviously better than substitutes.

---

## Phase 11 — Website hero upgrade: interactive desktop mock (replace video)
**Goal:** let users *feel* Ixos on the landing page.

**Key tasks**
- Build a desktop window mock component in Next.js using shared UI components
- Fake search engine (local-only demo dataset) with scenario packs + progressive reveal
- Replace hero video; keep video as fallback

**Outputs**
- `IxosDemoWindow` component + dataset + example queries chips

**Acceptance**
- The hero is interactive, crisp, and never buggy.
- The mock stays visually identical to the desktop app (shared components).

---

## Phase 12 — Monetization + licensing + production polish
**Goal:** convert “cool” into “sellable”.

**Key tasks**
- Tiering (Free / Pro / Team later)
- Offline licensing (privacy-safe) + graceful degradation
- Release engineering (internal P9): signed builds, update channel, crash reporting (opt-in)

**Outputs**
- Pricing page + in-app upgrade flow
- License system + release checklist

**Acceptance**
- Shipping updates is safe and repeatable.
- Users understand Pro value immediately.

---

## Phase 13 — Launch assets + growth loops (AFTER polish)
**Goal:** go public with proof, not promises.

**Key tasks**
- Benchmark story: No Index Tax + speed + trust
- Comparison pages + docs + short clips
- Product Hunt / HN / Reddit playbook + newsletter/changelog
- Optional social presence (no paid ads until retention is proven)

**Outputs**
- Launch kit + outreach calendar

**Acceptance**
- Story is coherent and backed by demos.
- You can ship + announce on a cadence.

---

## Ongoing: solving the “features are hard to test” problem
Implement early and enforce forever:
- Feature registry with surfaces/tests/docs
- Capability matrix (Desktop vs CLI vs Web demo)
- Contract tests (same query → same evidence JSON)
- Golden corpora fixtures in CI
- Perf CI budgets
- Release gates checklist

