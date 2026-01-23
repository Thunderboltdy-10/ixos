"use client";

import { useEffect, useState } from "react";

/**
 * BeamRipple - Electric Glass Design System
 *
 * CPU-like electricity effect with:
 * - Concentric SVG circles expanding outward
 * - Animated stroke-dasharray for electric feel
 * - Fades from teal to transparent
 *
 * Props:
 * - active: boolean - Whether to show the animation
 * - rings: number - Number of ripple rings (default: 5)
 * - maxRadius: number - Maximum radius of outermost ring
 * - duration: number - Animation duration in ms
 * - className: string - Additional CSS classes
 */

interface BeamRippleProps {
    active: boolean;
    rings?: number;
    maxRadius?: number;
    duration?: number;
    className?: string;
    style?: React.CSSProperties;
}

export function BeamRipple({
    active,
    rings = 5,
    maxRadius = 200,
    duration = 1200,
    className = "",
    style,
}: BeamRippleProps) {
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (active) {
            setIsAnimating(true);
            const timeout = setTimeout(() => {
                setIsAnimating(false);
            }, duration + 500);
            return () => clearTimeout(timeout);
        }
    }, [active, duration]);

    if (!isAnimating && !active) return null;

    const viewSize = maxRadius * 2 + 40;
    const center = viewSize / 2;

    return (
        <div
            className={`absolute pointer-events-none ${className}`}
            style={{
                width: viewSize,
                height: viewSize,
                ...style,
            }}
        >
            <svg
                viewBox={`0 0 ${viewSize} ${viewSize}`}
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="absolute inset-0 w-full h-full"
            >
                <defs>
                    {/* Gradient for rings */}
                    <radialGradient id="rippleGrad" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="var(--accent-primary, #14b8a6)" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="var(--accent-primary, #14b8a6)" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="var(--accent-secondary, #6366f1)" stopOpacity="0" />
                    </radialGradient>

                    {/* Glow filter */}
                    <filter id="rippleGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Ripple rings */}
                {Array.from({ length: rings }).map((_, i) => {
                    const delay = (i * duration) / (rings * 2);
                    const ringRadius = ((i + 1) / rings) * maxRadius;
                    const strokeWidth = Math.max(1, 3 - i * 0.4);
                    const dashLength = Math.PI * ringRadius * 0.15;
                    const gapLength = Math.PI * ringRadius * 0.1;

                    return (
                        <circle
                            key={i}
                            cx={center}
                            cy={center}
                            r={ringRadius}
                            stroke="url(#rippleGrad)"
                            strokeWidth={strokeWidth}
                            fill="none"
                            filter="url(#rippleGlow)"
                            style={{
                                strokeDasharray: `${dashLength} ${gapLength}`,
                                opacity: active ? 0 : 0,
                                transform: active ? `scale(${1 + i * 0.3})` : "scale(0)",
                                transformOrigin: "center",
                                transition: `all ${duration}ms ease-out ${delay}ms`,
                                animation: active
                                    ? `rippleExpand ${duration}ms ease-out ${delay}ms forwards`
                                    : "none",
                            }}
                        />
                    );
                })}

                {/* Center pulse */}
                <circle
                    cx={center}
                    cy={center}
                    r="6"
                    fill="var(--accent-primary, #14b8a6)"
                    filter="url(#rippleGlow)"
                    style={{
                        opacity: active ? 1 : 0,
                        transform: active ? "scale(1)" : "scale(0)",
                        transformOrigin: "center",
                        transition: `all 200ms ease-out`,
                    }}
                />
                <circle
                    cx={center}
                    cy={center}
                    r="3"
                    fill="white"
                    style={{
                        opacity: active ? 0.8 : 0,
                        transition: `opacity 200ms ease-out`,
                    }}
                />
            </svg>

            {/* CSS keyframes for the ripple animation */}
            <style jsx>{`
                @keyframes rippleExpand {
                    0% {
                        opacity: 0.8;
                        transform: scale(0);
                    }
                    50% {
                        opacity: 0.5;
                    }
                    100% {
                        opacity: 0;
                        transform: scale(1.5);
                    }
                }
            `}</style>
        </div>
    );
}

export default BeamRipple;
