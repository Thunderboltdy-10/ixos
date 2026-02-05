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
        label: "Input Layer",
        title: "Natural Language Search",
        description: "Type exactly how you think. \"Files about the merger\" or \"PDFs with budget tables\". No query syntax.",
    },
    {
        id: "02",
        code: "[M]",
        label: "Embedding Engine",
        title: "Just-in-Time Intelligence",
        description: "Ixos computes lightweight embeddings on the fly using CPU-optimized micro-models.",
    },
    {
        id: "03",
        code: "[S]",
        label: "Semantic Rank",
        title: "Ranked Locally",
        description: "Results are ranked by semantic intent, not just keyword matching. Relevant docs bubble to top.",
    },
    {
        id: "04",
        code: "[X]",
        label: "Privacy Guard",
        title: "No Indexing Required",
        isScribble: true,
        description: "Embeddings are discarded immediately after search. We never build a persistent index of your drive.",
    },
    {
        id: "05",
        code: "[R]",
        label: "IO Stream",
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
                                        <Link href="/sign-up">Get Started</Link>
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

/** Grid placement per tile for the asymmetric layout */
const TILE_GRID: Record<number, { col: string; row: string; offset?: string }> = {
    0: { col: "col-span-7", row: "row-span-2" },
    1: { col: "col-span-5", row: "row-span-1", offset: "mt-2" },
    2: { col: "col-span-5", row: "row-span-2" },
    3: { col: "col-span-3", row: "row-span-1", offset: "mt-1" },
    4: { col: "col-span-4", row: "row-span-1" },
};

function TechnicalPipelinePanel({ activeStep }: { activeStep: number }) {
    const boundedStep = Math.max(0, Math.min(activeStep, PIPELINE_STEPS.length - 1));
    const active = PIPELINE_STEPS[boundedStep];

    return (
        <div className="relative flex h-full w-full flex-col overflow-hidden">
            {/* Header bar */}
            <div className="flex h-9 items-center justify-between border-b border-white/10 bg-white/5 px-4">
                <div className="flex items-center gap-2">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-teal animate-pulse" />
                    <span className="text-[10px] font-mono text-accent-teal tracking-wide">Realtime pipeline</span>
                </div>
                <span className="text-[10px] font-mono text-fg-muted">{active.id}/05 active</span>
            </div>

            {/* Grid area */}
            <div className="relative flex-1 overflow-hidden p-4 md:p-6">
                {/* Dot-grid background */}
                <div
                    className="absolute inset-0 opacity-10"
                    style={{
                        backgroundImage:
                            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.22) 1px, transparent 0)",
                        backgroundSize: "22px 22px",
                    }}
                />
                {/* Ambient glows */}
                <div className="pointer-events-none absolute -right-20 top-10 h-52 w-52 rounded-full bg-accent-teal/10 blur-3xl" />
                <div className="pointer-events-none absolute -left-14 bottom-8 h-44 w-44 rounded-full bg-accent-amber/10 blur-3xl" />

                {/* 12-column asymmetric grid */}
                <div className="relative z-10 grid h-full grid-cols-12 grid-rows-[1fr_1fr] gap-2.5">
                    {PIPELINE_STEPS.map((step, index) => {
                        const state = index < boundedStep ? "complete" : index === boundedStep ? "processing" : "queued";
                        const progressClass = index < boundedStep ? "w-full" : index === boundedStep ? "w-2/3" : "w-0";
                        const grid = TILE_GRID[index];
                        const isActive = state === "processing";

                        return (
                            <article
                                key={step.id}
                                className={cn(
                                    "relative rounded-sm border bg-bg-graphite-2/55 p-3 md:p-4 transition-all duration-300 flex flex-col",
                                    grid.col,
                                    grid.row,
                                    grid.offset,
                                    isActive
                                        ? "border-accent-teal/45 shadow-[0_0_24px_rgba(20,184,166,0.18)]"
                                        : state === "complete"
                                            ? "border-white/15"
                                            : "border-white/5 opacity-70"
                                )}
                                style={isActive ? { background: "linear-gradient(135deg, rgba(20,184,166,0.08) 0%, transparent 50%)" } : undefined}
                            >
                                {/* Corner accent marks on active tile */}
                                {isActive && (
                                    <>
                                        <div className="absolute left-0 top-0 h-2.5 w-2.5 border-l border-t border-accent-teal/50" />
                                        <div className="absolute bottom-0 right-0 h-2.5 w-2.5 border-b border-r border-accent-teal/50" />
                                    </>
                                )}

                                {/* Accent label */}
                                <span className={cn(
                                    "text-[10px] font-mono tracking-widest uppercase mb-1",
                                    isActive ? "text-accent-teal" : "text-fg-muted/60"
                                )}>
                                    //{step.label}
                                </span>

                                {/* Title */}
                                <h4 className="text-sm md:text-base font-semibold text-fg-porcelain leading-tight">{step.title}</h4>

                                {/* Description (visible on larger tiles or when active) */}
                                <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-fg-muted flex-1">{step.description}</p>

                                {/* Progress bar */}
                                <div className="mt-auto pt-3">
                                    <div className="h-1 overflow-hidden rounded-full bg-white/5">
                                        <div
                                            className={cn("h-full bg-accent-teal transition-all duration-500 ease-out", progressClass)}
                                        />
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>

            {/* Footer bar */}
            <div className="flex h-10 items-center justify-between border-t border-white/10 bg-bg-graphite-2/60 px-4 text-[10px] font-mono text-fg-muted">
                <div className="truncate">
                    Active: <span className="text-fg-porcelain">{active.title}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span>Latency ~12ms</span>
                    <span className="h-1 w-1 rounded-full bg-accent-teal" />
                    <span>No persistent index</span>
                </div>
            </div>

            {/* Global corner marks */}
            <div className="absolute left-0 top-0 h-2 w-2 border-l border-t border-white/20" />
            <div className="absolute bottom-0 right-0 h-2 w-2 border-b border-r border-white/20" />
        </div>
    );
}
