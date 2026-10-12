"use client";

import { useEffect, useRef, useState } from "react";

interface Pixel {
  x: number;
  y: number;
  size: number;
  brightness: number;
  hue: number;
}

interface Wave {
  cx: number;
  cy: number;
  radius: number;
  maxRadius: number;
  speed: number;
  intensity: number;
  hue: number;
}

export interface RipplePulse {
  x: number;
  y: number;
  intensity?: number;
  hue?: 0 | 0.33 | 0.66;
  speed?: number;
  maxRadius?: number;
  phaseOffset?: number;
}

const PHASE_KEY = "--ixos-ripple-phase";
const RIPPLE_EVENT = "ixos:ripple-pulse";

function hueToRGB(hue: number): [number, number, number] {
  if (hue < 0.165) {
    return [45, 212, 191];
  }
  if (hue < 0.495) {
    return [245, 158, 11];
  }
  return [124, 58, 237];
}

function isReducedOrLowEnd(): boolean {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nav = navigator as Navigator & { deviceMemory?: number };
  return (
    prefersReduced ||
    navigator.hardwareConcurrency <= 2 ||
    (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 2)
  );
}

export function emitRipplePulse(pulse: RipplePulse) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent<RipplePulse>(RIPPLE_EVENT, { detail: pulse }));
}

export function emitRippleFromElement(
  element: HTMLElement,
  pulse: Omit<RipplePulse, "x" | "y"> = {}
) {
  const rect = element.getBoundingClientRect();
  emitRipplePulse({
    x: rect.left + rect.width * 0.5,
    y: rect.top + rect.height * 0.5,
    ...pulse,
  });
}

export function useRipplePhase() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase(0);
      return;
    }

    let frame = 0;
    let previous = 0;

    const read = () => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue(PHASE_KEY).trim();
      const value = Number.parseFloat(raw);
      if (Number.isFinite(value) && Math.abs(value - previous) > 0.045) {
        previous = value;
        setPhase(value);
      }
      frame = requestAnimationFrame(read);
    };

    frame = requestAnimationFrame(read);
    return () => cancelAnimationFrame(frame);
  }, []);

  return phase;
}

function StaticField() {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        background: "#0C0E10",
        backgroundImage:
          "radial-gradient(circle, rgba(45,212,191,0.018) 1px, transparent 1px), radial-gradient(circle, rgba(124,58,237,0.012) 1px, transparent 1px)",
        backgroundSize: "24px 24px, 48px 48px",
      }}
    />
  );
}

function AnimatedField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const pixelsRef = useRef<Pixel[]>([]);
  const wavesRef = useRef<Wave[]>([]);
  const lastFrameRef = useRef<number>(0);
  const dimsRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const CELL_SIZE = 22;

    const buildGrid = (width: number, height: number) => {
      const pixels: Pixel[] = [];
      const cols = Math.ceil(width / CELL_SIZE) + 1;
      const rows = Math.ceil(height / CELL_SIZE) + 1;
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const size = Math.random() < 0.9 ? 5 : 9;
          const hueRand = Math.random();
          const hue = hueRand < 0.33 ? 0 : hueRand < 0.66 ? 0.33 : 0.66;
          pixels.push({
            x: col * CELL_SIZE,
            y: row * CELL_SIZE,
            size,
            brightness: 0,
            hue,
          });
        }
      }
      pixelsRef.current = pixels;
    };

    const spawnWave = (
      cx: number,
      cy: number,
      intensity: number,
      speed: number,
      maxRadius: number,
      hue: number
    ) => {
      wavesRef.current.push({
        cx,
        cy,
        radius: 0,
        maxRadius,
        speed,
        intensity,
        hue,
      });
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dimsRef.current = { width, height };
      buildGrid(width, height);
      spawnWave(width * 0.5, height * 0.5, 0.25, 0.1, Math.min(width, height) * 0.8, 0);
    };

    const handlePulse = (event: Event) => {
      const custom = event as CustomEvent<RipplePulse>;
      const detail = custom.detail;
      const { width, height } = dimsRef.current;
      if (!detail) {
        return;
      }
      const phase = detail.phaseOffset ?? 0;
      const offsetX = Math.cos(phase) * 14;
      const offsetY = Math.sin(phase) * 14;
      const maxRadius =
        detail.maxRadius ?? Math.max(0.75 * Math.hypot(width, height), Math.min(width, height));
      spawnWave(
        detail.x + offsetX,
        detail.y + offsetY,
        detail.intensity ?? 0.34,
        detail.speed ?? 0.14,
        maxRadius,
        detail.hue ?? 0
      );
    };

    const handleLegacyPulse = (event: Event) => {
      const legacy = event as CustomEvent<{ x: number; y: number; intensity: number }>;
      handlePulse(
        new CustomEvent<RipplePulse>(RIPPLE_EVENT, {
          detail: {
            x: legacy.detail.x,
            y: legacy.detail.y,
            intensity: legacy.detail.intensity,
          },
        })
      );
    };

    const initTimer = window.setTimeout(() => {
      const { width, height } = dimsRef.current;
      spawnWave(width * 0.5, height * 0.5, 0.4, 0.1, 1.5 * Math.hypot(width * 0.5, height * 0.5), 0);
    }, 50);

    const autoWave = window.setInterval(() => {
      const { width, height } = dimsRef.current;
      const hues: Array<0 | 0.33 | 0.66> = [0, 0.33, 0.66];
      emitRipplePulse({
        x: Math.random() * width,
        y: Math.random() * height,
        intensity: 0.22,
        speed: 0.12,
        hue: hues[Math.floor(Math.random() * hues.length)],
      });
    }, 5000);

    const draw = (timestamp: number) => {
      const dt = Math.min(timestamp - lastFrameRef.current, 50);
      lastFrameRef.current = timestamp;
      const { width, height } = dimsRef.current;

      const phase = (timestamp * 0.001) % (Math.PI * 2);
      document.documentElement.style.setProperty(PHASE_KEY, phase.toFixed(4));

      for (let waveIndex = wavesRef.current.length - 1; waveIndex >= 0; waveIndex -= 1) {
        const wave = wavesRef.current[waveIndex];
        wave.radius += wave.speed * dt;
        const low = wave.radius - 18;
        const high = wave.radius + 6;

        for (let pixelIndex = 0; pixelIndex < pixelsRef.current.length; pixelIndex += 1) {
          const pixel = pixelsRef.current[pixelIndex];
          const dx = pixel.x - wave.cx;
          const dy = pixel.y - wave.cy;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance >= low && distance <= high) {
            const boost = wave.intensity * Math.max(0, 1 - Math.abs(distance - wave.radius) / 18);
            pixel.brightness = Math.min(1, pixel.brightness + boost * 0.6);
            pixel.hue = pixel.hue * 0.85 + wave.hue * 0.15;
          }
        }

        if (wave.radius > wave.maxRadius) {
          wavesRef.current.splice(waveIndex, 1);
        }
      }

      for (let pixelIndex = 0; pixelIndex < pixelsRef.current.length; pixelIndex += 1) {
        pixelsRef.current[pixelIndex].brightness *= 0.97;
      }

      ctx.fillStyle = "#0C0E10";
      ctx.fillRect(0, 0, width, height);

      for (let pixelIndex = 0; pixelIndex < pixelsRef.current.length; pixelIndex += 1) {
        const pixel = pixelsRef.current[pixelIndex];
        if (pixel.brightness < 0.002) {
          continue;
        }
        const alpha = pixel.brightness * 0.12;
        const [r, g, b] = hueToRGB(pixel.hue);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fillRect(pixel.x - pixel.size * 0.5, pixel.y - pixel.size * 0.5, pixel.size, pixel.size);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener(RIPPLE_EVENT, handlePulse as EventListener);
    window.addEventListener("v4:pulse", handleLegacyPulse as EventListener);
    resize();
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.clearTimeout(initTimer);
      window.clearInterval(autoWave);
      window.removeEventListener("resize", resize);
      window.removeEventListener(RIPPLE_EVENT, handlePulse as EventListener);
      window.removeEventListener("v4:pulse", handleLegacyPulse as EventListener);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}

export function RippleField() {
  const [lowEnd, setLowEnd] = useState(false);

  useEffect(() => {
    setLowEnd(isReducedOrLowEnd());
  }, []);

  if (lowEnd) {
    return <StaticField />;
  }

  return <AnimatedField />;
}
