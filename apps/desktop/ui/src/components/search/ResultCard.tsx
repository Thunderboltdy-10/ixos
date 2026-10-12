import { useState } from "react";
import {
  FileText,
  ChevronDown,
  Copy,
  FolderOpen,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useResultCardLayout } from "@/hooks/useLayoutSync";
import type { Profile, SearchResult } from "@/lib/types";
interface ResultCardProps {
  result: SearchResult;
  index: number;
  isSelected: boolean;
  profile: Profile;
  onSelect: () => void;
  onOpen: () => void;
  onReveal: () => void;
}
export function ResultCard({
  result,
  index,
  isSelected,
  profile,
  onSelect,
  onOpen,
  onReveal,
}: ResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useResultCardLayout(index);
  const accent =
    profile === "code" ? "var(--accent-teal)" : "var(--accent-amber)";
  const directory = result.path.replace(/[/\\][^/\\]*$/, "");
  const actionClass =
    "p-1.5 rounded-md text-fg-dim hover:text-porcelain hover:bg-graphite-3/50 transition-colors";
  return (
    <div
      ref={ref}
      onClick={onSelect}
      onDoubleClick={onOpen}
      className={cn(
        "group relative cursor-pointer transition-all duration-200 ease-out no-drag rounded-lg",
        isSelected
          ? "bg-graphite-2/60"
          : "bg-transparent hover:bg-graphite-1/50",
      )}
      style={{
        padding: "12px 16px",
        borderLeft: `2px solid ${isSelected ? accent : "transparent"}`,
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-graphite-3/50">
          <FileText className="h-4 w-4" style={{ color: accent }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-porcelain">
            {result.filename}
          </p>
          <p
            className="truncate text-[11px] text-fg-dim mt-0.5"
            title={directory}
          >
            {directory}
          </p>
        </div>
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-[10px] font-mono text-fg-secondary"
          title="Ranking score"
        >
          {result.score.toFixed(2)}
        </span>
      </div>
      {result.snippet && (
        <div
          className="mt-3"
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setExpanded(!expanded);
            }}
            className="flex items-center gap-1.5 text-[10px] text-fg-dim hover:text-porcelain"
          >
            <ChevronDown
              className={cn(
                "w-3 h-3 transition-transform",
                expanded && "rotate-180",
              )}
            />
            Lines {result.snippet.start_line}–{result.snippet.end_line}
          </button>
          <pre
            className={cn(
              "context-snippet mt-2 rounded-md border border-white/[0.08] bg-graphite-0/50 p-2 text-[11px] leading-relaxed font-mono whitespace-pre-wrap break-words text-fg-secondary",
              !expanded && "max-h-24 overflow-hidden",
            )}
            onClick={(event) => event.stopPropagation()}
          >
            {result.snippet.text}
          </pre>
        </div>
      )}
      <div
        className="mt-2 flex justify-end gap-1"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          title={copied ? "Path copied" : "Copy path"}
          className={actionClass}
          onClick={async () => {
            await navigator.clipboard.writeText(result.path);
            setCopied(true);
          }}
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          title="Reveal file"
          className={actionClass}
          onClick={() => {
            onSelect();
            onReveal();
          }}
        >
          <FolderOpen className="w-3.5 h-3.5" />
        </button>
        <button
          title="Open file"
          className={actionClass}
          onClick={() => {
            onSelect();
            onOpen();
          }}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
