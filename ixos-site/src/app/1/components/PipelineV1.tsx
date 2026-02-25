"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { FileSearch, Sparkles, Layers, Cpu } from "lucide-react";

const STAGES = [
  {
    icon: FileSearch,
    title: "Input Parser",
    load: "0.2ms",
    desc: "Extracts lexical intent & path filters",
  },
  {
    icon: Sparkles,
    title: "Ralph Embedder",
    load: "12ms",
    desc: "Projects semantic vector via ONNX Runtime",
  },
  {
    icon: Layers,
    title: "JIT Tree Sweep",
    load: "8ms",
    desc: "Parallel disk read (SIMD accelerated)",
  },
  {
    icon: Cpu,
    title: "Fusion Ranker",
    load: "4ms",
    desc: "Calculates Lexical + Semantic dot products",
  },
];

export function PipelineV1() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section
      ref={sectionRef}
      className="py-32 bg-[#0A0D14] border-b border-white/5"
    >
      <SectionDivider accent="amber" label="SEARCH_ARCHITECTURE" />

      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-16 items-start">

          {/* Left */}
          <motion.div
            className="max-w-md w-full"
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl md:text-5xl font-display font-bold text-fg-porcelain leading-[1.05] mb-6">
              The search
              <br />
              <span className="text-accent-amber italic">architecture.</span>
            </h2>
            <p className="font-mono text-fg-muted leading-relaxed mb-6">
              Every query dispatches the same four-stage pipeline. Deterministic. Measurable. Under 30ms.
            </p>
            <div className="p-4 bg-bg-graphite-1 border-l-2 border-l-accent-amber font-mono text-xs text-fg-porcelain/80 leading-relaxed">
              The pipeline runs entirely in your RAM. Nothing persists.
            </div>
          </motion.div>

          {/* Right: Pipeline nodes */}
          <div className="flex-1 w-full relative">
            {/* Vertical connecting line */}
            <div className="absolute left-[28px] top-[28px] bottom-[28px] w-0.5 bg-white/5" />

            {/* Animated particle */}
            <motion.div
              className="absolute left-[28px] -translate-x-1/2 w-1.5 h-6 bg-accent-amber rounded-full z-10"
              animate={{ top: ["0%", "100%", "0%"] }}
              transition={{ duration: 4, ease: "linear", repeat: Infinity }}
            />

            <div className="flex flex-col gap-6 relative z-20">
              {STAGES.map((stage, index) => {
                const Icon = stage.icon;
                return (
                  <motion.div
                    key={stage.title}
                    initial={{ opacity: 0, x: 20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="flex items-start gap-6 group"
                  >
                    {/* Icon box */}
                    <div className="w-14 h-14 bg-[#0A0D14] border-2 border-white/10 flex items-center justify-center shrink-0 transition-colors group-hover:border-accent-amber/40">
                      <Icon className="w-6 h-6 text-fg-muted transition-colors group-hover:text-accent-amber" />
                    </div>

                    {/* Card */}
                    <div className="flex-1 bg-bg-graphite-1 border border-white/5 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-3 mb-1.5">
                          <span className="font-mono text-[10px] text-accent-amber bg-accent-amber/10 px-1.5 py-0.5 uppercase tracking-widest border border-accent-amber/20">
                            STAGE 0{index + 1}
                          </span>
                          <h4 className="font-display text-xl text-fg-porcelain font-medium">
                            {stage.title}
                          </h4>
                        </div>
                        <p className="font-mono text-xs text-fg-muted">{stage.desc}</p>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="font-mono text-[10px] text-fg-muted uppercase tracking-widest mb-1">
                          Execution Time
                        </span>
                        <span className="font-mono text-sm text-fg-porcelain font-semibold">
                          {stage.load}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
