"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
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

// Bar width proportional to file count
const MAX_FILES = 312;

function getBarColor(depth: number) {
  if (depth === 0) return "#2DD4BF";
  if (depth === 1) return "#7C3AED";
  return "#F59E0B";
}

// ─── Component ────────────────────────────────────────────────────────────────
export function FileScanV4() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayCount, setDisplayCount] = useState(0);
  const TOTAL_FILES = TREE.reduce((a, t) => a + t.files, 0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // How many tree rows are revealed (0 → TREE.length)
  const revealCount = useTransform(scrollYProgress, [0, 0.85], [0, TREE.length]);

  // Progress bar fill
  const progressWidth = useTransform(scrollYProgress, [0, 0.9], ["0%", "100%"]);

  // Reactive counter
  const filesScannedMV = useTransform(scrollYProgress, [0, 0.9], [0, TOTAL_FILES]);
  useMotionValueEvent(filesScannedMV, "change", (v) => setDisplayCount(Math.round(v)));

  return (
    <section
      style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
    >
      <div ref={containerRef} style={{ height: "280vh" }}>
        <div
          className="sticky top-0 flex flex-col"
          style={{ height: "100vh", backgroundColor: "#0C0E10", overflow: "hidden" }}
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

          <div className="relative z-10 flex flex-col h-full max-w-4xl mx-auto w-full px-6">
            {/* Top section: label + progress */}
            <div className="pt-12 pb-8 shrink-0">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.3em] uppercase mb-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                    Scanning Filesystem
                  </p>
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-white">
                    No index. No daemon. Just files.
                  </h2>
                </div>
                {/* Live files counter */}
                <div className="text-right hidden sm:block">
                  <div
                    className="font-display font-bold tabular-nums"
                    style={{ fontSize: "2rem", color: "#2DD4BF", letterSpacing: "-0.02em" }}
                  >
                    {displayCount}
                  </div>
                  <p className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>
                    files scanned
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative h-px w-full" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                <motion.div
                  className="absolute inset-y-0 left-0 h-px"
                  style={{ width: progressWidth, backgroundColor: "#2DD4BF" }}
                />
                {/* Scanning pulse */}
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2"
                  style={{
                    width: 4,
                    height: 4,
                    backgroundColor: "#2DD4BF",
                    borderRadius: "50%",
                    left: progressWidth,
                    boxShadow: "0 0 8px #2DD4BF",
                  }}
                />
              </div>
            </div>

            {/* Directory tree */}
            <div className="flex-1 overflow-hidden font-mono">
              {TREE.map((node, i) => {
                const barColor = getBarColor(node.depth);
                const barWidth = node.files > 0 ? (node.files / MAX_FILES) * 180 : 0;

                return (
                  <RevealRow
                    key={i}
                    node={node}
                    index={i}
                    revealCount={revealCount}
                    barColor={barColor}
                    barWidth={barWidth}
                  />
                );
              })}
            </div>

            {/* Bottom status */}
            <div
              className="shrink-0 py-4 flex items-center gap-8 text-right"
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
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Individual reveal row ────────────────────────────────────────────────────
function RevealRow({
  node,
  index,
  revealCount,
  barColor,
  barWidth,
}: {
  node: typeof TREE[number];
  index: number;
  revealCount: ReturnType<typeof useTransform>;
  barColor: string;
  barWidth: number;
}) {
  // Row is visible when revealCount > index
  const isVisible = useTransform(revealCount, (v) => v > index);
  const opacity = useTransform(revealCount, [index - 0.5, index + 0.5], [0, 1]);
  const x = useTransform(revealCount, [index - 0.5, index + 0.5], [-12, 0]);

  const indent = node.depth * 20;
  const prefix = node.depth === 0 ? "" : node.depth === 1 ? "├── " : "│   └── ";

  return (
    <motion.div
      style={{ opacity, x }}
      className="flex items-center gap-4 py-1.5"
    >
      {/* Indent + prefix */}
      <div className="flex items-center" style={{ minWidth: 200 + indent }}>
        <span
          className="font-mono text-[10px]"
          style={{
            paddingLeft: indent,
            color: "rgba(255,255,255,0.25)",
          }}
        >
          {prefix}
        </span>
        <span
          className="font-mono text-[11px]"
          style={{ color: node.isDir ? barColor : "rgba(255,255,255,0.45)" }}
        >
          {node.name}
        </span>
      </div>

      {/* Bar */}
      {node.files > 0 && (
        <div className="flex items-center gap-3">
          <motion.div
            style={{
              height: 3,
              backgroundColor: barColor,
              opacity: 0.45,
            }}
            initial={{ width: 0 }}
            animate={{ width: barWidth }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
          <span
            className="font-mono text-[9px] tabular-nums"
            style={{ color: "rgba(255,255,255,0.22)" }}
          >
            {node.files} files
          </span>
        </div>
      )}
    </motion.div>
  );
}
