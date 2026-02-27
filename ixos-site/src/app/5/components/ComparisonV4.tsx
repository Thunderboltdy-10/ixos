"use client";

import { useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";

// ─── Qualitative capability matrix ───────────────────────────────────────────
// Replaces the invented numeric bar chart.
// Uses checkmarks / partial / not-applicable — no fabricated scores.
// "Pro" denotes Ixos Pro tier only. Competitor info is broadly accurate
// to public documentation, not a precise benchmark.

type Support = "yes" | "partial" | "no" | "pro";

interface Row {
  feature: string;
  note?: string;
  ixos: Support;
  grep: Support;
  spotlight: Support;
  vscode: Support;
}

const ROWS: Row[] = [
  {
    feature: "Full-text keyword search",
    ixos: "yes",
    grep: "yes",
    spotlight: "yes",
    vscode: "yes",
  },
  {
    feature: "Semantic understanding",
    note: "Finds files by meaning, not just exact tokens",
    ixos: "yes",
    grep: "no",
    spotlight: "partial",
    vscode: "no",
  },
  {
    feature: "Local-first / no egress",
    note: "All processing on-device, no network requests",
    ixos: "yes",
    grep: "yes",
    spotlight: "partial",
    vscode: "partial",
  },
  {
    feature: "Progressive results",
    note: "Streams results as confidence increases",
    ixos: "yes",
    grep: "no",
    spotlight: "no",
    vscode: "no",
  },
  {
    feature: "No background daemon",
    note: "Runs on demand, no persistent index watcher",
    ixos: "yes",
    grep: "yes",
    spotlight: "no",
    vscode: "partial",
  },
  {
    feature: "Natural language queries",
    note: "Intent-aware query understanding (Pro tier)",
    ixos: "pro",
    grep: "no",
    spotlight: "no",
    vscode: "no",
  },
  {
    feature: "Hybrid retrieval",
    note: "Lexical + semantic scoring in one pass",
    ixos: "yes",
    grep: "no",
    spotlight: "no",
    vscode: "no",
  },
  {
    feature: "Cross-platform",
    note: "Windows, macOS, Linux",
    ixos: "yes",
    grep: "yes",
    spotlight: "no",
    vscode: "yes",
  },
];

const TOOLS = [
  { key: "ixos", label: "Ixos", highlight: true, color: "#2DD4BF" },
  { key: "grep", label: "grep / rg", highlight: false, color: "rgba(255,255,255,0.3)" },
  { key: "spotlight", label: "Spotlight", highlight: false, color: "rgba(255,255,255,0.3)" },
  { key: "vscode", label: "VS Code", highlight: false, color: "rgba(255,255,255,0.3)" },
] as const;

// ─── Cell indicator ───────────────────────────────────────────────────────────
function SupportCell({ support, isIxos }: { support: Support; isIxos: boolean }) {
  const configs = {
    yes: {
      icon: "■",
      color: isIxos ? "#2DD4BF" : "rgba(255,255,255,0.35)",
      label: "Supported",
    },
    partial: {
      icon: "◐",
      color: "rgba(255,255,255,0.22)",
      label: "Partial",
    },
    no: {
      icon: "—",
      color: "rgba(255,255,255,0.1)",
      label: "Not supported",
    },
    pro: {
      icon: "◆",
      color: "#7C3AED",
      label: "Pro tier",
    },
  };
  const c = configs[support];

  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="font-mono text-sm"
        style={{ color: c.color }}
        title={c.label}
      >
        {c.icon}
      </span>
      {support === "pro" && (
        <span className="font-mono text-[8px] tracking-[0.15em]" style={{ color: "#7C3AED", opacity: 0.7 }}>
          Pro
        </span>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ComparisonV4() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-80px" });
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  return (
    <section
      ref={sectionRef}
      className="relative py-32 px-6 overflow-hidden"
      style={{ backgroundColor: "#0C0E10", borderTop: "1px solid rgba(255,255,255,0.04)" }}
    >
      {/* Blueprint grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)
          `,
          backgroundSize: "72px 72px",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55 }}
          className="mb-16"
        >
          <p className="font-mono text-[10px] tracking-[0.35em] uppercase mb-4" style={{ color: "rgba(255,255,255,0.2)" }}>
            Capability Matrix · Search Tools
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
            Purpose-built.
          </h2>
          <p className="font-mono text-sm max-w-md" style={{ color: "rgba(255,255,255,0.35)" }}>
            Ixos is designed from the ground up for semantic, local-first retrieval.
            Not a wrapper around an existing tool.
          </p>
        </motion.div>

        {/* Table */}
        <div className="overflow-x-auto" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Tool headers */}
          <div
            className="grid"
            style={{
              gridTemplateColumns: "220px repeat(4, 1fr)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="px-5 py-4" />
            {TOOLS.map((tool) => (
              <motion.div
                key={tool.key}
                initial={{ opacity: 0, y: -8 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="px-4 py-4 text-center"
                style={{
                  backgroundColor: tool.highlight ? "rgba(45,212,191,0.04)" : "transparent",
                  borderLeft: tool.highlight
                    ? "1px solid rgba(45,212,191,0.18)"
                    : "1px solid rgba(255,255,255,0.04)",
                  borderRight: tool.highlight ? "1px solid rgba(45,212,191,0.18)" : "none",
                }}
              >
                <span
                  className="font-mono text-xs tracking-[0.15em] uppercase font-semibold"
                  style={{ color: tool.color }}
                >
                  {tool.label}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Rows */}
          {ROWS.map((row, ri) => (
            <motion.div
              key={row.feature}
              initial={{ opacity: 0, x: -10 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.08 + ri * 0.07, duration: 0.4 }}
              className="grid items-center cursor-default"
              style={{
                gridTemplateColumns: "220px repeat(4, 1fr)",
                borderBottom: ri < ROWS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                backgroundColor: hoveredRow === ri ? "rgba(255,255,255,0.018)" : "transparent",
                transition: "background-color 0.15s ease",
              }}
              onMouseEnter={() => setHoveredRow(ri)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              {/* Feature label */}
              <div className="px-5 py-5">
                <span className="font-mono text-[10px] tracking-[0.1em] uppercase block" style={{ color: "rgba(255,255,255,0.38)" }}>
                  {row.feature}
                </span>
                <AnimatePresence>
                  {hoveredRow === ri && row.note && (
                    <motion.span
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="font-mono text-[9px] block mt-1.5 leading-relaxed"
                      style={{ color: "rgba(255,255,255,0.2)" }}
                    >
                      {row.note}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {/* Support cells */}
              {TOOLS.map((tool) => (
                <div
                  key={tool.key}
                  className="px-4 py-5 flex justify-center"
                  style={{
                    backgroundColor: tool.highlight ? "rgba(45,212,191,0.025)" : "transparent",
                    borderLeft: tool.highlight
                      ? "1px solid rgba(45,212,191,0.12)"
                      : "1px solid rgba(255,255,255,0.03)",
                    borderRight: tool.highlight ? "1px solid rgba(45,212,191,0.12)" : "none",
                  }}
                >
                  <SupportCell
                    support={row[tool.key as keyof typeof row] as Support}
                    isIxos={tool.highlight}
                  />
                </div>
              ))}
            </motion.div>
          ))}
        </div>

        {/* Legend + footnote */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mt-8 flex flex-wrap items-center justify-between gap-4"
        >
          <div className="flex flex-wrap items-center gap-6">
            {[
              { icon: "■", label: "Supported", color: "#2DD4BF" },
              { icon: "◐", label: "Partial", color: "rgba(255,255,255,0.22)" },
              { icon: "—", label: "Not supported", color: "rgba(255,255,255,0.1)" },
              { icon: "◆", label: "Pro tier", color: "#7C3AED" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="font-mono text-xs" style={{ color: item.color }}>{item.icon}</span>
                <span className="font-mono text-[9px] tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.2)" }}>{item.label}</span>
              </div>
            ))}
          </div>
          <p className="font-mono text-[9px] tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.12)" }}>
            * Qualitative assessment based on public documentation. Hover rows for details.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
