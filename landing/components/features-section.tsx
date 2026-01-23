"use client";

import { useRef } from "react";
import { GlassCard } from "@/components/glass-card";
import { Zap, Shield, Cpu, Play, Search, Database, Lock } from "lucide-react";
import { FEATURES } from "@/lib/constants";
import { CountUp } from "@/components/count-up";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";

const EXTENDED_FEATURES = [
    ...FEATURES,
    {
        title: "Semantic Understanding",
        description: "Goes beyond keywords. Finds documents based on meaning, concepts, and intent.",
        icon: "search"
    },
    {
        title: "Zero Database Management",
        description: "No PostgreSQL or vector DB to maintain. Everything runs on flat files and mmap.",
        icon: "database"
    },
    {
        title: "Military-Grade Encryption",
        description: "Optional encryption at rest for sensitive indices. Your data is yours alone.",
        icon: "lock"
    }
];

const ICONS = {
    zap: Zap,
    shield: Shield,
    cpu: Cpu,
    search: Search,
    database: Database,
    lock: Lock
};

export function FeaturesSection() {
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        const scrollContainer = scrollContainerRef.current;
        if (!scrollContainer) return;

        const totalWidth = scrollContainer.scrollWidth;
        const viewportWidth = window.innerWidth;
        const xMove = -(totalWidth - viewportWidth + 100); // 100px buffer

        gsap.to(scrollContainer, {
            x: xMove,
            ease: "none",
            scrollTrigger: {
                trigger: containerRef.current,
                pin: true,
                scrub: 1,
                end: () => `+=${totalWidth}`,
                invalidateOnRefresh: true,
            }
        });

    }, { scope: containerRef });

    return (
        <section ref={containerRef} className="relative bg-surface-0 overflow-hidden" id="features">
            {/* Header pinned at top during scroll */}
            <div className="absolute top-12 left-0 right-0 z-20 container mx-auto px-4 text-center pointer-events-none">
                <span className="inline-block py-1 px-3 rounded-full bg-brand-teal/10 border border-brand-teal/20 text-brand-teal text-sm font-medium mb-4 backdrop-blur-md">
                    Why Ixos?
                </span>
                <h2 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                    Built for Speed & Privacy.
                </h2>
            </div>

            <div className="h-screen w-full flex items-center">
                <div ref={scrollContainerRef} className="flex gap-8 px-[10vw] pt-20">
                    {EXTENDED_FEATURES.map((feature, index) => {
                        const Icon = ICONS[feature.icon as keyof typeof ICONS] || Zap;

                        return (
                            <div key={index} className="w-[400px] md:w-[500px] flex-shrink-0 group perspective-1000">
                                <GlassCard
                                    hoverEffect
                                    className={cn(
                                        "h-[60vh] flex flex-col justify-between p-8 border border-white/5 bg-gradient-to-br from-surface-1/80 to-surface-0/80 transition-all duration-500",
                                        "group-hover:translate-y-[-10px] group-hover:rotate-x-[2deg] group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
                                    )}
                                >
                                    <div>
                                        {/* Icon Box */}
                                        <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center text-brand-teal mb-8 group-hover:scale-110 group-hover:bg-brand-teal group-hover:text-white transition-all duration-300 shadow-lg border border-white/5">
                                            <Icon className="w-8 h-8" />
                                        </div>

                                        <h3 className="text-3xl font-display font-bold mb-4 text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-brand transition-colors">
                                            {feature.title}
                                        </h3>
                                        <p className="text-lg text-content-secondary leading-relaxed">
                                            {feature.description}
                                        </p>
                                    </div>

                                    {/* Bottom Visual */}
                                    <div className="mt-8 relative h-32 rounded-xl bg-surface-0/50 border border-white/5 overflow-hidden group-hover:border-brand-teal/30 transition-colors">
                                        <div className="absolute inset-0 bg-gradient-to-tr from-brand-teal/5 to-brand-purple/5 opacity-50" />
                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-teal to-brand-cyan transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left" />

                                        {/* Dynamic content based on index */}
                                        {index === 0 && (
                                            <div className="flex items-center justify-center h-full">
                                                <div className="text-2xl font-mono font-bold text-white">
                                                    <CountUp end={225} suffix=" B" />
                                                </div>
                                                <span className="ml-2 text-xs text-brand-teal">Params</span>
                                            </div>
                                        )}
                                        {index === 1 && (
                                            <div className="flex items-center justify-center h-full gap-4">
                                                <div className="w-2 h-12 bg-green-500 rounded-full animate-pulse" />
                                                <div className="w-2 h-8 bg-green-500/50 rounded-full" />
                                                <div className="w-2 h-16 bg-green-500 rounded-full animate-pulse delay-75" />
                                            </div>
                                        )}
                                    </div>
                                </GlassCard>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
