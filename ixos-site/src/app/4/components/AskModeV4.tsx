"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { FileNodesBg } from "./FileNodesBg";

// ─── Demo data ────────────────────────────────────────────────────────────────
const ASK_DEMOS = [
  {
    question: "Where does the app handle authentication?",
    results: [
      { file: "auth/login.ts", score: 0.97 },
      { file: "middleware/auth.ts", score: 0.94 },
      { file: "lib/session.ts", score: 0.91 },
    ],
  },
  {
    question: "What files should I change to add a new API endpoint?",
    results: [
      { file: "api/routes.ts", score: 0.96 },
      { file: "controllers/", score: 0.92 },
      { file: "types/api.ts", score: 0.88 },
    ],
  },
];

type AskPhase = "IDLE" | "TYPING" | "RESULTS" | "HOLD" | "CLEAR";

// ─── Score dots ───────────────────────────────────────────────────────────────
function ScoreDots({ score }: { score: number }) {
  const count = Math.round(score * 7);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 5,
            height: 5,
            backgroundColor: i < count ? "rgba(45,212,191,0.7)" : "rgba(255,255,255,0.08)",
          }}
        />
      ))}
    </div>
  );
}

// ─── Terminal demo panel ──────────────────────────────────────────────────────
function AskDemo() {
  const inViewRef = useRef<HTMLDivElement>(null);
  const inView = useInView(inViewRef, { once: false, margin: "-80px" });

  const [demoIndex, setDemoIndex] = useState(0);
  const [phase, setPhase] = useState<AskPhase>("IDLE");
  const [typedChars, setTypedChars] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentDemo = ASK_DEMOS[demoIndex];
  const displayText = currentDemo.question.slice(0, typedChars);

  function clearTimer() {
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  // Start when in view
  useEffect(() => {
    if (inView && phase === "IDLE") {
      timerRef.current = setTimeout(() => setPhase("TYPING"), 600);
    }
    return () => clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  useEffect(() => {
    clearTimer();

    if (phase === "TYPING") {
      if (typedChars < currentDemo.question.length) {
        timerRef.current = setTimeout(() => setTypedChars((c) => c + 1), 45);
      } else {
        timerRef.current = setTimeout(() => {
          setShowResults(true);
          setPhase("RESULTS");
        }, 300);
      }
    } else if (phase === "RESULTS") {
      timerRef.current = setTimeout(() => setPhase("HOLD"), 1200);
    } else if (phase === "HOLD") {
      timerRef.current = setTimeout(() => setPhase("CLEAR"), 2500);
    } else if (phase === "CLEAR") {
      timerRef.current = setTimeout(() => {
        setShowResults(false);
        setTypedChars(0);
        setDemoIndex((i) => (i + 1) % ASK_DEMOS.length);
        setPhase("TYPING");
      }, 400);
    }

    return () => clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, typedChars, demoIndex]);

  const showCursor = phase === "TYPING" || phase === "IDLE";
  const clearing = phase === "CLEAR";

  return (
    <div ref={inViewRef} className="w-full">
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.1)",
          backgroundColor: "rgba(8,10,12,0.9)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-1.5 h-1.5 animate-pulse"
              style={{ backgroundColor: "#2DD4BF" }}
            />
            <span className="font-mono text-[9px] tracking-[0.25em] uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
              Ask Ixos
            </span>
          </div>
          <span className="font-mono text-[8px] tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.12)" }}>
            Pro
          </span>
        </div>

        {/* Question input */}
        <div className="px-5 py-4">
          <div
            className="px-4 py-3"
            style={{ border: "1px solid rgba(255,255,255,0.07)", backgroundColor: "rgba(255,255,255,0.02)" }}
          >
            <span className="font-mono text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
              <AnimatePresence mode="wait">
                <motion.span
                  key={`q-${demoIndex}`}
                  initial={{ opacity: 1 }}
                  animate={{ opacity: clearing ? 0 : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {displayText}
                </motion.span>
              </AnimatePresence>
              {showCursor && (
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ repeat: Infinity, duration: 0.85 }}
                  style={{ color: "#2DD4BF" }}
                >
                  |
                </motion.span>
              )}
            </span>
          </div>
        </div>

        {/* Results */}
        <div className="px-5 pb-5" style={{ minHeight: 120 }}>
          <AnimatePresence>
            {showResults && !clearing && (
              <motion.div
                key={`results-${demoIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-2"
              >
                {currentDemo.results.map((result, i) => (
                  <motion.div
                    key={result.file}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.12, duration: 0.25 }}
                    className="flex items-center justify-between py-2"
                    style={{
                      borderBottom: i < currentDemo.results.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    }}
                  >
                    <span className="font-mono text-[11px]" style={{ color: "rgba(255,255,255,0.65)" }}>
                      {result.file}
                    </span>
                    <ScoreDots score={result.score} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function AskModeV4() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section
      ref={sectionRef}
      className="relative py-32 px-6 overflow-hidden"
      style={{
        backgroundColor: "#0C0E10",
        borderTop: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      {/* Blueprint grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.014) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.014) 1px, transparent 1px)
          `,
          backgroundSize: "72px 72px",
        }}
      />

      <FileNodesBg density={0.2} opacity={0.12} color="#7C3AED" speed={0.45} />

      <div className="relative z-10 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: description */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <p className="font-mono text-[10px] tracking-[0.35em] uppercase mb-5" style={{ color: "rgba(255,255,255,0.2)" }}>
              Pro Feature · Ask Mode
            </p>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Ask, don&apos;t{" "}
              <span
                style={{
                  WebkitTextFillColor: "transparent",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  backgroundImage: "linear-gradient(135deg, #7C3AED 0%, #a855f7 100%)",
                }}
              >
                search.
              </span>
            </h2>
            <p className="font-mono text-sm leading-relaxed mb-10" style={{ color: "rgba(255,255,255,0.38)" }}>
              Ask Mode understands intent. Ask a natural question — Ixos finds the right files.
            </p>

            {/* Feature bullets */}
            <div className="flex flex-col gap-4">
              {[
                "Natural language questions",
                "Intent-aligned file discovery",
                "Context-aware ranking",
                "Local inference, no cloud",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div
                    className="w-1 h-1 shrink-0"
                    style={{ backgroundColor: "#7C3AED" }}
                  />
                  <span className="font-mono text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {feature}
                  </span>
                </div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-10"
            >
              <div
                className="inline-flex items-center gap-2 px-4 py-2 font-mono text-[9px] tracking-[0.25em] uppercase"
                style={{
                  border: "1px solid rgba(124,58,237,0.3)",
                  color: "#7C3AED",
                  backgroundColor: "rgba(124,58,237,0.06)",
                }}
              >
                <span className="w-1 h-1" style={{ backgroundColor: "#7C3AED" }} />
                Available in Pro
              </div>
            </motion.div>
          </motion.div>

          {/* Right: demo */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <AskDemo />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
