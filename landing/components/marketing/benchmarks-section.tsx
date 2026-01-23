"use client";

import { motion } from "framer-motion";
import { VERIFIED_BENCHMARKS } from "@/lib/verified-benchmarks";

export function BenchmarksSection() {
    const parseMs = (value: string) => {
        const cleaned = value.replace("ms", "");
        const parsed = parseFloat(cleaned);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const totalMs = parseMs(VERIFIED_BENCHMARKS.jitMode.p95Total);
    const stages = [
        {
            label: "Directory Walk",
            value: VERIFIED_BENCHMARKS.stageBreakdown.directoryWalkP95,
        },
        {
            label: "Path Scoring",
            value: VERIFIED_BENCHMARKS.stageBreakdown.pathScoringP95,
        },
        {
            label: "Ripgrep Scan",
            value: VERIFIED_BENCHMARKS.stageBreakdown.ripgrepScanP95,
        },
        {
            label: "Candidate Selection",
            value: VERIFIED_BENCHMARKS.stageBreakdown.candidateSelectionP95,
        },
        {
            label: "Embedding",
            value: VERIFIED_BENCHMARKS.stageBreakdown.embeddingP95,
        },
        {
            label: "Ranking",
            value: VERIFIED_BENCHMARKS.stageBreakdown.rankingP95,
        },
    ];

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
                            {VERIFIED_BENCHMARKS.cacheMode.p95Total}
                        </p>
                        <p className="text-sm text-content-muted">P95 Total (Cache)</p>
                        <p className="text-xs text-brand-teal mt-2">Warm Embedding Cache</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="bg-surface-1 rounded-2xl border border-white/5 p-6 text-center"
                    >
                        <p className="text-4xl font-bold text-white mb-1">
                            {VERIFIED_BENCHMARKS.jitMode.p95Total}
                        </p>
                        <p className="text-sm text-content-muted">P95 Total (JIT)</p>
                        <p className="text-xs text-brand-teal mt-2">No Persistent Index</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                        className="bg-surface-1 rounded-2xl border border-white/5 p-6 text-center"
                    >
                        <p className="text-4xl font-bold text-white mb-1">
                            {VERIFIED_BENCHMARKS.cacheMode.hitRate}
                        </p>
                        <p className="text-sm text-content-muted">Cache Hit Rate</p>
                        <p className="text-xs text-brand-teal mt-2">Warm Cache Runs</p>
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
                        Search Pipeline Breakdown (P95, JIT)
                    </h3>
                    <div className="space-y-4">
                        {stages.map((stage) => (
                            <StageBar
                                key={stage.label}
                                label={stage.label}
                                value={stage.value}
                                percentage={
                                    totalMs > 0
                                        ? Math.min((parseMs(stage.value) / totalMs) * 100, 100)
                                        : 0
                                }
                            />
                        ))}
                        <StageBar
                            label="Total (JIT)"
                            value={VERIFIED_BENCHMARKS.jitMode.p95Total}
                            percentage={100}
                            highlight
                        />
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
