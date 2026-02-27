# V4 Design Truth

Single source of design tokens for the /4 landing page. All values are drawn directly from `globals.css`, `layout.tsx`, and `tailwind.config`.

---

## Font Families

| Role | CSS Variable | Load | Class |
|------|-------------|------|-------|
| Monospace / code | `--font-ixo-mono` | Geist Mono (next/font/google, weights 400/500/600) | `font-mono` |
| Display / headings | `--font-ixo-heading` | Space Grotesk (next/font/google) | `font-display` |

Both variables are set on `<body>` in `src/app/layout.tsx`.

Usage in inline styles:
```
fontFamily: 'var(--font-ixo-mono)'
fontFamily: 'var(--font-ixo-heading, sans-serif)'
```

---

## Color Palette

### Background
| Name | Value | Usage |
|------|-------|-------|
| Background base | `#0C0E10` | Page background, section fills |
| Card surface | `rgba(14,17,23,0.85)` | Simulator card, bento cells |
| Overlay dark | `rgba(12,14,16,0.85)` | Nav bar |

### Accent Colors
| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Cyan | `#2DD4BF` | 45, 212, 191 | Primary CTA, locked-phase results, logo mark |
| Violet | `#7C3AED` | 124, 58, 237 | Semantic phase, Pro mode, secondary gradient |
| Amber | `#F59E0B` | 245, 158, 11 | Scanning/lexical phase, Flash mode, stats |

### Text
| Name | Value | Usage |
|------|-------|-------|
| Text primary | `#F3F5F7` | Headings, filenames, active labels |
| Text secondary | `rgba(243,245,247,0.6)` | Body copy, descriptions |
| Text muted | `rgba(243,245,247,0.35)` | Captions, pipeline labels |
| Text dim | `rgba(255,255,255,0.28)` | Rank numbers, status meta |
| Text faint | `rgba(255,255,255,0.15)` | Scroll indicator |

### Semantic Phase Colors
| Phase | Color | Hex |
|-------|-------|-----|
| Lexical | Amber | `#F59E0B` |
| Semantic | Violet | `#7C3AED` |
| Locked | Cyan | `#2DD4BF` |

### Mode Chip Colors
| Mode | Background | Border | Text |
|------|-----------|--------|------|
| Flash | `rgba(245,158,11,0.12)` | `rgba(245,158,11,0.3)` | `#F59E0B` |
| Auto | `rgba(45,212,191,0.12)` | `rgba(45,212,191,0.3)` | `#2DD4BF` |
| Pro | `rgba(124,58,237,0.12)` | `rgba(124,58,237,0.3)` | `#7C3AED` |

---

## Borders
| Token | Value |
|-------|-------|
| Default border | `1px solid rgba(255,255,255,0.07)` |
| Active border | `1px solid rgba(255,255,255,0.08)` |
| Scrolled nav border | `1px solid rgba(255,255,255,0.08)` |
| Card inner border | `inset 0 1px 0 rgba(255,255,255,0.05)` |
| Evidence panel | `1px solid rgba(45,212,191,0.12)` |

---

## Border Radius
| Context | Value |
|---------|-------|
| Simulator card | `14px` |
| CTA buttons | `6px` |
| Stage pills | `4px` |
| Chip / badge | `999px` |
| Score bar | `2px` |
| Evidence panel | `8px` |
| Nav download button | `4px` |

---

## Spacing Scale
Follows a 4px base grid.

| Token | px |
|-------|----|
| xs | 4 |
| sm | 8 |
| md | 12 |
| lg | 16 |
| xl | 24 |
| 2xl | 32 |
| 3xl | 48 |
| 4xl | 64 |

Hero section padding: `paddingTop: 80px` (nav clearance), `paddingBottom: 64px`

---

## Animation Easings
| Name | Cubic Bezier | Usage |
|------|-------------|-------|
| Spring out | `[0.16, 1, 0.3, 1]` | Evidence panel expand, result row appearance |
| Material | `[0.4, 0, 0.2, 1]` | Phase transitions, mode chip swap |
| Ease out cubic | `1 - (1-t)^3` | File count rAF, brightness decay |
| Linear | `linear` | Scan progress bar sweep, cursor blink |
| Ease out | `easeOut` | Page fade-in after loader |

---

## Backdrop / Glass
| Element | Value |
|---------|-------|
| Simulator card | `backdropFilter: blur(10px)` |
| Nav bar | `backdropFilter: blur(12px)` |

---

## Typography Scale (Geist Mono usage in simulator)
| Element | Size | Weight | Tracking |
|---------|------|--------|----------|
| Query text | 13px | 400 | default |
| Filename | 13px | 400 | default |
| Score value | 12px | 400 | default |
| Rank number | 11px | 400 | default |
| Mode chip | 10px | 400 | 0.1em |
| Status badge | 9px | 400 | 0.12em |
| Status meta | 10px | 400 | 0.04em |
| Pipeline labels | 9px | 400 | 0.08em |
| Nav links | 10px | 400 | 0.18em |
| Kicker | 10px | 400 | 0.28em |

---

## Gradient Recipes
| Name | Value |
|------|-------|
| Hero headline gradient | `linear-gradient(135deg, #2DD4BF 0%, #7C3AED 100%)` |
| Card glow | `box-shadow: 0 0 80px rgba(45,212,191,0.05)` |
| Blueprint grid | `linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)` |
| Scan sweep | `linear-gradient(90deg, transparent, #F59E0B, transparent)` |
