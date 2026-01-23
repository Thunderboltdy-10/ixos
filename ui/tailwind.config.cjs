
/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
        "./index.html",
        "./src/**/*.{ts,tsx,js,jsx}",
    ],
    safelist: [
        'border-stroke-hairline',
        'bg-stroke-hairline',
        'text-2xs',
    ],
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            borderColor: {
                'stroke-hairline': 'rgba(243, 245, 247, 0.08)',
                'medium': 'rgba(243, 245, 247, 0.15)',
            },
            fontSize: {
                '2xs': ['0.625rem', '0.75rem'], // 10px
                xs: ['0.75rem', '1rem'],
                sm: ['0.875rem', '1.25rem'],
                base: ['1rem', '1.5rem'],
                lg: ['1.125rem', '1.75rem'],
                xl: ['1.25rem', '1.75rem'],
                '2xl': ['1.5rem', '2rem'],
                '3xl': ['1.875rem', '2.25rem'],
            },
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "#050507",
                foreground: "hsl(var(--foreground))",

                // Graphite Palette
                graphite: {
                    0: '#050507',
                    1: '#0A0C10',
                    2: '#12151A',
                    3: '#1E2024',
                },

                // Porcelain
                porcelain: '#F3F5F7',

                // Semantic Foreground
                fg: {
                    primary: '#F3F5F7',
                    secondary: 'rgba(243, 245, 247, 0.72)',
                    muted: 'rgba(243, 245, 247, 0.5)',
                    dim: 'rgba(243, 245, 247, 0.2)',
                },

                // Borders - flattened
                'stroke-hairline': 'rgba(243, 245, 247, 0.08)',
                'border-medium': 'rgba(243, 245, 247, 0.15)',

                // Accents
                accent: {
                    teal: {
                        DEFAULT: '#14B8A6',
                        dim: '#0D9488',
                        glow: '#2DD4BF',
                        'glow-strong': 'rgba(20, 184, 166, 0.35)',
                    },
                    amber: {
                        DEFAULT: '#F6B94C',
                    },
                    violet: {
                        DEFAULT: '#A78BFA',
                    },
                    magenta: {
                        DEFAULT: '#F472B6',
                    }
                },

                // Legacy alias
                stroke: {
                    hairline: 'rgba(243, 245, 247, 0.08)',
                }
            },
            fontFamily: {
                sans: ['"IBM Plex Mono"', 'monospace'],
                display: ['"Space Grotesk"', 'sans-serif'],
                mono: ['"IBM Plex Mono"', 'monospace'],
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            boxShadow: {
                'lift': '0 0 0 1px rgba(243, 245, 247, 0.12), 0 20px 60px rgba(0, 0, 0, 0.6), 0 4px 16px rgba(0, 0, 0, 0.5)',
                'glow-teal': '0 0 20px rgba(20, 184, 166, 0.15)',
            },
            backgroundImage: {
                'gradient-teal': 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
            },
        },
    },
    plugins: [],
};
