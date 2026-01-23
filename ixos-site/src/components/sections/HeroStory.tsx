"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui/Button";
// import { ElectricTraces } from "@/components/effects/ElectricTraces";
// import { RipplePulse } from "@/components/effects/RipplePulse";

// Register ScrollTrigger
if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
}

export function HeroStory() {
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);

    useEffect(() => {
        // Scroll Choreography
        const ctx = gsap.context(() => {
            // Pin Hero Deck - Only pin logic here now
            ScrollTrigger.create({
                trigger: ".hero-deck-wrapper",
                start: "center center",
                end: "+=800", // Pin for 800px of scroll
                pin: true,
                pinSpacing: true,
                scrub: 1, // Smooth unpin
            });

        }, containerRef);

        return () => ctx.revert();
    }, []);

    // Video Control Logic
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // Valid start ensuring first frame
        const handleLoadedMetadata = () => {
            video.currentTime = 0.001; // Tiny seek to force render
            video.pause();
            // Start fade in slightly after to allow render
            requestAnimationFrame(() => setIsVideoLoaded(true));
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);

        // Check if already ready
        if (video.readyState >= 1) {
            handleLoadedMetadata();
        }

        const handleScroll = () => {
            const scrollY = window.scrollY;
            const threshold = 50;
            const resetMargin = 100;

            if (scrollY > threshold) {
                // Should be playing
                if (video.paused) {
                    video.play().catch(() => { });
                    setIsVideoPlaying(true);
                    window.dispatchEvent(new CustomEvent('ixos-video-play'));
                }
            } else if (scrollY <= resetMargin) {
                // Should be paused at start
                if (!video.paused || video.currentTime > 0.1) {
                    video.pause();
                    video.currentTime = 0;
                    setIsVideoPlaying(false);
                    window.dispatchEvent(new CustomEvent('ixos-video-reset'));
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
    }, []);

    const handleWatchDemo = () => {
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play();
            setIsVideoPlaying(true);
            window.dispatchEvent(new CustomEvent('ixos-video-play'));
        }
    };

    return (
        <section ref={containerRef} className="hero-story relative min-h-[150vh] w-full pt-32 pb-24">

            {/* Electric Traces Layer */}
            {/* <ElectricTraces /> */}

            {/* Ripple Layer */}
            <div className="absolute top-[40vh] left-1/2 -translate-x-1/2 z-0">
                {/* <RipplePulse /> */}
            </div>

            <div className="container mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

                {/* Left Content */}
                <div className="lg:col-span-5 pt-12 space-y-8 sticky top-32">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bg-elevated border border-white/5 shadow-inner">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-teal opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-teal"></span>
                        </span>
                        <span className="text-xs font-medium text-text-secondary tracking-wide uppercase">v1.0 Now Available</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-balance leading-[1.1]">
                        <span className="heading-gradient">Find anything</span>
                        <br />
                        <span className="text-white">on your computer.</span>
                    </h1>

                    <p className="text-lg text-text-secondary max-w-md leading-relaxed">
                        Ixos uses local-first semantic search to find files the way you think about them.
                        Private, secure, and lightning fast.
                    </p>

                    <div className="flex flex-wrap gap-4 pt-4">
                        <Button size="lg" hasParticleMagnet className="min-w-[180px]">
                            Download for Windows
                        </Button>
                        <Button variant="secondary" size="lg" onClick={handleWatchDemo}>
                            Watch Demo
                        </Button>
                    </div>

                    <div className="pt-8 text-xs text-text-subtle font-mono">
                        Requires Windows 10+ or macOS 12+ • <span className="text-text-muted">Local AI • No Cloud</span>
                    </div>
                </div>

                {/* Right Hero Deck (Pinned) */}
                <div className="lg:col-span-7 hero-deck-wrapper relative perspective-1000">
                    <div className="hero-deck relative w-full aspect-video bg-bg-secondary rounded-xl border border-white/10 shadow-2xl overflow-hidden group hover:border-accent-teal/30 transition-colors duration-500">
                        {/* Fake Window Bar */}
                        <div className="h-8 w-full bg-bg-tertiary border-b border-white/5 flex items-center px-4 gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500/20" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500/20" />
                            <div className="w-3 h-3 rounded-full bg-green-500/20" />
                        </div>

                        {/* Video Content */}
                        <video
                            ref={videoRef}
                            src="/assets/hero.mp4"
                            loop
                            muted
                            playsInline
                            preload="auto"
                            className={`w-full h-full object-cover transition-opacity duration-700 pointer-events-none ${isVideoLoaded ? 'opacity-90 group-hover:opacity-100' : 'opacity-0'}`}
                        />

                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/50 to-transparent pointer-events-none" />
                    </div>
                </div>
            </div>
        </section>
    );
}
