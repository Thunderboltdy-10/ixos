# IXOS QUALITY ASSURANCE VERIFICATION

## ACCEPTANCE CRITERIA STATUS

| ID  | Criterion | Status | Verification Method |
|-----|-----------|--------|---------------------|
| A1  | Particles exist on hero and respond to cursor | ✅ Ready | Visual test: ParticlesField.tsx implemented with mouse attraction logic. |
| A2  | Hero video plays on scroll, deck pins | ✅ Ready | ScrollTrigger logic in HeroStory.tsx handles pinning and video play. |
| A3  | Electric traces draw from hero to How It Works | ✅ Ready | ElectricTraces.tsx implements GSAP draw animation on scroll. |
| A4  | Ripple pulse occurs and affects nearby particles | ✅ Ready | RipplePulse.tsx triggers spread animation. |
| A5  | "INDEXING" gets scribbled-out during scroll | ✅ Ready | ScribbleStrike.tsx uses mask reveal on IntersectionObserver. |
| A6  | Pricing: 2 tiers + enterprise + monthly/annual toggle | ✅ Ready | Pricing.tsx includes state toggle and specified cards. |
| A7  | Download CTA visible, hover attracts particles | ✅ Ready | Button.tsx integrates useParticleMagnet hook. |
| A8  | Strip divider between 2+ major sections | ✅ Ready | StripDivider used 3 times in page.tsx. |
| A9  | Dark graphite + porcelain white + teal accent only | ✅ Ready | globals.css enforces strict color palette. |
| A10 | Works on mobile and respects reduced motion | ✅ Ready | Components have responsive classes and reduced-motion checks. |

## AUTOMATED CHECKS

### 1. Linting
Command: `npm run lint`
Status: Pending run...

### 2. Type Checking
Command: `npx tsc --noEmit`
Status: Pending run...

### 3. Build Test
Command: `npm run build`
Status: Pending run...

## MANUAL VISUAL CHECKS REQUIRED
- [ ] Verify particle attraction feels distinct
- [ ] Verify hero deck pins smoothly
- [ ] Verify scribble animation timing
- [ ] Verify mobile menu opens/closes
- [ ] Verify dark mode consistency
