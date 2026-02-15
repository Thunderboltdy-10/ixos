"use client";

import type { CSSProperties } from "react";
import { FadeInView } from "@/components/effects/FadeInView";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { Layers, FolderOpen, GitBranch, Clock, Tag, ArrowUpRight } from "lucide-react";
import Link from "next/link";

const DEMO_WORKSTREAMS = [
  {
    name: "Q4 Financial Review",
    fileCount: 12,
    lastActive: "2 hours ago",
    tags: ["finance", "quarterly"],
    color: "border-accent-amber/30",
    tagColor: "text-accent-amber bg-accent-amber/10 border-accent-amber/20",
    accentRgb: "246,185,76",
  },
  {
    name: "API v3 Migration",
    fileCount: 24,
    lastActive: "45 min ago",
    tags: ["engineering", "api"],
    color: "border-accent-teal/30",
    tagColor: "text-accent-teal bg-accent-teal/10 border-accent-teal/20",
    accentRgb: "20,184,166",
  },
  {
    name: "Client Onboarding - Acme",
    fileCount: 8,
    lastActive: "1 day ago",
    tags: ["client", "onboarding"],
    color: "border-accent-amber/20",
    tagColor: "text-accent-amber bg-accent-amber/10 border-accent-amber/20",
    accentRgb: "246,185,76",
  },
];

export function WorkstreamsSection() {
  return (
    <div className="relative" id="workstreams-section">
      <SectionDivider accent="amber" label="WORKSTREAMS" />

      <div className="container mx-auto px-6 py-24">
        <FadeInView direction="up">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[10px] font-mono tracking-[0.24em] text-accent-amber/90 uppercase">
              Context-Aware Grouping
            </p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
              Files that{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-[1.08em] font-semibold text-accent-amber">belong together</span>
                <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-accent-amber/40 rounded-full" />
              </span>
              , stay together
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-fg-muted/80">
              Workstreams group files by project context, not folder structure. Build them automatically
              from activity or seed them from recent files, then jump back into any workflow in one click.
            </p>
          </div>
        </FadeInView>

        <div className="mx-auto mt-14 max-w-4xl">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Workstream cards */}
            <FadeInView direction="up" delay={100}>
              <div className="space-y-3">
                {DEMO_WORKSTREAMS.map((ws) => (
                  <article
                    key={ws.name}
                    className={`rounded-sm border ${ws.color} bg-bg-graphite-1/50 p-5 group hover:bg-bg-graphite-1/70 transition-all hover-glow-subtle`}
                    style={{ "--accent-rgb": ws.accentRgb } as CSSProperties}
                  >
                    <div className="mb-3 h-[2px] rounded-full bg-gradient-to-r from-accent-amber to-transparent" />
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent-amber/8 border border-accent-amber/15">
                          <FolderOpen className="w-4 h-4 text-accent-amber/70" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-fg-porcelain group-hover:text-white transition-colors">
                            {ws.name}
                          </h4>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-fg-muted/40 font-mono">
                            <span className="flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              {ws.fileCount} files
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {ws.lastActive}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-fg-muted/20 group-hover:text-accent-amber/60 transition-colors shrink-0" />
                    </div>
                    <div className="mt-3 flex items-center gap-1.5">
                      {ws.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`px-1.5 py-0.5 text-[9px] font-mono rounded border tracking-wider ${ws.tagColor}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <Link href="/download" className="mt-3 inline-block text-xs font-mono text-accent-amber hover:text-accent-amber-glow transition-colors">
                      Open Workstream Context
                    </Link>
                    <p className="mt-2 text-[11px] font-mono text-accent-amber/80">PRIMARY OUTCOME: Resume a project instantly.</p>
                  </article>
                ))}
              </div>
            </FadeInView>

            {/* Feature explanation */}
            <FadeInView direction="up" delay={200}>
              <div className="space-y-5 lg:pt-2">
                <article className="rounded-sm border border-white/10 bg-bg-graphite-1/40 p-6 hover-glow-subtle" style={{ "--accent-rgb": "246,185,76" } as CSSProperties}>
                  <div className="flex items-center gap-3 mb-4">
                    <GitBranch className="w-5 h-5 text-accent-amber/70" />
                    <h4 className="text-base font-semibold text-fg-porcelain">Automatic Grouping</h4>
                  </div>
                  <p className="text-sm text-fg-muted/65 leading-relaxed">
                    Ixos detects file relationships through local search and file-open behavior.
                    Re-cluster for automatic grouping, or create manual streams by selecting recent files.
                  </p>
                </article>

                <article className="rounded-sm border border-white/10 bg-bg-graphite-1/40 p-6 hover-glow-subtle" style={{ "--accent-rgb": "124,92,255" } as CSSProperties}>
                  <div className="flex items-center gap-3 mb-4">
                    <Tag className="w-5 h-5 text-accent-amber/70" />
                    <h4 className="text-base font-semibold text-fg-porcelain">Connections + Reorganization</h4>
                  </div>
                  <p className="text-sm text-fg-muted/65 leading-relaxed">
                    Workstreams can span Documents, Downloads, Desktop, and project roots.
                    Today view adds a connection map and folder-move recommendations so users can
                    clean up structure based on repeat behavior.
                  </p>
                  <div className="mt-4 rounded-sm border border-white/8 bg-bg-graphite-0/45 px-3 py-2">
                    <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-fg-muted/60">graph_edges</div>
                    <div className="mt-1 text-[11px] font-mono text-fg-muted/70">
                      notes.md {"->"} roadmap.md (0.82) | nda.pdf {"->"} invoice.xlsx (0.71)
                    </div>
                  </div>
                </article>

                <div className="rounded-lg border border-accent-violet/25 bg-accent-violet/[0.08] px-5 py-4">
                  <p className="text-[11px] text-fg-muted/50 leading-relaxed">
                    <span className="text-accent-violet font-semibold">Pro feature</span> &mdash; Workstreams
                    + Ask Mode share the same activity graph. The more you use Ixos, the better it predicts
                    what to open next and how to reorganize your files.
                  </p>
                </div>
              </div>
            </FadeInView>
          </div>
        </div>
      </div>
    </div>
  );
}
