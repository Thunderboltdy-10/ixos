"use client";

// ─── V4BenchmarkSection ───────────────────────────────────────────────────────
// Real benchmark numbers only. Source: models/lab/CANONICAL_RESULTS.md (2026-02-03)
// Flash v2: MRR@10=0.8340, Recall@10=0.925, 339ms/1k, 74.85ms load, 44.46MB
// Pro v2 (fusion): MRR@10=0.9209, Recall@10=0.97, ~431ms/1k, ~355ms load, ~102MB
// File loading: ~7ms / 1000 files (CLAUDE.md, rayon parallel, src/lib.rs)

import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";

function useCountUp(target: number, duration: number, active: boolean, decimals = 0) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    startRef.current = null;
    function tick(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(parseFloat((eased * target).toFixed(decimals)));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, target, duration, decimals]);

  return value;
}

// ─── Sparkline bar ───────────────────────────────────────────────────────────
function Sparkline({ pct, color, active }: { pct: number; color: string; active: boolean }) {
  return (
    <div className="relative h-px w-full" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
      <motion.div
        className="absolute inset-y-0 left-0"
        initial={{ width: "0%" }}
        animate={active ? { width: `${pct * 100}%` } : { width: "0%" }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        style={{ backgroundColor: color, height: 2, top: "-0.5px" }}
      />
    </div>
  );
}

// ─── Model card ──────────────────────────────────────────────────────────────
interface ModelCardProps {
  name: string;
  tag: string;
  color: string;
  mrr: number;
  recall: number;
  latency: number;
  loadTime: number;
  ramMB: number;
  delay: number;
  active: boolean;
}

function ModelCard({ name, tag, color, mrr, recall, latency, loadTime, ramMB, delay, active }: ModelCardProps) {
  const mrrVal = useCountUp(mrr, 1100, active, 4);
  const recallVal = useCountUp(recall, 1000, active, 3);
  const latencyVal = useCountUp(latency, 900, active, 0);
  const loadVal = useCountUp(loadTime, 800, active, 2);
  const ramVal = useCountUp(ramMB, 1000, active, 2);

  const specs = [
    { label: "MRR@10", value: mrrVal.toFixed(4), bar: mrr / 1.0, note: "mean reciprocal rank" },
    { label: "Recall@10", value: recallVal.toFixed(3), bar: recall / 1.0, note: "retrieval recall" },
    { label: "Latency / 1k", value: `${latencyVal}ms`, bar: 1 - latency / 500, note: "candidate scoring" },
    { label: "Load time", value: `${loadVal.toFixed(2)}ms`, bar: 1 - loadTime / 400, note: "model cold start" },
    { label: "RAM", value: `${ramVal.toFixed(2)} MB`, bar: 1 - ramMB / 120, note: "peak memory use" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={active ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col p-7"
      style={{
        border: `1px solid ${color}22`,
        backgroundColor: `${color}05`,
        position: "relative",
      }}
    >
      {/* Corner accent */}
      <div
        className="absolute top-0 left-0 w-10 h-10 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at top left, ${color}22, transparent 70%)`,
        }}
      />

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="font-mono text-[9px] tracking-[0.3em] uppercase mb-1.5" style={{ color }}>
            {tag}
          </div>
          <h3 className="font-display text-2xl font-bold text-white">{name}</h3>
        </div>
        <div
          className="w-2 h-2 shrink-0 mt-1.5 animate-pulse"
          style={{ backgroundColor: color }}
        />
      </div>

      <div className="flex flex-col gap-5">
        {specs.map((spec, i) => (
          <div key={spec.label}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.28)" }}>
                  {spec.label}
                </span>
                <span className="font-mono text-[8px]" style={{ color: "rgba(255,255,255,0.15)" }}>
                  {spec.note}
                </span>
              </div>
              <span className="font-mono text-xs tabular-nums" style={{ color }}>
                {spec.value}
              </span>
            </div>
            <Sparkline pct={Math.max(0, Math.min(1, spec.bar))} color={color} active={active} />
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <p className="font-mono text-[8px] tracking-[0.12em]" style={{ color: "rgba(255,255,255,0.15)" }}>
          Source: models/lab/CANONICAL_RESULTS.md · 2026-02-03
        </p>
      </div>
    </motion.div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function V4BenchmarkSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section
      ref={sectionRef}
      className="relative py-32 px-6 overflow-hidden"
      style={{ backgroundColor: "#0C0E10", borderTop: "1px solid rgba(255,255,255,0.04)" }}
    >
      {/* Blueprint grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)
          `,
          backgroundSize: "72px 72px",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55 }}
          className="mb-16"
        >
          <p className="font-mono text-[10px] tracking-[0.35em] uppercase mb-4" style={{ color: "rgba(255,255,255,0.2)" }}>
            Benchmarks · Real Numbers
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
            Measured, not marketed.
          </h2>
          <p className="font-mono text-sm max-w-md" style={{ color: "rgba(255,255,255,0.35)" }}>
            All numbers from the internal benchmark harness against a real-world corpus.
            No cherry-picking, no synthetic workloads.
          </p>
        </motion.div>

        {/* File loading hero stat */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-12 p-6 flex items-center justify-between flex-wrap gap-6"
          style={{ border: "1px solid rgba(255,255,255,0.06)", backgroundColor: "rgba(255,255,255,0.015)" }}
        >
          <div>
            <p className="font-mono text-[9px] tracking-[0.3em] uppercase mb-1" style={{ color: "rgba(255,255,255,0.22)" }}>
              File loading · rayon parallel · 1000 files
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-5xl font-bold text-white" style={{ letterSpacing: "-0.02em" }}>~7</span>
              <span className="font-mono text-2xl" style={{ color: "#2DD4BF" }}>ms</span>
            </div>
          </div>
          <div className="flex items-center gap-3 font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>
            <span>JIT filesystem scan</span>
            <div className="w-px h-4" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
            <span>No daemon</span>
            <div className="w-px h-4" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
            <span>Source: CLAUDE.md</span>
          </div>
        </motion.div>

        {/* Model cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ModelCard
            name="Flash"
            tag="ixos-flash-v2 · int8 · 512d"
            color="#2DD4BF"
            mrr={0.8340}
            recall={0.925}
            latency={339}
            loadTime={74.85}
            ramMB={44.46}
            delay={0.15}
            active={inView}
          />
          <ModelCard
            name="Pro"
            tag="flash-v2 + potion-base-8m · fusion"
            color="#7C3AED"
            mrr={0.9209}
            recall={0.97}
            latency={431}
            loadTime={355}
            ramMB={102}
            delay={0.28}
            active={inView}
          />
        </div>
      </div>
    </section>
  );
}
