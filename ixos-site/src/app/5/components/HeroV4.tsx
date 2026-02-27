"use client";

// ─── HeroV4 — Cinematic 3D Pipeline Hero ────────────────────────────────────
// The 3D scene IS the hero. No terminal demo (moved to V4InteractiveDemoSection).
// The IxosCoreScene shows the search pipeline live: scatter → query → sweep → rerank → lock.
// Headline and CTAs overlay the lower third of the hero with a strong gradient.

import { Suspense, Component, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import Link from "next/link";
import { useReducedOrLowEnd } from "./useReducedOrLowEnd";

const IxosCoreScene = dynamic(
  () => import("./IxosCoreScene").then((m) => m.IxosCoreScene),
  { ssr: false }
);

// ─── Error boundary ───────────────────────────────────────────────────────────
interface EBState { hasError: boolean }
class SceneErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, EBState> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

// ─── Fallback hero when WebGL unavailable ─────────────────────────────────────
function CoreFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {/* Concentric rings + node cluster fallback */}
      <svg viewBox="-220 -220 440 440" width="520" height="520" style={{ overflow: "visible" }}>
        {/* Outer reference ring */}
        <circle cx="0" cy="0" r="200" fill="none" stroke="rgba(45,212,191,0.04)" strokeWidth="0.5" />
        <circle cx="0" cy="0" r="150" fill="none" stroke="rgba(45,212,191,0.06)" strokeWidth="0.4" strokeDasharray="4 12" />
        <circle cx="0" cy="0" r="100" fill="none" stroke="rgba(124,58,237,0.08)" strokeWidth="0.4" strokeDasharray="3 9" />

        {/* Scattered file nodes */}
        {[
          [-80, -60], [90, -90], [-110, 30], [70, 80], [-40, 110],
          [130, 20], [-90, -100], [40, -130], [-150, 60], [110, 110],
          [-60, 150], [160, -50], [-130, -30], [30, 140], [-20, -150],
        ].map(([x, y], i) => (
          <g key={i} transform={`translate(${x},${y})`}>
            <rect x="-7" y="-9" width="14" height="18" rx="1"
              fill="rgba(45,212,191,0.05)" stroke="rgba(45,212,191,0.22)" strokeWidth="0.6" />
            <line x1="-3" y1="-4" x2="5" y2="-4" stroke="rgba(45,212,191,0.3)" strokeWidth="0.5" />
            <line x1="-3" y1="0" x2="3" y2="0" stroke="rgba(45,212,191,0.2)" strokeWidth="0.5" />
          </g>
        ))}

        {/* Center glow */}
        <circle cx="0" cy="0" r="18" fill="rgba(45,212,191,0.06)" stroke="#2DD4BF" strokeWidth="0.8" />
        <circle cx="0" cy="0" r="8" fill="rgba(45,212,191,0.12)" />

        {/* Sweep ring illustration */}
        <circle cx="0" cy="0" r="95" fill="none" stroke="rgba(245,158,11,0.15)" strokeWidth="1.5" strokeDasharray="8 4" />
      </svg>
    </div>
  );
}

const TELEMETRY = [
  { label: "Mode", value: "Local-first", color: "#F59E0B" },
  { label: "Retrieval", value: "Hybrid", color: "#2DD4BF" },
  { label: "Results", value: "Progressive", color: "#7C3AED" },
  { label: "Telemetry", value: "None", color: "rgba(255,255,255,0.28)" },
];

export function HeroV4() {
  const lowEnd = useReducedOrLowEnd();

  return (
    <section
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: "#0C0E10" }}
    >
      {/* ── 3D Scene — FULL SCREEN, FULL OPACITY ─────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        {lowEnd ? (
          <CoreFallback />
        ) : (
          <SceneErrorBoundary fallback={<CoreFallback />}>
            <Suspense fallback={<CoreFallback />}>
              <IxosCoreScene lowEnd={false} />
            </Suspense>
          </SceneErrorBoundary>
        )}
      </div>

      {/* ── Blueprint grid overlay ──────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.014) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.014) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />

      {/* ── Corner calibration marks ─────────────────────────────────────── */}
      {(["top-6 left-6", "top-6 right-6", "bottom-6 left-6", "bottom-6 right-6"] as const).map((pos) => (
        <div key={pos} className={`absolute ${pos} w-6 h-6 pointer-events-none`}>
          <div className="absolute top-0 left-0 w-full h-px" style={{ backgroundColor: "rgba(255,255,255,0.10)" }} />
          <div className="absolute top-0 left-0 h-full w-px" style={{ backgroundColor: "rgba(255,255,255,0.10)" }} />
        </div>
      ))}

      {/* ── Large gradient — ensures text readability over 3D scene ─────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            linear-gradient(
              to bottom,
              transparent 0%,
              rgba(12,14,16,0.10) 35%,
              rgba(12,14,16,0.55) 62%,
              rgba(12,14,16,0.90) 80%,
              #0C0E10 100%
            )
          `,
        }}
      />

      {/* ── Spacer to push content down ──────────────────────────────────── */}
      <div className="flex-1" />

      {/* ── Content overlay — lower ~40% of hero ─────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 pb-16 max-w-4xl mx-auto w-full">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-6"
        >
          <div
            className="inline-flex items-center gap-2.5 px-4 py-1.5 font-mono text-[9px] tracking-[0.3em] uppercase"
            style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }}
          >
            <span className="w-1.5 h-1.5 animate-pulse" style={{ backgroundColor: "#2DD4BF" }} />
            Ixos Protocol · Semantic Search Engine
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.65 }}
          className="font-display font-bold text-white leading-[1.02] mb-4"
          style={{ fontSize: "clamp(2.6rem, 7vw, 5.2rem)" }}
        >
          Find what you{" "}
          <span
            style={{
              WebkitTextFillColor: "transparent",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              backgroundImage: "linear-gradient(135deg, #7C3AED 0%, #a855f7 50%, #2DD4BF 100%)",
            }}
          >
            mean
          </span>
          ,{" "}
          <br className="hidden sm:block" />
          not what you typed.
        </motion.h1>

        {/* Subline */}
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36, duration: 0.55 }}
          className="font-mono text-sm leading-relaxed mb-9 max-w-md"
          style={{ color: "rgba(255,255,255,0.40)" }}
        >
          Local-first semantic search. Progressive results. Your machine. No egress.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="flex flex-wrap gap-4 justify-center mb-12"
        >
          <Link
            href="/download"
            className="font-mono text-xs px-9 py-3.5 font-semibold tracking-[0.22em] uppercase transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: "#2DD4BF", color: "#0C0E10" }}
          >
            Download
          </Link>
          <Link
            href="/docs"
            className="font-mono text-xs px-9 py-3.5 tracking-[0.22em] uppercase transition-all duration-200 active:scale-[0.98]"
            style={{ border: "1px solid rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.48)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.30)";
              (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.75)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.14)";
              (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.48)";
            }}
          >
            CLI Docs
          </Link>
        </motion.div>

        {/* Telemetry strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75, duration: 0.7 }}
          className="flex flex-wrap justify-center gap-8 md:gap-14 pt-6"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          {TELEMETRY.map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-1.5">
              <div className="font-mono text-[8px] tracking-[0.3em] uppercase" style={{ color: "rgba(255,255,255,0.18)" }}>
                {item.label}
              </div>
              <div className="font-mono text-[10px] tracking-[0.12em]" style={{ color: item.color }}>
                {item.value}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Scroll indicator ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
      >
        <span className="font-mono text-[8px] tracking-[0.35em] uppercase" style={{ color: "rgba(255,255,255,0.12)" }}>
          Scroll
        </span>
        <div className="w-px h-10" style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.12), transparent)" }} />
      </motion.div>
    </section>
  );
}
