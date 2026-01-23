"use client";

import { useEffect, useState } from "react";

/**
 * PowerPulseV2 - Electric Glass Design System
 *
 * Boot/activation animation with:
 * - Central beam (SVG animated line)
 * - Branching circuit traces
 * - Shockwave rings (expanding circles)
 * - Teal-to-indigo gradient
 *
 * Props:
 * - active: boolean - Whether to show the animation
 * - onComplete: () => void - Called when animation finishes
 * - size: 'sm' | 'md' | 'lg' - Size variant
 * - className: string - Additional CSS classes
 */

interface PowerPulseV2Props {
    active: boolean;
    onComplete?: () => void;
    size?: "sm" | "md" | "lg";
    className?: string;
}

const SIZES = {
    sm: { width: 200, height: 200, beamLength: 60, ringSize: 40 },
    md: { width: 400, height: 300, beamLength: 100, ringSize: 64 },
    lg: { width: 600, height: 400, beamLength: 150, ringSize: 96 },
};

export function PowerPulseV2({
    active,
    onComplete,
    size = "md",
    className = "",
}: PowerPulseV2Props) {
    const [phase, setPhase] = useState<"idle" | "beam" | "trace" | "wave" | "complete">("idle");
    const config = SIZES[size];

    useEffect(() => {
        if (!active) {
            setPhase("idle");
            return;
        }

        // Animation sequence
        setPhase("beam");

        const traceTimeout = setTimeout(() => setPhase("trace"), 200);
        const waveTimeout = setTimeout(() => setPhase("wave"), 500);
        const completeTimeout = setTimeout(() => {
            setPhase("complete");
            onComplete?.();
        }, 1200);

        return () => {
            clearTimeout(traceTimeout);
            clearTimeout(waveTimeout);
            clearTimeout(completeTimeout);
        };
    }, [active, onComplete]);

    if (!active && phase === "idle") return null;

    const centerX = config.width / 2;
    const centerY = 40; // Beam origin point

    return (
        <div
            className={`relative pointer-events-none ${className}`}
            style={{ width: config.width, height: config.height }}
        >
            <svg
                viewBox={`0 0 ${config.width} ${config.height}`}
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="absolute inset-0 w-full h-full"
            >
                <defs>
                    {/* Beam gradient */}
                    <linearGradient id="beamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="var(--accent-primary, #14b8a6)" stopOpacity="1" />
                        <stop offset="100%" stopColor="var(--accent-primary, #14b8a6)" stopOpacity="0" />
                    </linearGradient>

                    {/* Trace gradient */}
                    <linearGradient id="traceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--accent-primary, #14b8a6)" stopOpacity="1" />
                        <stop offset="100%" stopColor="var(--accent-secondary, #6366f1)" stopOpacity="0.3" />
                    </linearGradient>

                    {/* Glow filter */}
                    <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Central Beam */}
                {(phase === "beam" || phase === "trace" || phase === "wave") && (
                    <line
                        x1={centerX}
                        y1={centerY}
                        x2={centerX}
                        y2={centerY + config.beamLength}
                        stroke="url(#beamGrad)"
                        strokeWidth="2"
                        filter="url(#glowFilter)"
                        className="animate-beam-expand origin-top"
                        style={{
                            transformOrigin: `${centerX}px ${centerY}px`,
                        }}
                    />
                )}

                {/* Circuit traces */}
                {(phase === "trace" || phase === "wave" || phase === "complete") && (
                    <g className="animate-circuit-trace" style={{ opacity: phase === "complete" ? 0.4 : 1 }}>
                        {/* Left branch */}
                        <path
                            d={`M ${centerX} ${centerY + config.beamLength}
                               L ${centerX} ${centerY + config.beamLength + 30}
                               L ${centerX - 60} ${centerY + config.beamLength + 60}
                               L ${centerX - 120} ${centerY + config.beamLength + 80}`}
                            stroke="url(#traceGrad)"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            fill="none"
                            filter="url(#glowFilter)"
                            style={{
                                strokeDasharray: 300,
                                strokeDashoffset: phase === "trace" ? 300 : 0,
                                transition: "stroke-dashoffset 0.6s ease-out",
                            }}
                        />

                        {/* Right branch */}
                        <path
                            d={`M ${centerX} ${centerY + config.beamLength}
                               L ${centerX} ${centerY + config.beamLength + 30}
                               L ${centerX + 60} ${centerY + config.beamLength + 60}
                               L ${centerX + 120} ${centerY + config.beamLength + 80}`}
                            stroke="url(#traceGrad)"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            fill="none"
                            filter="url(#glowFilter)"
                            style={{
                                strokeDasharray: 300,
                                strokeDashoffset: phase === "trace" ? 300 : 0,
                                transition: "stroke-dashoffset 0.6s ease-out 0.1s",
                            }}
                        />

                        {/* Center branch */}
                        <path
                            d={`M ${centerX} ${centerY + config.beamLength}
                               L ${centerX} ${centerY + config.beamLength + 100}`}
                            stroke="url(#traceGrad)"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            fill="none"
                            filter="url(#glowFilter)"
                            style={{
                                strokeDasharray: 200,
                                strokeDashoffset: phase === "trace" ? 200 : 0,
                                transition: "stroke-dashoffset 0.5s ease-out",
                            }}
                        />

                        {/* Junction nodes */}
                        <circle
                            cx={centerX}
                            cy={centerY + config.beamLength + 30}
                            r="3"
                            fill="var(--accent-primary, #14b8a6)"
                            filter="url(#glowFilter)"
                            style={{
                                opacity: phase === "trace" ? 0 : 1,
                                transition: "opacity 0.3s ease-out 0.3s",
                            }}
                        />
                        <circle
                            cx={centerX - 60}
                            cy={centerY + config.beamLength + 60}
                            r="2"
                            fill="var(--accent-secondary, #6366f1)"
                            filter="url(#glowFilter)"
                            style={{
                                opacity: phase === "trace" ? 0 : 1,
                                transition: "opacity 0.3s ease-out 0.4s",
                            }}
                        />
                        <circle
                            cx={centerX + 60}
                            cy={centerY + config.beamLength + 60}
                            r="2"
                            fill="var(--accent-secondary, #6366f1)"
                            filter="url(#glowFilter)"
                            style={{
                                opacity: phase === "trace" ? 0 : 1,
                                transition: "opacity 0.3s ease-out 0.4s",
                            }}
                        />
                    </g>
                )}
            </svg>

            {/* Shockwave rings */}
            {(phase === "wave" || phase === "complete") && (
                <div
                    className="absolute"
                    style={{
                        left: centerX - config.ringSize / 2,
                        top: centerY,
                        width: config.ringSize,
                        height: config.ringSize,
                    }}
                >
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="absolute inset-0 rounded-full border-2"
                            style={{
                                borderColor: i === 0 ? "var(--accent-primary, #14b8a6)" : "var(--accent-secondary, #6366f1)",
                                opacity: phase === "complete" ? 0 : 0.6 - i * 0.15,
                                transform: phase === "complete" ? "scale(3)" : `scale(${1 + i * 0.5})`,
                                transition: `all ${0.8 + i * 0.2}s ease-out ${i * 0.12}s`,
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default PowerPulseV2;
