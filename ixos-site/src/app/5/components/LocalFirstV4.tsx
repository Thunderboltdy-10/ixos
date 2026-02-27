"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { FileNodesBg } from "./FileNodesBg";

// ─── SVG diagram ──────────────────────────────────────────────────────────────
function LocalDiagram({ inView }: { inView: boolean }) {
  // Positions
  const centerX = 150;
  const centerY = 110;

  const fileNodes = [
    { x: 40, y: 40, label: "src/" },
    { x: 260, y: 40, label: "docs/" },
    { x: 20, y: 130, label: "lib/" },
    { x: 280, y: 130, label: "api/" },
    { x: 60, y: 195, label: "cfg/" },
    { x: 240, y: 195, label: "test/" },
  ];

  const cloudX = 350;
  const cloudY = 80;

  const totalLen = 80; // approximate line stroke lengths

  return (
    <svg
      viewBox="0 0 400 240"
      width="100%"
      style={{ maxWidth: 420, overflow: "visible" }}
    >
      {/* Lines from file nodes to device */}
      {fileNodes.map((node, i) => {
        const len = Math.sqrt(
          Math.pow(centerX - node.x, 2) + Math.pow(centerY - node.y, 2)
        );
        return (
          <motion.line
            key={i}
            x1={node.x}
            y1={node.y}
            x2={centerX}
            y2={centerY}
            stroke="#2DD4BF"
            strokeWidth="0.7"
            strokeOpacity="0.35"
            strokeDasharray={len}
            initial={{ strokeDashoffset: len }}
            animate={inView ? { strokeDashoffset: 0 } : { strokeDashoffset: len }}
            transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
          />
        );
      })}

      {/* Animated dots on lines (toward device) */}
      {fileNodes.map((node, i) => (
        <motion.circle
          key={`dot-${i}`}
          r="2.5"
          fill="#2DD4BF"
          fillOpacity="0.8"
          initial={{ offsetDistance: "0%", opacity: 0 }}
          animate={
            inView
              ? {
                  opacity: [0, 1, 1, 0],
                }
              : { opacity: 0 }
          }
          style={{
            offsetPath: `path("M ${node.x} ${node.y} L ${centerX} ${centerY}")`,
          }}
          transition={{
            opacity: {
              delay: 0.8 + i * 0.2,
              duration: 1.4,
              repeat: Infinity,
              repeatDelay: 0.6,
            },
          }}
        />
      ))}

      {/* File node squares */}
      {fileNodes.map((node, i) => (
        <motion.g
          key={`fn-${i}`}
          initial={{ opacity: 0, scale: 0 }}
          animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
          transition={{ delay: 0.1 + i * 0.07, duration: 0.35 }}
          style={{ transformOrigin: `${node.x}px ${node.y}px` }}
        >
          <rect
            x={node.x - 12}
            y={node.y - 10}
            width={24}
            height={20}
            rx="1"
            fill="rgba(45,212,191,0.06)"
            stroke="#2DD4BF"
            strokeWidth="0.8"
            strokeOpacity="0.5"
          />
          <line
            x1={node.x + 4}
            y1={node.y - 10}
            x2={node.x + 12}
            y2={node.y - 3}
            stroke="#2DD4BF"
            strokeWidth="0.6"
            strokeOpacity="0.4"
          />
          <text
            x={node.x}
            y={node.y + 5}
            textAnchor="middle"
            fill="rgba(45,212,191,0.7)"
            fontSize="5"
            fontFamily="monospace"
          >
            {node.label}
          </text>
        </motion.g>
      ))}

      {/* Device (laptop) — center */}
      <motion.g
        initial={{ opacity: 0, scale: 0.8 }}
        animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
        transition={{ delay: 0.0, duration: 0.45 }}
        style={{ transformOrigin: `${centerX}px ${centerY}px` }}
      >
        {/* Screen */}
        <rect
          x={centerX - 26}
          y={centerY - 20}
          width={52}
          height={34}
          rx="2"
          fill="rgba(45,212,191,0.08)"
          stroke="#2DD4BF"
          strokeWidth="1.2"
        />
        {/* Screen content lines */}
        <line x1={centerX - 18} y1={centerY - 10} x2={centerX + 12} y2={centerY - 10} stroke="#2DD4BF" strokeWidth="0.7" strokeOpacity="0.5" />
        <line x1={centerX - 18} y1={centerY - 5} x2={centerX + 5} y2={centerY - 5} stroke="#2DD4BF" strokeWidth="0.7" strokeOpacity="0.5" />
        <line x1={centerX - 18} y1={centerY} x2={centerX + 9} y2={centerY} stroke="#2DD4BF" strokeWidth="0.7" strokeOpacity="0.5" />
        {/* Base */}
        <rect
          x={centerX - 32}
          y={centerY + 14}
          width={64}
          height={5}
          rx="1"
          fill="rgba(45,212,191,0.08)"
          stroke="#2DD4BF"
          strokeWidth="1"
        />
        {/* Hinge */}
        <line x1={centerX - 26} y1={centerY + 14} x2={centerX - 26} y2={centerY + 14} stroke="#2DD4BF" strokeWidth="0.5" />
        {/* Pulse ring */}
        <motion.circle
          cx={centerX}
          cy={centerY}
          r="32"
          fill="none"
          stroke="#2DD4BF"
          strokeWidth="0.5"
          strokeOpacity="0.2"
          animate={{ r: [28, 36], opacity: [0.3, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
        />
      </motion.g>

      {/* Cloud icon (right side) with crossed-out line */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 1.0, duration: 0.5 }}
      >
        {/* Cloud shape */}
        <ellipse cx={cloudX} cy={cloudY} rx={22} ry={14} fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <ellipse cx={cloudX - 10} cy={cloudY + 4} rx={12} ry={10} fill="rgba(8,10,12,1)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <ellipse cx={cloudX + 8} cy={cloudY + 4} rx={14} ry={10} fill="rgba(8,10,12,1)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <rect x={cloudX - 22} y={cloudY - 4} width={44} height={20} fill="rgba(8,10,12,1)" />
        <ellipse cx={cloudX} cy={cloudY} rx={22} ry={14} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        {/* Strike through */}
        <motion.line
          x1={cloudX - 24}
          y1={cloudY - 18}
          x2={cloudX + 24}
          y2={cloudY + 22}
          stroke="#F59E0B"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={inView ? { pathLength: 1 } : { pathLength: 0 }}
          transition={{ delay: 1.2, duration: 0.4 }}
        />
        <text
          x={cloudX}
          y={cloudY + 36}
          textAnchor="middle"
          fill="rgba(245,158,11,0.6)"
          fontSize="6"
          fontFamily="monospace"
          letterSpacing="1.5"
        >
          NO EGRESS
        </text>
      </motion.g>

      {/* Dashed "blocked" line from device to cloud */}
      <motion.line
        x1={centerX + 26}
        y1={centerY - 8}
        x2={cloudX - 24}
        y2={cloudY + 4}
        stroke="rgba(245,158,11,0.2)"
        strokeWidth="0.8"
        strokeDasharray="3 5"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 1.1, duration: 0.4 }}
      />
    </svg>
  );
}

// ─── Guarantees ───────────────────────────────────────────────────────────────
const GUARANTEES = [
  {
    title: "No telemetry",
    desc: "Zero usage data, analytics, or crash reports sent anywhere.",
    color: "#2DD4BF",
  },
  {
    title: "No index daemon",
    desc: "Ixos runs on demand. No background processes watching your files.",
    color: "#2DD4BF",
  },
  {
    title: "No cloud sync",
    desc: "Your embeddings and query history never touch a server.",
    color: "#2DD4BF",
  },
  {
    title: "No account required",
    desc: "Core search works offline, anonymously, forever.",
    color: "#2DD4BF",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export function LocalFirstV4() {
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

      <FileNodesBg density={0.2} opacity={0.1} color="#2DD4BF" speed={0.35} />

      <div className="relative z-10 max-w-5xl mx-auto w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55 }}
          className="text-center mb-16"
        >
          <p className="font-mono text-[10px] tracking-[0.35em] uppercase mb-5" style={{ color: "rgba(255,255,255,0.2)" }}>
            Privacy · Architecture
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-5">
            Your data never leaves.
          </h2>
          <p className="font-mono text-sm max-w-md mx-auto" style={{ color: "rgba(255,255,255,0.35)" }}>
            Local-first is not a feature. It&apos;s the architecture.
          </p>
        </motion.div>

        {/* Diagram */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="flex justify-center mb-16"
        >
          <LocalDiagram inView={inView} />
        </motion.div>

        {/* Guarantees 2x2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          {GUARANTEES.map((g, i) => (
            <motion.div
              key={g.title}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4 + i * 0.08, duration: 0.45 }}
              className="p-8"
              style={{
                backgroundColor: "rgba(255,255,255,0.015)",
                borderRight: i % 2 === 0 ? "1px solid rgba(255,255,255,0.04)" : "none",
                borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-1" style={{ backgroundColor: g.color }} />
                <span className="font-mono text-xs tracking-[0.15em] uppercase font-semibold" style={{ color: g.color }}>
                  {g.title}
                </span>
              </div>
              <p className="font-mono text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.32)" }}>
                {g.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
