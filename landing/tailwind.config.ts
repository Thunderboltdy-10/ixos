import type { Config } from "tailwindcss";
import electricGlassPreset from "../shared/design-tokens/tailwind-preset";

const config: Config = {
    presets: [electricGlassPreset],
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            // Override/extend the preset with landing-specific values
            colors: {
                // Legacy brand colors (for backward compatibility)
                brand: {
                    blue: '#1a365d',
                    teal: 'var(--accent-primary)',
                    cyan: 'var(--brand-cyan)',
                    purple: 'var(--accent-secondary)',
                    dark: 'var(--bg-void)',
                },
                // Legacy surface mapping
                background: 'var(--bg-void)',
                foreground: 'var(--fg-primary)',
                // V2 "Graphite Noir + Porcelain Ink" colors
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
            },
            fontFamily: {
                // Geist fonts (new Electric Glass typography)
                sans: ['var(--font-body)'],
                display: ['var(--font-heading)'],
                mono: ['var(--font-mono)'],
                heading: ['var(--font-heading)'],
                body: ['var(--font-body)'],
                // V2 Typography
                'v2-display': ['var(--font-instrument-serif)', 'Georgia', 'Times New Roman', 'serif'],
                'v2-mono': ['var(--font-jetbrains-mono)', 'SF Mono', 'Fira Code', 'monospace'],
            },
            backgroundImage: {
                // Legacy gradients (for backward compatibility)
                'gradient-brand': 'var(--gradient-brand)',
                'gradient-glass': 'var(--gradient-glass)',
                'gradient-mirror': 'linear-gradient(to bottom, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.0) 40%, rgba(255,255,255,0.0) 100%)',
                // Electric Glass gradients
                'gradient-mesh': 'radial-gradient(at 40% 20%, var(--accent-glow) 0px, transparent 50%), radial-gradient(at 80% 0%, var(--accent-secondary-glow) 0px, transparent 50%), radial-gradient(at 0% 50%, var(--accent-glow) 0px, transparent 50%)',
            },
            // Additional landing-specific animations
            animation: {
                'glow': 'glow 2s ease-in-out infinite alternate',
                'glow-strong': 'glow-strong 2s ease-in-out infinite alternate',
                'shimmer': 'shimmer 2s linear infinite',
                'float': 'float 6s ease-in-out infinite',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'zoom-in-pop': 'zoomInPop 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'spin-slow': 'spin 12s linear infinite',
                'draw-line': 'drawLine 2s ease-out forwards',
                // New Electric Glass animations
                'type-cursor': 'blink 1s step-end infinite',
                'beam-expand': 'beamExpand 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards',
                'ripple-out': 'rippleOut 1.2s ease-out forwards',
                'circuit-trace': 'circuitTrace 1.5s ease-out forwards',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                glow: {
                    '0%': { boxShadow: '0 0 5px var(--accent-glow), 0 0 10px var(--accent-glow)' },
                    '100%': { boxShadow: '0 0 20px var(--accent-glow-medium), 0 0 40px var(--accent-glow)' },
                },
                'glow-strong': {
                    '0%': { boxShadow: '0 0 10px var(--accent-glow-medium), 0 0 20px var(--accent-glow)' },
                    '100%': { boxShadow: '0 0 30px var(--accent-glow-strong), 0 0 60px var(--accent-glow-medium)' },
                },
                shimmer: {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' },
                },
                zoomInPop: {
                    '0%': { transform: 'scale(0.8) translateY(40px)', opacity: '0' },
                    '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
                },
                drawLine: {
                    '0%': { strokeDasharray: '0 1000' },
                    '100%': { strokeDasharray: '1000 0' },
                },
                blink: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0' },
                },
                beamExpand: {
                    '0%': { transform: 'scaleY(0)', opacity: '1' },
                    '100%': { transform: 'scaleY(1)', opacity: '0.8' },
                },
                rippleOut: {
                    '0%': { transform: 'scale(0)', opacity: '0.8' },
                    '100%': { transform: 'scale(3)', opacity: '0' },
                },
                circuitTrace: {
                    '0%': { strokeDashoffset: '1000', opacity: '0' },
                    '10%': { opacity: '1' },
                    '100%': { strokeDashoffset: '0', opacity: '0.6' },
                },
            },
            // 3D transforms for hero animation
            perspective: {
                '1000': '1000px',
                '1500': '1500px',
            },
        },
    },
    plugins: [],
};

export default config;
