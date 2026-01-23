export const colors = {
    brand: {
        blue: '#1a365d',
        teal: '#0d9488',
        cyan: '#06b6d4',
        purple: '#8b5cf6',
        dark: '#0a0a0f',
    },
    surface: {
        0: '#0a0a0f',
        1: '#12121a',
        2: '#1a1a24',
        3: '#24242e',
        glass: 'rgba(255, 255, 255, 0.03)',
        glassHover: 'rgba(255, 255, 255, 0.06)',
    },
    text: {
        primary: '#f8fafc',
        secondary: '#94a3b8',
        muted: '#64748b',
    },
    glow: {
        teal: 'rgba(13, 148, 136, 0.5)',
        cyan: 'rgba(6, 182, 212, 0.5)',
        purple: 'rgba(139, 92, 246, 0.5)',
        strong: {
            teal: 'rgba(13, 148, 136, 0.8)',
        }
    }
};

export const gradients = {
    brand: 'linear-gradient(135deg, #1a365d 0%, #0d9488 100%)',
    glass: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
    mirror: 'linear-gradient(to bottom, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.0) 40%, rgba(255,255,255,0.0) 100%)',
    mesh: {
        hero: 'radial-gradient(circle at 50% 50%, rgba(13, 148, 136, 0.15) 0%, rgba(10, 10, 15, 0) 70%)',
    }
};

export const timing = {
    fast: 0.2,
    medium: 0.5,
    slow: 1.0,
    spring: {
        stiffness: 100,
        damping: 20
    }
};
