/**
 * IXOS Design System - Color Tokens (TypeScript exports)
 * These mirror the CSS variables for use in JavaScript/TypeScript
 */

export const colors = {
  // Backgrounds
  graphite: {
    0: "#050507",
    1: "#0A0C10",
    2: "#12151A",
    3: "#1E2024",
  },

  // Foreground
  fg: {
    porcelain: "#F3F5F7",
    muted: "rgba(243, 245, 247, 0.72)",
    dim: "rgba(243, 245, 247, 0.5)",
    ghost: "rgba(243, 245, 247, 0.2)",
  },

  // Accents
  accent: {
    teal: {
      DEFAULT: "#14B8A6",
      dim: "#0D9488",
      glow: "#2DD4BF",
    },
    amber: {
      DEFAULT: "#F6B94C",
      dim: "#D97706",
      glow: "#FCD34D",
    },
    violet: {
      DEFAULT: "#A78BFA",
      glow: "#C4B5FD",
    },
    magenta: {
      DEFAULT: "#F472B6",
      glow: "#FBCFE8",
    },
  },

  // Status
  status: {
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
  },

  // Borders
  border: {
    hairline: "rgba(243, 245, 247, 0.08)",
    subtle: "rgba(243, 245, 247, 0.12)",
    medium: "rgba(243, 245, 247, 0.20)",
  },
} as const;

export type ColorKey = keyof typeof colors;
