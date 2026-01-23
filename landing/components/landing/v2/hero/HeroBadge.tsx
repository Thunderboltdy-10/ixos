"use client";

import { motion } from "framer-motion";
import { SITE_CONFIG } from "@/lib/constants";

interface HeroBadgeProps {
  text?: string;
  className?: string;
}

export function HeroBadge({
  text = "LIVE LOCAL",
  className = ""
}: HeroBadgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-full overflow-hidden ${className}`}
      style={{
        background: "var(--v2-surface)",
        border: "1px solid var(--v2-border)",
      }}
    >
      {/* Animated border highlight */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(
            from 0deg,
            transparent 0deg,
            var(--v2-teal) 30deg,
            transparent 60deg
          )`,
          opacity: 0.3,
        }}
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Inner border to hide rotation edge */}
      <div
        className="absolute inset-[1px] rounded-full"
        style={{ background: "var(--v2-surface)" }}
      />

      {/* Content */}
      <div className="relative flex items-center gap-2">
        {/* Animated dot */}
        <span className="relative flex h-2 w-2">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ background: "var(--v2-teal)" }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ background: "var(--v2-teal2)" }}
          />
        </span>

        {/* Badge text */}
        <span
          className="font-[family-name:var(--v2-font-mono)] text-xs uppercase tracking-[0.08em]"
          style={{ color: "var(--v2-teal2)" }}
        >
          {text}
        </span>

        {/* Version */}
        <span
          className="font-[family-name:var(--v2-font-mono)] text-xs"
          style={{ color: "var(--v2-muted2)" }}
        >
          v{SITE_CONFIG.version}
        </span>
      </div>
    </motion.div>
  );
}

export default HeroBadge;
