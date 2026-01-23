"use client";

/**
 * LightingWash - White radial gradient for subtle lighting effect
 * Creates a soft spotlight/wash effect from the top
 */

interface LightingWashProps {
  intensity?: 2 | 4 | 6 | 8;
  position?: 'top' | 'center' | 'bottom';
  className?: string;
}

export function LightingWash({
  intensity = 4,
  position = 'top',
  className = ""
}: LightingWashProps) {
  const positionMap = {
    top: 'at 50% 0%',
    center: 'at 50% 50%',
    bottom: 'at 50% 100%',
  };

  const opacityMap = {
    2: 0.02,
    4: 0.04,
    6: 0.06,
    8: 0.08,
  };

  return (
    <div
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{
        background: `radial-gradient(ellipse 80% 50% ${positionMap[position]}, rgba(255, 255, 255, ${opacityMap[intensity]}) 0%, transparent 70%)`,
      }}
      aria-hidden="true"
    />
  );
}

export default LightingWash;
