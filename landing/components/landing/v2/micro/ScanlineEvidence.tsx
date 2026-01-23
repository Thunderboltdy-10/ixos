"use client";

import { motion } from "framer-motion";

interface ScanlineEvidenceProps {
  text: string;
  isRevealing: boolean;
  className?: string;
}

export function ScanlineEvidence({
  text,
  isRevealing,
  className = "",
}: ScanlineEvidenceProps) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Text content */}
      <motion.div
        className="font-[family-name:var(--v2-font-mono)] text-xs"
        style={{ color: "var(--v2-muted)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isRevealing ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      >
        {text}
      </motion.div>

      {/* Scanline effect */}
      {isRevealing && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ y: "-100%" }}
          animate={{ y: "100%" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* Scanline */}
          <div
            className="absolute inset-x-0 h-[2px]"
            style={{
              background: "linear-gradient(90deg, transparent, var(--v2-teal2), transparent)",
              boxShadow: "0 0 10px var(--v2-teal-glow-strong)",
            }}
          />
          {/* Trail */}
          <div
            className="absolute inset-x-0 h-8 -top-8"
            style={{
              background: "linear-gradient(to bottom, transparent, var(--v2-teal-glow))",
            }}
          />
        </motion.div>
      )}
    </div>
  );
}

export default ScanlineEvidence;
