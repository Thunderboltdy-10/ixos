"use client";

import { motion } from "framer-motion";

export function StatCounters() {
    const stats = [
        { num: "29", unit: "ms", label: "Ranked TTFR" },
        { num: "194", unit: "mb", label: "Peak RAM Usage" },
        { num: "0", unit: "kb", label: "Cloud Upload" }
    ];

    return (
        <section id="stats" className="border-b border-white/20 bg-[#F6B94C] text-[#0E1117] overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3">
                {stats.map((s, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                        className="p-12 md:p-24 border-b md:border-b-0 md:border-r border-[#0E1117]/20 last:border-b-0 last:border-r-0 flex flex-col items-center text-center hover:bg-[#0E1117] hover:text-[#F6B94C] transition-colors group"
                    >
                        <div className="text-8xl lg:text-[10rem] font-bold font-display tracking-tighter leading-none mb-4 group-hover:scale-105 transition-transform">
                            {s.num}<span className="text-3xl lg:text-6xl text-[#0E1117]/50 group-hover:text-[#F6B94C]/50 transition-colors uppercase ml-1">{s.unit}</span>
                        </div>
                        <div className="font-mono text-sm uppercase tracking-widest font-bold border-t border-current pt-4 w-full">
                            {s.label}
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
