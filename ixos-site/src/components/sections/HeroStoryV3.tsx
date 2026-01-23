"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui/Button";
import { RipplePulse } from "@/components/effects/RipplePulse";
import { VideoModal } from "@/components/ui/VideoModal";

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
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoReady, setVideoReady] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        // Check reduced motion preference
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
                    end: "+=120%", // Reduced from 150% per spec
                    scrub: 1,
                    pin: true,
                    anticipatePin: 1,
                    onUpdate: (self) => {
                        // Play video when scroll starts
                        if (self.progress > 0.05 && videoRef.current?.paused) {
                            videoRef.current?.play();
                        }
                    },
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

    // Video ready handler
    const handleVideoCanPlay = () => {
        setVideoReady(true);
    };

    const handleDownload = () => {
        // Open download page or trigger download
        window.open("/download", "_blank");
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
                            {/* Availability badge */}
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-graphite-2 border border-stroke-hairline">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-teal opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-teal"></span>
                                </span>
                                <span className="text-xs font-medium text-fg-muted tracking-wider uppercase">
                                    v1.0 Now Available
                                </span>
                            </div>

                            {/* Headline - using display font */}
                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.05]">
                                <span className="heading-gradient">Find anything</span>
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
                                Requires Windows 10+ or macOS 12+ •
                                <span className="text-fg-muted ml-1">Local AI • No Cloud</span>
                            </div>
                        </div>

                        {/* Right Hero Deck (7 columns) - Flippable */}
                        <div
                            ref={deckWrapperRef}
                            className="lg:col-span-7 relative perspective-[1200px] z-50"
                        >
                            <div
                                ref={deckRef}
                                className="deck relative w-full aspect-[16/10] transform-style-preserve-3d"
                                style={{ transformStyle: "preserve-3d" }}
                            >
                                {/* Front face - Video */}
                                <div
                                    ref={deckFrontRef}
                                    className="absolute inset-0 backface-hidden shadow-lift rounded-xl overflow-hidden border border-stroke-hairline bg-bg-graphite-2"
                                    style={{ backfaceVisibility: "hidden" }}
                                >
                                    {/* Fake Window Bar */}
                                    <div className="h-8 w-full bg-bg-graphite-1 border-b border-stroke-hairline flex items-center px-4 gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500/30" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/30" />
                                        <div className="w-3 h-3 rounded-full bg-green-500/30" />
                                        <span className="ml-3 text-xs text-fg-muted font-mono">Ixos</span>
                                    </div>

                                    {/* Video Content */}
                                    <div className="relative w-full h-[calc(100%-2rem)] bg-bg-graphite-2">
                                        <video
                                            ref={videoRef}
                                            src="/assets/hero.mp4"
                                            poster="/assets/hero-poster-fallback.jpg"
                                            loop
                                            muted
                                            playsInline
                                            preload="auto"
                                            onCanPlayThrough={handleVideoCanPlay}
                                            className={`w-full h-full object-cover transition-opacity duration-700 ${videoReady ? "opacity-100" : "opacity-0"
                                                }`}
                                        />

                                        {/* Poster/Skeleton fallback visible immediately */}
                                        {!videoReady && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                {/* Base dark fill */}
                                                <div className="absolute inset-0 bg-bg-graphite-2" />

                                                {/* Subtle gradient pulse */}
                                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent animate-pulse" />

                                                {/* Loading spinner */}
                                                <div className="relative z-10 w-8 h-8 rounded-full border-2 border-accent-teal border-t-transparent animate-spin opacity-50" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Overlay gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-bg-graphite-0/40 to-transparent pointer-events-none" />
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
                    { step: "01", label: "Query Typed" },
                    { step: "02", label: "JIT Embeddings" },
                    { step: "03", label: "Local Search" },
                    { step: "04", label: "Instant Delete" },
                    { step: "05", label: "Results Stream" },
                ].map((item, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-4 p-3 rounded-lg bg-bg-graphite-2 border border-stroke-hairline"
                    >
                        <span className="text-accent-teal font-mono text-sm">{item.step}</span>
                        <span className="text-fg-muted text-sm">{item.label}</span>
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
