"use client";

import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui/Button";
import { RipplePulse } from "@/components/effects/RipplePulse";
import { VideoModal } from "@/components/ui/VideoModal";
import { IxosDemoWindow } from "@/components/hero/IxosDemoWindow";

// Register ScrollTrigger
if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
}

export function HeroStoryV3() {
    const containerRef = useRef<HTMLDivElement>(null);
    const heroBaseRef = useRef<HTMLDivElement>(null);
    const deckWrapperRef = useRef<HTMLDivElement>(null);
    const deckRef = useRef<HTMLDivElement>(null);
    const deckFrontRef = useRef<HTMLDivElement>(null);
    const deckBackRef = useRef<HTMLDivElement>(null);
    const [showModal, setShowModal] = useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
        if (typeof window === "undefined") return false;
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    });

    useEffect(() => {
        if (typeof window === "undefined") return;
        // Check reduced motion preference
        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

        const handleChange = (e: MediaQueryListEvent) => {
            setPrefersReducedMotion(e.matches);
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    useEffect(() => {
        if (!containerRef.current || prefersReducedMotion) return;

        const ctx = gsap.context(() => {
            const deck = deckRef.current;
            const deckFront = deckFrontRef.current;
            const deckBack = deckBackRef.current;

            if (!deck || !deckFront || !deckBack) return;

            // Timeline for the hero story animation
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: "top top",
                    end: "+=120%",
                    scrub: 1,
                    pin: true,
                    anticipatePin: 1,
                },
            });

            // Phase 1: Deck moves down (0-40%)
            tl.to(deck, {
                y: "30vh",
                scale: 0.95,
                duration: 0.4,
                ease: "power2.inOut",
            });

            // Phase 2: Deck flips and transforms (40-70%)
            tl.to(deck, {
                rotateX: 180,
                duration: 0.3,
                ease: "power2.inOut",
            });

            // Phase 3: Deck continues down and fades (70-100%)
            tl.to(deck, {
                y: "50vh",
                opacity: 0,
                scale: 0.9,
                duration: 0.3,
                ease: "power2.in",
            });

            // Ripple pulse at midpoint
            ScrollTrigger.create({
                trigger: containerRef.current,
                start: "40% top",
                onEnter: () => {
                    const rippleEl = document.querySelector(".ripple-container");
                    if (rippleEl) {
                        rippleEl.classList.add("active");
                    }
                },
            });


        }, containerRef);

        return () => ctx.revert();
    }, [prefersReducedMotion]);

    const handleDownload = () => {
        window.location.href = "/api/download?platform=windows";
    };

    const handleWatchDemo = () => {
        setShowModal(true);
    };

    return (
        <>
            <section
                ref={containerRef}
                className="hero-story-v3 relative min-h-screen w-full section-hero texture-overlay vignette z-20"
            >
                <div ref={heroBaseRef} className="relative min-h-screen w-full pt-32 pb-16">
                    {/* Ripple pulse effect */}
                    <div className="ripple-container absolute top-[45vh] left-1/2 -translate-x-1/2 z-0">
                        <RipplePulse />
                    </div>

                    <div className="container mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center min-h-[80vh]">
                        {/* Left Content (5 columns) */}
                        <div className="lg:col-span-5 space-y-6">
                            {/* "No Index Tax" badge */}
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-graphite-2 border border-stroke-hairline">
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-amber animate-pulse" />
                                <span className="text-xs text-fg-muted tracking-wider">
                                    Zero index tax • Files stay private
                                </span>
                            </div>

                            {/* NEW Headline */}
                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.05]">
                                <span className="heading-gradient">Type what you</span>
                                <br />
                                <span className="heading-gradient">remember.</span>
                                <br />
                                <span className="text-fg-porcelain">Find what you mean.</span>
                            </h1>

                            {/* NEW Subhead */}
                            <p className="text-lg text-fg-muted max-w-md leading-relaxed">
                                Local semantic search with zero index tax. No persistent database
                                eating your disk. No cloud sync watching your files. Just instant results.
                            </p>

                            {/* CTAs */}
                            <div className="flex flex-wrap gap-4 pt-2">
                                <Button
                                    size="lg"
                                    hasParticleMagnet
                                    className="min-w-[180px]"
                                    onClick={handleDownload}
                                >
                                    Download for Windows
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="lg"
                                    onClick={handleWatchDemo}
                                >
                                    Watch Demo
                                </Button>
                            </div>

                            {/* System requirements */}
                            <div className="pt-4 text-xs text-text-subtle font-mono">
                                Windows 10+ or macOS 12+ •
                                <span className="text-fg-muted ml-1">Local AI • No Cloud • No Index</span>
                            </div>
                        </div>

                        {/* Right Hero Deck (7 columns) - Flippable - LARGER */}
                        <div
                            ref={deckWrapperRef}
                            className="lg:col-span-7 relative perspective-[1200px] z-50"
                        >
                            <div
                                ref={deckRef}
                                className="deck relative w-full aspect-[16/11] transform-style-preserve-3d min-h-[480px] lg:min-h-[520px]"
                                style={{ transformStyle: "preserve-3d" }}
                            >
                                {/* Front face - Interactive Demo */}
                                <div
                                    ref={deckFrontRef}
                                    className="absolute inset-0 backface-hidden shadow-lift rounded-xl border border-stroke-hairline"
                                    style={{ backfaceVisibility: "hidden" }}
                                >


                                    {/* Fake Window Bar */}
                                    <div className="h-8 w-full bg-bg-graphite-1 border-b border-stroke-hairline flex items-center px-4 gap-2 rounded-t-xl overflow-hidden">
                                        <div className="w-3 h-3 rounded-full bg-red-500/30" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/30" />
                                        <div className="w-3 h-3 rounded-full bg-green-500/30" />
                                        <span className="ml-3 text-xs text-fg-muted font-mono">Ixos</span>
                                    </div>

                                    {/* Interactive Demo Content */}
                                    <div className="relative w-full h-[calc(100%-2rem)] bg-bg-graphite-0 rounded-b-xl overflow-hidden">
                                        <IxosDemoWindow />
                                    </div>
                                </div>

                                {/* Back face - Pipeline diagram preview */}
                                <div
                                    ref={deckBackRef}
                                    className="absolute inset-0 backface-hidden shadow-lift rounded-xl overflow-hidden border border-stroke-hairline bg-bg-graphite-2"
                                    style={{
                                        backfaceVisibility: "hidden",
                                        transform: "rotateX(180deg)",
                                    }}
                                >
                                    <HeroDeckBackContent />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Video Modal */}
            <VideoModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                videoSrc="/assets/hero.mp4"
            />
        </>
    );
}

// Back face content showing pipeline diagram
function HeroDeckBackContent() {
    return (
        <div className="w-full h-full p-8 flex flex-col justify-center items-center bg-bg-graphite-1">
            <h3 className="text-xl font-semibold text-fg-porcelain mb-8">How Ixos Works</h3>

            <div className="relative flex flex-col gap-4 w-full max-w-sm">
                {[
                    { step: "01", label: "Type naturally", desc: "No special syntax needed" },
                    { step: "02", label: "Memory Processing", desc: "On-demand AI with local-first caching controls" },
                    { step: "03", label: "Local Search", desc: "100% on your machine" },
                    { step: "04", label: "Auto Cleanup", desc: "Temporary data wiped" },
                    { step: "05", label: "Stream Results", desc: "See matches as they're found" },
                ].map((item, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-4 p-3 rounded-lg bg-bg-graphite-2 border border-stroke-hairline"
                    >
                        <span className="text-accent-teal font-mono text-sm">{item.step}</span>
                        <div className="flex-1">
                            <span className="text-fg-porcelain text-sm">{item.label}</span>
                            <span className="text-fg-muted text-xs ml-2">{item.desc}</span>
                        </div>
                    </div>
                ))}

                {/* Connecting line */}
                <div
                    className="absolute left-6 top-8 bottom-8 w-px bg-gradient-to-b from-accent-teal via-fg-porcelain/20 to-accent-teal"
                    style={{ marginLeft: "0.25rem" }}
                />
            </div>
        </div>
    );
}
