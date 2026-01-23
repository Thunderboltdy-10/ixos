"use client";

import { motion } from "framer-motion";
import { VERIFIED_BENCHMARKS } from "@/lib/verified-benchmarks";
import { ExternalLink } from "lucide-react";

export function BenchmarksSection() {
    return (
        <section className="py-24 relative" id="benchmarks">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-16">
                    <span className="inline-block py-1 px-3 rounded-full bg-brand-teal/10 border border-brand-teal/20 text-brand-teal text-sm font-medium mb-4">
                        Verified Performance
                    </span>
                    <h2 className="text-3xl md:text-5xl font-bold font-display mb-4 text-white">
                        Real Numbers, Real Tests
                    </h2>
                    <p className="text-content-secondary max-w-2xl mx-auto text-lg">
                        Benchmarks from our lab report. {VERIFIED_BENCHMARKS.testCorpus.files} files, {VERIFIED_BENCHMARKS.testCorpus.totalSize}.
                    </p>
                </div>

                {/* Main Stats */}
                <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="bg-surface-1 rounded-2xl border border-white/5 p-6 text-center"
                    >
                        <p className="text-4xl font-bold text-white mb-1">
                            {VERIFIED_BENCHMARKS.latency.ttfrP50}
                        </p>
                        <p className="text-sm text-content-muted">TTFR P50</p>
                        <p className="text-xs text-brand-teal mt-2">Time to First Result</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="bg-surface-1 rounded-2xl border border-white/5 p-6 text-center"
                    >
                        <p className="text-4xl font-bold text-white mb-1">
                            {VERIFIED_BENCHMARKS.accuracy.flashMRR10}
                        </p>
                        <p className="text-sm text-content-muted">Flash MRR@10</p>
                        <p className="text-xs text-brand-teal mt-2">Mean Reciprocal Rank</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="bg-surface-1 rounded-2xl border border-white/5 p-6 text-center"
                    >
                        <p className="text-4xl font-bold text-white mb-1">
                            {VERIFIED_BENCHMARKS.accuracy.autoMRR10}
                        </p>
                        <p className="text-sm text-content-muted">Auto MRR@10</p>
                        <p className="text-xs text-brand-teal mt-2">With Fusion Weights</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                        className="bg-surface-1 rounded-2xl border border-white/5 p-6 text-center"
                    >
                        <p className="text-4xl font-bold text-white mb-1">
                            {VERIFIED_BENCHMARKS.comparisons.vsTransformer}
                        </p>
                        <p className="text-sm text-content-muted">vs Transformers</p>
                        <p className="text-xs text-brand-teal mt-2">Speed Advantage</p>
                    </motion.div>
                </div>

                {/* Stage Breakdown */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="max-w-3xl mx-auto bg-surface-1 rounded-2xl border border-white/5 p-8"
                >
                    <h3 className="text-xl font-semibold text-white mb-6">
                        Search Pipeline Breakdown (P95)
                    </h3>
                    <div className="space-y-4">
                        <StageBar label="Directory Walk" value="80ms" percentage={8} />
                        <StageBar label="Ripgrep Scan" value="190ms" percentage={19} />
                        <StageBar label="Candidate Selection" value="14ms" percentage={1} />
                        <StageBar label="Flash Ranking" value="417ms" percentage={42} />
                        <StageBar label="Total (Cache)" value="420ms" percentage={100} highlight />
                    </div>

                    <p className="text-xs text-content-muted mt-6 text-center">
                        Source: {VERIFIED_BENCHMARKS.source} • Updated: {VERIFIED_BENCHMARKS.lastUpdated}
                    </p>
                </motion.div>
            </div>
        </section>
    );
}

function StageBar({
    label,
    value,
    percentage,
    highlight = false,
}: {
    label: string;
    value: string;
    percentage: number;
    highlight?: boolean;
}) {
    return (
        <div className="flex items-center gap-4">
            <div className="w-32 text-sm text-content-secondary">{label}</div>
            <div className="flex-1 h-6 bg-surface-0 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${percentage}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full ${highlight ? "bg-brand-teal" : "bg-brand-teal/50"}`}
                />
            </div>
            <div className={`w-20 text-right font-mono text-sm ${highlight ? "text-brand-teal font-bold" : "text-content-muted"}`}>
                {value}
            </div>
        </div>
    );
}
