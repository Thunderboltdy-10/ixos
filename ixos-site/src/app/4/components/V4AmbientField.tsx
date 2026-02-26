"use client";

import { useRef, useEffect } from "react";
import { useReducedOrLowEnd } from "./useReducedOrLowEnd";

// ─── Global ambient field ─────────────────────────────────────────────────────
// Fixed-position canvas that provides a continuous "Ixos field" texture.
// Very low intensity — exists behind all content.
// Sections with solid backgrounds naturally overlay it;
// transparent/hero areas see the ambient layer directly.

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  size: number;
  type: "dot" | "cross"; // variety in shape
}

function AmbientCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const FRAME_MS = 1000 / 24; // 24fps — ambient, not interactive

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    }

    function initParticles() {
      if (!canvas) return;
      // Very sparse — 18 particles for whole viewport
      const count = 18;
      particlesRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        phase: Math.random() * Math.PI * 2,
        size: 2 + Math.random() * 2.5,
        type: Math.random() > 0.65 ? "cross" : "dot",
      }));
    }

    function draw(ts: number) {
      if (!canvas || !ctx) return;
      const elapsed = ts - lastFrameRef.current;
      if (elapsed < FRAME_MS) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      lastFrameRef.current = ts - (elapsed % FRAME_MS);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const time = ts * 0.001;
      const ps = particlesRef.current;

      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -8) p.x = canvas.width + 8;
        else if (p.x > canvas.width + 8) p.x = -8;
        if (p.y < -8) p.y = canvas.height + 8;
        else if (p.y > canvas.height + 8) p.y = -8;

        const alpha = 0.025 * (0.4 + 0.6 * Math.sin(time * 0.5 + p.phase));

        ctx.save();
        ctx.globalAlpha = alpha;

        if (p.type === "cross") {
          // Subtle cross / calibration mark
          const isAccent = i % 5 === 0;
          ctx.strokeStyle = isAccent
            ? "rgba(124,58,237,1)"
            : "rgba(45,212,191,1)";
          ctx.lineWidth = 0.5;
          const s = p.size * 1.6;
          ctx.beginPath();
          ctx.moveTo(p.x - s, p.y);
          ctx.lineTo(p.x + s, p.y);
          ctx.moveTo(p.x, p.y - s);
          ctx.lineTo(p.x, p.y + s);
          ctx.stroke();
        } else {
          // Tiny square file-node icon
          ctx.strokeStyle = i % 3 === 0
            ? "rgba(245,158,11,1)"
            : "rgba(45,212,191,1)";
          ctx.lineWidth = 0.4;
          const s = p.size;
          ctx.strokeRect(p.x - s / 2, p.y - s / 2, s, s);
        }

        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    window.addEventListener("resize", resize, { passive: true });
    resize();
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}

// Static fallback for reduced-motion / low-end devices
function StaticAmbient() {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        backgroundImage: `
          radial-gradient(circle, rgba(45,212,191,0.018) 1px, transparent 1px),
          radial-gradient(circle, rgba(124,58,237,0.012) 1px, transparent 1px)
        `,
        backgroundSize: "48px 48px, 96px 96px",
        backgroundPosition: "0 0, 24px 24px",
      }}
    />
  );
}

export function V4AmbientField() {
  const lowEnd = useReducedOrLowEnd();
  return lowEnd ? <StaticAmbient /> : <AmbientCanvas />;
}
