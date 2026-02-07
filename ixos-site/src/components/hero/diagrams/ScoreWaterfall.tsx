"use client";

import { cn } from "@/lib/utils";

const SCORES = [92, 86, 74, 57, 39, 24];

export function ScoreWaterfall({
  isActive,
  isComplete,
}: {
  isActive: boolean;
  isComplete: boolean;
}) {
  const show = isActive || isComplete;

  return (
    <div className="relative h-full w-full">
      <svg
        viewBox="0 0 100 70"
        className={cn("h-full w-full transition-opacity duration-500", show ? "opacity-100" : "opacity-38")}
      >
        {SCORES.map((score, index) => {
          const y = 10 + index * 9;
          return (
            <g key={`s-${index}`}>
              <line x1="10" y1={y + 3} x2="90" y2={y + 3} className="stroke-white/10" strokeWidth="0.9" />
              <rect
                x="10"
                y={y}
                width={show ? score * 0.78 : 0}
                height="6"
                rx="2"
                className={cn(
                  score >= 70
                    ? isActive
                      ? "fill-accent-teal"
                      : "fill-accent-teal/62"
                    : score >= 50
                      ? "fill-accent-amber/72"
                      : "fill-white/20"
                )}
                style={{
                  transition: "width 620ms ease",
                  transitionDelay: `${index * 70}ms`,
                }}
              />
            </g>
          );
        })}

        <line x1="58" y1="8" x2="58" y2="64" className="stroke-accent-amber/70" strokeWidth="1" strokeDasharray="2 2" />

        {isActive && (
          <rect
            x="0"
            y="0"
            width="32"
            height="70"
            className="fill-[url(#rankSweep)]"
          />
        )}

        <defs>
          <linearGradient id="rankSweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(20,184,166,0)" />
            <stop offset="50%" stopColor="rgba(20,184,166,0.22)" />
            <stop offset="100%" stopColor="rgba(20,184,166,0)" />
          </linearGradient>
        </defs>
      </svg>

      <div className="pointer-events-none absolute bottom-2 right-1 top-2 w-14 overflow-hidden">
        <div className={cn("space-y-1 text-[9px] font-mono leading-tight", show ? "opacity-100" : "opacity-40", isActive ? "animate-[scoreTicker_2.8s_linear_infinite]" : "animate-[scoreTicker_6s_linear_infinite]")}>
          {[
            "sem 0.92",
            "lex 0.78",
            "fuse 0.88",
            "sem 0.74",
            "lex 0.59",
            "fuse 0.67",
            "sem 0.41",
            "lex 0.36",
            "fuse 0.39",
          ].map((line, idx) => (
            <div key={`score-line-${idx}`} className={cn(idx % 3 === 2 ? "text-accent-teal/78" : "text-fg-muted/52")}>
              {line}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes scoreTicker {
          0% { transform: translateY(0); }
          100% { transform: translateY(-42%); }
        }
      `}</style>
    </div>
  );
}
