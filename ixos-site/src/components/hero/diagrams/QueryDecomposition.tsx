"use client";

import { cn } from "@/lib/utils";

const TOKENS = ["email", "denver", "trip"];

// SVG line endpoints for bracket lines
const LINES = [
    { x1: 60, y1: 0, x2: 20, y2: 18 },
    { x1: 60, y1: 0, x2: 60, y2: 18 },
    { x1: 60, y1: 0, x2: 100, y2: 18 },
];

function lineLength(l: typeof LINES[number]) {
    const dx = l.x2 - l.x1;
    const dy = l.y2 - l.y1;
    return Math.sqrt(dx * dx + dy * dy);
}

export function QueryDecomposition({
    isActive,
    isComplete,
}: {
    isActive: boolean;
    isComplete: boolean;
}) {
    const show = isActive || isComplete;

    return (
        <div className="mt-3 flex flex-col items-center gap-2">
            {/* Source sentence */}
            <div
                className={cn(
                    "text-xs font-mono text-fg-muted/40 transition-opacity duration-500",
                    show ? "opacity-100" : "opacity-0"
                )}
            >
                &quot;that email about the denver trip&quot;
            </div>

            {/* Bracket lines with draw-in animation */}
            <svg
                viewBox="0 0 120 20"
                className={cn(
                    "w-24 h-4 transition-opacity duration-500",
                    show ? "opacity-100" : "opacity-0"
                )}
            >
                {LINES.map((l, i) => {
                    const len = lineLength(l);
                    return (
                        <g key={i}>
                            <line
                                x1={l.x1}
                                y1={l.y1}
                                x2={l.x2}
                                y2={l.y2}
                                stroke={isActive ? "rgba(246,185,76,0.5)" : "rgba(255,255,255,0.1)"}
                                strokeWidth="1"
                                strokeDasharray={len}
                                strokeDashoffset={isActive ? 0 : len}
                                style={{
                                    transition: `stroke-dashoffset 0.6s ease-out ${i * 150}ms, stroke 0.5s`,
                                }}
                            />
                            {/* Animated pulse dot traveling along the line */}
                            {isActive && (
                                <circle r="1.5" fill="rgba(246,185,76,0.7)">
                                    <animateMotion
                                        dur="2s"
                                        repeatCount="indefinite"
                                        begin={`${i * 0.3}s`}
                                        path={`M${l.x1},${l.y1} L${l.x2},${l.y2}`}
                                    />
                                </circle>
                            )}
                        </g>
                    );
                })}
            </svg>

            {/* Token pills */}
            <div className="flex items-center gap-1.5">
                {TOKENS.map((token, i) => (
                    <span
                        key={token}
                        className={cn(
                            "rounded px-1.5 py-0.5 text-[11px] font-mono border transition-all duration-500",
                            isActive
                                ? i === 0
                                    ? "border-accent-amber/40 bg-accent-amber/15 text-accent-amber shadow-[0_0_12px_rgba(246,185,76,0.2)]"
                                    : "border-accent-teal/30 bg-accent-teal/10 text-accent-teal"
                                : isComplete
                                    ? "border-white/10 bg-white/5 text-fg-muted/50"
                                    : "border-white/5 bg-white/[0.02] text-fg-muted/20"
                        )}
                        style={{
                            transitionDelay: isActive ? `${i * 120}ms` : "0ms",
                            opacity: show ? 1 : 0,
                            transform: show ? "translateY(0)" : "translateY(4px)",
                        }}
                    >
                        [{token}]
                    </span>
                ))}
            </div>
        </div>
    );
}
