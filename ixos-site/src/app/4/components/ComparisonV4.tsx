"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { FileNodesBg } from "./FileNodesBg";

// ─── Data ─────────────────────────────────────────────────────────────────────
const TOOLS = [
  { name: "Ixos", highlight: true, color: "#2DD4BF" },
  { name: "grep/rg", highlight: false, color: "rgba(255,255,255,0.35)" },
  { name: "Spotlight", highlight: false, color: "rgba(255,255,255,0.35)" },
  { name: "VS Code", highlight: false, color: "rgba(255,255,255,0.35)" },
];

const QUALITIES = [
  {
    label: "Speed",
    scores: [95, 70, 45, 55],
  },
  {
    label: "Semantic Understanding",
    scores: [95, 5, 35, 25],
  },
  {
    label: "Privacy (local-first)",
    scores: [100, 100, 40, 70],
  },
  {
    label: "Progressive Results",
    scores: [95, 0, 15, 10],
  },
  {
    label: "Ask Mode",
    scores: [90, 0, 20, 0],
  },
];

const MAX_BAR_PX = 120;

// ─── Bar cell ─────────────────────────────────────────────────────────────────
function BarCell({
  score,
  isIxos,
  inView,
  delay,
}: {
  score: number;
  isIxos: boolean;
  inView: boolean;
  delay: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="relative"
        style={{ width: MAX_BAR_PX, height: 6, backgroundColor: "rgba(255,255,255,0.05)" }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={inView ? { width: (score / 100) * MAX_BAR_PX } : { width: 0 }}
          transition={{ delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            backgroundColor: isIxos ? "#2DD4BF" : "rgba(255,255,255,0.2)",
            boxShadow: isIxos ? "0 0 8px rgba(45,212,191,0.4)" : "none",
          }}
        />
      </div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: delay + 0.5, duration: 0.3 }}
        className="font-mono text-[10px] tabular-nums"
        style={{ color: isIxos ? "#2DD4BF" : "rgba(255,255,255,0.22)" }}
      >
        {score}
      </motion.span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ComparisonV4() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section
      ref={sectionRef}
      className="relative py-32 px-6 overflow-hidden"
      style={{
        backgroundColor: "#0C0E10",
        borderTop: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      {/* Blueprint grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.014) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.014) 1px, transparent 1px)
          `,
          backgroundSize: "72px 72px",
        }}
      />

      <FileNodesBg density={0.15} opacity={0.1} color="#2DD4BF" speed={0.4} />

      <div className="relative z-10 max-w-5xl mx-auto w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55 }}
          className="mb-16"
        >
          <p className="font-mono text-[10px] tracking-[0.35em] uppercase mb-4" style={{ color: "rgba(255,255,255,0.2)" }}>
            Comparison · Search Tools
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
            Built different.
          </h2>
          <p className="font-mono text-sm max-w-md" style={{ color: "rgba(255,255,255,0.35)" }}>
            Designed from the ground up for semantic, local-first retrieval.
          </p>
        </motion.div>

        {/* Table */}
        <div
          className="overflow-x-auto"
          style={{ border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {/* Tool headers */}
          <div
            className="grid"
            style={{
              gridTemplateColumns: "200px repeat(4, 1fr)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="px-5 py-4" />
            {TOOLS.map((tool) => (
              <div
                key={tool.name}
                className="px-4 py-4 text-center"
                style={{
                  backgroundColor: tool.highlight ? "rgba(45,212,191,0.04)" : "transparent",
                  borderLeft: tool.highlight
                    ? "1px solid rgba(45,212,191,0.18)"
                    : "1px solid rgba(255,255,255,0.04)",
                  borderRight: tool.highlight ? "1px solid rgba(45,212,191,0.18)" : "none",
                  boxShadow: tool.highlight ? "0 0 24px rgba(45,212,191,0.05) inset" : "none",
                }}
              >
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={inView ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="font-mono text-xs tracking-[0.15em] uppercase font-semibold"
                  style={{ color: tool.color }}
                >
                  {tool.name}
                </motion.span>
              </div>
            ))}
          </div>

          {/* Rows */}
          {QUALITIES.map((quality, qi) => (
            <motion.div
              key={quality.label}
              initial={{ opacity: 0, x: -12 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.1 + qi * 0.08, duration: 0.45 }}
              className="grid items-center"
              style={{
                gridTemplateColumns: "200px repeat(4, 1fr)",
                borderBottom: qi < QUALITIES.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}
            >
              <div className="px-5 py-5">
                <span className="font-mono text-[10px] tracking-[0.12em] uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {quality.label}
                </span>
              </div>
              {TOOLS.map((tool, ti) => (
                <div
                  key={tool.name}
                  className="px-4 py-5 flex justify-center"
                  style={{
                    backgroundColor: tool.highlight ? "rgba(45,212,191,0.03)" : "transparent",
                    borderLeft: tool.highlight
                      ? "1px solid rgba(45,212,191,0.12)"
                      : "1px solid rgba(255,255,255,0.03)",
                    borderRight: tool.highlight ? "1px solid rgba(45,212,191,0.12)" : "none",
                  }}
                >
                  <BarCell
                    score={quality.scores[ti]}
                    isIxos={tool.highlight}
                    inView={inView}
                    delay={0.2 + qi * 0.1 + ti * 0.04}
                  />
                </div>
              ))}
            </motion.div>
          ))}
        </div>

        {/* Footnote */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mt-6 font-mono text-[9px] tracking-[0.15em]"
          style={{ color: "rgba(255,255,255,0.15)" }}
        >
          * Scores are relative qualitative ratings, not benchmark data. Ask Mode requires Pro tier.
        </motion.p>
      </div>
    </section>
  );
}
