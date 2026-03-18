"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { FadeInView } from "@/components/effects/FadeInView";
import { CornerBrackets } from "@/components/effects/CornerBrackets";

const PROOF_PILLS = [
  { label: "Zero cloud sync", icon: "⊘" },
  { label: "No telemetry", icon: "◈" },
  { label: "No API keys", icon: "◇" },
];

export function PrivacyTrustSection() {
  const barRef = useRef<HTMLDivElement>(null);
  const barInView = useInView(barRef, { once: true, margin: "-80px" });

  return (
    <section id="privacy" className="relative z-10 py-28 px-6">
      <div className="max-w-5xl mx-auto">
        <FadeInView direction="up">
          <div className="relative p-10 md:p-16 border border-amber-400/15 bg-amber-400/[0.02]">
            <CornerBrackets size={20} color="rgba(246,185,76,0.2)" />

            {/* Ambient glow */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                width: "60%",
                height: 200,
                background: "radial-gradient(ellipse, rgba(246,185,76,0.06) 0%, transparent 70%)",
              }}
            />

            <div className="relative z-10">
              {/* Bold statement */}
              <h2
                className="text-3xl md:text-5xl lg:text-6xl font-semibold font-display text-white text-center mb-6"
                style={{ letterSpacing: "-0.02em", lineHeight: 1.08 }}
              >
                Your data{" "}
                <span className="heading-gradient-amber">never</span>{" "}
                leaves your computer.
              </h2>

              {/* Proof pills */}
              <div className="flex flex-wrap justify-center gap-3 mb-12">
                {PROOF_PILLS.map((pill) => (
                  <div
                    key={pill.label}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-amber-400/20 bg-amber-400/[0.04] text-sm text-amber-400/70 font-mono"
                  >
                    <span className="text-amber-400/40">{pill.icon}</span>
                    {pill.label}
                  </div>
                ))}
              </div>

              {/* Comparison bar */}
              <div ref={barRef} className="max-w-2xl mx-auto space-y-5">
                {/* Cloud */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1.5">
                    <span className="text-white/40 uppercase tracking-widest">
                      Cloud Search
                    </span>
                    <span className="text-red-400">~2.4 GB / month</span>
                  </div>
                  <div className="h-2.5 bg-white/5 overflow-hidden relative">
                    <motion.div
                      className="h-full bg-gradient-to-r from-red-500/60 to-red-500/80 absolute left-0 top-0"
                      initial={{ width: "0%" }}
                      animate={barInView ? { width: "100%" } : {}}
                      transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
                    />
                  </div>
                  <div className="mt-1 text-[10px] font-mono text-white/20 uppercase tracking-widest">
                    Files indexed on remote servers. Queries logged. Architecture exposed.
                  </div>
                </div>

                {/* Ixos */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1.5">
                    <span className="text-amber-400 uppercase tracking-widest">
                      Ixos
                    </span>
                    <span className="text-amber-400">0 B</span>
                  </div>
                  <div className="h-2.5 bg-white/5 overflow-hidden relative">
                    <div className="h-full w-0 bg-amber-400" />
                  </div>
                  <div className="mt-1 text-[10px] font-mono text-amber-400/40 uppercase tracking-widest">
                    Zero bytes transmitted. Zero telemetry. Zero trust required.
                  </div>
                </div>
              </div>

              {/* ASCII box */}
              <div className="mt-8 text-center font-mono text-[11px] text-white/12 leading-relaxed">
                <div>┌──────────────────────────────────────────────────────────┐</div>
                <div>│  IXOS SENDS: 0 bytes.  Every search stays on your SSD.  │</div>
                <div>└──────────────────────────────────────────────────────────┘</div>
              </div>
            </div>
          </div>
        </FadeInView>
      </div>
    </section>
  );
}
