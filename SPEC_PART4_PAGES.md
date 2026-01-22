# IXOS MARKETING WEBSITE - SPECIFICATION PART 4
# PAGES & FILE STRUCTURE
# ============================================================

## 1. SITE PAGES

### 1.1 Home Page (/)
Main marketing landing page with all sections.

```
┌──────────────────────────────────────────────────────────────────┐
│                           NAV                                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│                     HERO STORY (200vh)                           │
│                    - Hero content                                 │
│                    - Scroll choreography                          │
│                    - Electric traces                              │
│                                                                   │
├═══════════════════ STRIP DIVIDER ════════════════════════════════┤
│                                                                   │
│                     HOW IT WORKS                                  │
│                    - Pipeline diagram                             │
│                    - Step cards                                   │
│                    - Scribble strike                              │
│                                                                   │
├═══════════════════ STRIP DIVIDER ════════════════════════════════┤
│                                                                   │
│                       PRICING                                     │
│                    - Toggle                                       │
│                    - Cards                                        │
│                                                                   │
├═══════════════════ STRIP DIVIDER ════════════════════════════════┤
│                                                                   │
│                        TRUST                                      │
│                    - Privacy pillars                              │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│                        FOOTER                                     │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 Pricing Page (/pricing)
Dedicated pricing page, reuses Pricing component.

```
┌──────────────────────────────────────────────────────────────────┐
│                           NAV                                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│                      PRICING HERO                                 │
│                    "Simple, transparent pricing"                  │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│                     PRICING CARDS                                 │
│                    (same as homepage)                             │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│                        FAQ                                        │
│                    (optional accordion)                           │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│                        FOOTER                                     │
└──────────────────────────────────────────────────────────────────┘
```

### 1.3 Privacy Page (/privacy)
Simple but polished privacy information.

Content:
```markdown
# Privacy at Ixos

Your files. Your computer. Your business.

## Local-First Architecture
Ixos runs entirely on your device. Your files never 
leave your computer. No cloud servers, no syncing, 
no data collection.

## Zero Telemetry
By default, Ixos collects no usage data, analytics, 
or telemetry. You can optionally enable anonymous 
crash reports to help us improve.

## On-Device AI
All AI models run locally on your machine. Embeddings 
are computed just-in-time and deleted immediately after 
each search. No training data is ever sent anywhere.

## No Indexing
Unlike traditional search tools, Ixos doesn't build 
persistent indexes of your files. We use xattr/ADS 
for tiny metadata only, which you can clear at any time.
```

### 1.4 Docs Page (/docs)
Stub documentation with essential information.

```
┌──────────────────────────────────────────────────────────────────┐
│                           NAV                                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  DOCS                        ┌─────────────────────────────────┐ │
│                              │                                 │ │
│  ├─ Installation             │   Installation                  │ │
│  ├─ System Requirements      │   ───────────                   │ │
│  ├─ Keyboard Shortcuts       │                                 │ │
│  └─ Troubleshooting          │   Download Ixos from the        │ │
│                              │   official website.             │ │
│                              │                                 │ │
│                              │   Windows: Run installer        │ │
│                              │   macOS: Drag to Applications   │ │
│                              │   Linux: AppImage or .deb       │ │
│                              │                                 │ │
│                              └─────────────────────────────────┘ │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│                        FOOTER                                     │
└──────────────────────────────────────────────────────────────────┘
```

System Requirements:
- Windows 10+ / macOS 12+ / Linux (modern distro)
- 8GB RAM minimum
- 500MB disk space

Keyboard Shortcuts:
- `Cmd/Ctrl + Space` - Open Ixos
- `Esc` - Close Ixos
- `Enter` - Open selected result
- `Arrow keys` - Navigate results

---

## 2. FILE STRUCTURE

### 2.1 Required Directory Tree
```
ixos-site/
├── public/
│   ├── assets/
│   │   ├── hero.mp4
│   │   ├── icon.png
│   │   ├── scribble.png
│   │   └── strip-divider.png
│   └── fonts/
│       ├── GeistSans-*.woff2
│       └── GeistMono-*.woff2
│
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with providers
│   │   ├── page.tsx            # Home page
│   │   ├── pricing/
│   │   │   └── page.tsx
│   │   ├── privacy/
│   │   │   └── page.tsx
│   │   └── docs/
│   │       └── page.tsx
│   │
│   ├── components/
│   │   ├── sections/
│   │   │   ├── HeroStory.tsx
│   │   │   ├── HowItWorks.tsx
│   │   │   ├── Pricing.tsx
│   │   │   ├── Trust.tsx
│   │   │   └── Footer.tsx
│   │   │
│   │   ├── effects/
│   │   │   ├── ParticlesField.tsx
│   │   │   ├── ElectricTraces.tsx
│   │   │   ├── ScribbleStrike.tsx
│   │   │   └── RipplePulse.tsx
│   │   │
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Nav.tsx
│   │   │   ├── Toggle.tsx
│   │   │   └── StripDivider.tsx
│   │   │
│   │   └── providers/
│   │       ├── SmoothScrollProvider.tsx
│   │       └── ReducedMotionProvider.tsx
│   │
│   ├── hooks/
│   │   ├── useScrollProgress.ts
│   │   ├── useParticleMagnet.ts
│   │   └── useReducedMotion.ts
│   │
│   ├── lib/
│   │   ├── utils.ts
│   │   └── constants.ts
│   │
│   └── styles/
│       └── globals.css
│
├── SPEC_FULL.md                # Master spec (links to parts)
├── SPEC_PART1_TOKENS.md
├── SPEC_PART2_SECTIONS.md
├── SPEC_PART3_EFFECTS.md
├── SPEC_PART4_PAGES.md
├── SPEC_PART5_RULES.md
├── CHECKLIST.md
├── QA.md
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

---

## 3. COMPONENT SPECIFICATIONS

### 3.1 Layout Component (src/app/layout.tsx)
```typescript
// Must include:
// - Font loading (Geist or Inter/JetBrains)
// - Metadata (SEO)
// - SmoothScrollProvider
// - ReducedMotionProvider
// - ParticlesField (global background)
// - Nav component
```

### 3.2 Nav Component (src/components/ui/Nav.tsx)
Props:
```typescript
interface NavProps {
  transparent?: boolean;  // Initial transparent state
}
```

Features:
- Fixed position
- Blur backdrop on scroll
- Logo + links + CTAs
- Mobile hamburger menu
- Download button with particle magnet

### 3.3 Button Component (src/components/ui/Button.tsx)
Variants:
```typescript
type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  hasParticleMagnet?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}
```

### 3.4 StripDivider Component
```typescript
// Simple component using strip-divider.png
export function StripDivider() {
  return (
    <div 
      className="w-full h-8 bg-[url('/assets/strip-divider.png')] 
                 bg-repeat-x bg-center opacity-50"
    />
  );
}
```

---

## 4. DEPENDENCIES

### 4.1 Required Packages
```json
{
  "dependencies": {
    "next": "^15.x",
    "react": "^19.x",
    "react-dom": "^19.x",
    "@studio-freight/lenis": "^1.x",
    "gsap": "^3.x",
    "framer-motion": "^11.x",
    "clsx": "^2.x",
    "tailwind-merge": "^2.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "@types/react": "^19.x",
    "@types/node": "^20.x",
    "tailwindcss": "^4.x",
    "eslint": "^9.x",
    "eslint-config-next": "^15.x"
  }
}
```

### 4.2 Font Loading
```typescript
// Option 1: Google Fonts (Inter + JetBrains Mono)
import { Inter, JetBrains_Mono } from 'next/font/google';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-sans'
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono'
});

// Option 2: Local Geist fonts
import localFont from 'next/font/local';

const geistSans = localFont({
  src: '../fonts/GeistSans-Variable.woff2',
  variable: '--font-sans'
});
```

---

## 5. SEO METADATA

### 5.1 Home Page
```typescript
export const metadata: Metadata = {
  title: 'Ixos - Semantic Search for Your Desktop',
  description: 'Find anything on your computer instantly. 
                Ixos uses AI-powered semantic search that runs 
                100% locally. Private, fast, no indexing required.',
  keywords: ['desktop search', 'semantic search', 'local AI', 
             'privacy', 'file search'],
  openGraph: {
    title: 'Ixos - Semantic Search for Your Desktop',
    description: 'Find anything on your computer instantly.',
    type: 'website',
    url: 'https://ixos.app',
    images: ['/assets/og-image.png']
  }
};
```

### 5.2 Other Pages
- /pricing: "Ixos Pricing - Free & Pro Plans"
- /privacy: "Ixos Privacy - Local-First, Zero Telemetry"
- /docs: "Ixos Documentation - Getting Started"

---

# END OF PART 4 - PAGES & FILE STRUCTURE
# Continue to SPEC_PART5_RULES.md for acceptance criteria
