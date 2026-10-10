"use client";

// ─── Compute Budget Ternary Map ───────────────────────────────────────────────
// Replaces the inaccurate SPEED/ACCURACY/LOCAL-FIRST triangle.
//
// LOCAL-FIRST is a constant architectural property (always true across all modes),
// not a tradeoff dimension. This component replaces it with COMPUTE COST so the
// three vertices represent the real tradeoffs in retrieval configuration:
//
//   SPEED       — response latency (how fast results appear)
//   ACCURACY    — result quality (MRR@10 / intent alignment)
//   COMPUTE     — resource use (RAM, CPU during search)
//
// Modes plotted with real benchmark values from models/lab/CANONICAL_RESULTS.md:
//   Flash  — MRR@10=0.834, ~339ms/1k candidates, ~44MB RAM
//   Auto   — adaptive routing, 0.834–0.921 MRR@10 depending on query
//   Pro    — MRR@10=0.921, ~431ms/1k candidates, ~102MB RAM
//
// Privacy badge: constant overlay — all modes are local-first, on-device.

import { useState, useCallback, useRef } from "react";
import { motion, useInView, useScroll, useMotionValueEvent } from "framer-motion";

const R = 158;

const VERTICES = {
  speed: { x: 0, y: -R, label: "SPEED", color: "#2DD4BF", desc: "Response latency" },
  accuracy: {
    x: R * Math.sin((2 * Math.PI) / 3),
    y: -R * Math.cos((2 * Math.PI) / 3),
    label: "ACCURACY",
    color: "#7C3AED",
    desc: "Result quality (MRR)",
  },
  compute: {
    x: R * Math.sin((4 * Math.PI) / 3),
    y: -R * Math.cos((4 * Math.PI) / 3),
    label: "COMPUTE",
    color: "#F59E0B",
    desc: "Resource efficiency",
  },
};

type Weights = { speed: number; accuracy: number; compute: number };
type Dominant = "speed" | "accuracy" | "compute" | "balanced";

function clamp(v: number) { return Math.max(0, Math.min(1, v)); }

function barycentric(mx: number, my: number): Weights {
  const { speed: A, accuracy: B, compute: C } = VERTICES;
  const denom = (B.y - C.y) * (A.x - C.x) + (C.x - B.x) * (A.y - C.y);
  if (Math.abs(denom) < 0.001) return { speed: 1/3, accuracy: 1/3, compute: 1/3 };
  let wA = ((B.y - C.y) * (mx - C.x) + (C.x - B.x) * (my - C.y)) / denom;
  let wB = ((C.y - A.y) * (mx - C.x) + (A.x - C.x) * (my - C.y)) / denom;
  let wC = 1 - wA - wB;
  wA = clamp(wA); wB = clamp(wB); wC = clamp(wC);
  const sum = wA + wB + wC || 1;
  return { speed: wA / sum, accuracy: wB / sum, compute: wC / sum };
}

function weightedPoint(w: Weights): { x: number; y: number } {
  const { speed: A, accuracy: B, compute: C } = VERTICES;
  return {
    x: w.speed * A.x + w.accuracy * B.x + w.compute * C.x,
    y: w.speed * A.y + w.accuracy * B.y + w.compute * C.y,
  };
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function lerpWeights(a: Weights, b: Weights, t: number): Weights {
  const raw = {
    speed: lerp(a.speed, b.speed, t),
    accuracy: lerp(a.accuracy, b.accuracy, t),
    compute: lerp(a.compute, b.compute, t),
  };
  const sum = raw.speed + raw.accuracy + raw.compute || 1;
  return { speed: raw.speed / sum, accuracy: raw.accuracy / sum, compute: raw.compute / sum };
}

// Presets: weights derived from benchmark tradeoffs.
// Flash prioritizes speed (low latency), lower accuracy, low compute cost.
// Pro prioritizes accuracy (high MRR), accepts slower latency and more compute.
// Source: models/lab/CANONICAL_RESULTS.md
const PRESETS: { name: string; weights: Weights; tag: string; specs: string[] }[] = [
  {
    name: "Flash",
    weights: { speed: 0.72, accuracy: 0.20, compute: 0.08 },
    tag: "ixos-flash-v2",
    specs: ["MRR@10 0.834", "~339ms / 1k candidates", "~44 MB RAM"],
  },
  {
    name: "Auto",
    weights: { speed: 0.33, accuracy: 0.34, compute: 0.33 },
    tag: "adaptive routing",
    specs: ["MRR@10 0.834–0.921", "route-dependent latency", "dynamic resource use"],
  },
  {
    name: "Pro",
    weights: { speed: 0.10, accuracy: 0.72, compute: 0.18 },
    tag: "ixos-flash-v2 + potion fusion",
    specs: ["MRR@10 0.921", "~431ms / 1k candidates", "~102 MB RAM"],
  },
];

const MODE_INFO: Record<string, { headline: string; body: string; source: string }> = {
  speed: {
    headline: "Flash Mode",
    body: "Lexical-first retrieval with embedding rerank. Near-instant results with minimal compute. Best for large codebases with known terminology.",
    source: "models/lab/CANONICAL_RESULTS.md · ixos-flash-v2",
  },
  accuracy: {
    headline: "Pro Mode",
    body: "Full hybrid scoring: lexical candidates + Flash rerank + Potion semantic fusion. Highest result quality, intent-aligned ordering.",
    source: "models/lab/CANONICAL_RESULTS.md · fusion blend",
  },
  compute: {
    headline: "Efficiency Focus",
    body: "Minimal resource use — Flash-v2 alone at reduced candidate set. Suitable for memory-constrained environments.",
    source: "ixos-flash-v2 with top-N filtering",
  },
  balanced: {
    headline: "Auto",
    body: "Adaptive routing based on query complexity and score confidence. Routes to Local when score gap < 0.05 or lexical ratio < 0.15.",
    source: "ixos_rank/hybrid_engine.rs · routing logic",
  },
};

function getDominant(w: Weights): Dominant {
  const max = Math.max(w.speed, w.accuracy, w.compute);
  if (max < 0.48) return "balanced";
  if (w.speed === max) return "speed";
  if (w.accuracy === max) return "accuracy";
  return "compute";
}

// Find closest preset
function closestPreset(w: Weights): number {
  let best = 0;
  let bestDist = Infinity;
  PRESETS.forEach((p, i) => {
    const d = Math.sqrt(
      Math.pow(w.speed - p.weights.speed, 2) +
      Math.pow(w.accuracy - p.weights.accuracy, 2) +
      Math.pow(w.compute - p.weights.compute, 2)
    );
    if (d < bestDist) { bestDist = d; best = i; }
  });
  return best;
}

export function TriadLensV4() {
  const [weights, setWeights] = useState<Weights>(PRESETS[0].weights);
  const [activePreset, setActivePreset] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const dragging = useRef(false);

  const inView = useInView(sectionRef, { once: true, margin: "-80px" });

  // Scroll-driven auto-cycle Flash → Auto → Pro
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 0.85", "end 0.15"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (dragging.current) return;
    let target: Weights;
    if (v < 0.5) {
      target = lerpWeights(PRESETS[0].weights, PRESETS[1].weights, v / 0.5);
    } else {
      target = lerpWeights(PRESETS[1].weights, PRESETS[2].weights, (v - 0.5) / 0.5);
    }
    setWeights(target);
    setActivePreset(closestPreset(target));
  });

  const dominant = getDominant(weights);
  const handlePos = weightedPoint(weights);
  const { headline, body, source } = MODE_INFO[dominant];

  const accentColor =
    dominant === "speed" ? "#2DD4BF" :
    dominant === "accuracy" ? "#7C3AED" :
    dominant === "compute" ? "#F59E0B" :
    "rgba(255,255,255,0.45)";

  const updateFromPointer = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const scale = 400 / rect.width;
    const mx = (e.clientX - cx) * scale;
    const my = (e.clientY - cy) * scale;
    const w = barycentric(mx, my);
    setWeights(w);
    setActivePreset(closestPreset(w));
    dragging.current = true;
  }, []);

  // Fill polygon scaled by weights
  const fillPts = [
    { v: VERTICES.speed, w: weights.speed },
    { v: VERTICES.accuracy, w: weights.accuracy },
    { v: VERTICES.compute, w: weights.compute },
  ]
    .map(({ v, w }) => `${v.x * w * 2.5},${v.y * w * 2.5}`)
    .join(" ");

  const currentPreset = PRESETS[closestPreset(weights)];

  return (
    <section
      ref={sectionRef}
      className="py-32 px-6"
      id="how-it-works"
      style={{ borderTop: "1px solid rgba(255,255,255,0.04)", backgroundColor: "#0C0E10" }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55 }}
          className="text-center mb-20"
        >
          <p className="font-mono text-[10px] tracking-[0.3em] uppercase mb-4" style={{ color: "rgba(255,255,255,0.22)" }}>
            Compute Budget
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
            Three tradeoffs. Your call.
          </h2>
          <p className="font-mono text-sm max-w-lg mx-auto leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>
            Drag the handle to explore the tradeoff space between speed, accuracy, and compute cost.
            Privacy is always constant — every mode runs on-device.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start"
        >
          {/* ── Ternary dial ── */}
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
              {/* Outer ring */}
              <circle cx="0" cy="0" r="185" fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="0.5" />

              {/* Inner grid triangles at 33% / 66% */}
              {[0.33, 0.66].map((scale) => (
                <polygon
                  key={scale}
                  points={[VERTICES.speed, VERTICES.accuracy, VERTICES.compute]
                    .map((v) => `${v.x * scale},${v.y * scale}`)
                    .join(" ")}
                  fill="none"
                  stroke="rgba(255,255,255,0.045)"
                  strokeWidth="0.4"
                  strokeDasharray="3 7"
                />
              ))}

              {/* Outer triangle */}
              <polygon
                points={[VERTICES.speed, VERTICES.accuracy, VERTICES.compute]
                  .map((v) => `${v.x},${v.y}`)
                  .join(" ")}
                fill="rgba(255,255,255,0.010)"
                stroke="rgba(255,255,255,0.07)"
                strokeWidth="0.5"
              />

              {/* Radial axes */}
              {Object.values(VERTICES).map((v, i) => (
                <line key={i} x1="0" y1="0" x2={v.x} y2={v.y} stroke="rgba(255,255,255,0.045)" strokeWidth="0.4" />
              ))}

              {/* Preset position markers (Flash, Auto, Pro) */}
              {PRESETS.map((p, i) => {
                const pos = weightedPoint(p.weights);
                const isActive = i === activePreset;
                return (
                  <g key={p.name}>
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={isActive ? 5.5 : 3.5}
                      fill={isActive ? accentColor : "rgba(255,255,255,0.15)"}
                      style={{ transition: "all 0.3s ease" }}
                    />
                    <text
                      x={pos.x + (pos.x > 0 ? 10 : pos.x < 0 ? -10 : 0)}
                      y={pos.y + (pos.y > 0 ? 12 : -8)}
                      textAnchor={pos.x > 10 ? "start" : pos.x < -10 ? "end" : "middle"}
                      fill={isActive ? accentColor : "rgba(255,255,255,0.25)"}
                      fontSize="6.5"
                      fontFamily="monospace"
                      letterSpacing="1.5"
                      style={{ transition: "fill 0.3s ease" }}
                    >
                      {p.name}
                    </text>
                  </g>
                );
              })}

              {/* Filled weight area */}
              <polygon
                points={fillPts}
                fill={`${accentColor}12`}
                stroke={accentColor}
                strokeWidth="0.8"
                strokeOpacity="0.5"
              />

              {/* Vertex dots + labels */}
              {Object.entries(VERTICES).map(([key, v]) => {
                const labelY = v.y > 0 ? v.y + 21 : v.y - 14;
                return (
                  <g key={key}>
                    <circle cx={v.x} cy={v.y} r="4" fill="rgba(12,14,16,0.9)" stroke={v.color} strokeWidth="1" />
                    <text
                      x={v.x}
                      y={labelY}
                      textAnchor="middle"
                      fill={v.color}
                      fontSize="7"
                      fontFamily="monospace"
                      letterSpacing="2"
                      opacity="0.7"
                    >
                      {v.label}
                    </text>
                    <text
                      x={v.x}
                      y={labelY + 11}
                      textAnchor="middle"
                      fill={v.color}
                      fontSize="5"
                      fontFamily="monospace"
                      opacity="0.4"
                    >
                      {v.desc}
                    </text>
                  </g>
                );
              })}

              {/* Draggable handle */}
              <circle cx={handlePos.x} cy={handlePos.y} r="9" fill={accentColor} opacity="0.9" />
              <circle cx={handlePos.x} cy={handlePos.y} r="16" fill="none" stroke={accentColor} strokeWidth="0.5" opacity="0.3" />
            </svg>

            {/* Preset buttons */}
            <div className="flex gap-2">
              {PRESETS.map((p, i) => (
                <button
                  key={p.name}
                  onClick={() => {
                    setWeights(p.weights);
                    setActivePreset(i);
                    dragging.current = false;
                  }}
                  className="font-mono text-[10px] px-4 py-2 tracking-[0.2em] uppercase transition-all duration-200"
                  style={{
                    border: `1px solid ${i === activePreset ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.09)"}`,
                    color: i === activePreset ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.32)",
                    backgroundColor: i === activePreset ? "rgba(255,255,255,0.04)" : "transparent",
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>

            {/* Constant privacy badge */}
            <div
              className="flex items-center gap-2 px-4 py-2 font-mono text-[9px] tracking-[0.2em] uppercase"
              style={{
                border: "1px solid rgba(45,212,191,0.2)",
                color: "#2DD4BF",
                backgroundColor: "rgba(45,212,191,0.04)",
              }}
            >
              <div className="w-1.5 h-1.5" style={{ backgroundColor: "#2DD4BF" }} />
              Local-first always · all modes on-device · no egress
            </div>
          </div>

          {/* ── Right panel ── */}
          <div className="flex flex-col gap-10 pt-4">
            {/* Mode description */}
            <motion.div key={dominant} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
              <div className="font-mono text-[10px] tracking-[0.3em] uppercase mb-3" style={{ color: accentColor }}>
                {dominant === "balanced" ? "auto" : dominant} mode active
              </div>
              <h3 className="font-display text-3xl font-bold text-white mb-4">{headline}</h3>
              <p className="font-mono text-sm leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.38)" }}>
                {body}
              </p>
              <p className="font-mono text-[9px] tracking-[0.12em]" style={{ color: "rgba(255,255,255,0.18)" }}>
                Source: {source}
              </p>
            </motion.div>

            {/* Current preset specs */}
            <motion.div
              key={currentPreset.name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="p-5"
              style={{ border: `1px solid ${accentColor}20`, backgroundColor: `${accentColor}06` }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5" style={{ backgroundColor: accentColor }} />
                <span className="font-mono text-[9px] tracking-[0.25em] uppercase" style={{ color: accentColor }}>
                  {currentPreset.tag}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {currentPreset.specs.map((spec) => (
                  <div key={spec} className="flex items-center gap-2">
                    <div className="w-px h-3" style={{ backgroundColor: accentColor, opacity: 0.4 }} />
                    <span className="font-mono text-[11px]" style={{ color: "rgba(255,255,255,0.52)" }}>{spec}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Weight bars */}
            <div className="flex flex-col gap-5">
              {(
                [
                  { key: "speed", label: "Speed", w: weights.speed, color: "#2DD4BF" },
                  { key: "accuracy", label: "Accuracy", w: weights.accuracy, color: "#7C3AED" },
                  { key: "compute", label: "Compute", w: weights.compute, color: "#F59E0B" },
                ] as const
              ).map((item) => (
                <div key={item.key} className="flex items-center gap-4">
                  <span className="font-mono text-[9px] tracking-[0.2em] uppercase w-20 shrink-0" style={{ color: "rgba(255,255,255,0.28)" }}>
                    {item.label}
                  </span>
                  <div className="flex-1 h-px relative" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
                    <motion.div
                      className="absolute inset-y-0 left-0"
                      style={{ backgroundColor: item.color }}
                      animate={{ width: `${item.w * 100}%` }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                    />
                  </div>
                  <span className="font-mono text-[10px] w-8 text-right tabular-nums" style={{ color: item.color }}>
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
