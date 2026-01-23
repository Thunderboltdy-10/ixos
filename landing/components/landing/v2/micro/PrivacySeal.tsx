"use client";

import { motion } from "framer-motion";
import { Shield, Lock } from "lucide-react";
import { useState } from "react";

interface PrivacySealProps {
  variant?: "default" | "compact";
  className?: string;
}

export function PrivacySeal({ variant = "default", className = "" }: PrivacySealProps) {
  const [isHovered, setIsHovered] = useState(false);

  if (variant === "compact") {
    return (
      <div
        className={`flex items-center gap-2 ${className}`}
        style={{ color: "var(--v2-muted)" }}
      >
        <Shield className="w-4 h-4" style={{ color: "var(--v2-teal)" }} />
        <span className="font-[family-name:var(--v2-font-mono)] text-xs">
          Local-only. No telemetry.
        </span>
      </div>
    );
  }

  return (
    <motion.div
      className={`relative p-4 rounded-lg border ${className}`}
      style={{
        background: "var(--v2-surface)",
        borderColor: isHovered ? "var(--v2-teal)" : "var(--v2-border2)",
        boxShadow: isHovered ? "0 0 20px var(--v2-teal-glow)" : "none",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-start gap-4">
        {/* Shield Icon with Animation */}
        <motion.div
          className="relative flex-shrink-0"
          animate={{
            scale: isHovered ? 1.1 : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{
              background: "var(--v2-teal-glow)",
              border: "1px solid var(--v2-teal)",
            }}
          >
            <Shield className="w-6 h-6" style={{ color: "var(--v2-teal2)" }} />
          </div>

          {/* Lock badge */}
          <motion.div
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
            style={{
              background: "var(--v2-bg)",
              border: "1px solid var(--v2-teal)",
            }}
            animate={{
              rotate: isHovered ? [0, -10, 10, 0] : 0,
            }}
            transition={{ duration: 0.4 }}
          >
            <Lock className="w-3 h-3" style={{ color: "var(--v2-teal2)" }} />
          </motion.div>
        </motion.div>

        {/* Text Content */}
        <div className="flex-1">
          <h4
            className="font-[family-name:var(--v2-font-mono)] text-sm font-medium mb-1"
            style={{ color: "var(--v2-text)" }}
          >
            Privacy-First Architecture
          </h4>
          <p
            className="font-[family-name:var(--v2-font-mono)] text-xs leading-relaxed"
            style={{ color: "var(--v2-muted)" }}
          >
            No telemetry. Your files stay on your disk. Always.
          </p>
        </div>

        {/* Stamp Effect */}
        <motion.div
          className="absolute top-2 right-2"
          initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
          whileInView={{ opacity: 0.15, scale: 1, rotate: -12 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <div
            className="w-16 h-16 rounded-full border-2 flex items-center justify-center"
            style={{
              borderColor: "var(--v2-teal)",
              color: "var(--v2-teal)",
            }}
          >
            <span className="font-[family-name:var(--v2-font-mono)] text-[8px] uppercase tracking-wider text-center leading-tight">
              100%
              <br />
              LOCAL
            </span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default PrivacySeal;
