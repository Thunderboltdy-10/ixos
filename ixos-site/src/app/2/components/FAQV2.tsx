"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { Plus, Minus } from "lucide-react";

const FAQS = [
    { id: "f1", q: "How does Ixos differ from traditional search tools?", a: "Unlike tools that build massive persistent daemon indices on your disk, Ixos uses Just-In-Time (JIT) memory sweeps. It only evaluates files when you search, utilizing SIMD instructions to parallelize the read across your CPU cores. This means zero background CPU usage and zero wasted disk space." },
    { id: "f2", q: "What data is sent to the cloud?", a: "Absolutely nothing. Ixos runs 100% locally on your machine. We do not collect telemetry, we do not require an account to use the core search engine, and your file contents never leave your device." },
    { id: "f3", q: "How is 'Ranked Context' calculated?", a: "We combine lexical path matching with a lightweight local embedding model (Ralph). When you search, Ixos maps your intent into vector space and compares it against the transient memory sweep, scoring relevance based on both semantic meaning and recent file activity." },
    { id: "f4", q: "Do I need the Pro plan to use Ask Mode?", a: "Yes. While the core blazingly-fast semantic search is free forever, Ask Mode (which uses a local generative model to synthesize answers from your retrieved context) requires Ixos Pro. Pro also unlocks multi-device synchronization of your Workstreams." },
    { id: "f5", q: "Is the desktop app the same as the CLI?", a: "Yes and no. Both ship the same Rust core binary, so search performance is identical. The desktop app adds a native overlay GUI accessible via hotkey, a visual workstreams browser, and Ask Mode. The CLI is for terminal-first workflows and scriptability." },
    { id: "f6", q: "Can I use Ixos in CI pipelines?", a: "Yes. Ixos is a standard binary that accepts stdin and outputs JSON. You can pipe it, script it, and integrate it into any CI system. The --format json flag makes it trivially parseable by jq, Python, or any scripting language." },
];

function FAQItem({ item, index }: { item: typeof FAQS[number]; index: number }) {
    const [open, setOpen] = useState(false);
    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: index * 0.06 }}
            className="border-b border-white/10"
        >
            <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-4 py-6 text-left group">
                <div className="flex items-start gap-4">
                    <span className="font-mono text-[10px] text-accent-teal uppercase tracking-widest shrink-0 mt-1">Q{index + 1}</span>
                    <h3 className="font-display text-lg text-fg-porcelain group-hover:text-accent-teal transition-colors">{item.q}</h3>
                </div>
                <div className="shrink-0 w-6 h-6 flex items-center justify-center border border-white/20 group-hover:border-accent-teal/50 transition-colors">
                    {open ? <Minus className="w-3 h-3 text-accent-teal" /> : <Plus className="w-3 h-3 text-fg-muted group-hover:text-accent-teal transition-colors" />}
                </div>
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <p className="font-mono text-sm text-fg-muted leading-relaxed pb-6 pl-10 max-w-3xl">{item.a}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export function FAQV2() {
    return (
        <section className="relative py-32 bg-[#0A0D14] border-b border-white/5">
            <SectionDivider accent="amber" label="KNOWLEDGE_BASE" />
            <div className="container mx-auto px-6 max-w-4xl">
                <div className="mb-16">
                    <h2 className="text-4xl md:text-5xl font-display font-medium text-fg-porcelain tracking-tight mb-4">
                        System <span className="bg-gradient-to-r from-accent-teal to-accent-amber bg-clip-text text-transparent italic">specifications.</span>
                    </h2>
                    <p className="font-mono text-fg-muted">Common questions about architecture, privacy, and developer integration.</p>
                </div>
                <div className="flex flex-col">
                    {FAQS.map((faq, i) => <FAQItem key={faq.id} item={faq} index={i} />)}
                </div>
            </div>
        </section>
    );
}
