"use client";

import { useEffect, useRef } from "react";
import { colors } from "@/lib/design-tokens";

interface Node {
    x: number;
    y: number;
    vx: number;
    vy: number;
    originX: number;
    originY: number;
    size: number;
    color: string;
    layer: 0 | 1 | 2; // 0=bg, 1=mid, 2=fg
}

export function ParticleBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const nodes = useRef<Node[]>([]);
    const mouse = useRef({ x: -1000, y: -1000 });
    const scrollY = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId: number;
        let width = 0;
        let height = 0;

        const resize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
            initNodes();
        };

        const initNodes = () => {
            nodes.current = [];

            // Layer 0 (Blurry Orbs) - 5
            for (let i = 0; i < 5; i++) {
                createNode(0);
            }
            // Layer 1 (Connecting Nodes) - 30
            for (let i = 0; i < 30; i++) {
                createNode(1);
            }
            // Layer 2 (Tiny Particles) - 60
            for (let i = 0; i < 60; i++) {
                createNode(2);
            }
        };

        const createNode = (layer: 0 | 1 | 2) => {
            const x = Math.random() * width;
            const y = Math.random() * height;

            // Gradient color logic based on position
            let color = colors.brand.blue;
            if (x < width / 2 && y < height / 2) color = colors.brand.teal; // TL
            else if (x > width / 2 && y < height / 2) color = colors.brand.cyan; // TR
            else if (x < width / 2 && y > height / 2) color = colors.brand.purple; // BL

            nodes.current.push({
                x, y,
                originX: x, originY: y,
                vx: (Math.random() - 0.5) * (layer + 1) * 0.2,
                vy: (Math.random() - 0.5) * (layer + 1) * 0.2,
                size: layer === 0 ? Math.random() * 100 + 50 : Math.random() * 2 + 1,
                color,
                layer
            });
        };

        const draw = () => {
            ctx.clearRect(0, 0, width, height);

            // Values for magnetic effect
            const magnetRadius = 250;

            // Scroll fade out
            const scrollFade = Math.max(0, 1 - scrollY.current / (height * 1.5));
            ctx.globalAlpha = scrollFade;

            nodes.current.forEach((node) => {
                // 1. Move naturally
                node.x += node.vx;
                node.y += node.vy;

                // Bounce off edges (virtual bounds extended slightly)
                if (node.x < -100 || node.x > width + 100) node.vx *= -1;
                if (node.y < -100 || node.y > height + 100) node.vy *= -1;

                // 2. Magnetic Attraction
                const dx = mouse.current.x - node.x;
                const dy = mouse.current.y - node.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < magnetRadius && node.layer > 0) { // Don't attract background orbs
                    const force = (magnetRadius - dist) / magnetRadius;
                    const angle = Math.atan2(dy, dx);

                    // Pull towards mouse
                    node.x += Math.cos(angle) * force * 1.5;
                    node.y += Math.sin(angle) * force * 1.5;
                } else {
                    // Return to origin logic could go here, but free-float is more organic
                }

                // 3. Draw
                ctx.beginPath();
                if (node.layer === 0) {
                    // Background Orbs
                    ctx.filter = `blur(${node.size / 2}px)`;
                    ctx.fillStyle = node.color;
                    ctx.globalAlpha = 0.1 * scrollFade;
                    ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.filter = 'none';
                } else {
                    // Nodes & Particles
                    ctx.fillStyle = node.color;
                    ctx.globalAlpha = (node.layer === 2 ? 0.6 : 0.8) * scrollFade;
                    ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
                    ctx.fill();
                }

                // 4. Connect nearby nodes (Layer 1 only)
                if (node.layer === 1) {
                    nodes.current.forEach(other => {
                        if (other.layer === 1 && other !== node) {
                            const ddx = node.x - other.x;
                            const ddy = node.y - other.y;
                            const d = Math.sqrt(ddx * ddx + ddy * ddy);
                            if (d < 120) {
                                ctx.beginPath();
                                ctx.moveTo(node.x, node.y);
                                ctx.lineTo(other.x, other.y);
                                ctx.strokeStyle = node.color;
                                ctx.globalAlpha = (1 - d / 120) * 0.3 * scrollFade;
                                ctx.lineWidth = 1;
                                ctx.stroke();
                            }
                        }
                    });
                }
            });

            animationFrameId = requestAnimationFrame(draw);
        };

        const onMouseMove = (e: MouseEvent) => {
            mouse.current.x = e.clientX;
            mouse.current.y = e.clientY;
        };

        const onScroll = () => {
            scrollY.current = window.scrollY;
        }

        window.addEventListener("resize", resize);
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("scroll", onScroll);
        resize();
        draw();

        return () => {
            window.removeEventListener("resize", resize);
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("scroll", onScroll);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0 bg-surface-0"
        />
    );
}
