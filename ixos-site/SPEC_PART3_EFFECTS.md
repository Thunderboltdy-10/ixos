# IXOS MARKETING WEBSITE - SPECIFICATION PART 3
# EFFECTS & ANIMATIONS
# ============================================================

## 1. PARTICLES FIELD EFFECT

### 1.1 Overview
Interactive particle system that creates "semantic graph dust" feel.
NOT a generic starfield - more organic, connected, alive.

### 1.2 Visual Characteristics
```
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│      ·   ·                              ·                        │
│        ·──·          ●←cursor             ·   ·                  │
│   ·   ·     ·    ·──●──·              ·                         │
│         ·        ·   ·   ·               ·                       │
│   ·  ·      ·              ·      ·                              │
│        ·     ·  ·   ·          ·   ·                             │
│                                                                   │
│   Particles:                                                      │
│   - Vary in size (1-3px)                                         │
│   - Vary in opacity (0.3-0.8)                                    │
│   - Drift with mild noise                                        │
│   - Connect when close (lines)                                   │
│   - Attracted to cursor                                          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 1.3 Particle Properties
```typescript
interface Particle {
  x: number;              // position
  y: number;
  vx: number;             // velocity
  vy: number;
  size: number;           // 1-3px
  opacity: number;        // 0.3-0.8
  color: string;          // mostly white, rare teal
}
```

### 1.4 Behavior Rules
1. **Drift**: Particles drift naturally with Perlin noise
2. **Cursor Attraction**: Within 150px radius, particles accelerate toward cursor
3. **Connection Lines**: If two particles within 100px, draw faint line between
4. **Clustering**: Near cursor, particles form temporary clusters
5. **Trace Attraction**: When traces active, particles gently align toward nearest trace

### 1.5 Density by Section
```
Section          | Particle Count | Connection Distance
─────────────────┼────────────────┼────────────────────
Hero             | 120-150        | 100px
How It Works     | 60-80          | 80px
Pricing          | 40-50          | 60px
Footer           | 20-30          | 50px
```

### 1.6 Performance Requirements
- Use Canvas2D (not WebGL for simplicity)
- DPR-aware: scale canvas for retina
- Throttle to 60fps max, drop to 30fps on low-end
- requestAnimationFrame with delta time
- Reduced motion: static particles, no animation

### 1.7 Implementation Skeleton
```typescript
// ParticlesField.tsx
'use client';

import { useEffect, useRef } from 'react';

interface ParticlesFieldProps {
  density?: 'high' | 'medium' | 'low';
  tracePoints?: { x: number; y: number }[];
}

export function ParticlesField({ 
  density = 'high',
  tracePoints = []
}: ParticlesFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Initialize particles based on density
    // Animation loop with requestAnimationFrame
    // Handle cursor tracking
    // Handle trace field influence
    // Cleanup on unmount
  }, [density, tracePoints]);
  
  return (
    <canvas 
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
}
```

---

## 2. ELECTRIC TRACE ROUTING

### 2.1 Visual Style
```
Manhattan-style routing:
                    
    ┌────────────────────────┐
    │                        │
    │        ●START          │
    │          │             │
    │          │             │
    │          └──────┐      │
    │                 │      │
    │                 │      │
    │         ┌───────┘      │
    │         │              │
    │         ●END           │
    │                        │
    └────────────────────────┘
    
- Orthogonal segments
- Rounded 90° corners (8px radius)
- Thin strokes (1.5px)
- Porcelain white base
- Teal for active segments
- Yellow spark at junction
```

### 2.2 Path Structure
```
Hero Deck (center-bottom anchor)
         │
         ▼
    ┌────┴────┐
    │         │
    ▼         ▼
[Step 1]  [Step 2]
         │
         ▼
    [Step 3]
         │
         ▼
    [Step 4]
         │
         ▼
    [Step 5]
```

### 2.3 Animation Phases
```
Time        | Phase
────────────┼────────────────────────────────
0-500ms     | Path draws from hero deck (stroke-dashoffset)
500-1000ms  | Traveling pulse follows path
800ms       | Yellow spark at first junction
1000-1500ms | Glow layer fades in near active nodes
1500ms+     | Subtle continuous pulses
```

### 2.4 SVG Implementation
```tsx
// ElectricTraces.tsx
interface TraceSegment {
  path: string;           // SVG path d attribute
  delay: number;          // Animation delay
  duration: number;       // Draw duration
  hasSparkJunction: boolean;
}

const TRACE_SEGMENTS: TraceSegment[] = [
  {
    path: 'M 600,200 L 600,300 Q 600,308 608,308 L 700,308',
    delay: 0,
    duration: 800,
    hasSparkJunction: false
  },
  {
    path: 'M 700,308 Q 708,308 708,316 L 708,400',
    delay: 400,
    duration: 600,
    hasSparkJunction: true  // Yellow spark here
  },
  // ... more segments
];
```

### 2.5 Glow Effect
- Use SVG filter for glow: `<feGaussianBlur>` + `<feComposite>`
- Apply only near active segments
- Opacity: 0.3-0.5
- Color: teal-glow for segments, spark-glow for junction

---

## 3. RIPPLE PULSE EFFECT

### 3.1 Description
Concentric dot ripple that propagates outward from hero deck.
Like an energy pulse emanating from the search.

### 3.2 Visual
```
                    ●
                  · · ·
                ·   ●   ·
              ·   · · ·   ·
            ·   ·       ·   ·
              ·   · · ·   ·
                ·   ●   ·
                  · · ·
                    ●
                    
- Dots arranged in circles
- Circles expand outward
- Opacity fades as distance increases
- 2-3 rings maximum
```

### 3.3 Animation
```
Trigger: Scroll reaches 40vh in hero story
Duration: 1500ms
Easing: ease-out

Ring 1: 0ms delay, expands from 0 to 200px radius
Ring 2: 200ms delay, expands from 0 to 300px radius
Ring 3: 400ms delay, expands from 0 to 400px radius

Each ring fades from opacity 0.6 to 0
```

### 3.4 Particle Interaction
When ripple passes through particles:
- Particles get slight outward velocity boost
- Then get pulled back toward traces
- Creates "wave through dust" effect

---

## 4. SCRIBBLE STRIKE ANIMATION

### 4.1 Purpose
Crosses out the word "INDEXING" to emphasize "No indexing required"

### 4.2 Visual
```
Before:            After:
                   
INDEXING          Ị̷̶N̷̶D̷̶E̷̶X̷̶I̷̶N̷̶G̷̶
                    ~~~~~~~~
                  (scribble overlay)
```

### 4.3 Implementation
```tsx
// ScribbleStrike.tsx

interface ScribbleStrikeProps {
  children: React.ReactNode;
  isActive: boolean;
}

export function ScribbleStrike({ children, isActive }: ScribbleStrikeProps) {
  return (
    <span className="relative inline-block">
      {children}
      <span 
        className={cn(
          "absolute inset-0 bg-[url('/assets/scribble.png')]",
          "bg-contain bg-center bg-no-repeat",
          "transition-all duration-600",
          isActive ? "clip-path-full" : "clip-path-zero"
        )}
        style={{
          clipPath: isActive 
            ? 'inset(0 0 0 0)' 
            : 'inset(0 100% 0 0)'
        }}
      />
    </span>
  );
}
```

### 4.4 Animation Details
- Mask sweeps left-to-right
- Duration: 600ms
- Easing: ease-out with slight overshoot
- Optional: add subtle jitter (translateX ±2px) for hand-drawn feel

---

## 5. SCROLL CHOREOGRAPHY SYSTEM

### 5.1 Technology Choice
Use GSAP ScrollTrigger OR Framer Motion useScroll.
Do NOT mix both - creates conflicts.

Recommended: GSAP ScrollTrigger for complex pinning.

### 5.2 Scroll Triggers Overview
```typescript
const SCROLL_TRIGGERS = {
  heroVideoPlay: {
    trigger: '.hero-story',
    start: 'top top',
    end: '+=10%',     // 10vh of scroll
    onEnter: () => playVideo()
  },
  
  heroPin: {
    trigger: '.hero-deck',
    start: 'top center',
    end: '+=80%',
    pin: true,
    pinSpacing: true
  },
  
  tracesDraw: {
    trigger: '.hero-story',
    start: '+=20%',
    end: '+=60%',
    scrub: true,
    onUpdate: (self) => updateTracePath(self.progress)
  },
  
  ripplePulse: {
    trigger: '.hero-story',
    start: '+=40%',
    onEnter: () => triggerRipple()
  },
  
  scribbleStrike: {
    trigger: '.how-it-works-step-2',
    start: 'top center',
    onEnter: () => activateScribble()
  }
};
```

### 5.3 Lenis Integration
```typescript
// Smooth scroll with Lenis
import Lenis from '@studio-freight/lenis';

useEffect(() => {
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: 'vertical',
    gestureDirection: 'vertical',
    smooth: true,
    smoothTouch: false,
    touchMultiplier: 2,
  });

  function raf(time: number) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  
  requestAnimationFrame(raf);
  
  return () => lenis.destroy();
}, []);
```

---

## 6. BUTTON HOVER EFFECTS

### 6.1 Download Button Particle Magnet
When hovering the Download button:
- Nearby particles (100px radius) accelerate toward button center
- Create a subtle "pulling in" effect
- On mouse leave, particles drift back naturally

### 6.2 Implementation Hook
```typescript
// useParticleMagnet.ts
export function useParticleMagnet(
  buttonRef: RefObject<HTMLElement>,
  particlesRef: RefObject<Particle[]>
) {
  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;
    
    const handleMouseEnter = () => {
      const rect = button.getBoundingClientRect();
      const center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
      
      // Emit event for particles field to respond
      window.dispatchEvent(new CustomEvent('particle-magnet', {
        detail: { center, active: true }
      }));
    };
    
    const handleMouseLeave = () => {
      window.dispatchEvent(new CustomEvent('particle-magnet', {
        detail: { active: false }
      }));
    };
    
    button.addEventListener('mouseenter', handleMouseEnter);
    button.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      button.removeEventListener('mouseenter', handleMouseEnter);
      button.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [buttonRef, particlesRef]);
}
```

---

## 7. REDUCED MOTION SUPPORT

### 7.1 Detection
```typescript
const prefersReducedMotion = 
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

### 7.2 Fallbacks
```
Feature              | Normal Mode          | Reduced Motion
─────────────────────┼──────────────────────┼────────────────
Particles            | Animated, drifting   | Static positions
Cursor attraction    | Active               | Disabled
Traces               | Animated draw        | Instant show
Ripple               | Animated expansion   | Instant show
Scroll choreography  | Active               | Instant transitions
Video                | Autoplay             | Show poster frame
Lenis smooth scroll  | Enabled              | Disabled (native)
```

### 7.3 CSS Implementation
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 8. ANIMATION TIMING TOKENS

### 8.1 Duration Scale
```css
--duration-instant: 0ms;
--duration-fast: 150ms;
--duration-normal: 300ms;
--duration-slow: 500ms;
--duration-slower: 800ms;
--duration-slowest: 1200ms;
```

### 8.2 Easing Functions
```css
--ease-linear: linear;
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-out-back: cubic-bezier(0.34, 1.56, 0.64, 1);
--ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
```

---

# END OF PART 3 - EFFECTS & ANIMATIONS
# Continue to SPEC_PART4_PAGES.md for page structure
