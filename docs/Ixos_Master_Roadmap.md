# Ixos Master Roadmap (vNext) — Post‑Phase‑3 Plan (2026‑02‑13)

This roadmap targets **Google‑like local search**: lexical accurate + semantic helpful, while staying **local‑first**, privacy‑first, and “no giant DB” by default.

It is grounded on:
- the reality audit (2026‑02‑13) confirming pipeline modules, cache backends (ADS/xattr/LMDB), invalidation (SHA256 + model fingerprint), and format parsers; plus the Ask Mode CLI gap.
- existing perf docs showing directory walk + ripgrep are major I/O costs, and ranking/embedding spikes appear in tails.

---

## 0) Current reality snapshot (verified)

**Implemented & working**
- CLI: `search/index/config/cache/daemon/compliance/doctor/model/version`.
- Cache: Windows ADS → Unix xattr → LMDB fallback → Null (JIT).
- Invalidation: SHA256 file hash + model fingerprint.
- Pipeline modules: path engine, ripgrep funnel, semantic engine, progressive engine, evidence extractor.
- Pro v2: Potion fast pass → Flash refine on top‑K/uncertain region → fusion.
- Parsers: PDF/DOCX/PPTX/XLSX/RTF + text/code; heavy formats respect caps.
- Ask Mode exists (UI) and respects selected model.

**Known gaps**
- Ask Mode not exposed via CLI.
- Perf evidence is strong on small/medium corpora; we still need “big root” evidence for 100k–300k files.

---

## 1) Non‑negotiable invariants

These must be enforced by core + CI “release‑check”.

1) Incognito/Hardened ⇒ **no persistent writes** (no ADS/xattr, no ledger).
2) User-selected model is respected (no silent override).
3) Cache/JIT toggle is truthful (UI matches behavior).
4) Pro gating enforced in core (not only UI).
5) All settings persist and reload correctly (or are explicitly session-only).

---

## 2) North‑star metrics (what “better” means)

You will optimize **per root size tier**:

### Tier A (≤5k files, typical project)
- TTFR p50 ≤ 60ms
- Total p95 ≤ 400ms (Auto)

### Tier B (≈50k files, power user)
- TTFR p50 ≤ 120ms
- Total p95 ≤ 2.0s (Auto)

### Tier C (100k–300k files, “Google for my computer”)
- TTFR p50 ≤ 200ms (must stream something meaningful)
- Total p95 ≤ 8–12s *on first cold root*, then ≤ 3–5s warmed

If Tier C can’t hit “fast total” on cold roots, you win by:
- **instant TTFR + progressive completeness**
- making the system clearly “still searching” and improving results over time
- offering optional “Warm this folder” and/or daemon indexing

---

## 3) Roadmap structure

Work is organized into 6 workstreams so you can ship value continuously.

### Workstream A — Measurement & truth (stop guessing)

**A1. Big-root bench suite (mandatory gate)**
- Add a repeatable command/script that runs 20–50 queries on a large root.
- Capture: TTFR, total, stage timings, cache hit rates (JIT vs Cache).
- Output JSON + a one-page markdown summary.

**Acceptance**
- Single command produces artifacts under `/reports`.
- CI can run the small version (dataset roots); local dev runs big roots.

**A2. Settings Matrix “contract tests”**
- Use the existing minimal settings matrix idea, but automate it:
  - C(cache/jit) × P(privacy modes) × S(search-mode) × A(ask) × T(secure timing) × Prog(progressive).
- For each combo: assert invariants (e.g., “no writes in incognito”).

**Acceptance**
- `ixos release-check` runs matrix and fails loudly.

---

### Workstream B — First search doesn’t feel slow (TTFR + progressive truth)

**B1. Frontier‑first progressive search (scheduling)**
Instead of: “enumerate everything → then search”, do:
- prioritize directories likely to contain matches (path engine scores + query anchors)
- run ripgrep on the frontier and stream early hits
- expand until either time budget reached or confidence is high

**Acceptance**
- On Tier C cold root, TTFR remains low and first results are non-random.

**B2. Write‑behind caching (don’t block UI)**
- When Cache mode is enabled: write embeddings/signatures as soon as a file is read (first-touch), but never block streaming.
- Add a visible background status: “building local index…”

**Acceptance**
- Cold first query produces results while cache writes happen concurrently.

**B3. “Warm this folder” (explicit UX)**
- Add a one-click warmup in UI + CLI `ixos warmup --dir`.
- Warmup builds: PathIndex + ripgrep file list + optional lexical signatures, with a cap/budget.

**Acceptance**
- User can choose to prepay cost; system explains it.

---

### Workstream C — I/O and directory scale (your real Tier C bottleneck)

**C1. Persist only the *change cursor token* per root**
- No global DB; just a tiny per-root token.
- Windows: USN journal cursor (if available); else watcher + periodic sanity scan.
- macOS/Linux: file system events (FSEvents/inotify) cursor or “last scan + sampled verify”.

**Acceptance**
- Repeated searches do not do a full directory walk when root unchanged.

**C2. Daemon becomes the default for desktop**
- `ixos daemon` maintains in-memory file list for the root(s) the user cares about.
- Desktop app can start it on launch (user-controlled).

**Acceptance**
- The UI never does cold enumeration if daemon is warm.

**C3. Ripgrep policy (keep rg; control its damage)**
- Keep ripgrep funnel for lexical truth, but:
  - always use precomputed file list from PathIndex (already implemented)
  - apply signature gates (Workstream D) to reduce files rg must open
  - introduce query‑adaptive patterns (quoted phrases, case-sensitive identifiers)

**Acceptance**
- On Tier C, ripgrep scan time drops materially because it touches fewer files.

---

### Workstream D — Lexical + semantic accuracy without “3× slower”

**D1. Lexical signatures (micro‑index, not a DB)**
Store a small per-file signature (e.g., 256–1024 bytes):
- hashed token Bloom bitset + identifier sketch
- optional: 64-bit MinHash/SimHash for quick near‑duplicate detection

Use it only on candidate pools:
- before opening files for rg or heavy parsing
- for Ask Mode anchor verification

**Acceptance**
- Signature gate reduces opened/read files per query on Tier C.
- Storage stays small (e.g., ≤ 0.5–2KB/file).

**D2. Query Mode Controller (semantic vs lexical vs hybrid)**
Replace keyword heuristics with a feature-based controller:
- features: quotes, punctuation, token rarity, identifier patterns, number/date density, filetype priors, query length
- output: weights for lexical vs semantic vs path priors, and “must contain anchor” constraints

**Acceptance**
- Fewer “misses stuff” complaints on code/projects where lexical matters.

**D3. Optional incremental lexical index (strictly gated)**
If you need true Google-like “instant exact-word” on Tier C:
- build a bounded trigram/token postings index updated by watcher/daemon
- store in LMDB under a hard cap; user opt-in

**Acceptance**
- When enabled, per-query lexical scan becomes <10ms on warmed roots.
- When disabled, no index tax (default).

---

### Workstream E — Parsing reliability (make “works 100%” feel true)

**E1. Extraction adapters + status caching**
For each file, store extraction status in cache metadata:
- ok / partial / failed + reason
- extracted char count + cap triggered
- extractor used (native vs sidecar)

**Acceptance**
- UI can explain “why this file didn’t match”.

**E2. Better PDF reality**
- Continue with `pdf_extract`, but add optional sidecar fallback for broken PDFs (user opt‑in in Pro).
- Treat scanned PDFs as “OCR optional”.

**Acceptance**
- Common PDFs stop being silent failures; failures are visible with reason.

**E3. Images**
- Phase 1: OCR only (optional, Pro)
- Phase 2: image embeddings (optional, Pro)
- Always store derived data as cache (recomputable).

**Acceptance**
- Searching text inside screenshots works when OCR enabled.

---

### Workstream F — Ask Mode becomes a trustworthy default (without forcing Pro)

**F1. Expose Ask Mode in CLI**
- Add `--ask` / `--ask-mode` flag to `ixos search`.
- Keep model-respect invariant.

**Acceptance**
- CLI and UI behavior match.

**F2. Evidence‑gated answer card**
Ask Mode outputs:
- Answer only if: anchor coverage + snippet trust + agreement signals
- Else: ask a clarifying question + show best results

**Acceptance**
- “Unsupported answer rate” is measurable and drops.

---

### Workstream G — Shipping, distribution, and “I never know what’s implemented”

**G1. Release‑check command**
- `ixos release-check` runs:
  - settings matrix contract tests
  - golden suite (small corpora)
  - format matrix extraction tests
  - smoke UI/CLI parity checks

**Acceptance**
- One command tells you what’s broken before you ship.

**G2. Diagnostics bundle**
- `ixos debug export` produces a zip:
  - version, config, last bench, cache stats, env snapshot
- Must redact sensitive paths by default.

**G3. Distribution**
- Desktop installer adds `ixos` to PATH.
- Separate “CLI only” zip.
- Add update/playbook to docs.

---

## 4) EE / IA track (kept feasible)

You can turn Workstreams D + F into an EE:

- Independent variables:
  - Cache mode (jit vs local index)
  - signature gating (off vs on)
  - search mode (flash vs auto vs pro)
- Dependent metrics:
  - retrieval success (Recall@k / MRR with gold chunk)
  - supported answer accuracy (EM/F1 + citation contains gold chunk)
  - unsupported rate
  - compute cost (embeddings/sec, bytes written, time)

Artifacts:
- the bench outputs already produced by ixos-bench/ixos-profile/scale_bench
- a small curated dataset (50–150 questions) is enough if it’s clean and reproducible

---

## 5) What to do next (strict order)

1) Run the **V2 audit** prompt (bigroot + cache-mode + format matrix).
2) Implement **G1 release-check** + settings matrix so you stop flying blind.
3) Implement **C1 root change cursor token** + daemon warm roots.
4) Implement **D1 lexical signatures** (big ROI, small storage).
5) Wire **F1 Ask Mode CLI** + evidence-gated answer card.
