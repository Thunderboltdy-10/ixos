"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/glass-card";
import { slideUp, staggerContainer } from "@/lib/animations";
import { Check } from "lucide-react";
import { PRICING_TIERS } from "@/lib/constants";
import { SectionHeader } from "@/components/section-header";

export function PricingSection() {
    return (
        <section className="py-24 relative" id="pricing">
            <div className="container mx-auto px-4">
                <SectionHeader
                    label="Fair Pricing"
                    title="Pay for Power, Not Privacy"
                    description="Clear pricing capabilities. No hidden index storage fees."
                />
            </div>

            <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto"
            >
                {PRICING_TIERS.map((tier, index) => (
                    <motion.div key={index} variants={slideUp} className="relative">
                        {tier.popular && (
                            <div className="absolute -top-4 inset-x-0 flex justify-center z-10">
                                <span className="bg-brand-teal text-surface-0 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                                    Most Popular
                                </span>
                            </div>
                        )}

                        <GlassCard
                            hoverEffect
                            className={`h-full flex flex-col relative border transition-all duration-300 ${tier.popular
                                ? "border-brand-teal/50 bg-gradient-to-b from-brand-teal/10 to-transparent shadow-[0_0_40px_rgba(13,148,136,0.1)]"
                                : "border-white/5 bg-transparent"
                                }`}
                        >
                            <div className="mb-8">
                                <h3 className="text-lg font-medium text-content-primary mb-2">{tier.name}</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-bold text-white">{tier.price}</span>
                                    {tier.period && <span className="text-content-muted text-sm">{tier.period}</span>}
                                </div>
                                <p className="text-content-secondary text-sm mt-4">{tier.description}</p>
                            </div>

                            <div className="flex-grow mb-8 space-y-4">
                                {tier.features.map((feature, i) => (
                                    <div key={i} className="flex items-start gap-3 text-sm text-content-muted">
                                        <Check className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
                                        <span>{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <Button
                                variant={tier.popular ? "primary" : "outline"}
                                className={`w-full ${tier.popular ? 'shadow-lg shadow-brand-teal/20' : ''}`}
                            >
                                {tier.cta}
                            </Button>
                        </GlassCard>
                    </motion.div>
                ))}
            </motion.div>
        </section>
    );
}
