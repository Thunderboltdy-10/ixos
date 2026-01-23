"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FEATURES } from "@/lib/constants";
import { Zap, Sparkles, WifiOff, FileSearch, Database, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
    zap: Zap,
    sparkles: Sparkles,
    "wifi-off": WifiOff,
    "file-search": FileSearch,
    database: Database,
    lock: Lock,
};

export function FeaturesGrid() {
    const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
    const selected = FEATURES.find((f) => f.id === selectedFeature);

    return (
        <section className="py-24 relative" id="features">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-16">
                    <span className="inline-block py-1 px-3 rounded-full bg-brand-teal/10 border border-brand-teal/20 text-brand-teal text-sm font-medium mb-4">
                        Features
                    </span>
                    <h2 className="text-3xl md:text-5xl font-bold font-display mb-4 text-white">
                        Built for Speed & Privacy
                    </h2>
                    <p className="text-content-secondary max-w-2xl mx-auto text-lg">
                        Real software, real performance. Click a feature to learn more.
                    </p>
                </div>

                {/* Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    {FEATURES.map((feature, index) => {
                        const Icon = ICONS[feature.icon as keyof typeof ICONS] || Zap;
                        const isSelected = selectedFeature === feature.id;

                        return (
                            <motion.button
                                key={feature.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                onClick={() => setSelectedFeature(isSelected ? null : feature.id)}
                                className={cn(
                                    "relative p-6 rounded-2xl border text-left transition-all duration-300 group",
                                    isSelected
                                        ? "bg-brand-teal/10 border-brand-teal/50 shadow-[0_0_30px_rgba(13,148,136,0.15)]"
                                        : "bg-surface-1/50 border-white/5 hover:border-white/10 hover:bg-surface-1"
                                )}
                            >
                                {/* Icon */}
                                <div className={cn(
                                    "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors",
                                    isSelected
                                        ? "bg-brand-teal text-white"
                                        : "bg-surface-2 text-brand-teal group-hover:bg-brand-teal/10"
                                )}>
                                    <Icon className="w-6 h-6" />
                                </div>

                                {/* Title + Subtitle */}
                                <h3 className="text-xl font-semibold text-white mb-1">
                                    {feature.title}
                                </h3>
                                <p className={cn(
                                    "text-sm font-mono mb-3 transition-colors",
                                    isSelected ? "text-brand-teal" : "text-content-muted"
                                )}>
                                    {feature.subtitle}
                                </p>

                                {/* Description */}
                                <p className="text-content-secondary text-sm leading-relaxed">
                                    {feature.description}
                                </p>

                                {/* Selected indicator */}
                                {isSelected && (
                                    <motion.div
                                        layoutId="feature-indicator"
                                        className="absolute -bottom-px left-6 right-6 h-0.5 bg-brand-teal"
                                    />
                                )}
                            </motion.button>
                        );
                    })}
                </div>

                {/* Feature Spotlight */}
                <AnimatePresence mode="wait">
                    {selected && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="mt-12 max-w-4xl mx-auto"
                        >
                            <div className="bg-surface-1 rounded-2xl border border-brand-teal/20 p-8">
                                <div className="flex items-start gap-6">
                                    <div className="w-16 h-16 rounded-2xl bg-brand-teal/10 flex items-center justify-center flex-shrink-0">
                                        {(() => {
                                            const Icon = ICONS[selected.icon as keyof typeof ICONS] || Zap;
                                            return <Icon className="w-8 h-8 text-brand-teal" />;
                                        })()}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-white mb-2">
                                            {selected.title}
                                        </h3>
                                        <p className="text-brand-teal font-mono text-sm mb-4">
                                            {selected.subtitle}
                                        </p>
                                        <p className="text-content-secondary leading-relaxed">
                                            {selected.description}
                                        </p>

                                        {/* Feature-specific details */}
                                        {selected.id === "flash-mode" && (
                                            <div className="mt-6 grid grid-cols-3 gap-4">
                                                <div className="bg-surface-0 rounded-lg p-4 text-center">
                                                    <p className="text-2xl font-bold text-white">181ms</p>
                                                    <p className="text-xs text-content-muted">P50 Latency</p>
                                                </div>
                                                <div className="bg-surface-0 rounded-lg p-4 text-center">
                                                    <p className="text-2xl font-bold text-white">0.766</p>
                                                    <p className="text-xs text-content-muted">MRR@10</p>
                                                </div>
                                                <div className="bg-surface-0 rounded-lg p-4 text-center">
                                                    <p className="text-2xl font-bold text-white">500x</p>
                                                    <p className="text-xs text-content-muted">vs Transformers</p>
                                                </div>
                                            </div>
                                        )}
                                        {selected.id === "auto-mode" && (
                                            <div className="mt-6 grid grid-cols-3 gap-4">
                                                <div className="bg-surface-0 rounded-lg p-4 text-center">
                                                    <p className="text-2xl font-bold text-white">0.883</p>
                                                    <p className="text-xs text-content-muted">MRR@10</p>
                                                </div>
                                                <div className="bg-surface-0 rounded-lg p-4 text-center">
                                                    <p className="text-2xl font-bold text-white">0.33</p>
                                                    <p className="text-xs text-content-muted">Semantic Weight</p>
                                                </div>
                                                <div className="bg-surface-0 rounded-lg p-4 text-center">
                                                    <p className="text-2xl font-bold text-white">0.67</p>
                                                    <p className="text-xs text-content-muted">Lexical Weight</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
}
