"use client";

import { motion } from "framer-motion";

interface TraceToBorderProps {
  isActive: boolean;
  className?: string;
}

export function TraceToBorder({ isActive, className = "" }: TraceToBorderProps) {
  return (
    <div className={`relative ${className}`}>
      {/* The trace that morphs into border */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="none"
      >
        <motion.rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="none"
          stroke="var(--v2-border)"
          strokeWidth="1"
          rx="8"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{
            pathLength: isActive ? 1 : 0,
            opacity: isActive ? 1 : 0,
          }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>

      {/* Signal traveling along the border */}
      {isActive && (
        <motion.div
          className="absolute w-4 h-4 rounded-full pointer-events-none"
          style={{
            background: "var(--v2-teal2)",
            boxShadow: "0 0 20px var(--v2-teal-glow-strong)",
          }}
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            top: ["0%", "0%", "100%", "100%"],
            left: ["0%", "100%", "100%", "0%"],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
            times: [0, 0.25, 0.5, 0.75],
          }}
        />
      )}
    </div>
  );
}

export default TraceToBorder;
