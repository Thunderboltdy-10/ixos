"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/glass-card";
import { ShieldCheck, Scale, Lock } from "lucide-react";
import { SectionHeader } from "@/components/section-header";

export function ComplianceSection() {
    return (
        <section className="py-24 relative overflow-hidden">
            <div className="container mx-auto px-4 text-center">

                <SectionHeader
                    label="Trust & Safety"
                    title="Built for Compliance"
                    description="Ixos is engineered to meet the strictest global privacy standards."
                />

                <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                    <GlassCard className="text-left group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 bg-gradient-brand rounded-bl-3xl">
                            <Lock className="w-24 h-24" />
                        </div>
                        <div className="w-12 h-12 rounded-full bg-brand-teal/20 flex items-center justify-center text-brand-teal mb-4">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">GDPR Ready</h3>
                        <p className="text-content-secondary text-sm">
                            No personal data is processed on our servers. You remain the sole data controller.
                        </p>
                    </GlassCard>

                    <GlassCard className="text-left bg-gradient-to-br from-brand-blue/20 to-surface-1 border-brand-teal/30">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Scale className="w-24 h-24 rotate-12" />
                        </div>
                        <div className="w-12 h-12 rounded-full bg-brand-purple/20 flex items-center justify-center text-brand-purple mb-4">
                            <Scale className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2 text-white">EU AI Act</h3>
                        <p className="text-content-secondary text-sm">
                            Classified as a general-purpose AI model with systemic risk mitigations fully documented.
                        </p>
                    </GlassCard>

                    <GlassCard className="text-left group">
                        <div className="w-12 h-12 rounded-full bg-brand-cyan/20 flex items-center justify-center text-brand-cyan mb-4">
                            <Lock className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">CCPA Compliant</h3>
                        <p className="text-content-secondary text-sm">
                            Full consumer control over data. Right to deletion is native (just delete your file).
                        </p>
                    </GlassCard>
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="mt-12 inline-flex items-center gap-2 text-sm text-content-muted bg-surface-1/50 px-4 py-2 rounded-full border border-white/5"
                >
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Audit Trail Available for Enterprise Customers
                </motion.div>
            </div>
        </section>
    );
}
