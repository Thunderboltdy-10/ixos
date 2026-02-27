import { useEffect, useMemo, useState } from 'react';

interface PixelRingLoaderProps {
  label?: string;
  speedMs?: number;
  className?: string;
}

export function PixelRingLoader({
  label = 'Ixos calibrating local graph',
  speedMs = 70,
  className,
}: PixelRingLoaderProps) {
  const [active, setActive] = useState(0);
  const points = useMemo(() => {
    const radius = 48;
    return Array.from({ length: 24 }, (_, i) => {
      const a = (Math.PI * 2 * i) / 24;
      return {
        x: Math.cos(a) * radius + 60,
        y: Math.sin(a) * radius + 60,
      };
    });
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActive((v) => (v + 1) % points.length);
    }, speedMs);
    return () => window.clearInterval(id);
  }, [points.length, speedMs]);

  return (
    <div className={className} style={{ display: 'grid', placeItems: 'center', gap: 18 }}>
      <div className="ixos-loader-grid" role="status" aria-live="polite" aria-label={label}>
        {points.map((point, idx) => {
          const distance = Math.min(
            Math.abs(idx - active),
            points.length - Math.abs(idx - active)
          );
          const level = Math.max(0, 1 - distance / 5);
          return (
            <span
              key={`${point.x}-${point.y}`}
              className="ixos-loader-dot"
              style={{
                left: point.x,
                top: point.y,
                transform: 'translate(-50%, -50%)',
                background: `rgba(20, 184, 166, ${0.14 + level * 0.84})`,
                boxShadow: level > 0.5 ? '0 0 10px rgba(20, 184, 166, 0.4)' : 'none',
              }}
            />
          );
        })}
      </div>
      <p
        style={{
          color: 'rgba(243, 245, 247, 0.7)',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          fontSize: 10,
          fontFamily: 'var(--font-body, monospace)',
        }}
      >
        {label}
      </p>
    </div>
  );
}
