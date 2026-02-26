"use client";
import { useRef, useEffect } from "react";

interface FileNodesBgProps {
  density?: number; // 0-1
  opacity?: number;
  color?: string;   // hex
  speed?: number;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return { r, g, b };
}

interface Node {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  phase: number;
}

export function FileNodesBg({
  density = 0.5,
  opacity = 0.3,
  color = "#2DD4BF",
  speed = 1,
}: FileNodesBgProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const rafRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rgb = hexToRgb(color);

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initNodes();
    }

    function initNodes() {
      if (!canvas) return;
      const area = canvas.width * canvas.height;
      const count = Math.floor((area / 14000) * density * 60);
      nodesRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 3 + Math.random() * 3,
        vx: (Math.random() - 0.5) * 0.3 * speed,
        vy: (Math.random() - 0.5) * 0.3 * speed,
        phase: Math.random() * Math.PI * 2,
      }));
    }

    const FRAME_INTERVAL = 1000 / 30; // ~30fps

    function draw(timestamp: number) {
      if (!canvas || !ctx) return;

      const elapsed = timestamp - lastFrameRef.current;
      if (elapsed < FRAME_INTERVAL) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      lastFrameRef.current = timestamp - (elapsed % FRAME_INTERVAL);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const time = timestamp * 0.001;
      const nodes = nodesRef.current;

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;

        // Wrap around edges
        if (n.x < -n.size) n.x = canvas.width + n.size;
        else if (n.x > canvas.width + n.size) n.x = -n.size;
        if (n.y < -n.size) n.y = canvas.height + n.size;
        else if (n.y > canvas.height + n.size) n.y = -n.size;

        // Alpha pulse
        const alpha = opacity * (0.5 + 0.5 * Math.sin(time * 0.8 + n.phase));

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
        ctx.lineWidth = 0.5;

        // Small square "file icon"
        const s = n.size;
        ctx.strokeRect(n.x - s / 2, n.y - s / 2, s, s);

        // Tiny inner mark (file fold)
        ctx.beginPath();
        ctx.moveTo(n.x + s / 2 - s * 0.35, n.y - s / 2);
        ctx.lineTo(n.x + s / 2, n.y - s / 2 + s * 0.35);
        ctx.stroke();

        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [density, opacity, color, speed]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}
