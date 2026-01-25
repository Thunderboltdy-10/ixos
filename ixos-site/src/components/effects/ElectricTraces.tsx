"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register ScrollTrigger
if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
}

export function ElectricTraces() {
    const svgRef = useRef<SVGSVGElement>(null);
    const pathRef = useRef<SVGPathElement>(null);
    const sparkRef = useRef<SVGCircleElement>(null);

    useEffect(() => {
        if (!svgRef.current || !pathRef.current) return;

        // The trace path - Manhattan routing style
        // Starts from center-top (hero deck area) and routes down
        const ctx = gsap.context(() => {

            // 1. Draw animation
            gsap.fromTo(
                pathRef.current,
                { strokeDasharray: 1000, strokeDashoffset: 1000 },
                {
                    strokeDashoffset: 0,
                    duration: 1.5,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: ".hero-story", // Trigger when hero story section starts
                        start: "top top",
                        end: "bottom center",
                        scrub: 1,
                    }
                }
            );

            // 2. Traveling pulse (active after draw starts)
            // We can use a second path or a gradient animation

            // 3. Spark at junction
            if (sparkRef.current) {
                gsap.to(sparkRef.current, {
                    opacity: 1,
                    scale: 2,
                    duration: 0.2,
                    repeat: 1,
                    yoyo: true,
                    ease: "power1.inOut",
                    scrollTrigger: {
                        trigger: ".hero-story",
                        start: "30% top", // Spark at 30% scroll
                        toggleActions: "play reverse play reverse"
                    }
                });
            }

        }, svgRef);

        return () => ctx.revert();
    }, []);

    return (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
            <svg
                ref={svgRef}
                viewBox="0 0 1440 1200"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full preserve-3d"
                preserveAspectRatio="xMidYMin slice"
            >
                <defs>
                    <linearGradient id="trace-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="var(--color-text-primary)" stopOpacity="0" />
                        <stop offset="20%" stopColor="var(--color-text-primary)" stopOpacity="0.8" />
                        <stop offset="80%" stopColor="var(--color-accent-teal)" />
                        <stop offset="100%" stopColor="var(--color-accent-teal-glow)" />
                    </linearGradient>

                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                {/* Main Trace Path - Manhattan Routing */}
                <path
                    ref={pathRef}
                    d="M720,100 L720,300 Q720,310 730,310 L1000,310 Q1010,310 1010,320 L1010,800"
                    stroke="url(#trace-gradient)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    filter="url(#glow)"
                    className="opacity-80"
                />

                {/* Spark at Junction */}
                <circle
                    ref={sparkRef}
                    cx="720"
                    cy="300"
                    r="4"
                    fill="var(--color-accent-spark)"
                    className="opacity-0"
                    filter="url(#glow)"
                />
            </svg>
        </div>
    );
}
