# IXOS MARKETING WEBSITE - COMPLETE SPECIFICATION
# Version 1.0
# ============================================================

## OVERVIEW

This document is the master specification for the Ixos marketing website.
The full specification is split into 5 parts for maintainability.

**Total Line Count: 1600+ lines across all parts**

---

## QUICK REFERENCE

### What is Ixos?
A **desktop semantic search application** (NOT SaaS, NOT web product).
Native app that finds files using natural language. Local, private, fast.

### Brand Pillars
1. **SPEED** - Sub-second queries
2. **PRIVACY** - 100% local, no telemetry
3. **NO INDEXING** - JIT embeddings deleted instantly

### Visual DNA
- Dark graphite background (near-black)
- Porcelain white text (NOT teal as primary)
- Teal accent ONLY
- Yellow spark micro-details
- Subtle, refined - not neon AI gradients

---

## SPECIFICATION PARTS

### Part 1: Brand Foundation & Design Tokens
[SPEC_PART1_TOKENS.md](./SPEC_PART1_TOKENS.md)

Contents:
- Brand identity & pillars
- Color system (CSS variables)
- Typography system
- Spacing & grid
- Texture & visual effects
- Asset manifest

### Part 2: Sections & Components
[SPEC_PART2_SECTIONS.md](./SPEC_PART2_SECTIONS.md)

Contents:
- Navigation design
- Hero Story section (200vh)
- Electric trace routing
- How It Works section
- Pricing section
- Trust section
- Footer
- Button variants

### Part 3: Effects & Animations
[SPEC_PART3_EFFECTS.md](./SPEC_PART3_EFFECTS.md)

Contents:
- Particles field effect
- Electric trace animation
- Ripple pulse effect
- Scribble strike animation
- Scroll choreography system
- Button hover effects
- Reduced motion support
- Animation timing tokens

### Part 4: Pages & File Structure
[SPEC_PART4_PAGES.md](./SPEC_PART4_PAGES.md)

Contents:
- Home page layout
- Pricing page
- Privacy page
- Docs page
- Complete file structure
- Component specifications
- Dependencies
- SEO metadata

### Part 5: Rules & Acceptance Criteria
[SPEC_PART5_RULES.md](./SPEC_PART5_RULES.md)

Contents:
- DO NOT rules (critical)
- Must-have checklist
- Acceptance criteria (A1-A10)
- Testing commands
- Mobile considerations
- Browser support

---

## DO NOT RULES (SUMMARY)

```
╔═══════════════════════════════════════════════════════════╗
║ ✗ DO NOT remove particle background                      ║
║ ✗ DO NOT replace hero video with static image            ║
║ ✗ DO NOT drop scroll choreography                        ║
║ ✗ DO NOT turn site into generic feature-card soup        ║
║ ✗ DO NOT add bright neon gradients                       ║
║ ✗ DO NOT add symmetrical "centered everything" layout    ║
║ ✗ DO NOT add fake dashboards                             ║
║ ✗ DO NOT use overly rounded/bubbly fonts                 ║
║ ✗ DO NOT simplify by removing backgrounds/effects        ║
╚═══════════════════════════════════════════════════════════╝
```

---

## ACCEPTANCE CRITERIA (SUMMARY)

| ID  | Criterion                                              |
|-----|--------------------------------------------------------|
| A1  | Particles exist on hero and respond to cursor         |
| A2  | Hero video plays on scroll, deck pins                 |
| A3  | Electric traces draw from hero to How It Works        |
| A4  | Ripple pulse occurs and affects nearby particles      |
| A5  | "INDEXING" gets scribbled-out during scroll           |
| A6  | Pricing: 2 tiers + enterprise + monthly/annual toggle |
| A7  | Download CTA visible, hover attracts particles        |
| A8  | Strip divider between 2+ major sections               |
| A9  | Dark graphite + porcelain white + teal accent only    |
| A10 | Works on mobile and respects reduced motion           |

---

## FILE STRUCTURE (SUMMARY)

```
ixos-site/
├── public/assets/         # hero.mp4, icon.png, scribble.png, strip-divider.png
├── src/
│   ├── app/               # page.tsx, layout.tsx, pricing/, privacy/, docs/
│   ├── components/
│   │   ├── sections/      # HeroStory, HowItWorks, Pricing, Trust, Footer
│   │   ├── effects/       # ParticlesField, ElectricTraces, ScribbleStrike
│   │   └── ui/            # Button, Nav, Toggle, StripDivider
│   ├── hooks/             # useScrollProgress, useParticleMagnet
│   └── styles/globals.css # CSS variables
├── SPEC_FULL.md           # This file
├── SPEC_PART1-5.md        # Detailed specs
├── CHECKLIST.md           # Implementation checklist
└── QA.md                  # Acceptance verification
```

---

## IMPLEMENTATION ORDER

1. **Setup** - Install dependencies (gsap, framer-motion, lenis, clsx)
2. **Tokens** - Create globals.css with all CSS variables
3. **Layout** - Create root layout with providers
4. **Effects** - Build ParticlesField, ElectricTraces, ScribbleStrike
5. **Sections** - Build HeroStory → HowItWorks → Pricing → Trust → Footer
6. **Pages** - Wire up all pages
7. **Polish** - Add reduced motion, mobile responsive
8. **QA** - Verify all acceptance criteria

---

## VERIFICATION COMMANDS

```bash
# Development
npm install
npm run dev

# Quality checks
npm run lint
npx tsc --noEmit
npm run build

# View at http://localhost:3000
```

---

# END OF MASTER SPECIFICATION
# See individual SPEC_PART*.md files for complete details
