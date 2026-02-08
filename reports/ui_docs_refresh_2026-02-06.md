# UI + DOCS REFRESH REPORT (2026-02-06)

## SCOPE

- Landing hero/pipeline redesign and motion tuning.
- Feedback revision: guided scroll-driven demo state, stronger custom diagram language, always-visible centered hero demo, and docs IA overhaul.
- Auth readability fixes for landing + desktop app (Clerk UI).
- Markdown organization and root markdown cleanup into docs archive.

## COMMANDS RUN

```powershell
npm --prefix ui run build
npm --prefix ixos-site run build
cd ixos-site; npx eslint src/components/sections/HeroPipeline.tsx src/components/hero/IxosDemoWindow.tsx src/components/hero/diagrams/QueryDecomposition.tsx src/components/hero/diagrams/VectorSpace.tsx src/components/hero/diagrams/ScoreWaterfall.tsx src/components/hero/diagrams/MemoryWipe.tsx src/components/hero/diagrams/StreamWaterfall.tsx src/app/docs/layout.tsx src/app/docs/page.tsx src/app/docs/getting-started/page.tsx src/app/docs/desktop-app/page.tsx src/app/docs/models/page.tsx src/app/docs/benchmarking/page.tsx src/app/docs/agents/page.tsx src/components/auth/AuthScreen.tsx src/components/ui/SectionDivider.tsx
```

## OUTPUT SUMMARY

- `ui` production build: PASS.
- `ixos-site` production build: PASS.
- Targeted lint on touched landing/docs files: PASS.
- Full `ixos-site` lint still contains unrelated pre-existing errors outside this pass.

## BEFORE/AFTER SNAPSHOT

| Area | Before | After |
|---|---|---|
| Hero visibility | Demo mostly appeared in later pipeline phase | Demo is visible from the start, centered, and remains the visual anchor |
| Scroll behavior | Looping/autonomous search behavior felt off | Guided scroll state drives demo stages directly (no autonomous loop in controlled mode) |
| Pulse + reveal | Radiating pulse effect distracted from content | Pulse removed; reveal timing is driven by centered layout + sequential stage activation |
| Diagram value | Generic micro-visuals | Custom diagram language for parse/embed/rank/wipe/stream with continuous motion cues |
| Stream tile | Static-ish file sample | Continuous ticker-style feed to suggest high-volume streaming |
| Story copy | "Storyboard/mockup" framing | Product-grounded "Search Pipeline" title + app-relevant subheading |
| Docs IA | Single-page card-like docs | Multi-page docs with nav: Overview, Getting Started, Desktop App, Models, Benchmarking, Agents |
| Root markdown sprawl | Many non-operational markdown files at root | Moved into `docs/archive/root/`; root keeps only operational control files |

## KEY FILES CHANGED

- `ixos-site/src/components/sections/HeroPipeline.tsx`
- `ixos-site/src/components/hero/IxosDemoWindow.tsx`
- `ixos-site/src/components/hero/fakeSearch.ts`
- `ixos-site/src/components/hero/diagrams/QueryDecomposition.tsx`
- `ixos-site/src/components/hero/diagrams/VectorSpace.tsx`
- `ixos-site/src/components/hero/diagrams/ScoreWaterfall.tsx`
- `ixos-site/src/components/hero/diagrams/MemoryWipe.tsx`
- `ixos-site/src/components/hero/diagrams/StreamWaterfall.tsx`
- `ixos-site/src/components/docs/DocsSideNav.tsx`
- `ixos-site/src/app/globals.css`
- `ixos-site/src/app/docs/layout.tsx`
- `ixos-site/src/app/docs/page.tsx`
- `ixos-site/src/app/docs/getting-started/page.tsx`
- `ixos-site/src/app/docs/desktop-app/page.tsx`
- `ixos-site/src/app/docs/models/page.tsx`
- `ixos-site/src/app/docs/benchmarking/page.tsx`
- `ixos-site/src/app/docs/agents/page.tsx`
- `ixos-site/src/components/auth/AuthScreen.tsx`
- `ui/src/components/auth/AuthGate.tsx`
- `ixos-site/src/components/ui/SectionDivider.tsx`
- `ui/src/components/ui/SectionDivider.tsx`
- `docs/MARKDOWN_INVENTORY.md`
- `docs/archive/root/*` (migrated former root docs)
