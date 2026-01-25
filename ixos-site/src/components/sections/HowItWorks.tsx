"use client";

import { useRef, useEffect, useCallback } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScribbleStrike } from "@/components/effects/ScribbleStrike";

// Register ScrollTrigger
if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
}

export function HowItWorks() {
    const containerRef = useRef<HTMLDivElement>(null);

    const activatePipelineNode = useCallback((index: number) => {
        // Logic to light up pipeline nodes (could be state or direct DOM manipulation)
        // For simplicity, we just use DOM classes here or could use another ref array
        const nodes = document.querySelectorAll(".pipeline-node");
        nodes.forEach((node, i) => {
            if (i === index) {
                node.classList.add("ring-2", "ring-accent-teal", "shadow-[0_0_20px_rgba(34,184,168,0.4)]");
                node.classList.remove("opacity-50");
            } else {
                node.classList.remove("ring-2", "ring-accent-teal", "shadow-[0_0_20px_rgba(34,184,168,0.4)]");
                node.classList.add("opacity-50");
            }
        });
    }, []);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Step animations
            const steps = gsap.utils.toArray<HTMLElement>(".how-step");

            steps.forEach((step, i) => {
                gsap.fromTo(step,
                    { opacity: 0.2, y: 20 },
                    {
                        opacity: 1,
                        y: 0,
                        duration: 0.5,
                        scrollTrigger: {
                            trigger: step,
                            start: "top center+=20%", // Trigger slightly before center
                            end: "bottom center",
                            toggleActions: "play reverse play reverse",
                            onEnter: () => activatePipelineNode(i),
                            onEnterBack: () => activatePipelineNode(i),
                        }
                    }
                );
            });

        }, containerRef);

        return () => ctx.revert();
    }, [activatePipelineNode]);

    return (
        <section ref={containerRef} id="how-it-works" className="relative py-32 w-full max-w-6xl mx-auto px-6 section-how">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 relative">

                {/* Sticky Pipeline Diagram (Left) */}
                <div className="hidden lg:block lg:col-span-4 relative">
                    <div className="sticky top-32 space-y-10 p-10 bg-bg-graphite-2 backdrop-blur-sm border border-stroke-hairline rounded-3xl shadow-lift">
                        <h2 className="text-4xl font-semibold mb-10 text-fg-porcelain">How it works</h2>

                        <div className="relative space-y-12 pl-8 border-l-2 border-stroke-hairline">
                            {['Type Naturally', 'On-Demand AI', 'Local Search', 'Auto Cleanup', 'Stream Results'].map((label, i) => (
                                <div key={i} className="pipeline-node relative flex items-center gap-6 p-8 rounded-2xl bg-bg-elevated border border-white/5 transition-all duration-300 opacity-50">
                                    <div className="absolute -left-[60px] w-8 h-8 rounded-full bg-bg-primary border-[5px] border-bg-elevated ring-2 ring-white/10 z-10" />
                                    <span className="font-mono text-xl text-accent-teal">0{i + 1}</span>
                                    <span className="font-bold text-2xl">{label}</span>
                                </div>
                            ))}
                        </div>

                    </div>
                </div>

                {/* Scrolling Steps (Right) */}
                <div className="lg:col-span-8 space-y-32 pt-12 lg:pt-0">

                    <div className="how-step group">
                        <div className="text-accent-teal font-mono mb-4 text-xl">01</div>
                        <h3 className="text-4xl font-semibold mb-4">Type Naturally</h3>
                        <p className="text-xl text-text-secondary leading-relaxed max-w-lg">
                            Type exactly how you think. &quot;That email about the Denver trip&quot; or &quot;quarterly revenue report&quot;. No special syntax needed.
                        </p>
                    </div>

                    <div className="how-step group">
                        <div className="text-accent-teal font-mono mb-4 text-xl">02</div>
                        <h3 className="text-4xl font-semibold mb-4">On-Demand AI</h3>
                        <p className="text-xl text-text-secondary leading-relaxed max-w-lg">
                            Processing happens just-in-time when you search. Nothing stored unless you explicitly enable caching. Zero index tax on your disk.
                        </p>
                    </div>

                    <div className="how-step group">
                        <div className="text-accent-teal font-mono mb-4 text-xl">03</div>
                        <h3 className="text-4xl font-semibold mb-4">100% Local</h3>
                        <p className="text-xl text-text-secondary leading-relaxed max-w-lg">
                            Search happens entirely on your machine. The AI model runs on your CPU/NPU. No cloud, no servers, no data leaves your device.
                        </p>
                    </div>

                    <div className="how-step group">
                        <div className="text-accent-teal font-mono mb-4 text-xl">04</div>
                        <h3 className="text-4xl font-semibold mb-4">
                            <span className="text-text-subtle mr-2">No</span>
                            <ScribbleStrike>INDEX TAX</ScribbleStrike>
                            <span className="text-text-subtle ml-2">Ever</span>
                        </h3>
                        <p className="text-xl text-text-secondary leading-relaxed max-w-lg">
                            Temporary data is automatically cleaned up. Unlike traditional search, we never build a persistent index eating your disk space.
                        </p>
                        <div className="mt-6 p-4 bg-bg-elevated/50 rounded-lg border border-white/5 text-sm font-mono text-text-muted">
                            $ &gt; search_complete<br />
                            $ &gt; memory_cleared<br />
                            $ &gt; persistent_index: 0_bytes
                        </div>
                    </div>

                    <div className="how-step group">
                        <div className="text-accent-teal font-mono mb-4 text-xl">05</div>
                        <h3 className="text-4xl font-semibold mb-4">Stream Results</h3>
                        <p className="text-xl text-text-secondary leading-relaxed max-w-lg">
                            See results as they&apos;re found - no waiting for a full scan. First result in under 200ms. Click to open, Enter to reveal.
                        </p>
                        <div className="mt-8">
                            <div className="h-48 w-full bg-bg-secondary rounded-lg border border-white/5 relative overflow-hidden group-hover:border-accent-teal/20 transition-colors">
                                {/* Abstract representation of results streaming in */}
                                <div className="absolute top-4 left-4 right-4 h-4 bg-white/10 rounded w-3/4 animate-pulse" />
                                <div className="absolute top-12 left-4 right-4 h-4 bg-white/5 rounded w-1/2 delay-100 animate-pulse" />
                                <div className="absolute top-20 left-4 right-4 h-4 bg-white/5 rounded w-2/3 delay-200 animate-pulse" />
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}
