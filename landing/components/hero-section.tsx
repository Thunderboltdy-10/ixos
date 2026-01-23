"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Github, Download } from "lucide-react";
import { SITE_CONFIG } from "@/lib/constants";
import { MagneticButton } from "@/components/magnetic-button";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useGSAP } from "@gsap/react";
import Image from "next/image";

// Register custom hook to avoid SSR issues with GSAP
if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export function HeroSection() {
    const containerRef = useRef<HTMLDivElement>(null);
    const heroImageRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        // Set initial state explicitly to ensure proper reset
        gsap.set(heroImageRef.current, {
            rotationX: 0,
            scale: 1,
            y: 0,
            opacity: 1,
        });

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: containerRef.current,
                start: "top top",
                end: "bottom center",
                scrub: 1.5,
                invalidateOnRefresh: true,
            }
        });

        // 3D Flip and Scale Down Animation on Scroll
        tl.fromTo(heroImageRef.current,
            {
                rotationX: 0,
                scale: 1,
                y: 0,
                opacity: 1,
            },
            {
                rotationX: 25,
                scale: 0.9,
                y: 100,
                opacity: 0.8,
                ease: "power2.inOut",
            }
        );

    }, { scope: containerRef });

    return (
        <section ref={containerRef} className="relative min-h-[130vh] flex flex-col items-center pt-32 pb-20 px-4 overflow-hidden perspective-1000">
            {/* Background Atmosphere */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100vw] h-[100vh] bg-[radial-gradient(circle_at_50%_0%,rgba(13,148,136,0.15)_0%,rgba(10,10,15,0)_60%)] -z-10 pointer-events-none" />
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-brand-teal/5 blur-[120px] rounded-full animate-float -z-10" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-brand-purple/5 blur-[120px] rounded-full animate-float -z-10" style={{ animationDelay: '3s' }} />

            <div className="container mx-auto max-w-6xl relative z-10 flex flex-col items-center">

                {/* Header Content */}
                <div className="text-center w-full max-w-4xl mb-16 relative">
                    {/* Version Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-1/50 border border-brand-teal/20 backdrop-blur-md text-brand-teal text-sm font-medium mb-8 mx-auto hover:bg-surface-1/80 transition-colors cursor-default"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-teal opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-teal"></span>
                        </span>
                        Ixos v0.2.0 Available Now
                    </motion.div>

                    {/* Headline */}
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[1.1] text-white"
                    >
                        Search at the <br />
                        <span className="bg-gradient-to-r from-white via-white to-content-secondary bg-clip-text text-transparent">
                            Speed of Thought.
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="text-lg md:text-xl text-content-secondary mb-12 max-w-2xl mx-auto leading-relaxed"
                    >
                        Search by meaning, not just filenames. Powered by <span className="text-brand-teal font-medium">Ixos-Flash-v2</span>.
                        <br className="hidden md:block" />
                        Sub-200ms results. 100% offline. Your files never leave your device.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        className="flex flex-col sm:flex-row gap-5 justify-center items-center relative z-20"
                    >
                        <MagneticButton size="lg" className="h-14 px-8 text-lg gap-2 rounded-full shadow-[0_0_50px_rgba(13,148,136,0.25)] bg-gradient-brand hover:shadow-[0_0_80px_rgba(13,148,136,0.4)] hover:scale-105 transition-all duration-300 border border-white/10 group">
                            <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                            Download for Windows
                        </MagneticButton>
                        <MagneticButton variant="ghost" size="lg" className="h-14 px-6 text-lg gap-2 rounded-full hover:bg-white/5 text-content-muted hover:text-white border border-transparent hover:border-white/5" onClick={() => window.open(SITE_CONFIG.links.github, '_blank')}>
                            <Github className="w-5 h-5" />
                            GitHub
                        </MagneticButton>
                    </motion.div>
                </div>

                {/* The Product Portal (Replaces Video) */}
                <motion.div
                    ref={heroImageRef}
                    initial={{ opacity: 0, scale: 0.8, y: 100 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{
                        duration: 1.2,
                        ease: [0.16, 1, 0.3, 1], // Custom spring-like easing
                        delay: 0.6
                    }}
                    className="w-full max-w-[1100px] relative perspective-1000 will-change-transform z-10"
                >
                    {/* Glow Behind */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-brand-teal/20 blur-[100px] rounded-full animate-pulse-slow -z-10" />

                    {/* Floating Labels - Left */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.2, duration: 0.8 }}
                        className="hidden lg:flex absolute -left-12 top-[30%] bg-surface-1/80 backdrop-blur-xl px-4 py-3 rounded-2xl border border-white/10 text-xs text-content-muted shadow-2xl z-20 items-center gap-3 animate-float"
                    >
                        <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center border border-white/5">
                            <div className="w-2 h-2 rounded-full bg-brand-teal animate-pulse" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white font-medium">181ms P50</span>
                            <span className="text-[10px] text-content-muted">Flash Mode</span>
                        </div>
                    </motion.div>

                    {/* Image Container with Mirror/Glass Effect */}
                    <div className="relative rounded-2xl border border-white/10 shadow-2xl bg-surface-1/50 backdrop-blur-sm overflow-hidden group">
                        {/* Reflection Gradient Overlay */}
                        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/5 to-transparent z-20 pointer-events-none" />

                        <Image
                            src="/screenshot-results-final.png"
                            width={1200}
                            height={800}
                            priority
                            quality={100}
                            alt="Ixos Interface"
                            className="w-full h-auto rounded-2xl shadow-2xl border border-surface-2"
                        />

                        {/* Bottom Reflection/Fade */}
                        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-surface-0 via-surface-0/50 to-transparent z-20 pointer-events-none" />
                    </div>

                    {/* Floating Labels - Right */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.4, duration: 0.8 }}
                        className="hidden lg:flex absolute -right-8 bottom-[20%] bg-surface-1/80 backdrop-blur-xl px-4 py-3 rounded-2xl border border-white/10 text-xs text-content-muted shadow-2xl z-20 items-center gap-3 animate-float"
                        style={{ animationDelay: '2s' }}
                    >
                        <div className="flex flex-col text-right">
                            <span className="text-white font-medium">100% Local</span>
                            <span className="text-[10px] text-content-muted">No Cloud Required</span>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center border border-white/5">
                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                        </div>
                    </motion.div>

                </motion.div>

            </div>
        </section>
    );
}
