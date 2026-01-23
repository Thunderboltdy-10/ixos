/**
 * Ixos Electric Glass Design System
 *
 * This module exports the design tokens and Tailwind preset
 * for the Electric Glass design language.
 *
 * Usage:
 * 1. Import tokens.css in your app's global styles
 * 2. Use the Tailwind preset in your tailwind.config
 *
 * CSS Import (in globals.css):
 * ```css
 * @import '../../shared/design-tokens/tokens.css';
 * ```
 *
 * Tailwind (in tailwind.config.ts):
 * ```ts
 * import electricGlassPreset from '../shared/design-tokens/tailwind-preset';
 * export default {
 *   presets: [electricGlassPreset],
 *   // ...
 * }
 * ```
 */

export { default as electricGlassPreset } from './tailwind-preset';

// Design token values for programmatic access
export const tokens = {
  colors: {
    void: '#030304',
    bgPrimary: '#050506',
    bgSecondary: '#0a0a0c',
    bgElevated: '#0f0f12',
    bgSurface: '#141417',

    fgPrimary: '#ffffff',
    fgSecondary: '#888890',
    fgMuted: '#505058',
    fgDim: '#303038',

    accentPrimary: '#14b8a6',
    accentPrimaryDim: '#0d7d71',
    accentPrimaryBright: '#2dd4bf',

    accentSecondary: '#6366f1',
    accentSecondaryDim: '#4338ca',
    accentSecondaryBright: '#818cf8',

    brandCyan: '#06b6d4',
    brandBlue: '#3b82f6',

    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
  },

  borders: {
    subtle: 'rgba(255, 255, 255, 0.04)',
    default: 'rgba(255, 255, 255, 0.08)',
    hover: 'rgba(255, 255, 255, 0.12)',
  },

  radii: {
    none: '0',
    xs: '2px',
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
  },

  timing: {
    instant: 80,
    fast: 120,
    base: 200,
    slow: 400,
  },

  easing: {
    snap: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    out: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;

// For canvas/WebGL usage (0-255 RGB values)
export const rgbColors = {
  accentPrimary: { r: 20, g: 184, b: 166 },
  accentSecondary: { r: 99, g: 102, b: 241 },
  brandCyan: { r: 6, g: 182, b: 212 },
  brandBlue: { r: 59, g: 130, b: 246 },
  fgPrimary: { r: 255, g: 255, b: 255 },
  fgSecondary: { r: 136, g: 136, b: 144 },
} as const;
