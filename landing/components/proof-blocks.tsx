"use client";

import { motion } from "framer-motion";
import { Zap, HardDrive, Shield } from "lucide-react";
import { VERIFIED_BENCHMARKS } from "@/lib/verified-benchmarks";

/**
 * ProofBlocks - Replaces generic features grid
 *
 * 3-4 focused proof blocks showing:
 * - Speed (181ms P50)
 * - Storage (225 bytes/file)
 * - Privacy (Zero network)
 */

interface ProofBlock {
    icon: React.ReactNode;
    claim: string;
    metric: string;
    caption: string;
}

const PROOF_BLOCKS: ProofBlock[] = [
    {
        icon: <Zap className="w-5 h-5" />,
        claim: "First result before you finish typing",
        metric: VERIFIED_BENCHMARKS.latency.ttfrP50,
        caption: "Ixos-Flash-v2, 1K files",
    },
    {
        icon: <HardDrive className="w-5 h-5" />,
        claim: "No index database to corrupt",
        metric: "No index",
        caption: "JIT embeddings + metadata cache",
    },
    {
        icon: <Shield className="w-5 h-5" />,
        claim: "Your files never leave your device",
        metric: "Zero network",
        caption: "No cloud, no telemetry",
    },
];

export function ProofBlocks() {
    return (
        <section className="py-20 relative" id="proof">
            <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto">
                    {/* Horizontal layout on desktop, stack on mobile */}
                    <div className="flex flex-col md:flex-row items-stretch justify-center gap-8 md:gap-12">
                        {PROOF_BLOCKS.map((block, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ delay: index * 0.1, duration: 0.5 }}
                                className="flex-1 max-w-[280px] mx-auto md:mx-0"
                            >
                                <div className="card-technical p-6 h-full flex flex-col">
                                    {/* Icon */}
                                    <div className="w-10 h-10 rounded-lg bg-brand-teal/10 border border-brand-teal/20 flex items-center justify-center text-brand-teal mb-4">
                                        {block.icon}
                                    </div>

                                    {/* Metric */}
                                    <div className="font-mono text-2xl font-bold text-white mb-2">
                                        {block.metric}
                                    </div>

                                    {/* Claim */}
                                    <p className="text-sm text-content-secondary mb-3 flex-1">
                                        {block.claim}
                                    </p>

                                    {/* Caption */}
                                    <p className="mono-caps text-[10px]">
                                        {block.caption}
                                    </p>
                                </div>

                                {/* Separator line (hidden on last item and mobile) */}
                                {index < PROOF_BLOCKS.length - 1 && (
                                    <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-px h-16 bg-white/[0.04]" />
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

export default ProofBlocks;
