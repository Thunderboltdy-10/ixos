"use client";

import { FadeInView } from "@/components/effects/FadeInView";
import { CornerBrackets } from "@/components/effects/CornerBrackets";

const PROOF_PILLS = [
  { label: "Runs on CPU", icon: "⊘" },
  { label: "Code and documents", icon: "◈" },
  { label: "File metadata cache", icon: "◇" },
];

export function LocalSearchSection() {
  return (
    <section id="local-search" className="relative z-10 py-28 px-6">
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
                background:
                  "radial-gradient(ellipse, rgba(246,185,76,0.06) 0%, transparent 70%)",
              }}
            />

            <div className="relative z-10">
              {/* Bold statement */}
              <h2
                className="text-3xl md:text-5xl lg:text-6xl font-semibold font-display text-white text-center mb-6"
                style={{ letterSpacing: "-0.02em", lineHeight: 1.08 }}
              >
                Search runs{" "}
                <span className="heading-gradient-amber">locally</span> on your
                CPU.
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

              {/* ASCII box */}
              <div className="mt-8 text-center font-mono text-[11px] text-white/12 leading-relaxed">
                <div>
                  ┌──────────────────────────────────────────────────────────┐
                </div>
                <div>│ KEYWORDS + STATIC EMBEDDINGS + SOURCE SNIPPETS │</div>
                <div>
                  └──────────────────────────────────────────────────────────┘
                </div>
              </div>
            </div>
          </div>
        </FadeInView>
      </div>
    </section>
  );
}
