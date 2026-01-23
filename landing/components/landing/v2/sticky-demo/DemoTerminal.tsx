"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface DemoTerminalProps {
  progress: number; // 0-1 scroll progress
  className?: string;
}

const DEMO_QUERY = "meeting notes q3.pdf";
const DEMO_RESULTS = [
  { name: "Q3_2025_Team_Meeting_Notes.pdf", score: 0.94, path: "~/Documents/Meetings" },
  { name: "Quarterly_Review_Notes_Sept.pdf", score: 0.89, path: "~/Work/Reports" },
  { name: "Meeting_Minutes_Q3_Planning.docx", score: 0.85, path: "~/Documents" },
  { name: "project_notes_autumn.md", score: 0.78, path: "~/Notes" },
  { name: "q3_budget_discussion.pdf", score: 0.72, path: "~/Finance" },
  { name: "team_standup_notes_aug.txt", score: 0.68, path: "~/Work/Daily" },
];

export function DemoTerminal({ progress, className = "" }: DemoTerminalProps) {
  const [displayedQuery, setDisplayedQuery] = useState("");
  const [visibleResults, setVisibleResults] = useState(0);

  // Calculate typing progress (15-35% of scroll)
  const typingProgress = Math.max(0, Math.min(1, (progress - 0.15) / 0.20));

  // Calculate results progress (35-55% of scroll)
  const resultsProgress = Math.max(0, Math.min(1, (progress - 0.35) / 0.20));

  useEffect(() => {
    // Type the query based on scroll progress
    const chars = Math.floor(typingProgress * DEMO_QUERY.length);
    setDisplayedQuery(DEMO_QUERY.slice(0, chars));
  }, [typingProgress]);

  useEffect(() => {
    // Show results based on scroll progress
    const results = Math.floor(resultsProgress * DEMO_RESULTS.length);
    setVisibleResults(results);
  }, [resultsProgress]);

  return (
    <div
      className={`relative rounded-lg overflow-hidden ${className}`}
      style={{
        background: "var(--v2-bg)",
        border: "1px solid var(--v2-border)",
        boxShadow: "var(--v2-edge-ring), var(--v2-top-highlight), var(--v2-shadow-deck)",
      }}
    >
      {/* Terminal Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ borderColor: "var(--v2-border2)" }}
      >
        {/* Traffic lights */}
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <span
          className="font-[family-name:var(--v2-font-mono)] text-xs ml-2"
          style={{ color: "var(--v2-muted2)" }}
        >
          ixos search
        </span>
      </div>

      {/* Terminal Body */}
      <div className="p-4 min-h-[300px]">
        {/* Search Input */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className="font-[family-name:var(--v2-font-mono)] text-sm"
            style={{ color: "var(--v2-teal2)" }}
          >
            $
          </span>
          <span
            className="font-[family-name:var(--v2-font-mono)] text-sm"
            style={{ color: "var(--v2-muted)" }}
          >
            ixos search &quot;
          </span>
          <span
            className="font-[family-name:var(--v2-font-mono)] text-sm"
            style={{ color: "var(--v2-text)" }}
          >
            {displayedQuery}
          </span>
          {/* Cursor */}
          {typingProgress < 1 && (
            <motion.span
              className="inline-block w-2 h-4"
              style={{ background: "var(--v2-text)" }}
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          )}
          {typingProgress >= 1 && (
            <span
              className="font-[family-name:var(--v2-font-mono)] text-sm"
              style={{ color: "var(--v2-muted)" }}
            >
              &quot;
            </span>
          )}
        </div>

        {/* Results */}
        {visibleResults > 0 && (
          <div className="space-y-1">
            {/* Results header */}
            <div
              className="font-[family-name:var(--v2-font-mono)] text-xs mb-2"
              style={{ color: "var(--v2-muted2)" }}
            >
              Found {DEMO_RESULTS.length} results in 181ms
            </div>

            {/* Result items */}
            {DEMO_RESULTS.slice(0, visibleResults).map((result, index) => (
              <motion.div
                key={result.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="flex items-center gap-3 py-1.5 px-2 rounded"
                style={{
                  background: index === 0 ? "var(--v2-teal-glow)" : "transparent",
                }}
              >
                {/* Rank */}
                <span
                  className="font-[family-name:var(--v2-font-mono)] text-xs w-4"
                  style={{ color: "var(--v2-muted2)" }}
                >
                  {index + 1}
                </span>

                {/* Score bar */}
                <div
                  className="w-12 h-1 rounded-full overflow-hidden"
                  style={{ background: "var(--v2-border)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${result.score * 100}%`,
                      background: index === 0 ? "var(--v2-teal2)" : "var(--v2-muted)",
                    }}
                  />
                </div>

                {/* Filename */}
                <span
                  className="font-[family-name:var(--v2-font-mono)] text-sm flex-1 truncate"
                  style={{ color: index === 0 ? "var(--v2-text)" : "var(--v2-text2)" }}
                >
                  {result.name}
                </span>

                {/* Path */}
                <span
                  className="font-[family-name:var(--v2-font-mono)] text-xs hidden sm:block"
                  style={{ color: "var(--v2-muted2)" }}
                >
                  {result.path}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DemoTerminal;
