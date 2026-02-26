"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { FileNodesBg } from "./FileNodesBg";

// ─── Fake directory tree ──────────────────────────────────────────────────────
const TREE = [
  { depth: 0, name: "~/projects/myapp/", isDir: true, files: 312 },
  { depth: 1, name: "src/", isDir: true, files: 189 },
  { depth: 2, name: "components/", isDir: true, files: 47 },
  { depth: 2, name: "lib/", isDir: true, files: 31 },
  { depth: 2, name: "api/", isDir: true, files: 19 },
  { depth: 2, name: "hooks/", isDir: true, files: 12 },
  { depth: 2, name: "utils/", isDir: true, files: 8 },
  { depth: 1, name: "tests/", isDir: true, files: 44 },
  { depth: 2, name: "unit/", isDir: true, files: 28 },
  { depth: 2, name: "e2e/", isDir: true, files: 16 },
  { depth: 1, name: "docs/", isDir: true, files: 23 },
  { depth: 1, name: "config/", isDir: true, files: 8 },
  { depth: 1, name: "scripts/", isDir: true, files: 5 },
  { depth: 0, name: "package.json", isDir: false, files: 0 },
  { depth: 0, name: "tsconfig.json", isDir: false, files: 0 },
  { depth: 0, name: "README.md", isDir: false, files: 0 },
];

const MAX_FILES = 312;
const TOTAL_FILES = TREE.reduce((a, t) => a + t.files, 0);

function getBarColor(depth: number) {
  if (depth === 0) return "#2DD4BF";
  if (depth === 1) return "#7C3AED";
  return "#F59E0B";
}

// ─── Count-up hook — autoplay when active ────────────────────────────────────
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
      const eased = 1 - Math.pow(1 - progress, 2);
      setValue(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, target, duration]);

  return value;
}

// ─── Component ────────────────────────────────────────────────────────────────
// Phase 3 Rule B: autoplay-on-enter — no scroll-scrub for this section.
// When the section enters the viewport, the tree cascades in automatically
// and the file counter animates up. Much faster and more satisfying than slow manual scrub.
export function FileScanV4() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-100px" });

  // Animate file counter when in view
  const displayCount = useCountUp(TOTAL_FILES, 1600, inView);

  // Progress bar fill delay (CSS animation driven by inView)
  return (
    <section
      ref={sectionRef}
      className="relative py-24 px-6 overflow-hidden"
      style={{ borderTop: "1px solid rgba(255,255,255,0.04)", backgroundColor: "#0C0E10" }}
    >
      {/* Background */}
      <FileNodesBg density={0.18} opacity={0.1} color="#2DD4BF" speed={0.3} />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase mb-1.5" style={{ color: "rgba(255,255,255,0.2)" }}>
              Scanning Filesystem
            </p>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-white">
              No index. No daemon. Just files.
            </h2>
          </motion.div>

          {/* Live counter */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-right"
          >
            <div
              className="font-display font-bold tabular-nums"
              style={{ fontSize: "2rem", color: "#2DD4BF", letterSpacing: "-0.02em" }}
            >
              {displayCount}
            </div>
            <p className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>
              files scanned
            </p>
          </motion.div>
        </div>

        {/* Progress bar — animated on entry */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="relative h-px w-full mb-8"
          style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
        >
          <motion.div
            className="absolute inset-y-0 left-0 h-px"
            initial={{ width: "0%" }}
            animate={inView ? { width: "100%" } : { width: "0%" }}
            transition={{ delay: 0.3, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ backgroundColor: "#2DD4BF" }}
          />
          {/* Scanning pulse dot */}
          <motion.div
            className="absolute top-1/2 -translate-y-1/2"
            initial={{ left: "0%" }}
            animate={inView ? { left: "100%" } : { left: "0%" }}
            transition={{ delay: 0.3, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: 5, height: 5, backgroundColor: "#2DD4BF", borderRadius: "50%", boxShadow: "0 0 8px #2DD4BF", marginLeft: -2.5 }}
          />
        </motion.div>

        {/* Directory tree — cascade in */}
        <div className="font-mono overflow-hidden">
          {TREE.map((node, i) => {
            const barColor = getBarColor(node.depth);
            const barWidth = node.files > 0 ? (node.files / MAX_FILES) * 180 : 0;
            const indent = node.depth * 20;
            const prefix = node.depth === 0 ? "" : node.depth === 1 ? "├── " : "│   └── ";

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -14 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{
                  delay: 0.25 + i * 0.055,
                  duration: 0.35,
                  ease: "easeOut",
                }}
                className="flex items-center gap-4 py-1.5"
              >
                {/* Indent + prefix + name */}
                <div className="flex items-center" style={{ minWidth: 200 + indent }}>
                  <span
                    className="font-mono text-[10px]"
                    style={{ paddingLeft: indent, color: "rgba(255,255,255,0.22)" }}
                  >
                    {prefix}
                  </span>
                  <span
                    className="font-mono text-[11px]"
                    style={{ color: node.isDir ? barColor : "rgba(255,255,255,0.42)" }}
                  >
                    {node.name}
                  </span>
                </div>

                {/* Bar */}
                {node.files > 0 && (
                  <div className="flex items-center gap-3">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={inView ? { width: barWidth } : { width: 0 }}
                      transition={{ delay: 0.4 + i * 0.055, duration: 0.5, ease: "easeOut" }}
                      style={{ height: 3, backgroundColor: barColor, opacity: 0.45 }}
                    />
                    <span
                      className="font-mono text-[9px] tabular-nums"
                      style={{ color: "rgba(255,255,255,0.2)" }}
                    >
                      {node.files} files
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Bottom status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 1.1, duration: 0.5 }}
          className="flex items-center gap-8 mt-8 pt-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
        >
          {[
            { label: "Strategy", value: "JIT — no cache" },
            { label: "Parallelism", value: "rayon" },
            { label: "Telemetry", value: "none" },
          ].map((item) => (
            <div key={item.label} className="flex flex-col gap-0.5">
              <span className="font-mono text-[8px] tracking-[0.25em] uppercase" style={{ color: "rgba(255,255,255,0.15)" }}>
                {item.label}
              </span>
              <span className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                {item.value}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
