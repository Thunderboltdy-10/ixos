"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    opacity: number;
}

interface ParticlesFieldProps {
    className?: string;
    density?: "high" | "medium" | "low";
}

export function ParticlesField({ className, density = "high" }: ParticlesFieldProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particles = useRef<Particle[]>([]);
    const mouse = useRef({ x: -1000, y: -1000 });

    // Density config
    const particleCount = density === "high" ? 120 : density === "medium" ? 80 : 40;
    const connectionDistance = density === "high" ? 100 : 80;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId: number;
        let width = window.innerWidth;
        let height = window.innerHeight;

        // Initialize scaling for retina
        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            const dpr = window.devicePixelRatio || 1;

            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            initParticles();
        };

        const initParticles = () => {
            particles.current = [];
            for (let i = 0; i < particleCount; i++) {
                particles.current.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    size: Math.random() * 2 + 0.5, // 0.5px to 2.5px
                    opacity: Math.random() * 0.5 + 0.1, // 0.1 to 0.6
                });
            }
        };

        const draw = () => {
            ctx.clearRect(0, 0, width, height);

            // Update particles
            particles.current.forEach((p, i) => {
                // Simple physics
                p.x += p.vx;
                p.y += p.vy;

                // Wrap around screen
                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;

                // Mouse attraction
                const dx = mouse.current.x - p.x;
                const dy = mouse.current.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 200) {
                    const force = (200 - dist) / 200;
                    p.vx += dx * force * 0.002; // Gentle pull
                    p.vy += dy * force * 0.002;
                }

                // Draw particle
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
                ctx.fill();

                // Connections
                for (let j = i + 1; j < particles.current.length; j++) {
                    const p2 = particles.current[j];
                    const distx = p.x - p2.x;
                    const disty = p.y - p2.y;
                    const distance = Math.sqrt(distx * distx + disty * disty);

                    if (distance < connectionDistance) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        // Opacity based on distance
                        const alpha = 1 - distance / connectionDistance;
                        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.15})`; // Very subtle lines
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            });

            animationFrameId = requestAnimationFrame(draw);
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouse.current.x = e.clientX;
            mouse.current.y = e.clientY;
        };

        window.addEventListener("resize", handleResize);
        window.addEventListener("mousemove", handleMouseMove);

        handleResize();
        draw();

        return () => {
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("mousemove", handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, [particleCount, connectionDistance]);

    return (
        <canvas
            ref={canvasRef}
            className={cn("fixed inset-0 pointer-events-none z-0", className)}
            style={{ opacity: 0.6 }} // Master opacity for subtlety
            aria-hidden="true"
        />
    );
}
