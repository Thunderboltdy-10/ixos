# Demo Adapter Architecture

How the landing page interactive demo works — without a real backend.

---

## Overview

The landing page shows a fully interactive demo of the Ixos search UI.
Users can type queries, switch modes, see results stream in, and explore the evidence panel.

All of this is powered by **demo adapters** — stub implementations of the same
`SearchAdapter`, `TodayAdapter`, and `WorkstreamsAdapter` interfaces used by the
real desktop app.

The UI components (`SearchSurface`, `TodaySurface`, `WorkstreamsSurface`) are **shared**.
Only the data layer is swapped.

---

## Interface Contract

```typescript
// SearchAdapter
interface SearchAdapter {
  search(query, mode, onEvent): Promise<void>  // streaming events
  cancel(): void
  getModes(): SearchMode[]
}

// TodayAdapter
interface TodayAdapter {
  getSignals(): Promise<IxosTodaySignal[]>
  getRows(): Promise<IxosTodayRow[]>
  resumeRow(id): Promise<void>
}

// WorkstreamsAdapter
interface WorkstreamsAdapter {
  getWorkstreams(): Promise<IxosWorkstreamRow[]>
  getDetail(id): Promise<IxosWorkstreamRow | null>
  activateWorkstream(id): Promise<void>
}
```

Located in: `packages/ixos-ui/src/adapters/types.ts`

---

## Demo Implementation

### Location
`packages/ixos-ui/src/adapters/demo.ts`

### Search Streaming Sequence

The demo `SearchAdapter.search()` replays a scripted sequence:

```
t=0ms    → stage: "scanning"  (scanned: 0)
t=40ms   → stage: "scanning"  (scanned: 52)
...
t=380ms  → stage: "scanning"  (scanned: 312, candidates: 47)
t=500ms  → stage: "reranking" (embedded: 0)
t=560ms  → stage: "reranking" (embedded: 8,  cache: 5)
t=620ms  → stage: "reranking" (embedded: 16, cache: 10)
...      → result: { title, path, score, snippet, rationale }
t=790ms  → stage: "locked"    (all stats final)
t=800ms  → complete
```

Total scripted time: ~800ms — matches the real `<800ms` benchmark.

### Query Routing

- Questions (starts with "How", contains "?") → `ask` fixtures
- All other queries → `default` fixtures (auth/JWT results)

This gives the demo enough variety for two natural demo scenarios.

### Canned Fixtures

See `packages/ixos-ui/src/adapters/demo.ts` for:
- `DEMO_RESULTS` — 6 auth-related search results (default) + 2 ask results
- `DEMO_SIGNALS` — 4 KPI signals for Today view
- `DEMO_TODAY_ROWS` — 4 recent activity items
- `DEMO_WORKSTREAMS` — 5 workstreams (2 active, 2 warm, 1 cold)

---

## Usage in Landing

```tsx
import { createDemoAdapter } from '@ixos/ixos-ui';

const adapter = createDemoAdapter();

// In SearchSurface:
<SearchSurface
  searchAdapter={adapter.search}
  interactive={true}
/>

// In TodaySurface:
<TodaySurface
  todayAdapter={adapter.today}
/>
```

---

## Desktop Usage (real adapters)

Desktop provides real implementations wired to the Rust backend via IPC:

```typescript
const adapter: AppAdapter = {
  search: new TauriSearchAdapter(),    // calls invoke('search', ...)
  today: new TauriTodayAdapter(),
  workstreams: new TauriWorkstreamsAdapter(),
};
```

The UI is identical — only the adapter differs.

---

## Adding New Demo Scenarios

1. Add fixture data to `DEMO_RESULTS` in `demo.ts` (key it by query pattern)
2. Update query routing in `DemoSearchAdapter.search()`
3. No UI changes needed — the surface renders whatever the adapter returns

---

## Scripted State Machine

Each section in the landing uses a `demo_state` from `SECTION_MAP.ts` to
pre-configure what the app surface should show:

```typescript
demo_state: {
  view: "search",
  query: "authentication token refresh",
  stage: 2,        // 0=scanning, 1=reranking, 2=locked
  mode: "auto",
  selectedResult: "result-jwt",
}
```

When a section enters the viewport, the app surface transitions to that state.
Users can then interact with it (type, toggle, expand) and the demo adapter
provides believable responses.
