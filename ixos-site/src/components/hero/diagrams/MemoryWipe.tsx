"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const HEX_ROWS = [
    "4F 72 69 67 69 6E",
    "53 65 6D 42 75 66",
    "E4 A1 C3 FF 00 8B",
];

const CLEAN_TEXT = "CLEAN: 0 bytes";

export function MemoryWipe({
    isActive,
    isComplete,
}: {
    isActive: boolean;
    isComplete: boolean;
}) {
    const [wipeProgress, setWipeProgress] = useState(0);
    const [flashRow, setFlashRow] = useState<number | null>(null);
    const [typedChars, setTypedChars] = useState(0);

    useEffect(() => {
        if (!isActive) {
            setWipeProgress(isComplete ? 3 : 0);
            setFlashRow(null);
            setTypedChars(isComplete ? CLEAN_TEXT.length : 0);
            return;
        }

        setWipeProgress(0);
        setFlashRow(null);
        setTypedChars(0);
        const timers: NodeJS.Timeout[] = [];

        HEX_ROWS.forEach((_, i) => {
            // Flash violet before wipe
            timers.push(
                setTimeout(() => setFlashRow(i), 300 + i * 350)
            );
            // Wipe after flash
            timers.push(
                setTimeout(() => {
                    setWipeProgress(i + 1);
                    setFlashRow(null);
                }, 400 + i * 350)
            );
        });

        // Typewriter effect for CLEAN text after all rows wiped
        const typeStart = 400 + HEX_ROWS.length * 350;
        for (let c = 0; c <= CLEAN_TEXT.length; c++) {
            timers.push(
                setTimeout(() => setTypedChars(c), typeStart + c * 40)
            );
        }

        return () => timers.forEach(clearTimeout);
    }, [isActive, isComplete]);

    const show = isActive || isComplete;
    const allWiped = wipeProgress >= HEX_ROWS.length;

    return (
        <div className="mt-3 flex flex-col gap-1">
            {HEX_ROWS.map((row, i) => {
                const wiped = wipeProgress > i;
                const flashing = flashRow === i;
                return (
                    <div
                        key={i}
                        className={cn(
                            "font-mono text-[11px] tracking-wider transition-all duration-400 rounded px-1 -mx-1",
                            !show && "opacity-0",
                            flashing
                                ? "text-accent-violet bg-accent-violet/15"
                                : wiped
                                    ? "text-accent-violet/40"
                                    : isActive
                                        ? "text-fg-muted/50"
                                        : "text-fg-muted/20"
                        )}
                        style={{
                            transitionDelay: show ? `${i * 80}ms` : "0ms",
                            opacity: show ? 1 : 0,
                        }}
                    >
                        {wiped ? "00 00 00 00 00 00" : row}
                    </div>
                );
            })}

            {/* Final status with typewriter + shield icon */}
            <div
                className={cn(
                    "mt-1 flex items-center gap-2 transition-all duration-500",
                    allWiped && show
                        ? "opacity-100"
                        : "opacity-0"
                )}
            >
                <span className="text-[10px] font-mono tracking-widest text-accent-violet/60">
                    {CLEAN_TEXT.slice(0, typedChars)}
                    {typedChars < CLEAN_TEXT.length && allWiped && show && (
                        <span className="animate-pulse">▌</span>
                    )}
                </span>

                {/* Shield icon - draws in after completion */}
                {typedChars >= CLEAN_TEXT.length && allWiped && show && (
                    <svg
                        viewBox="0 0 16 16"
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="rgba(124,92,255,0.5)"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path
                            d="M8 1L2 4v4c0 3.3 2.6 6.4 6 7 3.4-.6 6-3.7 6-7V4L8 1z"
                            strokeDasharray="40"
                            strokeDashoffset="0"
                            style={{
                                animation: "shieldDraw 0.6s ease-out forwards",
                            }}
                        />
                        <path
                            d="M5.5 8l1.5 1.5 3-3"
                            strokeDasharray="10"
                            strokeDashoffset="0"
                            style={{
                                animation: "shieldDraw 0.4s ease-out 0.3s forwards",
                            }}
                        />
                        <style>{`
                            @keyframes shieldDraw {
                                from { stroke-dashoffset: 40; }
                                to { stroke-dashoffset: 0; }
                            }
                        `}</style>
                    </svg>
                )}
            </div>
        </div>
    );
}
