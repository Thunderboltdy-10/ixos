# Ixos Pro Roadmap — “Second Brain” + Ask Mode (No IDE Integrations)

_Last updated: 2026-02-01_

## North Star
Turn Ixos from “weekly search tool” into an “always-open daily companion” by shipping:
1) **Ask Mode** (question-style search that returns trustworthy snippets)
2) **Second Brain** (Today tab + Related/Backlinks + Workstreams)
3) **Pro Memory** (personalized ranking + daily brief + inbox)
4) **Verified Session Mode** (Journalist mode that feels like a real tool)

## Non-Negotiables
- Local-first. No cloud indexing of user files.
- Pro value compounds over time (not “a toggle”).
- Free stays strong (core search is not paywalled).
- Paywall must be **structural**: Pro code not shipped to free users.

---

# Phase 0 — Pro Gating in a Single Shipped App (No Separate Pro Module)

## Objective
Ship **one executable/installer** containing all features. Pro access is controlled by **signed entitlements** that:
- expire locally (even offline),
- allow a configurable offline grace window,
- resist clock rollback,
- and are bound to a trusted device.

> Note: There is no “perfect” client-side protection against reverse engineering. The goal is fail-closed behavior for normal users and high friction for casual abuse.

---

## 0.1 Capability-Based Enforcement (Core, not UI)
- Define a canonical `Capabilities` registry (strings → flags).
- Every Pro-only operation must check `capabilities.has("...")` inside Rust core.
- UI may hide/show, but **never** controls access.

**Acceptance**
- Removing UI checks does not unlock Pro features.

---

## 0.2 Device Identity (Cryptographic)
- On first run/login, generate a device keypair.
- Store private key in OS secure storage.
- Compute `device_pubkey_hash` as a stable device binding identifier.
- Backend “trusted device” leasing stays as-is (email-confirm transfer).

**Acceptance**
- Device binding can’t be faked by changing a machine name or config file.

---

## 0.3 Signed Entitlement Tokens (Subscription Source of Truth)
Backend issues a signed token (JWT or equivalent) containing:
- `plan` (free/pro)
- `capabilities` (array)
- `exp` (expiry timestamp)
- `device_pubkey_hash` (binding)
- optionally `iat` and `server_time` to help time integrity

Client verifies signature + binding and derives the active Capabilities set.

**Acceptance**
- Invalid signature → Pro disabled (fail closed).
- Binding mismatch → cached entitlement cleared + Pro disabled.

---

## 0.4 Offline Expiry + Grace Window (No “Forever Offline”)
Enforce expiry locally:
- If `now <= exp`: Pro Active.
- If `exp < now <= exp + GRACE`: Pro Grace (enabled, but must refresh online by deadline).
- If `now > exp + GRACE`: Pro Expired (disabled until refresh).

Recommended defaults:
- Token lifetime: 7 days
- Grace: 7–14 days (choose based on tolerance)

**Acceptance**
- Pro disables after `exp + grace` even with no internet.

---

## 0.5 Anti-Clock-Rollback Friction
- Persist `last_seen_time` locally (secure storage).
- If system time moves backwards beyond tolerance:
  - mark `time_suspect = true`,
  - require online refresh to re-enable Pro (or allow a short temporary window).

**Acceptance**
- Rolling system clock backwards does not preserve Pro indefinitely.

---

## 0.6 Expiry UX (No Data Deletion)
- Grace: show banner “Pro needs refresh by <date>”.
- Expired: lock Pro panels/views with an overlay explaining renewal.
- Do **not** delete user data (history/workstreams/graph remain stored locally).

**Acceptance**
- Users don’t lose their data, but cannot use Pro features while expired.

---

## 0.7 Remove Pro Module Infrastructure
- Remove module download, encryption, dynamic loading, and related env vars.
- Remove module upload scripts.
- Keep only entitlement-based gating.

**Acceptance**
- No module URL/base/version/public-key config is required at runtime.
- App is a single installer with all features compiled in.

---

# 1) Search Bar: Ask Mode That Actually Works (HIGH IMPACT)

## 1.1 Dual Input Modes (no new UI noise)
- Default = Keyword mode.
- If query ends in `?`, toggle **Ask Mode** automatically (UI shows a subtle “ASK” badge).
- Optional: small radial hint bubble on `?` explaining Ask mode.

## 1.2 Ask Mode Pipeline (No LLM Required)
### Step A — Query Understanding
- Detect question pattern.
- Remove stopwords + question words (when/what/was/the/etc.).
- Extract **anchor terms** using IDF (rare/high-signal terms).
- Detect phrases and treat quoted phrases as must-hit.
- Detect time intent (“when”, “last week”, “yesterday”) → add recency bias.

### Step B — Candidate Retrieval (Hybrid)
- Lexical funnel: require at least 1 anchor (or a phrase) to appear in candidate text when possible.
- Semantic rerank on candidates (existing pipeline).

### Step C — Snippet Trust (Fix the “random snippet” problem)
- Snippet passage must contain anchor terms OR phrase hits.
- If top semantic passage lacks anchors, pick next best passage that does.
- Show: highlights + “why matched” (anchors + semantic score).

### Step D — Tiny Description (Optional, safe)
Without an LLM, generate a 1-line “description” via extraction:
- Pick the best sentence from the chosen snippet passage (TextRank-ish or simple scoring: anchor hits + position + punctuation).
- Display as: “Likely answer context:” (not a factual claim).

**Free vs Pro**
- Free: Ask mode + anchor snippets.
- Pro: Ask mode “Plus”:
  - more aggressive intent parsing (dates/entities),
  - better passage selection,
  - optional “Answer Card” for simple recall (date/name/number extraction).

**Acceptance**
- Query: “The Financial Times” does not return docs dominated by “the”.
- Query: “when was the meeting?” surfaces meeting notes and shows a meaningful snippet.

**Metrics**
- Search-to-open rate
- Query reformulation rate (should drop)
- “Bad result” dismiss rate (thumbs down / escape / new query)

---

# 2) Second Brain v1 (Today + Related + Workstreams)

## 2.1 Local Activity Ledger (Pro Memory Core)
Create a local event store (encrypted):
- events: search, result clicked, file opened, file modified (from watchers), file moved/renamed
- minimal fields: file_id (path hash), timestamp, action_type, query_hash, workstream_id (optional)

**Free vs Pro**
- Free: ephemeral session-only activity (RAM).
- Pro: persistent encrypted ledger (powers daily value).

## 2.2 Today Tab (Pro)
A new top-level tab:
- “Resume” (last active workstream + top files)
- “Recently touched” (files opened/modified)
- “Suggested next” (based on co-open/co-edit patterns)
- “Pinned” (user pins files/workstreams)

**Hook**
- Show Today tab on app open.
- On Ctrl+Space summon, default focus to Today unless user starts typing.

**Acceptance**
- Opening Ixos without searching still gives value within 1 second.

## 2.3 Related Files Panel (Pro)
For any selected result:
- “Related (co-open)” — files frequently opened within 30 minutes of this file
- “Related (co-edit)” — files edited within X hours of edits to this file
- “Similar content” — semantic similarity fallback
- “Backlinks” — files that mention key identifiers from this file (simple: filename tokens + extracted headings/identifiers)

**Acceptance**
- Users can “walk” across a project without new queries.

## 2.4 Workstreams (Pro)
Auto clusters (and user-adjustable):
- Each workstream is a named cluster:
  - top folders, top files, top queries, last activity
- UI:
  - Workstreams list (left sidebar)
  - Each workstream has Today-like overview

**MVP clustering**
- Start with time-window session clustering (co-open/co-edit).
- Add folder + project-root heuristics.
- Add semantic similarity if needed.

---

# 3) “Always-On” That Feels Worth It (Brief + Inbox, not spam)

## 3.1 Scoped Watch Engine (Pro)
Watches are limited to:
- user-defined “important scopes” (folders, workstreams)
- no whole-disk scanning

A Watch includes:
- query (keyword or ask)
- scope
- trigger (on change, or digest)
- quiet hours
- strictness threshold

## 3.2 File Intelligence Inbox (Pro)
Not “notifications spam”.
A persistent panel:
- “New matches”
- “Important changes”
- “Workstream updates”
- Dedupe + batching by design

## 3.3 Daily Brief (Pro)
A scheduled digest:
- “3 docs updated in Workstream: X”
- “2 new PDFs in Downloads”
- “1 doc mentions deadline”
Click → opens Inbox filtered.

**Acceptance**
- Users can ignore it for a day and still benefit tomorrow.
- No spam: rate-limited, deduped, digest-first.

---

# 4) Change Lens (Pro)

## 4.1 What Changed
For text-like files:
- show diff-ish view (line changes)
For PDFs/docs:
- show “changed passages” via re-extract + passage compare (simple, not perfect)

## 4.2 Change Context
- show what else changed around same time in the same workstream/folder
- show “related files impacted”

**Acceptance**
- “What changed since yesterday?” becomes a 5-second task.

---

# 5) Smart Collections (Pro)

Auto-generated collections:
- “Hot this week”
- “Stale but important” (historically high interactions, low recent)
- “Recently modified in Workstream X”
- “Likely relevant to current workstream”

Collections are “saved views”, not new index structures.

---

# 6) Verified Session Mode (Journalist Mode that’s a Tool)

Keep it in-app, but make it concrete:

## 6.1 Verified Session Dashboard (Pro)
Shows toggles and proofs:
- History OFF
- Cache OFF
- No persistent ledger
- Scope allowlist ON
- Secure timing ON
- Panic hotkey enabled

## 6.2 Panic Hotkey
Instantly:
- closes UI
- wipes in-memory buffers (best effort)
- clears session state
- deletes temp artifacts (best effort)

**Note**
- This is not your main Pro selling point; it’s credibility + niche value.

---

# 7) Presentation + Habit Hooks (how users discover & keep using it)

## 7.1 First-Run Onboarding (30 seconds)
- Pick 2–3 important folders
- Create first workstream automatically
- Enable Today tab
- Offer 1 “Watch Template” (optional)

## 7.2 Progressive Disclosure
- Keep UI calm (hardware-grade).
- Advanced panels appear only when relevant:
  - Ask mode badge only when `?`
  - Related panel expands on selection
  - Inbox shows only when items exist

## 7.3 “Aha” Moments (built-in)
- After 5 searches: show “Turn this into a workstream?”
- After repeated opens: “Pin this file/workstream?”

---

# 8) Rollout Plan (Phased)

## Phase 0 (Week 1–2): Paywall & Plumbing
- Capabilities registry + backend entitlements + device keypair
- Pro module download + encryption + signature verification + loader
- Offline grace + error states

## Phase 1 (Week 2–4): Ask Mode + Snippet Trust
- `?` trigger + parsing + anchor enforcement + phrase handling
- Snippet selection fixes + tiny description extraction
- Metrics + feedback affordance

## Phase 2 (Month 2): Second Brain v1
- Pro encrypted activity ledger
- Today tab
- Related panel (co-open/co-edit + semantic fallback)
- Workstreams v1 clustering + pins

## Phase 3 (Month 3): Brief + Inbox + Watches (scoped)
- Watch engine for scopes/workstreams
- Inbox + digest
- Dedupe + quiet hours + batching

## Phase 4 (Month 4–6): Change Lens + Smart Collections
- Change lens views
- Smart collections
- Personalized ranking signals (lightweight)

## Phase 5 (Month 6–12): Moat + Hardening
- Forensic canary (tamper-evident file hash snapshots)
- Advanced privacy tooling
- Security review of agent/CLI surfaces

---

# 9) Free vs Pro Packaging (Simple)

## Free
- Core search (hybrid)
- Ask mode basic (via `?`)
- Starred searches (limited)
- Basic UI + actions (open/reveal/copy)
- Cache mode available (manual)

## Pro
- Pro module features:
  - Today tab
  - Workstreams
  - Related/Backlinks
  - Persistent encrypted activity ledger
  - Personalized ranking
  - File Intelligence Inbox + Daily Brief
  - Scoped Watches
  - Change Lens
  - Smart Collections
  - Verified Session Dashboard
- History becomes part of “Memory” (not a standalone selling point)

---

# 10) Risks & Mitigations

## Paywall bypass
- Mitigation: do not ship Pro code in free; device-bound encrypted module; verify below UI.

## Privacy concerns (“Ixos is watching me”)
- Mitigation: clear UI: what’s tracked, local-only, encrypted; disable/clear controls; Verified Session.

## “Always-on” resource cost
- Mitigation: watchers only on scopes; batch processing; idle throttling; digest-first.

## Snippet trust / multi-word queries
- Mitigation: anchor enforcement + phrase rules + Ask mode parsing + user feedback loop.
