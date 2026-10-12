"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

// ─── Today visual — items cascade in ─────────────────────────────────────────
function TodayVisual({ visible }: { visible: boolean }) {
  const entries = [
    { label: "Meeting notes", time: "09:14", dot: "#F59E0B" },
    { label: "Draft spec v2", time: "11:32", dot: "#F59E0B" },
    { label: "auth.ts", time: "13:47", dot: "#2DD4BF" },
    { label: "Search logs", time: "14:21", dot: "#F59E0B" },
  ];
  return (
    <div
      className="mt-6 p-4"
      style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div
        className="font-mono text-[8px] tracking-[0.3em] uppercase pb-3 mb-1"
        style={{ color: "rgba(255,255,255,0.2)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        Today
      </div>
      {entries.map((e, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={visible ? { opacity: 1, x: 0 } : {}}
          transition={{ delay: i * 0.09, duration: 0.3 }}
          className="flex items-center justify-between py-2.5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
        >
          <div className="flex items-center gap-2.5">
            <motion.div
              className="w-1 h-1 rounded-full shrink-0"
              animate={visible ? { backgroundColor: e.dot, opacity: 0.65 } : { opacity: 0 }}
              transition={{ delay: i * 0.09 + 0.1 }}
              style={{ backgroundColor: e.dot }}
            />
            <span className="font-mono text-xs truncate" style={{ color: "rgba(255,255,255,0.52)" }}>
              {e.label}
            </span>
          </div>
          <span className="font-mono text-[9px]" style={{ color: "rgba(255,255,255,0.18)" }}>
            {e.time}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Workstreams visual — bars fill on entry ──────────────────────────────────
function WorkstreamsVisual({ visible }: { visible: boolean }) {
  const streams = [
    { name: "Ixos App", files: 147, color: "#7C3AED", pct: 0.82 },
    { name: "Marketing", files: 89, color: "#F59E0B", pct: 0.54 },
    { name: "Research", files: 62, color: "#2DD4BF", pct: 0.38 },
  ];
  return (
    <div
      className="mt-6 p-4"
      style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div
        className="font-mono text-[8px] tracking-[0.3em] uppercase pb-3 mb-1"
        style={{ color: "rgba(255,255,255,0.2)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        Workstreams
      </div>
      {streams.map((s, i) => (
        <motion.div
          key={s.name}
          initial={{ opacity: 0 }}
          animate={visible ? { opacity: 1 } : {}}
          transition={{ delay: i * 0.12 }}
          className="flex flex-col gap-1.5 py-2.5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <motion.div
                className="w-2 h-2 shrink-0"
                initial={{ border: "1px solid transparent" }}
                animate={visible ? { border: `1px solid ${s.color}`, opacity: 0.8 } : {}}
                transition={{ delay: i * 0.12 + 0.1 }}
              />
              <span className="font-mono text-xs" style={{ color: "rgba(255,255,255,0.58)" }}>{s.name}</span>
            </div>
            <span className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>{s.files} files</span>
          </div>
          <div className="h-px w-full" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
            <motion.div
              className="h-full"
              initial={{ width: 0 }}
              animate={visible ? { width: `${s.pct * 100}%` } : { width: 0 }}
              transition={{ delay: i * 0.12 + 0.2, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              style={{ backgroundColor: s.color, opacity: 0.45 }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Ask visual — query types itself ─────────────────────────────────────────
function AskVisual({ visible }: { visible: boolean }) {
  const QUERY = "Where is auth token refresh?";
  const results = ["api/session.ts", "middleware/jwt.ts", "lib/tokens.ts"];

  return (
    <div
      className="mt-6 p-4"
      style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div
        className="font-mono text-[8px] tracking-[0.3em] uppercase pb-3 mb-3"
        style={{ color: "rgba(255,255,255,0.2)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        Ask
      </div>
      {/* Query bubble */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={visible ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.3 }}
        className="flex items-start gap-3 p-3 mb-3"
        style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div
          className="w-3.5 h-3.5 flex items-center justify-center shrink-0 mt-0.5"
          style={{ border: "1px solid rgba(45,212,191,0.3)" }}
        >
          <div className="w-1 h-1" style={{ backgroundColor: "#2DD4BF", opacity: 0.7 }} />
        </div>
        <span className="font-mono text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
          {QUERY}
        </span>
      </motion.div>
      {/* Results cascade */}
      {results.map((f, i) => (
        <motion.div
          key={f}
          initial={{ opacity: 0, x: -8 }}
          animate={visible ? { opacity: 1, x: 0 } : {}}
          transition={{ delay: 0.25 + i * 0.1, duration: 0.28 }}
          className="flex items-center gap-2.5 py-2"
          style={{ borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
        >
          <div className="w-px h-4 shrink-0" style={{ backgroundColor: "#2DD4BF", opacity: 0.3 }} />
          <span className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.38)" }}>{f}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Panel definitions ────────────────────────────────────────────────────────
const PANEL_DEFS = [
  {
    id: "today",
    tag: "Today",
    tagColor: "#F59E0B",
    headline: "What you worked on, surfaced.",
    body: "Temporal context makes recent work instantly accessible. Files from your current day — no folder navigation.",
    Visual: TodayVisual,
  },
  {
    id: "workstreams",
    tag: "Workstreams",
    tagColor: "#7C3AED",
    headline: "Projects as search context.",
    body: "Define the boundaries of a project. Search learns the shape of each workstream and narrows to what matters.",
    Visual: WorkstreamsVisual,
  },
  {
    id: "ask",
    tag: "Ask Mode",
    tagColor: "#2DD4BF",
    headline: "Intent-aware assistance.",
    body: "Ask natural questions. Ixos reads intent and surfaces the most relevant files without requiring exact terms.",
    Visual: AskVisual,
  },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────
export function ProValueV4() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-60px" });

  // Individual card refs — defined as three explicit hooks (no loop)
  const cardRef0 = useRef<HTMLDivElement>(null);
  const cardRef1 = useRef<HTMLDivElement>(null);
  const cardRef2 = useRef<HTMLDivElement>(null);
  const cardRefs = [cardRef0, cardRef1, cardRef2];
  const cardInView0 = useInView(cardRef0, { once: true, margin: "-40px" });
  const cardInView1 = useInView(cardRef1, { once: true, margin: "-40px" });
  const cardInView2 = useInView(cardRef2, { once: true, margin: "-40px" });
  const cardInViews = [cardInView0, cardInView1, cardInView2];

  return (
    <section
      style={{ borderTop: "1px solid rgba(255,255,255,0.04)", backgroundColor: "#0C0E10" }}
      className="py-32 px-6"
    >
      <div ref={sectionRef} className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55 }}
          className="text-center mb-20"
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 font-mono text-[9px] tracking-[0.3em] uppercase mb-6"
            style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.25)" }}
          >
            <span className="w-1 h-1" style={{ backgroundColor: "#7C3AED" }} />
            Pro
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
            Search is just the start.
          </h2>
          <p className="font-mono text-sm max-w-md mx-auto leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>
            Pro adds context, continuity, and intent-awareness to your daily workflow.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PANEL_DEFS.map((panel, i) => {
            const { Visual } = panel;
            return (
              <motion.div
                key={panel.id}
                ref={cardRefs[i]}
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.55, delay: i * 0.12 }}
                whileHover={{ y: -5, borderColor: `${panel.tagColor}30` }}
                className="flex flex-col p-6 cursor-default"
                style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}
              >
                <div
                  className="font-mono text-[9px] tracking-[0.3em] uppercase mb-4"
                  style={{ color: panel.tagColor }}
                >
                  {panel.tag}
                </div>
                <h3 className="font-display text-xl font-semibold text-white mb-3 leading-snug">
                  {panel.headline}
                </h3>
                <p className="font-mono text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>
                  {panel.body}
                </p>
                <Visual visible={cardInViews[i]} />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
