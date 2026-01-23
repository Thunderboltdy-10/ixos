/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ═══════════════════════════════════════════════════════════════════
        // IXOS DESIGN SYSTEM - Graphite Palette
        // ═══════════════════════════════════════════════════════════════════

        // Primary backgrounds (darkest to lighter)
        'graphite-0': '#050507',  // Main background
        'graphite-1': '#0A0C10',  // Secondary background (sidebar, titlebar)
        'graphite-2': '#12151A',  // Tertiary background (cards, inputs)
        'graphite-3': '#1A1E25',  // Elevated elements

        // Text colors
        'porcelain': '#F3F5F7',           // Primary text
        'fg-muted': 'rgba(243,245,247,0.72)',  // Secondary text
        'fg-dim': 'rgba(243,245,247,0.48)',    // Tertiary text

        // Accent colors - Multi-accent system
        'accent-teal': '#14B8A6',
        'accent-teal-glow': '#06D6C1',
        'accent-amber': '#F6B94C',
        'accent-violet': '#8B5CF6',
        'accent-magenta': '#D946EF',

        // Status colors
        'success': '#10B981',
        'warning': '#F59E0B',
        'error': '#EF4444',
        'danger': '#DC2626',

        // Borders
        'stroke-hairline': 'rgba(243,245,247,0.14)',
        'border-medium': 'rgba(243,245,247,0.24)',

        // ═══════════════════════════════════════════════════════════════════
        // LEGACY COMPATIBILITY LAYER
        // ═══════════════════════════════════════════════════════════════════

        // Legacy brand colors (mapped to new system)
        brand: {
          blue: '#1a365d',
          teal: '#14B8A6',     // Updated to new accent-teal
          cyan: '#06D6C1',     // Updated to accent-teal-glow
          purple: '#8B5CF6',   // Updated to accent-violet
          dark: '#050507',     // Updated to graphite-0
        },

        // Legacy surface colors (mapped to graphite)
        surface: {
          0: '#050507',    // graphite-0
          1: '#0A0C10',    // graphite-1
          2: '#12151A',    // graphite-2
          3: '#1A1E25',    // graphite-3
          glass: 'rgba(255, 255, 255, 0.03)',
        },

        // Legacy content colors (mapped to new text colors)
        content: {
          primary: '#F3F5F7',
          secondary: 'rgba(243,245,247,0.72)',
          muted: 'rgba(243,245,247,0.48)',
        },

        // Legacy direct aliases
        'base': '#050507',
        'text-primary': '#F3F5F7',
        'text-secondary': 'rgba(243,245,247,0.72)',
        'text-tertiary': 'rgba(243,245,247,0.48)',
        'text-muted': 'rgba(243,245,247,0.36)',
        'muted': '#1A1E25',
        'accent': '#14B8A6',
        'journalist': '#D946EF',

        // Legacy border system
        'border': {
          DEFAULT: 'rgba(243,245,247,0.14)',
          subtle: 'rgba(243,245,247,0.08)',
          accent: 'rgba(20, 184, 166, 0.3)',
        },
      },

      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        sans: ['IBM Plex Mono', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },

      fontSize: {
        '2xs': ['11px', '14px'],
      },

      backgroundImage: {
        // Updated gradients with new accent colors
        'gradient-brand': 'linear-gradient(135deg, #14B8A6 0%, #06D6C1 100%)',
        'gradient-brand-hover': 'linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)',
        'gradient-glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
        'gradient-mirror': 'linear-gradient(to bottom, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.0) 40%, rgba(255,255,255,0.0) 100%)',

        // New gradient variants for multi-accent
        'gradient-teal': 'linear-gradient(135deg, #14B8A6 0%, #06D6C1 100%)',
        'gradient-amber': 'linear-gradient(135deg, #F6B94C 0%, #F59E0B 100%)',
        'gradient-violet': 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)',
        'gradient-magenta': 'linear-gradient(135deg, #D946EF 0%, #EC4899 100%)',
      },

      boxShadow: {
        // New shadow system
        'lift': '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)',
        'glow-teal': '0 0 20px rgba(20, 184, 166, 0.3), 0 0 40px rgba(20, 184, 166, 0.15)',
        'glow-amber': '0 0 20px rgba(246, 185, 76, 0.3), 0 0 40px rgba(246, 185, 76, 0.15)',
        'glow-violet': '0 0 20px rgba(139, 92, 246, 0.3), 0 0 40px rgba(139, 92, 246, 0.15)',
        'glow-magenta': '0 0 20px rgba(217, 70, 239, 0.3), 0 0 40px rgba(217, 70, 239, 0.15)',
        'inner-highlight': 'inset 0 1px 0 rgba(255,255,255,0.05)',
      },

      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'zoom-in-pop': 'zoomInPop 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'spin-slow': 'spin 12s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'reveal-rise': 'reveal-rise 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'trace-flow': 'trace-flow 3s linear infinite',
      },

      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(20, 184, 166, 0.2), 0 0 10px rgba(20, 184, 166, 0.1)' },
          '100%': { boxShadow: '0 0 20px rgba(20, 184, 166, 0.4), 0 0 40px rgba(20, 184, 166, 0.2)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        zoomInPop: {
          '0%': { transform: 'scale(0.8) translateY(40px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        'reveal-rise': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'trace-flow': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
      },
    },
  },
  plugins: [],
}
