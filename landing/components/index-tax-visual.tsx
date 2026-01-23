"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { Database, FileText, AlertTriangle, Check } from "lucide-react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";

// Register GSAP plugins
if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger, useGSAP);
}

/**
 * IndexTaxVisual - Side-by-side comparison
 *
 * Traditional Index vs Ixos Zero-Storage
 * With animated "vaporize" effect on the bloated index
 */

export function IndexTaxVisual() {
    const containerRef = useRef<HTMLDivElement>(null);
    const traditionalRef = useRef<HTMLDivElement>(null);
    const ixosRef = useRef<HTMLDivElement>(null);
    const dbIconRef = useRef<HTMLDivElement>(null);
    const storageBarRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        if (!containerRef.current) return;

        // Traditional side - bloat animation
        const bloatTl = gsap.timeline({
            scrollTrigger: {
                trigger: containerRef.current,
                start: "top 70%",
                end: "top 30%",
                scrub: 1,
            }
        });

        // Database icon scales up (bloating)
        bloatTl.fromTo(dbIconRef.current,
            { scale: 1 },
            { scale: 1.15, duration: 0.4 },
            0
        );

        // Storage bar fills up (red)
        bloatTl.fromTo(storageBarRef.current,
            { width: "30%" },
            { width: "85%", duration: 0.5 },
            0.1
        );

        // Then vaporize - database shrinks and fades
        bloatTl.to(dbIconRef.current,
            {
                scale: 0.3,
                opacity: 0,
                filter: "blur(8px)",
                duration: 0.3,
            },
            0.6
        );

        // Ixos side glows
        bloatTl.fromTo(ixosRef.current,
            { borderColor: "rgba(255,255,255,0.06)" },
            { borderColor: "rgba(20,184,166,0.3)", duration: 0.3 },
            0.7
        );

    }, { scope: containerRef });

    return (
        <section ref={containerRef} className="py-24 relative" id="index-tax">
            <div className="container mx-auto px-4">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <h2 className="text-2xl md:text-4xl font-bold mb-4">
                        The Index Tax
                    </h2>
                    <p className="text-content-secondary max-w-xl mx-auto">
                        Traditional search tools create bloated databases. Ixos stores embeddings where they belong.
                    </p>
                </div>

                {/* Comparison Grid */}
                <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
                    {/* Traditional Index */}
                    <motion.div
                        ref={traditionalRef}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="card-technical p-6 border-color-error/20"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded bg-color-error/10 flex items-center justify-center">
                                <AlertTriangle className="w-4 h-4 text-color-error" />
                            </div>
                            <span className="mono-caps text-color-error">Traditional Index</span>
                        </div>

                        {/* Database Icon (will animate) */}
                        <div className="flex justify-center mb-6">
                            <div
                                ref={dbIconRef}
                                className="w-20 h-20 rounded-lg bg-surface-2 border border-color-error/20 flex items-center justify-center"
                            >
                                <Database className="w-10 h-10 text-color-error/60" />
                            </div>
                        </div>

                        {/* Storage Bar */}
                        <div className="mb-6">
                            <div className="flex justify-between text-xs mb-2">
                                <span className="mono-caps">Disk Usage</span>
                                <span className="font-mono text-color-error">1.2GB</span>
                            </div>
                            <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                                <div
                                    ref={storageBarRef}
                                    className="h-full bg-color-error/60 rounded-full transition-all duration-300"
                                    style={{ width: "30%" }}
                                />
                            </div>
                        </div>

                        {/* Pain Points */}
                        <ul className="space-y-2 text-sm text-content-muted">
                            <li className="flex items-start gap-2">
                                <span className="text-color-error mt-0.5">-</span>
                                <span>Separate database file</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-color-error mt-0.5">-</span>
                                <span>Rebuilds after every sync</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-color-error mt-0.5">-</span>
                                <span>Breaks on file moves</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-color-error mt-0.5">-</span>
                                <span>Corrupts with cloud sync</span>
                            </li>
                        </ul>
                    </motion.div>

                    {/* Ixos Zero-Storage */}
                    <motion.div
                        ref={ixosRef}
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="card-technical p-6 transition-colors duration-300"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded bg-brand-teal/10 flex items-center justify-center">
                                <Check className="w-4 h-4 text-brand-teal" />
                            </div>
                            <span className="mono-caps text-brand-teal">Ixos Zero-Storage</span>
                        </div>

                        {/* File Icon with Dot */}
                        <div className="flex justify-center mb-6">
                            <div className="relative w-20 h-20 rounded-lg bg-surface-2 border border-brand-teal/20 flex items-center justify-center">
                                <FileText className="w-10 h-10 text-brand-teal/60" />
                                {/* Tiny embedding dot */}
                                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-brand-teal shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
                            </div>
                        </div>

                        {/* Storage Bar */}
                        <div className="mb-6">
                            <div className="flex justify-between text-xs mb-2">
                                <span className="mono-caps">Per File</span>
                                <span className="font-mono text-brand-teal">225 bytes</span>
                            </div>
                            <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-brand-teal/60 rounded-full"
                                    style={{ width: "2%" }}
                                />
                            </div>
                        </div>

                        {/* Benefits */}
                        <ul className="space-y-2 text-sm text-content-secondary">
                            <li className="flex items-start gap-2">
                                <span className="text-brand-teal mt-0.5">+</span>
                                <span>Embeddings in file metadata</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-brand-teal mt-0.5">+</span>
                                <span>Survives renames and moves</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-brand-teal mt-0.5">+</span>
                                <span>Works with cloud sync</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-brand-teal mt-0.5">+</span>
                                <span>No maintenance required</span>
                            </li>
                        </ul>
                    </motion.div>
                </div>

                {/* Technical Note */}
                <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="text-center mt-8 text-xs text-content-muted max-w-lg mx-auto"
                >
                    Embeddings stored via <span className="font-mono text-content-secondary">xattr</span> (macOS/Linux) or{" "}
                    <span className="font-mono text-content-secondary">ADS</span> (Windows NTFS). No separate index to corrupt.
                </motion.p>
            </div>
        </section>
    );
}

export default IndexTaxVisual;
