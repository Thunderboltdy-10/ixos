# IXOS MARKETING WEBSITE - SPECIFICATION PART 2
# SECTIONS & COMPONENTS
# ============================================================

## 1. NAVIGATION

### 1.1 Layout
```
┌──────────────────────────────────────────────────────────────────┐
│ [IXOS LOGO]     Features   Pricing   Docs   [Watch Demo] [DOWNLOAD]
└──────────────────────────────────────────────────────────────────┘
     ↑                                              ↑         ↑
   Icon.png                                    Secondary   Primary
   + wordmark                                  ghost btn   accent btn
```

### 1.2 Styling
- Fixed position, top: 0
- Background: transparent initially, --bg-primary on scroll
- Height: 64px
- Max-width: container-xl, centered
- Blur backdrop on scroll: backdrop-filter: blur(12px)

### 1.3 Download Button Special Hover
- On hover: subtle color inversion (teal border, white text → white bg, dark text)
- Particle magnet effect: nearby particles attract toward button
- Duration: 300ms ease-out

### 1.4 Mobile Nav
- Hamburger menu at 768px breakpoint
- Slide-out drawer from right
- Same theme, full-height overlay

---

## 2. HERO STORY SECTION (200vh total)

### 2.1 Overall Architecture
```
┌──────────────────────────────────────────────────────────────────┐
│                         HERO (100vh)                              │
│                                                                   │
│  ┌─────────────────┐              ┌───────────────────────┐      │
│  │  HEADLINE       │              │                       │      │
│  │  (5 cols)       │              │    HERO DECK          │      │
│  │                 │              │    (video card)       │      │
│  │  "Find anything │              │    (6 cols)           │      │
│  │   on your       │              │                       │      │
│  │   computer"     │              │    ┌─────────────────┐│      │
│  │                 │              │    │  hero.mp4       ││      │
│  │  Subhead        │              │    │  (app demo)     ││      │
│  │                 │              │    └─────────────────┘│      │
│  │  [Download]     │              │                       │      │
│  │  [Watch Demo]   │              └───────────────────────┘      │
│  │                 │                                              │
│  │  [tiny badge]   │                                              │
│  └─────────────────┘                                              │
│                                                                   │
│  ═══════════════════════════════════════════════════════════════ │
│                    PARTICLES EVERYWHERE                           │
│                    + graphite texture overlay                     │
└──────────────────────────────────────────────────────────────────┘
│                                                                   │
│                    SCROLL STORY (100vh sticky)                    │
│                                                                   │
│  - Hero deck pins in place                                        │
│  - Video plays                                                    │
│  - Electric traces draw downward                                  │
│  - Ripple pulse propagates                                        │
│  - Particles attracted to traces                                  │
│  - Hand-off to How It Works                                       │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Headline Block
- Position: left 5 columns
- Content:
  ```
  Find anything on your computer.
  Instantly.
  
  Ixos uses semantic search to find files the way you think
  about them. Local, private, lightning fast.
  
  [Download for Windows]  [Watch Demo]
  
  [✦ v1.0 now available] ← tiny animated badge
  ```

### 2.3 Hero Deck (Video Card)
- Position: right 6 columns, vertically centered
- Styling:
  - background: --bg-secondary
  - border: 1px solid --border-subtle
  - border-radius: 12px
  - box-shadow: --shadow-lg + --shadow-glow-teal (very subtle)
  - overflow: hidden
- Content:
  - Top bar: fake window controls (dots) + "Ixos" title
  - Video player: hero.mp4, autoplay, muted, loop (on scroll)
  - Video aspect ratio: 16:9 or match provided asset

### 2.4 Background Layers
```
Layer order (bottom to top):
1. --bg-primary solid color
2. Graphite paper texture overlay (3% opacity)
3. ParticlesField canvas (full viewport)
4. Subtle radial gradient lighting (very subtle, Resend-style)
   - One warm glow top-left (hsla(30, 50%, 50%, 0.03))
   - One cool glow bottom-right (hsla(200, 50%, 50%, 0.02))
```

### 2.5 Tiny Badge
- Near headline, below CTAs
- Content: "✦ v1.0 now available" or similar
- Style: pill shape, --bg-tertiary, subtle border
- Animation: gentle pulse glow (2s infinite)

---

## 3. HERO SCROLL CHOREOGRAPHY

### 3.1 Trigger Points
```
Scroll Position    |  Event
─────────────────────────────────────
0vh                |  Initial state
10vh               |  Video begins playing
20vh               |  Electric traces start drawing
40vh               |  First ripple pulse
60vh               |  Particles attracted to traces
80vh               |  Hero deck begins unpinning
100vh              |  Full transition to How It Works
```

### 3.2 Pinning Behavior
- Hero deck pins at scroll 0vh
- Remains pinned until 80vh of scroll progress
- Uses ScrollTrigger or Framer Motion useScroll
- Transform: scale slightly down from 1.02 → 1.0 during pin

### 3.3 Video Playback
- Video paused initially
- Play triggered at 10vh scroll
- If reduced motion: show static poster frame

---

## 4. ELECTRIC TRACE ROUTING

### 4.1 Visual Design
```
                    HERO DECK
                        │
                        │ (trace starts here)
                        ▼
         ┌──────────────┼──────────────┐
         │              │              │
         ▼              ▼              ▼
    ┌────┴────┐    ┌────┴────┐    ┌────┴────┐
    │ Step 1  │    │ Step 2  │    │ Step 3  │
    └─────────┘    └─────────┘    └─────────┘
    
Style:
- Orthogonal segments (Manhattan routing)
- Rounded 90° corners (radius: 8px)
- Stroke: 1.5px
- Color: --text-primary (porcelain white)
- Occasional teal highlight on active segments
- ONE yellow spark at a junction point
```

### 4.2 Animation Sequence
1. Path draws on (stroke-dashoffset animation)
2. Traveling pulse follows path (0.5s behind draw)
3. Yellow spark flashes at junction (once)
4. Faint glow layer fades in near spark

### 4.3 Implementation
```tsx
// SVG path with viewBox matching layout
<svg viewBox="0 0 1200 800" className="absolute inset-0">
  <defs>
    <linearGradient id="trace-gradient">
      <stop offset="0%" stopColor="var(--text-primary)" />
      <stop offset="100%" stopColor="var(--accent-teal)" />
    </linearGradient>
  </defs>
  
  <path
    d="M600,100 L600,200 L300,200 L300,400..."
    stroke="url(#trace-gradient)"
    strokeWidth="1.5"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ pathLength, strokeDashoffset }}
  />
</svg>
```

---

## 5. HOW IT WORKS SECTION

### 5.1 Layout
```
┌──────────────────────────────────────────────────────────────────┐
│                      HOW IT WORKS                                 │
│                                                                   │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐  │
│  │                     │    │                                 │  │
│  │   PIPELINE          │    │   STEP CONTENT                  │  │
│  │   DIAGRAM           │    │   (scrolls, reveals)            │  │
│  │   (sticky)          │    │                                 │  │
│  │                     │    │   Step 1: Query typed           │  │
│  │   ┌─────┐           │    │   ─────────────────             │  │
│  │   │Query│           │    │   Type naturally...             │  │
│  │   └──┬──┘           │    │                                 │  │
│  │      ▼              │    │   Step 2: JIT embeddings        │  │
│  │   ┌─────┐           │    │   ─────────────────             │  │
│  │   │ JIT │           │    │   Computed on the fly...        │  │
│  │   └──┬──┘           │    │                                 │  │
│  │      ▼              │    │   Step 3: Local search          │  │
│  │   ┌─────┐           │    │   ─────────────────             │  │
│  │   │Search│          │    │   Ranked locally...             │  │
│  │   └──┬──┘           │    │                                 │  │
│  │      ▼              │    │   Step 4: Deleted instantly     │  │
│  │   ┌─────┐           │    │   ─────────────────             │  │
│  │   │Delete│          │    │   No trace left behind...       │  │
│  │   └──┬──┘           │    │   ╔═══════════════════════════╗ │  │
│  │      ▼              │    │   ║ No ̶I̶N̶D̶E̶X̶I̶N̶G̶ required  ║ │  │
│  │   ┌─────┐           │    │   ╚═══════════════════════════╝ │  │
│  │   │Stream│          │    │                                 │  │
│  │   └─────┘           │    │   Step 5: Results stream        │  │
│  │                     │    │   ─────────────────             │  │
│  └─────────────────────┘    │   Open files instantly...       │  │
│                              └─────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 5.2 Pipeline Diagram
- Left 5 columns, sticky positioned
- Dark card background (--bg-secondary)
- Nodes connected by traces
- Active node highlighted with teal glow
- Receives traces from hero deck above

### 5.3 Steps Content
- Right 7 columns, scrolling
- Each step card reveals on scroll
- When step enters viewport:
  - Corresponding pipeline node activates
  - Trace pulse travels to that node
  - Card fades/slides in

### 5.4 Scribble Strike Animation
- On step 2 or 3, show: "No INDEXING required"
- "INDEXING" gets crossed out with scribble
- Use scribble.png as mask
- Animation: mask sweeps left-to-right with jitter
- Duration: 600ms
- Trigger: when step scrolls into view

---

## 6. PRICING SECTION

### 6.1 Layout
```
┌──────────────────────────────────────────────────────────────────┐
│                         PRICING                                   │
│                                                                   │
│                 ┌─────────────────────────┐                       │
│                 │  Monthly  ●───○  Annual │                       │
│                 │           ↑ toggle      │                       │
│                 └─────────────────────────┘                       │
│                                                                   │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐         │
│  │     FREE      │  │      PRO      │  │  ENTERPRISE   │         │
│  │               │  │               │  │               │         │
│  │    $0/mo      │  │   $7.95/mo    │  │  Coming Soon  │         │
│  │               │  │   or $79/yr   │  │               │         │
│  │  • 100 files  │  │  • Unlimited  │  │  • Custom     │         │
│  │  • Basic      │  │  • Priority   │  │  • Volume     │         │
│  │               │  │  • Advanced   │  │  • Support    │         │
│  │  [Download]   │  │  [Download]   │  │  [Contact]    │         │
│  │               │  │               │  │               │         │
│  └───────────────┘  └───────────────┘  └───────────────┘         │
│         ↑                  ↑                   ↑                  │
│    subtle lift       highlighted         faded/coming            │
│    on hover          (popular)           soon badge              │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 Toggle Switch
- Monthly / Annual toggle
- Annual shows discount badge (e.g., "2 months free")
- Smooth transition on price display

### 6.3 Card Styling
- Background: --bg-secondary
- Border: 1px solid --border-subtle
- Popular card (Pro): teal border, subtle glow
- Enterprise: slightly faded, "Coming Soon" badge

### 6.4 Micro-interactions
- Cards lift on hover (translateY: -4px)
- Shadow intensifies on hover
- Download button attracts nearby particles locally
- Price number animates on toggle (counter effect)

---

## 7. TRUST SECTION

### 7.1 Layout
```
┌──────────────────────────────────────────────────────────────────┐
│                    BUILT FOR PRIVACY                              │
│                                                                   │
│   "Your files. Your computer. Your business."                    │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │   LOCAL     │  │    FAST     │  │  EPHEMERAL  │               │
│  │   100%      │  │ Sub-second  │  │  No trace   │               │
│  │   on-device │  │  queries    │  │  left       │               │
│  └─────────────┘  └─────────────┘  └─────────────┘               │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 7.2 Cards
- Three trust pillars as cards
- Icon + title + short description
- Subtle hover effect (glow)

---

## 8. FOOTER

### 8.1 Layout
```
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│  IXOS                        Product    Resources    Legal       │
│  Semantic search             Download   Docs         Privacy     │
│  for your desktop            Pricing    Blog         Terms       │
│                              GitHub     Support                   │
│                                                                   │
│  ─────────────────────────────────────────────────────────────   │
│  © 2025 Ixos. All rights reserved.                               │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 9. BUTTON COMPONENT VARIANTS

### 9.1 Primary Button
- Background: --accent-teal
- Text: --bg-primary (dark)
- Hover: brighten, subtle glow
- Active: scale 0.98

### 9.2 Secondary Button (Ghost)
- Background: transparent
- Border: 1px solid --border-medium
- Text: --text-primary
- Hover: border brightens, subtle fill

### 9.3 Download Button (Special)
- Primary styling
- Icon: download arrow
- Hover: particle magnet effect

---

# END OF PART 2 - SECTIONS & COMPONENTS
# Continue to SPEC_PART3_EFFECTS.md for effects and animations
