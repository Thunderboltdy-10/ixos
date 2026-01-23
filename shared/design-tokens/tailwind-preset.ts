/**
 * Ixos Electric Glass Design System - Tailwind Preset
 *
 * This preset provides the complete Electric Glass design language
 * for both the marketing site (landing/) and desktop app (ui/).
 *
 * Usage in tailwind.config.ts:
 * ```
 * import electricGlassPreset from '../shared/design-tokens/tailwind-preset';
 * export default {
 *   presets: [electricGlassPreset],
 *   // your config...
 * }
 * ```
 */

const electricGlassPreset = {
  content: [],
  theme: {
    extend: {
      colors: {
        // Void Palette
        void: 'var(--bg-void)',
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-elevated': 'var(--bg-elevated)',
        'bg-surface': 'var(--bg-surface)',
        'bg-glass': 'var(--bg-glass)',

        // Legacy surface mappings
        surface: {
          0: 'var(--surface-0)',
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
          glass: 'var(--bg-glass)',
        },

        // Foreground
        fg: {
          primary: 'var(--fg-primary)',
          secondary: 'var(--fg-secondary)',
          muted: 'var(--fg-muted)',
          dim: 'var(--fg-dim)',
        },

        // Legacy content mappings
        content: {
          primary: 'var(--content-primary)',
          secondary: 'var(--content-secondary)',
          muted: 'var(--content-muted)',
        },

        // Primary Accent (Electric Teal)
        accent: {
          DEFAULT: 'var(--accent-primary)',
          primary: 'var(--accent-primary)',
          dim: 'var(--accent-primary-dim)',
          bright: 'var(--accent-primary-bright)',
          glow: 'var(--accent-glow)',
          'glow-medium': 'var(--accent-glow-medium)',
          'glow-strong': 'var(--accent-glow-strong)',
        },

        // Secondary Accent (Technical Indigo)
        'accent-secondary': {
          DEFAULT: 'var(--accent-secondary)',
          dim: 'var(--accent-secondary-dim)',
          bright: 'var(--accent-secondary-bright)',
          glow: 'var(--accent-secondary-glow)',
        },

        // Brand colors
        brand: {
          teal: 'var(--brand-teal)',
          purple: 'var(--brand-purple)',
          indigo: 'var(--brand-indigo)',
          cyan: 'var(--brand-cyan)',
          blue: 'var(--brand-blue)',
        },

        // Semantic
        success: {
          DEFAULT: 'var(--color-success)',
          dim: 'var(--color-success-dim)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          dim: 'var(--color-warning-dim)',
        },
        error: {
          DEFAULT: 'var(--color-error)',
          dim: 'var(--color-error-dim)',
        },

        // Borders
        border: {
          subtle: 'var(--border-subtle)',
          DEFAULT: 'var(--border-default)',
          hover: 'var(--border-hover)',
          active: 'var(--border-active)',
        },
      },

      fontFamily: {
        heading: ['var(--font-heading)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
        display: ['var(--font-heading)'],
        sans: ['var(--font-body)'],
      },

      fontSize: {
        xs: ['var(--text-xs)', '1.4'] as [string, string],
        sm: ['var(--text-sm)', '1.5'] as [string, string],
        base: ['var(--text-base)', '1.6'] as [string, string],
        lg: ['var(--text-lg)', '1.5'] as [string, string],
        xl: ['var(--text-xl)', '1.4'] as [string, string],
        '2xl': ['var(--text-2xl)', '1.3'] as [string, string],
        '3xl': ['var(--text-3xl)', '1.2'] as [string, string],
        '4xl': ['var(--text-4xl)', '1.1'] as [string, string],
        '5xl': ['var(--text-5xl)', '1.1'] as [string, string],
        hero: ['var(--text-hero)', { lineHeight: '1.05', letterSpacing: '-0.04em' }] as [string, { lineHeight: string; letterSpacing: string }],
      },

      spacing: {
        xs: 'var(--space-xs)',
        sm: 'var(--space-sm)',
        md: 'var(--space-md)',
        lg: 'var(--space-lg)',
        xl: 'var(--space-xl)',
        '2xl': 'var(--space-2xl)',
        '3xl': 'var(--space-3xl)',
        '4xl': 'var(--space-4xl)',
      },

      borderRadius: {
        none: 'var(--radius-none)',
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },

      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-md)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        'glow-teal': 'var(--shadow-glow-teal)',
        'glow-teal-strong': 'var(--shadow-glow-teal-strong)',
        'glow-indigo': 'var(--shadow-glow-indigo)',
      },

      transitionTimingFunction: {
        snap: 'var(--ease-snap)',
        out: 'var(--ease-out)',
        'in-out': 'var(--ease-in-out)',
        spring: 'var(--ease-spring)',
      },

      transitionDuration: {
        instant: '80ms',
        fast: '120ms',
        base: '200ms',
        slow: '400ms',
      },

      backgroundImage: {
        'gradient-brand': 'var(--gradient-brand)',
        'gradient-brand-reverse': 'var(--gradient-brand-reverse)',
        'gradient-glow': 'var(--gradient-glow)',
        'gradient-glass': 'var(--gradient-glass)',
        'gradient-fade-down': 'var(--gradient-fade-down)',
        'gradient-fade-up': 'var(--gradient-fade-up)',
      },

      maxWidth: {
        container: 'var(--container-max)',
      },

      animation: {
        // Glow effects
        glow: 'glow 2s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',

        // Floating/ambient
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',

        // Pulse variants
        'pulse-slow': 'pulse 4s ease-in-out infinite',
        'pulse-fast': 'pulse 1s ease-in-out infinite',

        // Shimmer/gradient
        shimmer: 'shimmer 2s linear infinite',
        'gradient-shift': 'gradient-shift 3s ease infinite',

        // Drawing/reveal
        'draw-line': 'draw-line 1s ease-out forwards',
        'draw-line-slow': 'draw-line 2s ease-out forwards',

        // Entry animations
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.4s ease-out forwards',
        'scale-in': 'scale-in 0.3s ease-out forwards',
        'zoom-in-pop': 'zoom-in-pop 0.8s var(--ease-spring) forwards',

        // Spin
        'spin-slow': 'spin 12s linear infinite',

        // Ping/indicator
        ping: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',

        // Beam/power effects
        'beam-down': 'beam-down 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'wave-out': 'wave-out 1s ease-out forwards',
        'power-pulse': 'power-pulse 0.6s ease-out forwards',
      },

      keyframes: {
        glow: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        'glow-pulse': {
          '0%, 100%': {
            boxShadow: '0 0 20px var(--accent-glow)',
            opacity: '0.8',
          },
          '50%': {
            boxShadow: '0 0 40px var(--accent-glow-strong)',
            opacity: '1',
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'draw-line': {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'zoom-in-pop': {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '70%': { opacity: '1', transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
        ping: {
          '75%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
        'beam-down': {
          '0%': { transform: 'scaleY(0)', transformOrigin: 'top' },
          '100%': { transform: 'scaleY(1)', transformOrigin: 'top' },
        },
        'wave-out': {
          '0%': { transform: 'scale(0)', opacity: '1' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        'power-pulse': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.5)', opacity: '0.5' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};

export default electricGlassPreset;
