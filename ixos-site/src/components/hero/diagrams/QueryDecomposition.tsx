"use client";

import { cn } from "@/lib/utils";

const OUTPUT_NODES = [
  { x: 20, y: 58, label: "intent" },
  { x: 50, y: 58, label: "entity" },
  { x: 80, y: 58, label: "scope" },
];

export function QueryDecomposition({
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
          <linearGradient id="qd-line" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(246,185,76,0.96)" />
            <stop offset="100%" stopColor="rgba(20,184,166,0.5)" />
          </linearGradient>
          <radialGradient id="qd-glow" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="rgba(246,185,76,0.38)" />
            <stop offset="100%" stopColor="rgba(246,185,76,0)" />
          </radialGradient>
        </defs>

        <rect x="10" y="10" width="80" height="8" rx="3" className="fill-white/[0.04] stroke-white/12" />
        <rect x="12" y="12" width={show ? 62 : 0} height="4" rx="2" className="fill-accent-amber/60" style={{ transition: "width 560ms ease" }} />

        {[0, 1, 2].map((idx) => (
          <circle key={`token-${idx}`} r="1.2" className={cn(isActive ? "fill-accent-amber/92" : "fill-accent-amber/60")}>
            <animateMotion
              dur={isActive ? "1.8s" : "3s"}
              repeatCount="indefinite"
              begin={`${idx * 0.26}s`}
              path="M14,14 L74,14"
            />
          </circle>
        ))}

        <line
          x1="50"
          y1="18"
          x2="50"
          y2="27"
          className={cn(isActive ? "stroke-accent-amber/84" : "stroke-white/24")}
          strokeWidth="1.1"
          strokeDasharray="2 1.6"
        />
        <circle cx="50" cy="31" r="11" fill="url(#qd-glow)" />
        <circle cx="50" cy="31" r="4.2" className={cn(isActive ? "fill-accent-amber" : "fill-fg-muted/40")} />

        {OUTPUT_NODES.map((node, index) => (
          <g key={`${node.x}-${node.y}`}>
            <line
              x1="50"
              y1="35"
              x2={node.x}
              y2={node.y}
              stroke="url(#qd-line)"
              strokeWidth="1.2"
              strokeDasharray="2 2"
              className={cn(isActive ? "opacity-100" : "opacity-45")}
            />
            {isActive && (
              <circle r="1.2" fill="rgba(246,185,76,0.95)">
                <animateMotion
                  dur="1.1s"
                  repeatCount="indefinite"
                  begin={`${index * 0.14}s`}
                  path={`M50,35 L${node.x},${node.y}`}
                />
              </circle>
            )}
            <circle
              cx={node.x}
              cy={node.y}
              r={isActive ? 2.8 : 2.3}
              className={cn(
                isActive
                  ? "fill-accent-amber/95"
                  : isComplete
                    ? "fill-accent-amber/58"
                    : "fill-fg-muted/44"
              )}
            />
            <rect x={node.x - 8} y={node.y + 3.6} width="16" height="2.6" rx="1.3" className="fill-white/[0.06]" />
            <rect
              x={node.x - 8}
              y={node.y + 3.6}
              width={show ? 9 + index * 2.6 : 0}
              height="2.6"
              rx="1.3"
              className="fill-accent-teal/62"
              style={{ transition: "width 560ms ease", transitionDelay: `${index * 70}ms` }}
            />
          </g>
        ))}

        <path
          d="M10 66 C28 62 72 62 90 66"
          className={cn(isActive ? "stroke-accent-amber/70" : "stroke-fg-muted/34")}
          strokeWidth="1.1"
          fill="none"
          strokeDasharray="2.2 1.8"
        />
      </svg>
    </div>
  );
}
