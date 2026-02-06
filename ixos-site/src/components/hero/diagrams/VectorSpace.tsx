"use client";

import { cn } from "@/lib/utils";

const DOCS = [
    { cx: 25, cy: 20 },
    { cx: 72, cy: 15 },
    { cx: 45, cy: 55 },
    { cx: 15, cy: 65 },
    { cx: 80, cy: 50 },
    { cx: 60, cy: 75 },
    { cx: 35, cy: 35 },
];

const QUERY = { cx: 50, cy: 42 };
const NEIGHBORS = [2, 6, 4]; // indices of closest docs
const NEIGHBOR_SCORES = ["0.91", "0.82", "0.65"];

function dist(a: { cx: number; cy: number }, b: { cx: number; cy: number }) {
    const dx = a.cx - b.cx;
    const dy = a.cy - b.cy;
    return Math.sqrt(dx * dx + dy * dy);
}

export function VectorSpace({
    isActive,
    isComplete,
}: {
    isActive: boolean;
    isComplete: boolean;
}) {
    const show = isActive || isComplete;

    return (
        <div className="mt-3 flex flex-col items-center gap-1.5">
            <svg
                viewBox="0 0 100 90"
                className={cn(
                    "w-full max-w-[180px] h-auto transition-opacity duration-500",
                    show ? "opacity-100" : "opacity-30"
                )}
            >
                {/* Purple scan radius circle */}
                {isActive && (
                    <circle
                        cx={QUERY.cx}
                        cy={QUERY.cy}
                        r="0"
                        fill="none"
                        stroke="rgba(124,92,255,0.15)"
                        strokeWidth="0.8"
                    >
                        <animate
                            attributeName="r"
                            values="0;35;0"
                            dur="3s"
                            repeatCount="indefinite"
                        />
                        <animate
                            attributeName="opacity"
                            values="0.6;0;0.6"
                            dur="3s"
                            repeatCount="indefinite"
                        />
                    </circle>
                )}

                {/* Dashed lines to neighbors with staggered draw-in */}
                {NEIGHBORS.map((ni, idx) => {
                    const d = dist(QUERY, DOCS[ni]);
                    return (
                        <line
                            key={ni}
                            x1={QUERY.cx}
                            y1={QUERY.cy}
                            x2={DOCS[ni].cx}
                            y2={DOCS[ni].cy}
                            stroke={isActive ? "rgba(20,184,166,0.4)" : "rgba(255,255,255,0.06)"}
                            strokeWidth="0.8"
                            strokeDasharray={d}
                            strokeDashoffset={isActive ? 0 : d}
                            style={{
                                transition: `stroke-dashoffset 0.5s ease-out ${idx * 200}ms, stroke 0.5s`,
                            }}
                        />
                    );
                })}

                {/* Document dots */}
                {DOCS.map((d, i) => {
                    const isNeighbor = NEIGHBORS.includes(i);
                    return (
                        <circle
                            key={i}
                            cx={d.cx}
                            cy={d.cy}
                            r={isNeighbor && isActive ? 3 : 2.5}
                            fill={
                                isNeighbor && (isActive || isComplete)
                                    ? "rgba(20,184,166,0.6)"
                                    : "rgba(255,255,255,0.15)"
                            }
                            className="transition-all duration-500"
                        />
                    );
                })}

                {/* Floating score labels near top 3 neighbors */}
                {isActive && NEIGHBORS.map((ni, idx) => (
                    <text
                        key={`score-${ni}`}
                        x={DOCS[ni].cx + 5}
                        y={DOCS[ni].cy - 5}
                        fill="rgba(20,184,166,0.7)"
                        fontSize="5"
                        fontFamily="monospace"
                        style={{
                            opacity: 0,
                            animation: `fadeIn 0.3s ease-out ${300 + idx * 200}ms forwards`,
                        }}
                    >
                        {NEIGHBOR_SCORES[idx]}
                    </text>
                ))}

                {/* Query dot with pulse */}
                <circle
                    cx={QUERY.cx}
                    cy={QUERY.cy}
                    r={isActive ? 5 : 4}
                    fill={isActive ? "rgba(20,184,166,0.9)" : isComplete ? "rgba(20,184,166,0.6)" : "rgba(255,255,255,0.2)"}
                    className="transition-all duration-500"
                >
                    {isActive && (
                        <animate
                            attributeName="r"
                            values="4;6;4"
                            dur="2s"
                            repeatCount="indefinite"
                        />
                    )}
                </circle>

                {/* Inline style for fadeIn keyframe */}
                <defs>
                    <style>{`
                        @keyframes fadeIn {
                            from { opacity: 0; transform: translateY(2px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                    `}</style>
                </defs>
            </svg>

            {/* CPU badge */}
            <span
                className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-mono border transition-all duration-500",
                    isActive
                        ? "border-accent-teal/25 bg-accent-teal/10 text-accent-teal"
                        : "border-white/5 bg-white/[0.02] text-fg-muted/25"
                )}
            >
                CPU
            </span>
        </div>
    );
}
