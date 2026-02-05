# UI Streaming + Classification Consistency Fix (2026-02-05)

## Scope
- Fix non-moving streaming banner under search input.
- Ensure search history query text is prominent while metadata stays subdued.
- Unify match classification so result badge and "Why this matched" use the same source.
- Improve discoverability of `Ctrl+K` and clarify Today/Workstreams value.

## Root Cause Summary
| Issue | Root Cause | Fix |
|---|---|---|
| Streaming banner appeared frozen | Auto mode still eagerly indexed Pro in Tauri command path, delaying stream start; SearchDeck progress handling depended on brittle stage/phase transitions and could render before a search had started | Skip eager Pro index in Auto (`src-tauri/src/commands/search.rs`), normalize stream stage/stats handling, render deck only after a search starts, and reset SearchDeck timers/progress on new searches |
| Classification mismatch | `SearchResults` used a fixed `semantic > 0.4` rule while `WhyMatched` used synthetic proxy values | Added shared classifier (`ui/src/lib/matchClassification.ts`) and switched both badge + breakdown UI to the same score-driven primary signal |
| `Ctrl+K` discoverability weak | Shortcut visible only in modal behavior, not anchored in core navigation UI | Added shortcut chips near Guide and Ready/Search footer |

## Commands Run
- `npm run build` (from `ui/`)
- `cargo check` (repo root)

## Command Results
- `npm run build`: success (`tsc && vite build`), production bundle generated.
- `cargo check`: success for `ixos-protocol` workspace checks.

## Files Changed
- `src-tauri/src/commands/search.rs`
- `ui/src/stores/searchStore.ts`
- `ui/src/components/search/SearchDeck.tsx`
- `ui/src/lib/matchClassification.ts`
- `ui/src/components/search/ScoreBreakdown.tsx`
- `ui/src/components/search/SearchResults.tsx`
- `ui/src/components/search/ResultCard.tsx`
- `ui/src/components/search/WhyMatched.tsx`
- `ui/src/components/layout/Sidebar.tsx`
- `ui/src/components/today/TodayTab.tsx`
- `ui/src/components/workstreams/WorkstreamsList.tsx`

## UX/Behavioral Changes
| Area | Before | After |
|---|---|---|
| Streaming deck | Could feel static/frozen between searches and on Auto startup | Deck now appears only after search start, progress resets cleanly per search, and stages update consistently from stream events |
| Result classification | Badge rule and explanation could disagree | One shared classification source (primary score signal) |
| Search history readability | Query text and metadata had similar contrast hierarchy | Query text uses bright foreground; metadata remains dim |
| Shortcut discoverability | `Ctrl+K` discoverability depended on prior knowledge | `Ctrl+K` surfaced in persistent sidebar locations |
| Today/Workstreams clarity | Value proposition implied but not explicit | Added short usage guidance copy in both headers |

## Follow-up Validation Needed
1. Run a Tauri app manual smoke search in Auto mode and verify live stage progression and moving scan trail under real repo load.
2. Validate that secondary semantic result updates preserve selection while user is navigating results.
