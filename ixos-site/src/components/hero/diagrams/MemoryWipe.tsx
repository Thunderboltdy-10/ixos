"use client";

import { cn } from "@/lib/utils";

const ROWS = 3;
const COLS = 10;

export function MemoryWipe({
  isActive,
  isComplete,
}: {
  isActive: boolean;
  isComplete: boolean;
}) {
  return (
    <div className="relative h-full w-full">
      <svg viewBox="0 0 100 70" className="h-full w-full">
        <text
          x="8"
          y="8"
          className={cn("text-[4px] font-mono uppercase tracking-[0.08em]", isComplete ? "fill-accent-violet/88" : "fill-fg-muted/58")}
        >
          {isComplete ? "Scrubbed" : "Scanning memory"}
        </text>
        {Array.from({ length: ROWS }).map((_, row) => (
          <g key={`row-${row}`}>
            {Array.from({ length: COLS }).map((__, col) => {
              const x = 8 + col * 8.5;
              const y = 12 + row * 16;
              const activeCell = isActive && (col + row) % 3 !== 0;

              return (
                <rect
                  key={`cell-${row}-${col}`}
                  x={x}
                  y={y}
                  width="6"
                  height="10"
                  rx="1.8"
                  className={cn(
                    "transition-all duration-500",
                    isComplete
                      ? "fill-accent-violet/32 stroke-accent-violet/62"
                      : activeCell
                        ? "fill-white/[0.08] stroke-white/24"
                        : "fill-white/[0.03] stroke-white/12"
                  )}
                  style={{ transitionDelay: `${(row * COLS + col) * 16}ms` }}
                />
              );
            })}
          </g>
        ))}

        <path d="M8 64 C28 60 72 60 92 64" className={cn(isComplete ? "stroke-accent-violet/85" : "stroke-white/22")} strokeWidth="1.1" fill="none" />

        {isActive && !isComplete && (
          <text x="-24" y="67" className="fill-accent-violet/72 text-[3.8px] font-mono uppercase tracking-[0.14em]">
            scan scan scan
            <animate attributeName="x" from="-24" to="92" dur="2.2s" repeatCount="indefinite" />
          </text>
        )}
      </svg>

    </div>
  );
}
