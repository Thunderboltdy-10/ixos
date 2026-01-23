# Ixos Protocol Landing Page

The official landing page for [Ixos Protocol](https://github.com/ixos-protocol/ixos), the privacy-first semantic search tool.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + Custom Design Tokens
- **Animations**: Framer Motion
- **3D Visualization**: React Three Fiber
- **Language**: TypeScript

## Project Structure

```
landing/
├── app/                  # Next.js App Router pages
├── components/           # React components
│   ├── ui/               # Reusable UI primitives (Button, Card)
│   └── ...               # Feature-specific sections
├── lib/                  # Utilities and constants
│   ├── design-tokens.ts  # Design system source of truth
│   └── animations.ts     # Shared animation variants
└── public/               # Static assets
```

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser.

3. **Build for production:**
   ```bash
   npm run build
   ```
   This will generate a static export in the `out/` directory.

## Design System

We use a "Neural Constellation" visual metaphor with a glassmorphic aesthetic.
- **Primary Colors**: Brand Blue (`#1a365d`) and Teal (`#0d9488`)
- **Typography**: Inter (UI) and JetBrains Mono (Code)
- **Effects**: 
  - `ParticleBackground`: Canvas-based interactive background
  - `ThreeScreenshot`: 3D rotating product visualization

## Deployment

This project is configured for static export (`output: 'export'` in `next.config.mjs`).
It can be deployed to any static hosting provider (Vercel, Cloudflare Pages, GitHub Pages).

### Vercel
Connect your specific repository branch. The build settings should valid automatically (Framework: Next.js).

### GitHub Pages
Run the GitHub Actions workflow provided in the main repo or manually deploy the `out/` folder.
