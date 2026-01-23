"use client";

import { motion } from "framer-motion";
import { SEARCH_MODES } from "@/lib/verified-benchmarks";
import { Zap, Sparkles, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

const MODE_ICONS = {
    Flash: Zap,
    Auto: Sparkles,
    Pro: Crown,
};

export function ModesSection() {
    return (
        <section className="py-24 relative" id="modes">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-16">
                    <span className="inline-block py-1 px-3 rounded-full bg-brand-teal/10 border border-brand-teal/20 text-brand-teal text-sm font-medium mb-4">
                        Search Modes
                    </span>
                    <h2 className="text-3xl md:text-5xl font-bold font-display mb-4 text-white">
                        Flash / Auto / Pro
                    </h2>
                    <p className="text-content-secondary max-w-2xl mx-auto text-lg">
                        Instant results, then refines when needed. You control the mode.
                    </p>
                </div>

                {/* Mode Cards */}
                <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {SEARCH_MODES.map((mode, index) => {
                        const Icon = MODE_ICONS[mode.name as keyof typeof MODE_ICONS];
                        const isMiddle = index === 1;

                        return (
                            <motion.div
                                key={mode.name}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className={cn(
                                    "relative rounded-2xl border p-8 transition-all duration-300",
                                    isMiddle
                                        ? "bg-gradient-to-b from-brand-teal/10 to-transparent border-brand-teal/30 shadow-[0_0_40px_rgba(13,148,136,0.1)]"
                                        : "bg-surface-1/50 border-white/5 hover:border-white/10"
                                )}
                            >
                                {/* Icon */}
                                <div className={cn(
                                    "w-14 h-14 rounded-2xl flex items-center justify-center mb-6",
                                    isMiddle ? "bg-brand-teal text-white" : "bg-surface-2 text-brand-teal"
                                )}>
                                    <Icon className="w-7 h-7" />
                                </div>

                                {/* Name + Tagline */}
                                <h3 className="text-2xl font-bold text-white mb-1">
                                    {mode.name}
                                </h3>
                                <p className="text-brand-teal text-sm font-medium mb-2">
                                    {mode.tagline}
                                </p>
                                <p className="text-xs text-content-muted mb-4">
                                    {mode.tier}
                                </p>

                                {/* Description */}
                                <p className="text-content-secondary text-sm leading-relaxed mb-6">
                                    {mode.description}
                                </p>

                                {/* Stats */}
                                <div className="space-y-3">
                                    {mode.stats.map((stat) => (
                                        <div
                                            key={stat.label}
                                            className="flex items-center justify-between text-sm"
                                        >
                                            <span className="text-content-muted">{stat.label}</span>
                                            <span className="font-mono text-white">{stat.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Bottom note */}
                <p className="text-center text-content-muted text-sm mt-12">
                    Auto mode shows results instantly, then refines in the background when needed.
                </p>
            </div>
        </section>
    );
}
