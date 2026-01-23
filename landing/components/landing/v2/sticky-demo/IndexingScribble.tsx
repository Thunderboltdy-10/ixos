"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface IndexingScribbleProps {
  isActive: boolean;
  className?: string;
}

export function IndexingScribble({ isActive, className = "" }: IndexingScribbleProps) {
  return (
    <div className={`relative ${className}`}>
      {/* "Indexing" text */}
      <span
        className="font-[family-name:var(--v2-font-mono)] text-sm"
        style={{
          color: isActive ? "var(--v2-muted2)" : "var(--v2-text2)",
          opacity: isActive ? 0.4 : 1,
          transition: "all 0.3s ease",
        }}
      >
        Indexing
      </span>

      {/* Scribble overlay */}
      {isActive && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center overflow-visible"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* CSS-based scribble since we may not have the image */}
          <svg
            className="absolute w-[150%] h-[200%] -left-[25%] -top-[50%]"
            viewBox="0 0 100 40"
            preserveAspectRatio="none"
          >
            <motion.path
              d="M 5 20 Q 15 5, 30 22 T 55 18 T 80 22 T 95 20"
              fill="none"
              stroke="var(--v2-amber)"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
            {/* Second scribble line for emphasis */}
            <motion.path
              d="M 8 22 Q 20 35, 35 18 T 60 24 T 85 19 T 92 23"
              fill="none"
              stroke="var(--v2-amber)"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.7 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: 0.15 }}
            />
          </svg>
        </motion.div>
      )}

      {/* Caption that appears after scribble */}
      {isActive && (
        <motion.div
          className="absolute -bottom-6 left-0 right-0 text-center"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          <span
            className="font-[family-name:var(--v2-font-mono)] text-[10px]"
            style={{ color: "var(--v2-amber)" }}
          >
            No index tax. Ever.
          </span>
        </motion.div>
      )}
    </div>
  );
}

export default IndexingScribble;
