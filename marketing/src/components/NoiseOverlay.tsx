import { AbsoluteFill } from "remotion";

/**
 * Subtle noise texture overlay matching ArcNoiseBackground.
 * Uses an SVG filter — lightweight, no canvas, deterministic.
 */
export const NoiseOverlay: React.FC = () => {
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "overlay" }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <filter id="noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" opacity={0.06} />
      </svg>
    </AbsoluteFill>
  );
};
