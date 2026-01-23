"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Download, Github, ChevronDown } from "lucide-react";
import { MagneticButton } from "@/components/magnetic-button";
import { SITE_CONFIG } from "@/lib/constants";
import { HeroScreenshotAnimated } from "./HeroScreenshotAnimated";

/**
 * HeroSection - Electric Glass Design
 *
 * 100vh hero that fills the viewport.
 * Features:
 * - Core status indicator
 * - Gradient title
 * - Animated screenshot
 * - Scroll indicator that appears after delay
 * - Scroll-driven parallax and fade effects
 */

export function HeroSection() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [showScrollIndicator, setShowScrollIndicator] = useState(false);

    // Show scroll indicator after delay
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowScrollIndicator(true);
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    // Scroll-based animations
    const { scrollY } = useScroll();
    const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
    const heroY = useTransform(scrollY, [0, 400], [0, 100]);

    return (
        <section
            ref={containerRef}
            className="relative h-screen flex flex-col items-center justify-center overflow-hidden"
        >
            {/* Background gradient atmosphere */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Top glow */}
                <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-[120vw] h-[60vh]"
                    style={{
                        background: 'radial-gradient(ellipse at 50% 0%, var(--accent-glow) 0%, transparent 70%)',
                    }}
                />
                {/* Corner accents */}
                <div
                    className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full animate-float opacity-30"
                    style={{
                        background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)',
                    }}
                />
                <div
                    className="absolute bottom-[-5%] right-[-5%] w-[500px] h-[500px] rounded-full animate-float opacity-20"
                    style={{
                        background: 'radial-gradient(circle, var(--accent-secondary-glow) 0%, transparent 70%)',
                        animationDelay: '3s',
                    }}
                />
            </div>

            {/* Main content */}
            <motion.div
                style={{ opacity: heroOpacity, y: heroY }}
                className="relative z-10 flex flex-col items-center w-full max-w-6xl mx-auto px-4"
            >
                {/* Core Status Indicator */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="flex items-center gap-2 mb-6"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-bg-secondary/80 border border-border-default backdrop-blur-sm">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                        </span>
                        <span className="mono text-xs text-fg-muted">
                            <span className="text-accent">CORE</span>_ACTIVE
                        </span>
                        <span className="text-fg-dim">|</span>
                        <span className="mono text-xs text-fg-secondary">v0.2.0</span>
                    </div>
                </motion.div>

                {/* Title */}
                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="text-center font-heading text-5xl md:text-6xl lg:text-7xl xl:text-hero font-bold tracking-tight mb-6 leading-[1.05]"
                >
                    Search at the
                    <br />
                    <span className="text-gradient">Speed of Thought.</span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="text-center text-lg md:text-xl text-fg-secondary max-w-2xl mb-10 leading-relaxed"
                >
                    Search by meaning, not just filenames. Powered by{" "}
                    <span className="text-accent font-medium">Ixos-Flash-v2</span>.
                    <br className="hidden md:block" />
                    Sub-200ms results. 100% offline. Your files never leave your device.
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
                >
                    <MagneticButton
                        size="lg"
                        className="h-12 px-6 text-base gap-2 rounded-sm bg-accent hover:bg-accent-bright text-bg-void font-medium border border-accent hover:border-accent-bright shadow-glow-teal hover:shadow-glow-teal-strong transition-all duration-fast group"
                    >
                        <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                        Download for Windows
                    </MagneticButton>
                    <MagneticButton
                        variant="ghost"
                        size="lg"
                        className="h-12 px-6 text-base gap-2 rounded-sm bg-transparent border border-border-default text-fg-secondary hover:text-fg-primary hover:border-border-hover hover:bg-bg-secondary/50 transition-all duration-fast"
                        onClick={() => window.open(SITE_CONFIG.links.github, '_blank')}
                    >
                        <Github className="w-5 h-5" />
                        GitHub
                    </MagneticButton>
                </motion.div>

                {/* Screenshot with animation capabilities */}
                <HeroScreenshotAnimated />
            </motion.div>

            {/* Scroll Indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: showScrollIndicator ? 1 : 0 }}
                transition={{ duration: 0.8 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20"
            >
                <span className="mono text-xs text-fg-dim uppercase tracking-wider">Scroll to explore</span>
                <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                    <ChevronDown className="w-5 h-5 text-fg-muted" />
                </motion.div>
            </motion.div>
        </section>
    );
}

export default HeroSection;
