"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowUpRight, FolderOpen, GitBranch, Layers, Sparkles, Target } from "lucide-react";
import { FadeInView } from "@/components/effects/FadeInView";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { cn } from "@/lib/utils";

type Stream = {
  id: string;
  name: string;
  fileCount: number;
  activeNow: boolean;
  tags: string[];
  summary: string;
  suggestions: string[];
  connected: string[];
};

const STREAMS: Stream[] = [
  {
    id: "finance",
    name: "Q4 Financial Review",
    fileCount: 12,
    activeNow: true,
    tags: ["finance", "quarterly"],
    summary: "Built from repeated edits between reports, forecast sheets, and board prep docs.",
    suggestions: ["Ask for variance explanation against last quarter", "Resume from board_packet_v2.md"],
    connected: ["forecast_v3.xlsx", "board_packet_v2.md", "q4_summary.pdf"],
  },
  {
    id: "migration",
    name: "API v3 Migration",
    fileCount: 24,
    activeNow: true,
    tags: ["engineering", "api"],
    summary: "Auto-clustered from commit-linked docs, migration plan, and service contract files.",
    suggestions: ["Open auth_breaking_changes.md", "Compare v2-v3 endpoint coverage"],
    connected: ["migration_plan.md", "auth_breaking_changes.md", "openapi_v3.yaml"],
  },
  {
    id: "client",
    name: "Client Onboarding - Acme",
    fileCount: 8,
    activeNow: false,
    tags: ["client", "legal"],
    summary: "Merged from contracts, onboarding checklist, and kickoff notes across folders.",
    suggestions: ["Review missing signature blocks", "Ask for unresolved onboarding actions"],
    connected: ["acme_nda.pdf", "kickoff_notes.md", "onboarding_checklist.md"],
  },
];

export function WorkstreamsSection() {
  const [activeId, setActiveId] = useState(STREAMS[0]?.id ?? "finance");
  const active = useMemo(
    () => STREAMS.find((stream) => stream.id === activeId) ?? STREAMS[0],
    [activeId]
  );

  return (
    <div className="relative" id="workstreams-section">
      <SectionDivider accent="teal" label="WORKSTREAMS" />

      <div className="container mx-auto px-6 py-24">
        <FadeInView direction="up">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[10px] font-mono tracking-[0.24em] text-accent-teal/90 uppercase">
              Project Context Graph
            </p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
              Work in streams, not folders
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-fg-muted/80">
              Workstreams group files by behavior and semantic overlap. Start from any stream and
              continue with relevant files, suggestions, and Ask Mode prompts in one surface.
            </p>
          </div>
        </FadeInView>

        <div className="mx-auto mt-12 grid max-w-6xl gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <FadeInView direction="up" delay={120}>
            <article className="rounded-xl border border-accent-teal/24 bg-bg-graphite-1/65 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-fg-porcelain">Active workstreams</h3>
                <Layers className="h-4 w-4 text-accent-teal/70" />
              </div>

              <div className="mt-4 space-y-2">
                {STREAMS.map((stream) => (
                  <button
                    key={stream.id}
                    type="button"
                    onClick={() => setActiveId(stream.id)}
                    className={cn(
                      "w-full rounded-md border px-3 py-3 text-left transition-all",
                      stream.id === active?.id
                        ? "border-accent-teal/40 bg-accent-teal/10"
                        : "border-white/10 bg-bg-graphite-0/40 hover:border-white/25 hover:bg-bg-graphite-0/75"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-fg-porcelain">{stream.name}</p>
                        <p className="mt-1 text-[11px] text-fg-muted/70">{stream.fileCount} files linked</p>
                      </div>
                      {stream.activeNow ? (
                        <span className="rounded-full border border-accent-teal/35 bg-accent-teal/12 px-2 py-0.5 text-[9px] font-mono text-accent-teal">
                          LIVE
                        </span>
                      ) : (
                        <span className="rounded-full border border-white/20 px-2 py-0.5 text-[9px] font-mono text-fg-muted/55">
                          IDLE
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {stream.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded border border-accent-teal/20 bg-accent-teal/8 px-2 py-0.5 text-[9px] font-mono text-accent-teal/85"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </article>
          </FadeInView>

          <div className="grid gap-5">
            <FadeInView direction="up" delay={180}>
              <article
                className="relative overflow-hidden rounded-xl border border-white/12 bg-bg-graphite-1/70 p-6"
                style={{ "--accent-rgb": "20,184,166" } as CSSProperties}
              >
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_75%_0%,rgba(20,184,166,0.08),transparent_60%)]" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-accent-teal/80" />
                      <h3 className="text-lg font-semibold text-fg-porcelain">{active?.name}</h3>
                    </div>
                    <span className="text-[10px] font-mono text-fg-muted/40">stream://{active?.id}</span>
                  </div>
                  <p className="mt-3 text-sm text-fg-muted/78">{active?.summary}</p>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {active?.suggestions.map((suggestion) => (
                      <div key={suggestion} className="rounded-md border border-accent-teal/20 bg-accent-teal/6 px-3 py-2">
                        <p className="text-xs text-fg-muted/82">{suggestion}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button className="rounded-md border border-accent-teal/30 bg-accent-teal/12 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.12em] text-accent-teal">
                      Ask this stream
                    </button>
                    <button className="rounded-md border border-white/15 bg-bg-graphite-0/55 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.12em] text-fg-muted/75">
                      Re-cluster files
                    </button>
                    <button className="rounded-md border border-white/15 bg-bg-graphite-0/55 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.12em] text-fg-muted/75">
                      Pin stream
                    </button>
                  </div>
                </div>
              </article>
            </FadeInView>

            <FadeInView direction="up" delay={240}>
              <article className="rounded-xl border border-white/12 bg-bg-graphite-1/70 p-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-fg-porcelain">Connected files</h4>
                  <GitBranch className="h-4 w-4 text-accent-teal/70" />
                </div>
                <div className="mt-4 space-y-2">
                  {active?.connected.map((file) => (
                    <div key={file} className="flex items-center justify-between rounded-md border border-white/10 bg-bg-graphite-0/50 px-3 py-2">
                      <span className="text-xs text-fg-muted/75">{file}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-fg-muted/40" />
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-md border border-accent-teal/18 bg-accent-teal/6 px-3 py-2">
                  <Target className="h-3.5 w-3.5 text-accent-teal/75" />
                  <p className="text-[11px] text-fg-muted/75">
                    Move recommendations are generated from repeated open/edit patterns.
                  </p>
                </div>
                <Link
                  href="/download"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-mono text-accent-teal hover:text-accent-teal-glow transition-colors"
                >
                  Open Workstreams in desktop
                  <Sparkles className="h-3.5 w-3.5" />
                </Link>
              </article>
            </FadeInView>
          </div>
        </div>
      </div>
    </div>
  );
}
