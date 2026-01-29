"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ScribbleStrike } from "@/components/effects/ScribbleStrike";
import { cn } from "@/lib/utils";
import { IxosDemoWindow } from "@/components/hero/IxosDemoWindow";

// Register ScrollTrigger
if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
}

const PIPELINE_STEPS = [
    {
        id: "01",
        code: "[Q]",
        label: "INPUT_LAYER",
        title: "Natural Language Search",
        description: "Type exactly how you think. \"Files about the merger\" or \"PDFs with budget tables\". No query syntax.",
    },
    {
        id: "02",
        code: "[M]",
        label: "EMBEDDING_ENGINE",
        title: "Just-in-Time Intelligence",
        description: "Ixos computes lightweight embeddings on the fly using CPU-optimized micro-models.",
    },
    {
        id: "03",
        code: "[S]",
        label: "SEMANTIC_RANK",
        title: "Ranked Locally",
        description: "Results are ranked by semantic intent, not just keyword matching. Relevant docs bubble to top.",
    },
    {
        id: "04",
        code: "[X]",
        label: "PRIVACY_GUARD",
        title: "No Indexing Required",
        isScribble: true,
        description: "Embeddings are discarded immediately after search. We never build a persistent index of your drive.",
    },
    {
        id: "05",
        code: "[R]",
        label: "IO_STREAM",
        title: "Instant Access",
        description: "Click to open, drag to drop. Integrates seamlessly with Explorer, Finder, and terminal.",
    },
];

export function HeroJourney() {
    const containerRef = useRef<HTMLDivElement>(null);
    const heroContentRef = useRef<HTMLDivElement>(null);
    const deckRef = useRef<HTMLDivElement>(null);
    const deckFrontRef = useRef<HTMLDivElement>(null);
    const deckBackRef = useRef<HTMLDivElement>(null);
    const stepsContainerRef = useRef<HTMLDivElement>(null);
    const [activeStep, setActiveStep] = useState(0);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
        if (typeof window === "undefined") return false;
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    });

    useEffect(() => {
        if (typeof window === "undefined") return;
        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    useEffect(() => {
        if (!containerRef.current || prefersReducedMotion) return;

        ScrollTrigger.refresh();
        const ctx = gsap.context(() => {
            const deck = deckRef.current;
            const heroContent = heroContentRef.current;
            const stepsContainer = stepsContainerRef.current;

            if (!deck || !heroContent || !stepsContainer) return;

            const masterTL = gsap.timeline({
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: "top top",
                    end: "+=350%",
                    scrub: 1,
                    pin: true,
                    pinSpacing: true,
                    anticipatePin: 1,
                    onUpdate: (self) => {
                        // Step Calculation
                        // Map progress 0.35 -> 0.95 to steps 0 -> 4
                        // Extended range ensures 01 is visible early and 05 stays visible
                        if (self.progress > 0.30) {
                            const stepProgress = (self.progress - 0.30) / 0.65;
                            const step = Math.min(4, Math.max(0, Math.floor(stepProgress * 5)));
                            setActiveStep(step);
                        }
                    },
                },
            });

            // 1. Hero Content Exit & Deck Movement (0-20%)
            masterTL.to(heroContent, { opacity: 0, y: -40, duration: 0.2, ease: "power2.inOut" }, 0);
            // Reduced scale for smaller screens to ensure it fits
            masterTL.to(deck, { x: "0%", y: "0%", scale: window.innerWidth < 1024 ? 0.8 : 0.85, duration: 0.2, ease: "power2.inOut" }, 0);

            // 2. Deck Flip (25-30%)
            masterTL.to(deck, { rotateX: 180, duration: 0.1, ease: "power3.inOut" }, 0.25);

            // 3. Deck Expansion (30-35%)
            // Expand strictly to 70vh (60vh on small screens) to fit laptop screens without overflow
            masterTL.to(deck, { height: window.innerWidth < 768 ? "45vh" : "50vh", duration: 0.1, ease: "power2.out" }, 0.30);

            // 4. Reveal Steps (30-35%)
            masterTL.fromTo(stepsContainer,
                { opacity: 0, x: -20 },
                { opacity: 1, x: 0, duration: 0.1, ease: "power2.out" },
                0.30
            );

            // 5. Keep alive until end
            masterTL.to(stepsContainer, { opacity: 1, duration: 0.5 }, 0.4); // Filler to hold state

        }, containerRef);

        return () => ctx.revert();
    }, [prefersReducedMotion]);

    return (
        <section ref={containerRef} id="hero-journey" className="section-hero relative min-h-screen w-full overflow-hidden bg-bg-graphite-0">
            <div className="relative min-h-screen w-full pt-24 lg:pt-32 px-6">
                <div className="container mx-auto h-full">

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start h-full">

                        {/* LEFT: Hero Content / Steps */}
                        <div className="lg:col-span-5 relative min-h-[50vh] lg:min-h-[80vh] flex flex-col justify-center">

                            {/* --- CONTENT A: HERO --- */}
                            <div ref={heroContentRef} className="space-y-8 relative z-20">
                                <div
                                    data-trace-anchor="hero-badge"
                                    data-trace-color="amber"
                                    className="inline-flex items-center gap-3 px-3 py-1.5 rounded-sm bg-white/5 border border-white/10 backdrop-blur-sm"
                                >
                                    <div className="w-1.5 h-1.5 bg-accent-amber rounded-sm animate-pulse" />
                                    <span className="text-[10px] font-mono text-fg-muted tracking-widest uppercase opacity-80">
                                        v1.0 Available
                                    </span>
                                </div>
                                <h1 className="text-5xl md:text-6xl lg:text-7xl font-sans font-semibold tracking-tight leading-[1.05] text-fg-porcelain">
                                    Find anything<br />
                                    <span className="text-fg-muted">on your computer.</span>
                                </h1>
                                <p className="text-lg text-bg-muted max-w-md leading-relaxed text-fg-muted/80">
                                    Ixos uses local-first semantic search to index and retrieve your files. Private, secure, and lightning fast.
                                </p>
                                <div className="flex flex-wrap gap-4 pt-4">
                                    <Button
                                        size="lg"
                                        hasParticleMagnet
                                        className="bg-accent-amber text-bg-graphite-0 hover:bg-accent-amber/90 font-medium min-w-[160px]"
                                        data-trace-anchor="hero-cta"
                                        data-trace-color="amber"
                                        asChild
                                    >
                                        <Link href="/download">Download</Link>
                                    </Button>
                                    <Button variant="secondary" size="lg" className="border-white/10 hover:bg-white/5">
                                        Watch Demo
                                    </Button>
                                </div>
                            </div>

                            {/* --- CONTENT B: STEPS (Revealed on Scroll) --- */}
                            <div ref={stepsContainerRef} className="absolute inset-x-0 top-0 lg:top-auto opacity-0 pointer-events-none space-y-1 lg:space-y-2">
                                <h2 className="text-3xl md:text-4xl font-semibold text-fg-porcelain mb-4 lg:mb-8 pl-4">How it works</h2>

                                <div className="space-y-4">
                                    {PIPELINE_STEPS.map((item, i) => (
                                        <div
                                            key={i}
                                            className={cn(
                                                "relative pl-6 py-2 lg:py-3 border-l-2 transition-all duration-300",
                                                activeStep === i
                                                    ? "border-accent-teal opacity-100 translate-x-2"
                                                    : "border-white/5 opacity-30"
                                            )}
                                        >
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={cn(
                                                    "font-mono text-xs tracking-widest",
                                                    activeStep === i ? "text-accent-teal" : "text-fg-muted"
                                                )}>{item.label}</span>
                                                <span className="font-mono text-[10px] text-white/20">{item.code}</span>
                                            </div>
                                            <h3 className="text-base lg:text-lg font-medium text-fg-porcelain mb-1">
                                                {item.isScribble ? (
                                                    <span className="flex items-center gap-2">
                                                        No <ScribbleStrike>Indexing</ScribbleStrike> Required
                                                    </span>
                                                ) : item.title}
                                            </h3>
                                            <p className="text-xs lg:text-sm text-fg-muted leading-relaxed max-w-sm hidden md:block">
                                                {item.description}
                                            </p>
                                            <p className="text-xs text-fg-muted leading-relaxed max-w-sm md:hidden block line-clamp-2">
                                                {item.description}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Deck / Pipeline */}
                        <div className="lg:col-span-7 relative h-[60vh] lg:h-screen flex items-center justify-center perspective-[2000px] sticky top-0">
                            <div
                                ref={deckRef}
                                data-trace-anchor="hero-deck"
                                data-trace-color="teal"
                                className="relative w-full max-w-3xl bg-bg-graphite-1 rounded-sm border border-white/10 shadow-2xl transition-all duration-500 ease-out"
                                style={{ transformStyle: "preserve-3d", aspectRatio: "16/10" }}
                            >
                                {/* FRONT: INTERACTIVE MOCKUP */}
                                <div
                                    ref={deckFrontRef}
                                    className="absolute inset-0 bg-bg-graphite-0 rounded-sm overflow-hidden z-20"
                                    style={{ backfaceVisibility: "hidden", transform: "rotateX(0deg)" }}
                                >
                                    <div className="h-6 border-b border-white/10 flex items-center px-4 gap-2 bg-white/5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                                        <span className="ml-auto text-[10px] font-mono text-white/30">IXOS_DEMO_LIVE</span>
                                    </div>
                                    <div className="w-full h-[calc(100%-1.5rem)]">
                                        <IxosDemoWindow />
                                    </div>
                                </div>

                                {/* BACK: TECHNICAL PIPELINE */}
                                <div
                                    ref={deckBackRef}
                                    className="absolute inset-0 bg-bg-graphite-1/90 backdrop-blur-md rounded-sm border border-white/5 overflow-hidden flex flex-col z-10"
                                    style={{ transform: "rotateX(180deg)", backfaceVisibility: "hidden" }}
                                >
                                    <TechnicalPipelinePanel activeStep={activeStep} />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </section >
    );
}

// Compact Technical Pipeline Panel matches Benchmarks.tsx aesthetic
function TechnicalPipelinePanel({ activeStep }: { activeStep: number }) {
    return (
        <div className="flex flex-col h-full w-full">
            {/* Header */}
            <div className="h-8 border-b border-white/10 flex items-center justify-between px-4 bg-white/5">
                <span className="text-[10px] font-mono text-accent-teal tracking-widest">REALTIME_PIPELINE</span>
                <div className="flex gap-1">
                    {[0, 1, 2].map(i => <div key={i} className="w-1 h-1 bg-white/20 rounded-full" />)}
                </div>
            </div>

            {/* Content Area - Vertical Flow */}
            <div className="flex-1 p-8 flex flex-col justify-center relative">
                {/* Background Grid */}
                <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)', backgroundSize: '24px 24px' }}
                />

                <div className="relative z-10 space-y-6 max-w-sm mx-auto w-full">
                    {PIPELINE_STEPS.map((step, i) => (
                        <div key={i} className="group flex items-center gap-5">
                            {/* Mono Code Box */}
                            <div className={cn(
                                "w-14 h-14 flex-shrink-0 flex items-center justify-center border text-base font-mono transition-all duration-300",
                                activeStep === i
                                    ? "border-accent-teal bg-accent-teal/10 text-accent-teal shadow-[0_0_15px_rgba(20,184,166,0.2)]"
                                    : activeStep > i
                                        ? "border-white/20 bg-white/5 text-fg-muted"
                                        : "border-white/5 text-white/10"
                            )}>
                                {step.code}
                            </div>

                            {/* Connection Line segment (except last) */}
                            {i < PIPELINE_STEPS.length - 1 && (
                                <div className={cn(
                                    "absolute left-7 w-px h-10 bg-white/10 -bottom-10 transition-colors duration-500 delay-100",
                                    activeStep > i ? "bg-accent-teal/50" : ""
                                )} />
                            )}

                            {/* Label & Progress */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center text-base font-mono mb-2">
                                    <span className={cn(
                                        "transition-colors duration-300 truncate mr-2",
                                        activeStep === i ? "text-fg-porcelain" : "text-fg-muted/60"
                                    )}>{step.label}</span>
                                    <span className={cn(
                                        "text-xs flex-shrink-0",
                                        activeStep === i ? "text-accent-teal animate-pulse" : "text-white/10"
                                    )}>
                                        {activeStep === i ? "[PROCESSING]" : activeStep > i ? "[COMPLETE]" : "[WAITING]"}
                                    </span>
                                </div>
                                {/* Bar */}
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className={cn(
                                        "h-full bg-accent-teal transition-all duration-500 ease-out",
                                        activeStep > i ? "w-full" : activeStep === i ? "w-2/3" : "w-0"
                                    )} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer Stats */}
            <div className="h-8 border-t border-white/10 flex items-center justify-between px-4 text-[10px] font-mono text-fg-muted bg-bg-graphite-2/50">
                <div className="flex gap-4">
                    <span>LATENCY: <span className="text-fg-porcelain">~12ms</span></span>
                    <span>MEMORY: <span className="text-fg-porcelain">FLUSHED</span></span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-teal animate-pulse" />
                    <span className="text-accent-teal">SYSTEM_ONLINE</span>
                </div>
            </div>

            {/* Corner Accents */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/20" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/20" />
        </div>
    );
}
