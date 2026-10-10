# IXOS MARKETING WEBSITE - SPECIFICATION PART 5
# RULES, CONSTRAINTS & ACCEPTANCE CRITERIA
# ============================================================

## 1. DO NOT RULES (CRITICAL)

These rules MUST be printed and followed. Violations will result in rejection.

### 1.1 Visual Rules - DO NOT
```
╔══════════════════════════════════════════════════════════════════╗
║                        DO NOT RULES                               ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  ✗ DO NOT remove particle background                             ║
║    → Particles must exist from first paint                        ║
║    → Must respond to cursor                                       ║
║    → Must be present in all sections                              ║
║                                                                   ║
║  ✗ DO NOT replace hero video with static image                   ║
║    → Video must play on scroll                                    ║
║    → Fallback poster only for reduced motion                      ║
║                                                                   ║
║  ✗ DO NOT drop scroll choreography                               ║
║    → Hero pinning is required                                     ║
║    → Electric traces must animate                                 ║
║    → Ripple pulse must occur                                      ║
║                                                                   ║
║  ✗ DO NOT turn site into generic feature-card soup               ║
║    → Avoid boring grid of cards                                   ║
║    → Pipeline diagram required                                    ║
║    → Asymmetric layouts required                                  ║
║                                                                   ║
║  ✗ DO NOT add bright neon gradients                              ║
║    → No "AI-style" cyan glow headings                            ║
║    → Subtle gradients only (white-to-gray)                        ║
║    → Teal is accent, not primary                                  ║
║                                                                   ║
║  ✗ DO NOT add symmetrical "centered everything" layout           ║
║    → Hero must be left text + right video                         ║
║    → Pipeline must be left diagram + right steps                  ║
║    → Asymmetry creates visual interest                            ║
║                                                                   ║
║  ✗ DO NOT add fake dashboards or admin panels                    ║
║    → Ixos is a desktop app, not SaaS                              ║
║    → Show the actual app interface in video                       ║
║                                                                   ║
║  ✗ DO NOT use overly rounded/bubbly fonts                        ║
║    → Use Geist or Inter, not Comic Sans                           ║
║    → Premium dev-tool aesthetic                                   ║
║                                                                   ║
║  ✗ DO NOT simplify by removing backgrounds/effects               ║
║    → Every visual element is intentional                          ║
║    → Simplification = regression                                  ║
║                                                                   ║
╚══════════════════════════════════════════════════════════════════╝
```

### 1.2 Implementation Rules - DO NOT
```
✗ DO NOT mix GSAP ScrollTrigger and Framer Motion scroll
  → Choose one, stick with it
  → Recommended: GSAP for complex pinning

✗ DO NOT use WebGL for particles (unless performance required)
  → Canvas2D is sufficient and simpler
  → Keep bundle size reasonable

✗ DO NOT forget reduced motion support
  → Must respect prefers-reduced-motion
  → Provide fallbacks for all animations

✗ DO NOT block main thread with particle calculations
  → Use requestAnimationFrame properly
  → Throttle on low-end devices

✗ DO NOT use unoptimized images
  → Use Next.js <Image> component
  → Provide width/height for layout stability
```

---

## 2. MUST HAVE CHECKLIST

### 2.1 Hero Section
- [ ] Left headline text (5 columns)
- [ ] Right hero deck video card (6 columns)
- [ ] Particle background active
- [ ] Download CTA visible
- [ ] Watch Demo CTA visible
- [ ] Tiny animated badge
- [ ] 200vh total height
- [ ] Video deck pins on scroll
- [ ] Electric traces draw on scroll

### 2.2 Effects
- [ ] Particles respond to cursor (attract + connect)
- [ ] Particles attracted to traces when active
- [ ] Electric traces animate (stroke draw)
- [ ] Traveling pulse on traces
- [ ] Yellow spark at junction
- [ ] Ripple pulse event
- [ ] Scribble strike on "INDEXING"

### 2.3 How It Works
- [ ] Pipeline diagram (sticky left)
- [ ] 5 step cards (scrolling right)
- [ ] Step activation highlights pipeline node
- [ ] "No indexing" message with scribble

### 2.4 Pricing
- [ ] Free tier card
- [ ] Pro tier card ($7.95/mo)
- [ ] Enterprise "Coming Soon" card
- [ ] Monthly/Annual toggle
- [ ] Annual discount indication
- [ ] Download CTAs
- [ ] Card hover effects

### 2.5 Navigation
- [ ] Fixed position
- [ ] Download button in nav
- [ ] Particle magnet on button hover
- [ ] Blur backdrop on scroll
- [ ] Mobile responsive

### 2.6 Visual Polish
- [ ] Strip divider between sections
- [ ] Graphite texture overlay
- [ ] Dark graphite background
- [ ] Porcelain white text
- [ ] Teal accent only
- [ ] Yellow spark micro-detail

### 2.7 Accessibility
- [ ] Reduced motion support
- [ ] Keyboard navigation
- [ ] Semantic HTML
- [ ] Alt text for images

### 2.8 Performance
- [ ] DPR-aware canvas
- [ ] Throttled animations
- [ ] Optimized images
- [ ] Lazy loading where appropriate

---

## 3. ACCEPTANCE CRITERIA (MANDATORY)

All criteria must be verified and documented in QA.md.

### A1: Particle Background
```
Verification:
1. Open site in browser
2. Particles visible immediately on hero
3. Move cursor - particles attract toward cursor
4. Particles near each other connect with lines
5. Scroll down - particles visible (lower density) elsewhere
6. Screenshot evidence required
```

### A2: Hero Video & Pin
```
Verification:
1. Load page, video paused initially
2. Begin scrolling
3. At ~10vh scroll, video starts playing
4. Hero deck stays pinned while page scrolls
5. At ~80vh, hero deck unpins
6. Recording/GIF evidence required
```

### A3: Electric Trace Routing
```
Verification:
1. Start scrolling from hero
2. At ~20vh, traces begin drawing from hero deck
3. Traces route with orthogonal segments
4. Traces lead toward How It Works section
5. Screenshot of traces visible
```

### A4: Ripple Pulse
```
Verification:
1. Scroll to ~40vh in hero
2. Observe ripple emanating from hero deck
3. Nearby particles react (slight outward push)
4. Recording evidence required
```

### A5: Scribble Strike
```
Verification:
1. Scroll to How It Works section
2. Find "INDEXING" text
3. Observe scribble cross-out animation
4. Animation sweeps left-to-right
5. Screenshot before/after
```

### A6: Pricing Configuration
```
Verification:
1. Navigate to pricing section
2. Confirm Free tier visible
3. Confirm Pro tier at $7.95/mo (or €7.95)
4. Confirm Enterprise "Coming Soon" visible
5. Toggle to Annual - price updates
6. Annual shows discount indication
```

### A7: Download CTA & Particle Magnet
```
Verification:
1. Locate Download button in nav
2. Locate Download button in hero
3. Hover over button
4. Observe particles attracted toward button
5. Button styling changes on hover
```

### A8: Strip Divider
```
Verification:
1. Scroll between Hero and How It Works
2. Observe strip divider (white dots)
3. Scroll between How It Works and Pricing
4. Observe strip divider
5. At least 2 dividers present
```

### A9: Color Palette
```
Verification:
1. Background is dark graphite (not pure black)
2. Text is porcelain white (not blue/teal)
3. Teal used for accents only (buttons, highlights)
4. No bright neon gradients visible
5. One yellow spark moment visible (trace junction)
```

### A10: Responsive & Reduced Motion
```
Verification:
1. Resize browser to 768px width
2. Site remains functional and readable
3. Enable "prefers-reduced-motion: reduce" in OS
4. Reload page
5. Animations disabled, static alternatives shown
6. Video shows poster instead of autoplay
```

---

## 4. TESTING COMMANDS

### 4.1 Development
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

### 4.2 Quality Checks
```bash
# Lint check
npm run lint

# TypeScript check
npx tsc --noEmit

# Build check
npm run build
```

### 4.3 Visual Testing
```
1. Open Chrome DevTools
2. Check Console for errors
3. Check Network for failed assets
4. Check Performance for frame drops
5. Test with Lighthouse for accessibility
```

---

## 5. MOBILE CONSIDERATIONS

### 5.1 Breakpoints
```css
/* Mobile-first breakpoints */
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

### 5.2 Mobile Adjustments
```
Feature              | Desktop           | Mobile (<768px)
─────────────────────┼───────────────────┼─────────────────
Particle count       | 120-150           | 40-60
Hero layout          | 2 columns         | Stacked
Pipeline             | Side-by-side      | Stacked
Pricing cards        | 3 columns         | Stacked
Nav                  | Horizontal        | Hamburger
Font sizes           | Full scale        | Reduced
Hero height          | 200vh             | 100vh + scroll
```

### 5.3 Touch Considerations
- No cursor attraction (no hover on touch)
- Larger tap targets (44px minimum)
- Disable Lenis smooth scroll on touch
- Simpler scroll choreography

---

## 6. BROWSER SUPPORT

### 6.1 Minimum Versions
```
Chrome:  90+
Firefox: 88+
Safari:  14+
Edge:    90+
```

### 6.2 Feature Detection
```typescript
// Canvas support
const hasCanvas = !!document.createElement('canvas').getContext;

// Reduced motion
const prefersReducedMotion = 
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Touch device
const isTouchDevice = 
  'ontouchstart' in window || navigator.maxTouchPoints > 0;
```

---

# END OF PART 5 - RULES, CONSTRAINTS & ACCEPTANCE CRITERIA
# This completes the specification. See SPEC_FULL.md for overview.
