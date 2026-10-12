"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STAGES = [
  { key: "SCANNING_ROOTS", hold: 280 },
  { key: "BUILDING_CANDIDATES", hold: 320 },
  { key: "RERANKING", hold: 260 },
  { key: "READY", hold: 180 },
];

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_./>|[]\\";
const REVEAL_DURATION = 220; // ms to decode each stage label

function scramble(target: string, progress: number): string {
  return target
    .split("")
    .map((char, i) => {
      if (char === "_") return "_";
      const threshold = i / target.length;
      if (threshold < progress) return char;
      return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    })
    .join("");
}

interface LoaderV4Props {
  onComplete: () => void;
}

export function LoaderV4({ onComplete }: LoaderV4Props) {
  const [stageIndex, setStageIndex] = useState(0);
  const [displayText, setDisplayText] = useState(STAGES[0].key);
  const [globalProgress, setGlobalProgress] = useState(0);
  const [exiting, setExiting] = useState(false);
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const stageStartRef = useRef<number>(0);

  // Skip on reduced motion
  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      onComplete();
    }
  }, [onComplete]);

  const advance = useCallback(() => {
    setStageIndex((prev) => {
      const next = prev + 1;
      if (next >= STAGES.length) {
        // All stages done — exit
        setExiting(true);
        setTimeout(onComplete, 500);
        return prev;
      }
      stageStartRef.current = performance.now();
      return next;
    });
  }, [onComplete]);

  // Scramble reveal loop per stage
  useEffect(() => {
    const target = STAGES[stageIndex].key;
    const hold = STAGES[stageIndex].hold;
    stageStartRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - stageStartRef.current;
      const p = Math.min(elapsed / REVEAL_DURATION, 1);
      setDisplayText(scramble(target, p));
      setGlobalProgress((stageIndex + p) / STAGES.length);

      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        // Hold then advance
        const holdTimer = setTimeout(advance, hold);
        return () => clearTimeout(holdTimer);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [stageIndex, advance]);

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ backgroundColor: "#0C0E10" }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {/* Blueprint grid */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
              `,
              backgroundSize: "48px 48px",
            }}
          />

          {/* Cross-hair */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-8 bg-white/10" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-8 bg-white/10" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-px w-8 bg-white/10" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-px w-8 bg-white/10" />
          </div>

          <div className="relative flex flex-col items-center gap-8">
            {/* Mark */}
            <div className="w-9 h-9 border border-white/15 flex items-center justify-center">
              <div
                className="w-3.5 h-3.5"
                style={{ backgroundColor: "#2DD4BF", opacity: 0.85 }}
              />
            </div>

            {/* Scrambled stage text */}
            <div
              className="font-mono text-sm tracking-[0.3em] text-white/70 min-w-[260px] text-center tabular-nums"
              aria-live="polite"
            >
              {displayText}
            </div>

            {/* Progress bar */}
            <div className="w-56 h-px bg-white/[0.08] relative overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0"
                style={{ backgroundColor: "#2DD4BF" }}
                animate={{ width: `${globalProgress * 100}%` }}
                transition={{ duration: 0.1, ease: "linear" }}
              />
            </div>

            {/* Stage dots */}
            <div className="flex items-center gap-3">
              {STAGES.map((s, i) => (
                <div
                  key={s.key}
                  className="w-1 h-1 transition-all duration-300"
                  style={{
                    backgroundColor:
                      i < stageIndex
                        ? "#2DD4BF"
                        : i === stageIndex
                        ? "rgba(45,212,191,0.5)"
                        : "rgba(255,255,255,0.08)",
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
