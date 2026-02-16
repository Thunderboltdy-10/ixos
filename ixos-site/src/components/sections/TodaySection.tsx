"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileText, Sparkles } from "lucide-react";
import { FadeInView } from "@/components/effects/FadeInView";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { cn } from "@/lib/utils";

type BriefItem = {
  id: string;
  file: string;
  touched: string;
  signal: string;
  nextAction: string;
  why: string[];
};

const BRIEF_ITEMS: BriefItem[] = [
  {
    id: "q4",
    file: "Q4_2025_Summary.pdf",
    touched: "12 min ago",
    signal: "Opened 4 times this week.",
    nextAction: "Compare with forecast_v3.xlsx and draft a one-paragraph summary.",
    why: ["Recent edits", "Cross-file links", "High open frequency"],
  },
  {
    id: "auth",
    file: "auth_api_reference.md",
    touched: "1 hr ago",
    signal: "Touched after release-note updates.",
    nextAction: "Ask Mode: list auth changes across the last two releases.",
    why: ["Release proximity", "Onboarding blockers", "Thread priority"],
  },
  {
    id: "standup",
    file: "team_standup_notes.md",
    touched: "3 hr ago",
    signal: "Contains open CI follow-ups.",
    nextAction: "Resume deployment thread and open the latest CI failure logs.",
    why: ["Open blockers", "Unfinished thread", "Team impact"],
  },
];

const TODAY_TAKEAWAYS = [
  "One ranked next action",
  "Picked from local activity",
  "Ready to resume in one click",
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
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-accent-teal/85">
              Pro Workflow Memory
            </p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
              One screen. One next move.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-fg-muted/75">
              Today compresses your recent work into a single action worth doing now.
            </p>
          </div>
        </FadeInView>

        <div className="mx-auto mt-12 grid max-w-5xl gap-5 lg:grid-cols-2">
          <FadeInView direction="up" delay={120}>
            <article className="rounded-sm border border-accent-teal/28 bg-bg-graphite-1/72">
              <div className="flex items-center justify-between border-b border-accent-teal/18 px-5 py-3">
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-accent-teal/78">
                  <Sparkles className="h-3.5 w-3.5" />
                  today_brief
                </div>
                <span className="text-[10px] font-mono text-fg-muted/42">today://context</span>
              </div>

              <div className="space-y-2 p-4">
                {BRIEF_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveId(item.id)}
                    className={cn(
                      "w-full rounded-sm border px-4 py-3 text-left transition-all",
                      item.id === active?.id
                        ? "border-accent-teal/40 bg-accent-teal/9"
                        : "border-white/10 bg-bg-graphite-0/45 hover:border-white/22 hover:bg-bg-graphite-0/72"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <FileText className="mt-0.5 h-4 w-4 text-accent-teal/80" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-semibold text-fg-porcelain">{item.file}</p>
                          <span className="shrink-0 text-[10px] font-mono text-fg-muted/45">{item.touched}</span>
                        </div>
                        <p className="mt-1 text-xs text-fg-muted/74">{item.signal}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </article>
          </FadeInView>

          <FadeInView direction="up" delay={180}>
            <article className="rounded-sm border border-white/14 bg-bg-graphite-1/76 p-5">
              <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-accent-teal/78">Main Point</p>
              <h3 className="mt-3 text-lg font-semibold text-fg-porcelain">
                Resume the highest-value thread first
              </h3>

              <div className="mt-4 rounded-sm border border-accent-teal/24 bg-accent-teal/9 px-4 py-3">
                <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-accent-teal/80">Suggested Next</p>
                <p className="mt-2 text-sm text-fg-muted/84">{active?.nextAction}</p>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {active?.why.map((reason) => (
                  <div key={reason} className="rounded-sm border border-white/10 bg-bg-graphite-0/55 px-3 py-2 text-center">
                    <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-fg-muted/62">{reason}</p>
                  </div>
                ))}
              </div>

              <Link
                href="/download"
                className="mt-5 inline-flex items-center gap-1.5 text-xs font-mono text-accent-teal hover:text-accent-teal-glow transition-colors"
              >
                Open Today in desktop
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </article>
          </FadeInView>
        </div>

        <FadeInView direction="up" delay={240}>
          <div className="mx-auto mt-5 grid max-w-5xl gap-2 md:grid-cols-3">
            {TODAY_TAKEAWAYS.map((takeaway) => (
              <article key={takeaway} className="rounded-sm border border-white/10 bg-bg-graphite-1/50 px-4 py-3">
                <p className="text-[11px] font-mono text-fg-muted/68">{takeaway}</p>
              </article>
            ))}
          </div>
        </FadeInView>
      </div>
    </div>
  );
}