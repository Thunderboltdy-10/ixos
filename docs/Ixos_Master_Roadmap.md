# Ixos vNext Roadmap — Pro That Compounds (DB‑less, JIT‑first, “Must Work Perfectly”)

> **Goal:** Make Ixos feel *indispensable* by improving **trust**, **speed**, and **daily utility**, while keeping your core philosophy:  
> ✅ **No global DB / no mandatory indexing** (JIT remains the product story)  
> ✅ **Pro value compounds over time** (without being slower)  
> ✅ **Everything is testable & verifiable** (you regain confidence in production)

---

## North‑star metrics (pick 3 and measure every release)

1) **Warm search latency**: median & p95 (local roots)  
2) **Top‑5 success rate**: user opens one of top 5 results  
3) **Repeat‑query improvement**: after 2–3 days, personalized ranking increases top‑3 hit rate  
4) **Crash‑free sessions**: 99.9%+  
5) **“No writes” integrity**: Incognito/Hardened sessions perform zero persistent writes (best effort, excluding unavoidable OS temps)

---

## Core principles (non‑negotiables)

- **DB‑less by default**: no persistent global manifest of all files.
- **JIT remains the headline**: “Search as you go.”  
- **Pro is structural**: features that improve outcomes, not “a slower mode.”
- **Every feature ships with:**
  - a spec + invariants  
  - a smoke test  
  - a debug/diagnostic surface  
  - CI coverage (at least for “doesn’t break”)

---

# Phase 0 — Reliability Lockdown (make it testable before adding anything)

### Outcome
You can validate a production build in **minutes**, not hours. No misleading flags/features.

### 0.1 Remove or implement “partial” features
**Deliverables**
- Either **fully implement** or **remove** (CLI + UI) anything that’s half‑wired:
  - `index --watch`, `daemon`, `cache rebuild`, `cache mode persistence`, etc.
- Ensure the UI never shows “success” unless the underlying operation succeeded.

**Acceptance**
- There are **no dead toggles**.
- Every user-visible feature has an **end‑to‑end success path**.

---

### 0.2 Add `ixos doctor` + Desktop Diagnostics panel
**Deliverables**
- CLI `ixos doctor` checks:
  - ADS/xattr capability
  - config persistence + effective config resolution
  - model load/warm status
  - incognito/hardened write-prevention checks
  - progressive output integrity
- Desktop hidden: **Settings → Advanced → Diagnostics**
  - show resolved config
  - show capabilities/entitlement gates
  - show mode resolution (JIT vs cache, incognito forcing “no writes”, etc.)
  - run doctor checks with a copyable report

**Acceptance**
- You can run `doctor` on a user machine and instantly know what’s broken.

---

### 0.3 Build the “Settings × Modes” automated test matrix
**Deliverables**
- A runner that enumerates the *meaningful* configuration combos and runs a minimal search fixture:
  - cache_mode: `jit | cache`
  - privacy: `normal | incognito | hardened`
  - progressive: `on | off`
  - model: `flash | pro`
  - output: `human | json`
- Validates invariants per combo (see Appendix A).

**Acceptance**
- All combos produce valid output, no panics, invariants hold.
- This runs in CI on at least one OS (and locally for all).

---

# Phase 1 — Pro Memory Lite (DB‑less personalization that feels valuable)

### Outcome
Ixos “learns the user” locally, without storing big logs or a DB.

## Design choice: ADS/xattr only (plus tiny fallback)
- Primary: per-file metadata via **ADS (Windows)** and **xattr (macOS/Linux)**.
- Fallback (only when ADS/xattr unsupported): a **bounded LRU map** (e.g., 10k entries cap).

---

### 1.1 File‑level Personal Ranking (per‑file micro‑signals)
**Store (per file, only on interaction)**
- `ixos.open_score` (decayed frequency+recency; single number)
- `ixos.last_open_ts`
- `ixos.pinned` (bool)
- `ixos.ignored` (bool)

**Update logic (no history growth)**
On open at `t_now`:
- `open_score = open_score * exp(-(t_now - last_open_ts)/τ) + 1`
- `last_open_ts = t_now`

**Rerank logic (top‑K only)**
- `final = base + w1*norm(open_score) + w2*recency(last_open_ts) + w3*pinned - w4*ignored`
- Guardrail: only apply if `base >= base_threshold` to avoid “personalize junk.”

**UX**
- Result actions: **Pin**, **Ignore**, **Not relevant** (strong negative)
- Settings:
  - Personal ranking (local) toggle
  - Reset learning (best-effort clear for Ixos-touched files)
  - “Why this result?” panel (explain base + personalized factors)

**Pro packaging**
- Free: manual pin/ignore (no learning, minimal boosts)
- Pro: full recency+frequency learning + explain panel

**Acceptance**
- Opening the same file a few times moves it into top 3 for related queries.
- Incognito/Hardened: opening does **not** update xattrs.

---

### 1.2 Incognito + Hardened (Journalist Mode v2)
**Incognito (Free)**
- no history, no xattr updates, no cache writes

**Hardened (Pro)**
- incognito + secure timing on + visible “shield” state + panic hotkey + verified diagnostics

**Acceptance**
- Diagnostics prove “no persistent writes” policy is enforced.

---

# Phase 2 — Pro Second Brain (bounded ledger, not an index)

### Outcome
Opening Ixos without searching still provides value (daily habit loop).

### 2.1 Bounded local activity ledger (encrypted ring buffer)
**Design**
- Store a small encrypted ring-buffer log (JSONL or binary)
- Hard cap: configurable (e.g., 5–20 MB); rotates automatically
- Stores only:
  - `file_id`, timestamp, action type
  - optional `query_hash` (not query text)

**Pro surfaces**
- **Today tab**:
  - recent opens
  - pinned files
  - resume last workstream
- **Workstreams v1** (manual):
  - user names workstreams and assigns folders/files (no ML required)

**Acceptance**
- Ledger never exceeds cap.
- Today tab loads in <1s and is useful.

---

# Phase 3 — Pro Ask Mode Plus (quality without “slow magic”)

### Outcome
Ask mode feels trustworthy: evidence-first, no vibes.

### 3.1 Ask+ improvements (algorithmic)
- Better anchor extraction (rare terms, phrases)
- Snippet must contain anchors (fix random excerpts)
- “Answer cards” for simple patterns (dates/numbers/names) **with citation snippet**
- Confidence indicator:
  - high if lexical anchors + semantic agree

**Acceptance**
- Answers always cite and show the supporting snippet.
- No silent model switching; respects user-selected model.

---

# Phase 4 — JIT Accelerator (DB‑less speed you can paywall structurally)

### Outcome
Repeat searches feel instant *without* building a global DB.

## What “JIT accelerator” means (in this roadmap)
Not “index everything.”  
It means: **stop repeating expensive discovery work when you can safely skip it**.

### 4.1 Free: RAM‑only memoization (session acceleration)
- During a single app session:
  - Keep discovered file list per root **in RAM**
  - Reuse across queries
  - Invalidate safely if you detect changes

**Acceptance**
- Second query in same session is significantly faster on large roots.

### 4.2 Pro: Change‑journal cursor (tiny persistent token, not a DB)
Persist only a small **checkpoint token** per root:
- Windows: USN journal cursor
- macOS: FSEvents event ID
- Linux: best-effort strategy (inotify while running + conservative rescan on restart)

On next run:
- ask OS “what changed since cursor”
- only inspect those paths

**Acceptance**
- Repeat searches after restart on stable roots skip deep walks.
- Storage on disk is tiny (config only), and does not store full file lists.

---

# Phase 5 — Launch Readiness (make production boring)

### Outcome
You can ship confidently and iterate quickly.

### 5.1 Make release checks executable
Add `ixos release-check` which:
- runs `doctor`
- runs settings matrix smoke suite
- runs golden query suite on fixture dataset
- validates performance thresholds
- outputs a single report file (shareable)

**Acceptance**
- Any release candidate can be validated with one command.

### 5.2 Golden query suite (relevance regression prevention)
- Maintain 30–100 “hard queries” with expected top‑5 contains target files.
- Run whenever ranking/models change.

**Acceptance**
- Ranking changes are safe; regressions are visible immediately.

---

# Phase 6 — Full Audit & Hardening (verify *everything*, find vulnerabilities, ensure completeness)

### Outcome
A final “gate” phase that checks **all features**, **all user flows**, and identifies **security/perf correctness risks** before launch.

## 6.1 Feature inventory → coverage map (completeness)
**Deliverables**
- Generate a **Feature Inventory** automatically:
  - all CLI commands + flags
  - all settings keys
  - all UI toggles
  - all “modes” (jit/cache/incognito/hardened/progressive)
  - all integrations (Clerk, Lemon Squeezy, updater, etc.)
- For each inventory item, attach:
  - owner module/file
  - a smoke test ID
  - at least one invariant

**Acceptance**
- 100% of inventory items are mapped to at least one test.
- Missing coverage fails CI (or fails `release-check`).

---

## 6.2 End‑to‑end user flow regression suite (production confidence)
**Deliverables**
- Automated “journeys” (desktop + CLI):
  1) First run → model status OK
  2) Search (flash) → open result
  3) Toggle modes → verify persistence
  4) Pro gating on/off → verify features disappear correctly
  5) Incognito/Hardened → verify no writes + no learning updates
  6) Ask mode → citations & jump-to-source
  7) Cache/JIT behavior sanity checks
- Capture run artifacts:
  - logs
  - diagnostics report
  - performance summary

**Acceptance**
- Journeys pass on release builds.

---

## 6.3 Security hardening checklist (local-first threats)
**Threats to explicitly test**
- Path traversal / unsafe path joins
- Symlink loops / recursion bombs
- ZIP/PDF parser bombs (huge decompression)
- Untrusted file parsing (malformed PDFs/DOCX)
- Privilege boundaries (don’t require admin)
- Sensitive data leakage in logs (paths, query text, content)
- Update mechanism integrity (signature checks, MITM)

**Deliverables**
- Add automated checks:
  - Dependency vulnerability scan (Rust crates)
  - Secret scanning (tokens in repo)
  - Static analysis / linting
  - Fuzz tests for parsers (PDF/DOCX/text extraction)
  - Sandbox tests for untrusted docs (timeouts, size caps)

**Acceptance**
- No high severity vulnerabilities in dependencies at ship time.
- Fuzzing runs nightly (or at least before release).

---

## 6.4 Performance “anti-regression” gate
**Deliverables**
- Bench suite that measures:
  - cold start
  - warm query median/p95
  - memory growth under repeated queries
  - large-root behavior (representative fixture)

**Acceptance**
- Performance budgets enforced; regressions fail `release-check`.

---

## 6.5 Privacy & “No writes” verification gate
**Deliverables**
- A test harness that:
  - runs an incognito/hardened session
  - snapshots filesystem write activity (best effort)
  - ensures no ADS/xattr changes were written
  - ensures no history/ledger entries were written

**Acceptance**
- Incognito/Hardened produces a clean write report (with documented exceptions if any).

---

# Appendix A — Invariants (must always hold)

1) **Incognito/Hardened ⇒ no persistent writes**  
   - no ADS/xattr changes  
   - no ledger events  
   - no cache writes (unless “essential” + documented)
2) **User-selected model is respected** (no silent override)
3) **Cache/JIT toggle is truthful** (UI matches behavior)
4) **Pro gating is enforced in core** (not only UI)
5) **All settings are persisted and reload correctly** (or are explicitly “session-only”)

---

# Appendix B — Minimal Settings Matrix (example)

| cache_mode | privacy_mode | model | progressive | expected |
|---|---|---|---|---|
| jit | normal | flash | off | baseline |
| jit | incognito | flash | on | no writes, no learning |
| cache | normal | pro | off | cache writes allowed, learning allowed |
| cache | hardened | pro | on | no writes + secure timing |

*(Expand to include every meaningful toggle, but keep it human-manageable.)*

---

# Appendix C — Commands to ship

- `ixos doctor`
- `ixos release-check`
- `ixos bench` (existing)
- `ixos profile` (existing)
- `ixos debug export` (exports diagnostics bundle)

---

## Notes on “DB-less” philosophy (this roadmap stays aligned)

- Personalization is **per-file micro metadata** (ADS/xattr) and does not require session logs.
- “JIT accelerator” does **not** store a global file DB:
  - Free: RAM-only memoization
  - Pro: OS change cursor token only (a few bytes per root)

---

## Suggested order (if time is tight)

1) Phase 0 (Doctor + Diagnostics + matrix)  
2) Phase 1 (Personal ranking + Incognito/Hardened)  
3) Phase 4 (RAM memoization + change cursor)  
4) Phase 5 (release-check + golden suite)  
5) Phase 6 (audit gate)  
6) Phase 2/3 (Today + Ask+ polish)
