"use client";

import { useRef } from "react";
import { CodeSnippet } from "@/components/code-snippet";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";

const STEPS = [
    {
        title: "Type Your Query",
        description: "Use natural language. No need to remember exact filenames or keywords.",
        code: "$ ixos search \"quarterly report from march\"",
    },
    {
        title: "Lexical Funnel",
        description: "Ripgrep filters 30,000 files down to ~800 candidates in under 50ms.",
        code: "[DEBUG] Lexical filter: 842 candidates in 48ms",
    },
    {
        title: "Ixos-Flash-v2 Ranking",
        description: "Model2Vec embeddings rank candidates by semantic similarity. 181ms P50.",
        code: "[DEBUG] Flash ranking: 181ms (512-dim f16)",
    },
    {
        title: "Auto Refine (if needed)",
        description: "For ambiguous queries, fusion weights (0.33 semantic / 0.67 lexical) refine results.",
        code: "[DEBUG] Auto refine triggered: gap < 0.05",
    },
    {
        title: "Evidence + Results",
        description: "Results show matched passages, score breakdowns, and relevance explanations.",
        code: "[SUCCESS] 12 matches. Top: budget_q1.xlsx (0.89)",
    },
];

export function HowItWorks() {
    const containerRef = useRef<HTMLDivElement>(null);
    const lineRef = useRef<SVGPathElement>(null);
    const stepsRef = useRef<(HTMLDivElement | null)[]>([]);

    useGSAP(() => {
        const line = lineRef.current;
        if (!line) return;

        // Draw the line as we scroll
        gsap.fromTo(line,
            { strokeDasharray: 1, strokeDashoffset: 1 },
            {
                strokeDashoffset: 0,
                ease: "none",
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: "top center",
                    end: "bottom center",
                    scrub: 1,
                }
            }
        );

        // Animate steps coming in
        stepsRef.current.forEach((step, index) => {
            if (!step) return;

            gsap.fromTo(step,
                { opacity: 0, x: index % 2 === 0 ? -50 : 50 },
                {
                    opacity: 1,
                    x: 0,
                    duration: 0.8,
                    scrollTrigger: {
                        trigger: step,
                        start: "top 80%",
                        toggleActions: "play none none reverse",
                    }
                }
            );
        });

    }, { scope: containerRef });

    return (
        <section ref={containerRef} className="py-32 relative bg-surface-0 overflow-hidden" id="how-it-works">
            <div className="container mx-auto px-4 relative z-10">
                <div className="mb-24 text-center">
                    <h2 className="text-3xl md:text-5xl font-bold mb-6 font-display">How It Works</h2>
                    <p className="text-content-secondary max-w-2xl mx-auto text-lg">
                        The Hybrid Cascade architecture explained. Instant results through intelligent pipelining.
                    </p>
                </div>

                <div className="max-w-5xl mx-auto relative">
                    {/* SVG Line Background */}
                    <div className="absolute left-[20px] md:left-1/2 top-0 bottom-0 w-1 md:-ml-0.5 z-0 transform md:-translate-x-1/2">
                        <svg className="h-full w-full overflow-visible" preserveAspectRatio="none">
                            <path
                                ref={lineRef}
                                d="M 0 0 V 3000" // Simple vertical line, purely for scroll progress
                                pathLength="1"
                                className="stroke-brand-teal"
                                strokeWidth="2"
                                fill="none"
                                vectorEffect="non-scaling-stroke"
                            />
                        </svg>
                        {/* Static background line */}
                        <div className="absolute inset-0 bg-white/5 w-[1px] mx-auto" />
                    </div>

                    {STEPS.map((step, index) => (
                        <div
                            key={index}
                            ref={el => { stepsRef.current[index] = el }}
                            className={`relative mb-24 last:mb-0 md:grid md:grid-cols-2 md:gap-16 items-center ${index % 2 === 0 ? "md:text-right" : "md:flex-row-reverse"
                                }`}
                        >
                            {/* Timeline Dot */}
                            <div className="absolute left-[20px] md:left-1/2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-surface-0 border-2 border-brand-teal z-10 md:-translate-x-1/2 shadow-[0_0_15px_rgba(13,148,136,0.6)]" />

                            {/* Content Side */}
                            <div className={`pl-16 md:pl-0 ${index % 2 === 0 ? "md:order-1" : "md:order-2"}`}>
                                <h3 className="text-2xl font-bold text-white mb-3 font-display">{step.title}</h3>
                                <p className="text-content-secondary text-lg leading-relaxed">{step.description}</p>
                            </div>

                            {/* Code Side */}
                            <div className={`pl-16 mt-6 md:mt-0 md:pl-0 ${index % 2 === 0 ? "md:order-2 md:text-left" : "md:order-1 md:text-right"}`}>
                                <div className={cn(
                                    "relative transition-all duration-500 hover:scale-[1.02]",
                                    index % 2 === 0 ? "md:-ml-8" : "md:-mr-8"
                                )}>
                                    <div className="absolute -inset-1 bg-brand-teal/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <CodeSnippet code={step.code} className="shadow-2xl border-brand-teal/20" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
