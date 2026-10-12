"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ScribbleStrikeProps {
    children: React.ReactNode;
    className?: string;
}

export function ScribbleStrike({ children, className }: ScribbleStrikeProps) {
    const [isActive, setIsActive] = useState(false);
    const elementRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setTimeout(() => setIsActive(true), 200);
                        observer.disconnect();
                    }
                });
            },
            { threshold: 0.5 }
        );

        if (elementRef.current) {
            observer.observe(elementRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <span
            ref={elementRef}
            className={cn("relative inline-block", className)}
        >
            {/* Original text */}
            <span className="relative z-10">{children}</span>

            {/* Scribble overlay - MUCH LARGER to cover the text */}
            <span
                className={cn(
                    "absolute z-20 pointer-events-none",
                    "transition-all duration-700 ease-out"
                )}
                style={{
                    // Much larger bounds to ensure scribble covers text
                    top: "-60%",
                    left: "-30%",
                    right: "-30%",
                    bottom: "-60%",
                    // Background image
                    backgroundImage: "url('/assets/scribble.png')",
                    backgroundSize: "100% 100%",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    // Animated clip path for left-to-right reveal
                    clipPath: isActive ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
                    // Visible when active
                    opacity: isActive ? 1 : 0,
                    // Transform for slight jitter effect
                    transform: isActive ? "translateX(0) rotate(-2deg)" : "translateX(-10px)",
                }}
                aria-hidden="true"
            />

            {/* Amber underline strike as enhancement */}
            <span
                className={cn(
                    "absolute left-0 right-0 h-[4px] bg-accent-amber",
                    "top-1/2 -translate-y-1/2",
                    "transition-all duration-500 ease-out delay-400",
                    isActive ? "opacity-70 scale-x-100" : "opacity-0 scale-x-0"
                )}
                style={{
                    transformOrigin: "left center",
                }}
                aria-hidden="true"
            />
        </span>
    );
}
