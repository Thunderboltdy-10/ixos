# DESKTOP_UI_AUDIT

## Audit Method
- Runtime verification: `npm run tauri:dev` (launched Vite + Tauri backend, model preload succeeded).
- Code audit scope:
  - Shell + navigation: `ui/src/App.tsx`, `ui/src/components/layout/AppShell.tsx`, `ui/src/components/layout/Sidebar.tsx`
  - Search surface: `ui/src/components/search/MainSearchView.tsx` and supporting search components/stores
  - Today + Workstreams surfaces: `ui/src/components/today/*`, `ui/src/components/workstreams/*`, `ui/src/stores/todayStore.ts`, `ui/src/stores/workstreamStore.ts`
  - Pro/account/settings overlays: `ui/src/components/settings/SettingsPanel.tsx`, `ui/src/components/account/PricingPanel.tsx`

## Current Surface Inventory
- Search (default): progressive lexical -> semantic stream with mode/model controls and evidence-aware result cards.
- Today (Pro-gated): daily brief overlay, resume, recents, suggestions, connection map, move recommendations.
- Workstreams (Pro-gated): clustered sessions list + detail, rename/pin/delete, manual creation from recent file activity.
- Overlay windows:
  - Settings (search/account/keyboard/privacy/compliance/diagnostics/about)
  - Guide/info panel
  - Pricing/upgrade
- Auth + entitlement gating:
  - Pro expiry/time-suspect lock overlay with fallback to Flash.

## What Is Not Working Well (Priority Findings)

### P0 - Today and Workstreams feel like stacked cards, not a coherent workspace
Evidence:
- `TodayTab.tsx` and `WorkstreamsList.tsx` are built as long sequential card blocks with repeated visual treatment and weak sectional rhythm.
- Important actions (resume flow, recent cluster context, handoff back to Search) are buried below summary tiles.
Impact:
- High cognitive load.
- Poor scanability for first-use and returning users.
- Pro value is present but visually diluted.

### P0 - Search / Today / Workstreams navigation continuity is weak
Evidence:
- `AppShell.tsx` swaps entire views abruptly with no persistent context ribbon.
- Side rail mixes global nav, history, account, and stats in one dense column (`Sidebar.tsx`).
Impact:
- Users lose mental map when switching views.
- "Today" and "Workstreams" read as separate products.

### P1 - Empty states are generic and low-confidence
Evidence:
- `TodayEmptyState.tsx` and zero-state in `WorkstreamsList.tsx` rely on generic icon cards and instructional text blocks.
Impact:
- First-run experience feels tutorial-heavy instead of action-oriented.

### P1 - Hierarchy and spacing quality is inconsistent
Evidence:
- Frequent use of similar border/background chips for unrelated semantics (`TodayTab.tsx`, `WorkstreamsList.tsx`, `SettingsPanel.tsx`).
- Header blocks and data tiles use near-identical density regardless of priority.
Impact:
- Premium feel is reduced.
- Signal-to-noise ratio is poor in high-information views.

### P2 - Motion language is mixed
Evidence:
- Some surfaces use subtle motion while others use aggressive stagger/overlay transitions without a unified timing system.
Impact:
- Interaction feels less intentional.

## Must Improve While Keeping Product Structure
- Keep IA: `Search`, `Today`, `Workstreams`, overlays, auth and Pro gating.
- Redesign Today + Workstreams as dense operational dashboards:
  - Persistent top context rail.
  - Stronger primary action zones.
  - Better cluster/group semantics.
  - Compact but legible metadata blocks.
- Increase continuity between views:
  - Shared app chrome and sectional framing.
  - Consistent panel rhythm and token usage.
- Upgrade empty states:
  - Action-first language, fewer tutorial paragraphs, clearer next action.
- Normalize motion:
  - Calm base transitions, premium microinteractions only on intentful controls.

## Redesign Acceptance Criteria (Desktop)
- Today and Workstreams are visually and structurally upgraded without removing existing capabilities.
- Search remains the fastest path and keeps progressive streaming clarity.
- Navigation coherence improves across Search/Today/Workstreams.
- Empty/locked/error states are clearer and less repetitive.
- Shared token/primitives usage is consistent with landing demo components.
