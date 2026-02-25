"use client";

import { motion } from "framer-motion";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { WifiOff, DatabaseBackup, ShieldAlert, KeyRound } from "lucide-react";

const CARDS = [
    { icon: WifiOff, title: "Air-Gapped Core", desc: "The primary semantic engine and all local embedding models operate entirely offline. No telemetry. No secret remote logging. Zero outbound connections.", iconColor: "group-hover:text-accent-amber", border: "hover:border-accent-amber/40 hover:shadow-glow-amber" },
    { icon: DatabaseBackup, title: "Ephemeral Memory", desc: "Context is generated JIT and immediately destroyed after ranking. No stagnant databases full of sensitive code snippets sitting on your drive.", iconColor: "group-hover:text-accent-teal", border: "hover:border-accent-teal/40 hover:shadow-glow-teal" },
    { icon: ShieldAlert, title: "Open Validation", desc: "The chunking logic and file readers are open source. Audit exactly how we parse your files in real-time. No black boxes, no hidden logic.", iconColor: "group-hover:text-accent-violet", border: "hover:border-accent-violet/40 hover:shadow-glow-violet" },
    { icon: KeyRound, title: "Ed25519 Attestation", desc: "Every search result is cryptographically signed with Ed25519. Verify the integrity of retrieved context at any point in the chain.", iconColor: "group-hover:text-accent-amber", border: "hover:border-accent-amber/40 hover:shadow-glow-amber" },
];

export function TrustV2() {
    return (
        <section className="relative py-32 bg-bg-graphite-0 border-b border-white/5">
            <SectionDivider accent="amber" label="SECURITY_POSTURE" />

            <div className="container mx-auto px-6 max-w-7xl">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-display font-medium text-fg-porcelain tracking-tight mb-4">
                        Zero <span className="bg-gradient-to-r from-accent-amber to-accent-teal bg-clip-text text-transparent italic">compromise.</span>
                    </h2>
                    <p className="font-mono text-fg-muted max-w-2xl mx-auto">
                        Designed with an architecture that inherently precludes data exfiltration. Your code is yours alone.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[1px] bg-white/10 border border-white/10">
                    {CARDS.map((card, i) => {
                        const Icon = card.icon;
                        return (
                            <motion.div
                                key={card.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: i * 0.1 }}
                                className={`bg-[#0A0D14] p-8 flex flex-col items-start group transition-all border border-transparent ${card.border} cursor-default`}
                            >
                                <Icon className={`w-8 h-8 text-fg-muted mb-6 transition-colors ${card.iconColor}`} />
                                <h4 className="font-display text-xl text-fg-porcelain mb-3">{card.title}</h4>
                                <p className="font-mono text-xs text-fg-muted leading-relaxed">{card.desc}</p>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
