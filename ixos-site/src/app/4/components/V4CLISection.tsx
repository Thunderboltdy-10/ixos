"use client";

// ─── V4CLISection ─────────────────────────────────────────────────────────────
// Showcases real CLI commands from CLAUDE.md.
// Autoplay-on-enter terminal demo (no scroll-scrub).

import { useRef, useState, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";

const COMMANDS = [
  {
    cmd: "ixos search \"auth token refresh handler\" --dir ./src",
    comment: "# semantic keyword search",
    output: [
      "  1  api/session.ts          0.97",
      "  2  middleware/jwt.ts       0.94",
      "  3  lib/tokens.ts           0.91",
      "  4  hooks/useAuth.ts        0.88",
    ],
    time: "29ms",
    badge: "READY",
    color: "#2DD4BF",
  },
  {
    cmd: "ixos search \"database connection pool\" --cache-mode native-cache --show-scores",
    comment: "# with NTFS/xattr caching enabled",
    output: [
      "  1  lib/db.ts               0.96",
      "  2  config/database.ts      0.93",
      "  3  utils/pool.ts           0.89",
      "  4  services/postgres.ts    0.85",
    ],
    time: "12ms",
    badge: "CACHED",
    color: "#F59E0B",
  },
  {
    cmd: "ixos search \"error handling\" --progressive --json",
    comment: "# progressive output, JSON format",
    output: [
      "  {\"file\":\"middleware/errors.ts\",\"score\":0.98}",
      "  {\"file\":\"utils/catchAsync.ts\",\"score\":0.94}",
      "  {\"file\":\"lib/errorBoundary.tsx\",\"score\":0.90}",
    ],
    time: "18ms",
    badge: "PROGRESSIVE",
    color: "#7C3AED",
  },
];

type Phase = "idle" | "typing" | "running" | "output" | "hold";

function TerminalDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, margin: "-60px" });

  const [cmdIdx, setCmdIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [typed, setTyped] = useState(0);
  const [outputLine, setOutputLine] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = COMMANDS[cmdIdx];

  function clear() {
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  useEffect(() => {
    if (inView && phase === "idle") {
      timerRef.current = setTimeout(() => setPhase("typing"), 700);
    }
    return clear;
  }, [inView, phase]);

  useEffect(() => {
    clear();

    if (phase === "typing") {
      if (typed < current.cmd.length) {
        timerRef.current = setTimeout(() => setTyped((t) => t + 1), 22);
      } else {
        timerRef.current = setTimeout(() => setPhase("running"), 150);
      }
    } else if (phase === "running") {
      timerRef.current = setTimeout(() => {
        setPhase("output");
        setOutputLine(0);
      }, 220);
    } else if (phase === "output") {
      if (outputLine < current.output.length) {
        timerRef.current = setTimeout(() => setOutputLine((n) => n + 1), 120);
      } else {
        timerRef.current = setTimeout(() => setPhase("hold"), 400);
      }
    } else if (phase === "hold") {
      timerRef.current = setTimeout(() => {
        setTyped(0);
        setOutputLine(0);
        setCmdIdx((i) => (i + 1) % COMMANDS.length);
        setPhase("typing");
      }, 2600);
    }

    return clear;
  }, [phase, typed, outputLine, cmdIdx, current]);

  return (
    <div ref={ref}>
      <div
        style={{
          backgroundColor: "rgba(6,8,10,0.95)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Window bar */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <AnimatePresence mode="wait">
              <motion.span
                key={phase}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="font-mono text-[8px] tracking-[0.22em] uppercase"
                style={{
                  color: phase === "output" || phase === "hold"
                    ? current.color
                    : "rgba(255,255,255,0.15)",
                }}
              >
                {phase === "running" ? "RUNNING..." : phase === "output" || phase === "hold" ? current.badge : "TERMINAL"}
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="w-14" />
        </div>

        {/* Terminal body */}
        <div className="px-5 py-4 font-mono text-[11px] leading-relaxed" style={{ minHeight: 220 }}>
          {/* Comment */}
          <div style={{ color: "rgba(255,255,255,0.2)" }} className="mb-1">
            {current.comment}
          </div>

          {/* Command line */}
          <div className="flex items-start gap-2 mb-3">
            <span style={{ color: "#2DD4BF" }}>$</span>
            <span style={{ color: "rgba(255,255,255,0.82)" }}>
              {current.cmd.slice(0, typed)}
              {(phase === "typing" || phase === "idle") && (
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ repeat: Infinity, duration: 0.85 }}
                  style={{ color: "#2DD4BF" }}
                >
                  _
                </motion.span>
              )}
            </span>
          </div>

          {/* Output lines */}
          <AnimatePresence>
            {(phase === "output" || phase === "hold") && (
              <motion.div
                key={`output-${cmdIdx}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-0.5"
              >
                {current.output.slice(0, outputLine).map((line, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ color: "rgba(255,255,255,0.55)" }}
                  >
                    {line}
                  </motion.div>
                ))}
                {outputLine >= current.output.length && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center gap-2 mt-2"
                  >
                    <span style={{ color: current.color }}>{current.time}</span>
                    <span style={{ color: "rgba(255,255,255,0.18)" }}>elapsed</span>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Flag reference ───────────────────────────────────────────────────────────
const FLAGS = [
  { flag: "--dir <path>", desc: "Directory to search" },
  { flag: "--stub-model", desc: "Fast mode, no download required" },
  { flag: "--cache-mode native-cache", desc: "Use NTFS ADS / xattr cache" },
  { flag: "--show-scores", desc: "Display similarity scores" },
  { flag: "--progressive", desc: "Stream results as they surface" },
  { flag: "--json", desc: "Machine-readable output" },
  { flag: "--secure-timing", desc: "Opt-in timing attack protection" },
  { flag: "--journalist-mode", desc: "Maximum privacy search mode" },
];

export function V4CLISection() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-80px" });

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

      <div className="relative z-10 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left: copy */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <p className="font-mono text-[10px] tracking-[0.35em] uppercase mb-5" style={{ color: "rgba(255,255,255,0.2)" }}>
              CLI · Command Line Interface
            </p>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Search from the terminal.
            </h2>
            <p className="font-mono text-sm leading-relaxed mb-10" style={{ color: "rgba(255,255,255,0.38)" }}>
              Every feature available from the command line. Pipe to jq, grep, or your editor.
              No GUI required.
            </p>

            {/* Flags reference */}
            <div className="flex flex-col gap-0">
              {FLAGS.map((f, i) => (
                <motion.div
                  key={f.flag}
                  initial={{ opacity: 0, x: -12 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.15 + i * 0.06, duration: 0.38 }}
                  className="flex items-start gap-4 py-3"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <span
                    className="font-mono text-[10px] shrink-0"
                    style={{ color: "#2DD4BF", minWidth: 190 }}
                  >
                    {f.flag}
                  </span>
                  <span
                    className="font-mono text-[10px] leading-relaxed"
                    style={{ color: "rgba(255,255,255,0.32)" }}
                  >
                    {f.desc}
                  </span>
                </motion.div>
              ))}
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 0.9 }}
              className="font-mono text-[9px] tracking-[0.12em] mt-6"
              style={{ color: "rgba(255,255,255,0.15)" }}
            >
              Source: CLAUDE.md · CLI Usage section
            </motion.p>
          </motion.div>

          {/* Right: live terminal demo */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <TerminalDemo />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
