"use client";

import { motion } from "framer-motion";
import { Keyboard, Search, Database, Cpu, Trophy } from "lucide-react";
import { IndexingScribble } from "./IndexingScribble";

interface PipelineNodesProps {
  progress: number; // 0-1 scroll progress
  className?: string;
}

const PIPELINE_STEPS = [
  { id: "keystroke", label: "Keystroke", icon: Keyboard },
  { id: "scan", label: "Fast candidate scan", icon: Search },
  { id: "indexing", label: "Indexing", icon: Database, isIndexing: true },
  { id: "jit", label: "JIT embeddings", icon: Cpu, isHighlighted: true },
  { id: "rank", label: "Rank + stream", icon: Trophy },
];

export function PipelineNodes({ progress, className = "" }: PipelineNodesProps) {
  // Pipeline lights up between 70-85% of scroll
  const pipelineProgress = Math.max(0, Math.min(1, (progress - 0.70) / 0.15));

  // Calculate which nodes are active
  const activeNodes = Math.floor(pipelineProgress * PIPELINE_STEPS.length);

  return (
    <div className={`relative ${className}`}>
      {/* Pipeline container */}
      <div
        className="p-6 rounded-lg"
        style={{
          background: "var(--v2-surface)",
          border: "1px solid var(--v2-border)",
          boxShadow: "var(--v2-edge-ring)",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: pipelineProgress > 0 ? "var(--v2-teal2)" : "var(--v2-muted2)",
            }}
          />
          <span
            className="font-[family-name:var(--v2-font-mono)] text-xs uppercase tracking-[0.08em]"
            style={{ color: "var(--v2-muted)" }}
          >
            Search Pipeline
          </span>
        </div>

        {/* Pipeline nodes */}
        <div className="space-y-3">
          {PIPELINE_STEPS.map((step, index) => {
            const isActive = index < activeNodes;
            const isCurrent = index === activeNodes - 1;
            const Icon = step.icon;

            return (
              <motion.div
                key={step.id}
                className="relative"
                initial={{ opacity: 0.4 }}
                animate={{
                  opacity: isActive ? 1 : 0.4,
                }}
                transition={{ duration: 0.3 }}
              >
                {/* Connection line */}
                {index > 0 && (
                  <div
                    className="absolute -top-3 left-4 w-[1px] h-3"
                    style={{
                      background: isActive ? "var(--v2-border)" : "var(--v2-border3)",
                    }}
                  />
                )}

                {/* Node */}
                <div
                  className="flex items-center gap-3 p-3 rounded-md transition-all duration-300"
                  style={{
                    background: step.isHighlighted && isActive
                      ? "var(--v2-teal-glow)"
                      : isCurrent
                      ? "var(--v2-bg)"
                      : "transparent",
                    border: `1px solid ${
                      step.isHighlighted && isActive
                        ? "var(--v2-teal)"
                        : isCurrent
                        ? "var(--v2-border)"
                        : "transparent"
                    }`,
                    boxShadow: step.isHighlighted && isActive
                      ? "0 0 20px var(--v2-teal-glow)"
                      : "none",
                  }}
                >
                  {/* Icon */}
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{
                      background: isActive ? "var(--v2-bg)" : "transparent",
                      border: `1px solid ${isActive ? "var(--v2-border)" : "var(--v2-border3)"}`,
                    }}
                  >
                    <Icon
                      className="w-4 h-4"
                      style={{
                        color: step.isHighlighted && isActive
                          ? "var(--v2-teal2)"
                          : isActive
                          ? "var(--v2-text)"
                          : "var(--v2-muted2)",
                      }}
                    />
                  </div>

                  {/* Label (with scribble for indexing) */}
                  {step.isIndexing ? (
                    <IndexingScribble isActive={isActive && pipelineProgress > 0.5} />
                  ) : (
                    <span
                      className="font-[family-name:var(--v2-font-mono)] text-sm"
                      style={{
                        color: step.isHighlighted && isActive
                          ? "var(--v2-teal2)"
                          : isActive
                          ? "var(--v2-text)"
                          : "var(--v2-muted2)",
                      }}
                    >
                      {step.label}
                    </span>
                  )}

                  {/* Highlighted badge */}
                  {step.isHighlighted && isActive && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="ml-auto px-2 py-0.5 rounded text-[10px] font-[family-name:var(--v2-font-mono)] uppercase"
                      style={{
                        background: "var(--v2-teal)",
                        color: "var(--v2-bg)",
                      }}
                    >
                      Quality pass
                    </motion.span>
                  )}

                  {/* Active indicator */}
                  {isCurrent && (
                    <motion.div
                      className="ml-auto w-2 h-2 rounded-full"
                      style={{ background: "var(--v2-teal2)" }}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default PipelineNodes;
