"use client";

import { motion } from "framer-motion";
import { Check, ExternalLink } from "lucide-react";
import { PRICING_TIERS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function PricingPage() {
    return (
        <div className="min-h-screen bg-surface-0 pt-24 pb-16">
            {/* Background */}
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(13,148,136,0.1)_0%,rgba(10,10,15,0)_50%)] pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10">
                {/* Header */}
                <div className="text-center mb-16">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-5xl font-display font-bold text-white mb-4"
                    >
                        Simple, Transparent Pricing
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-content-secondary text-lg max-w-2xl mx-auto"
                    >
                        Start free, upgrade when you need more. No hidden fees, no per-seat pricing games.
                    </motion.p>
                </div>

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {PRICING_TIERS.map((tier, index) => (
                        <motion.div
                            key={tier.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={cn(
                                "relative rounded-2xl border p-8",
                                tier.popular
                                    ? "bg-gradient-to-b from-brand-teal/10 to-transparent border-brand-teal/30 shadow-[0_0_40px_rgba(13,148,136,0.1)]"
                                    : "bg-surface-1/50 border-white/5"
                            )}
                        >
                            {tier.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                    <span className="bg-brand-teal text-surface-0 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                                        Most Popular
                                    </span>
                                </div>
                            )}

                            {/* Tier Info */}
                            <div className="mb-8">
                                <h2 className="text-xl font-semibold text-white mb-2">
                                    {tier.name}
                                </h2>
                                <div className="flex items-baseline gap-1 mb-2">
                                    <span className="text-4xl font-bold text-white">{tier.price}</span>
                                    {tier.period && (
                                        <span className="text-content-muted">{tier.period}</span>
                                    )}
                                </div>
                                <p className="text-content-secondary text-sm">
                                    {tier.description}
                                </p>
                            </div>

                            {/* Features */}
                            <ul className="space-y-4 mb-8">
                                {tier.features.map((feature, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm">
                                        <Check className="w-5 h-5 text-brand-teal flex-shrink-0 mt-0.5" />
                                        <span className="text-content-secondary">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* CTA */}
                            {tier.name === "Free" && (
                                <a
                                    href="/download"
                                    className="flex items-center justify-center gap-2 w-full py-3 px-4 border border-white/10 text-white rounded-xl font-medium hover:bg-surface-2 transition-colors"
                                >
                                    {tier.cta}
                                </a>
                            )}
                            {tier.name === "Pro" && (
                                <a
                                    href="#" // Replace with Lemon Squeezy checkout URL
                                    className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-brand-teal text-white rounded-xl font-medium hover:bg-brand-teal/90 transition-colors"
                                >
                                    {tier.cta}
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            )}
                            {tier.name === "Team" && (
                                <a
                                    href="mailto:team@ixos.app"
                                    className="flex items-center justify-center gap-2 w-full py-3 px-4 border border-white/10 text-white rounded-xl font-medium hover:bg-surface-2 transition-colors"
                                >
                                    {tier.cta}
                                </a>
                            )}
                        </motion.div>
                    ))}
                </div>

                {/* FAQ Teaser */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mt-16 text-center"
                >
                    <p className="text-content-secondary mb-4">
                        Have questions about pricing?
                    </p>
                    <a
                        href="/#faq"
                        className="text-brand-teal hover:text-brand-teal/80 font-medium transition-colors"
                    >
                        Check our FAQ →
                    </a>
                </motion.div>

                {/* Guarantee */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-12 max-w-2xl mx-auto"
                >
                    <div className="bg-surface-1 rounded-2xl border border-white/5 p-6 text-center">
                        <h3 className="text-lg font-semibold text-white mb-2">
                            30-Day Money-Back Guarantee
                        </h3>
                        <p className="text-content-secondary text-sm">
                            Try Pro risk-free. If you're not happy for any reason, we'll refund your purchase within 30 days. No questions asked.
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
