"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui/Button";
import { ScribbleStrike } from "@/components/effects/ScribbleStrike";

// Register ScrollTrigger
if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
}

const PIPELINE_STEPS = [
    {
        step: "01",
        title: "Natural Language Search",
        description: "Type exactly how you think. \"Files from last week about the merger\" or \"PDFs with budget tables\". No complex syntax required.",
    },
    {
        step: "02",
        title: "Just-in-Time Intelligence",
        description: "Ixos computes lightweight embeddings on the fly using our optimized micro-models. It runs 100% on your CPU/NPU.",
    },
    {
        step: "03",
        title: "Ranked Locally",
        description: "Results are ranked by semantic relevance to your intent, not just keyword matching. The most relevant files bubble to the top instantly.",
    },
    {
        step: "04",
        title: "No Indexing Required",
        isScribble: true,
        description: "Once the search is done, the embeddings are discarded. We never build a persistent index of your drive. Your storage stays yours.",
    },
    {
        step: "05",
        title: "Instant Access",
        description: "Click to open, drag to drop, or hit Enter. It integrates seamlessly with Explorer and Finder.",
    },
];

export function HeroJourney() {
    const containerRef = useRef<HTMLDivElement>(null);
    const heroContentRef = useRef<HTMLDivElement>(null);
    const deckRef = useRef<HTMLDivElement>(null);
    const deckFrontRef = useRef<HTMLDivElement>(null);
    const deckBackRef = useRef<HTMLDivElement>(null);
    const stepsContainerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoReady, setVideoReady] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    const [showPipeline, setShowPipeline] = useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        setPrefersReducedMotion(mediaQuery.matches);

        const handleChange = (e: MediaQueryListEvent) => {
            setPrefersReducedMotion(e.matches);
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    useEffect(() => {
        if (!containerRef.current || prefersReducedMotion) return;

        // Force a refresh to ensure pin spacing is calculated
        ScrollTrigger.refresh();

        const ctx = gsap.context(() => {
            const deck = deckRef.current;
            const heroContent = heroContentRef.current;
            const stepsContainer = stepsContainerRef.current;

            if (!deck || !heroContent || !stepsContainer) return;

            // Master timeline for the entire journey
            const masterTL = gsap.timeline({
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: "top top",
                    end: "+=350%", // Extended for better spacing and to prevent overlap
                    scrub: 1.5,
                    pin: true,
                    pinSpacing: true, // Explicitly enforce spacing
                    anticipatePin: 1,
                    onUpdate: (self) => {
                        // Play video when scroll starts
                        if (self.progress > 0.02 && videoRef.current?.paused) {
                            videoRef.current?.play();
                        }

                        // Show pipeline after flip
                        setShowPipeline(self.progress > 0.35);

                        // Calculate active step - spread out more evenly
                        if (self.progress > 0.35) {
                            const stepProgress = (self.progress - 0.35) / 0.65;
                            const step = Math.min(4, Math.floor(stepProgress * 5));
                            setActiveStep(step);
                        }
                    },
                },
            });

            // Phase 1: Hero content fades as deck moves (0-25%)
            masterTL.to(heroContent, {
                opacity: 0,
                y: -50,
                duration: 0.25,
                ease: "power2.inOut",
            }, 0);

            // Phase 1: Deck moves to right side position (0-25%)
            masterTL.to(deck, {
                x: "10%",
                y: "10%",
                scale: 0.85,
                duration: 0.25,
                ease: "power2.inOut",
            }, 0);

            // Phase 2: Deck flips (25-35%)
            masterTL.to(deck, {
                rotateX: 180,
                duration: 0.1,
                ease: "power3.inOut",
            }, 0.25);

            // Phase 3: Steps container fades in (35-45%)
            masterTL.fromTo(stepsContainer,
                { opacity: 0, x: -30 },
                { opacity: 1, x: 0, duration: 0.1, ease: "power2.out" },
                0.35);

            // Phase 4: Steps scroll through (45-100%)
            const stepElements = stepsContainer.querySelectorAll(".journey-step");
            stepElements.forEach((step, i) => {
                // Stagger steps more widely
                const startProgress = 0.4 + (i * 0.12);
                masterTL.fromTo(step,
                    { opacity: 0.3, y: 30 },
                    { opacity: 1, y: 0, duration: 0.08, ease: "power2.out" },
                    startProgress);

                // Fade out previous step
                if (i > 0) {
                    masterTL.to(stepElements[i - 1],
                        { opacity: 0.3, duration: 0.05 },
                        startProgress);
                }
            });

        }, containerRef);

        return () => ctx.revert();
    }, [prefersReducedMotion]);

    const handleVideoCanPlay = () => {
        setVideoReady(true);
    };

    const handleDownload = () => {
        window.open("/download", "_blank");
    };

    return (
        <section
            ref={containerRef}
            id="hero-journey"
            className="section-hero relative min-h-screen w-full overflow-hidden"
        >
            <div className="relative min-h-screen w-full pt-32 pb-16">
                <div className="container mx-auto px-6 relative z-10">

                    {/* Grid: Left = Hero Content / Steps, Right = Deck/Pipeline */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start min-h-[85vh]">

                        {/* Left Column: Hero Content (fades to Steps) */}
                        <div className="lg:col-span-5 relative">
                            {/* Hero Content - visible initially */}
                            <div
                                ref={heroContentRef}
                                className="space-y-6"
                            >
                                {/* Availability badge */}
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-graphite-2/80 border border-stroke-hairline backdrop-blur-sm">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-amber opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-amber"></span>
                                    </span>
                                    <span className="text-xs font-medium text-fg-muted tracking-wider uppercase">
                                        v1.0 Now Available
                                    </span>
                                </div>

                                {/* Headline - Fancy display font */}
                                <h1 className="text-5xl md:text-6xl lg:text-7xl font-medium tracking-tight leading-[1.05]">
                                    <span className="heading-gradient-amber">Find anything</span>
                                    <br />
                                    <span className="text-fg-porcelain">on your computer.</span>
                                </h1>

                                {/* Subhead */}
                                <p className="text-lg text-fg-muted max-w-md leading-relaxed">
                                    Ixos uses local-first semantic search to find files the way you
                                    think about them. Private, secure, and lightning fast.
                                </p>

                                {/* CTAs */}
                                <div className="flex flex-wrap gap-4 pt-2">
                                    <Button
                                        size="lg"
                                        hasParticleMagnet
                                        className="min-w-[180px] bg-accent-amber hover:bg-accent-amber/90 text-black shadow-glow-amber"
                                        onClick={handleDownload}
                                    >
                                        Download for Windows
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="lg"
                                        className="border-accent-amber/30 hover:bg-accent-amber/10"
                                    >
                                        Watch Demo
                                    </Button>
                                </div>

                                {/* System requirements */}
                                <div className="pt-4 text-xs text-text-subtle font-mono">
                                    Requires Windows 10+ or macOS 12+ •
                                    <span className="text-fg-muted ml-1">Local AI • No Cloud</span>
                                </div>
                            </div>

                            {/* Steps Content - appears after flip */}
                            <div
                                ref={stepsContainerRef}
                                className="absolute inset-0 space-y-8 pt-8 opacity-0 pointer-events-none"
                            >
                                <h2 className="text-3xl font-semibold text-fg-porcelain mb-8">
                                    How it works
                                </h2>

                                {PIPELINE_STEPS.map((item, i) => (
                                    <div
                                        key={i}
                                        className={`journey-step transition-all duration-300 ${activeStep === i ? 'opacity-100' : 'opacity-30'}`}
                                    >
                                        <div className="text-accent-teal font-mono mb-2 text-lg">{item.step}</div>
                                        <h3 className="text-2xl md:text-3xl font-semibold mb-3 text-fg-porcelain">
                                            {item.isScribble ? (
                                                <>
                                                    <span className="text-fg-muted mr-2">No</span>
                                                    <ScribbleStrike>INDEXING</ScribbleStrike>
                                                    <span className="text-fg-muted ml-2">Required</span>
                                                </>
                                            ) : (
                                                item.title
                                            )}
                                        </h3>
                                        <p className="text-fg-muted leading-relaxed max-w-md">
                                            {item.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right Column: Deck / Pipeline */}
                        <div className="lg:col-span-7 relative perspective-[1200px] lg:sticky lg:top-0 lg:h-screen flex items-center">
                            <div
                                ref={deckRef}
                                className="relative w-full aspect-[16/9] transform-style-preserve-3d"
                                style={{ transformStyle: "preserve-3d" }}
                            >
                                {/* Front face - Video */}
                                <div
                                    ref={deckFrontRef}
                                    className="absolute inset-0 shadow-lift rounded-lg overflow-hidden border border-white/10 bg-bg-graphite-2"
                                    style={{ backfaceVisibility: "hidden" }}
                                >
                                    {/* Fake Window Bar */}
                                    <div className="h-8 w-full bg-bg-graphite-1 border-b border-white/10 flex items-center px-4 gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                                        <span className="ml-3 text-[10px] text-fg-muted font-mono opacity-50">ixos_demo.mp4</span>
                                    </div>

                                    {/* Video Content */}
                                    <div className="relative w-full h-[calc(100%-2rem)] bg-bg-graphite-2 group">
                                        <video
                                            ref={videoRef}
                                            src="/assets/hero.mp4"
                                            poster="/assets/hero-poster-fallback.jpg"
                                            muted
                                            playsInline
                                            preload="auto"
                                            onCanPlayThrough={handleVideoCanPlay}
                                            className={`w-full h-full object-cover transition-opacity duration-700 ${videoReady ? "opacity-100" : "opacity-0"}`}
                                        />

                                        {/* Play hint overlay (fades out on scroll/play) */}
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-500"
                                            style={{ opacity: videoRef.current?.paused ? 1 : 0 }}>
                                            <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur border border-white/20 flex items-center justify-center">
                                                <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white border-b-[8px] border-b-transparent ml-1" />
                                            </div>
                                        </div>

                                        {/* Loading skeleton */}
                                        {!videoReady && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-bg-graphite-2">
                                                <div className="absolute inset-0 bg-gradient-to-br from-accent-amber/5 to-transparent animate-pulse" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Back face - Pipeline Diagram */}
                                <div
                                    ref={deckBackRef}
                                    className="absolute inset-0 shadow-lift rounded-lg overflow-hidden border border-white/10 bg-bg-graphite-1"
                                    style={{
                                        backfaceVisibility: "hidden",
                                        transform: "rotateX(180deg)",
                                    }}
                                >
                                    <PipelineDiagram activeStep={activeStep} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

// Pipeline diagram component for the back of the card
function PipelineDiagram({ activeStep }: { activeStep: number }) {
    return (
        <div className="w-full h-full p-8 flex flex-col justify-center bg-bg-graphite-1/90 backdrop-blur-sm">
            <h3 className="text-xl font-semibold text-fg-porcelain mb-8 text-center">
                Ixos Pipeline
            </h3>

            <div className="relative space-y-6 pl-8">
                {/* Connecting line */}
                <div
                    className="absolute left-4 top-4 bottom-4 w-0.5 bg-gradient-to-b from-accent-amber via-accent-teal to-accent-violet opacity-30"
                    style={{ marginLeft: "0.125rem" }}
                />

                {PIPELINE_STEPS.map((item, i) => (
                    <div
                        key={i}
                        className={`relative flex items-center gap-4 p-4 rounded-lg transition-all duration-300 ${activeStep === i
                            ? "bg-bg-graphite-2 border border-accent-teal/50 shadow-glow-teal"
                            : "bg-bg-graphite-2/30 border border-stroke-hairline opacity-60"
                            }`}
                    >
                        {/* Node dot */}
                        <div
                            className={`absolute -left-4 w-4 h-4 rounded-full z-10 transition-all duration-300 ${activeStep === i
                                ? "bg-accent-teal shadow-glow-teal"
                                : "bg-bg-primary border-2 border-stroke-hairline"
                                }`}
                            style={{ marginLeft: "-0.5rem" }}
                        />

                        <span className={`font-mono text-sm ${activeStep === i ? "text-accent-teal" : "text-fg-muted"}`}>
                            {item.step}
                        </span>
                        <span className="font-medium text-sm text-fg-porcelain">
                            {item.isScribble ? "No Indexing" : item.title.split(" ").slice(0, 2).join(" ")}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
