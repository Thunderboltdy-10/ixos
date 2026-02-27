"use client";

import { useRef, useState, useEffect } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";
import { useReducedOrLowEnd } from "./useReducedOrLowEnd";

// ─── Stage data ───────────────────────────────────────────────────────────────
// The files CHANGE ORDER between stages — that's the money-shot animation
const STAGES = [
  {
    id: 0,
    step: "01",
    mode: "Lexical Sweep",
    modeColor: "#F59E0B",
    headline: "Candidates surface instantly.",
    desc: "Keyword-indexed paths appear in milliseconds. Fast, coarse, deterministic.",
    badge: "SCANNING",
    badgeColor: "#F59E0B",
    files: [
      { name: "auth/login.ts",     score: 0.91, type: "lex" },
      { name: "utils/tokens.ts",   score: 0.88, type: "lex" },
      { name: "api/session.ts",    score: 0.84, type: "lex" },
      { name: "hooks/useAuth.ts",  score: 0.77, type: "lex" },
      { name: "middleware/jwt.ts", score: 0.71, type: "lex" },
      { name: "lib/crypto.ts",     score: 0.65, type: "lex" },
    ],
  },
  {
    id: 1,
    step: "02",
    mode: "Semantic Rerank",
    modeColor: "#7C3AED",
    headline: "Meaning reshapes the order.",
    desc: "Embedding similarity reorders candidates. Intent-aligned results rise to the top.",
    badge: "RERANKING",
    badgeColor: "#7C3AED",
    files: [
      { name: "api/session.ts",    score: 0.97, type: "sem" },
      { name: "auth/login.ts",     score: 0.94, type: "sem" },
      { name: "middleware/jwt.ts", score: 0.91, type: "sem" },
      { name: "utils/tokens.ts",   score: 0.88, type: "sem" },
      { name: "lib/crypto.ts",     score: 0.82, type: "sem" },
      { name: "hooks/useAuth.ts",  score: 0.74, type: "sem" },
    ],
  },
  {
    id: 2,
    step: "03",
    mode: "Locked",
    modeColor: "#2DD4BF",
    headline: "Results stabilize.",
    desc: "Hybrid scoring converges. Deterministic, private — never left your machine.",
    badge: "READY",
    badgeColor: "#2DD4BF",
    files: [
      { name: "api/session.ts",    score: 0.97, type: "lock" },
      { name: "auth/login.ts",     score: 0.94, type: "lock" },
      { name: "middleware/jwt.ts", score: 0.91, type: "lock" },
      { name: "utils/tokens.ts",   score: 0.88, type: "lock" },
      { name: "lib/crypto.ts",     score: 0.82, type: "lock" },
      { name: "hooks/useAuth.ts",  score: 0.74, type: "lock" },
    ],
  },
] as const;

type StageIndex = 0 | 1 | 2;

// ─── Animated file row ────────────────────────────────────────────────────────
function FileRow({
  name,
  score,
  rank,
  color,
  locked,
}: {
  name: string;
  score: number;
  rank: number;
  color: string;
  locked: boolean;
}) {
  return (
    <motion.div
      layout
      layoutId={`file-${name}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.38, ease: "easeInOut" }}
      className="flex items-center gap-3 py-2.5"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
    >
      {/* Rank */}
      <span
        className="font-mono text-[10px] w-4 text-right shrink-0 tabular-nums"
        style={{ color: "rgba(255,255,255,0.2)" }}
      >
        {rank + 1}
      </span>

      {/* Divider */}
      <div className="w-px h-3.5 shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.07)" }} />

      {/* Filename */}
      <span
        className="font-mono text-xs flex-1 truncate"
        style={{ color: "rgba(255,255,255,0.68)" }}
      >
        {name}
      </span>

      {/* Lock icon (stage 3 only) */}
      {locked && (
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="font-mono text-[8px] tracking-widest shrink-0"
          style={{ color }}
        >
          ■
        </motion.span>
      )}

      {/* Score bar + number */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative h-px w-14 overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
          <motion.div
            className="absolute inset-y-0 left-0"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${score * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <span className="font-mono text-[10px] tabular-nums w-7 text-right" style={{ color }}>
          {score.toFixed(2)}
        </span>
      </div>
    </motion.div>
  );
}

// ─── The morphing result panel ────────────────────────────────────────────────
function ResultPanel({ stageIdx }: { stageIdx: StageIndex }) {
  const stage = STAGES[stageIdx];

  return (
    <div
      className="flex flex-col"
      style={{
        background: "rgba(255,255,255,0.015)",
        border: "1px solid rgba(255,255,255,0.07)",
        padding: "1.5rem",
      }}
    >
      {/* Panel header */}
      <div
        className="flex items-center justify-between pb-3 mb-1"
        style={{ borderBottom: `1px solid ${stage.modeColor}25` }}
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5" style={{ backgroundColor: stage.modeColor }} />
          <span className="font-mono text-[9px] tracking-[0.25em] uppercase" style={{ color: "rgba(255,255,255,0.28)" }}>
            {stage.files.length} candidates
          </span>
        </div>
        {/* Animated status badge */}
        <AnimatePresence mode="wait">
          <motion.span
            key={stage.badge}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.25 }}
            className="font-mono text-[9px] tracking-[0.2em] uppercase"
            style={{ color: stage.modeColor }}
          >
            {stage.badge}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* File list — layout animations handle reordering */}
      <div className="relative min-h-[240px]">
        <AnimatePresence>
          {stage.files.map((file, i) => (
            <FileRow
              key={file.name}
              name={file.name}
              score={file.score}
              rank={i}
              color={stage.modeColor}
              locked={stageIdx === 2}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Stage description ────────────────────────────────────────────────────────
function StageDescription({ stageIdx }: { stageIdx: StageIndex }) {
  const stage = STAGES[stageIdx];

  return (
    <div className="flex flex-col justify-center">
      {/* Step + mode */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stageIdx}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.38, ease: "easeOut" }}
        >
          <div className="flex items-center gap-3 mb-5">
            <span
              className="font-mono text-[10px] tracking-[0.3em] uppercase"
              style={{ color: stage.modeColor }}
            >
              {stage.step} / {stage.mode}
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.05)" }} />
          </div>

          <h3
            className="font-display font-bold text-white leading-tight mb-4"
            style={{ fontSize: "clamp(1.65rem, 2.8vw, 2.6rem)" }}
          >
            {stage.headline}
          </h3>

          <p
            className="font-mono text-sm leading-relaxed max-w-sm"
            style={{ color: "rgba(255,255,255,0.38)" }}
          >
            {stage.desc}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Progress timeline */}
      <div className="flex items-center gap-2 mt-10">
        {STAGES.map((s, i) => (
          <motion.div
            key={s.id}
            className="h-px transition-all duration-500"
            style={{
              width: i === stageIdx ? "32px" : "12px",
              backgroundColor:
                i === stageIdx
                  ? stage.modeColor
                  : i < stageIdx
                  ? "rgba(255,255,255,0.25)"
                  : "rgba(255,255,255,0.08)",
            }}
          />
        ))}
        <span
          className="font-mono text-[9px] tracking-[0.2em] uppercase ml-2"
          style={{ color: "rgba(255,255,255,0.2)" }}
        >
          {stageIdx + 1} of 3
        </span>
      </div>
    </div>
  );
}

// ─── Scroll-driven version ────────────────────────────────────────────────────
// BUG FIX: Stage 3 (Locked) never loaded because useMotionValueEvent only fires
// on changes — if the page is already scrolled to this section when loaded,
// or if the initial scrollYProgress value is past a threshold, no "change" event
// fires to advance the stage. Fix: read the initial value in a useEffect.
// Also shortening height from 280vh → 200vh for snappier stage transitions
// (stages advance at 30% and 62% of a 100vh scroll range instead of 186vh).
function ScrollDrivenStages() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageIdx, setStageIdx] = useState<StageIndex>(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // FIX: Initialize stage from current scroll value on mount
  useEffect(() => {
    const v = scrollYProgress.get();
    if (v < 0.30) setStageIdx(0);
    else if (v < 0.62) setStageIdx(1);
    else setStageIdx(2);
  }, [scrollYProgress]);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (v < 0.30) setStageIdx(0);
    else if (v < 0.62) setStageIdx(1);
    else setStageIdx(2);
  });

  return (
    <div ref={containerRef} style={{ height: "200vh" }}>
      {/* Sticky display */}
      <div
        className="sticky top-0 flex flex-col"
        style={{
          height: "100vh",
          backgroundColor: "#0C0E10",
        }}
      >
        {/* Section header */}
        <div className="pt-10 pb-6 flex flex-col items-center shrink-0">
          <p
            className="font-mono text-[10px] tracking-[0.3em] uppercase mb-2.5"
            style={{ color: "rgba(255,255,255,0.22)" }}
          >
            Progressive Retrieval
          </p>
          <div className="w-12 h-px" style={{ backgroundColor: "rgba(255,255,255,0.07)" }} />
        </div>

        {/* Main layout */}
        <div className="flex-1 flex items-center">
          <div className="max-w-6xl mx-auto px-6 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              <StageDescription stageIdx={stageIdx} />
              <ResultPanel stageIdx={stageIdx} />
            </div>
          </div>
        </div>

        {/* Scroll guide */}
        {stageIdx === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-7 right-8 flex items-center gap-2 pointer-events-none"
          >
            <div className="w-8 h-px" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
            <span
              className="font-mono text-[9px] tracking-[0.25em] uppercase"
              style={{ color: "rgba(255,255,255,0.18)" }}
            >
              Scroll to advance
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── Static low-end version ───────────────────────────────────────────────────
function StaticStages() {
  return (
    <div className="py-28 px-6" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="font-mono text-[10px] tracking-[0.3em] uppercase mb-3" style={{ color: "rgba(255,255,255,0.22)" }}>
            Progressive Retrieval
          </p>
          <h2 className="font-display text-4xl font-bold text-white">Three stages. One result.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STAGES.map((stage) => (
            <div key={stage.id}>
              <p className="font-mono text-[10px] tracking-[0.3em] uppercase mb-3" style={{ color: stage.modeColor }}>
                {stage.step} / {stage.mode}
              </p>
              <h3 className="font-display text-xl font-semibold text-white mb-2">{stage.headline}</h3>
              <p className="font-mono text-xs leading-relaxed mb-5" style={{ color: "rgba(255,255,255,0.38)" }}>{stage.desc}</p>
              {stage.files.map((f, i) => (
                <div key={f.name} className="flex items-center gap-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span className="font-mono text-[10px] w-4 text-right" style={{ color: "rgba(255,255,255,0.2)" }}>{i + 1}</span>
                  <span className="font-mono text-xs flex-1 truncate" style={{ color: "rgba(255,255,255,0.6)" }}>{f.name}</span>
                  <span className="font-mono text-[10px]" style={{ color: stage.modeColor }}>{f.score.toFixed(2)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export function ProgressiveScrollV4() {
  const lowEnd = useReducedOrLowEnd();

  return (
    <section
      id="progressive"
      style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
    >
      {lowEnd ? <StaticStages /> : <ScrollDrivenStages />}
    </section>
  );
}
