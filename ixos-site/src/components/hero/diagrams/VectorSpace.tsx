"use client";

import { cn } from "@/lib/utils";

const POINTS = [
  { x: 23, y: 26 },
  { x: 72, y: 23 },
  { x: 34, y: 58 },
  { x: 60, y: 54 },
  { x: 80, y: 61 },
  { x: 18, y: 45 },
  { x: 46, y: 30 },
  { x: 74, y: 43 },
];

export function VectorSpace({
  isActive,
  isComplete,
}: {
  isActive: boolean;
  isComplete: boolean;
}) {
  const show = isActive || isComplete;

  return (
    <div className="h-full w-full">
      <svg
        viewBox="0 0 100 70"
        className={cn("h-full w-full transition-opacity duration-500", show ? "opacity-100" : "opacity-38")}
      >
        <defs>
          <radialGradient id="vs-core" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor="rgba(20,184,166,0.42)" />
            <stop offset="100%" stopColor="rgba(20,184,166,0)" />
          </radialGradient>
          <linearGradient id="vs-arrow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(246,185,76,0.95)" />
            <stop offset="100%" stopColor="rgba(20,184,166,0.95)" />
          </linearGradient>
        </defs>

        <circle cx="50" cy="36" r="27" fill="url(#vs-core)" />
        <circle cx="50" cy="36" r="23" className="fill-none stroke-white/14" />
        <circle cx="50" cy="36" r="15" className="fill-none stroke-white/12" />
        <circle cx="50" cy="36" r="8" className="fill-none stroke-white/12" />

        <line x1="14" y1="36" x2="86" y2="36" className="stroke-white/12" strokeWidth="0.9" />
        <line x1="50" y1="10" x2="50" y2="62" className="stroke-white/12" strokeWidth="0.9" />

        <line
          x1="16"
          y1="18"
          x2="50"
          y2="36"
          stroke={isActive ? "url(#vs-arrow)" : "rgba(255,255,255,0.2)"}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <polygon points="50,36 45,34 46,40" className={cn(isActive ? "fill-accent-teal" : "fill-white/26")} />

        {POINTS.map((p, index) => (
          <g key={`${p.x}-${p.y}`}>
            {isActive && index <= 4 && (
              <line
                x1="50"
                y1="36"
                x2={p.x}
                y2={p.y}
                className="stroke-accent-teal/42"
                strokeWidth="0.9"
                strokeDasharray="2 2"
              />
            )}
            <circle
              cx={p.x}
              cy={p.y}
              r={isActive && index <= 2 ? 2.7 : 2.2}
              className={cn(
                isActive
                  ? index <= 2
                    ? "fill-accent-teal"
                    : "fill-accent-teal/62"
                  : isComplete
                    ? "fill-fg-muted/58"
                    : "fill-fg-muted/34"
              )}
            />
          </g>
        ))}

        <circle cx="74" cy="43" r={isActive ? 6.4 : 5.1} className="fill-none stroke-accent-teal/52" strokeWidth="1" strokeDasharray="2 2" />

        {isActive && (
          <g className="origin-center animate-[vectorSpin_5s_linear_infinite]">
            <line x1="50" y1="36" x2="85" y2="36" className="stroke-accent-teal/42" strokeWidth="1.1" />
            <line x1="50" y1="36" x2="15" y2="36" className="stroke-accent-teal/32" strokeWidth="1.1" />
          </g>
        )}

        <circle
          cx="50"
          cy="36"
          r={isActive ? 4.9 : 4.2}
          className={cn(isActive ? "fill-accent-teal" : isComplete ? "fill-accent-teal/64" : "fill-white/28")}
        />

        <rect x="8" y="58" width="26" height="2.4" rx="1.2" className="fill-white/[0.08]" />
        <rect x="8" y="58" width={show ? 17 : 0} height="2.4" rx="1.2" className="fill-accent-amber/70" style={{ transition: "width 520ms ease" }} />
        <rect x="8" y="62.5" width="26" height="2.2" rx="1.1" className="fill-white/[0.08]" />
        <rect x="8" y="62.5" width={show ? 22 : 0} height="2.2" rx="1.1" className="fill-accent-teal/66" style={{ transition: "width 560ms ease", transitionDelay: "90ms" }} />
      </svg>

      <style>{`
        @keyframes vectorSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
