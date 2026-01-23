/**
 * IXOS V2 Theme - "Graphite Noir + Porcelain Ink"
 * JS Token exports for programmatic access
 */

export const v2Colors = {
  // Backgrounds
  bg: '#050607',
  bg2: '#07090B',
  surface: '#0B0F13',
  surface2: '#0F151C',
  surface3: '#141A24',

  // Text
  text: '#F4F6F8',
  text2: 'rgba(244, 246, 248, 0.78)',
  muted: 'rgba(244, 246, 248, 0.58)',
  muted2: 'rgba(244, 246, 248, 0.40)',
  dim: 'rgba(244, 246, 248, 0.20)',

  // Borders
  border: 'rgba(255, 255, 255, 0.10)',
  border2: 'rgba(255, 255, 255, 0.06)',
  border3: 'rgba(255, 255, 255, 0.03)',

  // Accents
  teal: '#0D9488',
  teal2: '#14B8A6',
  tealGlow: 'rgba(13, 148, 136, 0.15)',
  tealGlowStrong: 'rgba(13, 148, 136, 0.30)',
  amber: '#F6B94C',
  amberGlow: 'rgba(246, 185, 76, 0.15)',
  violet: '#7C5CFF',
  violetGlow: 'rgba(124, 92, 255, 0.15)',
} as const;

export const v2Shadows = {
  sm: '0 4px 16px rgba(0, 0, 0, 0.4)',
  md: '0 8px 32px rgba(0, 0, 0, 0.5)',
  lg: '0 16px 48px rgba(0, 0, 0, 0.55)',
  deck: '0 24px 80px rgba(0, 0, 0, 0.65)',
  xl: '0 32px 96px rgba(0, 0, 0, 0.7)',
  edgeRing: '0 0 0 1px rgba(255, 255, 255, 0.06)',
  topHighlight: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
  innerShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
} as const;

export const v2Fonts = {
  display: "'Instrument Serif', Georgia, 'Times New Roman', serif",
  mono: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
  body: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
} as const;

export const v2FontSizes = {
  xs: '0.6875rem',    // 11px
  sm: '0.8125rem',    // 13px
  base: '1rem',       // 16px
  lg: '1.25rem',      // 20px
  xl: '1.5rem',       // 24px
  '2xl': '2rem',      // 32px
  '2.5xl': '2.5rem',  // 40px
  '3xl': '3rem',      // 48px
  '4xl': '3.5rem',    // 56px
  hero: '4.5rem',     // 72px
} as const;

export const v2Spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
  '4xl': '96px',
} as const;

export const v2Radii = {
  xs: '2px',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
} as const;

export const v2Transitions = {
  instant: '80ms cubic-bezier(0.2, 0.8, 0.2, 1)',
  fast: '120ms cubic-bezier(0.2, 0.8, 0.2, 1)',
  base: '200ms cubic-bezier(0.2, 0.8, 0.2, 1)',
  slow: '400ms cubic-bezier(0.0, 0.0, 0.2, 1)',
} as const;

// RGB values for canvas/programmatic use
export const v2ColorsRGB = {
  text: { r: 244, g: 246, b: 248 },
  muted: { r: 244, g: 246, b: 248, a: 0.40 },
  teal: { r: 13, g: 148, b: 136 },
  teal2: { r: 20, g: 184, b: 166 },
  amber: { r: 246, g: 185, b: 76 },
  violet: { r: 124, g: 92, b: 255 },
} as const;

// Tailwind-compatible color mapping
export const v2TailwindColors = {
  'v2-bg': '#050607',
  'v2-bg2': '#07090B',
  'v2-surface': '#0B0F13',
  'v2-surface2': '#0F151C',
  'v2-surface3': '#141A24',
  'v2-text': '#F4F6F8',
  'v2-teal': '#0D9488',
  'v2-teal2': '#14B8A6',
  'v2-amber': '#F6B94C',
  'v2-violet': '#7C5CFF',
} as const;
