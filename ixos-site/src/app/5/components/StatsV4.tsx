"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { FileNodesBg } from "./FileNodesBg";

// ─── useCountUp ───────────────────────────────────────────────────────────────
function useCountUp(target: number, duration: number, active: boolean) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    startRef.current = null;

    function tick(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, target, duration]);

  return value;
}

// ─── Stats data ───────────────────────────────────────────────────────────────
const STATS = [
  {
    value: 7,
    prefix: "",
    suffix: "ms",
    label: "File loading, 1000 files",
    color: "#2DD4BF",
    delay: 0,
  },
  {
    value: 800,
    prefix: "<",
    suffix: "ms",
    label: "Full search, stub model",
    color: "#7C3AED",
    delay: 0.15,
  },
  {
    value: 0.0,
    prefix: "",
    suffix: "%",
    label: "Background CPU",
    color: "#F59E0B",
    delay: 0.3,
    isZero: true,
  },
];

// ─── Measurement tick line ────────────────────────────────────────────────────
function TickRule() {
  return (
    <div className="relative w-full flex items-center" style={{ height: 20 }}>
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px" style={{ backgroundColor: "rgba(255,255,255,0.06)" }} />
      {Array.from({ length: 21 }).map((_, i) => (
        <div
          key={i}
          className="absolute -translate-x-1/2"
          style={{
            left: `${(i / 20) * 100}%`,
            top: "50%",
            transform: "translateX(-50%) translateY(-50%)",
            width: 1,
            height: i % 5 === 0 ? 12 : 6,
            backgroundColor: i % 5 === 0 ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
          }}
        />
      ))}
    </div>
  );
}

// ─── Single stat ──────────────────────────────────────────────────────────────
function StatItem({
  stat,
  inView,
}: {
  stat: typeof STATS[number];
  inView: boolean;
}) {
  const counted = useCountUp(stat.value, 1200, inView);
  const displayValue = stat.isZero ? "0.0" : counted.toString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: stat.delay, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center gap-4"
    >
      {/* Giant number */}
      <div
        className="font-display font-bold tabular-nums leading-none"
        style={{
          fontSize: "clamp(4rem, 10vw, 7rem)",
          color: "white",
          letterSpacing: "-0.02em",
        }}
      >
        <span style={{ color: stat.color, fontSize: "0.55em" }}>{stat.prefix}</span>
        {displayValue}
        <span style={{ color: stat.color, fontSize: "0.45em", marginLeft: "0.1em" }}>{stat.suffix}</span>
      </div>

      {/* Teal accent line */}
      <motion.div
        initial={{ width: 0 }}
        animate={inView ? { width: 48 } : { width: 0 }}
        transition={{ delay: stat.delay + 0.3, duration: 0.5 }}
        style={{ height: 1, backgroundColor: stat.color }}
      />

      {/* Label */}
      <p
        className="font-mono text-[10px] tracking-[0.25em] uppercase text-center"
        style={{ color: "rgba(255,255,255,0.28)" }}
      >
        {stat.label}
      </p>
    </motion.div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function StatsV4() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      className="relative py-28 px-6 overflow-hidden"
      style={{
        backgroundColor: "#0C0E10",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        minHeight: "50vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      {/* Blueprint grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.016) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.016) 1px, transparent 1px)
          `,
          backgroundSize: "72px 72px",
        }}
      />

      {/* File nodes */}
      <FileNodesBg density={0.2} opacity={0.12} color="#2DD4BF" speed={0.4} />

      <div className="relative z-10 max-w-5xl mx-auto w-full">
        {/* Section label */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
          className="font-mono text-[10px] tracking-[0.35em] uppercase text-center mb-14"
          style={{ color: "rgba(255,255,255,0.2)" }}
        >
          Performance Benchmarks · 1000 Files
        </motion.p>

        {/* Top tick rule */}
        <TickRule />

        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 py-16">
          {STATS.map((stat) => (
            <StatItem key={stat.label} stat={stat} inView={inView} />
          ))}
        </div>

        {/* Bottom tick rule */}
        <TickRule />
      </div>
    </section>
  );
}
