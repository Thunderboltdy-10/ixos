# Ixos UI Unification Spec — Make Desktop Feel Like the Landing Page

_Last updated: 2026-01-23._

You said it clearly:
- **Landing page looks premium and cohesive.**
- **Desktop app looks plain/ugly/old** even if it shares some fonts/colors.
- The hero **video** looks cool but is sometimes buggy/low-res; you want an **interactive demo** that mirrors the desktop UI.

This spec gives you a concrete plan to:
1) redesign the desktop UI to the landing page standard, and  
2) build the landing-page interactive mock *from the same components* so it stays in sync.

---

## 1) What the videos show (high-signal observations)

### A) The desktop app reads “boxy + busy”
From frame analysis, the desktop UI has **much higher edge density** (more visible borders/boxes) than the landing page frames.
That usually correlates with:
- too many nested panels
- repeated card outlines
- skeleton states that look like “markdown blocks”
- inconsistent padding + too much empty space between boxes

### B) The landing page reads “calm + premium”
Landing frames have:
- more consistent dark surfaces
- fewer sharp transitions between panels
- a calmer hierarchy (less “UI noise”)

### C) Your current hero video is the wrong primitive
A video is:
- not interactive
- easy to look “soft” (compression, resolution)
- annoying when it stutters
- hard to keep consistent as the desktop app evolves

An interactive mock fixes all of those — **but only after desktop UI parity exists.**

---

## 2) Target aesthetic (desktop should match landing)
Think: **hardware-grade instrument** (not consumer AI, not glowing neon).

### Design principles
- **One background** (deep near-black) + **two elevations** (subtle)
- **One border language**: crisp 1px borders, low-contrast
- **Controlled rounding**: consistent radius system (don’t mix many radii)
- **Typography hierarchy**: fewer sizes, stronger weight/letter spacing discipline
- **Accent discipline**: teal is for meaning/action; don’t sprinkle extra colors
- **Motion discipline**: one signature animation, everything else minimal

---

## 3) Build a shared design system (critical to keep desktop + web in sync)

### The core idea
Create `packages/ui` (or similar) that exports:
- Tailwind preset / tokens
- shared components used by:
  - Desktop (Tauri + React)
  - Landing page demo (Next.js)

This is the only scalable way to ensure:
- desktop UI improvements automatically apply to the landing mock
- future redesigns don’t break parity

### Token checklist (CSS variables)
- `--bg-0`, `--bg-1`, `--bg-2` (elevations)
- `--border-0`, `--border-1`
- `--text-0`, `--text-1`, `--text-muted`
- `--accent-teal`
- `--radius-1`, `--radius-2`
- `--shadow-1` (very subtle)

---

## 4) Desktop UI redesign: concrete component upgrades

### 4.1 Window shell
- Top chrome: minimal, precise, aligned with landing (no heavy gradients)
- Internal layout: reduce nested outlines

**Acceptance**
- If you screenshot the desktop window and place it in the hero, it looks native to the site.

### 4.2 SearchBar (the “instrument panel”)
- Make it feel like the *control surface*:
  - tighter height
  - strong caret visibility
  - crisp focus ring (subtle)
  - optional small inline hint chips (examples) that disappear once typed

### 4.3 SearchDeck (during searching)
Your earlier feedback: the deck feels “stuck scanning” and skeleton feels repetitive.

Fix:
- streaming states (3-tier):
  1) **Pulse** (very short): “waking up”
  2) **First results**: show real cards quickly (even if not enriched)
  3) **Enrichment**: snippets/highlights/why-matched fade in

Remove:
- the extra horizontal skeleton lines that cut through the deck
- repeated empty blocks

### 4.4 Results list + ResultCard v2
Make each card do 3 jobs:
1) identity (file name + icon + location)
2) evidence (snippet + highlight)
3) actions (open/reveal/copy) — keyboard-friendly

Add a collapsed/expanded structure:
- collapsed: title + 1 snippet line + 1 action row
- expanded: multi-snippet + “why matched” + score breakdown (optional)

### 4.5 Mode switchers (simple default, power hidden)
Implement modes from the research report:
- Default mode: no jargon
- Power mode: filters, ranking explainability
- Dev mode: debug timeline + JSON parity
- Journalist mode: no traces

---

## 5) Landing hero: interactive desktop mock (after desktop parity)

### 5.1 What the hero should be
A “fake Ixos” that feels real:
- user can type anything
- results appear instantly
- demo is deterministic and local (no server calls required)

### 5.2 How to fake semantic search without complexity
Start with a **local demo dataset**:
- 50–150 demo “files” (docs, PDFs, code, notes)
- each file has:
  - title, path, type, short snippet
  - tags (concepts)
  - synonyms list

Matching algorithm v1 (fast + believable):
- keyword match + synonyms + tag overlap scoring
- scenario routing:
  - detect intent cluster (e.g., “invoice”, “project plan”, “meeting notes”, “holiday photo”)
  - return curated results set + gradual enrichment

This creates the *feeling* of semantic recall without shipping a model in the browser.

### 5.3 Keep it in sync automatically
Because the hero uses the same components, only two things differ:
- data source (real engine vs demo dataset)
- search function (real pipeline vs stub matcher)

---

## 6) “Definition of Done” for UI parity
You’re done when:
- Desktop screenshots can be used on the landing page **without looking like a different product**
- Interactive hero mock uses the same components and styling
- Search feels faster because results stream and enrich progressively
- Power features are discoverable but not noisy
- A new feature must update:
  - feature registry
  - tests
  - docs
  - and (if relevant) the hero demo dataset

---

## 7) Immediate next steps (high leverage)
1) Create `packages/ui` + shared Tailwind preset + tokens  
2) Refactor Desktop shell + SearchBar + ResultCard to use shared components  
3) Update SearchDeck to the 3-tier streaming state machine  
4) Only then: build `IxosDemoWindow` for the landing page using the same components

