"use client";

import { OpenSourceNotice } from "@/components/sections/OpenSourceNotice";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { DemoSurface } from "@/landing/DemoSurface";
import { CSSLattice } from "./CSSLattice";

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION REVEAL WRAPPER
   ═══════════════════════════════════════════════════════════════════════════ */
function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FLOW CONNECTOR — animated SVG dot traversing the pipeline
   ═══════════════════════════════════════════════════════════════════════════ */
function FlowConnector({ active }: { active: boolean }) {
  return (
    <svg
      width="60"
      height="20"
      viewBox="0 0 60 20"
      className="hidden md:block shrink-0"
      style={{ overflow: "visible" }}
    >
      <line
        x1="0" y1="10" x2="60" y2="10"
        stroke="rgba(20,184,166,0.15)"
        strokeWidth="1"
        strokeDasharray="4 3"
      />
      {active && (
        <>
          <line
            x1="0" y1="10" x2="60" y2="10"
            stroke="rgba(20,184,166,0.35)"
            strokeWidth="1"
          />
          <circle r="3" fill="#14B8A6">
            <animateMotion dur="1.4s" repeatCount="indefinite" calcMode="linear">
              <mpath href="#flow-path-main" />
            </animateMotion>
          </circle>
        </>
      )}
      <path id="flow-path-main" d="M 0 10 L 60 10" style={{ visibility: "hidden" }} />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PIPELINE STEP CARD — activates on scroll entry
   ═══════════════════════════════════════════════════════════════════════════ */
const PIPELINE_STEPS = [
  {
    label: "Scan",
    tag: "01",
    desc: "Parallel directory walk via rayon. No daemon, no stale index.",
    icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
    detail: "~7ms / 1k files",
  },
  {
    label: "Parse",
    tag: "02",
    desc: "Extract tokens, symbols, and structure from each file.",
    icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
    detail: "Parallel",
  },
  {
    label: "Embed",
    tag: "03",
    desc: "Vectorize with local Model2Vec. model-dependent dimensions, on-device.",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    detail: "No network",
  },
  {
    label: "Cache",
    tag: "04",
    desc: "Store with HMAC-SHA256 signing. NTFS ADS on Windows, xattr on Unix.",
    icon: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8",
    detail: "94% hit rate",
  },
];

function PipelineStep({
  step,
  index,
}: {
  step: (typeof PIPELINE_STEPS)[0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay: index * 0.1, ease: "easeOut" }}
      className="flex flex-col items-center text-center px-3 py-6 rounded-xl"
      style={{
        border: `1px solid ${inView ? "rgba(20,184,166,0.3)" : "rgba(255,255,255,0.06)"}`,
        background: inView ? "rgba(20,184,166,0.04)" : "rgba(255,255,255,0.01)",
        transition: "border-color 0.6s ease, background 0.6s ease",
        flex: 1,
        minWidth: 0,
      }}
    >
      {/* Icon ring */}
      <div
        className="w-[80px] h-[80px] rounded-2xl flex items-center justify-center mb-4 relative"
        style={{
          background: inView ? "rgba(20,184,166,0.08)" : "rgba(255,255,255,0.02)",
          border: `1px solid ${inView ? "rgba(20,184,166,0.25)" : "rgba(255,255,255,0.06)"}`,
          transition: "all 0.6s ease",
        }}
      >
        <svg
          className="w-6 h-6"
          style={{ color: inView ? "#14B8A6" : "rgba(255,255,255,0.2)" }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={step.icon} />
        </svg>
        <span
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-[9px] font-mono flex items-center justify-center"
          style={{
            background: "#080c14",
            border: `1px solid ${inView ? "rgba(20,184,166,0.4)" : "rgba(255,255,255,0.1)"}`,
            color: inView ? "#14B8A6" : "rgba(255,255,255,0.3)",
            transition: "all 0.6s ease",
          }}
        >
          {step.tag}
        </span>
      </div>

      <h3 className="text-white text-sm font-mono font-medium mb-1.5 tracking-wide">
        {step.label}
      </h3>
      <p className="text-white/35 text-xs leading-relaxed max-w-[160px] mb-3">
        {step.desc}
      </p>
      <span
        className="text-[10px] font-mono px-2 py-0.5 rounded"
        style={{
          color: inView ? "#F6B94C" : "rgba(255,255,255,0.2)",
          background: inView ? "rgba(246,185,76,0.08)" : "transparent",
          border: `1px solid ${inView ? "rgba(246,185,76,0.2)" : "rgba(255,255,255,0.06)"}`,
          transition: "all 0.6s ease",
        }}
      >
        {step.detail}
      </span>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   NODE SCATTER — SVG semantic proximity visualization
   ═══════════════════════════════════════════════════════════════════════════ */
function NodeScatter() {
  const nodes = [
    { x: 100, y: 64, isQuery: true },
    { x: 130, y: 88, active: true, label: "auth/token.ts" },
    { x: 90, y: 104, active: true, label: "middleware.ts" },
    { x: 142, y: 62, active: true },
    { x: 78, y: 48, active: false },
    { x: 120, y: 120, active: true, label: "config/auth.ts" },
    { x: 80, y: 30, active: false },
    { x: 140, y: 105, active: false },
    { x: 55, y: 68, active: false },
    { x: 162, y: 80, active: false },
    { x: 105, y: 140, active: false },
    { x: 60, y: 100, active: false },
    { x: 150, y: 135, active: true, label: "hooks/useAuth.ts" },
    { x: 45, y: 45, active: false },
    { x: 170, y: 50, active: false },
  ];

  return (
    <svg width="220" height="180" className="opacity-90">
      {/* Proximity edges */}
      <line x1="100" y1="64" x2="130" y2="88" stroke="rgba(20,184,166,0.35)" strokeWidth="1" />
      <line x1="100" y1="64" x2="90" y2="104" stroke="rgba(20,184,166,0.35)" strokeWidth="1" />
      <line x1="100" y1="64" x2="142" y2="62" stroke="rgba(20,184,166,0.25)" strokeWidth="1" />
      <line x1="130" y1="88" x2="120" y2="120" stroke="rgba(20,184,166,0.25)" strokeWidth="1" />
      <line x1="90" y1="104" x2="120" y2="120" stroke="rgba(20,184,166,0.2)" strokeWidth="1" />
      <line x1="120" y1="120" x2="150" y2="135" stroke="rgba(20,184,166,0.2)" strokeWidth="1" />

      {nodes.map((node, i) => {
        if (node.isQuery) {
          return (
            <g key={i}>
              <circle cx={node.x} cy={node.y} r="9" fill="none" stroke="rgba(246,185,76,0.4)" strokeWidth="1.5" />
              <circle cx={node.x} cy={node.y} r="4" fill="#F6B94C" />
              <text x={node.x + 12} y={node.y + 4} fill="rgba(246,185,76,0.75)" fontSize="8" fontFamily="monospace">
                query
              </text>
            </g>
          );
        }
        return (
          <g key={i}>
            <circle
              cx={node.x}
              cy={node.y}
              r={node.active ? 5 : 3}
              fill={node.active ? "#14B8A6" : "rgba(255,255,255,0.12)"}
              style={{ filter: node.active ? "drop-shadow(0 0 4px rgba(20,184,166,0.6))" : "none" }}
            />
            {node.label && (
              <text
                x={node.x + 7}
                y={node.y + 4}
                fill="rgba(20,184,166,0.7)"
                fontSize="8"
                fontFamily="monospace"
              >
                {node.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   EMBEDDING SPACE SECTION
   ═══════════════════════════════════════════════════════════════════════════ */
function EmbeddingSpaceSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const inputDimensions = [
    { label: "TypeScript", filled: 4 },
    { label: "Config", filled: 3 },
    { label: "Tests", filled: 2 },
    { label: "Docs", filled: 1 },
    { label: "Deps", filled: 3 },
  ];

  const neighbors = [
    { file: "auth/token.ts", score: 0.92 },
    { file: "middleware.ts", score: 0.87 },
    { file: "config/auth.ts", score: 0.81 },
    { file: "hooks/useAuth.ts", score: 0.79 },
  ];

  return (
    <section id="embedding" className="relative py-24 px-6" ref={ref}>
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <div className="mb-3 text-[10px] font-mono tracking-[0.25em] uppercase" style={{ color: "#14B8A6" }}>
            Semantic Understanding
          </div>
          <h2
            className="text-3xl md:text-4xl font-light text-white mb-4 tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Files mapped by meaning.
          </h2>
          <p className="mb-12 max-w-lg text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
            Files receive model-dependent vectors. Related files cluster together.
            Your query lands in this space and retrieves neighbors by cosine similarity — no keywords required.
          </p>
        </Reveal>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="grid grid-cols-3 gap-0 rounded-xl overflow-hidden"
          style={{
            border: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(8,12,20,0.7)",
            backdropFilter: "blur(16px)",
          }}
        >
          {/* Left: Input dimensions */}
          <div className="p-6 md:p-8" style={{ borderRight: "1px solid rgba(255,255,255,0.07)" }}>
            <div
              className="text-[10px] font-mono tracking-[0.2em] uppercase mb-5"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              Input Sources
            </div>
            {inputDimensions.map(({ label, filled }) => (
              <div key={label} className="flex items-center gap-3 mb-4">
                <span
                  className="text-[11px] font-mono w-20 shrink-0"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  {label}
                </span>
                <div className="flex gap-1">
                  {Array.from({ length: 4 }, (_, j) => (
                    <div
                      key={j}
                      className="w-2 h-2 rounded-full transition-all duration-700"
                      style={{
                        background:
                          inView && j < filled
                            ? "rgba(20,184,166,0.7)"
                            : "rgba(255,255,255,0.07)",
                        transitionDelay: inView ? `${j * 80 + 300}ms` : "0ms",
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
            <div
              className="mt-6 pt-4 text-[10px] font-mono"
              style={{
                color: "rgba(255,255,255,0.2)",
                borderTop: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              4,456 sources → 682 relevant
            </div>
          </div>

          {/* Center: Node scatter */}
          <div
            className="flex items-center justify-center p-4"
            style={{ background: "rgba(20,184,166,0.015)" }}
          >
            <NodeScatter />
          </div>

          {/* Right: Nearest neighbors */}
          <div className="p-6 md:p-8" style={{ borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <div
              className="text-[10px] font-mono tracking-[0.2em] uppercase mb-5"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              Nearest Neighbors
            </div>
            {neighbors.map(({ file, score }, i) => (
              <motion.div
                key={file}
                className="flex items-center justify-between mb-4"
                initial={{ opacity: 0, x: 12 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.5 + i * 0.08 }}
              >
                <span className="text-[11px] font-mono truncate mr-2" style={{ color: "#14B8A6" }}>
                  {file}
                </span>
                <span className="text-[11px] font-mono shrink-0" style={{ color: "#F6B94C" }}>
                  {score}
                </span>
              </motion.div>
            ))}
            <div
              className="mt-6 pt-4"
              style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div
                className="text-[10px] font-mono"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                cosine similarity · complete dimensions
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ODOMETER STAT — count-up animation on scroll entry
   ═══════════════════════════════════════════════════════════════════════════ */
function OdometerStat({
  value,
  suffix,
  prefix,
  label,
  glowColor,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  glowColor: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasRun.current) return;
        hasRun.current = true;
        observer.disconnect();
        const start = performance.now();
        const dur = 1600;
        const tick = (now: number) => {
          const p = Math.min((now - start) / dur, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          setCount(Math.round(value * ease));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="relative text-center">
      <div
        className="text-6xl md:text-7xl lg:text-8xl font-extralight tracking-tighter leading-none mb-3"
        style={{
          fontFamily: "var(--font-display)",
          color: "#fff",
          textShadow: `0 0 60px ${glowColor}`,
        }}
      >
        {prefix}
        {count}
        {suffix}
      </div>
      <div
        className="uppercase tracking-[0.2em] text-[11px] font-mono"
        style={{ color: "rgba(255,255,255,0.3)" }}
      >
        {label}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SCORE BAR — animated fill on scroll entry
   ═══════════════════════════════════════════════════════════════════════════ */
function ScoreBar({
  label,
  score,
  pct,
  color,
  delay = 0,
  height = "h-3",
}: {
  label: string;
  score: string;
  pct: string;
  color: string;
  delay?: number;
  height?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs font-mono uppercase tracking-wider"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          {label}
        </span>
        <span className="text-xs font-mono" style={{ color }}>
          {score}
        </span>
      </div>
      <div className={`${height} rounded-full overflow-hidden`} style={{ background: "rgba(255,255,255,0.05)" }}>
        <motion.div
          className={`h-full rounded-full`}
          style={{ background: color }}
          initial={{ width: 0 }}
          whileInView={{ width: pct }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, delay, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PRIVACY ITEMS
   ═══════════════════════════════════════════════════════════════════════════ */
const PRIVACY_ITEMS = [
  { label: "No Cloud Index", detail: "Index never leaves disk" },
  { label: "HMAC-SHA256", detail: "Cryptographic cache signing" },
  { label: "mlock Memory", detail: "Embeddings pinned, never paged" },
  { label: "Timing Protection", detail: "Opt-in constant-time search" },
  { label: "Ephemeral Mode", detail: "Zero persistence on exit" },
  { label: "Local-Only", detail: "No network calls, ever" },
];

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
function SignalGlowBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <div className="absolute top-0 left-0 w-full h-full bg-[#080C14]" />
      <div
        className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-20 blur-[120px]"
        style={{ background: 'radial-gradient(circle, #38BDF8 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full opacity-10 blur-[120px]"
        style={{ background: 'radial-gradient(circle, #14B8A6 0%, transparent 70%)' }}
      />
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#38BDF8 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
    </div>
  );
}

export default function Page2SignalArchitecture() {
  const [pipelineActive, setPipelineActive] = useState(false);
  const pipelineRef = useRef<HTMLDivElement>(null);

  // Activate pipeline flow when section is in view
  useEffect(() => {
    const el = pipelineRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setPipelineActive(entry.isIntersecting),
      { threshold: 0.05, rootMargin: "0px 0px 0px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative min-h-screen text-[#F1F5F9] font-sans selection:bg-[#38BDF8]/30">
      <SignalGlowBackground />
      {/* ================================================================
          1. HERO — Centered, lattice below text
          ================================================================ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-[60px] overflow-hidden z-10">
        {/* CSS 3D Lattice as Background */}
        <div className="absolute inset-0 z-0 opacity-70" style={{ mixBlendMode: "screen" }}>
          <CSSLattice />
        </div>

        {/* Hero text */}
        <motion.div
          className="relative z-10 text-left pointer-events-none mt-20 max-w-md self-start ml-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="pointer-events-auto">
            <motion.p
              className="text-[10px] uppercase tracking-[0.3em] mb-5 font-mono"
              style={{ color: "rgba(20,184,166,0.7)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              Local-first semantic search · Signal Architecture
            </motion.p>

            <motion.h1
              className="text-5xl md:text-7xl lg:text-8xl font-light tracking-[-0.03em] leading-none mb-6"
              style={{ fontFamily: "var(--font-display)", color: "#fff" }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              The Local
              <br />
              <span style={{ color: "#14B8A6" }}>Index.</span>
            </motion.h1>

            <motion.p
              className="text-lg md:text-xl font-light max-w-xl leading-relaxed"
              style={{ color: "rgba(255,255,255,0.4)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.7 }}
            >
              A cryptographically signed vector index that never leaves your machine.
            </motion.p>

            {/* CTA row */}
            <motion.div
              className="flex items-center gap-4 mt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.9 }}
            >
              <a
                href="#cta"
                className="px-6 py-3 rounded-lg text-sm font-mono font-medium transition-all hover:scale-105"
                style={{
                  background: "#14B8A6",
                  color: "#080c14",
                }}
              >
                Download free
              </a>
              <a
                href="#embedding"
                className="px-6 py-3 rounded-lg text-sm font-mono transition-all hover:bg-teal-900/10"
                style={{
                  background: "rgba(20,184,166,0.08)",
                  color: "#14B8A6",
                  border: "1px solid rgba(20,184,166,0.2)",
                }}
              >
                See how it works
              </a>
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          className="absolute bottom-8 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ delay: 2.5, duration: 1 }}
        >
          <motion.div
            className="w-5 h-8 rounded-full flex items-start justify-center p-1"
            style={{ border: "1px solid rgba(20,184,166,0.3)" }}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <motion.div
              className="w-1 h-2 rounded-full"
              style={{ background: "rgba(20,184,166,0.5)" }}
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
        </motion.div>
      </section>

      {/* ================================================================
          2. ZERO CLOUD — Architectural Statement
          ================================================================ */}
      <section
        className="relative py-28 md:py-36 px-6 z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(20,184,166,0.025) 0%, transparent 70%)",
        }}
      >
        <Reveal className="max-w-3xl mx-auto">
          <div className="flex items-start gap-6">
            <div
              className="w-px shrink-0 self-stretch rounded-full"
              style={{ background: "linear-gradient(to bottom, #14B8A6, transparent)" }}
            />
            <div>
              <h2
                className="text-3xl md:text-4xl font-light text-white mb-5 tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Zero Cloud. Zero Tracking.
              </h2>
              <p
                className="text-lg leading-relaxed max-w-2xl mb-4"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                Your proprietary codebase never touches a remote server. Ixos builds and queries a
                local vector index on your filesystem. Embeddings are signed with HMAC-SHA256, stored
                in platform-native metadata — NTFS ADS on Windows, xattr on Unix — and optionally
                protected with mlock memory pinning and ephemeral mode.
              </p>
              <p className="text-sm font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>
                No telemetry. No analytics. No phone-home.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ================================================================
          3. PIPELINE — 4-stage architecture with flow connectors
          ================================================================ */}
      <section
        id="pipeline"
        className="relative py-28 md:py-36 px-6 z-10"
        style={{ background: "rgba(5,7,9,0.6)" }}
      >
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-14">
            <p
              className="text-[10px] uppercase tracking-[0.25em] mb-3 font-mono"
              style={{ color: "rgba(20,184,166,0.7)" }}
            >
              The Engine
            </p>
            <h2
              className="text-3xl md:text-4xl font-light text-white tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              How the index builds itself
            </h2>
          </Reveal>

          {/* Pipeline row */}
          <div ref={pipelineRef} className="flex flex-col md:flex-row items-stretch gap-0 md:gap-0">
            {PIPELINE_STEPS.map((step, i) => (
              <div key={step.label} className="contents">
                <PipelineStep step={step} index={i} />
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className="hidden md:flex items-center justify-center w-16 shrink-0">
                    <FlowConnector active={pipelineActive} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          4. EMBEDDING SPACE — Semantic understanding visualization
          ================================================================ */}
      <EmbeddingSpaceSection />

      {/* ================================================================
          5. SPEED METRICS — Odometer stats
          ================================================================ */}
      <section
        className="relative py-28 md:py-36 px-6 z-10"
        style={{
          background: "rgba(5,7,9,0.6)",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-16">
            <p
              className="text-[10px] uppercase tracking-[0.25em] mb-3 font-mono"
              style={{ color: "rgba(246,185,76,0.6)" }}
            >
              Performance
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-0">
            <OdometerStat
              value={7}
              suffix="ms"
              label="File load time (1k files)"
              glowColor="rgba(246,185,76,0.18)"
            />
            <div className="relative md:border-x" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <OdometerStat
                value={312}
                label="Files scanned in parallel"
                glowColor="rgba(20,184,166,0.14)"
              />
            </div>
            <OdometerStat
              value={94}
              suffix="%"
              label="Cache hit rate"
              glowColor="rgba(246,185,76,0.18)"
            />
          </div>
        </div>
      </section>

      {/* ================================================================
          6. HYBRID SCORING — Two engines, one score
          ================================================================ */}
      <section className="relative py-28 md:py-36 px-6 z-10" style={{ background: "rgba(5,7,9,0.4)" }}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <Reveal>
            <p
              className="text-[10px] uppercase tracking-[0.25em] mb-3 font-mono"
              style={{ color: "rgba(20,184,166,0.7)" }}
            >
              Hybrid Scoring
            </p>
            <h2
              className="text-3xl md:text-4xl font-light text-white mb-6 tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Two engines. One score.
            </h2>
            <p
              className="leading-relaxed mb-6"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Ixos runs a parallel scoring pipeline. The lexical engine matches exact tokens
              for precision. The semantic engine embeds your query into the selected model’s vector space
              to capture conceptual similarity. Both are fused with an adaptive weighting
              algorithm that detects degradation attacks and adjusts automatically.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.25)" }}>
              The hybrid approach consistently outperforms either engine alone — especially
              on natural-language queries against codebases with mixed naming conventions.
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="space-y-5">
              <ScoreBar
                label="Lexical"
                score="0.78"
                pct="78%"
                color="#F6B94C"
                delay={0.3}
              />
              <ScoreBar
                label="Semantic"
                score="0.91"
                pct="91%"
                color="#14B8A6"
                delay={0.45}
              />
              <div className="pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-xs font-mono uppercase tracking-wider"
                    style={{ color: "rgba(255,255,255,0.7)" }}
                  >
                    Combined
                  </span>
                  <span className="text-xs font-mono text-white font-medium">0.94</span>
                </div>
                <div
                  className="h-4 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: "linear-gradient(90deg, #F6B94C 0%, #14B8A6 55%, #5EEAD4 100%)",
                    }}
                    initial={{ width: 0 }}
                    whileInView={{ width: "94%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, delay: 0.6, ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================================
          7. CODE CONTEXT — High-fidelity snippet
          ================================================================ */}
      <section className="relative py-28 md:py-36 px-6 z-10" style={{ background: "rgba(3,5,8,0.8)" }}>
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <p
              className="text-[10px] uppercase tracking-[0.25em] mb-3 font-mono"
              style={{ color: "rgba(124,92,255,0.7)" }}
            >
              Context
            </p>
            <h2
              className="text-3xl md:text-4xl font-light text-white mb-4 tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              High-fidelity code context
            </h2>
            <p className="mb-10 max-w-xl" style={{ color: "rgba(255,255,255,0.4)" }}>
              Results include highlighted source with matched lines, so you can evaluate
              relevance without switching windows.
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: "#0a0d14",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                className="px-5 py-3 flex items-center gap-3 font-mono text-xs"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <span style={{ color: "rgba(255,255,255,0.25)" }}>src/auth/</span>
                <span style={{ color: "rgba(255,255,255,0.6)" }}>session.ts</span>
                <span className="ml-auto" style={{ color: "rgba(20,184,166,0.5)" }}>:42-58</span>
              </div>
              <div className="p-5 font-mono text-[13px] leading-relaxed overflow-x-auto">
                <div className="flex">
                  <span className="select-none w-10 shrink-0 text-right pr-4" style={{ color: "rgba(255,255,255,0.15)" }}>41</span>
                  <span>
                    <span style={{ color: "#7C5CFF" }}>export async function</span>{" "}
                    <span style={{ color: "#F6B94C" }}>validateSession</span>(req: Request) {"{"}
                  </span>
                </div>
                <div
                  className="flex my-0.5 -mx-5 px-5 py-1"
                  style={{ background: "rgba(246,185,76,0.06)", borderLeft: "2px solid #F6B94C" }}
                >
                  <span className="select-none w-10 shrink-0 text-right pr-4" style={{ color: "rgba(255,255,255,0.15)" }}>42</span>
                  <span style={{ color: "rgba(246,185,76,0.9)" }}>{"  "}const token = extractBearerToken(req);</span>
                </div>
                <div
                  className="flex my-0.5 -mx-5 px-5 py-1"
                  style={{ background: "rgba(246,185,76,0.06)", borderLeft: "2px solid #F6B94C" }}
                >
                  <span className="select-none w-10 shrink-0 text-right pr-4" style={{ color: "rgba(255,255,255,0.15)" }}>43</span>
                  <span style={{ color: "rgba(246,185,76,0.9)" }}>
                    {"  "}<span style={{ color: "#7C5CFF" }}>if</span> (!token){" "}
                    <span style={{ color: "#7C5CFF" }}>throw new</span> AuthError(
                    <span style={{ color: "#14B8A6" }}>&quot;Missing token&quot;</span>);
                  </span>
                </div>
                <div className="flex">
                  <span className="select-none w-10 shrink-0 text-right pr-4" style={{ color: "rgba(255,255,255,0.15)" }}>44</span>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>
                    {"  "}const claims = <span style={{ color: "#7C5CFF" }}>await</span> verifyJWT(token);
                  </span>
                </div>
                <div className="flex">
                  <span className="select-none w-10 shrink-0 text-right pr-4" style={{ color: "rgba(255,255,255,0.15)" }}>45</span>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>
                    {"  "}<span style={{ color: "#7C5CFF" }}>return</span> {"{ "}userId: claims.sub, role: claims.role{" }"};
                  </span>
                </div>
                <div className="flex">
                  <span className="select-none w-10 shrink-0 text-right pr-4" style={{ color: "rgba(255,255,255,0.15)" }}>46</span>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>{"}"}</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================================
          8. EVIDENCE PANEL — Transparency / no black boxes
          ================================================================ */}
      <section
        className="relative py-28 md:py-36 px-6 z-10"
        style={{ background: "rgba(5,7,9,0.6)", borderTop: "1px solid rgba(255,255,255,0.04)" }}
      >
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
          <Reveal delay={0.15}>
            <div
              className="rounded-xl p-6"
              style={{
                background: "rgba(124,92,255,0.04)",
                border: "1px solid rgba(124,92,255,0.12)",
              }}
            >
              <p
                className="text-[10px] uppercase tracking-[0.25em] mb-4 font-mono"
                style={{ color: "rgba(124,92,255,0.7)" }}
              >
                Evidence card
              </p>
              <div className="space-y-4">
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
                  Matched because{" "}
                  <span className="font-mono text-xs" style={{ color: "#F6B94C" }}>validateSession</span> is
                  semantically equivalent to{" "}
                  <span className="font-mono text-xs" style={{ color: "#14B8A6" }}>&quot;token refresh&quot;</span>{" "}
                  in the embedding space (cosine: 0.91).
                </p>
                <div className="flex flex-wrap gap-2">
                  {["exact:token", "semantic:auth", "semantic:session", "recency:7d"].map((tag) => {
                    const col = tag.startsWith("exact")
                      ? "#F6B94C"
                      : tag.startsWith("semantic")
                        ? "#14B8A6"
                        : "#7C5CFF";
                    return (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded text-[10px] font-mono"
                        style={{
                          background: `${col}14`,
                          color: col,
                          border: `1px solid ${col}30`,
                        }}
                      >
                        {tag}
                      </span>
                    );
                  })}
                </div>
                <div className="pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-2 text-xs font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#14B8A6" }} />
                    Behavioral score: normal · no degradation detected
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal>
            <p
              className="text-[10px] uppercase tracking-[0.25em] mb-3 font-mono"
              style={{ color: "rgba(124,92,255,0.7)" }}
            >
              Transparency
            </p>
            <h2
              className="text-3xl md:text-4xl font-light text-white mb-6 tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              No black boxes.
            </h2>
            <p className="leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.45)" }}>
              Every result includes a full evidence breakdown. You see the exact lexical matches,
              the semantic similarity vector, and the recency weighting that produced the final rank.
              The behavioral scoring engine monitors for anomalous patterns that could indicate a
              degradation attack on the search pipeline.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>
              Click any result in the Ixos UI to inspect its rationale. Match tags show which signals
              contributed, and the evidence card explains why the result ranked where it did.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ================================================================
          9. WORKSTREAMS DEMO
          ================================================================ */}
      <section className="relative py-28 md:py-36 px-6 z-10" style={{ background: "rgba(3,5,8,0.8)" }}>
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-12">
            <p
              className="text-[10px] uppercase tracking-[0.25em] mb-3 font-mono"
              style={{ color: "rgba(20,184,166,0.7)" }}
            >
              Workstreams
            </p>
            <h2
              className="text-3xl md:text-4xl font-light text-white tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Session Recovery
            </h2>
            <p className="mt-4 max-w-lg mx-auto" style={{ color: "rgba(255,255,255,0.35)" }}>
              Pick up exactly where you left off. Ixos tracks your active workstreams, recent files,
              and search context across sessions.
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <div
              className="rounded-xl overflow-hidden"
              style={{
                height: "480px",
                minHeight: "480px",
                border: "1px solid rgba(20,184,166,0.12)",
                background: "rgba(8,12,20,0.9)",
                backdropFilter: "blur(16px)",
                boxShadow:
                  "0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(20,184,166,0.04)",
              }}
            >
              <DemoSurface
                initialView="workstreams"
                initialQuery="What was I working on in the auth module?"
                autoRun={false}
                presets={[
                  "What was I working on in the auth module?",
                  "Find my recent database migration work",
                  "Show all rate limiter changes",
                ]}
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================================
          10. PRIVACY BLUEPRINT — 3×2 grid
          ================================================================ */}
      <section
        id="privacy"
        className="relative py-28 md:py-36 px-6 z-10"
        style={{ background: "rgba(5,7,9,0.6)", borderTop: "1px solid rgba(255,255,255,0.04)" }}
      >
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-14">
            <p
              className="text-[10px] uppercase tracking-[0.25em] mb-3 font-mono"
              style={{ color: "rgba(246,185,76,0.6)" }}
            >
              Architecture
            </p>
            <h2
              className="text-3xl md:text-4xl font-light text-white tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Privacy by construction
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PRIVACY_ITEMS.map((item, i) => (
              <Reveal key={item.label} delay={i * 0.08}>
                <div
                  className="rounded-lg p-5 h-full"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: i % 2 === 0 ? "#F6B94C" : "#14B8A6" }}
                    />
                    <span className="text-white text-sm font-medium">{item.label}</span>
                  </div>
                  <p className="text-xs leading-relaxed font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {item.detail}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Data flow diagram */}
          <Reveal delay={0.5} className="mt-12">
            <div className="flex items-center justify-center gap-4 text-xs font-mono flex-wrap">
              <span
                className="px-4 py-2.5 rounded-lg"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                Your Codebase
              </span>
              <svg className="w-6 h-4" viewBox="0 0 24 16" fill="none" stroke="#14B8A6" strokeWidth="1.5" style={{ opacity: 0.4 }}>
                <path d="M2 8h16m0 0l-4-4m4 4l-4 4" />
              </svg>
              <span
                className="px-4 py-2.5 rounded-lg"
                style={{
                  background: "rgba(20,184,166,0.06)",
                  border: "1px solid rgba(20,184,166,0.2)",
                  color: "rgba(20,184,166,0.8)",
                }}
              >
                Local Vector Index
              </span>
              <span className="mx-2" style={{ color: "rgba(255,255,255,0.12)" }}>//</span>
              <span
                className="px-4 py-2.5 rounded-lg line-through"
                style={{
                  background: "rgba(255,255,255,0.01)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  color: "rgba(255,255,255,0.18)",
                }}
              >
                Cloud APIs
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================================
          11. INTEGRATIONS
          ================================================================ */}
      <section className="relative py-28 md:py-36 px-6 z-10" style={{ background: "rgba(3,5,8,0.8)" }}>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-16 items-center">
          <Reveal>
            <p
              className="text-[10px] uppercase tracking-[0.25em] mb-3 font-mono"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              Integrations
            </p>
            <h2
              className="text-3xl md:text-4xl font-light text-white tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Works where you work.
            </h2>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: "VS Code", desc: "Extension with inline results" },
                { name: "NeoVim", desc: "Telescope integration" },
                { name: "JetBrains", desc: "Tool window plugin" },
                { name: "CLI", desc: "Pipe-friendly output formats" },
              ].map((tool) => (
                <div
                  key={tool.name}
                  className="rounded-lg p-4"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div className="text-white text-sm font-medium mb-1">{tool.name}</div>
                  <div className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>{tool.desc}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================================
          12. PRICING
          ================================================================ */}
      <OpenSourceNotice variant="2" />

      {/* ================================================================
          13. CTA FOOTER — with teal beam sweep
          ================================================================ */}
      <section
        id="cta"
        className="relative py-36 md:py-48 px-6 z-10 overflow-hidden"
        style={{ background: "rgba(3,5,8,0.9)" }}
      >
        {/* Teal beam sweep */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
          style={{
            background: "linear-gradient(90deg, transparent 0%, #14B8A6 50%, transparent 100%)",
            opacity: 0.3,
          }}
        />
        <motion.div
          className="absolute bottom-0 pointer-events-none"
          style={{
            width: "40%",
            height: "1px",
            background: "linear-gradient(90deg, transparent, #14B8A6, transparent)",
            opacity: 0.6,
          }}
          animate={{ left: ["-40%", "100%"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }}
        />

        <Reveal className="max-w-2xl mx-auto text-center">
          <h2
            className="text-4xl md:text-5xl lg:text-6xl font-light text-white mb-10 tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Start searching locally.
          </h2>

          <div className="relative max-w-md mx-auto mb-6">
            <input
              type="email"
              placeholder="you@company.com"
              className="w-full rounded-lg px-5 py-4 pr-28 text-sm text-white placeholder:text-white/20 focus:outline-none transition-colors"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            />
            <button
              className="absolute right-1.5 top-1.5 bottom-1.5 px-5 rounded-md text-sm font-mono font-medium text-black hover:brightness-110 transition-all"
              style={{ background: "#F6B94C" }}
            >
              Get access
            </button>
          </div>

          <p className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
            No credit card. No telemetry. Your email delivers the download link once.
          </p>
        </Reveal>

        {/* Footer line */}
        <div className="absolute bottom-6 left-0 right-0 text-center">
          <p className="text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.1)" }}>
            &copy; 2026 Ixos &middot; All rights reserved
          </p>
        </div>
      </section>
    </div>
  );
}
