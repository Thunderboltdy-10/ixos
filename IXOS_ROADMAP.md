# IXOS PROTOCOL — UNIFIED ROADMAP v6 (P1 → P10)
**Date:** 2026-01-15 (Europe/Madrid)  
**Goal:** *Sub‑200ms Time‑to‑First‑Result (TTFR), P95 < 2s “semantic interaction”, no “index tax” by default.*  
**Design principle:** **One fast path (always)** + **one smart path (optional / pay-for-quality)** + **one future moat (FSTD)**.

---

## 0) North-star architecture (the only viable shape)

### Core law
**Never embed or parse the whole corpus per query.**  
“Zero-storage” can still be fast **only** if you:  
1) **shrink the candidate set**, 2) **stream early**, 3) **amortize expensive work**.

### The Hybrid Cascade (non-negotiable)
1) **Intent + filters (0–5ms)**  
   Parse operators (ext:, before:, after:), detect query intent, select route (Flash vs Pro), build a plan.
2) **Fast candidate generation (20–300ms)**  
   Produce **200–2,000 candidates** from:
   - filename/path scoring (no disk reads)
   - ripgrep/lexical scan (streamed)
   - metadata priors (recent/hot folders, type filters)
3) **Semantic rerank (200–2000ms)**  
   Embed **only** candidates (batched, int8) and rerank (Flash always; Pro optionally).
4) **Evidence extraction (parallel, lazy)**  
   For top results only: show *why it matched* (lexical lines + best semantic passage).
5) **(Optional) Directory/topology prior (P6/P7)**  
   Re-rank ambiguous hits using directory meaning (light priors first, FSTD later).

### Where FSTD fits
FSTD is **a plug-in prior**, not a replacement:
- **Does not** replace: lexical funnel, caching, parsing optimizations
- **Can** help: disambiguation (“report.pdf” in Finance vs Ops), reduce reliance on persistent per-file vectors.

---

## 1) Why 30k files can become ~40s (and what fixes it)
If you still see ~40s on 30k files, it’s almost always one or more of:
- **Full-corpus embedding per query** (fatal by design)
- **Heavy parsing in the hot path** (PDF/DOCX extraction as part of candidate gen)
- **No hard cap on candidates**
- **No batching** (embedding one file at a time destroys throughput)
- **UI/IPC thrash** (too many per-item messages; too many re-renders)

This roadmap’s ordering exists specifically to kill these.

---

# P1 — Measurement & bottleneck surgery (must come first)
**Deliverable:** `ixos-bench` + flamegraphs + latency budget you can trust

### Instrumentation (spans you must have)
- directory walk / discovery
- candidate gen (path engine, ripgrep, metadata priors)
- content extraction (txt/pdf/docx) — and the bytes read
- embedding (per model, per batch)
- ranking + fusion
- IPC send + frontend render

### Metrics you track every run
- TTFR (first results visible)
- TTSI (first semantic results visible)
- P50/P95/P99 latency
- CPU %, I/O read MB, peak RAM
- cache hit rate (if enabled)

### Output
- `PERF_BASELINE.md` (before/after table)
- reproducible corpora scripts (synthetic + “your real 30k” mode)

**Exit criteria:** You can point at the exact reason 30k becomes 40s.

---

# P2 — Candidate generation that never touches 30k contents per query
**Deliverable:** Candidate Set ≤ 2,000 guarantee

## P2.1 Path/filename engine (instant, no disk reads)
- Tokenize path segments + filename
- BM25-ish scoring on tokens
- Keep tiny in-memory index of just path tokens (cheap)

## P2.2 Ripgrep funnel (streamed)
- Run ripgrep in parallel and **stream hits**
- Flush to UI every **50ms** or **20 results**
- Hard cap: stop after N hits unless user chooses “deep scan”

## P2.3 Metadata priors
- recency (mtime/atime) and “hot folders”
- file-type priors (PDF/DOCX slower; don’t eagerly parse)
- size caps (skip huge blobs by default)

## Hard caps (make these real, not “guidelines”)
- `MAX_CANDIDATES_FOR_EMBEDDING = 1500` (start here)
- `MAX_BYTES_READ_PER_FILE = 64KB` (hot path)
- `MAX_TEXT_CHARS_PER_FILE = 20k` (after extraction)

If candidates exceed the cap: stable-sort by lexical score + recency + filename/path score, then take top-N.

**Exit criteria:** TTFR < 200ms on 30k; first 50 results appear fast.

---

# P3 — Perceived performance + animation (the pipeline you can *see*)
**Goal:** make the system feel instant while reflecting real stages (not a gimmick).

## P3.1 “Energy Traces / shimmer-to-results” (integrated look)
**Concept:** hairline energy traces originate from the search bar and **lock onto real results** as they arrive.
- lexical hits → thin quick streaks
- semantic hits → thicker/softer glow + slower easing
- done → traces settle into card edges / separators then fade

**Keep it minimal:** 40–120 traces max. No 30k particles.

## P3.2 Production-friendly implementation
**Recommended:** one 2D canvas overlay
- cubic Béziers with mild curl/noise (controlled)
- animate with requestAnimationFrame
- update control points in JS, not via React state
- (Nice-to-have) OffscreenCanvas in a worker

**Avoid early WebGL/R3F complexity** unless you already know you need it.

## P3.3 Rules so it feels native
- Endpoints must align to real UI anchors (search bar edges, card edges, badges)
- Animate at most two properties at once (position + alpha)
- Avoid “gaming UI”: minimal bloom/blur; stick to your palette accents

## P3.4 Backend ↔ Frontend streaming contract (must exist)
Backend emits batched updates:
- `stage`: {echo, lexical, semantic, tail}
- `stats`: {files_scanned, candidates, embedded, cache_hits}
- `events`: [{id, kind, score, slot_index}]

Frontend uses the same stream to update:
- result list (virtualized)
- traces (endpoint, opacity)
- microcopy (“Scanning…”, “Understanding…”)

**Acceptance metrics**
- TTFR p50 < 200ms, p95 < 400ms
- main thread stays >55fps during streaming

---

# P4 — Make search actually fast (40s → <2s perceived)
**Goal:** enforce the funnel + streaming + caching as laws.

## P4.1 Batching embeddings (mandatory)
- embed candidates in batches (32–128)
- prefer int8 weights for throughput

## P4.2 “Cheap semantics” before expensive semantics
- typo correction → improves lexical funnel
- light synonym expansion → improves ripgrep hit rate
- then run embeddings

## P4.3 Don’t parse heavy formats in the hot path
- candidate gen should not open PDFs/DOCX unless they’re already in the small set
- for heavy docs, extract lazily only for top-K results

**Acceptance metrics**
- candidate phase p95 < 250ms (30k corpus)
- semantic rerank p95 < 2.0s for 1–1.5k candidates

---

# P5 — Caching + incremental updates (speed multiplier without “index tax”)
**Deliverable:** fast repeat searches + no constant disk rescans

## P5.1 Storage modes (cross-platform)
- Windows (NTFS): **ADS** (Alternate Data Streams)
- macOS/Linux: **xattr**
- fallback: ephemeral sidecar DB (LMDB) capped + deleted on exit (default)

## P5.2 What to cache
Cache:
- embeddings (int8 where possible)
- small preview snippet (2–4KB)
- extraction fingerprint (mtime + size + hash)

Don’t cache:
- full extracted text
- full PDF render outputs

## P5.3 Incremental file change tracking (real-world win)
- Windows: USN Journal
- macOS: FSEvents
- Linux: inotify/fanotify

This prevents re-walking the disk constantly.

## P5.4 Security posture (privacy-first)
- store models/adapters in SafeTensors where possible
- encrypt any persistent xattr/ADS blob in “journalist mode”
- clear UI toggles: “ephemeral only” vs “persistent cache” + size audit

**Exit criteria:** repeated query returns semantic results in < 500ms p95.

---

# P6 — Evidence engine + directory-aware relevance (80% of the “smart” win)
**Deliverable:** every result answers “why did this match?” and ambiguity gets resolved without FSTD.

## P6.1 Evidence engine
### Lexical evidence
- show exact line hits + match count (“3 matches” pill)
- next/prev match keys and jump-to-position

### Semantic evidence (best passage)
- chunk by structure (paragraphs/headers/code blocks)
- embed chunks only when needed (top-K docs only)
- pick best chunk by similarity and show snippet

### Explanation tags
- path tags (folder names)
- file-type tags
- optional keyphrases (YAKE/TF‑IDF)

## P6.2 Path-augmented embeddings (baseline that works)
Embed constructed text:
`[path tokens] + [filename tokens] + [top snippet]`

This often fixes “semantic match but wrong file” with almost no cost.

## P6.3 Directory centroids (light topology prior)
Maintain in-memory:
- directory → centroid embedding (EMA over seen files)
- directory → hotness (recency/frequency)

Re-rank candidates with a small boost if the query aligns with a directory theme.

**Exit criteria:** ambiguous queries (“2023 report”) pick the right branch more often with <5ms overhead.

---

# P7 — Model suite + routing (do it once you can measure)
**Deliverable:** a measurable model lineup + routing logic

## P7.1 Model harness (before building more models)
- eval sets:
  - synthetic ambiguity suite (finance/report vs ops/report)
  - your real corpus (local-only)
- metrics:
  - Recall@10, MRR@10
  - latency per 1k docs on CPU
  - memory footprint

## P7.2 Two tiers users understand
1) **Ixos‑Flash (default)**
   - tiny/static/Model2Vec-like, int8, always-on
2) **Ixos‑Pro (optional)**
   - stronger embedder or reranker
   - runs only on small candidate sets, only when needed

## P7.3 Combine models without inventing new magic
- **Routing (conditional compute)**: decide per query if Pro runs
- **Score fusion**:
  `final = a*flash + b*pro + c*lexical + d*dir_prior`
  Learn (a,b,c,d) from your harness (grid search is fine early).

## P7.4 Distillation pipeline (practical)
- mine pseudo-pairs:
  - same-folder positives, sibling-folder hard negatives
  - filename similarity positives
  - opt-in click logs
- objective:
  - contrastive + distillation loss (teacher as soft targets)
- output:
  - Flash-v2 smarter while staying tiny
  - Pro remains premium reranker

**Exit criteria:** you can prove speed/quality gains with numbers.

---

# P8 — FSTD (Topology Distillation) as a plug-in re-ranking prior (your moat)
**Deliverable:** a tiny “directory adapter” that measurably improves ambiguous queries

## P8.1 Minimal FSTD v0 (don’t overbuild)
Teacher signal:
- embed directory tree into a low-dim topology space (hyperbolic or tree-distance features)

Student:
- tiny adapter MLP (e.g., 256→128→d)
- train: content embedding → predict topology coordinate

Use:
- query embedding → adapter → predicted topo coordinate
- re-rank candidates by distance to that coordinate

## P8.2 When FSTD fails
- unsemantic folder structures (Downloads, “New folder (3)”)
- single giant folder corpora

Mitigation:
- enable only when a “structure quality score” is high (depth, naming entropy, reuse patterns)

## P8.3 Hard success gates
- +10–15% MRR lift on your ambiguity suite
- adapter inference overhead < 2ms
- training fits a background budget (e.g., <5 min once)

If it doesn’t hit: keep P6 and move on.

---

# P9 — Release engineering + beta hardening
**Deliverable:** predictable performance + safe telemetry

- deterministic benchmarks in CI (30k, 100k)
- crash telemetry (opt-in)
- “profile bundle” exporter (no content, just timings)
- built-in perf regression suite for every release

**Definition of done for beta**
- TTFR p95 < 400ms on 30k
- semantic interaction p95 < 2s (top results stable)
- no UI stalls while streaming
- clear privacy story (no network; explain caches)

---

# P10 — Differentiators users pay for (pick ONE)
Choose one to go deep (and ship it end-to-end):
- **Semantic Grep** (pipeable meaning search)
- **Project Spaces** (ephemeral semantic workspaces, per-project caches)
- **Forensic Canary** (tamper detection / integrity mode)

---

## Appendix A — End-to-end lifecycle when user presses Enter
1) Frontend: start animation + send `search.start(query, session_id)`  
2) Backend stage Echo: normalize, parse filters, quick suggestions  
3) Lexical: path/filename scorer + ripgrep stream → TTFR results  
4) Candidate finalize: cap to `MAX_CANDIDATES_FOR_EMBEDDING`  
5) Semantic: embed in batches; fuse lexical/semantic/recency/dir priors  
6) Evidence: lexical lines + best semantic passage for top results  
7) Optional: Pro rerank, then FSTD topology re-rank  
8) Frontend: results stabilize; animation settles into UI accents  

---

## Appendix B — Things to drop (avoid wasted months)
- embedding full corpus per query (ever)
- parsing heavy formats in candidate gen hot path
- “3D galaxy of 30k particles” as the default animation
- any semantic-only path that bypasses the lexical funnel

---

## Appendix C — AI coding prompts that prevent over-complex builds
- “Implement Canvas overlay with <=120 bezier traces; endpoints snap to DOM rects; no external libs.”
- “Backend batching: flush every 50ms or 20 results; no per-file IPC spam.”
- “Hard cap candidate selection with stable sort + recency boost; include unit tests.”
- “Add perf spans + flamegraph exporter; produce PERF_BASELINE.md for 30k run.”
