"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface FadeInViewProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    direction?: "up" | "down" | "left" | "right" | "none";
    duration?: number;
    once?: boolean;
    threshold?: number;
}

export function FadeInView({
    children,
    className,
    delay = 0,
    direction = "up",
    duration = 600,
    once = true,
    threshold = 0.2
}: FadeInViewProps) {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const hasAnimated = useRef(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    if (once && hasAnimated.current) return;

                    setIsVisible(true);
                    if (once) {
                        hasAnimated.current = true;
                        observer.disconnect();
                    }
                } else if (!once) {
                    setIsVisible(false);
                }
            },
            { threshold }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => observer.disconnect();
    }, [once, threshold]);

    const getTransform = () => {
        if (!isVisible) {
            switch (direction) {
                case "up": return "translateY(20px)";
                case "down": return "translateY(-20px)";
                case "left": return "translateX(20px)";
                case "right": return "translateX(-20px)";
                default: return "none";
            }
        }
        return "none";
    };

    return (
        <div
            ref={ref}
            className={cn("transition-all ease-out will-change-[opacity,transform]", className)}
            style={{
                opacity: isVisible ? 1 : 0,
                transform: getTransform(),
                transitionDuration: `${duration}ms`,
                transitionDelay: `${delay}ms`
            }}
        >
            {children}
        </div>
    );
}
