"use client";

import { createElement } from 'react';
import { Search, Sparkles, Zap, Shield, ChevronDown, Folder, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFileIcon } from '../hero/fileIcons';

const HERO_RESULTS = [
  {
    filename: "Q3-budget.xlsx",
    fileExtension: "xlsx",
    directory: "~/Documents/finance",
    snippet: "Revenue projections Q3 — updated forecast with regional breakdown",
    score: 0.931,
    fileSize: "1.2 MB",
    modifiedAt: "2h ago",
    tags: ["financials", "2025"],
  },
  {
    filename: "project-notes.md",
    fileExtension: "md",
    directory: "~/Documents/work",
    snippet: "Budget allocation notes — quarterly targets and variance analysis",
    score: 0.897,
    fileSize: "14 KB",
    modifiedAt: "Yesterday",
    tags: ["notes", "budget"],
  },
  {
    filename: "meeting-2025-03.pdf",
    fileExtension: "pdf",
    directory: "~/Documents/meetings",
    snippet: "March planning session — budget review and projection updates",
    score: 0.852,
    fileSize: "4.5 MB",
    modifiedAt: "Mar 1",
    tags: ["meeting", "planning"],
  },
  {
    filename: "config/auth.ts",
    fileExtension: "ts",
    directory: "~/Documents/project/config",
    snippet: "/// Budget API authentication and rate-limit configuration",
    score: 0.784,
    fileSize: "2 KB",
    modifiedAt: "Last week",
    tags: ["code", "auth"],
  },
  {
    filename: "research-summary.docx",
    fileExtension: "docx",
    directory: "~/Documents/docs",
    snippet: "Market research summary with budget impact assessment",
    score: 0.74,
    fileSize: "850 KB",
    modifiedAt: "2 weeks ago",
    tags: ["research"],
  },
];

const PIPELINE_STAGES = ['Scan', 'Embed', 'Rank'] as const;

export function MixedFileSearchDemo() {
  const modeTokens = {
    text: 'text-accent-amber',
    border: 'border-accent-amber',
    bg: 'bg-accent-amber',
    bgFaint: 'bg-accent-amber/10',
    borderFaint: 'border-accent-amber/20',
    glow: 'shadow-[0_0_30px_rgba(246,185,76,0.15)]',
    insetGlow: 'shadow-[inset_4px_0_12px_-4px_rgba(246,185,76,0.2)]',
  };

  const qualityTokens = {
    text: 'text-accent-teal',
    bgFaint: 'bg-accent-teal/10',
    borderFaint: 'border-accent-teal/20',
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-lg border border-white/10 bg-bg-graphite-0 shadow-2xl">
      <div className="relative z-10 flex flex-1 flex-col items-center p-3 transition-all duration-300 md:p-4 lg:p-5">
        <div className="relative z-30 w-full max-w-2xl mt-0 transition-all duration-300">
          
          {/* Search Bar */}
          <div className={cn("relative bg-bg-graphite-1 border rounded-lg transition-all duration-300 border-opacity-50", modeTokens.text, modeTokens.border, modeTokens.glow)}>
            <div className="flex flex-col">
              {/* Main search row */}
              <div className="flex items-center px-4 py-3.5 gap-3">
                <Search className={cn("w-4.5 h-4.5 transition-colors shrink-0", modeTokens.text)} />
                <input
                  type="text"
                  value="quarterly budget projections"
                  readOnly
                  className="flex-1 bg-transparent text-fg-porcelain text-base font-medium focus:outline-none"
                />
                <button className="text-fg-muted/40 hover:text-fg-porcelain transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Controls row: folder path + dropdowns */}
              <div className="px-4 pb-3 flex items-center justify-between gap-3">
                {/* Folder path */}
                <div className="flex items-center gap-2 text-[10px] font-mono text-fg-muted/30 tracking-wide min-w-0 flex-[2.2]">
                  <Folder className="w-3 h-3 shrink-0 text-fg-muted/25" />
                  <span className="truncate">~/Documents</span>
                </div>

                {/* Dropdowns pushed to the right */}
                <div className="flex items-center gap-2.5 shrink-0">
                  {/* Mode Dropdown */}
                  <div className={cn("flex items-center gap-2 px-3 py-2 rounded-md transition-all text-[11px] font-mono font-bold tracking-wider border min-w-[176px]",
                    "border-white/8 text-fg-muted/55"
                  )}>
                    <Zap className={cn("w-3.5 h-3.5")} />
                    <span className="hidden sm:inline">MEMORY</span>
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </div>

                  {/* Quality Dropdown */}
                  <div className={cn("flex items-center gap-2 px-3 py-2 rounded-md transition-all text-[11px] font-mono font-bold tracking-wider border min-w-[176px]",
                    "border-white/8 text-fg-muted/55"
                  )}>
                    <Sparkles className={cn("w-3.5 h-3.5")} />
                    <span>AUTO</span>
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pipeline Status Bar */}
          <div className="mt-3 bg-bg-graphite-2 rounded-lg border border-white/[0.06] px-3.5 py-2.5 flex items-center justify-between text-[11px] font-mono">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className={cn("w-1.5 h-1.5 rounded-full", modeTokens.bg)} />
                <span className="text-fg-porcelain">Complete</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-fg-muted/30">
              <span>{HERO_RESULTS.length} results</span>
              <span className={modeTokens.text}>MEMORY</span>
              <span className={qualityTokens.text}>AUTO</span>
            </div>
          </div>

          {/* Results */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className={cn("text-[10px] font-bold tracking-[0.2em] uppercase", modeTokens.text)}>Results</div>
              <div className="flex items-center gap-1.5 text-[10px] text-fg-muted/30 font-mono">
                <Sparkles className="w-3 h-3" />
                <span>SEMANTIC</span>
              </div>
            </div>
            
            {HERO_RESULTS.map((result, i) => {
              const isSelected = i === 0;
              const scorePercent = Math.round(result.score * 100);

              return (
                <div
                  key={`${result.filename}-${i}`}
                  className={cn(
                    "group relative mb-1 rounded-lg border transition-all duration-200 overflow-hidden",
                    isSelected
                      ? `bg-bg-graphite-2/80 border-l-[3px] ${modeTokens.border} border-y-white/[0.04] border-r-white/[0.04] ${modeTokens.insetGlow}`
                      : "bg-bg-graphite-1/40 border-white/[0.06]"
                  )}
                >
                  <div className="flex items-center gap-3.5 px-4 py-3">
                    {/* Index */}
                    <span className="text-fg-muted/25 font-mono text-[11px] w-4 shrink-0 text-right">{i + 1}</span>

                    {/* File Icon */}
                    {createElement(getFileIcon(result.fileExtension as any), {
                      className: cn(
                        "w-4 h-4 shrink-0 transition-colors",
                        isSelected ? modeTokens.text : "text-fg-muted/40"
                      )
                    })}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-sm font-semibold truncate",
                          isSelected ? "text-fg-porcelain" : "text-fg-muted"
                        )}>
                          {result.filename}
                        </span>
                        {isSelected && (
                          <span className={cn("shrink-0 px-1.5 py-0.5 text-[9px] rounded-full border font-mono tracking-wider",
                            `${modeTokens.bgFaint} ${modeTokens.text} ${modeTokens.borderFaint}`
                          )}>
                            Best Match
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-fg-muted/25 font-mono mt-0.5">
                        <span className="truncate">{result.directory}</span>
                        <span className="shrink-0">&middot;</span>
                        <span className="shrink-0">{result.fileSize}</span>
                        <span className="shrink-0">&middot;</span>
                        <span className="shrink-0">{result.modifiedAt}</span>
                      </div>
                    </div>

                    {/* Score Badge */}
                    <div className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-mono font-bold border shrink-0 tabular-nums",
                      isSelected
                        ? `${modeTokens.bgFaint} ${modeTokens.text} ${modeTokens.borderFaint}`
                      : scorePercent >= 70
                          ? `${qualityTokens.bgFaint} ${qualityTokens.text} ${qualityTokens.borderFaint}`
                          : "bg-white/[0.02] text-fg-muted/30 border-white/[0.04]"
                    )}>
                      {scorePercent}%
                    </div>

                    {/* Expand chevron */}
                    <ChevronDown className={cn(
                      "w-3.5 h-3.5 shrink-0 transition-all",
                      isSelected && "rotate-180",
                      isSelected ? "text-fg-muted/40" : "text-fg-muted/15"
                    )} />
                  </div>

                  {/* Expanded content */}
                  {isSelected && (
                    <div className="overflow-hidden">
                      <div className="px-4 pb-3 pt-1 ml-[52px] border-t border-white/[0.04]">
                        <p className="text-[11px] text-fg-muted/55 leading-relaxed font-mono">
                          {result.snippet}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {result.tags.map((tag: string) => (
                            <span
                              key={tag}
                              className={cn(
                                "px-1.5 py-0.5 text-[9px] font-mono rounded border tracking-wider",
                                `${qualityTokens.bgFaint} ${qualityTokens.text} ${qualityTokens.borderFaint}`
                              )}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
