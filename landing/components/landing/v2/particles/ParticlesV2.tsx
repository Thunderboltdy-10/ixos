"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * ParticlesV2 - "Graphite Noir + Porcelain Ink" Theme
 *
 * Enhanced particle system with:
 * - Cursor magnetic attraction (preserved from v1)
 * - Connection lines between nearby particles
 * - Porcelain white primary colors (not teal)
 * - Rare accent sparks (teal, amber at ~2% probability)
 * - Return-to-origin physics
 * - Intensity API for different sections
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  originX: number;
  originY: number;
  size: number;
  color: { r: number; g: number; b: number };
  alpha: number;
  layer: 0 | 1 | 2; // 0=bg orbs, 1=connection nodes, 2=dust
  isAccent: boolean;
}

interface ParticlesV2Props {
  className?: string;
  intensity?: "hero" | "section" | "minimal";
  accentSparks?: boolean;
}

// Color type for particles
type ParticleColor = { r: number; g: number; b: number };

// V2 Color palette - Porcelain white primary
const COLORS: Record<string, ParticleColor> = {
  porcelain: { r: 244, g: 246, b: 248 },  // Primary: white/porcelain
  muted: { r: 244, g: 246, b: 248 },      // Muted white
  teal: { r: 20, g: 184, b: 166 },        // Accent: teal (rare)
  amber: { r: 246, g: 185, b: 76 },       // Accent: amber (rare)
};

// Intensity configurations
const INTENSITY_CONFIG = {
  hero: {
    bgOrbs: 4,
    connectionNodes: 40,
    dust: 60,
  },
  section: {
    bgOrbs: 2,
    connectionNodes: 20,
    dust: 30,
  },
  minimal: {
    bgOrbs: 1,
    connectionNodes: 10,
    dust: 15,
  },
};

export function ParticlesV2({
  className = "",
  intensity = "hero",
  accentSparks = true,
}: ParticlesV2Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const mouse = useRef({ x: -1000, y: -1000 });
  const scrollY = useRef(0);
  const animationFrameId = useRef<number>(0);
  const isReducedMotion = useRef(false);

  const config = INTENSITY_CONFIG[intensity];

  const MAGNETIC_RADIUS = 280;
  const CONNECTION_DISTANCE = 120;
  const RETURN_STRENGTH = 0.003;

  const createParticle = useCallback(
    (layer: 0 | 1 | 2, width: number, height: number): Particle => {
      const x = Math.random() * width;
      const y = Math.random() * height;

      // Determine if this is an accent particle (rare: ~2%)
      const isAccent = accentSparks && Math.random() < 0.02;
      let color = COLORS.porcelain;

      if (isAccent) {
        // Randomly pick teal or amber for accent
        color = Math.random() < 0.5 ? COLORS.teal : COLORS.amber;
      }

      // Layer-specific properties
      let size: number;
      let alpha: number;
      let velocityScale: number;

      switch (layer) {
        case 0: // Background orbs
          size = Math.random() * 60 + 30;
          alpha = 0.02;
          velocityScale = 0.06;
          break;
        case 1: // Connection nodes
          size = Math.random() * 2 + 1.5;
          alpha = isAccent ? 0.8 : 0.5;
          velocityScale = 0.12;
          break;
        case 2: // Dust
          size = Math.random() * 1.2 + 0.4;
          alpha = isAccent ? 0.6 : 0.3;
          velocityScale = 0.18;
          break;
      }

      return {
        x,
        y,
        originX: x,
        originY: y,
        vx: (Math.random() - 0.5) * velocityScale,
        vy: (Math.random() - 0.5) * velocityScale,
        size,
        color,
        alpha,
        layer,
        isAccent,
      };
    },
    [accentSparks]
  );

  const initParticles = useCallback(
    (width: number, height: number) => {
      particles.current = [];

      // Layer 0: Background orbs
      for (let i = 0; i < config.bgOrbs; i++) {
        particles.current.push(createParticle(0, width, height));
      }

      // Layer 1: Connection nodes
      for (let i = 0; i < config.connectionNodes; i++) {
        particles.current.push(createParticle(1, width, height));
      }

      // Layer 2: Dust
      for (let i = 0; i < config.dust; i++) {
        particles.current.push(createParticle(2, width, height));
      }
    },
    [config, createParticle]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Scroll fade effect
    const scrollFade = Math.max(0, 1 - scrollY.current / (height * 1.2));
    if (scrollFade <= 0) {
      animationFrameId.current = requestAnimationFrame(draw);
      return;
    }

    const allParticles = particles.current;

    // Update and draw particles
    allParticles.forEach((p) => {
      // Natural movement
      p.x += p.vx;
      p.y += p.vy;

      // Boundary handling (soft wrap)
      const margin = 50;
      if (p.x < -margin) p.x = width + margin;
      if (p.x > width + margin) p.x = -margin;
      if (p.y < -margin) p.y = height + margin;
      if (p.y > height + margin) p.y = -margin;

      // Magnetic attraction to cursor (layers 1 and 2 only)
      if (p.layer > 0) {
        const dx = mouse.current.x - p.x;
        const dy = mouse.current.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MAGNETIC_RADIUS) {
          const force = (MAGNETIC_RADIUS - dist) / MAGNETIC_RADIUS;
          const angle = Math.atan2(dy, dx);
          const pullStrength = force * (p.layer === 1 ? 1.6 : 1.0);

          p.x += Math.cos(angle) * pullStrength;
          p.y += Math.sin(angle) * pullStrength;
        }
      }

      // Gentle return to origin
      const originDx = p.originX - p.x;
      const originDy = p.originY - p.y;
      p.vx += originDx * RETURN_STRENGTH;
      p.vy += originDy * RETURN_STRENGTH;

      // Damping
      p.vx *= 0.995;
      p.vy *= 0.995;

      // Draw particle
      ctx.beginPath();

      if (p.layer === 0) {
        // Background orbs: Large, blurry
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        gradient.addColorStop(
          0,
          `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha * scrollFade})`
        );
        gradient.addColorStop(
          1,
          `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0)`
        );
        ctx.fillStyle = gradient;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Connection nodes and dust: Solid circles
        const alpha = p.alpha * scrollFade;
        ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha})`;

        // Add subtle glow for accent particles
        if (p.isAccent && p.layer === 1) {
          ctx.shadowColor = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0.5)`;
          ctx.shadowBlur = 8;
        } else {
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
        }

        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Reset shadow for lines
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    // Draw connections between Layer 1 nodes
    const connectionNodes = allParticles.filter((p) => p.layer === 1);
    ctx.lineWidth = 1;

    for (let i = 0; i < connectionNodes.length; i++) {
      const p1 = connectionNodes[i];

      for (let j = i + 1; j < connectionNodes.length; j++) {
        const p2 = connectionNodes[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONNECTION_DISTANCE) {
          const opacity = (1 - dist / CONNECTION_DISTANCE) * 0.15 * scrollFade;

          // Use white for connections (porcelain ink)
          ctx.beginPath();
          ctx.strokeStyle = `rgba(244, 246, 248, ${opacity})`;
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }

    // Continue animation
    if (!isReducedMotion.current) {
      animationFrameId.current = requestAnimationFrame(draw);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check reduced motion preference
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    isReducedMotion.current = mediaQuery.matches;

    const handleMotionChange = (e: MediaQueryListEvent) => {
      isReducedMotion.current = e.matches;
      if (!e.matches) {
        animationFrameId.current = requestAnimationFrame(draw);
      }
    };
    mediaQuery.addEventListener("change", handleMotionChange);

    // Resize handler
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      initParticles(width, height);
    };

    // Mouse move handler
    const onMouseMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    };

    // Touch move handler
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouse.current.x = e.touches[0].clientX;
        mouse.current.y = e.touches[0].clientY;
      }
    };

    // Scroll handler
    const onScroll = () => {
      scrollY.current = window.scrollY;
    };

    // Initialize
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    resize();
    animationFrameId.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("scroll", onScroll);
      mediaQuery.removeEventListener("change", handleMotionChange);
      cancelAnimationFrame(animationFrameId.current);
    };
  }, [draw, initParticles]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-0 ${className}`}
      style={{ background: "var(--v2-bg)" }}
      aria-hidden="true"
    />
  );
}

export default ParticlesV2;
