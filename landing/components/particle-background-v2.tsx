"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * ParticleBackgroundV2 - Electric Glass Design System
 *
 * Enhanced particle system with:
 * - Cursor magnetic attraction (preserved from v1)
 * - Connection lines between nearby particles
 * - Electric Glass color palette
 * - Professional, clean aesthetic
 * - Scroll fade effect
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
}

interface ParticleBackgroundV2Props {
    className?: string;
}

// Electric Glass color palette for particles (RGB values)
const COLORS = {
    teal: { r: 20, g: 184, b: 166 },      // --accent-primary #14b8a6
    indigo: { r: 99, g: 102, b: 241 },    // --accent-secondary #6366f1
    cyan: { r: 6, g: 182, b: 212 },       // --brand-cyan #06b6d4
};

export function ParticleBackgroundV2({ className = "" }: ParticleBackgroundV2Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particles = useRef<Particle[]>([]);
    const mouse = useRef({ x: -1000, y: -1000 });
    const scrollY = useRef(0);
    const animationFrameId = useRef<number>(0);
    const isReducedMotion = useRef(false);

    // Particle counts by layer
    const LAYER_COUNTS = {
        bgOrbs: 4,         // Large background orbs
        connectionNodes: 35, // Medium nodes that connect
        dust: 50,          // Small dust particles
    };

    const MAGNETIC_RADIUS = 280;
    const CONNECTION_DISTANCE = 140;
    const RETURN_STRENGTH = 0.003;

    const createParticle = useCallback((layer: 0 | 1 | 2, width: number, height: number): Particle => {
        const x = Math.random() * width;
        const y = Math.random() * height;

        // Color based on position (gradient feel)
        let color = COLORS.teal;
        const posRatio = (x / width + y / height) / 2;
        if (posRatio < 0.33) {
            color = COLORS.teal;
        } else if (posRatio < 0.66) {
            color = COLORS.cyan;
        } else {
            color = COLORS.indigo;
        }

        // Layer-specific properties
        let size: number;
        let alpha: number;
        let velocityScale: number;

        switch (layer) {
            case 0: // Background orbs
                size = Math.random() * 80 + 40;
                alpha = 0.03;
                velocityScale = 0.08;
                break;
            case 1: // Connection nodes
                size = Math.random() * 2.5 + 1.5;
                alpha = 0.6;
                velocityScale = 0.15;
                break;
            case 2: // Dust
                size = Math.random() * 1.5 + 0.5;
                alpha = 0.35;
                velocityScale = 0.2;
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
        };
    }, []);

    const initParticles = useCallback((width: number, height: number) => {
        particles.current = [];

        // Layer 0: Background orbs
        for (let i = 0; i < LAYER_COUNTS.bgOrbs; i++) {
            particles.current.push(createParticle(0, width, height));
        }

        // Layer 1: Connection nodes
        for (let i = 0; i < LAYER_COUNTS.connectionNodes; i++) {
            particles.current.push(createParticle(1, width, height));
        }

        // Layer 2: Dust
        for (let i = 0; i < LAYER_COUNTS.dust; i++) {
            particles.current.push(createParticle(2, width, height));
        }
    }, [createParticle]);

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

            // Boundary handling (soft bounce)
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
                    const pullStrength = force * (p.layer === 1 ? 1.8 : 1.2);

                    p.x += Math.cos(angle) * pullStrength;
                    p.y += Math.sin(angle) * pullStrength;
                }
            }

            // Gentle return to origin (prevents particles from drifting too far)
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
                gradient.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha * scrollFade})`);
                gradient.addColorStop(1, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0)`);
                ctx.fillStyle = gradient;
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Connection nodes and dust: Solid circles
                ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha * scrollFade})`;
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Draw connections between Layer 1 nodes
        const connectionNodes = allParticles.filter(p => p.layer === 1);
        ctx.lineWidth = 1;

        for (let i = 0; i < connectionNodes.length; i++) {
            const p1 = connectionNodes[i];

            for (let j = i + 1; j < connectionNodes.length; j++) {
                const p2 = connectionNodes[j];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < CONNECTION_DISTANCE) {
                    const opacity = (1 - dist / CONNECTION_DISTANCE) * 0.2 * scrollFade;

                    // Gradient line between two particles
                    const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
                    gradient.addColorStop(0, `rgba(${p1.color.r}, ${p1.color.g}, ${p1.color.b}, ${opacity})`);
                    gradient.addColorStop(1, `rgba(${p2.color.r}, ${p2.color.g}, ${p2.color.b}, ${opacity})`);

                    ctx.beginPath();
                    ctx.strokeStyle = gradient;
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
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        isReducedMotion.current = mediaQuery.matches;

        const handleMotionChange = (e: MediaQueryListEvent) => {
            isReducedMotion.current = e.matches;
            if (!e.matches) {
                animationFrameId.current = requestAnimationFrame(draw);
            }
        };
        mediaQuery.addEventListener('change', handleMotionChange);

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
            mediaQuery.removeEventListener('change', handleMotionChange);
            cancelAnimationFrame(animationFrameId.current);
        };
    }, [draw, initParticles]);

    return (
        <canvas
            ref={canvasRef}
            className={`fixed inset-0 pointer-events-none z-0 ${className}`}
            style={{ background: 'var(--bg-void)' }}
            aria-hidden="true"
        />
    );
}

export default ParticleBackgroundV2;
