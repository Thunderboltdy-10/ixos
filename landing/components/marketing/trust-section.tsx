"use client";

import { motion } from "framer-motion";
import { Shield, Eye, Sliders, FileCheck } from "lucide-react";

const TRUST_POINTS = [
    {
        icon: Shield,
        title: "Offline-first",
        description: "Your files never leave your device. Zero network calls during search. Works without internet.",
    },
    {
        icon: Eye,
        title: "Explainable matches",
        description: "See why each result matched. Score breakdowns, matched passages, and relevance explanations.",
    },
    {
        icon: Sliders,
        title: "User control",
        description: "Choose your mode: Flash for speed, Auto for balance, Pro for accuracy. You decide.",
    },
    {
        icon: FileCheck,
        title: "No tracking",
        description: "No telemetry, no analytics, no usage data. We literally can't see what you search for.",
    },
];

export function TrustSection() {
    return (
        <section className="py-24 relative">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-16">
                    <span className="inline-block py-1 px-3 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium mb-4">
                        Trust & Control
                    </span>
                    <h2 className="text-3xl md:text-5xl font-bold font-display mb-4 text-white">
                        Your Files, Your Rules
                    </h2>
                    <p className="text-content-secondary max-w-2xl mx-auto text-lg">
                        Privacy isn't a feature, it's the architecture.
                    </p>
                </div>

                {/* Trust Grid */}
                <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                    {TRUST_POINTS.map((point, index) => (
                        <motion.div
                            key={point.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="flex gap-4 p-6 rounded-2xl bg-surface-1/50 border border-white/5"
                        >
                            {/* Icon */}
                            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                                <point.icon className="w-6 h-6 text-green-400" />
                            </div>

                            {/* Content */}
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-1">
                                    {point.title}
                                </h3>
                                <p className="text-content-secondary text-sm leading-relaxed">
                                    {point.description}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
