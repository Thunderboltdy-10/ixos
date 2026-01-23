"use client";

import { motion } from "framer-motion";
import { slideUp, staggerContainer } from "@/lib/animations";
import { Card } from "@/components/ui/card";
import { Github, Star, GitBranch, Users } from "lucide-react";
import { SITE_CONFIG } from "@/lib/constants";

const STATS = [
    { label: "GitHub Stars", value: "1.2k+", icon: Star },
    { label: "Commits", value: "850+", icon: GitBranch },
    { label: "Contributors", value: "24", icon: Users },
];

const TESTIMONIALS = [
    {
        quote: "Finally, a search tool that feels like it respects my intelligence and my privacy. Ixos is what Apple Spotlight should have been.",
        author: "Sarah J.",
        role: "Investigative Journalist",
    },
    {
        quote: "The JIT embedding technology is mind-blowing. I can search my entire codebase semantically without a 2GB index file eating my SSD.",
        author: "Alex Chen",
        role: "Senior Rust Developer",
    },
    {
        quote: "Microsoft Recall scared me. Ixos keeps me safe. It works exactly as advertised: fast, local, and zero leakage.",
        author: "Dr. Marcus V.",
        role: "Legal Consultant",
    },
];

export function SocialProof() {
    return (
        <section className="py-24 relative overflow-hidden">
            <div className="container mx-auto px-4">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Left: Stats & Roadmap */}
                    <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                    >
                        <h2 className="text-3xl font-bold mb-8">Community Driven</h2>
                        <div className="grid grid-cols-3 gap-4 mb-12">
                            {STATS.map((stat, index) => {
                                const Icon = stat.icon;
                                return (
                                    <Card key={index} className="text-center p-4 bg-surface-1/30">
                                        <Icon className="w-5 h-5 mx-auto mb-2 text-brand-teal" />
                                        <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                                        <div className="text-xs text-content-muted">{stat.label}</div>
                                    </Card>
                                );
                            })}
                        </div>

                        <div className="bg-surface-1/20 border border-white/5 rounded-xl p-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Github className="w-5 h-5" />
                                Latest from GitHub
                            </h3>
                            <div className="space-y-4">
                                <div className="flex gap-4 items-start">
                                    <div className="w-2 h-2 rounded-full bg-brand-cyan mt-2 shrink-0" />
                                    <p className="text-sm text-content-secondary">
                                        <span className="text-brand-cyan font-mono text-xs mr-2">feat(core):</span>
                                        Implemented SIMD optimizations for cosine similarity checks
                                    </p>
                                </div>
                                <div className="flex gap-4 items-start">
                                    <div className="w-2 h-2 rounded-full bg-brand-purple mt-2 shrink-0" />
                                    <p className="text-sm text-content-secondary">
                                        <span className="text-brand-purple font-mono text-xs mr-2">docs:</span>
                                        Updated EU AI Act compliance manifesto
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right: Testimonials */}
                    <motion.div
                        variants={slideUp}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="grid gap-6"
                    >
                        {TESTIMONIALS.map((t, i) => (
                            <Card key={i} className={`bg-gradient-to-br ${i === 1 ? 'from-surface-2 to-surface-1 border-brand-teal/20' : 'from-surface-1/50 to-surface-1/10'} backdrop-blur-sm`}>
                                <p className="text-lg text-content-primary italic mb-4">"{t.quote}"</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-brand" />
                                    <div>
                                        <div className="font-semibold text-sm text-white">{t.author}</div>
                                        <div className="text-xs text-content-muted">{t.role}</div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
