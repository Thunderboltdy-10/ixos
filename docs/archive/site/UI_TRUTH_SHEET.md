# Ixos UI Truth Sheet

Phase 0 deliverable — ground truth for typography, spacing, colors, radii, and icon style from the desktop app.
Landing page must reference these tokens via shared `@ixos/ui` package.

---

## Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| graphite-0 | `#050507` | Page background |
| graphite-1 | `#0A0C10` | Secondary background |
| graphite-2 | `#12151A` | Card background |
| graphite-3 | `#1E2024` | Elevated surface |
| porcelain | `#F3F5F7` | Primary text |
| fg-primary | `rgba(243,245,247,0.88)` | Body text |
| fg-secondary | `rgba(243,245,247,0.65)` | Secondary text |
| fg-muted | `rgba(243,245,247,0.42)` | Muted text, captions |
| fg-ghost | `rgba(243,245,247,0.22)` | Placeholder text |
| accent-teal | `#14B8A6` | Primary accent, active states |
| accent-teal-dim | `rgba(20,184,166,0.65)` | Dim teal |
| accent-teal-glow | `rgba(20,184,166,0.85)` | Glow effect |
| accent-amber | `#F6B94C` | Warning, warm states |
| accent-violet | `#7C5CFF` | Security, cryptography |
| accent-magenta | `#F472B6` | Highlights |
| status-success | `#10B981` | Success states |
| status-warning | `#F59E0B` | Warning states |
| status-error | `#EF4444` | Error states |
| border-hairline | `rgba(243,245,247,0.06)` | Hairline borders |
| border-subtle | `rgba(243,245,247,0.09)` | Subtle borders |
| border-medium | `rgba(243,245,247,0.14)` | Medium borders |

Source: `packages/ui/src/tokens/colors.ts` + `ui/tailwind.config.cjs`

---

## Typography

| Scale | Size | Weight | Font | Usage |
|-------|------|--------|------|-------|
| display-xl | clamp(36px, 5vw, 72px) | 800 | Space Grotesk (`--font-ixo-heading`) | Hero headlines |
| display-lg | clamp(28px, 3.5vw, 52px) | 700 | Space Grotesk | Section headlines |
| display-md | 28px | 700 | Space Grotesk | Card titles |
| body-lg | 15px | 400 | Geist Mono (`--font-ixo-mono`) | Subheadlines |
| body-md | 13px | 400 | Geist Mono | Body text |
| body-sm | 12px | 400 | Geist Mono | Secondary body |
| caption | 11px | 400 | Geist Mono | Captions, metadata |
| chip | 10px | 400 | Geist Mono | Chips, badges |
| micro | 10px | 400 | Geist Mono | Source paths, labels |

Tracking: Headlines `-0.03em`, Chips `0.12em` uppercase, Captions `0.1em` uppercase.

Source: `ixos-site/src/app/layout.tsx`, `ui/tailwind.config.cjs`

---

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| 4px | 4px | Micro gaps within components |
| 6px | 6px | Chip padding, small gaps |
| 8px | 8px | Inner card gaps |
| 10px | 10px | Component gaps, chip padding vertical |
| 12px | 12px | Card padding, list item gaps |
| 14px | 14px | Rail padding horizontal |
| 18px | 18px | Rail padding, world-panel top |
| 20px | 20px | Panel padding horizontal |
| 28px | 28px | Section gaps |
| 32px | 32px | Nav padding |
| 40px | 40px | Page padding, chapter padding |
| 48px | 48px | Left panel chapter padding-left |

---

## Border Radii

| Component | Radius |
|-----------|--------|
| `.ixos-world` | 18px |
| `.ixos-card` | 12px |
| `.ixos-result-row` | 10px |
| `.ixos-input` | 12px |
| `.ixos-kpi` | 11px |
| `.ixos-chip` | 999px (pill) |
| `.ixos-nav-btn` | 10px |
| Bullet items | 12px |
| CTA buttons | 10px |

Source: `packages/ixos-ui/src/styles.css`

---

## Shadows & Depth

| Element | Shadow |
|---------|--------|
| AppWorld surface | `0 32px 120px rgba(0,0,0,0.55), 0 0 0 1px rgba(243,245,247,0.04) inset` |
| Result card hover glow | `0 0 0 1px rgba(20,184,166,0.36)` |
| Input focus ring | `0 0 0 2px rgba(20,184,166,0.18)` |
| Loader dot glow | `0 0 10px rgba(20,184,166,0.4)` |
| Region highlight | `0 0 24px rgba(20,184,166,0.2)` |

---

## Icon Style

- Library: `lucide-react`
- Sizes used: 12px (chips), 14px (nav buttons), 16–18px (inline)
- Stroke: 1.5px (lucide default)
- Color: inherit from parent (usually `rgba(243,245,247,0.72)` for chips, `#5eead4` for active)
- No filled icons

Source: `packages/ixos-ui/src/components/AppWorldSurface.tsx`

---

## Component CSS Classes (from `@ixos/ixos-ui`)

| Class | Description |
|-------|-------------|
| `.ixos-world` | Main app window container |
| `.ixos-world-grid` | Two-column layout (210px rail + content) |
| `.ixos-world-rail` | Left navigation rail |
| `.ixos-world-panel` | Main content area |
| `.ixos-chip` | Status chips / tags (pill shaped) |
| `.ixos-nav-btn` | Rail navigation buttons |
| `.ixos-card` | Content card |
| `.ixos-result-row` | Search result row |
| `.ixos-input` | Text input field |
| `.ixos-kpi` | KPI metric card |
| `.ixos-loader-grid` | Loader container (120×120px) |
| `.ixos-loader-dot` | Individual loader dot (8×8px, borderRadius 2px) |

---

## Motion Tokens

| Property | Value | Usage |
|----------|-------|-------|
| Spring ease | `[0.22, 1, 0.36, 1]` | Stage panel entrances |
| Exit ease | `[0.4, 0, 1, 0.6]` | Stage panel exits |
| Result stream delay | `min(index * 0.028, 0.18)s` | Progressive result appearance |
| Transition duration | 0.42–0.55s | Major transitions |
| Chip transition | 160ms ease | Hover states |
| Pipeline shimmer | `ixosPulse 1.1s linear infinite` | Active pipeline bar |

Source: `packages/ixos-ui/src/components/SearchSurface.tsx`, `styles.css`

---

## Sync Proof (Phase 0)

The `/5` page imports directly from `@ixos/ixos-ui` (transpiled via `next.config.ts`):
```
import { AppWorldSurface, AmbientIxosField, PixelRingLoader } from '@ixos/ixos-ui';
```

To verify sync: change `border-radius: 18px` in `packages/ixos-ui/src/styles.css`
to `border-radius: 24px`. The AppWorld on the landing page will update immediately
on next build/hot reload. No copying required. ✓

Source of truth package: `packages/ixos-ui/`
Next.js transpile config: `ixos-site/next.config.ts` → `transpilePackages: ['@ixos/ixos-ui']`
