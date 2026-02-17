"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, GitBranch, Radar, Sparkles } from "lucide-react";
import { FadeInView } from "@/components/effects/FadeInView";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { cn } from "@/lib/utils";

type Stream = {
  id: string;
  name: string;
  files: number;
  objective: string;
  askPrompt: string;
  cue: string;
  evidence: string[];
};

const STREAMS: Stream[] = [
  {
    id: "finance",
    name: "Q4 Financial Review",
    files: 12,
    objective: "Close the variance narrative before board share.",
    askPrompt: "Ask for variance explanation against last quarter.",
    cue: "Repeated edits in board packet and forecast files.",
    evidence: ["forecast_v3.xlsx", "board_packet_v2.md", "q4_summary.pdf"],
  },
  {
    id: "migration",
    name: "API v3 Migration",
    files: 24,
    objective: "Resume from auth changes and clear blockers first.",
    askPrompt: "List unresolved auth migration tasks by impact.",
    cue: "Clustered from auth docs, checklist edits, and endpoint updates.",
    evidence: ["migration_plan.md", "auth_breaking_changes.md", "openapi_v3.yaml"],
  },
  {
    id: "client",
    name: "Client Onboarding - Acme",
    files: 8,
    objective: "Unblock signatures and ship kickoff actions.",
    askPrompt: "Show missing signatures and next legal follow-ups.",
    cue: "Grouped from NDA docs, kickoff notes, and legal comments.",
    evidence: ["acme_nda.pdf", "kickoff_notes.md", "onboarding_checklist.md"],
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
      <SectionDivider accent="amber" label="WORKSTREAMS" />

      <div className="container mx-auto px-6 py-24">
        <FadeInView direction="up">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-accent-amber/85">Project Context Graph</p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl">One stream. One <span className="heading-gradient-amber text-[1.05em]">executable thread</span>.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-fg-muted/75">Pick a stream and continue with the exact evidence path it was built from.</p>
          </div>
        </FadeInView>

        <FadeInView direction="up" delay={120}>
          <article className="mx-auto mt-11 max-w-6xl rounded-sm border border-white/12 bg-bg-graphite-1/76">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-accent-amber/82">stream_switchboard</p>
              <span className="text-[10px] font-mono text-fg-muted/45">stream://active</span>
            </div>

            <div className="grid gap-2 border-b border-white/10 p-3 md:grid-cols-3">
              {STREAMS.map((stream) => (
                <button
                  key={stream.id}
                  type="button"
                  onClick={() => setActiveId(stream.id)}
                  className={cn(
                    "rounded-sm border px-3 py-3 text-left transition-all",
                    stream.id === active?.id
                      ? "border-accent-amber/38 bg-accent-amber/10"
                      : "border-white/10 bg-bg-graphite-0/45 hover:border-white/24"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-fg-porcelain">{stream.name}</p>
                    <span className="rounded-sm border border-white/12 px-2 py-0.5 text-[10px] font-mono text-fg-muted/70">{stream.files}</span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-fg-muted/68">{stream.cue}</p>
                </button>
              ))}
            </div>

            <div className="grid gap-4 p-4 lg:grid-cols-[0.9fr_1.1fr]">
              <section className="rounded-sm border border-white/10 bg-bg-graphite-0/58 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-mono uppercase tracking-[0.13em] text-fg-muted/62">Execution topology</p>
                  <GitBranch className="h-3.5 w-3.5 text-accent-amber/75" />
                </div>

                <div className="relative mt-4 pl-7">
                  <div className="absolute left-[11px] top-2 bottom-2 w-px bg-accent-amber/30" />
                  {active?.evidence.map((item, index) => (
                    <div key={item} className="relative mb-3 last:mb-0">
                      <span className="absolute left-[-19px] top-2 h-2.5 w-2.5 rounded-sm border border-accent-amber/45 bg-accent-amber/35" />
                      <div className="rounded-sm border border-white/10 bg-bg-graphite-1/60 px-3 py-2">
                        <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-fg-muted/55">Node {index + 1}</p>
                        <p className="mt-1 text-sm text-fg-muted/80">{item}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-sm border border-accent-amber/22 bg-accent-amber/8 px-3 py-2.5">
                  <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-accent-amber/82">Thread cue</p>
                  <p className="mt-1 text-sm text-fg-muted/84">{active?.cue}</p>
                </div>
              </section>

              <section className="rounded-sm border border-accent-amber/22 bg-accent-amber/7 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-mono uppercase tracking-[0.13em] text-accent-amber/82">Thread operator</p>
                  <Radar className="h-3.5 w-3.5 text-accent-amber/76" />
                </div>

                <h3 className="mt-3 text-2xl font-semibold text-fg-porcelain">{active?.name}</h3>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-sm border border-accent-amber/22 bg-bg-graphite-0/62 p-3">
                    <p className="text-[10px] font-mono uppercase tracking-[0.11em] text-accent-amber/76">Main action</p>
                    <p className="mt-2 text-sm text-fg-muted/85">{active?.objective}</p>
                  </div>
                  <div className="rounded-sm border border-white/10 bg-bg-graphite-1/62 p-3">
                    <p className="text-[10px] font-mono uppercase tracking-[0.11em] text-fg-muted/62">Ask prompt</p>
                    <p className="mt-2 text-sm text-fg-muted/80">{active?.askPrompt}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-sm border border-white/10 bg-bg-graphite-0/62 p-3">
                  <p className="text-[10px] font-mono uppercase tracking-[0.11em] text-fg-muted/62">Evidence handoff</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {active?.evidence.map((item, index) => (
                      <div key={item} className="inline-flex items-center gap-1.5">
                        <span className="rounded-sm border border-white/12 px-2 py-1 text-[11px] text-fg-muted/76">{item}</span>
                        {index < (active?.evidence.length ?? 0) - 1 ? (
                          <span className="text-fg-muted/42">{"->"}</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                <Link href="/download" className="mt-4 inline-flex items-center gap-1.5 text-xs font-mono text-accent-amber hover:text-accent-amber/80 transition-colors">
                  Open Workstreams in desktop
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </section>
            </div>
          </article>
        </FadeInView>

        <FadeInView direction="up" delay={220}>
          <div className="mx-auto mt-4 max-w-6xl rounded-sm border border-accent-amber/20 bg-accent-amber/7 px-4 py-2.5">
            <p className="text-[11px] text-fg-muted/74">
              <Sparkles className="mr-1 inline h-3 w-3 text-accent-amber/75" />
              Stream recommendations come from repeated open/edit behavior, not folder names.
            </p>
          </div>
        </FadeInView>
      </div>
    </div>
  );
}
