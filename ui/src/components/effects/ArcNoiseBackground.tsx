export function ArcNoiseBackground() {
    return (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-overlay">
            <svg
                className="w-full h-full opacity-100"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
            >
                <filter id="denseNoise" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
                    <feTurbulence
                        type="fractalNoise"
                        baseFrequency="0.85"
                        numOctaves="4"
                        stitchTiles="stitch"
                    />
                    <feColorMatrix
                        type="matrix"
                        values="1 0 0 0 0
                    0 1 0 0 0
                    0 0 1 0 0
                    0 0 0 1 0"
                    />
                </filter>
                <rect width="100%" height="100%" filter="url(#denseNoise)" />
            </svg>
            {/* Fallback pattern for deeper texture */}
            <div
                className="absolute inset-0 bg-[#0A0C10]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.5'/%3E%3C/svg%3E")`,
                    backgroundSize: '120px 120px'
                }}
            />
        </div>
    );
}
