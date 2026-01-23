"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface ColdStartKillProps {
  trigger: boolean;
  className?: string;
}

export function ColdStartKill({ trigger, className = "" }: ColdStartKillProps) {
  const [phase, setPhase] = useState<"idle" | "loading" | "killed">("idle");

  useEffect(() => {
    if (trigger && phase === "idle") {
      // Start the fake loading
      setPhase("loading");

      // Immediately kill it
      const timer = setTimeout(() => {
        setPhase("killed");
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [trigger, phase]);

  // Reset after animation completes
  useEffect(() => {
    if (phase === "killed") {
      const timer = setTimeout(() => {
        setPhase("idle");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  return (
    <div
      className={`relative inline-flex items-center gap-2 ${className}`}
      style={{ minHeight: "24px" }}
    >
      <AnimatePresence mode="wait">
        {phase === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="font-[family-name:var(--v2-font-mono)] text-xs"
            style={{ color: "var(--v2-muted2)" }}
          >
            Ready
          </motion.div>
        )}

        {phase === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.1 }}
            className="flex items-center gap-2"
          >
            {/* Spinner that gets killed */}
            <motion.div
              className="w-3 h-3 rounded-full border-2"
              style={{
                borderColor: "var(--v2-muted2)",
                borderTopColor: "var(--v2-teal)",
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
            />
            <span
              className="font-[family-name:var(--v2-font-mono)] text-xs"
              style={{ color: "var(--v2-muted)" }}
            >
              Loading...
            </span>
          </motion.div>
        )}

        {phase === "killed" && (
          <motion.div
            key="killed"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            className="flex items-center gap-2"
          >
            {/* Check mark */}
            <motion.div
              className="w-3 h-3 rounded-full flex items-center justify-center"
              style={{ background: "var(--v2-teal)" }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              <svg
                width="8"
                height="8"
                viewBox="0 0 12 12"
                fill="none"
                stroke="var(--v2-bg)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 6l3 3 5-6" />
              </svg>
            </motion.div>
            <span
              className="font-[family-name:var(--v2-font-mono)] text-xs"
              style={{ color: "var(--v2-teal2)" }}
            >
              mmap loaded (0ms)
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ColdStartKill;
