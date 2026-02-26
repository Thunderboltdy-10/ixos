"use client";

import { useEffect, useRef, useState, Suspense, Component, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { FileNodesBg } from "./FileNodesBg";
import { useReducedOrLowEnd } from "./useReducedOrLowEnd";

// Dynamic import: SSR=false, only loads client-side
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

function CoreFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <svg viewBox="-200 -200 400 400" width="440" height="440" className="opacity-30" style={{ overflow: "visible" }}>
        <circle cx="0" cy="0" r="160" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        <circle cx="0" cy="0" r="95" fill="none" stroke="#2DD4BF" strokeWidth="0.5" strokeOpacity="0.25" strokeDasharray="3 9" />
        <circle cx="0" cy="0" r="120" fill="none" stroke="#7C3AED" strokeWidth="0.4" strokeOpacity="0.15" strokeDasharray="2 12" />
        <polygon points="0,-70 60,-35 60,35 0,70 -60,35 -60,-35" fill="rgba(45,212,191,0.03)" stroke="#2DD4BF" strokeWidth="0.5" strokeOpacity="0.3" />
      </svg>
    </div>
  );
}

// ─── Demo data ────────────────────────────────────────────────────────────────
const DEMO_QUERIES = [
  {
    query: "auth token refresh handler",
    time: "29ms",
    results: [
      { rank: 1, file: "api/session.ts", score: 0.97 },
      { rank: 2, file: "middleware/jwt.ts", score: 0.94 },
      { rank: 3, file: "lib/tokens.ts", score: 0.91 },
      { rank: 4, file: "hooks/useAuth.ts", score: 0.88 },
    ],
  },
  {
    query: "database connection pool",
    time: "24ms",
    results: [
      { rank: 1, file: "lib/db.ts", score: 0.96 },
      { rank: 2, file: "config/database.ts", score: 0.93 },
      { rank: 3, file: "utils/pool.ts", score: 0.89 },
      { rank: 4, file: "services/postgres.ts", score: 0.85 },
    ],
  },
  {
    query: "error handling middleware",
    time: "18ms",
    results: [
      { rank: 1, file: "middleware/errors.ts", score: 0.98 },
      { rank: 2, file: "utils/catchAsync.ts", score: 0.94 },
      { rank: 3, file: "lib/errorBoundary.tsx", score: 0.90 },
      { rank: 4, file: "api/handlers.ts", score: 0.87 },
    ],
  },
];

type DemoPhase = "IDLE" | "TYPING" | "SCANNING" | "RESULTS" | "HOLD" | "CLEAR";

const TELEMETRY = [
  { label: "Mode", value: "Local-first" },
  { label: "Retrieval", value: "Hybrid" },
  { label: "Results", value: "Progressive" },
  { label: "Telemetry", value: "None" },
];

// ─── Score bar ────────────────────────────────────────────────────────────────
function ScoreBar({ score, visible }: { score: number; visible: boolean }) {
  const bars = 8;
  const filled = Math.round(score * bars);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scaleY: 0 }}
          animate={visible ? { opacity: i < filled ? 1 : 0.15, scaleY: 1 } : { opacity: 0, scaleY: 0 }}
          transition={{ delay: i * 0.03, duration: 0.18 }}
          style={{
            width: 3,
            height: 10,
            backgroundColor: i < filled ? "#F59E0B" : "rgba(255,255,255,0.1)",
            transformOrigin: "bottom",
          }}
        />
      ))}
    </div>
  );
}

// ─── Hero component ───────────────────────────────────────────────────────────
export function HeroV4() {
  const lowEnd = useReducedOrLowEnd();

  const [queryIndex, setQueryIndex] = useState(0);
  const [phase, setPhase] = useState<DemoPhase>("IDLE");
  const [typedChars, setTypedChars] = useState(0);
  const [visibleResults, setVisibleResults] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const currentDemo = DEMO_QUERIES[queryIndex];
  const displayText = currentDemo.query.slice(0, typedChars);

  function clearTimers() {
    if (timerRef.current) clearTimeout(timerRef.current);
    resultTimers.current.forEach(clearTimeout);
    resultTimers.current = [];
  }

  useEffect(() => {
    timerRef.current = setTimeout(() => setPhase("TYPING"), 800);
    return () => { clearTimers(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    clearTimers();

    if (phase === "TYPING") {
      if (typedChars < currentDemo.query.length) {
        timerRef.current = setTimeout(() => {
          setTypedChars((c) => c + 1);
        }, 55);
      } else {
        timerRef.current = setTimeout(() => setPhase("SCANNING"), 120);
      }
    } else if (phase === "SCANNING") {
      timerRef.current = setTimeout(() => {
        setPhase("RESULTS");
        setVisibleResults(0);
      }, 200);
    } else if (phase === "RESULTS") {
      currentDemo.results.forEach((_, i) => {
        const t = setTimeout(() => setVisibleResults(i + 1), i * 120);
        resultTimers.current.push(t);
      });
      timerRef.current = setTimeout(() => setPhase("HOLD"), currentDemo.results.length * 120 + 400);
    } else if (phase === "HOLD") {
      timerRef.current = setTimeout(() => setPhase("CLEAR"), 2200);
    } else if (phase === "CLEAR") {
      timerRef.current = setTimeout(() => {
        setTypedChars(0);
        setVisibleResults(0);
        setQueryIndex((i) => (i + 1) % DEMO_QUERIES.length);
        setPhase("TYPING");
      }, 300);
    }

    return () => { clearTimers(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, typedChars, queryIndex]);

  const showCursor = phase === "TYPING" || phase === "IDLE";
  const showScanning = phase === "SCANNING";
  const showResults = phase === "RESULTS" || phase === "HOLD" || phase === "CLEAR";
  const clearing = phase === "CLEAR";

  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: "#0C0E10" }}
    >
      {/* FileNodesBg canvas */}
      <FileNodesBg density={0.65} opacity={0.18} color="#2DD4BF" speed={0.6} />

      {/* Blueprint grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)
          `,
          backgroundSize: "72px 72px",
        }}
      />

      {/* Corner calibration marks */}
      {(["top-8 left-8", "top-8 right-8", "bottom-8 left-8", "bottom-8 right-8"] as const).map((pos) => (
        <div key={pos} className={`absolute ${pos} w-5 h-5 pointer-events-none`}>
          <div className="absolute top-0 left-0 w-full h-px" style={{ backgroundColor: "rgba(255,255,255,0.12)" }} />
          <div className="absolute top-0 left-0 h-full w-px" style={{ backgroundColor: "rgba(255,255,255,0.12)" }} />
        </div>
      ))}

      {/* 3D Scene background */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
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

      {/* Radial vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 20%, rgba(12,14,16,0.7) 100%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, rgba(12,14,16,0.6) 0%, transparent 25%, transparent 70%, rgba(12,14,16,0.95) 100%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-4xl mx-auto w-full">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-7"
        >
          <div
            className="inline-flex items-center gap-2.5 px-4 py-1.5 font-mono text-[9px] tracking-[0.3em] uppercase"
            style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }}
          >
            <span className="w-1.5 h-1.5 animate-pulse" style={{ backgroundColor: "#2DD4BF" }} />
            Ixos Protocol · Search Engine
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.65 }}
          className="font-display font-bold text-white leading-[1.02] mb-5"
          style={{ fontSize: "clamp(2.5rem, 6.5vw, 4.75rem)" }}
        >
          Find what you{" "}
          <span
            style={{
              WebkitTextFillColor: "transparent",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              backgroundImage: "linear-gradient(135deg, #7C3AED 0%, #a855f7 100%)",
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
          className="font-mono text-sm leading-relaxed mb-10 max-w-md"
          style={{ color: "rgba(255,255,255,0.38)" }}
        >
          Local-first semantic search. Progressive results. On your machine.
        </motion.p>

        {/* ── Demo search terminal ── */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="w-full max-w-xl mb-10"
          style={{
            border: "1px solid rgba(255,255,255,0.1)",
            backgroundColor: "rgba(12,14,16,0.85)",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Terminal top bar */}
          <div
            className="flex items-center justify-between px-4 py-2"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
            </div>
            <span className="font-mono text-[9px] tracking-[0.25em] uppercase" style={{ color: "rgba(255,255,255,0.15)" }}>
              ixos search
            </span>
            <div className="w-8" />
          </div>

          {/* Search input row */}
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="font-mono text-xs shrink-0" style={{ color: "#2DD4BF" }}>›</span>
              <span className="font-mono text-xs text-white truncate">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={`text-${queryIndex}`}
                    initial={{ opacity: 1 }}
                    animate={{ opacity: clearing ? 0 : 1 }}
                    transition={{ duration: 0.25 }}
                  >
                    {displayText}
                  </motion.span>
                </AnimatePresence>
                {showCursor && (
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ repeat: Infinity, duration: 0.9 }}
                    style={{ color: "#2DD4BF" }}
                  >
                    _
                  </motion.span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <AnimatePresence mode="wait">
                {showScanning ? (
                  <motion.span
                    key="scanning"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-mono text-[9px] tracking-[0.2em] uppercase"
                    style={{ color: "#F59E0B" }}
                  >
                    SCANNING...
                  </motion.span>
                ) : showResults && !clearing ? (
                  <motion.span
                    key="ready"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-mono text-[9px] tracking-[0.2em] uppercase"
                    style={{ color: "#2DD4BF" }}
                  >
                    {currentDemo.time} READY
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          {/* Results area */}
          <div
            className="px-4 pb-3"
            style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "8px", minHeight: 112 }}
          >
            <AnimatePresence>
              {showResults && !clearing && currentDemo.results.map((result, i) => (
                <motion.div
                  key={`${queryIndex}-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={i < visibleResults ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="flex items-center gap-3 py-1.5"
                  style={{
                    borderBottom:
                      i < currentDemo.results.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                  }}
                >
                  <span className="font-mono text-[10px] w-4 shrink-0 tabular-nums" style={{ color: "rgba(255,255,255,0.2)" }}>
                    {result.rank}
                  </span>
                  <span className="font-mono text-[11px] flex-1 truncate" style={{ color: "rgba(255,255,255,0.75)" }}>
                    {result.file}
                  </span>
                  <ScoreBar score={result.score} visible={i < visibleResults} />
                  <span className="font-mono text-[10px] w-8 text-right tabular-nums shrink-0" style={{ color: "#F59E0B" }}>
                    {result.score.toFixed(2)}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.68, duration: 0.5 }}
          className="flex flex-wrap gap-4 justify-center mb-14"
        >
          <Link
            href="/download"
            className="font-mono text-xs px-8 py-3 font-semibold tracking-[0.2em] uppercase transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: "#2DD4BF", color: "#0C0E10" }}
          >
            Download
          </Link>
          <Link
            href="/docs"
            className="font-mono text-xs px-8 py-3 tracking-[0.2em] uppercase transition-all duration-200 active:scale-[0.98]"
            style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.45)" }}
          >
            CLI Docs
          </Link>
        </motion.div>

        {/* Telemetry strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.7 }}
          className="flex flex-wrap justify-center gap-8 md:gap-14"
        >
          {TELEMETRY.map((item, i) => (
            <div key={item.label} className="flex flex-col items-center gap-1.5">
              <div className="font-mono text-[8px] tracking-[0.3em] uppercase" style={{ color: "rgba(255,255,255,0.18)" }}>
                {item.label}
              </div>
              <div
                className="font-mono text-[10px] tracking-[0.12em]"
                style={{
                  color:
                    i === 0 ? "#F59E0B"
                    : i === 1 ? "#2DD4BF"
                    : i === 2 ? "#7C3AED"
                    : "rgba(255,255,255,0.3)",
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
      >
        <span className="font-mono text-[8px] tracking-[0.35em] uppercase" style={{ color: "rgba(255,255,255,0.12)" }}>
          Scroll
        </span>
        <div
          className="w-px h-10"
          style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.12), transparent)" }}
        />
      </motion.div>
    </section>
  );
}
