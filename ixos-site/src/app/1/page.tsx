"use client";

import { OpenSourceNotice } from "@/components/sections/OpenSourceNotice";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { DemoSurface } from "@/landing/DemoSurface";
import { ResultDivider } from "@/components/ui/ResultDivider";
import { ArcNoiseBackground } from "@/components/effects/ArcNoiseBackground";

/* ── CSS injection for conic pulse + section reveals ────────────────── */

const GLOBAL_STYLES = `
@keyframes amberSpin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes sectionRevealLeft {
  from { clip-path: inset(0 100% 0 0); }
  to   { clip-path: inset(0 0% 0 0); }
}
@keyframes sectionRevealRight {
  from { clip-path: inset(0 0 0 100%); }
  to   { clip-path: inset(0 0 0 0%); }
}
@keyframes sectionRevealUp {
  from { clip-path: inset(100% 0 0 0); }
  to   { clip-path: inset(0% 0 0 0); }
}
@keyframes sectionRevealDown {
  from { clip-path: inset(0 0 100% 0); }
  to   { clip-path: inset(0 0 0% 0); }
}
@keyframes nodeActivePulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(246,185,76,0.5); }
  50%       { box-shadow: 0 0 0 8px rgba(246,185,76,0); }
}
@keyframes scanLine {
  0%   { top: 0%; opacity: 0.6; }
  90%  { top: 100%; opacity: 0.3; }
  100% { top: 100%; opacity: 0; }
}
@keyframes amberBlink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
@keyframes floatUp {
  0%   { transform: translateY(0px); }
  50%  { transform: translateY(-6px); }
  100% { transform: translateY(0px); }
}
@keyframes glowPulse {
  0%, 100% { opacity: 0.04; }
  50%       { opacity: 0.09; }
}
@keyframes datastream {
  0%   { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}
@keyframes streamVertical {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}
`;

function GlobalStyles() {
  useEffect(() => {
    if (document.getElementById("p1-global-styles")) return;
    const el = document.createElement("style");
    el.id = "p1-global-styles";
    el.textContent = GLOBAL_STYLES;
    document.head.appendChild(el);
  }, []);
  return null;
}

function DataStreamOverlay() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(246,185,76,0.1) 1px, transparent 1px), linear-gradient(0deg, rgba(246,185,76,0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />
      <div
        className="absolute top-0 left-1/4 w-px h-64 bg-gradient-to-b from-transparent via-[#F6B94C] to-transparent"
        style={{ animation: 'streamVertical 8s linear infinite' }}
      />
      <div
        className="absolute top-0 left-1/2 w-px h-96 bg-gradient-to-b from-transparent via-[#F6B94C] to-transparent"
        style={{ animation: 'streamVertical 12s linear infinite', animationDelay: '2s' }}
      />
      <div
        className="absolute top-0 left-3/4 w-px h-48 bg-gradient-to-b from-transparent via-[#F6B94C] to-transparent"
        style={{ animation: 'streamVertical 10s linear infinite', animationDelay: '5s' }}
      />
    </div>
  );
}

/* ── Scroll-driven amber spotlight (enhanced) ────────────────────────── */

function SpotlightBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      const progress =
        window.scrollY /
        Math.max(1, document.body.scrollHeight - window.innerHeight);
      const y = 10 + Math.min(progress, 0.4) * 60; // Keep spot somewhat up
      const x = 50 + Math.sin(progress * Math.PI) * 10;

      const alphaBloom = Math.max(0.12, 0.25 - progress * 0.6);
      const alphaTop = Math.max(0.10, 0.30 - progress * 0.8);
      const alphaMid = Math.max(0.08, 0.10 - progress * 0.3);
      const alphaTopEllipse = Math.max(0.10, 0.35 - progress * 0.9);

      if (ref.current) {
        ref.current.style.setProperty("--spot-y", `${y}vh`);
        ref.current.style.setProperty("--spot-x", `${x}%`);
        ref.current.style.setProperty("--alpha-bloom", `${alphaBloom}`);
        ref.current.style.setProperty("--alpha-top", `${alphaTop}`);
        ref.current.style.setProperty("--alpha-mid", `${alphaMid}`);
        ref.current.style.setProperty("--alpha-top-ellipse", `${alphaTopEllipse}`);
      }
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <div ref={ref} className="fixed inset-0 pointer-events-none z-0">
      {/* Noise texture overlay */}
      <ArcNoiseBackground intensity={0.5} />
      {/* Main amber bloom */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(1000px circle at var(--spot-x, 50%) var(--spot-y, 15vh), rgba(246,185,76,var(--alpha-bloom, 0.07)) 0%, transparent 70%)",
        }}
      />
      {/* Top glow */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "100%",
          background:
            "linear-gradient(to bottom, rgba(246,185,76,var(--alpha-top, 0.12)) 0%, rgba(246,185,76,var(--alpha-mid, 0.03)) 50vh, transparent 100%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "15%",
          right: "15%",
          height: "100%",
          background:
            "radial-gradient(ellipse at top, rgba(246,185,76,var(--alpha-top-ellipse, 0.15)) 0%, rgba(246,185,76,var(--alpha-mid, 0.02)) 50vh, transparent 100%)",
          pointerEvents: "none",
        }}
      />
      {/* Conic breathing pulse — entirely amber */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "180vmax",
          height: "180vmax",
          marginLeft: "-90vmax",
          marginTop: "-90vmax",
          background:
            "conic-gradient(from 0deg, transparent 0%, rgba(246,185,76,0.04) 25%, transparent 50%, rgba(246,185,76,0.03) 75%, transparent 100%)",
          animation: "amberSpin 20s linear infinite",
          opacity: 0.08,
          willChange: "transform",
        }}
      />
      {/* Bottom amber accent gradient */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "50vh",
          background:
            "linear-gradient(to top, rgba(246,185,76,0.04) 0%, transparent 100%)",
          animation: "glowPulse 6s ease-in-out infinite",
        }}
      />
    </div>
  );
}

/* ── Corner bracket decorations ─────────────────────────────────────── */

function CornerBrackets({ className, color = "rgba(246,185,76,0.2)" }: { className?: string; color?: string }) {
  return (
    <div className={`absolute inset-0 pointer-events-none ${className ?? ""}`}>
      <span style={{ position: "absolute", top: 0, left: 0, width: 16, height: 16, borderTop: `1px solid ${color}`, borderLeft: `1px solid ${color}` }} />
      <span style={{ position: "absolute", top: 0, right: 0, width: 16, height: 16, borderTop: `1px solid ${color}`, borderRight: `1px solid ${color}` }} />
      <span style={{ position: "absolute", bottom: 0, left: 0, width: 16, height: 16, borderBottom: `1px solid ${color}`, borderLeft: `1px solid ${color}` }} />
      <span style={{ position: "absolute", bottom: 0, right: 0, width: 16, height: 16, borderBottom: `1px solid ${color}`, borderRight: `1px solid ${color}` }} />
    </div>
  );
}

/* ── Count-up hook (scroll-triggered) ──────────────────────────────── */

function useCountUp(target: number, duration = 1400) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const triggered = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || triggered.current) return;
        triggered.current = true;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const ease = 1 - Math.pow(1 - progress, 4);
          setCount(Math.round(target * ease));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return { ref, count };
}

/* ── Directional clip-path reveal (scroll-triggered) ───────────────── */

type RevealDirection = "left" | "right" | "up" | "down";

function useDirectionalReveal(direction: RevealDirection) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px 0px 0px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const animName: Record<RevealDirection, string> = {
    left: "sectionRevealLeft",
    right: "sectionRevealRight",
    up: "sectionRevealUp",
    down: "sectionRevealDown",
  };

  const clipHidden: Record<RevealDirection, string> = {
    left: "inset(0 100% 0 0)",
    right: "inset(0 0 0 100%)",
    up: "inset(100% 0 0 0)",
    down: "inset(0 0 100% 0)",
  };

  const style: React.CSSProperties = inView
    ? {
      animation: `${animName[direction]} 700ms cubic-bezier(0.16,1,0.3,1) forwards`,
      willChange: "clip-path",
    }
    : {
      clipPath: clipHidden[direction],
      willChange: "clip-path",
    };

  return { ref, style, inView };
}

/* ── Reveal: fade+lift on scroll entry ─────────────────────────────── */

function Reveal({
  children,
  className = "",
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
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}

/* ── StaggerGroup ──────────────────────────────────────────────────── */

function StaggerGroup({
  children,
  className = "",
  stagger = 0.08,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={{
        visible: { transition: { staggerChildren: stagger } },
        hidden: {},
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const cFade = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

/* ── Scan Line effect for demo containers ─────────────────────────── */

function ScanLine() {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        height: 1,
        background: "linear-gradient(90deg, transparent, rgba(246,185,76,0.4), transparent)",
        animation: "scanLine 4s ease-in-out infinite",
        pointerEvents: "none",
        zIndex: 10,
      }}
    />
  );
}

/* ── Animated data-stream bar ─────────────────────────────────────── */

function DataStreamBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{
          backgroundColor: color,
          backgroundImage: `linear-gradient(90deg, ${color}, ${color}dd, ${color})`,
          backgroundSize: "200% 100%",
          animation: "datastream 2s linear infinite",
        }}
        initial={{ width: 0 }}
        whileInView={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        viewport={{ once: true }}
      />
    </div>
  );
}

/* ── NAV constants ─────────────────────────────────────────────────── */

const NAV = [
  { label: "Pipeline", id: "pipeline" },
  { label: "Evidence", id: "evidence" },
  { label: "Modes", id: "modes" },
  { label: "Today", id: "today" },
  { label: "CLI", id: "cli" },
  { label: "Open source", id: "open-source" },
];

/* ── FAQ data ──────────────────────────────────────────────────────── */

const FAQS = [
  {
    q: "Does Ixos send any data to the cloud?",
    a: "Never. Every embedding is computed on your machine, cached locally using HMAC-SHA256 signed entries, and never transmitted. There are no servers to phone home to.",
  },
  {
    q: "How is this different from grep or ripgrep?",
    a: "Grep searches for exact string matches. Ixos understands meaning. Search for 'authentication bug' and it surfaces files about token refresh failures, session expiry, and OAuth edge cases -- even when those exact words never appear.",
  },
  {
    q: "What happens if my files change?",
    a: "The file watcher detects changes within milliseconds. Stale embeddings are invalidated via HMAC verification and re-computed on the next search. Rate limiting and deduplication prevent DoS from rapid-fire saves.",
  },
  {
    q: "Which operating systems are supported?",
    a: "Windows (NTFS Alternate Data Streams), macOS (extended attributes), and Linux (xattr). The cache backend is auto-detected per filesystem. FAT32 and cloud drives fall back to ephemeral mode.",
  },
  {
    q: "Are all search modes available for free?",
    a: "Yes. All local search modes, Ask, and workstreams are free and available without an account. Choose an installed model and search on your own computer.",
  },
];

/* ── KPI stat card ─────────────────────────────────────────────────── */

function KpiCard({
  val,
  label,
  sub,
  target,
  prefix,
  suffix,
  isStatic,
}: {
  val: string;
  label: string;
  sub: string;
  target: number;
  prefix?: string;
  suffix?: string;
  isStatic?: boolean;
}) {
  const { ref, count } = useCountUp(target, 1400);
  const displayVal = isStatic ? val : `${prefix ?? ""}${count}${suffix ?? ""}`;

  return (
    <motion.div
      variants={cFade}
      className="flex items-start gap-3"
      ref={ref}
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className="shrink-0 self-stretch"
      />
      <div>
        <div
          className="font-mono text-2xl sm:text-3xl font-semibold tracking-tight text-white"
          style={{ textShadow: "0 0 20px rgba(246,185,76,0.3)" }}
        >
          {displayVal}
        </div>
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/40 mt-0.5">
          {label}
        </div>
        <div className="text-xs text-white/30 mt-0.5">{sub}</div>
      </div>
    </motion.div>
  );
}

/* ── Bento feature data ─────────────────────────────────────────────── */

const FEATURES = [
  {
    title: "No Cloud Index",
    stat: "0 B",
    desc: "Zero data sent. Ever.",
    wide: true,
    icon: "◎",
    color: "#F6B94C",
  },
  {
    title: "HMAC-SHA256",
    stat: "✓",
    desc: "Signed embeddings",
    wide: false,
    icon: "⬡",
    color: "#14B8A6",
  },
  {
    title: "mlock Memory",
    stat: "Protected",
    desc: "Secured RAM pages",
    wide: false,
    icon: "⬛",
    color: "#7C5CFF",
  },
  {
    title: "Timing Protection",
    stat: "Opt-in",
    desc: "Side-channel guard",
    wide: true,
    icon: "◈",
    color: "#F6B94C",
  },
  {
    title: "Ephemeral Mode",
    stat: "JIT",
    desc: "RAM only, no disk writes",
    wide: false,
    icon: "◇",
    color: "#14B8A6",
  },
  {
    title: "Local-Only",
    stat: "100%",
    desc: "Your machine, your data",
    wide: false,
    icon: "◉",
    color: "#F6B94C",
  },
];

/* ── Bento card with hover microanimation ───────────────────────────── */

function BentoCard({ f, i }: { f: typeof FEATURES[number]; i: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      key={i}
      variants={cFade}
      className={`relative p-6 rounded-lg flex flex-col gap-2 cursor-default ${f.wide ? "col-span-2" : ""}`}
      style={{
        background: "rgba(22,27,34,0.5)",
        border: hovered
          ? `1px solid ${f.color}40`
          : "1px solid rgba(255,255,255,0.06)",
        boxShadow: hovered
          ? `0 0 0 1px ${f.color}30, 0 0 24px ${f.color}12, inset 0 0 20px ${f.color}05`
          : "none",
        transform: hovered ? "translateY(-4px) scale(1.02)" : "translateY(0px) scale(1)",
        transition: "all 250ms cubic-bezier(0.16,1,0.3,1)",
        willChange: "transform, box-shadow, border-color",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <CornerBrackets color={hovered ? `${f.color}35` : "rgba(246,185,76,0.12)"} />
      {/* Icon with pulsing glow on hover */}
      <div
        style={{
          fontSize: 22,
          color: f.color,
          textShadow: hovered ? `0 0 16px ${f.color}90, 0 0 32px ${f.color}40` : "none",
          transition: "text-shadow 250ms cubic-bezier(0.16,1,0.3,1)",
          display: "inline-block",
        }}
      >
        {f.icon}
      </div>
      <div
        className="text-2xl font-mono font-semibold"
        style={{
          color: f.color,
          textShadow: hovered ? `0 0 20px ${f.color}60` : "none",
          transition: "text-shadow 250ms",
        }}
      >
        {f.stat}
      </div>
      <div className="text-sm font-mono text-white/80">{f.title}</div>
      <div className="text-xs text-white/45">{f.desc}</div>
    </motion.div>
  );
}

/* ── Live mission control ticker ────────────────────────────────────── */

function MissionTicker() {
  const TICKS = useMemo(() => [
    "SCAN ░ 1,247 files",
    "LEXICAL ░ 89 candidates",
    "SEMANTIC ░ 24 embedded",
    "CACHE ░ 19 hits",
    "LOCKED ░ 312ms",
    "MRR@10 ░ 0.834",
    "HMAC ░ VERIFIED",
    "PRIVACY ░ LOCAL ONLY",
  ], []);

  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((n) => (n + 1) % TICKS.length), 2200);
    return () => clearInterval(id);
  }, [TICKS.length]);

  return (
    <div
      className="flex items-center gap-3 font-mono text-[10px] tracking-[0.2em] uppercase"
      style={{ color: "rgba(246,185,76,0.6)" }}
    >
      <span
        style={{
          display: "inline-block",
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: "#F6B94C",
          boxShadow: "0 0 8px #F6B94C",
          animation: "amberBlink 1s steps(1) infinite",
        }}
      />
      <AnimatePresence mode="wait">
        <motion.span
          key={idx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          {TICKS[idx]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

/* ── Hero mockup: properly scaled DemoSurface ───────────────────────── */

function HeroMockup() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.72);
  const NATURAL_W = 1200;
  const NATURAL_H = 780;
  const CHROME_H = 32;

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const availableH = rect.height - 40;
      const availableW = rect.width - 40;

      const scaleX = availableW / NATURAL_W;
      const scaleY = availableH / NATURAL_H;
      // Increase minimum scale to show more of the desktop app
      const newScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.75), 1.05);
      setScale(newScale);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Render at actual size, not scaled with CSS transform
  const displayW = Math.round(NATURAL_W * scale);
  const displayH = Math.round(NATURAL_H * scale);
  const chromeH = Math.round(CHROME_H * scale);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 560,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <div
        style={{
          width: displayW,
          height: displayH,
          position: "relative",
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid rgba(246,185,76,0.12)",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(246,185,76,0.06)",
          background: "rgba(14,17,23,0.9)",
          backdropFilter: "blur(4px)",
        }}
      >
        {/* Window chrome */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: chromeH,
            background: "rgba(10,12,16,0.95)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            alignItems: "center",
            gap: Math.max(3, 6 * scale),
            padding: `0 ${Math.max(6, 12 * scale)}px`,
            zIndex: 20,
          }}
        >
          <div style={{ width: Math.max(5, 10 * scale), height: Math.max(5, 10 * scale), borderRadius: "50%", backgroundColor: "rgba(255,95,87,0.7)" }} />
          <div style={{ width: Math.max(5, 10 * scale), height: Math.max(5, 10 * scale), borderRadius: "50%", backgroundColor: "rgba(255,189,68,0.7)" }} />
          <div style={{ width: Math.max(5, 10 * scale), height: Math.max(5, 10 * scale), borderRadius: "50%", backgroundColor: "rgba(40,201,64,0.7)" }} />
          <div style={{ flex: 1, textAlign: "center" }}>
            <span style={{ fontFamily: "monospace", fontSize: Math.max(5, 9 * scale), color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>
              IXOS DESKTOP — COMMAND CENTER
            </span>
          </div>
        </div>

        {/* Scan overlay */}
        <ScanLine />

        {/* The DemoSurface rendered at ACTUAL size (not scaled with CSS transform) */}
        <div
          style={{
            position: "absolute",
            top: chromeH,
            left: 0,
            width: displayW,
            height: displayH - chromeH,
          }}
        >
          <DemoSurface
            initialQuery="company policy on remote work"
            initialMode="auto"
            autoRun
            autoType
            displayMode="search-only"
            style={{ width: displayW, height: displayH - chromeH }}
          />
        </div>

        {/* Amber glow edge top */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: "linear-gradient(90deg, transparent, rgba(246,185,76,0.5) 40%, rgba(20,184,166,0.4) 60%, transparent)",
            zIndex: 15,
          }}
        />
      </div>
    </div>
  );
}

/* ── Pipeline stage visualization ───────────────────────────────────── */

function PipelineStageViz() {
  const stages = useMemo(() => [
    { label: "SCAN", time: "7ms", color: "#F6B94C", pct: 14 },
    { label: "LEXICAL", time: "12ms", color: "#F59E0B", pct: 24 },
    { label: "SEMANTIC", time: "280ms", color: "#14B8A6", pct: 56 },
    { label: "LOCKED", time: "312ms", color: "#2DD4BF", pct: 100 },
  ], []);

  return (
    <div className="relative rounded-lg border border-white/[0.06] bg-[rgba(22,27,34,0.5)] p-6 space-y-5">
      <CornerBrackets />
      <div className="font-mono text-[10px] tracking-wider uppercase text-white/30 mb-4">
        Pipeline execution — 1,247 files
      </div>
      {stages.map((s, i) => (
        <div key={i}>
          <div className="flex justify-between mb-1.5">
            <span className="font-mono text-xs tracking-wide" style={{ color: s.color }}>
              {s.label}
            </span>
            <span className="font-mono text-xs text-white/40">{s.time}</span>
          </div>
          <DataStreamBar pct={s.pct} color={s.color} />
        </div>
      ))}
      {/* Active scan line */}
      <div
        style={{
          marginTop: 16,
          padding: "10px 12px",
          background: "rgba(246,185,76,0.04)",
          border: "1px solid rgba(246,185,76,0.1)",
          borderRadius: 6,
          fontFamily: "monospace",
          fontSize: 11,
          color: "rgba(246,185,76,0.7)",
          letterSpacing: "0.05em",
        }}
      >
        <span style={{ color: "rgba(255,255,255,0.25)", marginRight: 8 }}>▶</span>
        89 candidates → 24 embedded → 8 results
      </div>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

const Dot = ({ color }: { color: string }) => (
  <span
    className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
    style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}80` }}
  />
);

const Kicker = ({ color, children }: { color: string; children: React.ReactNode }) => (
  <span
    className="inline-block font-mono text-[10px] tracking-[0.25em] uppercase px-2.5 py-1 rounded-full mb-5"
    style={{
      background: `${color}12`,
      color,
      border: `1px solid ${color}30`,
      boxShadow: `0 0 12px ${color}15`,
    }}
  >
    {children}
  </span>
);

const SepBorder = "border-t border-white/[0.04]";
const A = "#F6B94C";
const T = "#14B8A6";
const V = "#7C5CFF";

/* ── Typewriter Text Component ─────────────────────────────────────── */

function TypewriterText({ texts, color }: { texts: string[]; color: string }) {
  const [text, setText] = useState("");
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    const target = texts[idx % texts.length];

    const type = async () => {
      // Type
      for (let i = 0; i <= target.length; i++) {
        if (isCancelled) return;
        setText(target.slice(0, i));
        await new Promise(r => setTimeout(r, 60 + Math.random() * 40));
      }
      // Wait
      await new Promise(r => setTimeout(r, 3000));
      if (isCancelled) return;
      // Delete
      for (let i = target.length; i >= 0; i--) {
        if (isCancelled) return;
        setText(target.slice(0, i));
        await new Promise(r => setTimeout(r, 30));
      }
      // Next
      setIdx(i => i + 1);
    };

    type();
    return () => { isCancelled = true; };
  }, [idx, texts]);

  return <span style={{ color, textShadow: `0 0 30px ${color}40` }}>{text}</span>;
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function Page1CommandCenter() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const pipelineReveal = useDirectionalReveal("left");
  const semanticReveal = useDirectionalReveal("right");
  const evidenceReveal = useDirectionalReveal("up");
  const modesReveal = useDirectionalReveal("down");
  const cliReveal = useDirectionalReveal("left");
  const bentoReveal = useDirectionalReveal("right");

  return (
    <>
      {/* ── S1  HERO ──────────────────────────────────────────────── */}
      <section
        id="hero"
        className="relative pt-16 min-h-screen flex flex-col lg:flex-row items-center gap-12 px-5 md:px-10 lg:px-16 pb-24"
        style={{ zIndex: 1 }}
      >
        {/* Left: copy */}
        <div className="relative flex-1 max-w-xl pt-12 lg:pt-24">
          <Reveal>
            <p
              className="font-mono text-[10px] tracking-[0.3em] uppercase mb-4"
              style={{ color: A }}
            >
              ◈ Local-first semantic search
            </p>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="font-mono text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.08] mb-5">
              Search reimagined{" "}
              <span style={{ color: A, textShadow: `0 0 40px ${A}50` }}>
                locally.
              </span>
              <br />
              <TypewriterText texts={["Every file", "Every codebase", "Every secret", "Every line"]} color={T} />
              <span
                style={{
                  display: "inline-block",
                  width: 4,
                  height: "0.85em",
                  backgroundColor: A,
                  marginLeft: 6,
                  verticalAlign: "middle",
                  animation: "amberBlink 1.1s steps(1) infinite",
                  boxShadow: `0 0 12px ${A}`,
                }}
              />
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-base sm:text-lg leading-relaxed text-white/55 max-w-lg mb-8">
              Ixos indexes your codebase on-device with sub-second hybrid
              search. No cloud. No telemetry. Just results that understand what
              you mean, not just what you type.
            </p>
          </Reveal>
          {/* Status readout */}
          <Reveal delay={0.12}>
            <div
              className="flex items-center gap-6 mb-8 font-mono text-[10px] tracking-widest uppercase"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              <span className="flex items-center gap-2">
                <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#22c55e", display: "inline-block", boxShadow: "0 0 8px #22c55e" }} />
                ONLINE
              </span>
              <span className="opacity-0">|</span>
              <span>LOCAL ONLY</span>
              <span className="opacity-0">|</span>
              <span style={{ color: A }}>0 BYTES SENT</span>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="flex flex-wrap gap-3">
              <motion.button
                onClick={() => scrollTo("open-source")}
                className="px-6 py-3 rounded-md font-mono text-sm font-semibold text-black"
                style={{
                  background: `linear-gradient(135deg, ${A}, #F59E0B)`,
                  boxShadow: `0 0 20px ${A}30`,
                }}
                whileHover={{ scale: 1.04, boxShadow: `0 0 32px ${A}50` }}
                whileTap={{ scale: 0.98 }}
              >
                Download Free
              </motion.button>
              <motion.button
                onClick={() => scrollTo("pipeline")}
                className="px-6 py-3 rounded-md font-mono text-sm font-medium text-white/65"
                style={{ border: "1px solid rgba(255,255,255,0.12)" }}
                whileHover={{ borderColor: "rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.9)" }}
              >
                See how it works →
              </motion.button>
            </div>
          </Reveal>
        </div>

        {/* Right: desktop mockup */}
        <div className="relative flex-1 flex justify-center items-center">
          <Reveal delay={0.2}>
            <div style={{ animation: "floatUp 6s ease-in-out infinite" }}>
              <HeroMockup />
            </div>
          </Reveal>
          {/* Glow behind mockup */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(50% 50%, ${A}08 0%, transparent 70%)`,
              pointerEvents: "none",
            }}
          />
        </div>
      </section>

      {/* ── S2  TRUST STRIP ───────────────────────────────────────── */}
      <section
        className="relative z-10 py-16 px-5 md:px-10"
        style={{ borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
      >
        {/* Section scan bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${A}30, ${T}20, transparent)` }} />
        <StaggerGroup className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
          <KpiCard val="100%" label="Local-first" sub="Zero cloud dependency" target={100} suffix="%" />
          <KpiCard val="0 B" label="Data sent" sub="No telemetry ever" target={0} isStatic />
          <KpiCard val="<800ms" label="Search latency" sub="1,000 files, cold cache" target={800} prefix="<" suffix="ms" />
          <KpiCard val="250+" label="Tests passed" sub="Security + correctness" target={250} suffix="+" />
        </StaggerGroup>
      </section>

      <ResultDivider
        query="performance benchmarks"
        resultTitle="Ixos Performance Audit"
        resultPath="bench/results/2026-02-14.json"
        resultSnippet="[scan] 1,247 files in 7ms. [lexical] 89 candidates scored. [semantic] 24 embedded (19 cache hits). [locked] 8 results in 312ms."
        score={98}
        accentColor={A}
        variant="1"
      />

      {/* ── S3  PIPELINE 1: Lexical Scan ─────────────────────────── */}
      <section id="pipeline" className="relative z-10 py-28 md:py-36 px-5 md:px-10">
        <DataStreamOverlay />
        <div
          ref={pipelineReveal.ref}
          style={pipelineReveal.style}
          className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-14 items-center"
        >
          <div>
            <Reveal>
              <Kicker color={A}>Phase 1 — Lexical</Kicker>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="font-mono text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
                Millions of tokens,{" "}
                <span style={{ color: A }}>scanned in milliseconds.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-white/55 leading-relaxed max-w-lg">
                When you hit enter, Ixos fires up a Rayon-parallelized lexical
                engine that streams through your entire directory. It tokenizes
                file contents, scores n-gram overlap against your query, and
                produces a ranked candidate set — typically in under 10ms for
                1,000 files.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <ul className="mt-6 space-y-3 text-sm text-white/45">
                {[
                  "Parallel file loading via Rayon for directories >100 files",
                  "Keyword frequency analysis with sub-token matching",
                  "Pre-filters candidates before expensive embedding step",
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Dot color={A} />
                    {t}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
          <Reveal delay={0.12}>
            <div className="relative rounded-lg border border-white/[0.06] bg-[rgba(22,27,34,0.5)] p-6 space-y-3">
              <CornerBrackets />
              <ScanLine />
              <div className="font-mono text-[10px] tracking-wider uppercase text-white/30 mb-4">
                Lexical score distribution
              </div>
              {(
                [
                  ["src/auth/token-manager.ts", 94],
                  ["src/auth/refresh.ts", 87],
                  ["src/api/middleware.ts", 61],
                  ["src/utils/crypto.ts", 43],
                  ["tests/auth.test.ts", 38],
                  ["src/db/sessions.ts", 22],
                ] as const
              ).map(([file, pct], i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1">
                    <span className="font-mono text-xs text-white/50 truncate mr-4">{file}</span>
                    <span className="font-mono text-xs shrink-0" style={{ color: A }}>{pct}%</span>
                  </div>
                  <DataStreamBar pct={pct} color={A} />
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── S4  PIPELINE 2: Semantic Index ────────────────────────── */}
      <section className={`relative z-10 py-28 md:py-36 px-5 md:px-10 ${SepBorder}`}>
        <div
          ref={semanticReveal.ref}
          style={semanticReveal.style}
          className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-14 items-center"
        >
          <Reveal>
            <div className="relative rounded-lg border border-white/[0.06] bg-[rgba(22,27,34,0.5)] p-6">
              <CornerBrackets />
              <div className="font-mono text-[10px] tracking-wider uppercase text-white/30 mb-5">
                Embedding similarity space
              </div>
              <div className="relative h-64 rounded-md bg-[rgba(14,17,23,0.6)] overflow-hidden">
                {(
                  [
                    { x: 20, y: 25, l: "query", c: T, s: 10 },
                    { x: 26, y: 32, l: "token-mgr", c: T, s: 7 },
                    { x: 18, y: 38, l: "refresh.ts", c: T, s: 6 },
                    { x: 55, y: 55, l: "middleware", c: V, s: 5 },
                    { x: 72, y: 20, l: "crypto.ts", c: A, s: 4 },
                    { x: 80, y: 70, l: "sessions", c: "rgba(255,255,255,0.5)", s: 3 },
                  ] as const
                ).map((d, i) => (
                  <motion.div
                    key={i}
                    className="absolute flex items-center gap-1.5"
                    style={{ left: `${d.x}%`, top: `${d.y}%` }}
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 + i * 0.08 }}
                    viewport={{ once: true }}
                  >
                    <div
                      className="rounded-full"
                      style={{
                        width: d.s + 4,
                        height: d.s + 4,
                        backgroundColor: d.c,
                        opacity: d.l === "query" ? 1 : 0.65,
                        boxShadow: d.l === "query" ? `0 0 12px ${d.c}` : "none",
                      }}
                    />
                    <span className="font-mono text-[9px] whitespace-nowrap" style={{ color: d.c, opacity: 0.75 }}>
                      {d.l}
                    </span>
                  </motion.div>
                ))}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.18 }}>
                  <line x1="20%" y1="25%" x2="26%" y2="32%" stroke={T} strokeWidth="1" />
                  <line x1="20%" y1="25%" x2="18%" y2="38%" stroke={T} strokeWidth="1" />
                  <line x1="20%" y1="25%" x2="55%" y2="55%" stroke={V} strokeWidth="0.5" strokeDasharray="4" />
                </svg>
              </div>
            </div>
          </Reveal>
          <div>
            <Reveal>
              <Kicker color={T}>Phase 2 — Semantic</Kicker>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="font-mono text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
                Understanding{" "}
                <span style={{ color: T }}>intent,</span> not just keywords.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-white/55 leading-relaxed max-w-lg">
                After lexical filtering, the top candidates are passed to a
                local Model2Vec embedding model. Each file chunk is vectorized
                and compared against your query via cosine similarity. Cached
                embeddings are signed with HMAC-SHA256 so stale results are
                never served.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <ul className="mt-6 space-y-3 text-sm text-white/45">
                {[
                  "int8 quantized model — 16.6 MB, MRR@10 = 0.834",
                  "HMAC-verified cache with NTFS ADS / xattr backends",
                  "Cosine similarity in model-dependent embedding space",
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Dot color={T} />
                    {t}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── S5  PIPELINE VISUALIZATION ────────────────────────────── */}
      <section className={`relative z-10 py-20 px-5 md:px-10 ${SepBorder}`}>
        <div className="relative z-10 max-w-4xl mx-auto">
          <Reveal>
            <div className="text-center mb-10">
              <Kicker color={A}>Full pipeline</Kicker>
              <h2 className="font-mono text-2xl sm:text-3xl font-semibold tracking-tight mb-2">
                From keystroke to result in{" "}
                <span style={{ color: A }}>312ms.</span>
              </h2>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <PipelineStageViz />
          </Reveal>
        </div>
      </section>

      {/* ── S6  EVIDENCE DRAWER: Score Rationale Cards ────────────── */}
      <section id="evidence" className={`relative z-10 py-28 md:py-36 px-5 md:px-10 ${SepBorder}`}>
        <div
          ref={evidenceReveal.ref}
          style={evidenceReveal.style}
          className="relative z-10 max-w-5xl mx-auto"
        >
          <Reveal>
            <div className="text-center mb-14">
              <p className="font-mono text-[10px] tracking-[0.25em] uppercase mb-3" style={{ color: V }}>
                Transparency
              </p>
              <h2 className="font-mono text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
                Every result tells you{" "}
                <span style={{ color: V, textShadow: `0 0 20px ${V}50` }}>why</span>{" "}
                it matched.
              </h2>
              <p className="text-white/50 max-w-xl mx-auto">
                No black boxes. Ixos exposes the full scoring breakdown —
                lexical overlap, semantic similarity, recency boost, and
                behavioral adjustment.
              </p>
            </div>
          </Reveal>
          <StaggerGroup className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(
              [
                {
                  t: "Lexical Score",
                  v: "0.87",
                  c: A,
                  d: "Keyword frequency match against query tokens. Weighted by TF-IDF with sub-word matching.",
                },
                {
                  t: "Semantic Score",
                  v: "0.94",
                  c: T,
                  d: "Cosine similarity between query embedding and cached file chunk embedding (complete dimensions).",
                },
                {
                  t: "Hybrid Score",
                  v: "0.91",
                  c: V,
                  d: "Adaptive weighted combination. Attack detection auto-adjusts weights if degradation is detected.",
                },
              ] as const
            ).map((card, i) => (
              <motion.div
                key={i}
                variants={cFade}
                className="relative rounded-lg p-5"
                style={{
                  background: "rgba(22,27,34,0.4)",
                  border: `1px solid rgba(255,255,255,0.06)`,
                }}
                whileHover={{
                  y: -4,
                  scale: 1.02,
                  borderColor: `${card.c}30`,
                  boxShadow: `0 0 24px ${card.c}12`,
                }}
                transition={{ duration: 0.25 }}
              >
                <CornerBrackets color={`${card.c}25`} />
                <div className="flex items-baseline justify-between mb-3">
                  <span className="font-mono text-[10px] tracking-wider uppercase text-white/40">{card.t}</span>
                  <span className="font-mono text-2xl font-semibold" style={{ color: card.c, textShadow: `0 0 16px ${card.c}50` }}>
                    {card.v}
                  </span>
                </div>
                <DataStreamBar pct={parseFloat(card.v) * 100} color={card.c} />
                <p className="text-xs text-white/40 leading-relaxed mt-3">{card.d}</p>
              </motion.div>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ── S7  RESULT ANATOMY ────────────────────────────────────── */}
      <section className={`relative z-10 py-28 md:py-36 px-5 md:px-10 ${SepBorder}`}>
        <div className="relative z-10 max-w-4xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <h2 className="font-mono text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
                Anatomy of a{" "}
                <span style={{ color: T }}>result</span>
              </h2>
              <p className="text-white/50 max-w-lg mx-auto">
                Dense, utilitarian, and instantly actionable. Every element
                earns its screen space.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div
              className="relative rounded-xl overflow-hidden p-5 sm:p-6"
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(22,27,34,0.6)",
                backdropFilter: "blur(8px)",
                boxShadow: `0 0 40px rgba(20,184,166,0.06)`,
              }}
            >
              <CornerBrackets color={`${T}30`} />
              <ScanLine />
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="min-w-0">
                  <div className="font-mono text-[11px] text-white/35 truncate mb-1">
                    src/auth/token-manager.ts:142
                  </div>
                  <div className="font-mono text-lg font-semibold tracking-tight">
                    TokenManager::refreshAndRotate
                  </div>
                </div>
                <div
                  className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ border: `2px solid ${T}`, boxShadow: `0 0 16px ${T}40` }}
                >
                  <span className="font-mono text-sm font-semibold" style={{ color: T }}>98</span>
                </div>
              </div>
              <div
                className="rounded-md p-4 font-mono text-xs leading-relaxed overflow-x-auto"
                style={{ background: "rgba(14,17,23,0.8)", border: "1px solid rgba(255,255,255,0.04)" }}
              >
                <div className="text-white/30">
                  <span className="text-white/20 select-none mr-3">140</span>
                  {`/// Refresh the current token and rotate the signing key`}
                </div>
                <div className="text-white/30">
                  <span className="text-white/20 select-none mr-3">141</span>
                  <span style={{ color: V }}>{`pub async fn`}</span>
                  {` refreshAndRotate(`}
                </div>
                <div
                  className="-mx-4 px-4 py-0.5 text-white/70"
                  style={{ background: `${T}10`, borderLeft: `2px solid ${T}` }}
                >
                  <span className="text-white/20 select-none mr-3">142</span>
                  {`  let new_token = self.issuer.rotate(old_token).await?;`}
                </div>
                <div className="text-white/30">
                  <span className="text-white/20 select-none mr-3">143</span>
                  {`  self.cache.invalidate(&old_token.fingerprint);`}
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4 text-[10px] font-mono tracking-wide uppercase text-white/30">
                <span>Lexical <span style={{ color: A }}>0.87</span></span>
                <span className="w-px h-3 bg-white/10" />
                <span>Semantic <span style={{ color: T }}>0.94</span></span>
                <span className="w-px h-3 bg-white/10" />
                <span>Recency <span style={{ color: V }}>0.72</span></span>
                <span className="w-px h-3 bg-white/10" />
                <span>Hybrid <span className="text-white/70">0.98</span></span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <ResultDivider
        query="search modes and depth"
        resultTitle="Ixos Engine Configurations"
        resultPath="src/ixos_rank/modes.rs"
        resultSnippet="Flash mode for pure lexical speed. Auto mode for adaptive hybrid search. Pro mode for deep semantic reasoning using the Fusion model."
        score={94}
        accentColor={T}
        variant="1"
      />

      {/* ── S8  MODES / QUALITY ───────────────────────────────────── */}
      <section id="modes" className={`relative z-10 py-28 md:py-36 px-5 md:px-10 ${SepBorder}`}>
        <DataStreamOverlay />
        <div
          ref={modesReveal.ref}
          style={modesReveal.style}
          className="relative z-10 max-w-6xl mx-auto"
        >
          <Reveal>
            <div className="text-center mb-14">
              <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/40 mb-3">
                Search modes
              </p>
              <h2 className="font-mono text-3xl sm:text-4xl font-semibold tracking-tight">
                Choose your{" "}
                <span style={{ color: A }}>depth.</span>
              </h2>
            </div>
          </Reveal>
          <StaggerGroup className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(
              [
                {
                  mode: "Flash",
                  speed: "~10ms",
                  c: A,
                  bar: 20,
                  model: "int8 / 16.6 MB",
                  mrr: "0.71",
                  desc: "Pure lexical pass. Instant results for keyword-heavy queries. Perfect for known file names and exact patterns.",
                },
                {
                  mode: "Auto",
                  speed: "~40ms",
                  c: T,
                  bar: 55,
                  model: "int8 / 16.6 MB",
                  mrr: "0.83",
                  desc: "Adaptive hybrid engine. Lexical pre-filter followed by semantic re-ranking. Best balance of speed and quality.",
                },
                {
                  mode: "Pro",
                  speed: "~120ms",
                  c: V,
                  bar: 100,
                  model: "Fusion / ~102 MB",
                  mrr: "0.92",
                  desc: "Deep semantic reasoning with fusion model. Multi-hop understanding for complex conceptual queries.",
                },
              ] as const
            ).map((m, i) => (
              <motion.div
                key={i}
                variants={cFade}
                className="relative rounded-lg p-6 flex flex-col"
                style={{
                  background: "rgba(22,27,34,0.4)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
                whileHover={{
                  y: -5,
                  scale: 1.02,
                  borderColor: `${m.c}30`,
                  boxShadow: `0 0 30px ${m.c}12, inset 0 0 20px ${m.c}04`,
                }}
                transition={{ duration: 0.25 }}
              >
                <CornerBrackets color={`${m.c}20`} />
                <div className="flex items-baseline justify-between mb-1">
                  <span className="font-mono text-xl font-semibold" style={{ color: m.c, textShadow: `0 0 16px ${m.c}50` }}>
                    {m.mode}
                  </span>
                  <span className="font-mono text-xs text-white/30">{m.speed}</span>
                </div>
                <DataStreamBar pct={m.bar} color={m.c} />
                <p className="text-xs text-white/45 leading-relaxed flex-1 my-4">{m.desc}</p>
                <div
                  className="flex items-center justify-between text-[10px] font-mono tracking-wide uppercase text-white/25 pt-3"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <span>{m.model}</span>
                  <span>MRR@10 <span className="text-white/50">{m.mrr}</span></span>
                </div>
              </motion.div>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ── S9  TODAY / WORKSTREAMS ────────────────────────────────── */}
      <section id="today" className={`relative z-10 py-28 md:py-36 px-5 md:px-10 ${SepBorder}`}>
        <div className="relative z-10 max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-10 items-start">
          <div className="pt-4">
            <Reveal>
              <p className="font-mono text-[10px] tracking-[0.25em] uppercase mb-4" style={{ color: T }}>
                Context recovery
              </p>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="font-mono text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
                Pick up right where you{" "}
                <span style={{ color: T }}>left off.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-white/55 leading-relaxed mb-6">
                Ixos watches which files you touch, groups them into
                workstreams, and tells you what you were doing when you sit
                back down. No manual bookmarks. No IDE history digging.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <ul className="space-y-3 text-sm text-white/40">
                {[
                  "Automatic workstream detection from file access patterns",
                  "Resilient file watcher with rate limiting (100 events/sec)",
                  "Active / warm / cold status tracking across sessions",
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Dot color={T} />
                    {t}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
          <Reveal delay={0.15}>
            <div
              className="rounded-xl overflow-hidden min-w-0"
              style={{
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: `0 0 40px rgba(20,184,166,0.06)`,
                background: "rgba(22,27,34,0.6)",
                backdropFilter: "blur(8px)",
                height: 520, // Give it an explicit height so today view looks good
              }}
            >
              <DemoSurface
                initialView="today"
                initialQuery="What was I working on yesterday in the auth module?"
                autoRun={false}
                displayMode="search-only"
                style={{ height: '100%' }}
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── S10  CLI WORKFLOWS ────────────────────────────────────── */}
      <section id="cli" className={`relative z-10 py-28 md:py-36 px-5 md:px-10 ${SepBorder}`}>
        <div className="relative z-10 max-w-3xl mx-auto">
          <Reveal>
            <div className="text-center mb-10">
              <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/40 mb-3">
                CLI-native
              </p>
              <h2 className="font-mono text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
                For the{" "}
                <span style={{ color: A }}>terminal-native</span> developer
              </h2>
              <p className="text-white/50 max-w-lg mx-auto">
                Ixos is a single Rust binary. Pipe results into your existing
                workflow or use JSON output for scripting.
              </p>
            </div>
          </Reveal>
          <div ref={cliReveal.ref} style={cliReveal.style}>
            <Reveal delay={0.1}>
              <div
                className="relative rounded-lg overflow-hidden"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <CornerBrackets />
                {/* Terminal chrome */}
                <div
                  className="flex items-center gap-2 px-4 py-2.5"
                  style={{ background: "#0d0f14", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="flex gap-1.5">
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(255,95,87,0.7)" }} />
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(255,189,68,0.7)" }} />
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(40,201,64,0.7)" }} />
                  </div>
                  <span className="font-mono text-[10px] text-white/25 ml-2">ixos — terminal</span>
                </div>
                <div
                  className="p-5 font-mono text-[12px] leading-[1.8] text-white/60 space-y-4 overflow-x-auto"
                  style={{ background: "#08090d" }}
                >
                  <div>
                    <span className="text-white/25">$</span>{" "}
                    <span style={{ color: A }}>ixos</span>{" "}
                    search &quot;authentication token refresh&quot; --progressive --show-scores
                  </div>
                  <div className="text-white/25 text-[11px]">
                    {`[scan] 1,247 files in 7ms`}<br />
                    {`[lexical] 89 candidates scored`}<br />
                    {`[semantic] 24 embedded (19 cache hits)`}<br />
                    {`[locked] 8 results in 312ms`}
                  </div>
                  <div>
                    <span style={{ color: T }}>1.</span>{" "}
                    <span className="text-white/80">src/auth/token-manager.ts:142</span>{" "}
                    <span style={{ color: A }}>[0.98]</span>
                    <br />
                    <span style={{ color: T }}>2.</span>{" "}
                    <span className="text-white/80">src/auth/refresh.ts:89</span>{" "}
                    <span style={{ color: A }}>[0.94]</span>
                    <br />
                    <span style={{ color: T }}>3.</span>{" "}
                    <span className="text-white/80">src/api/middleware/auth.ts:31</span>{" "}
                    <span style={{ color: A }}>[0.87]</span>
                  </div>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 16 }}>
                    <span className="text-white/25">$</span>{" "}
                    <span style={{ color: A }}>ixos</span>{" "}
                    search &quot;database migration&quot; --cache-mode ephemeral --journalist-mode
                  </div>
                  <div className="text-white/25 text-[11px]">
                    {`[journalist] ephemeral mode active — no cache persisted`}<br />
                    {`[journalist] secure timing floor enabled (100ms)`}<br />
                    {`[locked] 5 results — memory wiped on exit`}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── S11  BENTO FEATURE GRID ───────────────────────────────── */}
      <section className={`relative z-10 py-28 md:py-36 px-5 md:px-10 ${SepBorder}`}>
        <div
          ref={bentoReveal.ref}
          style={bentoReveal.style}
          className="relative z-10 max-w-6xl mx-auto"
        >
          <Reveal>
            <div className="text-center mb-14">
              <h2 className="font-mono text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
                Zero cloud.{" "}
                <span style={{ color: A }}>Zero telemetry.</span> Provable.
              </h2>
              <p className="text-white/50 max-w-xl mx-auto">
                Six guarantees baked into the architecture, not bolted on after.
              </p>
            </div>
          </Reveal>
          <StaggerGroup className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => (
              <BentoCard key={i} f={f} i={i} />
            ))}
          </StaggerGroup>

          {/* Proof cards */}
          <StaggerGroup className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {(
              [
                { t: "No network calls", d: "The binary contains zero HTTP client code. There are no servers to send data to. Verify with `cargo audit` or read the source.", c: A },
                { t: "HMAC-signed cache", d: "Every cached embedding is signed with HMAC-SHA256. Tampered or stale entries are rejected and re-computed automatically.", c: T },
                { t: "Local execution only", d: "Embedding inference runs on your CPU. Model2Vec int8 model ships with the binary. No GPU required, no API keys.", c: V },
                { t: "Path sandboxing", d: "The security sandbox validates all file paths and restricts access to configured directories. No symlink traversal attacks.", c: A },
                { t: "Memory protection", d: "SecureBuffer uses mlock to prevent embedding data from being swapped to disk. Zeroize-on-drop clears sensitive memory.", c: T },
                { t: "Compliance built in", d: "GDPR right-to-delete, CCPA opt-out, and EU AI Act transparency requirements are satisfied by design, not by policy.", c: V },
              ] as const
            ).map((item, i) => (
              <motion.div
                key={i}
                variants={cFade}
                className="relative rounded-lg p-5"
                style={{ background: "rgba(22,27,34,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}
                whileHover={{
                  y: -3,
                  borderColor: `${item.c}25`,
                  boxShadow: `0 0 16px ${item.c}10`,
                }}
                transition={{ duration: 0.2 }}
              >
                <CornerBrackets color={`${item.c}20`} />
                <div className="w-1.5 h-1.5 rounded-full mb-3" style={{ backgroundColor: item.c, boxShadow: `0 0 6px ${item.c}` }} />
                <h3 className="font-mono text-sm font-semibold mb-2 text-white/90">{item.t}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{item.d}</p>
              </motion.div>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ── S12  PRICING ──────────────────────────────────────────── */}
      <OpenSourceNotice variant="1" />

      {/* ── S13  FAQ & CTA FOOTER ─────────────────────────────────── */}
      <section className={`relative z-10 py-28 md:py-36 px-5 md:px-10 ${SepBorder}`}>
        <div className="relative z-10 max-w-3xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <h2 className="font-mono text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
                Frequently asked questions
              </h2>
            </div>
          </Reveal>
          <div className="space-y-2 mb-20">
            {FAQS.map((item, i) => (
              <Reveal key={i} delay={i * 0.04}>
                <div
                  className="rounded-lg overflow-hidden"
                  style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(22,27,34,0.3)" }}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="text-sm font-medium text-white/80">{item.q}</span>
                    <motion.span
                      animate={{ rotate: openFaq === i ? 45 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-white/30 text-lg shrink-0 leading-none"
                    >
                      +
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-4 text-xs text-white/45 leading-relaxed">{item.a}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <div className="text-center">
              <h3 className="font-mono text-2xl sm:text-3xl font-semibold tracking-tight mb-4">
                Ready to search smarter?
              </h3>
              <p className="text-white/45 text-sm mb-7 max-w-md mx-auto">
                Download Ixos, point it at a directory, and search. Setup takes
                less than 30 seconds.
              </p>
              <motion.button
                className="px-7 py-3 rounded-md font-mono text-sm font-semibold text-black"
                style={{
                  background: `linear-gradient(135deg, ${A}, #F59E0B)`,
                  boxShadow: `0 0 24px ${A}35`,
                }}
                whileHover={{ scale: 1.05, boxShadow: `0 0 40px ${A}55` }}
                whileTap={{ scale: 0.97 }}
              >
                Get Ixos Free
              </motion.button>
            </div>
          </Reveal>
          <div
            className="mt-24 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-mono tracking-wide uppercase text-white/20"
            style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
          >
            <span>&copy; 2026 Ixos. All rights reserved.</span>
            <div className="flex gap-5">
              <span className="hover:text-white/40 cursor-pointer transition-colors">Privacy</span>
              <span className="hover:text-white/40 cursor-pointer transition-colors">Terms</span>
              <span className="hover:text-white/40 cursor-pointer transition-colors">GitHub</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
