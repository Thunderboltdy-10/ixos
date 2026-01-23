"use client";

import { motion } from "framer-motion";
import { Search, Clock, Eye, X } from "lucide-react";

const PROBLEMS = [
    {
        icon: Search,
        title: "Misses meaning",
        description: "OS search only matches exact keywords. Search for 'budget report' and miss 'Q1_financial_summary.xlsx'.",
    },
    {
        icon: Clock,
        title: "Slow indexing",
        description: "Background indexers consume resources. Large folders take hours to index, then break on updates.",
    },
    {
        icon: Eye,
        title: "Privacy concerns",
        description: "Cloud-powered search uploads your files. Microsoft Recall screenshots everything. Your data leaves your device.",
    },
];

export function ProblemSection() {
    return (
        <section className="py-24 relative">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-16">
                    <span className="inline-block py-1 px-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium mb-4">
                        The Problem
                    </span>
                    <h2 className="text-3xl md:text-5xl font-bold font-display mb-4 text-white">
                        Modern Search is Broken
                    </h2>
                    <p className="text-content-secondary max-w-2xl mx-auto text-lg">
                        Your files deserve better than keyword matching and cloud surveillance.
                    </p>
                </div>

                {/* Problem Cards */}
                <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {PROBLEMS.map((problem, index) => (
                        <motion.div
                            key={problem.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="relative p-6 rounded-2xl bg-surface-1/50 border border-white/5"
                        >
                            {/* X mark */}
                            <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center">
                                <X className="w-3 h-3 text-red-400" />
                            </div>

                            {/* Icon */}
                            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
                                <problem.icon className="w-6 h-6 text-red-400" />
                            </div>

                            {/* Content */}
                            <h3 className="text-xl font-semibold text-white mb-2">
                                {problem.title}
                            </h3>
                            <p className="text-content-secondary text-sm leading-relaxed">
                                {problem.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
