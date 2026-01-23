"use client";

import { useRef, useEffect, useCallback } from "react";
import { motion, useInView } from "framer-motion";
import { CornerBracketCard } from "@/components/electric-glass/CornerBracketCard";

/**
 * PrivacyBlock - Privacy by Architecture
 *
 * Tasteful privacy messaging with:
 * - Constellation lock animation (particles form lock shape)
 * - No fearmongering, just facts
 * - Three key privacy points
 */

interface Particle {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    originX: number;
    originY: number;
    size: number;
    alpha: number;
}

// Lock shape coordinates (normalized 0-1)
const LOCK_POINTS = [
    // Lock body (rectangle)
    { x: 0.35, y: 0.55 }, { x: 0.65, y: 0.55 },
    { x: 0.65, y: 0.8 }, { x: 0.35, y: 0.8 },
    { x: 0.4, y: 0.6 }, { x: 0.6, y: 0.6 },
    { x: 0.6, y: 0.75 }, { x: 0.4, y: 0.75 },
    // Lock shackle (arc)
    { x: 0.38, y: 0.55 }, { x: 0.38, y: 0.42 },
    { x: 0.42, y: 0.35 }, { x: 0.5, y: 0.32 },
    { x: 0.58, y: 0.35 }, { x: 0.62, y: 0.42 },
    { x: 0.62, y: 0.55 },
    // Keyhole
    { x: 0.5, y: 0.65 }, { x: 0.5, y: 0.7 },
];

export function PrivacyBlock() {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particles = useRef<Particle[]>([]);
    const animationRef = useRef<number>(0);
    const isInView = useInView(containerRef, { once: false, margin: "-100px" });

    const initParticles = useCallback((width: number, height: number) => {
        particles.current = [];
        const count = Math.min(LOCK_POINTS.length + 20, 40);

        for (let i = 0; i < count; i++) {
            const originX = Math.random() * width;
            const originY = Math.random() * height;

            // Assign lock point targets for some particles
            let targetX = originX;
            let targetY = originY;

            if (i < LOCK_POINTS.length) {
                targetX = LOCK_POINTS[i].x * width;
                targetY = LOCK_POINTS[i].y * height;
            }

            particles.current.push({
                x: originX,
                y: originY,
                targetX,
                targetY,
                originX,
                originY,
                size: Math.random() * 2 + 1,
                alpha: 0.4 + Math.random() * 0.3,
            });
        }
    }, []);

    const draw = useCallback((forming: boolean) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        // Update and draw particles
        particles.current.forEach((p, i) => {
            // Move toward target or origin based on forming state
            const targetX = forming ? p.targetX : p.originX;
            const targetY = forming ? p.targetY : p.originY;

            // Smooth interpolation
            const speed = forming ? 0.08 : 0.04;
            p.x += (targetX - p.x) * speed;
            p.y += (targetY - p.y) * speed;

            // Draw particle
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(20, 184, 166, ${p.alpha})`;
            ctx.fill();

            // Draw connections to nearby particles
            if (i < LOCK_POINTS.length && forming) {
                particles.current.forEach((p2, j) => {
                    if (i === j || j >= LOCK_POINTS.length) return;
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 80) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = `rgba(20, 184, 166, ${(1 - dist / 80) * 0.2})`;
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                });
            }
        });
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resize = () => {
            const rect = canvas.parentElement?.getBoundingClientRect();
            if (!rect) return;

            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;

            const ctx = canvas.getContext("2d");
            if (ctx) ctx.scale(dpr, dpr);

            initParticles(rect.width, rect.height);
        };

        resize();
        window.addEventListener("resize", resize);

        // Animation loop
        const animate = () => {
            draw(isInView);
            animationRef.current = requestAnimationFrame(animate);
        };
        animationRef.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener("resize", resize);
            cancelAnimationFrame(animationRef.current);
        };
    }, [draw, initParticles, isInView]);

    return (
        <section ref={containerRef} className="py-24 relative overflow-hidden" id="privacy">
            <div className="container mx-auto px-4">
                <div className="max-w-2xl mx-auto relative">
                    {/* Particle Canvas Background */}
                    <div className="absolute inset-0 -z-10">
                        <canvas
                            ref={canvasRef}
                            className="w-full h-full"
                            aria-hidden="true"
                        />
                    </div>

                    <CornerBracketCard className="backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-center py-8 px-4"
                        >
                            {/* Headline */}
                            <h2 className="text-2xl md:text-3xl font-bold mb-4">
                                Privacy by Architecture
                            </h2>
                            <p className="text-content-secondary mb-8 max-w-md mx-auto">
                                Not a toggle. Not a policy. Built into every operation.
                            </p>

                            {/* Three Points */}
                            <div className="space-y-4 text-left max-w-sm mx-auto">
                                <div className="flex items-start gap-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-brand-teal mt-2 flex-shrink-0" />
                                    <p className="text-sm text-content-secondary">
                                        Embeddings generated on your CPU
                                    </p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-brand-teal mt-2 flex-shrink-0" />
                                    <p className="text-sm text-content-secondary">
                                        Zero network requests after install
                                    </p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-brand-teal mt-2 flex-shrink-0" />
                                    <p className="text-sm text-content-secondary">
                                        Optional <span className="font-mono text-brand-teal text-xs">XChaCha20</span> encryption at rest
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </CornerBracketCard>
                </div>
            </div>
        </section>
    );
}

export default PrivacyBlock;
