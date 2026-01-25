"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";

// TypeScript augmentations for window
declare global {
    interface Window {
        __ixosTracePoints: { x: number; y: number }[];
    }
}

interface ElectricTracesV3Props {
    className?: string;
}

const TRACE_SEGMENTS = [
    // 1. Hero Left -> Hero Right (Deck connection)
    { id: "hero-deck", points: "M-50,200 L300,200 L300,100 L1600,100 L1600,300", color: "amber", delay: 0 },

    // 2. Deck -> Pipeline (Vertical drop)
    { id: "deck-pipeline", points: "M1600,400 L1600,800 L1400,800 L1400,1200", color: "teal", delay: 0.5 },

    // 3. Pipeline -> Meeting (Cross to Left)
    { id: "pipe-meeting", points: "M1400,1300 L1400,1500 L200,1500 L200,1800", color: "violet", delay: 1.0 },

    // 4. Meeting -> Benchmarks (Vertical Left)
    { id: "meet-bench", points: "M200,1900 L200,2400 L600,2400", color: "violet", delay: 1.5 },

    // 5. Benchmarks -> Pricing (Center Feed)
    { id: "bench-price", points: "M800,2400 L1200,2400 L1200,2800 L800,2800 L800,3200", color: "magenta", delay: 2.0 },

    // 6. Pricing -> Trust (Bottom Spread)
    { id: "price-trust", points: "M800,3300 L800,3600 L200,3600", color: "amber", delay: 2.5 },
] as const;

export function ElectricTracesV3({ className }: ElectricTracesV3Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const pathRefs = useRef<Map<string, SVGPathElement>>(new Map());
    const glowPathRefs = useRef<Map<string, SVGPathElement>>(new Map());
    const [dimensions, setDimensions] = useState({ width: 1920, height: 4000 });
    const [isGlowing, setIsGlowing] = useState(false);

    // Resize Handler
    useEffect(() => {
        const handleResize = () => {
            setDimensions({
                width: window.innerWidth,
                height: Math.max(document.documentElement.scrollHeight, 4000),
            });
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Scroll Sync (Manual Parallax for Fixed Container)
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const onScroll = () => {
            container.style.transform = `translate3d(0, -${window.scrollY}px, 0)`;
        };
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // Expose Points to Global Scope for Particles
    useEffect(() => {
        if (!svgRef.current) return;

        const samplePoints = () => {
            const points: { x: number; y: number }[] = [];
            pathRefs.current.forEach((path) => {
                const len = path.getTotalLength();
                // Sample every 50px
                for (let i = 0; i < len; i += 50) {
                    const p = path.getPointAtLength(i);
                    points.push({ x: p.x, y: p.y });
                }
            });
            window.__ixosTracePoints = points;
        };

        // Delay slightly to ensure layout is done
        setTimeout(samplePoints, 500);
    }, [dimensions]);

    // Animation via ScrollTrigger
    useEffect(() => {
        if (!svgRef.current) return;
        gsap.registerPlugin(ScrollTrigger);

        const ctx = gsap.context(() => {
            TRACE_SEGMENTS.forEach((segment) => {
                const path = pathRefs.current.get(segment.id);
                if (!path) return;

                const length = path.getTotalLength();

                gsap.set(path, {
                    strokeDasharray: length,
                    strokeDashoffset: length,
                    opacity: 0.3
                });

                // Start animation when the trace's start Y enters viewport
                // Use the first Y coordinate from string as approximation
                const firstY = parseFloat(segment.points.split(',')[1] || "0");

                gsap.to(path, {
                    strokeDashoffset: 0,
                    opacity: 1, // Full brightness on draw
                    duration: 1,
                    ease: "none",
                    scrollTrigger: {
                        trigger: document.body,
                        start: `${firstY - window.innerHeight * 0.8} top`,
                        end: `${firstY + 600} top`,
                        scrub: 1,
                    }
                });
            });
        }, svgRef);

        return () => ctx.revert();
    }, [dimensions]);

    // Handle Glow Event from Video
    useEffect(() => {
        const handlePlay = () => setIsGlowing(true);
        const handleReset = () => setIsGlowing(false);

        window.addEventListener('ixos-video-play', handlePlay);
        window.addEventListener('ixos-video-reset', handleReset);

        return () => {
            window.removeEventListener('ixos-video-play', handlePlay);
            window.removeEventListener('ixos-video-reset', handleReset);
        };
    }, []);

    // Animate Glow
    useEffect(() => {
        const glowPaths = Array.from(glowPathRefs.current.values());
        if (glowPaths.length === 0) return;

        gsap.to(glowPaths, {
            strokeOpacity: isGlowing ? 0.6 : 0.1,
            strokeWidth: isGlowing ? 6 : 4,
            filter: isGlowing ? "url(#trace-glow-strong)" : "url(#trace-glow)",
            duration: 0.5,
            ease: "power2.out"
        });
    }, [isGlowing]);

    const getColor = (name: string) => {
        switch (name) {
            case 'amber': return 'var(--color-accent-amber)';
            case 'violet': return 'var(--color-accent-violet)';
            case 'magenta': return 'var(--color-accent-magenta)';
            default: return 'var(--color-accent-teal)';
        }
    };

    return (
        <div
            ref={containerRef}
            className={cn("absolute inset-0 pointer-events-none z-0 overflow-visible", className)}
        >
            <svg
                ref={svgRef}
                viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
                preserveAspectRatio="none"
                style={{ width: "100%", height: dimensions.height }}
            >
                <defs>
                    <filter id="trace-glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <filter id="trace-glow-strong" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                {TRACE_SEGMENTS.map((segment) => (
                    <g key={segment.id}>
                        {/* Wider Glow Path */}
                        <path
                            ref={(el) => {
                                if (el) glowPathRefs.current.set(segment.id, el);
                            }}
                            d={segment.points}
                            stroke={getColor(segment.color)}
                            strokeWidth="4"
                            strokeOpacity="0.1"
                            strokeLinecap="round"
                            fill="none"
                            filter="url(#trace-glow)"
                        />
                        {/* Core Animation Path */}
                        <path
                            ref={(el) => {
                                if (el) pathRefs.current.set(segment.id, el);
                            }}
                            d={segment.points}
                            stroke={getColor(segment.color)}
                            strokeWidth="1.5"
                            strokeLinecap="square"
                            fill="none"
                        />
                    </g>
                ))}
            </svg>
        </div>
    );
}
