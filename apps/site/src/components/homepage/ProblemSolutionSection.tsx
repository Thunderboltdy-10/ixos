"use client";

import { FadeInView } from "@/components/effects/FadeInView";
import { CornerBrackets } from "@/components/effects/CornerBrackets";

const PAIN_POINTS = [
  "Files scattered across drives, cloud folders, and old downloads.",
  "Keyword search fails when you can't remember the exact name.",
  "Cloud search tools index your private data on remote servers.",
  "Every tool only handles one file type -- nothing searches everything.",
];

const SOLUTION_POINTS = [
  "Search by meaning, not just keywords.",
  "PDFs, spreadsheets, docs, code, markdown -- all in one place.",
  "Results ranked by relevance with evidence you can verify.",
  "100% local. Your files never leave your device.",
];

export function ProblemSolutionSection() {
  return (
    <section id="problem" className="relative z-10 py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
          {/* Problem */}
          <FadeInView direction="left">
            <div className="relative p-8 border border-white/8 bg-white/[0.01]">
              <CornerBrackets size={14} color="rgba(255,255,255,0.12)" />
              <h2 className="text-3xl md:text-4xl font-semibold font-display text-white mb-2" style={{ lineHeight: 1.12 }}>
                Your files are everywhere.
                <br />
                <span className="text-white/40">Your time is nowhere.</span>
              </h2>
              <ul className="mt-8 space-y-4">
                {PAIN_POINTS.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-3 text-sm text-white/45 leading-relaxed"
                  >
                    <span className="text-white/20 mt-0.5 shrink-0">—</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </FadeInView>

          {/* Solution */}
          <FadeInView direction="right" delay={120}>
            <div className="relative p-8 border border-amber-400/15 bg-amber-400/[0.02]">
              <CornerBrackets size={14} color="rgba(246,185,76,0.2)" />
              <h2 className="text-3xl md:text-4xl font-semibold font-display text-white mb-2" style={{ lineHeight: 1.12 }}>
                One search bar.
                <br />
                <span className="text-amber-400">Everything found.</span>
              </h2>
              <ul className="mt-8 space-y-4">
                {SOLUTION_POINTS.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-3 text-sm text-white/55 leading-relaxed"
                  >
                    <span className="text-amber-400/50 mt-0.5 shrink-0">▸</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </FadeInView>
        </div>
      </div>
    </section>
  );
}
