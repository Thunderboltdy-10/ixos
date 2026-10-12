"use client";

import { useRef } from "react";
import { useScroll, useTransform, motion } from "framer-motion";
import { FadeInView } from "@/components/effects/FadeInView";
import { CornerBrackets } from "@/components/effects/CornerBrackets";
import { Database, Network, SearchCode } from "lucide-react";

const STEPS = [
  {
    num: "01",
    id: "scan",
    title: "Index",
    desc: "Choose locations. Ixos discovers code, text, PDFs and Office files while honoring ignore rules.",
    color: "#F6B94C",
    icon: Database,
  },
  {
    num: "02",
    id: "map",
    title: "Map",
    desc: "A static embedding model represents meaning. Compact records live in file metadata or the application cache.",
    color: "#F6B94C",
    icon: Network,
  },
  {
    num: "03",
    id: "find",
    title: "Find",
    desc: "Search with words or concepts. Open a ranked file and inspect the selected snippet and line numbers.",
    color: "#F6B94C",
    icon: SearchCode,
  },
];

export function HowItWorksSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 80%", "end 20%"],
  });

  // Calculate length for the animated drawing
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section
      id="how-it-works"
      className="relative z-10 py-32 px-6 overflow-hidden"
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(246,185,76,0.02),transparent)] pointer-events-none" />

      <div className="max-w-6xl mx-auto" ref={containerRef}>
        <FadeInView direction="up">
          <div className="text-center mb-24">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-amber-500/80 mb-4 font-bold">
              ▸ The Pipeline
            </p>
            <h2
              className="text-3xl md:text-5xl font-semibold font-display text-white"
              style={{ letterSpacing: "-0.02em", lineHeight: 1.1 }}
            >
              Three steps to local search.
            </h2>
          </div>
        </FadeInView>

        <div className="relative">
          {/* Desktop SVG Pipeline */}
          <div className="hidden md:block absolute top-[48px] left-[16.6%] right-[16.6%] h-[2px] pointer-events-none z-0">
            <svg
              width="100%"
              height="2"
              className="overflow-visible absolute top-0 left-0"
            >
              <line
                x1="0"
                y1="1"
                x2="100%"
                y2="1"
                stroke="rgba(246,185,76,0.15)"
                strokeWidth="1"
                strokeDasharray="4 6"
              />
              <motion.line
                x1="0"
                y1="1"
                x2="100%"
                y2="1"
                stroke="rgba(246,185,76,0.5)"
                strokeWidth="1"
                style={{ pathLength }}
              />
            </svg>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-0 relative z-10">
            {STEPS.map((step, i) => {
              const Icon = step.icon;

              return (
                <FadeInView key={step.id} direction="up" delay={i * 200}>
                  <div className="flex flex-col items-center">
                    {/* Node */}
                    <div className="relative w-24 h-24 mb-6 bg-[#0A0D14] flex flex-col items-center justify-center group overflow-hidden z-10">
                      <CornerBrackets size={12} color="rgba(246,185,76,0.3)" />
                      <Icon
                        className="w-8 h-8 mb-2 transition-transform duration-500 group-hover:scale-110"
                        style={{ color: step.color }}
                      />
                      <span className="font-mono text-[9px] font-bold tracking-[0.2em] text-white/50 group-hover:text-white/90 transition-colors uppercase">
                        STAGE_0{i + 1}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="text-center max-w-[260px]">
                      <h3 className="text-xl font-bold font-mono mb-3 text-amber-500">
                        {step.title}
                      </h3>
                      <p className="text-[12px] text-white/50 leading-relaxed font-mono px-2">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                </FadeInView>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
