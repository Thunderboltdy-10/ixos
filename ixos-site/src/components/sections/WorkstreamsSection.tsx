"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, FolderTree, Link2, Sparkles, Target } from "lucide-react";
import { FadeInView } from "@/components/effects/FadeInView";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { cn } from "@/lib/utils";

type Stream = {
  id: string;
  name: string;
  files: number;
  cue: string;
  mainPoint: string;
  askPrompt: string;
  evidence: string[];
};

const STREAMS: Stream[] = [
  {
    id: "finance",
    name: "Q4 Financial Review",
    files: 12,
    cue: "Repeated edits in board packet and forecast files.",
    mainPoint: "Close the variance narrative before sharing the board summary.",
    askPrompt: "Ask for variance explanation against last quarter.",
    evidence: ["forecast_v3.xlsx", "board_packet_v2.md", "q4_summary.pdf"],
  },
  {
    id: "migration",
    name: "API v3 Migration",
    files: 24,
    cue: "Clustered from auth, endpoint, and migration checklist updates.",
    mainPoint: "Resume from auth changes and clear downstream onboarding blockers.",
    askPrompt: "List unresolved auth migration tasks and impacted files.",
    evidence: ["migration_plan.md", "auth_breaking_changes.md", "openapi_v3.yaml"],
  },
  {
    id: "client",
    name: "Client Onboarding - Acme",
    files: 8,
    cue: "Grouped from contracts, kickoff notes, and legal follow-ups.",
    mainPoint: "Unblock signature and approval tasks first.",
    askPrompt: "Show missing signatures and next legal follow-up actions.",
    evidence: ["acme_nda.pdf", "kickoff_notes.md", "onboarding_checklist.md"],
  },
];

const VALUE_POINTS = [
  { title: "One stream", detail: "One executable thread", icon: Target },
  { title: "Behavior-based", detail: "Built from edit patterns", icon: FolderTree },
  { title: "Evidence-linked", detail: "Ask prompts stay grounded", icon: Link2 },
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
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-accent-teal/85">
              Project Context Graph
            </p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
              One stream. One executable thread.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-fg-muted/75">
              Start anywhere and continue with the exact files and prompt that matter next.
            </p>
          </div>
        </FadeInView>

        <FadeInView direction="up" delay={120}>
          <div className="mx-auto mt-9 grid max-w-5xl gap-2 md:grid-cols-3">
            {VALUE_POINTS.map((point) => {
              const Icon = point.icon;
              return (
                <article key={point.title} className="rounded-sm border border-white/10 bg-bg-graphite-1/50 px-4 py-3">
                  <div className="flex items-center gap-2 text-accent-teal/82">
                    <Icon className="h-4 w-4" />
                    <p className="text-[11px] font-mono uppercase tracking-[0.14em]">{point.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-fg-muted/68">{point.detail}</p>
                </article>
              );
            })}
          </div>
        </FadeInView>

        <div className="mx-auto mt-6 grid max-w-5xl gap-5 lg:grid-cols-2">
          <FadeInView direction="up" delay={180}>
            <article className="rounded-sm border border-accent-teal/28 bg-bg-graphite-1/72 p-4">
              <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-accent-teal/76">
                Active streams
              </p>
              <div className="mt-3 space-y-2">
                {STREAMS.map((stream) => (
                  <button
                    key={stream.id}
                    type="button"
                    onClick={() => setActiveId(stream.id)}
                    className={cn(
                      "w-full rounded-sm border px-3 py-3 text-left transition-all",
                      stream.id === active?.id
                        ? "border-accent-teal/40 bg-accent-teal/10"
                        : "border-white/10 bg-bg-graphite-0/45 hover:border-white/22 hover:bg-bg-graphite-0/72"
                    )}
                  >
                    <p className="text-sm font-semibold text-fg-porcelain">{stream.name}</p>
                    <p className="mt-1 text-[11px] text-fg-muted/68">{stream.files} linked files</p>
                  </button>
                ))}
              </div>
            </article>
          </FadeInView>

          <FadeInView direction="up" delay={220}>
            <article className="rounded-sm border border-white/14 bg-bg-graphite-1/76 p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-fg-porcelain">{active?.name}</h3>
                <span className="text-[10px] font-mono text-fg-muted/45">stream://{active?.id}</span>
              </div>

              <p className="mt-3 text-sm text-fg-muted/78">{active?.cue}</p>

              <div className="mt-4 rounded-sm border border-accent-teal/24 bg-accent-teal/9 px-4 py-3">
                <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-accent-teal/82">Main action</p>
                <p className="mt-2 text-sm text-fg-muted/84">{active?.mainPoint}</p>
              </div>

              <div className="mt-4 rounded-sm border border-white/10 bg-bg-graphite-0/55 px-4 py-3">
                <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-muted/62">Ask prompt</p>
                <p className="mt-2 text-xs text-fg-muted/74">{active?.askPrompt}</p>
              </div>

              <div className="mt-4 space-y-2">
                {active?.evidence.map((file) => (
                  <div key={file} className="flex items-center justify-between rounded-sm border border-white/10 bg-bg-graphite-0/55 px-3 py-2">
                    <span className="text-xs text-fg-muted/76">{file}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-fg-muted/45" />
                  </div>
                ))}
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
  );
}