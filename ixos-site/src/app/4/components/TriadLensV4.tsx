"use client";

import { useState, useCallback, useRef } from "react";
import { motion, useInView, useScroll, useMotionValueEvent } from "framer-motion";

// ─── Triangle geometry constants ──────────────────────────────────────────────
const R = 160; // circumradius
const VERTICES = {
  speed: { x: 0, y: -R, label: "SPEED", color: "#2DD4BF" },
  accuracy: { x: R * Math.sin((2 * Math.PI) / 3), y: -R * Math.cos((2 * Math.PI) / 3), label: "ACCURACY", color: "#7C3AED" },
  local: { x: R * Math.sin((4 * Math.PI) / 3), y: -R * Math.cos((4 * Math.PI) / 3), label: "LOCAL-FIRST", color: "#F59E0B" },
};

type Weights = { speed: number; accuracy: number; local: number };

function clamp(v: number) {
  return Math.max(0, Math.min(1, v));
}

function barycentric(mx: number, my: number): Weights {
  const { speed: A, accuracy: B, local: C } = VERTICES;
  const denom = (B.y - C.y) * (A.x - C.x) + (C.x - B.x) * (A.y - C.y);
  if (Math.abs(denom) < 0.001) return { speed: 1 / 3, accuracy: 1 / 3, local: 1 / 3 };

  let wA = ((B.y - C.y) * (mx - C.x) + (C.x - B.x) * (my - C.y)) / denom;
  let wB = ((C.y - A.y) * (mx - C.x) + (A.x - C.x) * (my - C.y)) / denom;
  let wC = 1 - wA - wB;

  wA = clamp(wA);
  wB = clamp(wB);
  wC = clamp(wC);
  const sum = wA + wB + wC || 1;
  return { speed: wA / sum, accuracy: wB / sum, local: wC / sum };
}

function weightedPoint(w: Weights): { x: number; y: number } {
  const { speed: A, accuracy: B, local: C } = VERTICES;
  return {
    x: w.speed * A.x + w.accuracy * B.x + w.local * C.x,
    y: w.speed * A.y + w.accuracy * B.y + w.local * C.y,
  };
}

// ─── Presets ──────────────────────────────────────────────────────────────────
const PRESETS: { name: string; weights: Weights }[] = [
  { name: "Flash", weights: { speed: 0.72, accuracy: 0.2, local: 0.08 } },
  { name: "Auto", weights: { speed: 0.33, accuracy: 0.34, local: 0.33 } },
  { name: "Pro", weights: { speed: 0.1, accuracy: 0.72, local: 0.18 } },
];

// ─── Mode info ────────────────────────────────────────────────────────────────
const MODES: Record<string, { headline: string; body: string }> = {
  speed: {
    headline: "Flash Mode",
    body: "Lexical-first retrieval. Near-instant results, minimal compute. Best for large codebases with known terminology.",
  },
  accuracy: {
    headline: "Pro Mode",
    body: "Full hybrid scoring: lexical candidates + semantic rerank. Best result quality, intent-aligned ordering.",
  },
  local: {
    headline: "Privacy-first",
    body: "On-device only. No egress. Your files, queries, and results stay entirely on your machine.",
  },
  balanced: {
    headline: "Auto",
    body: "Adaptive retrieval balances speed and accuracy based on query length, complexity, and available context.",
  },
};

function getDominant(w: Weights): "speed" | "accuracy" | "local" | "balanced" {
  const max = Math.max(w.speed, w.accuracy, w.local);
  if (max < 0.48) return "balanced";
  if (w.speed === max) return "speed";
  if (w.accuracy === max) return "accuracy";
  return "local";
}

// ─── Smooth weight lerp ───────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function lerpWeights(a: Weights, b: Weights, t: number): Weights {
  const raw = {
    speed: lerp(a.speed, b.speed, t),
    accuracy: lerp(a.accuracy, b.accuracy, t),
    local: lerp(a.local, b.local, t),
  };
  const sum = raw.speed + raw.accuracy + raw.local;
  return { speed: raw.speed / sum, accuracy: raw.accuracy / sum, local: raw.local / sum };
}

// ─── Component ────────────────────────────────────────────────────────────────
export function TriadLensV4() {
  const [weights, setWeights] = useState<Weights>({ speed: 0.72, accuracy: 0.2, local: 0.08 }); // start at Flash
  const svgRef = useRef<SVGSVGElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const dragging = useRef(false);

  // Scroll-driven auto-cycle: Flash → Auto → Pro as section scrolls through viewport
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 0.85", "end 0.15"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (dragging.current) return;
    // Map scroll 0→0.5→1 smoothly Flash→Auto→Pro
    if (v < 0.5) {
      setWeights(lerpWeights(PRESETS[0].weights, PRESETS[1].weights, v / 0.5));
    } else {
      setWeights(lerpWeights(PRESETS[1].weights, PRESETS[2].weights, (v - 0.5) / 0.5));
    }
  });

  const dominant = getDominant(weights);
  const handlePos = weightedPoint(weights);
  const { headline, body } = MODES[dominant];

  const accentColor =
    dominant === "speed"
      ? "#2DD4BF"
      : dominant === "accuracy"
      ? "#7C3AED"
      : dominant === "local"
      ? "#F59E0B"
      : "rgba(255,255,255,0.45)";

  const updateFromPointer = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const scale = 400 / rect.width; // viewBox is 400x400, centred at 200,200
    const mx = (e.clientX - cx) * scale;
    const my = (e.clientY - cy) * scale;
    setWeights(barycentric(mx, my));
  }, []);

  // Build fill polygon scaled by weights
  const fillPts = [
    { v: VERTICES.speed, w: weights.speed },
    { v: VERTICES.accuracy, w: weights.accuracy },
    { v: VERTICES.local, w: weights.local },
  ]
    .map(({ v, w }) => `${v.x * w * 2.5},${v.y * w * 2.5}`)
    .join(" ");

  // Entrance animation trigger
  const inView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section
      ref={sectionRef}
      className="py-32 px-6"
      id="how-it-works"
      style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55 }}
          className="text-center mb-20"
        >
          <p
            className="font-mono text-[10px] tracking-[0.3em] uppercase mb-4"
            style={{ color: "rgba(255,255,255,0.22)" }}
          >
            Retrieval Architecture
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
            Three forces. One search.
          </h2>
          <p
            className="font-mono text-sm max-w-lg mx-auto leading-relaxed"
            style={{ color: "rgba(255,255,255,0.38)" }}
          >
            Drag the lens to explore the tradeoff space. Speed, accuracy, and
            local-first posture — always in balance.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
        >
          {/* ── Triad dial ── */}
          <div className="flex flex-col items-center gap-6">
            <svg
              ref={svgRef}
              viewBox="-200 -200 400 400"
              width="380"
              height="380"
              className="cursor-grab active:cursor-grabbing touch-none select-none max-w-full"
              onPointerDown={(e) => {
                dragging.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
                updateFromPointer(e);
              }}
              onPointerMove={updateFromPointer}
              onPointerUp={() => { dragging.current = false; }}
              onPointerCancel={() => { dragging.current = false; }}
            >
              {/* Outer reference ring */}
              <circle cx="0" cy="0" r="185" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />

              {/* Grid at 33% / 66% */}
              {[0.33, 0.66].map((scale) => (
                <polygon
                  key={scale}
                  points={[VERTICES.speed, VERTICES.accuracy, VERTICES.local]
                    .map((v) => `${v.x * scale},${v.y * scale}`)
                    .join(" ")}
                  fill="none"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="0.4"
                  strokeDasharray="3 6"
                />
              ))}

              {/* Outer triangle */}
              <polygon
                points={[VERTICES.speed, VERTICES.accuracy, VERTICES.local]
                  .map((v) => `${v.x},${v.y}`)
                  .join(" ")}
                fill="rgba(255,255,255,0.012)"
                stroke="rgba(255,255,255,0.07)"
                strokeWidth="0.5"
              />

              {/* Radial axes */}
              {Object.values(VERTICES).map((v, i) => (
                <line
                  key={i}
                  x1="0"
                  y1="0"
                  x2={v.x}
                  y2={v.y}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="0.4"
                />
              ))}

              {/* Weight area */}
              <polygon
                points={fillPts}
                fill={`${accentColor}14`}
                stroke={accentColor}
                strokeWidth="0.8"
                strokeOpacity="0.45"
              />

              {/* Vertex dots + labels */}
              {Object.entries(VERTICES).map(([key, v]) => {
                const labelY = v.y > 0 ? v.y + 20 : v.y - 14;
                return (
                  <g key={key}>
                    <circle cx={v.x} cy={v.y} r="4.5" fill="rgba(12,14,16,0.9)" stroke={v.color} strokeWidth="1" />
                    <text
                      x={v.x}
                      y={labelY}
                      textAnchor="middle"
                      fill={v.color}
                      fontSize="7.5"
                      fontFamily="monospace"
                      letterSpacing="2"
                      opacity="0.75"
                    >
                      {v.label}
                    </text>
                  </g>
                );
              })}

              {/* Draggable handle */}
              <circle
                cx={handlePos.x}
                cy={handlePos.y}
                r="9"
                fill={accentColor}
                opacity="0.9"
              />
              <circle
                cx={handlePos.x}
                cy={handlePos.y}
                r="16"
                fill="none"
                stroke={accentColor}
                strokeWidth="0.5"
                opacity="0.35"
              />
            </svg>

            {/* Preset buttons */}
            <div className="flex gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setWeights(p.weights)}
                  className="font-mono text-[10px] px-4 py-2 tracking-[0.2em] uppercase transition-all duration-200"
                  style={{
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.38)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.65)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.38)";
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* ── Right panel: mode description + bars ── */}
          <div className="flex flex-col gap-10">
            <motion.div
              key={dominant}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28 }}
            >
              <div
                className="font-mono text-[10px] tracking-[0.3em] uppercase mb-3"
                style={{ color: accentColor }}
              >
                {dominant === "balanced" ? "auto" : dominant} mode active
              </div>
              <h3 className="font-display text-3xl font-bold text-white mb-4">{headline}</h3>
              <p className="font-mono text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>
                {body}
              </p>
            </motion.div>

            {/* Weight bars */}
            <div className="flex flex-col gap-5">
              {(
                [
                  { key: "speed", label: "Speed", w: weights.speed, color: "#2DD4BF" },
                  { key: "accuracy", label: "Accuracy", w: weights.accuracy, color: "#7C3AED" },
                  { key: "local", label: "Local-first", w: weights.local, color: "#F59E0B" },
                ] as const
              ).map((item) => (
                <div key={item.key} className="flex items-center gap-4">
                  <span
                    className="font-mono text-[9px] tracking-[0.2em] uppercase w-20 shrink-0"
                    style={{ color: "rgba(255,255,255,0.28)" }}
                  >
                    {item.label}
                  </span>
                  <div
                    className="flex-1 h-px relative"
                    style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                  >
                    <motion.div
                      className="absolute inset-y-0 left-0"
                      style={{ backgroundColor: item.color }}
                      animate={{ width: `${item.w * 100}%` }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                    />
                  </div>
                  <span
                    className="font-mono text-[10px] w-8 text-right tabular-nums"
                    style={{ color: item.color }}
                  >
                    {Math.round(item.w * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
