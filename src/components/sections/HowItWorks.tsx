"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";
import { ScribbleStrike } from "@/components/effects/ScribbleStrike";

// Register ScrollTrigger
if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
}

export function HowItWorks() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Step animations
            const steps = gsap.utils.toArray(".how-step");

            steps.forEach((step: any, i) => {
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
    }, []);

    const activatePipelineNode = (index: number) => {
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
    };

    return (
        <section ref={containerRef} id="how-it-works" className="relative py-32 container mx-auto px-6 section-how">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 relative">

                {/* Sticky Pipeline Diagram (Left) */}
                <div className="hidden lg:block lg:col-span-5 relative">
                    <div className="sticky top-32 space-y-8 p-8 bg-bg-graphite-2 backdrop-blur-sm border border-stroke-hairline rounded-2xl shadow-lift">
                        <h2 className="text-3xl font-semibold mb-8 text-fg-porcelain">How it works</h2>

                        <div className="relative space-y-12 pl-8 border-l-2 border-stroke-hairline">
                            {['Query Typed', 'JIT Embeddings', 'Local Search', 'Instant Delete', 'Results Stream'].map((label, i) => (
                                <div key={i} className="pipeline-node relative flex items-center gap-4 p-4 rounded-lg bg-bg-elevated border border-white/5 transition-all duration-300 opacity-50">
                                    <div className="absolute -left-[41px] w-5 h-5 rounded-full bg-bg-primary border-4 border-bg-elevated ring-2 ring-white/10 z-10" />
                                    <span className="font-mono text-sm text-accent-teal">0{i + 1}</span>
                                    <span className="font-medium">{label}</span>
                                </div>
                            ))}
                        </div>

                    </div>
                </div>

                {/* Scrolling Steps (Right) */}
                <div className="lg:col-span-7 space-y-32 pt-12 lg:pt-0">

                    <div className="how-step group">
                        <div className="text-accent-teal font-mono mb-4 text-xl">01</div>
                        <h3 className="text-4xl font-semibold mb-4">Natural Language Search</h3>
                        <p className="text-xl text-text-secondary leading-relaxed max-w-lg">
                            Type exactly how you think. "Files from last week about the merger" or "PDFs with budget tables". No complex syntax required.
                        </p>
                    </div>

                    <div className="how-step group">
                        <div className="text-accent-teal font-mono mb-4 text-xl">02</div>
                        <h3 className="text-4xl font-semibold mb-4">Just-in-Time Intelligence</h3>
                        <p className="text-xl text-text-secondary leading-relaxed max-w-lg">
                            Ixos computes lightweight embeddings on the fly using our optimized micro-models. It runs 100% on your CPU/NPU.
                        </p>
                    </div>

                    <div className="how-step group">
                        <div className="text-accent-teal font-mono mb-4 text-xl">03</div>
                        <h3 className="text-4xl font-semibold mb-4">Ranked Locally</h3>
                        <p className="text-xl text-text-secondary leading-relaxed max-w-lg">
                            Results are ranked by semantic relevance to your intent, not just keyword matching. The most relevant files bubble to the top instantly.
                        </p>
                    </div>

                    <div className="how-step group">
                        <div className="text-accent-teal font-mono mb-4 text-xl">04</div>
                        <h3 className="text-4xl font-semibold mb-4">
                            <span className="text-text-subtle mr-2">No</span>
                            <ScribbleStrike>INDEXING</ScribbleStrike>
                            <span className="text-text-subtle ml-2">Required</span>
                        </h3>
                        <p className="text-xl text-text-secondary leading-relaxed max-w-lg">
                            Once the search is done, the embeddings are discarded. We never build a persistent index of your drive. Your storage stays yours.
                        </p>
                        <div className="mt-6 p-4 bg-bg-elevated/50 rounded-lg border border-white/5 text-sm font-mono text-text-muted">
                            $ &gt; search_complete<br />
                            $ &gt; memory_cleared<br />
                            $ &gt; 0_bytes_stored
                        </div>
                    </div>

                    <div className="how-step group">
                        <div className="text-accent-teal font-mono mb-4 text-xl">05</div>
                        <h3 className="text-4xl font-semibold mb-4">Instant Access</h3>
                        <p className="text-xl text-text-secondary leading-relaxed max-w-lg">
                            Click to open, drag to drop, or hit Enter. It integrates seamlessly with Explorer and Finder.
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
