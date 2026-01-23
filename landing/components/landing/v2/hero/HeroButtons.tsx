"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Download, Play } from "lucide-react";

interface HeroButtonsProps {
  onWatchDemo?: () => void;
  className?: string;
}

export function HeroButtons({ onWatchDemo, className = "" }: HeroButtonsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className={`flex flex-col sm:flex-row gap-4 justify-center items-center ${className}`}
    >
      {/* Primary CTA - Download */}
      <Link href="/download">
        <motion.button
          className="group relative h-12 px-8 rounded-md overflow-hidden font-[family-name:var(--v2-font-mono)] text-sm uppercase tracking-[0.04em] font-medium"
          style={{
            background: "var(--v2-surface)",
            color: "var(--v2-text)",
            border: "1px solid var(--v2-border)",
            boxShadow: "var(--v2-edge-ring), var(--v2-top-highlight)",
          }}
          whileHover={{ y: -2 }}
          whileTap={{ y: 0 }}
        >
          {/* Hover sweep effect */}
          <motion.div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: "linear-gradient(90deg, transparent 0%, var(--v2-border) 50%, transparent 100%)",
            }}
            initial={{ x: "-100%" }}
            whileHover={{ x: "100%" }}
            transition={{ duration: 0.6 }}
          />

          <span className="relative flex items-center gap-2">
            <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
            Download
          </span>
        </motion.button>
      </Link>

      {/* Secondary CTA - Watch Demo */}
      <motion.button
        onClick={onWatchDemo}
        className="group relative h-12 px-8 rounded-md font-[family-name:var(--v2-font-mono)] text-sm uppercase tracking-[0.04em] font-medium transition-all duration-200"
        style={{
          background: "transparent",
          color: "var(--v2-muted)",
          border: "1px solid var(--v2-border2)",
        }}
        whileHover={{
          borderColor: "var(--v2-border)",
          color: "var(--v2-text)",
          background: "var(--v2-surface)",
        }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="flex items-center gap-2">
          <Play className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          Watch 12s demo
        </span>
      </motion.button>
    </motion.div>
  );
}

export default HeroButtons;
