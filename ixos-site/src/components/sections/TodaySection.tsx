"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, Calendar, Clock, FileText, Pin, Sparkles, Zap } from "lucide-react";
import { FadeInView } from "@/components/effects/FadeInView";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { cn } from "@/lib/utils";

type TodayMode = "brief" | "resume" | "ask";

const MODES: Array<{ id: TodayMode; label: string; hint: string }> = [
  { id: "brief", label: "Daily Brief", hint: "What changed since yesterday" },
  { id: "resume", label: "Resume Work", hint: "Jump back into active threads" },
  { id: "ask", label: "Ask Follow-up", hint: "Query with local evidence" },
];

const DAILY_BRIEF = [
  {
    id: "q4",
    file: "Q4_2025_Summary.pdf",
    summary: "Opened 4 times this week. Mentioned in standup notes and roadmap draft.",
    touched: "12 min ago",
    suggestions: ["Compare with forecast_v3.xlsx", "Draft exec summary in notes.md"],
  },
  {
    id: "auth",
    file: "auth_api_reference.md",
    summary: "Moved folders twice. Strong link to release notes and onboarding checklist.",
    touched: "1 hr ago",
    suggestions: ["Open release_checklist.md", "Ask: breaking auth changes since January"],
  },
  {
    id: "standup",
    file: "team_standup_notes.md",
    summary: "Contains unresolved blockers tied to CI failures and deployment tasks.",
    touched: "3 hr ago",
    suggestions: ["Open ci_failures.log", "Pin deployment_playbook.md"],
  },
];

const RESUME_STACK = [
  "deployment_playbook.md",
  "client_onboarding/nda.pdf",
  "pricing_notes_2026.md",
];

const ASK_PROMPTS = [
  "What changed in auth over the last two releases?",
  "Summarize blockers tied to CI failures this week.",
  "Show files connected to Q4 summary and contract updates.",
];

export function TodaySection() {
  const [mode, setMode] = useState<TodayMode>("brief");
  const [selectedId, setSelectedId] = useState(DAILY_BRIEF[0]?.id ?? "q4");

  const selected = useMemo(
    () => DAILY_BRIEF.find((item) => item.id === selectedId) ?? DAILY_BRIEF[0],
    [selectedId]
  );

  return (
    <div className="relative" id="today-section">
      <SectionDivider accent="teal" label="TODAY_VIEW" />

      <div className="container mx-auto px-6 py-24">
        <FadeInView direction="up">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[10px] font-mono tracking-[0.24em] text-accent-teal/90 uppercase">
              Pro Workflow Memory
            </p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
              Start with context, not tabs
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-fg-muted/80">
              Today consolidates the files you touched, what changed, and what to do next.
              It is built for real execution loops, not a generic dashboard.
            </p>
          </div>
        </FadeInView>

        <FadeInView direction="up" delay={120}>
          <div className="mx-auto mt-10 flex max-w-4xl flex-wrap justify-center gap-2">
            {MODES.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setMode(entry.id)}
                className={cn(
                  "rounded-md border px-4 py-2 text-left transition-all",
                  mode === entry.id
                    ? "border-accent-teal/45 bg-accent-teal/10 text-accent-teal"
                    : "border-white/10 bg-bg-graphite-1/40 text-fg-muted/70 hover:border-white/20 hover:text-fg-porcelain"
                )}
              >
                <p className="text-[11px] font-mono uppercase tracking-[0.12em]">{entry.label}</p>
                <p className="text-[11px]">{entry.hint}</p>
              </button>
            ))}
          </div>
        </FadeInView>

        <div className="mx-auto mt-12 grid max-w-6xl gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <FadeInView direction="up" delay={180}>
            <article
              className="relative overflow-hidden rounded-xl border border-accent-teal/30 bg-bg-graphite-0/95"
              style={{ "--accent-rgb": "20,184,166" } as CSSProperties}
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_20%_0%,rgba(20,184,166,0.08),transparent_60%)]" />
              <div className="relative z-10 border-b border-accent-teal/20 px-5 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-accent-teal/75">
                    <Calendar className="h-3.5 w-3.5" />
                    today://brief
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-fg-muted/40">
                    <Clock className="h-3.5 w-3.5" />
                    08:41 local
                  </div>
                </div>
              </div>

              <div className="relative z-10 p-5">
                <div className="grid gap-3">
                  {DAILY_BRIEF.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={cn(
                        "w-full rounded-md border px-4 py-3 text-left transition-all",
                        item.id === selected?.id
                          ? "border-accent-teal/45 bg-accent-teal/10"
                          : "border-white/10 bg-bg-graphite-1/50 hover:border-white/25 hover:bg-bg-graphite-1/80"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <FileText className="mt-0.5 h-4 w-4 text-accent-teal/80" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-fg-porcelain">{item.file}</p>
                          <p className="mt-1 text-xs text-fg-muted/75">{item.summary}</p>
                        </div>
                        <span className="text-[10px] font-mono text-fg-muted/45">{item.touched}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </article>
          </FadeInView>

          <div className="grid gap-5">
            <FadeInView direction="up" delay={240}>
              <article className="rounded-xl border border-white/12 bg-bg-graphite-1/65 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-fg-porcelain">Suggested next</h3>
                  <Zap className="h-4 w-4 text-accent-teal/70" />
                </div>
                <div className="mt-4 space-y-2">
                  {selected?.suggestions.map((suggestion) => (
                    <div key={suggestion} className="rounded-md border border-accent-teal/20 bg-accent-teal/5 px-3 py-2">
                      <p className="text-xs text-fg-muted/80">{suggestion}</p>
                    </div>
                  ))}
                </div>
              </article>
            </FadeInView>

            <FadeInView direction="up" delay={300}>
              <article className="rounded-xl border border-white/12 bg-bg-graphite-1/65 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-fg-porcelain">
                    {mode === "ask" ? "Ask follow-up prompts" : "Resume stack"}
                  </h3>
                  {mode === "ask" ? (
                    <Sparkles className="h-4 w-4 text-accent-teal/70" />
                  ) : (
                    <Pin className="h-4 w-4 text-accent-teal/70" />
                  )}
                </div>
                <div className="mt-4 space-y-2">
                  {(mode === "ask" ? ASK_PROMPTS : RESUME_STACK).map((entry) => (
                    <div key={entry} className="rounded-md border border-white/10 bg-bg-graphite-0/55 px-3 py-2">
                      <p className="text-xs text-fg-muted/78">{entry}</p>
                    </div>
                  ))}
                </div>
                <Link
                  href="/download"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-mono text-accent-teal hover:text-accent-teal-glow transition-colors"
                >
                  Open in desktop
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </article>
            </FadeInView>
          </div>
        </div>

        <FadeInView direction="up" delay={360}>
          <p className="mx-auto mt-10 max-w-2xl text-center text-[11px] font-mono text-fg-muted/35">
            Today is a Pro capability. Data remains local on-device with zero cloud indexing.
          </p>
        </FadeInView>
      </div>
    </div>
  );
}
