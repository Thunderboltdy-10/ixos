"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Command, FileText, Sparkles } from "lucide-react";
import { FadeInView } from "@/components/effects/FadeInView";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { cn } from "@/lib/utils";

type BriefItem = {
  id: string;
  file: string;
  touched: string;
  cue: string;
  action: string;
  command: string;
  reasons: string[];
  evidence: string[];
};

const BRIEF_ITEMS: BriefItem[] = [
  {
    id: "q4",
    file: "Q4_2025_Summary.pdf",
    touched: "12m",
    cue: "Opened 4x this week",
    action: "Compare with forecast_v3.xlsx and draft one paragraph for the exec summary.",
    command: "ixos ask \"summarize q4 variance using forecast_v3.xlsx\"",
    reasons: ["Highest reopen frequency", "Cross-file edits", "Board deadline today"],
    evidence: ["forecast_v3.xlsx", "board_packet_v2.md", "open-source_notes_2026.md"],
  },
  {
    id: "auth",
    file: "auth_api_reference.md",
    touched: "1h",
    cue: "Release-note adjacency",
    action: "List auth changes that block onboarding and generate a short migration note.",
    command: "ixos ask \"auth changes since v3.0 with migration impact\"",
    reasons: ["Direct unblock path", "Recent release edits", "Open onboarding thread"],
    evidence: ["release_notes_v3.md", "auth_breaking_changes.md", "onboarding_checklist.md"],
  },
  {
    id: "standup",
    file: "team_standup_notes.md",
    touched: "3h",
    cue: "Open CI blockers",
    action: "Resume deployment thread and isolate the current failing workflow run.",
    command: "ixos ask \"show unresolved CI blockers from standup notes\"",
    reasons: ["Team-visible blocker", "Unfinished thread", "High impact to release"],
    evidence: ["deployment_playbook.md", "ci_failures_2026_02_16.md", "release_checklist.md"],
  },
];

export function TodaySection() {
  const [activeId, setActiveId] = useState(BRIEF_ITEMS[0]?.id ?? "q4");
  const active = useMemo(
    () => BRIEF_ITEMS.find((item) => item.id === activeId) ?? BRIEF_ITEMS[0],
    [activeId]
  );

  return (
    <div className="relative" id="today-section">
      <SectionDivider accent="teal" label="TODAY_VIEW" />

      <div className="container mx-auto px-6 py-24">
        <FadeInView direction="up">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-accent-teal/85">Pro Workflow Memory</p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl">One ranked move, <span className="heading-gradient-teal text-[1.05em]">ready now</span>.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-fg-muted/75">Today compresses noise into one action worth doing next.</p>
          </div>
        </FadeInView>

        <FadeInView direction="up" delay={120}>
          <article className="mx-auto mt-11 max-w-6xl rounded-sm border border-white/12 bg-bg-graphite-1/76">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-accent-teal/80">ranked_today_feed</p>
              <span className="text-[10px] font-mono text-fg-muted/45">today://next</span>
            </div>

            <div className="grid gap-4 p-4 lg:grid-cols-[1.08fr_0.92fr]">
              <section className="rounded-sm border border-white/10 bg-bg-graphite-0/58 p-3">
                <p className="px-1 text-[10px] font-mono uppercase tracking-[0.13em] text-fg-muted/62">Ranked files</p>
                <div className="mt-2 space-y-2">
                  {BRIEF_ITEMS.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveId(item.id)}
                      className={cn(
                        "w-full rounded-sm border px-3 py-3 text-left transition-all",
                        item.id === active?.id
                          ? "border-accent-teal/38 bg-accent-teal/10"
                          : "border-white/10 bg-bg-graphite-1/50 hover:border-white/24"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-5 min-w-[1.4rem] items-center justify-center rounded-sm border border-white/16 px-1 text-[10px] font-mono text-fg-muted/70">
                          {index + 1}
                        </span>
                        <p className="truncate text-sm font-semibold text-fg-porcelain">{item.file}</p>
                        <span className="ml-auto text-[10px] font-mono text-fg-muted/58">{item.touched}</span>
                      </div>
                      <p className="mt-1.5 text-[11px] text-fg-muted/70">{item.cue}</p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-sm border border-accent-teal/26 bg-accent-teal/8 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-accent-teal/82">Main action</p>
                  <Sparkles className="h-3.5 w-3.5 text-accent-teal/72" />
                </div>
                <p className="mt-3 text-lg font-semibold leading-tight text-fg-porcelain">{active?.action}</p>

                <div className="mt-4 rounded-sm border border-accent-teal/20 bg-bg-graphite-0/70 px-3 py-2.5">
                  <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-accent-teal/78">Next command</p>
                  <div className="mt-1 flex items-start gap-2 text-xs text-fg-muted/78">
                    <Command className="mt-0.5 h-3.5 w-3.5 text-accent-teal/82" />
                    <code className="block overflow-x-auto font-mono">{active?.command}</code>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {active?.reasons.map((reason) => (
                    <div key={reason} className="rounded-sm border border-white/12 bg-bg-graphite-1/65 px-2.5 py-1.5">
                      <p className="text-[10px] font-mono text-fg-muted/70">{reason}</p>
                    </div>
                  ))}
                </div>

                <Link href="/download" className="mt-4 inline-flex items-center gap-1.5 text-xs font-mono text-accent-teal hover:text-accent-teal-glow transition-colors">
                  Open Today in desktop
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </section>
            </div>

            <div className="border-t border-white/10 p-4">
              <p className="text-[10px] font-mono uppercase tracking-[0.13em] text-fg-muted/62">Evidence path</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {active?.evidence.map((item) => (
                  <div key={item} className="inline-flex items-center gap-1.5 rounded-sm border border-white/10 bg-bg-graphite-0/58 px-3 py-1.5">
                    <FileText className="h-3 w-3 text-accent-teal/75" />
                    <span className="text-[11px] text-fg-muted/74">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </FadeInView>
      </div>
    </div>
  );
}
