"use client";

import { motion } from "framer-motion";
import { Database, SearchCode, ShieldAlert, Cpu } from "lucide-react";

export function GridFeatures() {
    const features = [
        {
            icon: Database,
            title: "Zero Index Tax",
            desc: "Instant JIT memory sweeps. Ixos never builds a bloated persistent index on your disk. It accesses, ranks, and wipes."
        },
        {
            icon: SearchCode,
            title: "Semantic & Lexical",
            desc: "Pro mode fuses sparse keyword matching with dense local vector embeddings for absolute precision across your codebase."
        },
        {
            icon: ShieldAlert,
            title: "Execution Isolation",
            desc: "No cloud telemetry. No external API calls. Your files stay exactly where they are: local, secure, untouched."
        },
        {
            icon: Cpu,
            title: "Metal Optimization",
            desc: "Written in Rust. Parallel file I/O via Rayon. Distilled Model2Vec encoders maximizing your Apple Silicon or CUDA cores."
        }
    ];

    return (
        <section id="features" className="border-b border-white/20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                {features.map((f, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                        className="p-8 md:p-12 lg:p-16 border-b md:border-b-0 lg:border-b-0 lg:border-r border-white/20 last:border-b-0 last:border-r-0 hover:bg-white/5 transition-colors group"
                    >
                        <div className="w-16 h-16 rounded-sm border border-white/20 bg-[#161B22] flex items-center justify-center mb-12 group-hover:border-[#F6B94C] transition-colors">
                            <f.icon className="w-8 h-8 text-white group-hover:text-[#F6B94C] transition-colors" />
                        </div>

                        <h3 className="text-2xl font-bold font-display text-white mb-6 uppercase tracking-tighter">
                            {f.title}
                        </h3>

                        <p className="font-mono text-sm text-white/50 leading-relaxed">
                            {f.desc}
                        </p>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
