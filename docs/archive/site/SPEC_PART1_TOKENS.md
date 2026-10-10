# IXOS MARKETING WEBSITE - SPECIFICATION PART 1
# BRAND FOUNDATION & DESIGN TOKENS
# ============================================================

## 1. BRAND IDENTITY

### 1.1 What is Ixos?
Ixos is a **desktop semantic search application** - NOT SaaS, NOT a web product.
It's a native app that finds files on your computer using natural language.

### 1.2 Brand Pillars
```
┌─────────────────────────────────────────────────────────────┐
│                      IXOS BRAND PILLARS                     │
├─────────────────┬─────────────────┬─────────────────────────┤
│     SPEED       │    PRIVACY      │    NO INDEXING          │
│                 │                 │                         │
│ Instant results │ 100% local      │ JIT embeddings deleted  │
│ Sub-second      │ No cloud        │ instantly after search  │
│ queries         │ No telemetry    │ Uses xattr/ADS for      │
│                 │ Models on-device│ tiny metadata only      │
└─────────────────┴─────────────────┴─────────────────────────┘
```

### 1.3 Tone & Voice
- Playful but professional (not jokey)
- Premium and engineered feel
- Target: Everyone + developers
- Convenience software that feels high-end

---

## 2. COLOR SYSTEM (DESIGN TOKENS)

### 2.1 Background Colors
```css
/* Near-black graphite variants */
--bg-primary:     hsl(220, 10%, 6%);    /* #0f1012 - Main background */
--bg-secondary:   hsl(220, 10%, 8%);    /* #141618 - Cards, elevated */
--bg-tertiary:    hsl(220, 10%, 10%);   /* #191b1e - Hover states */
--bg-elevated:    hsl(220, 10%, 12%);   /* #1e2024 - Modals, dropdowns */
```

### 2.2 Text Colors (Porcelain Whites)
```css
/* Porcelain white is PRIMARY text - NOT teal */
--text-primary:   hsl(40, 20%, 95%);    /* #f7f5f2 - Main headings */
--text-secondary: hsl(40, 15%, 80%);    /* #d4cfc6 - Body text */
--text-muted:     hsl(40, 10%, 55%);    /* #948f85 - Captions */
--text-subtle:    hsl(40, 5%, 40%);     /* #6b6864 - Disabled */
```

### 2.3 Accent Colors
```css
/* Teal - Ixos signature ACCENT (not primary text) */
--accent-teal:        hsl(175, 70%, 45%);  /* #22b8a8 - Primary accent */
--accent-teal-dim:    hsl(175, 60%, 35%);  /* #1c9488 - Subtle teal */
--accent-teal-glow:   hsl(175, 80%, 55%);  /* #2dd4c4 - Glow effect */

/* Yellow Spark - Micro-detail ONLY */
--accent-spark:       hsl(45, 95%, 60%);   /* #f5c822 - Junction spark */
--accent-spark-glow:  hsl(45, 100%, 70%);  /* #ffd34d - Spark glow */

/* Optional micro-accents */
--accent-blue:        hsl(220, 70%, 55%);  /* #4477dd - Very rare */
--accent-purple:      hsl(280, 50%, 55%);  /* #9955bb - Very rare */
```

### 2.4 Border & Surface Colors
```css
--border-subtle:  hsl(220, 10%, 15%);   /* #252729 - 1px borders */
--border-medium:  hsl(220, 10%, 20%);   /* #333537 - Visible borders */
--surface-glass:  hsla(220, 10%, 15%, 0.6); /* Glass effect */
```

### 2.5 Shadow Tokens
```css
/* Soft "levitation" shadows for hero deck and key elements */
--shadow-sm: 0 2px 8px hsla(0, 0%, 0%, 0.3);
--shadow-md: 0 4px 16px hsla(0, 0%, 0%, 0.4);
--shadow-lg: 0 8px 32px hsla(0, 0%, 0%, 0.5);
--shadow-glow-teal: 0 0 40px hsla(175, 70%, 45%, 0.2);
--shadow-glow-spark: 0 0 20px hsla(45, 95%, 60%, 0.3);
```

---

## 3. TYPOGRAPHY SYSTEM

### 3.1 Font Stack
```css
/* Primary: Geist Sans (or Inter fallback) */
--font-sans: 'Geist Sans', 'Inter', -apple-system, BlinkMacSystemFont, 
             'Segoe UI', Roboto, sans-serif;

/* Mono: Geist Mono (or JetBrains Mono fallback) */
--font-mono: 'Geist Mono', 'JetBrains Mono', 'Fira Code', 
             'SF Mono', Consolas, monospace;
```

### 3.2 Type Scale
```
Display:    72px / 1.0  / -0.03em / 700  (Hero headline)
H1:         56px / 1.1  / -0.025em / 600 (Section titles)
H2:         40px / 1.2  / -0.02em / 600  (Subsections)
H3:         28px / 1.3  / -0.01em / 500  (Card titles)
H4:         20px / 1.4  / 0       / 500  (Small titles)
Body:       16px / 1.6  / 0       / 400  (Paragraphs)
Body-sm:    14px / 1.5  / 0       / 400  (Secondary text)
Caption:    12px / 1.4  / 0.02em  / 400  (Labels)
Mono:       14px / 1.5  / 0       / 400  (Code snippets)
```

### 3.3 Heading Style
```css
/* Elegant Resend-inspired styling */
.heading-gradient {
  background: linear-gradient(
    180deg, 
    var(--text-primary) 0%, 
    var(--text-secondary) 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
```

### 3.4 Typography Rules
- DO NOT use overly rounded, bubbly fonts
- DO NOT use "AI-glow cyan headings" 
- Headlines use subtle white-to-gray gradient (very subtle)
- Body text is porcelain white, never teal
- Teal only for interactive accents and highlights

---

## 4. SPACING & LAYOUT GRID

### 4.1 Spacing Scale
```css
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  24px;
--space-6:  32px;
--space-7:  48px;
--space-8:  64px;
--space-9:  96px;
--space-10: 128px;
```

### 4.2 Container Widths
```css
--container-sm: 640px;
--container-md: 768px;
--container-lg: 1024px;
--container-xl: 1280px;
--container-2xl: 1536px;
```

### 4.3 Grid System
```
┌──────────────────────────────────────────────────────────────┐
│                        MAIN LAYOUT                            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                     NAV (fixed)                        │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                   CONTENT (12-col)                     │  │
│  │  ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┬──┐ │  │
│  │  │ 1    │ 2    │ 3    │ 4    │ 5    │ 6    │...   │12│ │  │
│  │  └──────┴──────┴──────┴──────┴──────┴──────┴──────┴──┘ │  │
│  │  Gap: 24px (desktop) / 16px (mobile)                   │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. TEXTURE & VISUAL EFFECTS

### 5.1 Graphite Paper Texture
- Apply as very subtle overlay on sections
- Opacity: 3-5% max
- Blend mode: overlay or soft-light
- Implementation: CSS pseudo-element with noise image

### 5.2 Strip Divider
- Use `/public/assets/strip-divider.png` between major sections
- White dots on transparent background
- Works on dark backgrounds
- Full width, subtle separation

### 5.3 Risograph Grain
- Apply to certain headings or quote blocks only
- NOT everywhere - very selective use
- Opacity: 8-12%
- Creates organic, printed feel

---

## 6. ASSET MANIFEST

### 6.1 Required Assets
```
/public/assets/
├── hero.mp4           # Hero demo video
├── icon.png           # Ixos app icon (for CTAs)
├── scribble.png       # Scribble strike-through
└── strip-divider.png  # Section divider
```

### 6.2 Asset Usage Rules
- hero.mp4: Loops in hero deck, muted by default
- icon.png: Used in download buttons, footer
- scribble.png: Animated mask over "INDEXING" word
- strip-divider.png: Between major sections

---

## 7. CSS VARIABLE IMPLEMENTATION

### 7.1 globals.css Structure
```css
:root {
  /* Colors */
  --bg-primary: hsl(220, 10%, 6%);
  --bg-secondary: hsl(220, 10%, 8%);
  --bg-tertiary: hsl(220, 10%, 10%);
  --bg-elevated: hsl(220, 10%, 12%);
  
  --text-primary: hsl(40, 20%, 95%);
  --text-secondary: hsl(40, 15%, 80%);
  --text-muted: hsl(40, 10%, 55%);
  --text-subtle: hsl(40, 5%, 40%);
  
  --accent-teal: hsl(175, 70%, 45%);
  --accent-teal-dim: hsl(175, 60%, 35%);
  --accent-teal-glow: hsl(175, 80%, 55%);
  --accent-spark: hsl(45, 95%, 60%);
  --accent-spark-glow: hsl(45, 100%, 70%);
  
  --border-subtle: hsl(220, 10%, 15%);
  --border-medium: hsl(220, 10%, 20%);
  
  /* Typography */
  --font-sans: 'Geist Sans', 'Inter', sans-serif;
  --font-mono: 'Geist Mono', 'JetBrains Mono', monospace;
  
  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;
  --space-9: 96px;
  --space-10: 128px;
  
  /* Shadows */
  --shadow-sm: 0 2px 8px hsla(0, 0%, 0%, 0.3);
  --shadow-md: 0 4px 16px hsla(0, 0%, 0%, 0.4);
  --shadow-lg: 0 8px 32px hsla(0, 0%, 0%, 0.5);
  --shadow-glow-teal: 0 0 40px hsla(175, 70%, 45%, 0.2);
  
  /* Animation */
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

# END OF PART 1 - BRAND FOUNDATION & DESIGN TOKENS
# Continue to SPEC_PART2_SECTIONS.md for section specifications
