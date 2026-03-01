"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, useInView } from "framer-motion";
import { DemoSurface } from "@/landing/DemoSurface";
import { GridBackground } from "./GridBackground";
import { ScanBeam } from "./ScanBeam";
import { useDecodeEffect } from "./useDecodeEffect";
import { CornerBrackets } from "./CornerBrackets";

/* ──────────────────────────────────────────────
   Section kicker label
   ────────────────────────────────────────────── */
function SectionKicker({
  label,
  color = "text-amber-400/60",
}: {
  label: string;
  color?: string;
}) {
  return (
    <div className={`text-xs font-mono tracking-[0.3em] uppercase mb-4 ${color}`}>
      ▸ {label}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Decoded heading (character-by-character reveal)
   ────────────────────────────────────────────── */
function DecodedHeading({
  text,
  as: Tag = "h2",
  className = "text-4xl md:text-5xl font-bold font-mono",
  delay = 0,
}: {
  text: string;
  as?: "h1" | "h2" | "h3";
  className?: string;
  delay?: number;
}) {
  const { ref, display } = useDecodeEffect(text, delay);
  return (
    <Tag
      ref={ref as React.Ref<HTMLHeadingElement>}
      className={className}
      style={{ letterSpacing: "-0.02em", lineHeight: 1.1 }}
    >
      {display}
    </Tag>
  );
}

/* ──────────────────────────────────────────────
   Signal Locked badge
   ────────────────────────────────────────────── */
function SignalLocked({ delay = 0 }: { delay?: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 border border-amber-400/30 rounded text-xs font-mono text-amber-400/60 uppercase tracking-widest transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
      Signal Locked
    </div>
  );
}

/* ──────────────────────────────────────────────
   Clip-path reveal + scan section wrapper
   Combines: fade-in translateY (existing) + clip-path wipe (new)
   ────────────────────────────────────────────── */
function ScanSection({
  children,
  threshold = 0.1,
  clipFrom = "right",
}: {
  children: React.ReactNode;
  threshold?: number;
  clipFrom?: "left" | "right";
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  // clip-path direction: right means content starts clipped from right (inset 0 100% 0 0)
  // left means content starts clipped from left (inset 0 0 0 100%)
  const clipStart = clipFrom === "right" ? "inset(0 100% 0 0)" : "inset(0 0 0 100%)";
  const clipEnd = "inset(0 0% 0 0)";

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0.04,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        clipPath: visible ? clipEnd : clipStart,
        transition: `
          opacity 1.2s ease,
          transform 1.2s ease,
          clip-path 1.8s cubic-bezier(0.16, 1, 0.3, 1) 200ms
        `,
      }}
    >
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Radar Ping — periodic amber circle pulse
   Fires 4s after mount, then every 8s.
   ────────────────────────────────────────────── */
function RadarPing({ scanY }: { scanY: number }) {
  const [pingKey, setPingKey] = useState(0);
  const [active, setActive] = useState(false);
  const [pingY, setPingY] = useState(50);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanYRef = useRef(scanY);
  scanYRef.current = scanY;

  useEffect(() => {
    function firePing() {
      // Clear any existing hide timer
      if (hideRef.current) clearTimeout(hideRef.current);
      setPingY(scanYRef.current > 5 ? scanYRef.current : 50);
      setPingKey((k) => k + 1);
      setActive(true);
      hideRef.current = setTimeout(() => setActive(false), 3000);
    }

    const initialDelay = setTimeout(() => {
      firePing();
      const interval = setInterval(firePing, 8000);
      // Store interval on ref so cleanup can reach it
      return () => clearInterval(interval);
    }, 4000);

    return () => {
      clearTimeout(initialDelay);
      if (hideRef.current) clearTimeout(hideRef.current);
    };
  }, []);

  if (!active) return null;

  return (
    <div
      className="fixed pointer-events-none z-30"
      style={{
        left: '50%',
        top: `${pingY}vh`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div
        key={`ping-${pingKey}`}
        style={{
          width: '80vw',
          height: '80vw',
          maxWidth: '80vw',
          borderRadius: '50%',
          border: '1px solid rgba(246,185,76,0.2)',
          animation: 'radar-ping 3s ease-out forwards',
        }}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────
   Floating Pill Nav — HUD style
   ────────────────────────────────────────────── */
function FloatingNav() {
  const links = [
    { label: "Speed", href: "#speed" },
    { label: "Privacy", href: "#privacy" },
    { label: "Pipeline", href: "#pipeline" },
    { label: "CLI", href: "#cli" },
  ];

  return (
    <nav className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-2 py-1.5 rounded-full border border-amber-400/10 bg-[#0A0D0F]/80 backdrop-blur-xl shadow-lg shadow-black/40">
      <a
        href="#hero"
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-mono font-semibold text-amber-400 tracking-tight"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
          <path
            d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        IXOS
      </a>
      <div className="w-px h-5 bg-amber-400/10 mx-1" />
      {links.map((l) => (
        <a
          key={l.href}
          href={l.href}
          className="px-3 py-1.5 text-[13px] font-mono text-white/40 hover:text-amber-400/80 transition-colors rounded-full hover:bg-amber-400/5"
        >
          {l.label}
        </a>
      ))}
      <a
        href="#download"
        className="ml-1 px-4 py-1.5 text-[13px] font-mono font-semibold rounded-full bg-amber-400 text-[#0A0D0F] hover:bg-amber-300 transition-colors"
      >
        Download
      </a>
    </nav>
  );
}

/* ──────────────────────────────────────────────
   Score Bar
   ────────────────────────────────────────────── */
function ScoreBar({
  label,
  value,
  color,
  inView,
  delay = 0,
}: {
  label: string;
  value: number;
  color: string;
  inView: boolean;
  delay?: number;
}) {
  return (
    <div className="mb-6">
      <div className="flex justify-between mb-2">
        <span className="text-sm text-white/50 font-mono uppercase tracking-widest">{label}</span>
        <span className="text-sm font-mono" style={{ color }}>
          {value.toFixed(2)}
        </span>
      </div>
      <div className="h-1.5 rounded-none bg-white/5 overflow-hidden">
        <motion.div
          className="h-full"
          style={{ backgroundColor: color }}
          initial={{ width: "0%" }}
          animate={inView ? { width: `${value * 100}%` } : {}}
          transition={{ duration: 0.8, delay, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Signal Feed — smooth CSS scroll animation
   ────────────────────────────────────────────── */
const LOG_LINES = [
  { time: "14:32:11", op: "SCAN ", file: "src/auth/token-manager.ts        ", status: "0.78", color: "text-teal-400" },
  { time: "14:32:11", op: "EMBED", file: "model2vec f16 vector             ", status: "DONE", color: "text-amber-400" },
  { time: "14:32:11", op: "HMAC ", file: "sha256 signature verified        ", status: "LOCKED", color: "text-amber-400" },
  { time: "14:32:12", op: "RANK ", file: "hybrid_engine candidates=47      ", status: "READY", color: "text-teal-400" },
  { time: "14:32:12", op: "CACHE", file: "ADS write completed              ", status: "✓", color: "text-green-400" },
  { time: "14:32:13", op: "SCAN ", file: "src/middleware/jwt.ts            ", status: "0.64", color: "text-teal-400" },
  { time: "14:32:13", op: "EMBED", file: "cache hit (ADS)                  ", status: "HIT", color: "text-amber-400" },
  { time: "14:32:14", op: "RANK ", file: "score=0.91 threshold=0.60        ", status: "MATCH", color: "text-green-400" },
  { time: "14:32:14", op: "ATTEST", file: "ed25519 signature applied       ", status: "SIGNED", color: "text-amber-400" },
];

function SignalFeed() {
  const [lines, setLines] = useState<typeof LOG_LINES>([]);
  const idx = useRef(0);

  useEffect(() => {
    // Seed initial lines so the feed isn't empty on first render
    const initial = LOG_LINES.slice(0, 4);
    setLines(initial);
    idx.current = 4;

    const interval = setInterval(() => {
      setLines((prev) => {
        const next = [...prev, LOG_LINES[idx.current % LOG_LINES.length]];
        idx.current++;
        return next.slice(-12);
      });
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <ScanSection clipFrom="left">
      <section className="py-24 px-6 relative">
        <div className="max-w-4xl mx-auto relative">
          <CornerBrackets size={20} color="rgba(246,185,76,0.15)" />
          <div className="p-8">
            <SectionKicker label="Signal Feed — Live" color="text-teal-400/70" />
            <DecodedHeading text="Every operation. Logged. Signed." delay={100} />
            <p className="mt-4 text-white/50 font-mono text-sm max-w-xl mb-8">
              Watch the engine in real-time: each file scan, embedding, HMAC verification,
              and ranking step surfaces as a timestamped operation record.
            </p>
            <div className="font-mono text-xs bg-[#0A0D0F]/90 border border-amber-400/10 rounded-none p-6 h-64 overflow-hidden relative">
              <div className="absolute top-3 right-4 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
                <span className="text-teal-400/50 text-[10px] uppercase tracking-widest">live</span>
              </div>
              {/* Fade mask at top */}
              <div
                className="absolute top-0 left-0 right-0 h-16 pointer-events-none z-10"
                style={{
                  background: 'linear-gradient(to bottom, #0A0D0F 0%, transparent 100%)',
                }}
              />
              <div className="absolute bottom-6 left-6 right-6 space-y-1.5">
                {lines.map((line, i) => (
                  <div
                    key={i}
                    className="flex gap-3"
                    style={{
                      opacity: Math.min(1, (i + 1) / Math.max(lines.length, 1)),
                      transition: 'opacity 0.6s ease',
                    }}
                  >
                    <span className="text-white/25 shrink-0">[{line.time}]</span>
                    <span className="text-white/50 shrink-0">{line.op}</span>
                    <span className="text-white/35 flex-1 truncate">{line.file}</span>
                    <span className={`${line.color} shrink-0`}>{line.status}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <SignalLocked delay={800} />
            </div>
          </div>
        </div>
      </section>
    </ScanSection>
  );
}

/* ──────────────────────────────────────────────
   Threat Model Section
   ────────────────────────────────────────────── */
function ThreatModelSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <ScanSection clipFrom="right">
      <section className="py-24 px-6 relative">
        <div className="max-w-4xl mx-auto relative">
          <CornerBrackets size={20} color="rgba(246,185,76,0.15)" />
          <div className="p-8">
            <SectionKicker label="Threat Model" />
            <DecodedHeading text="Cloud search = code exfiltration." delay={80} />
            <p className="mt-4 text-white/50 font-mono text-sm max-w-xl mb-10">
              Every cloud-based search indexes your proprietary codebase on remote servers.
              Every query you run teaches them your architecture. Ixos sends nothing.
            </p>

            <div ref={ref} className="space-y-5 max-w-2xl">
              <div>
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-white/40 uppercase tracking-widest">Cloud Search</span>
                  <span className="text-red-400">~2.4 GB / month</span>
                </div>
                <div className="h-2 bg-white/5 overflow-hidden relative">
                  <motion.div
                    className="h-full bg-red-500/70 absolute left-0 top-0"
                    initial={{ width: "0%" }}
                    animate={inView ? { width: "100%" } : {}}
                    transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                  />
                </div>
                <div className="mt-1 text-[10px] font-mono text-white/20 uppercase tracking-widest">
                  Files indexed, queries logged, architecture exposed
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-amber-400 uppercase tracking-widest">Ixos Protocol</span>
                  <span className="text-amber-400">0 B</span>
                </div>
                <div className="h-2 bg-white/5 overflow-hidden relative">
                  <div className="h-full w-0 bg-amber-400" />
                </div>
                <div className="mt-1 text-[10px] font-mono text-amber-400/40 uppercase tracking-widest">
                  Zero bytes transmitted. Zero telemetry. Zero trust required.
                </div>
              </div>

              {/* ASCII divider */}
              <div className="pt-4 font-mono text-[11px] text-white/15 leading-relaxed">
                <div>┌─────────────────────────────────────────────────────────┐</div>
                <div>│  IXOS SENDS: 0 bytes.  Every search stays on your SSD. │</div>
                <div>└─────────────────────────────────────────────────────────┘</div>
              </div>
            </div>

            <div className="mt-6">
              <SignalLocked delay={1200} />
            </div>
          </div>
        </div>
      </section>
    </ScanSection>
  );
}

/* ──────────────────────────────────────────────
   Footer CTA
   ────────────────────────────────────────────── */
function FooterCTA() {
  return (
    <ScanSection clipFrom="right">
      <section id="download" className="py-32 px-6 relative">
        <div className="max-w-3xl mx-auto text-center relative">
          <CornerBrackets size={24} color="rgba(246,185,76,0.2)" />
          <div className="p-12">
            <SectionKicker label="Acquire" color="text-amber-400/60" />
            <DecodedHeading
              text="Stop searching the cloud."
              as="h2"
              className="text-4xl md:text-5xl font-bold font-mono"
              delay={50}
            />
            <p className="mt-6 mb-10 text-white/45 font-mono text-sm max-w-lg mx-auto leading-relaxed">
              Your code deserves a search engine that respects it. Local-first.
              Sub-second. Cryptographically verifiable.
            </p>
            <a
              href="#"
              className="inline-block px-10 py-4 bg-amber-400 text-[#0A0D0F] font-mono font-bold text-sm hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/20"
            >
              ▸ Download Ixos
            </a>
            <div className="mt-8 flex flex-wrap justify-center gap-6 text-xs font-mono text-white/25">
              <span>macOS / Windows / Linux</span>
              <span className="text-white/10">|</span>
              <span>MIT License</span>
              <span className="text-white/10">|</span>
              <span>Zero telemetry</span>
            </div>
          </div>
        </div>
        <div className="mt-12 text-center text-white/15 text-xs font-mono">
          2026 Ixos Inc. All rights reserved.
        </div>
      </section>
    </ScanSection>
  );
}

/* ══════════════════════════════════════════════
   PAGE
   ══════════════════════════════════════════════ */
export default function Page3PrecisionGrid() {
  const scoreRef = useRef<HTMLDivElement>(null);
  const scoreInView = useInView(scoreRef, { once: true, margin: "-100px" });
  const [scanY, setScanY] = useState(50);
  const handleScanProgress = useCallback((y: number) => {
    setScanY(y);
  }, []);

  return (
    <>
      {/* Global keyframes for radar ping and grid pulse */}
      <style>{`
        @keyframes radar-ping {
          0% {
            transform: scale(0);
            opacity: 0.25;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }
        @keyframes grid-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 1.5; }
        }
      `}</style>

      <main
        className="relative min-h-screen text-[#f3f5f7] overflow-x-hidden font-mono selection:bg-amber-400/30"
        style={{ backgroundColor: '#0A0D0F' }}
      >
        {/* ── Amber Grid Background ── */}
        <GridBackground />

        {/* ── Scan Beam (sweeps once on load) ── */}
        <ScanBeam onProgress={handleScanProgress} />

        {/* ── Radar Ping (periodic amber circle) ── */}
        <RadarPing scanY={scanY} />

        <FloatingNav />

        {/* ═══════════════════════════════════
            1. HERO — Scan reveal
            ═══════════════════════════════════ */}
        <section
          id="hero"
          className="relative min-h-screen flex flex-col items-center justify-center pt-28 pb-16 px-6 z-10"
        >
          {/* Subtle amber glow center */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              width: '60vw',
              height: '40vh',
              background: 'radial-gradient(ellipse, rgba(246,185,76,0.04) 0%, transparent 70%)',
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="relative z-10 text-center mb-12 max-w-4xl mx-auto"
          >
            <div className="mb-6">
              <SectionKicker label="System initializing — Precision Grid v3.0" />
            </div>

            <h1
              className="text-5xl sm:text-6xl md:text-8xl font-bold font-mono mb-6"
              style={{ letterSpacing: "-0.03em", lineHeight: 1.05, color: '#F6B94C' }}
            >
              The impact of
              <br />
              <span className="text-[#f3f5f7]">instant search.</span>
            </h1>
            <p className="text-base md:text-lg max-w-2xl mx-auto font-mono text-white/50 leading-relaxed">
              Drop Ixos into your codebase. Watch clarity ripple through your engineering
              workflow. Local-first. Sub-second. Deterministic.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="relative z-10 w-full max-w-5xl overflow-hidden border border-amber-400/10 bg-[#0A0D0F]/90 shadow-2xl shadow-amber-400/5"
            style={{ minHeight: 720 }}
          >
            {/* HUD frame top bar */}
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-amber-400/10 bg-amber-400/[0.02]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                <span className="text-amber-400/60 text-[11px] font-mono uppercase tracking-widest">
                  Ixos Search Engine — Active
                </span>
              </div>
              <SignalLocked delay={1400} />
            </div>
            <DemoSurface initialQuery="authentication token refresh" autoRun />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="relative z-10 flex flex-wrap justify-center gap-4 mt-10"
          >
            <a
              href="#download"
              className="px-8 py-3.5 bg-amber-400 text-[#0A0D0F] font-mono font-semibold text-sm hover:bg-amber-300 transition-colors"
            >
              ▸ Download Ixos
            </a>
            <a
              href="#pipeline"
              className="px-8 py-3.5 border border-amber-400/20 text-amber-400/60 font-mono text-sm hover:bg-amber-400/5 transition-colors"
            >
              Explore Pipeline
            </a>
          </motion.div>
        </section>

        {/* ═══════════════════════════════════
            2. SPEED — Metrics
            ═══════════════════════════════════ */}
        <ScanSection clipFrom="right">
          <section id="speed" className="relative z-10 py-28 px-6">
            <div className="max-w-5xl mx-auto relative">
              <CornerBrackets size={20} color="rgba(246,185,76,0.12)" />
              <div className="p-8">
                <SectionKicker label="Performance" />
                <DecodedHeading text="Frictionless speed." />
                <p className="mt-4 mb-12 text-white/45 font-mono text-sm max-w-xl leading-relaxed">
                  Every millisecond matters. Ixos searches your entire codebase before your
                  finger lifts off the key.
                </p>

                <div className="flex flex-col gap-4">
                  {[
                    {
                      metric: "Sub-second search",
                      detail: "Average query resolves in under 50ms across 10k+ files",
                      color: "#F6B94C",
                      tag: "LATENCY",
                    },
                    {
                      metric: "312 files in 7ms",
                      detail: "Parallel Rayon-powered file scanning with zero blocking I/O",
                      color: "#F6B94C",
                      tag: "THROUGHPUT",
                    },
                    {
                      metric: "94% cache reuse",
                      detail: "HMAC-SHA256 signed embeddings cached in NTFS ADS or xattr",
                      color: "#F6B94C",
                      tag: "EFFICIENCY",
                    },
                  ].map((row) => (
                    <div
                      key={row.metric}
                      className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-5 px-6 border border-amber-400/10 bg-amber-400/[0.02] relative"
                    >
                      <span
                        className="absolute top-2 right-3 text-[9px] font-mono tracking-widest"
                        style={{ color: 'rgba(246,185,76,0.3)' }}
                      >
                        [{row.tag}]
                      </span>
                      <span className="text-2xl md:text-3xl font-bold font-mono" style={{ color: row.color }}>
                        {row.metric}
                      </span>
                      <span className="text-sm font-mono text-white/40">{row.detail}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <SignalLocked delay={600} />
                </div>
              </div>
            </div>
          </section>
        </ScanSection>

        {/* ═══════════════════════════════════
            3. PRIVACY — Zero-trust
            ═══════════════════════════════════ */}
        <ScanSection clipFrom="left">
          <section id="privacy" className="relative z-10 py-28 px-6">
            <div className="max-w-5xl mx-auto relative">
              <CornerBrackets size={20} color="rgba(20,184,166,0.15)" />
              <div className="p-8">
                <SectionKicker label="Security Posture" color="text-teal-400/60" />
                <DecodedHeading text="Zero-trust by default." delay={60} />
                <p className="mt-4 mb-12 text-white/45 font-mono text-sm max-w-xl leading-relaxed">
                  Your intellectual property never leaves your SSD. Not a single byte is
                  transmitted, logged, or telemetered.
                </p>

                <div className="flex flex-col gap-4">
                  {[
                    {
                      metric: "Zero cloud dependency",
                      detail: "All embedding generation and search ranking runs on your local CPU",
                      color: "#14B8A6",
                      tag: "ISOLATION",
                    },
                    {
                      metric: "HMAC-SHA256 signing",
                      detail: "Every cached embedding is cryptographically signed to prevent tampering",
                      color: "#14B8A6",
                      tag: "INTEGRITY",
                    },
                    {
                      metric: "mlock memory protection",
                      detail: "Sensitive buffers locked in RAM and zeroized on drop. Never swapped to disk.",
                      color: "#14B8A6",
                      tag: "SECMEM",
                    },
                  ].map((row) => (
                    <div
                      key={row.metric}
                      className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-5 px-6 border border-teal-400/10 bg-teal-400/[0.02] relative"
                    >
                      <span
                        className="absolute top-2 right-3 text-[9px] font-mono tracking-widest"
                        style={{ color: 'rgba(20,184,166,0.3)' }}
                      >
                        [{row.tag}]
                      </span>
                      <span className="text-2xl md:text-3xl font-bold font-mono" style={{ color: row.color }}>
                        {row.metric}
                      </span>
                      <span className="text-sm font-mono text-white/40">{row.detail}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <SignalLocked delay={600} />
                </div>
              </div>
            </div>
          </section>
        </ScanSection>

        {/* ═══════════════════════════════════
            4. PIPELINE — 4-stage HUD
            ═══════════════════════════════════ */}
        <ScanSection clipFrom="right">
          <section id="pipeline" className="relative z-10 py-28 px-6">
            <div className="max-w-5xl mx-auto relative">
              <div className="text-center mb-14">
                <SectionKicker label="Pipeline" />
                <DecodedHeading text="The crystallized pipeline." delay={40} />
                <p className="mt-4 text-white/45 font-mono text-sm max-w-xl mx-auto">
                  Four stages. From raw filesystem scan to cryptographically locked results.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    stage: "01",
                    title: "Scan",
                    desc: "Rust file-watcher daemon monitors your project in real-time. Rate-limited at 100 events/sec with dedup and symlink protection. Changes are captured instantly.",
                    color: "#F6B94C",
                    tag: "FS_WATCH",
                  },
                  {
                    stage: "02",
                    title: "Lexical",
                    desc: "BM25-powered keyword matching with parallel Rayon processing. Pre-filters millions of tokens across your entire directory tree in under 10ms.",
                    color: "#14B8A6",
                    tag: "BM25_ENGINE",
                  },
                  {
                    stage: "03",
                    title: "Semantic",
                    desc: "Model2Vec embeddings generated locally via ONNX runtime. Cosine similarity ranking surfaces intent-matching results that keyword search alone would miss.",
                    color: "#7C5CFF",
                    tag: "EMBED_LOCAL",
                  },
                  {
                    stage: "04",
                    title: "Locked",
                    desc: "Final hybrid score fuses lexical, semantic, and quality signals. Results are integrity-verified with behavioral scoring and attack detection. Deterministic output.",
                    color: "#F6B94C",
                    tag: "HYBRID_LOCK",
                  },
                ].map((item) => {
                  return (
                    <div
                      key={item.stage}
                      className="p-8 border relative"
                      style={{ borderColor: `${item.color}22`, background: `${item.color}04` }}
                    >
                      <CornerBrackets size={12} color={`${item.color}30`} />
                      <div
                        className="font-mono text-[10px] font-semibold tracking-[0.3em] uppercase mb-4 flex items-center justify-between"
                        style={{ color: item.color }}
                      >
                        <span>Phase {item.stage}</span>
                        <span className="opacity-40">[{item.tag}]</span>
                      </div>
                      <h3
                        className="text-2xl font-bold font-mono mb-3"
                        style={{ color: item.color }}
                      >
                        {item.title}
                      </h3>
                      <p className="text-sm font-mono leading-relaxed text-white/40">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </ScanSection>

        {/* ═══════════════════════════════════
            5. RESULT ANATOMY — Decoded card
            ═══════════════════════════════════ */}
        <ScanSection clipFrom="left">
          <section className="relative z-10 py-28 px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-14">
                <SectionKicker label="Evidence" />
                <DecodedHeading text="Anatomy of a result." delay={50} />
                <p className="mt-4 text-white/45 font-mono text-sm max-w-xl mx-auto">
                  Every result is a self-contained evidence object. File, line, snippet, and
                  full score breakdown.
                </p>
              </div>

              {/* Mock result card — HUD chrome */}
              <div className="border border-amber-400/10 bg-[#0A0D0F]/90 overflow-hidden relative">
                <CornerBrackets size={16} color="rgba(246,185,76,0.2)" />

                {/* Header */}
                <div className="flex items-start justify-between p-6 pb-4 border-b border-amber-400/8">
                  <div>
                    <div className="font-mono text-[10px] text-amber-400/40 mb-1.5 uppercase tracking-widest">
                      ▸ src/middleware/jwt.ts:42
                    </div>
                    <h4 className="text-lg font-bold font-mono text-white/90">
                      validateAndRefreshToken()
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-11 h-11 border-2 flex items-center justify-center text-sm font-bold font-mono"
                      style={{ borderColor: "#F6B94C", color: "#F6B94C" }}
                    >
                      96
                    </div>
                  </div>
                </div>

                {/* Snippet */}
                <div className="p-6 font-mono text-[13px] leading-relaxed text-white/55">
                  <div className="flex">
                    <span className="select-none w-10 shrink-0 text-white/20 text-right pr-4">40</span>
                    <span>{"export async function validateAndRefreshToken(req: Request) {"}</span>
                  </div>
                  <div className="flex">
                    <span className="select-none w-10 shrink-0 text-white/20 text-right pr-4">41</span>
                    <span>{"  const bearer = extractBearerToken(req.headers);"}</span>
                  </div>
                  <div className="flex bg-amber-400/[0.06] border-l-2 border-amber-400 pl-0 -ml-px">
                    <span className="select-none w-10 shrink-0 text-amber-400/60 text-right pr-4">42</span>
                    <span className="text-amber-400/90">
                      {"  if (isExpired(bearer)) return await rotateToken(bearer);"}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="select-none w-10 shrink-0 text-white/20 text-right pr-4">43</span>
                    <span>{"  return { valid: true, token: bearer };"}</span>
                  </div>
                  <div className="flex">
                    <span className="select-none w-10 shrink-0 text-white/20 text-right pr-4">44</span>
                    <span>{"}"}</span>
                  </div>
                </div>

                {/* Score bars */}
                <div className="px-6 pb-6 pt-4 border-t border-amber-400/8">
                  <div className="grid grid-cols-3 gap-6">
                    {[
                      { label: "lexical", value: 0.82, color: "#F6B94C" },
                      { label: "semantic", value: 0.91, color: "#14B8A6" },
                      { label: "quality", value: 0.88, color: "#7C5CFF" },
                    ].map((bar) => (
                      <div key={bar.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-mono text-white/30 uppercase tracking-widest">{bar.label}</span>
                          <span className="font-mono" style={{ color: bar.color }}>
                            {bar.value.toFixed(2)}
                          </span>
                        </div>
                        <div className="h-1.5 bg-white/5 overflow-hidden">
                          <div
                            className="h-full"
                            style={{ width: `${bar.value * 100}%`, backgroundColor: bar.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </ScanSection>

        {/* ═══════════════════════════════════
            6. CODE SNIPPETS — Staggered lines
            ═══════════════════════════════════ */}
        <ScanSection clipFrom="right">
          <section className="relative z-10 py-28 px-6">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-14">
                <SectionKicker label="Context Precision" />
                <DecodedHeading text="Exact context, every time." delay={50} />
                <p className="mt-4 text-white/45 font-mono text-sm max-w-xl mx-auto">
                  Ixos returns the precise lines that matched. Not file names. Not summaries.
                  The actual code.
                </p>
              </div>

              <div className="border border-amber-400/8 bg-[#0A0D0F]/90 overflow-hidden relative">
                <CornerBrackets size={14} color="rgba(246,185,76,0.15)" />
                {/* File header */}
                <div className="px-5 py-3 border-b border-amber-400/8 flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-white/8" />
                    <span className="w-2.5 h-2.5 rounded-full bg-white/8" />
                    <span className="w-2.5 h-2.5 rounded-full bg-white/8" />
                  </div>
                  <span className="font-mono text-[11px] text-amber-400/40 uppercase tracking-widest">
                    ▸ src/middleware/jwt.ts:42
                  </span>
                </div>

                <div className="p-5 font-mono text-[13px] leading-[1.9]">
                  {[
                    { num: 38, text: "import { rotateToken, isExpired } from './token-manager';", color: "rgba(243,245,247,0.35)" },
                    { num: 39, text: "", color: "transparent" },
                    { num: 40, text: "export async function validateAndRefreshToken(req: Request) {", color: "rgba(243,245,247,0.6)" },
                    { num: 41, text: "  const bearer = extractBearerToken(req.headers);", color: "rgba(243,245,247,0.6)" },
                    { num: 42, text: "  if (isExpired(bearer)) return await rotateToken(bearer);", color: "#F6B94C", highlight: true },
                    { num: 43, text: "  return { valid: true, token: bearer };", color: "rgba(243,245,247,0.6)" },
                    { num: 44, text: "}", color: "rgba(243,245,247,0.6)" },
                    { num: 45, text: "", color: "transparent" },
                  ].map((line) => (
                    <div
                      key={line.num}
                      className={`flex ${line.highlight ? "bg-amber-400/[0.06] border-l-2 border-amber-400 -ml-px pl-0" : ""}`}
                    >
                      <span className="select-none w-10 shrink-0 text-right pr-4 text-white/20">
                        {line.num}
                      </span>
                      <span style={{ color: line.color }}>{line.text || "\u00A0"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </ScanSection>

        {/* ═══════════════════════════════════
            7. SCORE BREAKDOWN
            ═══════════════════════════════════ */}
        <ScanSection clipFrom="left">
          <section className="relative z-10 py-28 px-6">
            <div ref={scoreRef} className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-start">
                {/* Left: explanation */}
                <div className="md:sticky md:top-32">
                  <SectionKicker label="Transparency" />
                  <DecodedHeading text="The math is transparent." delay={60} />
                  <p className="mt-4 mb-6 text-white/45 font-mono text-sm leading-relaxed max-w-md">
                    Every Ixos result carries a deterministic score breakdown you can inspect
                    and verify. No black boxes. No hidden weights.
                  </p>
                  <div className="space-y-4 text-sm font-mono">
                    {[
                      {
                        color: "#F6B94C",
                        label: "Lexical score",
                        desc: "Exact keyword overlap using BM25 term-frequency analysis.",
                      },
                      {
                        color: "#14B8A6",
                        label: "Semantic score",
                        desc: "Conceptual similarity via Model2Vec embeddings, local only.",
                      },
                      {
                        color: "#7C5CFF",
                        label: "Quality boost",
                        desc: "File recency, code structure quality, and access patterns.",
                      },
                    ].map((item) => (
                      <div key={item.label} className="flex items-start gap-3">
                        <span
                          className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-white/40">
                          <span className="text-white/70">{item.label}</span> — {item.desc}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: animated bars */}
                <div className="pt-4">
                  <div className="p-8 border border-amber-400/10 bg-[#0A0D0F]/90 relative">
                    <CornerBrackets size={16} color="rgba(246,185,76,0.15)" />
                    <div className="font-mono text-[10px] text-white/20 uppercase tracking-[0.3em] mb-8">
                      ▸ Score Breakdown
                    </div>
                    <ScoreBar label="lexical" value={0.82} color="#F6B94C" inView={scoreInView} delay={0} />
                    <ScoreBar label="semantic" value={0.91} color="#14B8A6" inView={scoreInView} delay={0.15} />
                    <ScoreBar label="quality" value={0.88} color="#7C5CFF" inView={scoreInView} delay={0.3} />
                    <div className="mt-8 pt-6 border-t border-amber-400/8">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-xs text-white/30 uppercase tracking-widest">Final score</span>
                        <motion.span
                          className="text-3xl font-bold font-mono"
                          style={{ color: "#F6B94C" }}
                          initial={{ opacity: 0 }}
                          animate={scoreInView ? { opacity: 1 } : {}}
                          transition={{ delay: 0.6, duration: 0.4 }}
                        >
                          0.96
                        </motion.span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </ScanSection>

        {/* ═══════════════════════════════════
            8. WORKSTREAMS — Session recovery
            ═══════════════════════════════════ */}
        <ScanSection clipFrom="right">
          <section className="relative z-10 py-28 px-6">
            <div className="max-w-5xl mx-auto relative">
              <div className="text-center mb-14">
                <SectionKicker label="Session Recovery" />
                <DecodedHeading text="Workstreams. Persistent." delay={50} />
                <p className="mt-4 text-white/45 font-mono text-sm max-w-xl mx-auto">
                  Group your searches into logical workstreams. Resume exactly where you left off,
                  across sessions and machines.
                </p>
              </div>

              <div
                className="overflow-hidden border border-amber-400/8 bg-[#0A0D0F]/80 shadow-2xl shadow-amber-400/5 relative"
                style={{ minHeight: 600 }}
              >
                <CornerBrackets size={16} color="rgba(246,185,76,0.12)" />
                <DemoSurface
                  initialView="workstreams"
                  initialQuery="Refactor payment processing"
                />
              </div>
            </div>
          </section>
        </ScanSection>

        {/* ═══════════════════════════════════
            9. CLI FLOW — Terminal
            ═══════════════════════════════════ */}
        <ScanSection clipFrom="left">
          <section id="cli" className="relative z-10 py-28 px-6">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-14">
                <SectionKicker label="CLI Interface" />
                <DecodedHeading text="For the terminal native." delay={50} />
                <p className="mt-4 text-white/45 font-mono text-sm max-w-lg mx-auto">
                  Full CLI with progressive output, JSON export, and journalist mode for maximum privacy.
                </p>
              </div>

              {/* Terminal chrome */}
              <div className="border border-amber-400/8 bg-[#0A0D0F] overflow-hidden relative">
                <CornerBrackets size={14} color="rgba(246,185,76,0.12)" />
                {/* Title bar */}
                <div className="flex items-center gap-3 px-5 py-3 border-b border-amber-400/8 bg-amber-400/[0.02]">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-white/10" />
                    <span className="w-3 h-3 rounded-full bg-white/10" />
                    <span className="w-3 h-3 rounded-full bg-white/10" />
                  </div>
                  <span className="font-mono text-xs text-amber-400/30 ml-2 uppercase tracking-widest">
                    ixos v0.4.0 — terminal
                  </span>
                </div>

                {/* CLI commands */}
                <div className="p-6 font-mono text-[13px] leading-[2.2] space-y-4">
                  {[
                    {
                      cmd: 'search "authentication token refresh" --progressive',
                      hint: "Stream results as each pipeline stage completes",
                    },
                    {
                      cmd: "search --show-scores --json",
                      hint: "Pipe structured JSON with full score breakdown",
                    },
                    {
                      cmd: 'search "source protection" --journalist-mode',
                      hint: "Maximum privacy: ephemeral cache, no logs, no history",
                    },
                    {
                      cmd: 'search "config" --cache-mode ephemeral',
                      hint: "All embeddings discarded after query. Zero footprint.",
                    },
                  ].map((item, i) => (
                    <div key={i}>
                      <div>
                        <span className="text-white/25">$ </span>
                        <span className="text-amber-400">ixos</span>
                        <span className="text-white/65"> {item.cmd}</span>
                      </div>
                      <div className="text-white/20 ml-4 text-xs mt-0.5"># {item.hint}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </ScanSection>

        {/* ═══════════════════════════════════
            10. AUDITABLE — Transparency cards
            ═══════════════════════════════════ */}
        <ScanSection clipFrom="right">
          <section className="relative z-10 py-28 px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-14">
                <SectionKicker label="Auditable" />
                <DecodedHeading text="Auditable by design." delay={40} />
                <p className="mt-4 text-white/45 font-mono text-sm max-w-xl mx-auto">
                  Every claim is verifiable. The core engine is open source.
                  Every search path is deterministic.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    text: "Every search runs locally",
                    detail:
                      "Zero network calls. Works offline. Your filesystem is the only data source. No data ever leaves your SSD.",
                    color: "#F6B94C",
                    tag: "LOCAL_ONLY",
                  },
                  {
                    text: "Every score is deterministic",
                    detail:
                      "Same query, same files, same result. No probabilistic re-ranking or opaque server-side logic.",
                    color: "#14B8A6",
                    tag: "DETERMINISTIC",
                  },
                  {
                    text: "Every path is verifiable",
                    detail:
                      "Ed25519 cryptographic attestation signs every search result for provenance.",
                    color: "#7C5CFF",
                    tag: "ATTESTATION",
                  },
                ].map((card) => (
                  <div
                    key={card.text}
                    className="p-7 border relative"
                    style={{ borderColor: `${card.color}20`, background: `${card.color}04` }}
                  >
                    <CornerBrackets size={12} color={`${card.color}25`} />
                    <div
                      className="text-[9px] font-mono tracking-[0.3em] uppercase mb-4 opacity-40"
                      style={{ color: card.color }}
                    >
                      [{card.tag}]
                    </div>
                    <h3 className="text-lg font-bold font-mono mb-3" style={{ color: card.color }}>
                      {card.text}
                    </h3>
                    <p className="text-xs font-mono leading-relaxed text-white/35">{card.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </ScanSection>

        {/* ═══════════════════════════════════
            11. PRICING
            ═══════════════════════════════════ */}
        <ScanSection clipFrom="left">
          <section className="relative z-10 py-28 px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-14">
                <SectionKicker label="Licensing" />
                <DecodedHeading text="Simple pricing." delay={40} />
                <p className="mt-4 text-white/45 font-mono text-sm max-w-xl mx-auto">
                  Start free. Upgrade when your workstreams demand it.
                </p>
              </div>

              <div className="relative">
                {/* Outer: Community */}
                <div className="w-full border border-amber-400/8 bg-amber-400/[0.01] p-8 md:p-12 relative">
                  <CornerBrackets size={20} color="rgba(246,185,76,0.08)" />
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8 mb-10">
                    <div>
                      <div className="text-[10px] font-mono tracking-[0.3em] text-white/30 uppercase mb-1">
                        [FREE_TIER]
                      </div>
                      <h3 className="text-xl font-bold font-mono text-white/70 mb-1">Community</h3>
                      <div className="text-4xl font-bold font-mono">
                        $0
                        <span className="text-base font-normal text-white/25 ml-1">/ forever</span>
                      </div>
                    </div>
                    <ul className="space-y-2 text-sm font-mono text-white/40">
                      {[
                        "Local vector search with Flash and Auto modes",
                        "VS Code extension and standard CLI",
                        "Up to 3 active workstreams",
                        "HMAC-SHA256 cache signing",
                      ].map((feat) => (
                        <li key={feat} className="flex items-center gap-2">
                          <span className="text-amber-400/30">▸</span>
                          {feat}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Inner: Pro */}
                  <div className="border border-amber-400/25 bg-amber-400/[0.03] p-8 md:p-10 relative overflow-hidden">
                    <CornerBrackets size={16} color="rgba(246,185,76,0.3)" />
                    <div className="absolute -top-20 -right-20 w-60 h-60 bg-amber-400/[0.04] rounded-full blur-[80px] pointer-events-none" />
                    <div className="relative z-10">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8 mb-8">
                        <div>
                          <div className="text-[10px] font-mono tracking-[0.3em] text-amber-400/50 uppercase mb-1">
                            [PRO_TIER]
                          </div>
                          <h3 className="text-xl font-bold font-mono text-amber-400 mb-1">Pro</h3>
                          <div className="text-4xl font-bold font-mono">
                            $12
                            <span className="text-base font-normal text-white/25 ml-1">/ month</span>
                          </div>
                        </div>
                        <ul className="space-y-2 text-sm font-mono text-white/50">
                          {[
                            "JIT Pro embedding models with deep reasoning",
                            "Unlimited workstreams with session recovery",
                            "Journalist mode and ephemeral cache",
                            "Ed25519 cryptographic attestation",
                            "Priority support and early access",
                          ].map((feat) => (
                            <li key={feat} className="flex items-center gap-2">
                              <span className="text-amber-400">▸</span>
                              {feat}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <a
                        href="#download"
                        className="inline-block px-8 py-3 bg-amber-400 text-[#0A0D0F] font-mono font-semibold text-sm hover:bg-amber-300 transition-colors"
                      >
                        ▸ Start Free Trial
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </ScanSection>

        {/* ═══════════════════════════════════
            12. THREAT MODEL
            ═══════════════════════════════════ */}
        <ThreatModelSection />

        {/* ═══════════════════════════════════
            13. SIGNAL FEED
            ═══════════════════════════════════ */}
        <SignalFeed />

        {/* ═══════════════════════════════════
            14. FOOTER CTA
            ═══════════════════════════════════ */}
        <FooterCTA />
      </main>
    </>
  );
}
