"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface SectionDividerProps {
    className?: string;
    label?: string;
    accent?: "amber" | "teal" | "violet" | "magenta";
}

export function SectionDivider({ className, label = "SECTION_BREAK", accent = "amber" }: SectionDividerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.5 }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    const accentColor = {
        amber: "text-accent-amber border-accent-amber bg-accent-amber",
        teal: "text-accent-teal border-accent-teal bg-accent-teal",
        violet: "text-accent-violet border-accent-violet bg-accent-violet",
        magenta: "text-accent-magenta border-accent-magenta bg-accent-magenta",
    }[accent];
    const normalizedLabel = label.toUpperCase();

    return (
        <div
            ref={containerRef}
            className={cn("relative h-24 w-full flex items-center justify-center overflow-hidden py-8", className)}
        >
            {/* Center Line Container */}
            <div className="absolute inset-x-0 h-px bg-white/5">
                {/* Animated Trace Line */}
                <div
                    className={cn(
                        "absolute top-0 left-0 h-full w-[20%] opacity-50 blur-[2px] transition-all duration-1000 ease-linear",
                        accentColor.split(" ")[2] // bg-accent
                    )}
                    style={{
                        transform: isVisible ? "translateX(400%)" : "translateX(-100%)",
                        opacity: isVisible ? 0 : 1, // Fade out as it zips by? Or just zip across
                        transitionDuration: "1.5s"
                    }}
                />
            </div>

            {/* Label Badge */}
            <div className="relative z-10 px-4 py-1 bg-[#050507] border border-white/10 rounded-full flex items-center gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full", accentColor.split(" ")[2])} />
                <span className={cn("text-[10px] font-mono tracking-widest opacity-70", accentColor.split(" ")[0])}>
                    {`// ${normalizedLabel}`}
                </span>
                <div className={cn("w-1.5 h-1.5 rounded-full", accentColor.split(" ")[2])} />
            </div>

            {/* Vertical Tick */}
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/5 -translate-x-1/2" />
        </div>
    );
}
