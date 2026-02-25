"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { SectionDivider } from "@/components/ui/SectionDivider";

type FAQItem = {
  id: string;
  q: string;
  a: string;
};

const FAQS: FAQItem[] = [
  {
    id: "f1",
    q: "How does Ixos differ from traditional search tools?",
    a: "Unlike tools that build massive persistent daemon indices on your disk, Ixos uses Just-In-Time (JIT) memory sweeps. It only evaluates files when you search, utilizing SIMD instructions to parallelize the read across your CPU cores. This means zero background CPU usage and zero wasted disk space.",
  },
  {
    id: "f2",
    q: "What data is sent to the cloud?",
    a: "Absolutely nothing. Ixos runs 100% locally on your machine. We do not collect telemetry, we do not require an account to use the core search engine, and your file contents never leave your device. The Pro sync feature is strictly opt-in and only syncs your Workstream metadata — never file contents.",
  },
  {
    id: "f3",
    q: "How is 'Ranked Context' calculated?",
    a: "We combine lexical path matching with a lightweight local embedding model (Ralph). When you search, Ixos maps your intent into vector space and compares it against the transient memory sweep, scoring relevance based on both semantic meaning and recent file activity (like git commits or saves).",
  },
  {
    id: "f4",
    q: "Do I need the Pro plan to use Ask Mode?",
    a: "Yes. While the core blazingly-fast semantic search is free forever, Ask Mode (which uses a local generative model to synthesize answers from your retrieved context) requires Ixos Pro. Pro also unlocks multi-device synchronization of your Workstreams and removes the 142k file index limit.",
  },
  {
    id: "f5",
    q: "Is the desktop app the same as the CLI?",
    a: "Yes and no. The desktop app bundles the same Rust core binary underneath — identical search quality and performance. The difference is the interaction layer: the desktop overlay gives you a floating window you can summon with Alt+Space, with keyboard navigation and a richer results view. The CLI is ideal for scripting, piping JSON, and terminal-native workflows. Both are included for free.",
  },
  {
    id: "f6",
    q: "How does Ixos handle encrypted files?",
    a: "Ixos only reads files that your user account has permission to access through the standard OS filesystem API — the same permissions that apply to any other application. It does not attempt to decrypt encrypted volumes, BitLocker drives, or GPG-encrypted files. If a file cannot be read by your OS process, Ixos skips it silently and excludes it from results.",
  },
];

function FAQRow({
  faq,
  index,
  isInView,
}: {
  faq: FAQItem;
  index: number;
  isInView: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: 0.1 + index * 0.08 }}
      className="relative border-b border-white/10 last:border-b-0"
    >
      {/* Left active indicator */}
      <div
        className={`absolute left-0 top-[28px] -translate-x-px w-0.5 h-6 transition-colors duration-300 ${
          open ? "bg-accent-amber" : "bg-transparent"
        }`}
      />

      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-6 py-6 flex items-center justify-between gap-4 group hover:bg-white/[0.01] transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <span
            className={`font-mono text-[10px] uppercase tracking-widest shrink-0 transition-colors duration-200 ${
              open ? "text-accent-amber" : "text-accent-amber"
            }`}
          >
            Q{String(index + 1).padStart(2, "0")}
          </span>
          <h3
            className={`text-base font-display font-medium tracking-wide transition-colors duration-200 ${
              open
                ? "text-fg-porcelain"
                : "text-fg-porcelain/80 group-hover:text-fg-porcelain"
            }`}
          >
            {faq.q}
          </h3>
        </div>

        <div
          className={`shrink-0 w-6 h-6 border flex items-center justify-center transition-all duration-200 ${
            open
              ? "border-accent-amber/50 bg-accent-amber/10 text-accent-amber"
              : "border-white/10 text-fg-muted group-hover:border-white/20"
          }`}
        >
          <motion.span
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ duration: 0.2 }}
            className="font-mono text-sm leading-none select-none"
          >
            +
          </motion.span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pl-[3.5rem]">
              <p className="font-mono text-sm text-fg-muted leading-relaxed">
                {faq.a}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FAQV1() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      className="py-32 bg-[#0A0D14] border-b border-white/5"
    >
      <SectionDivider accent="amber" label="KNOWLEDGE_BASE" />

      <div className="container mx-auto px-6 max-w-4xl">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-display font-bold text-fg-porcelain tracking-tight mb-4">
            Common
            <br />
            <span className="text-accent-amber italic">questions.</span>
          </h2>
          <p className="font-mono text-fg-muted max-w-xl">
            Common questions about how Ixos works under the hood.
          </p>
        </motion.div>

        <div className="border border-white/10 bg-bg-graphite-1/20 overflow-hidden">
          {FAQS.map((faq, index) => (
            <FAQRow
              key={faq.id}
              faq={faq}
              index={index}
              isInView={isInView}
            />
          ))}
        </div>

      </div>
    </section>
  );
}
