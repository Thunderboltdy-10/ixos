"use client";

import { motion } from "framer-motion";

export function TypoHero() {
    return (
        <section className="pt-16 pb-0 border-b border-white/20">
            <div className="grid grid-cols-1 lg:grid-cols-4">

                {/* Typo Block */}
                <div className="col-span-1 lg:col-span-3 p-8 md:p-16 lg:px-24 border-b lg:border-b-0 lg:border-r border-white/20 flex flex-col justify-center min-h-[70vh]">
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "circOut" }}
                    >
                        <div className="font-mono text-xs text-[#F6B94C] font-bold tracking-widest uppercase mb-12 flex items-center gap-4">
                            <span className="w-12 h-px bg-[#F6B94C]"></span>
                            Local Only
                        </div>

                        <h1 className="text-6xl md:text-8xl lg:text-[7.5rem] font-bold font-display tracking-tighter leading-[0.85] text-white uppercase mb-10">
                            Stop <br />
                            <span className="text-transparent bg-clip-text text-white" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.4)" }}>Paying the</span><br />
                            Index Tax.
                        </h1>

                        <p className="font-mono text-lg text-white/60 max-w-xl leading-relaxed">
                            Traditional semantic searches force you to build persistent, bloated daemon indices. Ixos uses a pure Just-In-Time evaluation. It parses, embeds, and ranks across your entire project instantly, then wipes the memory.
                        </p>
                    </motion.div>
                </div>

                {/* Console Block */}
                <div className="col-span-1 flex flex-col justify-end bg-white/[0.02]">
                    <div className="p-8 border-b border-white/20 h-full flex flex-col justify-center">
                        <h3 className="font-display text-2xl font-bold text-white mb-6 uppercase tracking-tighter">Terminal Command</h3>
                        <div className="font-mono text-sm space-y-4">
                            <div className="text-white/40">// Retrieve actionable intel immediately.</div>
                            <div className="text-white bg-black p-4 border border-white/20 rounded-sm break-all">
                                $ ixos ask "where is the bug in the auth flow?"
                            </div>
                            <div className="text-[#F6B94C] animate-pulse">_</div>
                        </div>
                    </div>
                    <div className="p-8 bg-white hover:bg-[#F6B94C] transition-colors cursor-pointer flex justify-between items-center group">
                        <span className="font-display font-bold text-black uppercase tracking-tighter text-2xl">Execute Download</span>
                        <span className="w-12 h-12 rounded-full border border-black flex items-center justify-center font-bold text-xl group-hover:rotate-45 transition-transform">+</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
