# Ixos Testing, Parity, and Release Playbook (to stop feature drift)

_Last updated: 2026-01-23._

You called out the real scaling pain:
> “As more features get added, it’s hard to test them. I don’t know if they’re implemented into the flow, or if they work in both app and CLI.”

This playbook makes that problem go away by turning “feature growth” into a **system**.

---

## 1) The core rule: no feature exists without a registry entry
Create a single file:
- `features/registry.yml`

Each feature entry must include:
- `id`: stable slug
- `description`
- `surfaces`: {desktop, cli, web-demo}
- `flags`: feature flag name (if any)
- `tests_required`: list of test IDs
- `docs_required`: doc page IDs
- `telemetry`: which local events are emitted (optional)
- `owner`: code owner path / module

**CI gate:** a PR that adds or changes a feature without updating the registry fails.

---

## 2) Capability matrix (Desktop vs CLI vs Web demo)
Generate `docs/capability-matrix.md` from the registry:
- rows = features
- columns = Desktop / CLI / Web demo / Tests / Docs

This immediately answers:
- “is it implemented in both?”
- “what’s missing?”
- “what needs docs?”

---

## 3) Contract tests (desktop and CLI must agree)
If Desktop and CLI share the same engine, you can enforce parity.

### Contract definition
- Given a test corpus + query,
- the engine returns deterministic JSON:
  - `results[]`
  - `evidence`
  - `why_matched` fields (if enabled)

### Contract tests enforce
- same top-K IDs
- same evidence schema
- stable sorting rules (or stable within tolerance)

---

## 4) Golden corpora fixtures (tiny vaults that make regressions obvious)
Create 3 fixed corpora you commit to the repo (small, synthetic):
1) `corpus_tiny` (50 files)
2) `corpus_medium` (500 files)
3) `corpus_edgecases` (weird paths, unicode, PDFs, duplicates)

For each corpus:
- 25–50 golden queries
- expected top 5–10 results (IDs)
- expected evidence snippets for top 3

These golden tests catch:
- relevance regressions
- parsing failures
- evidence schema drift

---

## 5) Performance CI budgets (fail fast on latency regressions)
Define budgets per corpus:
- time-to-first-result
- time-to-full-topK
- memory ceiling
- CPU ceiling (where measurable)

Add a CI job that:
- runs benchmarks
- fails if budgets are exceeded
- stores a perf report artifact

This prevents “we accidentally made it 3× slower” from shipping.

---

## 6) E2E UI tests (only the critical paths)
Don’t try to test everything visually.
Test the **contracts** and **critical flows**:

Desktop E2E flows:
- open app → run query → first results appear → open file action works
- saved search create → watcher triggers → notification fires
- switch modes (Default → Power → Journalist) changes behavior

CLI E2E flows:
- query returns results
- `--json` returns evidence schema
- filters/operators work

---

## 7) Release checklist (repeatable shipping)
Create `release/CHECKLIST.md`:

### Build & signing
- build on win/mac/linux
- codesign/notarize (where applicable)
- update channel metadata

### Test gates
- golden relevance tests pass
- contract tests pass
- perf budgets pass
- smoke E2E flows pass

### Docs gates
- changelog updated
- capability matrix regenerated
- upgrade notes written (if needed)

### Telemetry/logs (privacy-safe)
- crash logs are opt-in
- log bundling requires explicit user action

---

## 8) “Flow coverage”: ensure features are actually wired into the product
One silent failure mode is: “feature exists, but no one can reach it.”

Fix it with a **Flow Map**:
- `docs/flow-map.md` describes the user journey:
  - search → results → preview → actions → save → watcher → notify
  - modes: what changes in each step

Every feature must list:
- which step it touches
- how the user discovers it
- what the fallback is if disabled

---

## 9) Agent-ready starter tasks (do these first)
1) Create `features/registry.yml` + CI gate  
2) Generate `docs/capability-matrix.md` automatically  
3) Add `corpus_tiny` + 25 golden queries + golden test runner  
4) Add contract test harness for engine JSON output  
5) Add perf budget file + CI perf job  
6) Create `release/CHECKLIST.md` and enforce it before tagging releases  

Once these exist, feature growth stops being scary.

