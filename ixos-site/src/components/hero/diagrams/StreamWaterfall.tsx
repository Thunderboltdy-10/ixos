"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const RESULTS = [
    "flight_confirmation.eml",
    "Q4_2025_Summary.pdf",
    "team_standup_notes.md",
    "NDA_TechCorp_2024.pdf",
    "auth_api_reference.md",
];

export function StreamWaterfall({
    isActive,
    isComplete,
}: {
    isActive: boolean;
    isComplete: boolean;
}) {
    const [visibleCount, setVisibleCount] = useState(0);
    const [timerMs, setTimerMs] = useState(0);
    const [flashIndex, setFlashIndex] = useState<number | null>(null);

    useEffect(() => {
        if (!isActive) {
            setVisibleCount(isComplete ? RESULTS.length : 0);
            setTimerMs(isComplete ? 180 : 0);
            setFlashIndex(null);
            return;
        }

        setVisibleCount(0);
        setTimerMs(0);
        setFlashIndex(null);

        const timers: NodeJS.Timeout[] = [];
        const startTime = Date.now();

        RESULTS.forEach((_, i) => {
            // Flash on arrival
            timers.push(
                setTimeout(() => {
                    setFlashIndex(i);
                    setVisibleCount(i + 1);
                }, 200 + i * 120)
            );
            // Clear flash after brief moment
            timers.push(
                setTimeout(() => setFlashIndex(prev => prev === i ? null : prev), 200 + i * 120 + 200)
            );
        });

        // Timer counter
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            setTimerMs(Math.min(elapsed, 180));
            if (elapsed >= 180) clearInterval(interval);
        }, 16);
        timers.push(interval as unknown as NodeJS.Timeout);

        return () => {
            timers.forEach(clearTimeout);
            clearInterval(interval);
        };
    }, [isActive, isComplete]);

    const show = isActive || isComplete;
    const done = visibleCount >= RESULTS.length;

    return (
        <div className="mt-3 flex flex-col gap-1">
            {RESULTS.map((name, i) => {
                const visible = i < visibleCount;
                const flashing = flashIndex === i;
                return (
                    <div
                        key={name}
                        className={cn(
                            "flex items-center gap-2 text-[11px] font-mono transition-all duration-300 rounded px-1 -mx-1",
                            visible && show
                                ? "opacity-100 translate-x-0"
                                : "opacity-0 translate-x-3",
                            flashing && "bg-accent-teal/10"
                        )}
                        style={{
                            transitionDelay: visible ? `${i * 40}ms` : "0ms",
                        }}
                    >
                        <span className="w-3 text-right text-fg-muted/20">{i + 1}</span>
                        <span
                            className={cn(
                                "truncate transition-colors duration-200",
                                flashing
                                    ? "text-accent-teal"
                                    : isActive
                                        ? "text-accent-teal/70"
                                        : "text-fg-muted/40"
                            )}
                        >
                            {name}
                        </span>
                    </div>
                );
            })}

            {/* Timer + checkmark */}
            <div className="mt-1 flex items-center gap-2">
                <span
                    className={cn(
                        "text-[10px] font-mono tabular-nums transition-all duration-300",
                        show ? "opacity-100" : "opacity-0",
                        !done && isActive ? "text-accent-amber/60" : done && isActive ? "text-accent-teal/60" : "text-fg-muted/25"
                    )}
                >
                    {timerMs}ms
                </span>
                {done && show && (
                    <span className="text-[10px] text-accent-teal/70">&#10003;</span>
                )}
            </div>

            {/* OPEN_WITH indicator */}
            {done && show && (
                <div
                    className={cn(
                        "mt-0.5 text-[9px] font-mono tracking-wider transition-opacity duration-500",
                        isActive ? "text-fg-muted/30 opacity-100" : "opacity-0"
                    )}
                >
                    OPEN_WITH: Explorer
                </div>
            )}
        </div>
    );
}
