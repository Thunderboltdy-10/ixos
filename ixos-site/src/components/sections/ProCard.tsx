"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export const PRO_FEATURE_LIST = [
  "Ask Mode answer cards + citations",
  "Today view: daily brief + suggested next files",
  "Workstreams: auto/manual context clusters",
  "Connection map + folder move recommendations",
  "File watch & notifications",
  "Developer file types (TS, PY, RS, GO)",
  "Deep Search Mode (thorough analysis)",
  "Priority model updates",
  "Direct support access",
];

export function ProCard({
  price,
  period,
  desc,
  actionLabel = "INITIALIZE_LICENSE",
  actionNode,
  className,
}: {
  price: string;
  period: string;
  desc: string;
  actionLabel?: string;
  actionNode?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative h-full flex flex-col p-8 rounded-sm border backdrop-blur-md overflow-hidden transition-all duration-300 bg-bg-graphite-1/90 border-accent-magenta/40 shadow-glow-magenta/20",
        className
      )}
    >
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-accent-magenta" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-accent-magenta/50" />

      <div className="mb-8">
        <div className="text-xs font-mono tracking-wider mb-4 opacity-80 text-accent-magenta">PRO</div>
        <div className="flex items-baseline gap-1 h-12">
          <span className="text-5xl font-mono font-medium text-fg-porcelain tracking-tighter tabular-nums">
            {price}
          </span>
          <span className="text-sm text-fg-muted font-mono">{period}</span>
        </div>
        <p className="mt-6 text-sm text-fg-muted leading-relaxed border-t border-stroke-hairline pt-6">{desc}</p>
      </div>

      <ul className="space-y-4 mb-10 flex-1">
        {PRO_FEATURE_LIST.map((feat) => (
          <li key={feat} className="flex items-start gap-3 text-sm group/li">
            <div className="mt-1.5 w-1 h-1 rounded-full bg-accent-magenta group-hover/li:shadow-glow-magenta transition-colors" />
            <span className="text-fg-porcelain opacity-90">{feat}</span>
          </li>
        ))}
      </ul>

      {actionNode ?? (
        <Button className="w-full font-mono text-xs uppercase tracking-widest h-12 bg-accent-magenta hover:bg-accent-magenta-glow text-bg-graphite-0 font-bold shadow-glow-magenta hover:scale-[1.02] transition-all">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
