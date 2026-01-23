"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from "framer-motion";
import Image from "next/image";

/**
 * HeroScreenshotAnimated - Electric Glass Design
 *
 * The screenshot that "comes alive" on scroll:
 * 1. Initial state: Static screenshot with subtle glow
 * 2. On scroll: Search bar overlay glows and text types in
 * 3. PowerPulse effect fires
 * 4. Results stream in
 * 5. Screenshot transforms/expands
 */

interface HeroScreenshotAnimatedProps {
    className?: string;
}

export function HeroScreenshotAnimated({ className = "" }: HeroScreenshotAnimatedProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [typedText, setTypedText] = useState("");
    const [showPulse, setShowPulse] = useState(false);
    const [showResults, setShowResults] = useState(false);

    const SEARCH_TEXT = "architecture patterns";

    // Scroll-based progress
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"],
    });

    // Spring-smoothed scroll progress
    const smoothProgress = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001,
    });

    // Transform values based on scroll
    const scale = useTransform(smoothProgress, [0, 0.3, 0.5], [1, 1.02, 0.95]);
    const rotateX = useTransform(smoothProgress, [0, 0.3, 0.5], [0, 2, 15]);
    const y = useTransform(smoothProgress, [0, 0.5], [0, 50]);
    const opacity = useTransform(smoothProgress, [0.4, 0.6], [1, 0.7]);

    // Glow intensity based on scroll
    const glowOpacity = useTransform(smoothProgress, [0, 0.15, 0.3], [0.2, 0.6, 0.3]);

    // Trigger animation sequence when user scrolls
    useEffect(() => {
        const unsubscribe = scrollYProgress.on("change", (value) => {
            if (value > 0.08 && !isAnimating) {
                setIsAnimating(true);
                startAnimationSequence();
            }
        });

        return () => unsubscribe();
    }, [scrollYProgress, isAnimating]);

    const startAnimationSequence = async () => {
        // Phase 1: Type the search text
        for (let i = 0; i <= SEARCH_TEXT.length; i++) {
            await new Promise((r) => setTimeout(r, 40));
            setTypedText(SEARCH_TEXT.slice(0, i));
        }

        // Phase 2: Show pulse effect
        await new Promise((r) => setTimeout(r, 200));
        setShowPulse(true);

        // Phase 3: Show results
        await new Promise((r) => setTimeout(r, 400));
        setShowResults(true);

        // Phase 4: Hide pulse after animation
        await new Promise((r) => setTimeout(r, 800));
        setShowPulse(false);
    };

    return (
        <motion.div
            ref={containerRef}
            style={{ scale, rotateX, y, opacity }}
            className={`relative w-full max-w-[1000px] perspective-1500 ${className}`}
        >
            {/* Glow behind screenshot */}
            <motion.div
                style={{ opacity: glowOpacity }}
                className="absolute inset-0 -z-10 blur-[60px] rounded-lg"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-accent/30 via-accent-secondary/20 to-transparent" />
            </motion.div>

            {/* Terminal frame */}
            <div className="relative rounded-lg border border-border-default bg-bg-primary/90 backdrop-blur-sm shadow-xl overflow-hidden">
                {/* Terminal header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle bg-bg-secondary/50">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-error/80" />
                        <div className="w-3 h-3 rounded-full bg-warning/80" />
                        <div className="w-3 h-3 rounded-full bg-success/80" />
                    </div>
                    <div className="flex-1 text-center">
                        <span className="mono text-xs text-fg-dim">Ixos — Search Engine</span>
                    </div>
                    <div className="w-16" /> {/* Spacer for balance */}
                </div>

                {/* Screenshot container */}
                <div className="relative">
                    {/* Actual screenshot */}
                    <Image
                        src="/screenshot-results-final.png"
                        width={1200}
                        height={750}
                        priority
                        quality={95}
                        alt="Ixos Interface"
                        className="w-full h-auto"
                    />

                    {/* Search bar overlay zone */}
                    <div
                        className="absolute"
                        style={{
                            top: '8%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '60%',
                            height: '48px',
                        }}
                    >
                        <AnimatePresence>
                            {isAnimating && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="absolute inset-0 flex items-center px-4 bg-bg-secondary/95 border border-accent/50 rounded-sm shadow-glow-teal backdrop-blur-sm"
                                >
                                    <span className="text-accent mono text-sm mr-2">{">"}</span>
                                    <span className="text-fg-primary mono text-sm">
                                        {typedText}
                                        <span className="animate-type-cursor text-accent">|</span>
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* PowerPulse effect overlay */}
                    <AnimatePresence>
                        {showPulse && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 pointer-events-none overflow-hidden"
                            >
                                {/* Central beam */}
                                <motion.div
                                    initial={{ scaleY: 0, opacity: 0 }}
                                    animate={{ scaleY: 1, opacity: 1 }}
                                    transition={{ duration: 0.3, ease: "easeOut" }}
                                    className="absolute left-1/2 top-[15%] -translate-x-1/2 w-[2px] h-[30%] origin-top"
                                    style={{
                                        background: 'linear-gradient(to bottom, var(--accent-primary), transparent)',
                                    }}
                                />

                                {/* Shockwave rings */}
                                {[0, 1, 2].map((i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ scale: 0, opacity: 0.8 }}
                                        animate={{ scale: 3, opacity: 0 }}
                                        transition={{
                                            duration: 1,
                                            delay: i * 0.15,
                                            ease: "easeOut",
                                        }}
                                        className="absolute left-1/2 top-[15%] -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-2 border-accent/50"
                                    />
                                ))}

                                {/* Beam ripples */}
                                <svg
                                    className="absolute inset-0 w-full h-full"
                                    viewBox="0 0 1200 750"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    {/* Circuit traces emanating from search bar */}
                                    {[
                                        "M 600,120 L 600,200 L 400,300 L 200,350",
                                        "M 600,120 L 600,200 L 800,300 L 1000,350",
                                        "M 600,120 L 600,250 L 600,400 L 600,500",
                                        "M 600,120 L 700,180 L 900,250 L 1100,280",
                                        "M 600,120 L 500,180 L 300,250 L 100,280",
                                    ].map((d, i) => (
                                        <motion.path
                                            key={i}
                                            d={d}
                                            stroke="url(#beamGradient)"
                                            strokeWidth="2"
                                            fill="none"
                                            initial={{ pathLength: 0, opacity: 0 }}
                                            animate={{ pathLength: 1, opacity: [0, 1, 0.6] }}
                                            transition={{
                                                duration: 0.8,
                                                delay: 0.2 + i * 0.1,
                                                ease: "easeOut",
                                            }}
                                        />
                                    ))}
                                    <defs>
                                        <linearGradient id="beamGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="1" />
                                            <stop offset="100%" stopColor="var(--accent-secondary)" stopOpacity="0.3" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Results streaming animation overlay */}
                    <AnimatePresence>
                        {showResults && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 pointer-events-none"
                            >
                                {/* Spark trails to result positions */}
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: -20, x: 0 }}
                                        animate={{
                                            opacity: [0, 1, 0],
                                            y: [100, 250 + i * 60],
                                            x: [-50 + Math.random() * 100, 0],
                                        }}
                                        transition={{
                                            duration: 0.5,
                                            delay: i * 0.08,
                                            ease: "easeOut",
                                        }}
                                        className="absolute left-1/2 w-2 h-2 rounded-full bg-accent shadow-glow-teal"
                                    />
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Top reflection gradient */}
                    <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

                    {/* Bottom fade */}
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg-primary to-transparent pointer-events-none" />
                </div>
            </div>

            {/* Floating stat badges */}
            <motion.div
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1, duration: 0.6 }}
                className="hidden lg:flex absolute -left-4 top-[30%] z-20"
            >
                <div className="flex items-center gap-3 px-4 py-3 bg-bg-secondary/90 backdrop-blur-md border border-border-default rounded-sm shadow-lg animate-float">
                    <div className="w-8 h-8 rounded-sm bg-bg-surface flex items-center justify-center border border-border-subtle">
                        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-fg-primary font-medium text-sm">181ms P50</span>
                        <span className="mono text-xs text-fg-muted">Flash Mode</span>
                    </div>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2, duration: 0.6 }}
                className="hidden lg:flex absolute -right-4 bottom-[25%] z-20"
                style={{ animationDelay: '2s' }}
            >
                <div className="flex items-center gap-3 px-4 py-3 bg-bg-secondary/90 backdrop-blur-md border border-border-default rounded-sm shadow-lg animate-float">
                    <div className="flex flex-col text-right">
                        <span className="text-fg-primary font-medium text-sm">100% Local</span>
                        <span className="mono text-xs text-fg-muted">Zero Cloud</span>
                    </div>
                    <div className="w-8 h-8 rounded-sm bg-bg-surface flex items-center justify-center border border-border-subtle">
                        <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default HeroScreenshotAnimated;
