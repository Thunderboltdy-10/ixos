"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export function RipplePulse() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Create rings
        const ctx = gsap.context(() => {
            const rings = gsap.utils.toArray(".ripple-ring");

            gsap.fromTo(rings,
                { scale: 0, opacity: 0.8 },
                {
                    scale: 4, // Expand outward
                    opacity: 0,
                    duration: 2,
                    stagger: 0.4,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: ".hero-story",
                        start: "40% top",
                        toggleActions: "play none none none" // Play once
                    }
                }
            );
        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <div ref={containerRef} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 pointer-events-none z-0">
            <div className="ripple-ring absolute inset-0 -m-[50px] w-[100px] h-[100px] rounded-full border border-accent-teal/30 bg-accent-teal/5" />
            <div className="ripple-ring absolute inset-0 -m-[50px] w-[100px] h-[100px] rounded-full border border-accent-teal/20" />
            <div className="ripple-ring absolute inset-0 -m-[50px] w-[100px] h-[100px] rounded-full border border-accent-teal/10" />
        </div>
    );
}
