"use client";

import { useEffect, useRef, useState } from "react";

// Types
interface Point {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    opacity: number;
    baseOpacity: number;
    targetX?: number; // For snapping
    targetY?: number;
}

declare global {
    interface Window {
        __ixosTracePoints: { x: number; y: number }[];
    }
}

const PARTICLE_COUNT = 150;
const PARALLAX_STRENGTH = 0.05; // 3D depth effect

export function ParticlesFieldV3() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particles = useRef<Point[]>([]);
    const mouse = useRef({ x: 0, y: 0 });
    const targetMouse = useRef({ x: 0, y: 0 }); // Smooth lerp target
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const scrollFactor = useRef(1);

    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY;
            const decay = Math.max(0.1, 1 - (scrollY / 800));
            scrollFactor.current = decay;
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        const handleResize = () => {
            if (typeof window !== "undefined") {
                setDimensions({
                    width: window.innerWidth,
                    height: window.innerHeight,
                });
            }
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // Normalize mouse position -0.5 to 0.5
            targetMouse.current = {
                x: (e.clientX / window.innerWidth) - 0.5,
                y: (e.clientY / window.innerHeight) - 0.5
            };
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    useEffect(() => {
        if (!canvasRef.current || dimensions.width === 0) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const width = dimensions.width;
        const height = dimensions.height;
        const dpr = window.devicePixelRatio || 1;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        // Initialize particles (smaller now)
        particles.current = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const size = Math.random() * 1.1 + 0.4; // 0.4 to 1.5px
            particles.current.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.2,
                vy: (Math.random() - 0.5) * 0.2,
                size: size,
                opacity: Math.random() * 0.5 + 0.3,
                baseOpacity: Math.random() * 0.5 + 0.3,
            });
        }

        let animationFrameId: number;

        const render = () => {
            ctx.clearRect(0, 0, width, height);
            const sf = scrollFactor.current;

            // Lerp mouse for smooth parallax
            mouse.current.x += (targetMouse.current.x - mouse.current.x) * 0.1;
            mouse.current.y += (targetMouse.current.y - mouse.current.y) * 0.1;

            // Check for trace points occasionally
            const tracePoints = typeof window !== 'undefined' ? window.__ixosTracePoints : [];

            particles.current.forEach((p) => {
                // 1. Base Floating Physics
                p.x += p.vx;
                p.y += p.vy;

                // 2. Parallax (Inverse movement based on depth/size)
                // Larger particles = closer = move MORE in opposite direction
                const parallaxX = -mouse.current.x * p.size * 30 * PARALLAX_STRENGTH;
                const parallaxY = -mouse.current.y * p.size * 30 * PARALLAX_STRENGTH;

                // 3. Trace Snapping (Top layer only)
                // If particle is close to a trace point and sufficiently opaque

                if (tracePoints && tracePoints.length > 0 && sf > 0.5) {
                    // Only check a subset or random points to save performace? 
                    // Or finding nearest is expensive efficiently.
                    // Simplified: Drift towards nearest trace if within range
                    // Actually, just add a subtle "field" effect from the traces?
                    // Let's iterate a few points near the particle's relative Y
                    // Since points are sorted by creation, not Y... 
                    // Simple heuristic: Unnecessary complexity for JS. 
                    // Let's just have them drift near logic if I had a grid.
                    // ALTERNATIVE: Just render particles. Trace linkage is visual via parallax alignment?
                    // User asked: "link them somehow".
                    // Let's add a "current" effect: Particles accelerate along X if near a trace y?
                }

                // Wrap around
                const drawX = (p.x + parallaxX + width) % width;
                const drawY = (p.y + parallaxY + height) % height;

                // Logic: Bounds check for actual p.x/y to keep them in simulation
                if (p.x < -50) p.x = width + 50;
                if (p.x > width + 50) p.x = -50;
                if (p.y < -50) p.y = height + 50;
                if (p.y > height + 50) p.y = -50;

                // Draw
                const finalOpacity = p.opacity * sf;
                if (finalOpacity < 0.05) return;

                ctx.beginPath();
                ctx.arc(drawX, drawY, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${finalOpacity})`;
                ctx.fill();
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, [dimensions]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 z-0 pointer-events-none"
            aria-hidden="true"
        />
    );
}
