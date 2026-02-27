import { useEffect, useRef } from 'react';

interface AmbientIxosFieldProps {
  reducedMotion?: boolean;
  className?: string;
  mode?: 'fixed' | 'contained';
  energy?: 'calm' | 'dynamic';
}

interface PixelCell {
  x: number;
  y: number;
  base: number;
  drift: number;
}

export function AmbientIxosField({
  reducedMotion = false,
  className,
  mode = 'fixed',
  energy = 'calm',
}: AmbientIxosFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number>(0);
  const cellsRef = useRef<PixelCell[]>([]);
  const viewportRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const getViewport = () => {
      if (mode === 'fixed') {
        return { width: window.innerWidth, height: window.innerHeight };
      }

      const host = canvas.parentElement;
      if (!host) {
        return { width: window.innerWidth, height: window.innerHeight };
      }
      const rect = host.getBoundingClientRect();
      return {
        width: Math.max(1, Math.floor(rect.width)),
        height: Math.max(1, Math.floor(rect.height)),
      };
    };

    const buildCells = (width: number, height: number) => {
      const cols = Math.max(24, Math.floor(width / 28));
      const rows = Math.max(14, Math.floor(height / 26));
      const xGap = width / cols;
      const yGap = height / rows;
      const cells: PixelCell[] = [];
      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
          cells.push({
            x: x * xGap + xGap * 0.5,
            y: y * yGap + yGap * 0.5,
            base: Math.random() * Math.PI * 2,
            drift: 0.75 + Math.random() * 1.6,
          });
        }
      }
      cellsRef.current = cells;
    };

    const resize = () => {
      const viewport = getViewport();
      viewportRef.current = viewport;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildCells(viewport.width, viewport.height);
    };

    const render = (ts: number) => {
      const { width, height } = viewportRef.current;
      ctx.clearRect(0, 0, width, height);
      const t = ts * 0.001;

      const driftScale = energy === 'dynamic' ? 1.38 : 1;
      const freqX = energy === 'dynamic' ? 0.0075 : 0.006;
      const freqY = energy === 'dynamic' ? 0.0052 : 0.004;
      const alphaBoost = energy === 'dynamic' ? 1.22 : 1;
      const sizeBoost = energy === 'dynamic' ? 1.12 : 1;

      for (const cell of cellsRef.current) {
        const wave = Math.sin(cell.base + t * cell.drift * driftScale + cell.x * freqX + cell.y * freqY);
        const glow = reducedMotion ? 0.35 : (wave + 1) * 0.5;
        const alpha = (0.045 + glow * 0.09) * alphaBoost;
        const size = (2.2 + glow * 1.8) * sizeBoost;

        ctx.fillStyle = `rgba(20, 184, 166, ${alpha})`;
        ctx.fillRect(cell.x - size * 0.5, cell.y - size * 0.5, size, size);

        if (glow > 0.78) {
          ctx.fillStyle = 'rgba(124, 92, 255, 0.11)';
          ctx.fillRect(cell.x + 3, cell.y - 1, 1.8, 1.8);
        }
      }

      if (!reducedMotion) {
        frameRef.current = requestAnimationFrame(render);
      }
    };

    resize();
    if (reducedMotion) {
      render(0);
    } else {
      frameRef.current = requestAnimationFrame(render);
    }

    window.addEventListener('resize', resize);
    const host = mode === 'contained' ? canvas.parentElement : null;
    const observer =
      mode === 'contained' && host
        ? new ResizeObserver(() => {
            resize();
          })
        : null;
    if (observer && host) {
      observer.observe(host);
    }

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', resize);
      observer?.disconnect();
    };
  }, [energy, mode, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className}
      style={
        mode === 'fixed'
          ? { position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }
          : { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }
      }
    />
  );
}
