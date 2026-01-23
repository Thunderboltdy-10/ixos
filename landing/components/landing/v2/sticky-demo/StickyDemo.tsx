"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { DemoTerminal } from "./DemoTerminal";
import { PipelineNodes } from "./PipelineNodes";
import { LightingWash } from "../shared/LightingWash";

export function StickyDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  // Track scroll progress within the sticky section
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Update progress state
  useEffect(() => {
    return scrollYProgress.on("change", (v) => {
      setProgress(v);
    });
  }, [scrollYProgress]);

  // Deck scale transformation (slight scale down as we scroll)
  const deckScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);
  const deckY = useTransform(scrollYProgress, [0, 0.15], [0, -20]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-[200vh]"
      style={{ background: "var(--v2-bg)" }}
    >
      {/* Sticky container */}
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        <LightingWash intensity={4} position="top" />

        <div className="max-w-[var(--v2-container-max)] mx-auto px-[var(--v2-container-padding)] w-full">
          {/* Section header */}
          <motion.div
            className="text-center mb-12"
            style={{
              opacity: useTransform(scrollYProgress, [0, 0.1], [1, 0.3]),
              y: useTransform(scrollYProgress, [0, 0.15], [0, -40]),
            }}
          >
            <h2
              className="font-[family-name:var(--v2-font-mono)] text-xs uppercase tracking-[0.08em] mb-4"
              style={{ color: "var(--v2-muted2)" }}
            >
              How It Works
            </h2>
            <h3
              className="font-[family-name:var(--v2-font-display)] text-3xl md:text-4xl"
              style={{ color: "var(--v2-text)" }}
            >
              No Indexing. Instant Results.
            </h3>
          </motion.div>

          {/* Demo grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Terminal Deck */}
            <motion.div
              style={{
                scale: deckScale,
                y: deckY,
              }}
            >
              <DemoTerminal progress={progress} />
            </motion.div>

            {/* Pipeline */}
            <motion.div
              style={{
                opacity: useTransform(scrollYProgress, [0.5, 0.7], [0, 1]),
                x: useTransform(scrollYProgress, [0.5, 0.7], [50, 0]),
              }}
            >
              <PipelineNodes progress={progress} />
            </motion.div>
          </div>

          {/* Bottom caption */}
          <motion.div
            className="text-center mt-12"
            style={{
              opacity: useTransform(scrollYProgress, [0.8, 0.9], [0, 1]),
            }}
          >
            <p
              className="font-[family-name:var(--v2-font-mono)] text-sm"
              style={{ color: "var(--v2-muted)" }}
            >
              JIT embeddings compute on query, not on file change.
              <br />
              <span style={{ color: "var(--v2-teal2)" }}>
                181ms P50 latency
              </span>
              {" "}&mdash; faster than traditional indexers cold-start.
            </p>
          </motion.div>
        </div>

        {/* Progress indicator */}
        <div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-2"
          style={{ opacity: progress > 0.1 && progress < 0.9 ? 1 : 0 }}
        >
          {[0.2, 0.4, 0.6, 0.8].map((threshold, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{
                background: progress >= threshold ? "var(--v2-teal2)" : "var(--v2-border)",
                transform: progress >= threshold ? "scale(1.2)" : "scale(1)",
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default StickyDemo;
