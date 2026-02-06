"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const FILES = [
    { name: "flight_confirm…", score: 0.91 },
    { name: "Q4_Summary.pdf", score: 0.82 },
    { name: "team_notes.md", score: 0.65 },
    { name: "budget_2025.xl…", score: 0.42 },
    { name: "newsletter.eml", score: 0.28 },
];

const THRESHOLD = 0.4;

export function ScoreWaterfall({
    isActive,
    isComplete,
}: {
    isActive: boolean;
    isComplete: boolean;
}) {
    const show = isActive || isComplete;
    const [animatedScores, setAnimatedScores] = useState<number[]>(FILES.map(() => 0));

    useEffect(() => {
        if (!isActive) {
            setAnimatedScores(isComplete ? FILES.map(f => Math.round(f.score * 100)) : FILES.map(() => 0));
            return;
        }

        setAnimatedScores(FILES.map(() => 0));

        const timers: NodeJS.Timeout[] = [];
        FILES.forEach((file, i) => {
            const target = Math.round(file.score * 100);
            const startDelay = i * 80 + 100;
            const duration = 400;
            const startTime = Date.now() + startDelay;

            timers.push(setTimeout(() => {
                const interval = setInterval(() => {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(1, elapsed / duration);
                    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
                    setAnimatedScores(prev => {
                        const next = [...prev];
                        next[i] = Math.round(eased * target);
                        return next;
                    });
                    if (progress >= 1) clearInterval(interval);
                }, 16);
                timers.push(interval as unknown as NodeJS.Timeout);
            }, startDelay));
        });

        return () => timers.forEach(clearTimeout);
    }, [isActive, isComplete]);

    return (
        <div className="mt-3 flex flex-col gap-1.5">
            {FILES.map((file, i) => {
                const belowThreshold = file.score < THRESHOLD;
                const widthPercent = Math.round(file.score * 100);

                return (
                    <div
                        key={file.name}
                        className={cn(
                            "flex items-center gap-2 transition-all duration-500",
                            !show && "opacity-0",
                            belowThreshold && show && "opacity-40"
                        )}
                        style={{
                            transitionDelay: isActive ? `${i * 80}ms` : "0ms",
                            opacity: show ? (belowThreshold ? 0.4 : 1) : 0,
                        }}
                    >
                        <span className="w-[72px] truncate text-[10px] font-mono text-fg-muted/40">
                            {file.name}
                        </span>
                        <div className="flex-1 h-2.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden",
                                    belowThreshold
                                        ? "bg-white/10"
                                        : isActive
                                            ? "bg-accent-teal"
                                            : "bg-accent-teal/50"
                                )}
                                style={{
                                    width: show ? `${widthPercent}%` : "0%",
                                    transitionDelay: isActive ? `${i * 80 + 100}ms` : "0ms",
                                }}
                            >
                                {/* Teal shimmer sweep on above-threshold bars */}
                                {isActive && !belowThreshold && (
                                    <div className="absolute inset-0 animate-shimmer" />
                                )}
                            </div>
                        </div>
                        <span className="w-6 text-right text-[10px] font-mono text-fg-muted/30 tabular-nums">
                            {animatedScores[i]}
                        </span>
                    </div>
                );
            })}

            {/* Threshold line - animates in from left */}
            <div className="relative mt-0.5 h-px">
                <div
                    className={cn(
                        "absolute h-px transition-all duration-700 ease-out",
                        show ? "opacity-100" : "opacity-0"
                    )}
                    style={{
                        left: '72px',
                        width: show ? `${THRESHOLD * 100}%` : '0%',
                        transitionDelay: isActive ? '300ms' : '0ms',
                        background: isActive
                            ? "linear-gradient(90deg, rgba(20,184,166,0.5), rgba(20,184,166,0.2))"
                            : "rgba(255,255,255,0.08)",
                        boxShadow: isActive ? "0 0 8px rgba(20,184,166,0.3)" : "none",
                    }}
                />
            </div>
        </div>
    );
}
