# V4 Hero Storyboard

12 frames documenting the cinematic search simulator animation cycle. Each frame lists the timestamp, UI state, visible copy, color language, and ambient field pulse events.

Total cycle duration: ~15.5 seconds. The cycle loops indefinitely.

---

## Frame 01 — Idle (t = 0.0s)

**Hero state:** `idle`
**Phase:** —
**Ambient pulse:** None

**UI state:**
- Search bar: empty, blinking cyan cursor ( | ) at 0.7s interval
- Query text: empty string
- Mode chip: "Flash" (amber)
- Pipeline stages: all dim, no active stage
- Results area: empty — "awaiting query" placeholder in rgba(255,255,255,0.15)
- Status badge: "WAITING" (dim pill)
- File count: 0

**Copy visible:**
- Status: `WAITING`
- Meta: `312 files · 7ms · rayon`

**Design note:** The empty state is intentionally still. The cursor blink is the only motion — a single heartbeat that signals the system is alive and waiting.

---

## Frame 02 — Typing Begins (t = 0.8s)

**Hero state:** `typing`
**Phase:** —
**Ambient pulse:** None

**UI state:**
- Hero state transitions to `typing`
- First character "a" appears in the search bar
- Cursor moves right of typed text
- Typing speed: ~72ms per character with ±12ms variance (human-like)
- Mode chip: "Flash" (amber) — unchanged

**Design note:** Variance in per-character delay is critical. Perfectly uniform typing reads as machine-generated. The small jitter creates the sensation of a real developer typing a real query.

---

## Frame 03 — Typing In Progress (t = 1.4s)

**Hero state:** `typing`
**Typed:** `"authentication t"` (16 chars)
**Ambient pulse:** None

**UI state:**
- Query text accumulating: `authentication t|`
- Cursor tracking the text
- All pipeline stages still dim
- Results area still empty
- Status still "WAITING"

**Copy visible:**
- Query (partial): `authentication t`

**Design note:** The partial query is a known concept — users immediately recognize "auth" and anticipate the rest. The query choice is deliberate: it surfaces a meaningful search scenario (JWT refresh flow) that a real developer would run.

---

## Frame 04 — Typing Complete (t = ~2.6s)

**Hero state:** transitioning `typing` → `scanning`
**Typed:** `"authentication token refresh"` (28 chars, complete)
**Ambient pulse:** STRONG (intensity 1.0) from panel center

**UI state:**
- Full query displayed: `authentication token refresh|`
- Pulse event fires immediately as scanning begins — the ambient field erupts in a cyan wave from the simulator card center
- Hero state flips to `scanning`

**Copy visible:**
- Query: `authentication token refresh`
- Status transitioning to `SCANNING`

**Design note:** The pulse at scan-start is the most intense in the cycle (1.0). It signals: the system has received the instruction and is mobilizing. The wave spreads outward from the simulator, creating a "ripple through the environment" effect.

---

## Frame 05 — Scanning (t = 2.85s – 4.0s)

**Hero state:** `scanning`
**Phase:** —
**Ambient pulse:** Fading from Frame 04 pulse

**UI state:**
- Pipeline stage "Scan" activates: amber dot + glow + amber label
- File count animates 0 → 312 over 1.2s (ease-out cubic)
- Amber scan sweep bar animates across the bottom edge of the results area (repeating)
- Results area: "scanning 247 files..." (count increments with rAF)
- Status badge: "SCANNING" (amber pill with pulsing dot)

**Copy visible:**
- Status: `SCANNING`
- Progress text: `scanning [N] files...`
- Meta: `312 files · 7ms · rayon`

**Design note:** The scan sweep is a thin amber line that travels horizontally across the bottom of the results panel — not a progress bar, but a sweep suggesting parallel workload. This is honest: rayon IS scanning in parallel. The amber color is correct for this phase.

---

## Frame 06 — Lexical Results Appear (t = 4.0s – 5.75s)

**Hero state:** `lexical`
**Phase:** `lexical` (amber)
**Ambient pulse:** None (previous pulse has decayed)

**UI state:**
- Pipeline stage "Lexical" activates (amber), "Scan" becomes checked (past)
- Results stagger in, 150ms apart:
  1. `auth/session.ts` — 0.87
  2. `middleware/jwt.ts` — 0.82
  3. `lib/tokens.ts` — 0.79
  4. `api/refresh.ts` — 0.74
  5. `hooks/useAuth.ts` — 0.71
- Score bars fill in amber
- Each row enters with `initial={{ opacity: 0, x: -8 }}` → `animate={{ opacity: 1, x: 0 }}`
- Status badge: "SCANNING" (still amber — lexical is part of the same scan pass)

**Copy visible:**
- 5 filenames with amber scores
- Status: `SCANNING`

**Design note:** The staggered reveal gives the impression of results arriving as they are found — not a batch dump. The amber color is consistent throughout lexical phase: keyword matching is the "warm" first pass.

---

## Frame 07 — Semantic Candidates Appear (t = 5.8s – 7.55s)

**Hero state:** `semantic`
**Phase:** `semantic` (violet)
**Ambient pulse:** None

**UI state:**
- Pipeline stage "Semantic" activates (violet), "Lexical" becomes checked
- 5 more results stagger in below the lexical 5:
  6. `services/auth.ts` — 0.68 (violet score bar)
  7. `utils/crypto.ts` — 0.64
  8. `config/auth.ts` — 0.61
  9. `types/session.ts` — 0.57
  10. `lib/session.ts` — 0.54
- Score bars for new rows fill in violet
- Existing amber rows remain amber (their phase is lexical)
- Status badge: "RERANKING" (violet pill)

**Copy visible:**
- 10 filenames total; top 5 amber, bottom 5 violet
- Status: `RERANKING`

**Design note:** The color split is intentional and informative: amber = keyword-matched, violet = semantically similar but not keyword-matched. This is the honest story of hybrid retrieval. Users can see that `utils/crypto.ts` and `types/session.ts` were not keyword hits — they were found by meaning.

---

## Frame 08 — Lock and Reorder (t = 7.6s)

**Hero state:** `locked`
**Phase:** `locked` (cyan)
**Ambient pulse:** MEDIUM (intensity 0.8) from panel center

**UI state:**
- ALL results replaced with `LOCKED_RESULTS` (10 rows, new scores)
- Framer Motion `layout` animation: rows glide to new positions
  - `middleware/jwt.ts` moves from rank 2 → rank 1 (most dramatic move)
  - `auth/session.ts` slides from rank 1 → rank 2
  - All scores update to cyan values (0.97 down to 0.70)
- All score bars transition from amber/violet → cyan
- Pipeline stage "Lock" activates (cyan checkmark glow)
- Status badge: "READY" (cyan pill)
- Medium pulse fires — ambient field pulses cyan from panel center

**Copy visible:**
- Status: `READY`
- All 10 results with new cyan scores

**Design note:** The layout animation is the hero moment of the entire section. Watching `middleware/jwt.ts` physically travel from rank 2 to rank 1 makes the semantic reranking legible. This is the "aha" moment: the system found a BETTER answer than keyword search alone.

---

## Frame 09 — Evidence Panel Opens (t = 8.4s)

**Hero state:** `evidence`
**Phase:** `locked` (cyan)
**Ambient pulse:** LIGHT (intensity 0.5) from panel center

**UI state:**
- Evidence panel expands below rank-1 result (`middleware/jwt.ts`)
- Framer AnimatePresence: height animates from 0 → auto with spring easing `[0.16, 1, 0.3, 1]`
- Evidence panel content:
  ```
  line 23: const refreshed = await refreshToken(payload.sub)
  line 47: return { token, expiresAt: Date.now() + TTL }
  Tags: [authentication ×3] [token ×8] [refresh ×5]
  ```
- Syntax: `const` in cyan, `await`/`return` in amber, line numbers in dim white
- Light pulse fires as panel opens

**Copy visible (evidence panel):**
- "matched context" label (cyan 60% opacity)
- Two code lines with syntax highlighting
- Three tag chips: `authentication ×3`, `token ×8`, `refresh ×5`

**Design note:** The evidence panel justifies the ranking. Without it, "score 0.97" is an opaque number. With it, users see EXACTLY why this file ranked first: the word "token" appears 8 times, "refresh" 5 times. The tag chips are a compressed version of this evidence — scannable in under 1 second.

---

## Frame 10 — Mode Cycling (t = 11.0s – 14.0s)

**Hero state:** `evidence` (unchanged)
**Phase:** `locked` (unchanged)
**Ambient pulse:** None (light ambient waves from auto-pulse)

**UI state:**
- Mode chip in search bar cycles: Flash (amber) → Auto (cyan) → Pro (violet) → Flash
- Each swap uses AnimatePresence with `mode="wait"` — previous chip fades out, new chip fades in (200ms)
- Timeline:
  - t=11.0s: Flash → Auto (teal chip)
  - t=12.0s: Auto → Pro (violet chip)
  - t=13.0s: Pro → Flash (amber chip, reset)

**Design note:** The mode cycling demonstrates that the same result set would be available in any mode — the search interface is the same, only the model's compute budget changes. Flash is fast, Pro is accurate, Auto is the balanced choice. The cycling is a product demo, not a distraction: the results don't change, the mode indicator does.

---

## Frame 11 — Fade Out / Reset (t = 14.5s – 15.5s)

**Hero state:** `resetting`
**Ambient pulse:** None

**UI state:**
- Entire simulator card fades to opacity 0 over 800ms
- Cursor blink stops (no cursor in `resetting` state)
- Ambient field continues its slow auto-wave decay

**Design note:** The fade-out is long enough to feel intentional (not a glitch), short enough to not create a "dead zone" before the new cycle starts. The ambient field persists through the reset — it is independent of the hero cycle and provides continuity.

---

## Frame 12 — New Cycle Begins (t = 15.5s → 0.0s)

**Hero state:** reset to `idle`
**Loop counter:** incremented

**UI state:**
- `loop` state incremented → triggers fresh `useEffect`
- All state reset: `heroState='idle'`, `typedChars=0`, `visibleRows=[]`, `phase='lexical'`, `evidenceOpen=false`, `modeIndex=0`, `fading=false`
- Simulator card reappears (opacity 1)
- New cycle begins from Frame 01

**Design note:** The loop is infinite and seamless. A user who lands on the page and reads slowly will have seen the full cycle demonstrate:
1. The system accepts a query
2. It scans 312 files in 7ms
3. Keyword results appear first
4. Semantic results follow
5. The ranking self-corrects (reorder)
6. Evidence explains the top result
7. Multiple model tiers exist

This is the complete Ixos product story, told in 15 seconds without a single word of marketing copy beyond the filenames and scores.
