"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock3, FileText, Layers3, Sparkles } from "lucide-react";
import { FadeInView } from "@/components/effects/FadeInView";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { cn } from "@/lib/utils";

type BriefItem = {
  id: string;
  file: string;
  touched: string;
  signal: string;
  focus: string;
  nextAction: string;
  stack: string[];
};

const BRIEF_ITEMS: BriefItem[] = [
  {
    id: "q4",
    file: "Q4_2025_Summary.pdf",
    touched: "12 min ago",
    signal: "Opened 4 times this week and linked in standup notes.",
    focus: "Finance stream has unresolved variance and board-ready summary gaps.",
    nextAction: "Compare with `forecast_v3.xlsx` and generate a one-paragraph executive summary.",
    stack: ["forecast_v3.xlsx", "board_packet_v2.md", "pricing_notes_2026.md"],
  },
  {
    id: "auth",
    file: "auth_api_reference.md",
    touched: "1 hr ago",
    signal: "Touched after release-note edits and onboarding blocker review.",
    focus: "Auth migration workstream has open tasks tied to endpoint changes.",
    nextAction: "Ask Mode: show auth changes across the last two release notes.",
    stack: ["release_notes_v3.md", "auth_breaking_changes.md", "onboarding_checklist.md"],
  },
  {
    id: "standup",
    file: "team_standup_notes.md",
    touched: "3 hr ago",
    signal: "Contains unresolved CI failures and deployment follow-ups.",
    focus: "Deployment thread has stale TODOs and missing owners.",
    nextAction: "Resume deployment stream and open the latest CI failure logs.",
    stack: ["deployment_playbook.md", "ci_failures_2026_02_16.md", "release_checklist.md"],
  },
];

const TODAY_METRICS = [
  { label: "Main point", value: "One next move", detail: "No dashboard wandering" },
  { label: "Source", value: "Local activity graph", detail: "Built from your edits" },
  { label: "Resume", value: "Thread-ready stack", detail: "Jump back in instantly" },
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
              Start from one clear next move
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-fg-muted/78">
              Today is not a generic dashboard. It collapses your latest edits into one ranked
              action so you can continue work without re-triaging context.
            </p>
          </div>
        </FadeInView>

        <div className="mx-auto mt-12 grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <FadeInView direction="up" delay={120}>
            <article className="rounded-sm border border-accent-teal/28 bg-bg-graphite-1/70">
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

              <div className="mt-4 rounded-sm border border-white/10 bg-bg-graphite-0/55 px-4 py-3">
                <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-muted/62">Why now</p>
                <p className="mt-2 text-xs text-fg-muted/74">{active?.focus}</p>
              </div>

              <div className="mt-4 flex items-center gap-2 text-[11px] text-fg-muted/55">
                <Clock3 className="h-3.5 w-3.5 text-accent-teal/75" />
                Derived from local activity graph
              </div>

              <div className="mt-5 rounded-sm border border-white/10 bg-bg-graphite-0/55 px-4 py-3">
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.12em] text-fg-muted/58">
                  <Layers3 className="h-3.5 w-3.5 text-accent-teal/75" />
                  Resume stack
                </div>
                <div className="mt-2 space-y-1">
                  {active?.stack.map((item) => (
                    <p key={item} className="text-xs text-fg-muted/72">{item}</p>
                  ))}
                </div>
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
          <div className="mx-auto mt-6 grid max-w-6xl gap-3 md:grid-cols-3">
            {TODAY_METRICS.map((metric) => (
              <article key={metric.label} className="rounded-sm border border-white/10 bg-bg-graphite-1/48 px-4 py-3">
                <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-muted/48">{metric.label}</p>
                <p className="mt-1 text-sm font-semibold text-fg-porcelain">{metric.value}</p>
                <p className="mt-1 text-xs text-fg-muted/65">{metric.detail}</p>
              </article>
            ))}
          </div>
        </FadeInView>
      </div>
    </div>
  );
}