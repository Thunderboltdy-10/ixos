"use client";

import { useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";
import { FileNodesBg } from "./FileNodesBg";

// ─── Data ─────────────────────────────────────────────────────────────────────
const STAGES = [
  {
    num: "01",
    id: "filesystem",
    label: "Filesystem",
    headline: "Your files load in parallel.",
    desc: "Rayon sweeps your filesystem JIT — no daemon, no index, no background process. Files are never stored remotely.",
    accentColor: "#F59E0B",
    nodeColor: "#F59E0B",
    tech: [
      { k: "Parallelism", v: "rayon threadpool" },
      { k: "Strategy", v: "JIT — no index" },
      { k: "Load time", v: "~7ms / 1000 files" },
    ],
  },
  {
    num: "02",
    id: "lexical",
    label: "Lexical Engine",
    headline: "Keyword candidates in <10ms.",
    desc: "BM25-style scoring surfaces coarse candidates instantly. Fast, deterministic, fully parallelized across CPU cores.",
    accentColor: "#2DD4BF",
    nodeColor: "#2DD4BF",
    tech: [
      { k: "Algorithm", v: "BM25 variant" },
      { k: "Candidates", v: "top-N filtered" },
      { k: "Latency", v: "<10ms" },
    ],
  },
  {
    num: "03",
    id: "semantic",
    label: "Semantic Engine",
    headline: "Meaning reshapes the order.",
    desc: "Model2Vec embeddings rerank the candidate set by intent similarity. The right file rises — even if it never used your exact words.",
    accentColor: "#7C3AED",
    nodeColor: "#7C3AED",
    tech: [
      { k: "Model", v: "Model2Vec (local)" },
      { k: "Dimensions", v: "256" },
      { k: "Scoring", v: "cosine similarity" },
    ],
  },
  {
    num: "04",
    id: "result",
    label: "Result",
    headline: "Progressive, deterministic output.",
    desc: "Hybrid scores converge. Results stream progressively as confidence increases. Every query is isolated. Private.",
    accentColor: "#2DD4BF",
    nodeColor: "#2DD4BF",
    tech: [
      { k: "Scoring", v: "hybrid weighted" },
      { k: "Privacy", v: "on-device only" },
      { k: "Output", v: "progressive" },
    ],
  },
] as const;

type StageId = 0 | 1 | 2 | 3;

// ─── Visualizations ────────────────────────────────────────────────────────────

// Stage 0: File grid appearing
function FilesystemViz({ active }: { active: boolean }) {
  const FILES = [
    "auth.ts", "session.ts", "tokens.ts", "db.ts", "api.ts", "utils.ts",
    "errors.ts", "types.ts", "config.ts", "pool.ts", "routes.ts", "hooks.ts",
    "README.md", "schema.ts", "seed.ts", "test.ts", "env.ts", "proxy.ts",
  ];
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="flex gap-2">
          {FILES.slice(row * 4, row * 4 + 4 + (row === 3 ? 2 : 0)).map((name, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={active ? { opacity: 0.85, scale: 1 } : { opacity: 0, scale: 0.6 }}
              transition={{ delay: (row * 4 + i) * 0.035, duration: 0.28, ease: "easeOut" }}
              className="flex flex-col items-center gap-1.5"
            >
              <div
                className="flex items-end justify-center"
                style={{
                  width: 28, height: 36,
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.25)",
                }}
              >
                <div style={{ width: "60%", height: 3, backgroundColor: "rgba(245,158,11,0.4)", marginBottom: 4 }} />
              </div>
              <span className="font-mono text-[7px] text-center" style={{ color: "rgba(255,255,255,0.3)", width: 32, overflow: "hidden" }}>
                {name.split(".")[0]}
              </span>
            </motion.div>
          ))}
        </div>
      ))}
      {/* Parallelism indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={active ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 0.7, duration: 0.4 }}
        className="mt-4 flex items-center gap-2"
      >
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <motion.div
            key={i}
            className="h-1 flex-1"
            animate={active ? { scaleX: [0, 1, 0], opacity: [0, 0.8, 0] } : {}}
            transition={{ delay: i * 0.08, duration: 0.8, repeat: Infinity, repeatDelay: 0.4 }}
            style={{ backgroundColor: "#F59E0B", transformOrigin: "left" }}
          />
        ))}
        <span className="font-mono text-[9px] whitespace-nowrap ml-2" style={{ color: "rgba(245,158,11,0.6)" }}>8 cores</span>
      </motion.div>
    </div>
  );
}

// Stage 1: Keyword highlight on file cards
const LEX_FILES = [
  { name: "api/session.ts", text: "auth session token refresh handler middleware", highlight: [0, 2, 3, 4] },
  { name: "middleware/jwt.ts", text: "jwt token verify decode refresh expire", highlight: [1, 2, 4] },
  { name: "lib/tokens.ts", text: "token generate sign refresh jwt expiry", highlight: [0, 2, 4] },
  { name: "hooks/useAuth.ts", text: "auth hook login session token state", highlight: [0, 2, 4] },
];

function LexicalViz({ active }: { active: boolean }) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {LEX_FILES.map((file, fi) => (
        <motion.div
          key={file.name}
          initial={{ opacity: 0, x: -16 }}
          animate={active ? { opacity: 1, x: 0 } : { opacity: 0, x: -16 }}
          transition={{ delay: fi * 0.12, duration: 0.35 }}
          className="p-3"
          style={{ border: "1px solid rgba(255,255,255,0.06)", backgroundColor: "rgba(255,255,255,0.01)" }}
        >
          <div className="font-mono text-[9px] mb-2" style={{ color: "#2DD4BF" }}>{file.name}</div>
          <div className="flex flex-wrap gap-1.5">
            {file.text.split(" ").map((word, wi) => (
              <motion.span
                key={wi}
                className="font-mono text-[9px] px-1 py-0.5"
                animate={active && file.highlight.includes(wi)
                  ? { backgroundColor: "rgba(45,212,191,0.18)", color: "#2DD4BF" }
                  : { backgroundColor: "transparent", color: "rgba(255,255,255,0.25)" }
                }
                transition={{ delay: fi * 0.12 + 0.35 + wi * 0.03, duration: 0.25 }}
              >
                {word}
              </motion.span>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Stage 2: Semantic reorder
const SEM_ITEMS_A = [
  { name: "api/session.ts", lex: 65, sem: 97 },
  { name: "middleware/jwt.ts", lex: 78, sem: 94 },
  { name: "hooks/useAuth.ts", lex: 88, sem: 74 },
  { name: "lib/tokens.ts", lex: 72, sem: 91 },
];
const SEM_ITEMS_B = [
  { name: "api/session.ts", lex: 65, sem: 97 },
  { name: "middleware/jwt.ts", lex: 78, sem: 94 },
  { name: "lib/tokens.ts", lex: 72, sem: 91 },
  { name: "hooks/useAuth.ts", lex: 88, sem: 74 },
];

function SemanticViz({ active }: { active: boolean }) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Header */}
      <div className="flex items-center gap-4 pb-2 mb-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="font-mono text-[8px] tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>File</span>
        <div className="flex-1" />
        <span className="font-mono text-[8px] tracking-widest uppercase w-16 text-right" style={{ color: "rgba(245,158,11,0.5)" }}>Lex</span>
        <span className="font-mono text-[8px] tracking-widest uppercase w-16 text-right" style={{ color: "#7C3AED" }}>Sem</span>
      </div>
      <AnimatePresence>
        {(active ? SEM_ITEMS_B : SEM_ITEMS_A).map((item, i) => (
          <motion.div
            key={item.name}
            layout
            layoutId={`sem-${item.name}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ layout: { duration: 0.55, ease: [0.16, 1, 0.3, 1] }, opacity: { duration: 0.25 } }}
            className="flex items-center gap-3 py-2"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
          >
            <span className="font-mono text-[10px] flex-1 truncate" style={{ color: "rgba(255,255,255,0.6)" }}>{item.name}</span>
            <div className="flex items-center gap-1 w-16 justify-end">
              <div className="h-px" style={{ width: item.lex * 0.44, backgroundColor: "rgba(245,158,11,0.5)" }} />
              <span className="font-mono text-[9px] tabular-nums" style={{ color: "rgba(245,158,11,0.5)" }}>{item.lex}</span>
            </div>
            <div className="flex items-center gap-1 w-16 justify-end">
              <motion.div
                className="h-px"
                animate={active ? { width: item.sem * 0.44 } : { width: item.lex * 0.44 }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
                style={{ backgroundColor: "#7C3AED" }}
              />
              <span className="font-mono text-[9px] tabular-nums" style={{ color: "#7C3AED" }}>{item.sem}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Stage 3: Final result
const RESULT_FILES = [
  { name: "api/session.ts", score: 0.97 },
  { name: "middleware/jwt.ts", score: 0.94 },
  { name: "lib/tokens.ts", score: 0.91 },
  { name: "hooks/useAuth.ts", score: 0.88 },
];

function ResultViz({ active }: { active: boolean }) {
  return (
    <div className="w-full" style={{ border: "1px solid rgba(45,212,191,0.15)", backgroundColor: "rgba(45,212,191,0.02)" }}>
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <span className="font-mono text-[9px] tracking-[0.25em] uppercase" style={{ color: "rgba(255,255,255,0.25)" }}>
          4 results
        </span>
        <motion.div
          className="flex items-center gap-1.5"
          animate={active ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="w-1 h-1 animate-pulse" style={{ backgroundColor: "#2DD4BF" }} />
          <span className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: "#2DD4BF" }}>READY</span>
        </motion.div>
      </div>
      {RESULT_FILES.map((file, i) => (
        <motion.div
          key={file.name}
          initial={{ opacity: 0, x: -10 }}
          animate={active ? { opacity: 1, x: 0 } : { opacity: 0 }}
          transition={{ delay: i * 0.1, duration: 0.35 }}
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
        >
          <span className="font-mono text-[10px] w-4 text-right" style={{ color: "rgba(255,255,255,0.2)" }}>{i + 1}</span>
          <div className="w-px h-3" style={{ backgroundColor: "rgba(255,255,255,0.06)" }} />
          <span className="font-mono text-xs flex-1 truncate" style={{ color: "rgba(255,255,255,0.72)" }}>{file.name}</span>
          <div className="h-px" style={{ width: `${file.score * 52}px`, backgroundColor: "#2DD4BF", opacity: 0.7 }} />
          <span className="font-mono text-[10px] tabular-nums" style={{ color: "#2DD4BF" }}>{file.score.toFixed(2)}</span>
          <div className="w-3 h-3 flex items-center justify-center" style={{ border: "1px solid rgba(45,212,191,0.4)" }}>
            <div style={{ width: 4, height: 4, backgroundColor: "#2DD4BF" }} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

const VIZUALIZATIONS = [FilesystemViz, LexicalViz, SemanticViz, ResultViz];

// ─── Stage description left panel ────────────────────────────────────────────
function StageDesc({ idx }: { idx: StageId }) {
  const s = STAGES[idx];
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={idx}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.38 }}
        className="flex flex-col justify-center"
      >
        <div className="flex items-center gap-3 mb-6">
          <span className="font-mono text-[10px] tracking-[0.3em] uppercase" style={{ color: s.accentColor }}>
            {s.num} / {s.label}
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.05)" }} />
        </div>

        <h3
          className="font-display font-bold text-white leading-tight mb-4"
          style={{ fontSize: "clamp(1.6rem, 2.8vw, 2.5rem)" }}
        >
          {s.headline}
        </h3>
        <p className="font-mono text-sm leading-relaxed mb-8 max-w-sm" style={{ color: "rgba(255,255,255,0.38)" }}>
          {s.desc}
        </p>

        {/* Tech specs */}
        <div className="flex flex-col gap-3 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {s.tech.map((t) => (
            <div key={t.k} className="flex items-center justify-between max-w-xs">
              <span className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.22)" }}>
                {t.k}
              </span>
              <span className="font-mono text-[10px]" style={{ color: s.accentColor }}>
                {t.v}
              </span>
            </div>
          ))}
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-2 mt-8">
          {STAGES.map((_, i) => (
            <div
              key={i}
              className="h-px transition-all duration-500"
              style={{
                width: i === idx ? "28px" : "10px",
                backgroundColor: i === idx ? s.accentColor : i < idx ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)",
              }}
            />
          ))}
          <span className="font-mono text-[9px] ml-2" style={{ color: "rgba(255,255,255,0.18)" }}>
            {idx + 1} of 4
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function PipelineV4() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState<StageId>(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (v < 0.25) setActiveIdx(0);
    else if (v < 0.5) setActiveIdx(1);
    else if (v < 0.75) setActiveIdx(2);
    else setActiveIdx(3);
  });

  const Viz = VIZUALIZATIONS[activeIdx];
  const accent = STAGES[activeIdx].accentColor;

  return (
    <section
      id="pipeline"
      style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
    >
      <div ref={containerRef} style={{ height: "450vh" }}>
        <div
          className="sticky top-0 flex flex-col"
          style={{ height: "100vh", backgroundColor: "#0C0E10" }}
        >
          {/* Background */}
          <FileNodesBg density={0.22} opacity={0.12} color={accent} speed={0.4} />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.016) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.016) 1px, transparent 1px)`,
              backgroundSize: "72px 72px",
            }}
          />

          {/* Section header */}
          <div className="pt-10 pb-4 flex flex-col items-center shrink-0">
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase mb-2" style={{ color: "rgba(255,255,255,0.2)" }}>
              Architecture · Retrieval Pipeline
            </p>
            <div className="w-12 h-px" style={{ backgroundColor: "rgba(255,255,255,0.07)" }} />
          </div>

          {/* Section title */}
          <div className="px-6 pb-4 max-w-6xl mx-auto w-full shrink-0">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white">The search pipeline.</h2>
          </div>

          {/* Stage navigator — top mini bar */}
          <div className="px-6 pb-6 max-w-6xl mx-auto w-full shrink-0">
            <div className="flex items-center gap-1">
              {STAGES.map((s, i) => (
                <div key={s.id} className="flex items-center gap-1 flex-1">
                  <motion.div
                    className="h-px flex-1"
                    animate={{ backgroundColor: i <= activeIdx ? s.accentColor : "rgba(255,255,255,0.06)" }}
                    transition={{ duration: 0.4 }}
                  />
                  <motion.div
                    className="w-1.5 h-1.5 shrink-0"
                    animate={{
                      backgroundColor: i <= activeIdx ? s.accentColor : "rgba(255,255,255,0.1)",
                      boxShadow: i === activeIdx ? `0 0 6px ${s.accentColor}` : "none",
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1.5">
              {STAGES.map((s, i) => (
                <span
                  key={s.id}
                  className="font-mono text-[8px] tracking-widest uppercase transition-colors duration-300"
                  style={{ color: i === activeIdx ? s.accentColor : "rgba(255,255,255,0.15)" }}
                >
                  {s.label}
                </span>
              ))}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex items-center overflow-hidden">
            <div className="max-w-6xl mx-auto px-6 w-full">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <StageDesc idx={activeIdx} />
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeIdx}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ duration: 0.4 }}
                  >
                    <Viz active={true} />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Scroll hint */}
          {activeIdx === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute bottom-7 right-8 flex items-center gap-2 pointer-events-none"
            >
              <div className="w-8 h-px" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
              <span className="font-mono text-[9px] tracking-[0.25em] uppercase" style={{ color: "rgba(255,255,255,0.18)" }}>
                Scroll to advance
              </span>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
