/**
 * IXOS Design System - Tailwind v3 Preset
 * Provides consistent theming across desktop app and landing page
 */

import type { Config } from "tailwindcss";

export const ixosPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        // Backgrounds - map to CSS variables
        "graphite-0": "var(--bg-graphite-0)",
        "graphite-1": "var(--bg-graphite-1)",
        "graphite-2": "var(--bg-graphite-2)",
        "graphite-3": "var(--bg-graphite-3)",

        // Foreground
        porcelain: "var(--fg-porcelain)",
        "fg-muted": "var(--fg-muted)",
        "fg-dim": "var(--fg-dim)",
        "fg-ghost": "var(--fg-ghost)",

        // Accents
        "accent-teal": {
          DEFAULT: "var(--accent-teal)",
          dim: "var(--accent-teal-dim)",
          glow: "var(--accent-teal-glow)",
        },
        "accent-amber": {
          DEFAULT: "var(--accent-amber)",
          dim: "var(--accent-amber-dim)",
          glow: "var(--accent-amber-glow)",
        },
        "accent-violet": {
          DEFAULT: "var(--accent-violet)",
          glow: "var(--accent-violet-glow)",
        },
        "accent-magenta": {
          DEFAULT: "var(--accent-magenta)",
          glow: "var(--accent-magenta-glow)",
        },

        // Primary (theme-dependent)
        "accent-primary": {
          DEFAULT: "var(--accent-primary)",
          dim: "var(--accent-primary-dim)",
          glow: "var(--accent-primary-glow)",
        },

        // Status
        success: "var(--accent-success)",
        warning: "var(--accent-warning)",
        error: "var(--accent-error)",
        danger: "var(--accent-error)",

        // Borders
        "stroke-hairline": "var(--border-hairline)",
        "border-subtle": "var(--border-subtle)",
        "border-medium": "var(--border-medium)",
      },

      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        sans: ["var(--font-body)"],
        mono: ["var(--font-body)"],
      },

      fontSize: {
        "2xs": ["0.625rem", "0.75rem"], // 10px
      },

      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-md)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
      },

      boxShadow: {
        lift: "var(--shadow-lift)",
        "glow-teal": "var(--shadow-glow-teal)",
        "glow-amber": "var(--shadow-glow-amber)",
        "glow-violet": "var(--shadow-glow-violet)",
        "glow-magenta": "var(--shadow-glow-magenta)",
        "glow-primary": "var(--shadow-glow-primary)",
      },

      transitionTimingFunction: {
        snap: "var(--ease-snap)",
        "out-expo": "var(--ease-out-expo)",
      },

      transitionDuration: {
        fast: "var(--duration-fast)",
        base: "var(--duration-base)",
        slow: "var(--duration-slow)",
      },

      backgroundImage: {
        "gradient-teal":
          "linear-gradient(135deg, var(--accent-teal) 0%, var(--accent-teal-dim) 100%)",
        "gradient-amber":
          "linear-gradient(135deg, var(--accent-amber) 0%, var(--accent-amber-dim) 100%)",
      },
    },
  },
};

export default ixosPreset;
