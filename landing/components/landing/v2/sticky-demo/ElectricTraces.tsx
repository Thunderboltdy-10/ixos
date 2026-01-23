"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

interface ElectricTracesProps {
  progress: number; // 0-1 scroll progress
  className?: string;
}

export function ElectricTraces({ progress, className = "" }: ElectricTracesProps) {
  // Traces animate between 55-70% of scroll
  const traceProgress = Math.max(0, Math.min(1, (progress - 0.55) / 0.15));

  // Manhattan-routed paths (90-degree turns)
  const traces = useMemo(() => [
    // Main trace from deck to pipeline
    {
      id: "main",
      d: "M 50 100 L 50 150 L 200 150 L 200 200 L 350 200",
      delay: 0,
    },
    // Secondary trace
    {
      id: "secondary",
      d: "M 80 120 L 80 180 L 250 180 L 250 220 L 350 220",
      delay: 0.1,
    },
    // Tertiary trace
    {
      id: "tertiary",
      d: "M 120 110 L 120 160 L 300 160 L 300 240 L 350 240",
      delay: 0.2,
    },
  ], []);

  if (traceProgress <= 0) return null;

  return (
    <svg
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Gradient for trace glow */}
        <linearGradient id="traceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(244, 246, 248, 0.1)" />
          <stop offset="50%" stopColor="rgba(244, 246, 248, 0.4)" />
          <stop offset="100%" stopColor="rgba(244, 246, 248, 0.1)" />
        </linearGradient>

        {/* Signal highlight gradient */}
        <linearGradient id="signalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="40%" stopColor="rgba(244, 246, 248, 0.8)" />
          <stop offset="60%" stopColor="rgba(244, 246, 248, 1)" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>

        {/* Amber signal for energy */}
        <linearGradient id="amberSignal" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="40%" stopColor="rgba(246, 185, 76, 0.6)" />
          <stop offset="60%" stopColor="rgba(246, 185, 76, 1)" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>

        {/* Glow filter */}
        <filter id="traceGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Base traces (translucent white) */}
      {traces.map((trace) => {
        const adjustedProgress = Math.max(0, traceProgress - trace.delay) / (1 - trace.delay);

        return (
          <g key={trace.id}>
            {/* Base stroke */}
            <motion.path
              d={trace.d}
              fill="none"
              stroke="rgba(244, 246, 248, 0.15)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: adjustedProgress }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              style={{
                filter: "url(#traceGlow)",
              }}
            />

            {/* Signal highlight moving along path */}
            {adjustedProgress > 0.3 && (
              <motion.path
                d={trace.d}
                fill="none"
                stroke="url(#signalGradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="20 180"
                initial={{ strokeDashoffset: 200 }}
                animate={{ strokeDashoffset: -200 }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "linear",
                  delay: trace.delay * 2,
                }}
              />
            )}

            {/* Occasional amber packet */}
            {adjustedProgress > 0.5 && trace.id === "main" && (
              <motion.path
                d={trace.d}
                fill="none"
                stroke="url(#amberSignal)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="8 192"
                initial={{ strokeDashoffset: 200 }}
                animate={{ strokeDashoffset: -200 }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear",
                  delay: 0.5,
                }}
              />
            )}
          </g>
        );
      })}

      {/* Corner radius decorations */}
      {traceProgress > 0.5 && (
        <>
          <circle cx="50" cy="150" r="3" fill="rgba(244, 246, 248, 0.3)" />
          <circle cx="200" cy="150" r="3" fill="rgba(244, 246, 248, 0.3)" />
          <circle cx="200" cy="200" r="3" fill="rgba(244, 246, 248, 0.3)" />
        </>
      )}
    </svg>
  );
}

export default ElectricTraces;
