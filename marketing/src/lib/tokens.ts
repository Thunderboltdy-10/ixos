/**
 * Ixos Design Tokens — ported from packages/ui/src/tokens/tokens.css
 * Single source of truth for the video's visual language.
 */

// ── Backgrounds (Graphite palette) ──────────────────────────────────────────
export const BG = {
  graphite0: "#15171B",
  graphite1: "#1B1E23",
  graphite2: "#23272E",
  graphite3: "#2D323B",
} as const;

// ── Foreground (Porcelain text hierarchy) ───────────────────────────────────
export const FG = {
  porcelain: "#F3F5F7",
  muted: "rgba(243, 245, 247, 0.72)",
  dim: "rgba(243, 245, 247, 0.5)",
  ghost: "rgba(243, 245, 247, 0.2)",
} as const;

// ── Accent colors ───────────────────────────────────────────────────────────
export const ACCENT = {
  teal: "#14B8A6",
  tealDim: "#0D9488",
  tealGlow: "#2DD4BF",
  amber: "#F6B94C",
  amberDim: "#D97706",
  amberGlow: "#FCD34D",
  violet: "#7C5CFF",
  violetGlow: "#9F8CFF",
  magenta: "#F472B6",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
} as const;

// ── Borders ─────────────────────────────────────────────────────────────────
export const BORDER = {
  hairline: "rgba(243, 245, 247, 0.08)",
  subtle: "rgba(243, 245, 247, 0.12)",
  medium: "rgba(243, 245, 247, 0.20)",
} as const;

// ── Shadows ─────────────────────────────────────────────────────────────────
export const SHADOW = {
  lift: "0 0 0 1px rgba(243, 245, 247, 0.08), 0 20px 60px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.5)",
  glowTeal: "0 0 20px rgba(20, 184, 166, 0.15)",
  glowAmber: "0 0 20px rgba(246, 185, 76, 0.15)",
  glowViolet: "0 0 20px rgba(124, 92, 255, 0.18)",
} as const;

// ── Radii ───────────────────────────────────────────────────────────────────
export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 20,
} as const;

// ── Typography ──────────────────────────────────────────────────────────────
export const FONT = {
  display: "'Space Grotesk', system-ui, sans-serif",
  body: "'Geist Mono', ui-monospace, monospace",
} as const;

// ── Window chrome colors (macOS traffic lights) ─────────────────────────────
export const WINDOW_DOTS = {
  close: "#FF5F56",
  minimize: "#FFBD2E",
  maximize: "#27C93F",
  inactive: "rgba(243, 245, 247, 0.12)",
} as const;
