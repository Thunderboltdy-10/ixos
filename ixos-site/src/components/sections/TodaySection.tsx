"use client";

import type { CSSProperties } from "react";
import { FadeInView } from "@/components/effects/FadeInView";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { Clock, FileText, ArrowRight, Zap, Calendar, MessageCircleQuestion } from "lucide-react";
import Link from "next/link";

const RECENTLY_TOUCHED = [
  { name: "Q4_2025_Summary.pdf", time: "12 min ago", icon: FileText },
  { name: "auth_api_reference.md", time: "1 hr ago", icon: FileText },
  { name: "team_standup_notes.md", time: "3 hr ago", icon: FileText },
];

const SUGGESTED_NEXT = [
  { action: "Review expense report from last week", tag: "Finance", color: "text-accent-amber" },
  { action: "Follow up on TechCorp NDA", tag: "Legal", color: "text-accent-teal" },
  { action: "Check CI pipeline for recent failures", tag: "Engineering", color: "text-accent-teal" },
];

export function TodaySection() {
  return (
    <div className="relative" id="today-section">
      <SectionDivider accent="teal" label="TODAY_VIEW" />

      <div className="container mx-auto px-6 py-24">
        <FadeInView direction="up">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[10px] font-mono tracking-[0.24em] text-accent-teal/90 uppercase">
              Second Brain
            </p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
              Your day,{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-[1.08em] font-semibold text-accent-teal">already organized</span>
                <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-accent-teal/40 rounded-full" />
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-fg-muted/80">
              Today gives you a daily brief of recently touched files, suggested next actions,
              and pinned items &mdash; all without lifting a finger.
            </p>
          </div>
        </FadeInView>

        <div className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Daily Brief */}
          <FadeInView direction="up" delay={100}>
            <article
              className="h-full rounded-sm border border-accent-teal/20 bg-bg-graphite-1/60 p-6 hover-glow-subtle"
              style={{ "--accent-rgb": "20,184,166" } as CSSProperties}
            >
              <div className="mb-4 h-[2px] rounded-full bg-gradient-to-r from-accent-teal to-transparent" />
              <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent-teal/10 border border-accent-teal/20">
                  <Calendar className="w-4 h-4 text-accent-teal" />
                </div>
                <h3 className="text-lg font-semibold text-fg-porcelain">Daily Brief</h3>
              </div>
              <p className="text-sm text-fg-muted/70 leading-relaxed">
                Wake up to a snapshot of what changed overnight. New files, modified documents, and
                pending items surface automatically based on your activity patterns.
              </p>
              <p className="mt-3 text-[11px] font-mono text-accent-teal/80">PRIMARY OUTCOME: Start with context in seconds.</p>
              <div className="mt-5 rounded-lg border border-white/8 bg-bg-graphite-0/60 p-3">
                <div className="flex items-center gap-2 text-[10px] font-mono text-accent-teal/70 tracking-wider mb-2">
                  <Clock className="w-3 h-3" />
                  MORNING BRIEF
                </div>
                <div className="space-y-1.5">
                  <div className="text-[11px] text-fg-muted/50 font-mono">
                    <span className="text-accent-amber">3</span> files modified &middot;{" "}
                    <span className="text-accent-teal">1</span> new document
                  </div>
                  <div className="text-[11px] text-fg-muted/40 font-mono">
                    Last active: Q4 Summary, API docs
                  </div>
                </div>
              </div>
              <Link href="/download" className="mt-4 inline-block text-xs font-mono text-accent-teal hover:text-accent-teal-glow transition-colors">
                Open Today view
              </Link>
            </article>
          </FadeInView>

          {/* Recently Touched */}
          <FadeInView direction="up" delay={200}>
            <article
              className="h-full rounded-sm border border-white/10 bg-bg-graphite-1/50 p-6 hover-glow-subtle"
              style={{ "--accent-rgb": "20,184,166" } as CSSProperties}
            >
              <div className="mb-4 h-[2px] rounded-full bg-gradient-to-r from-accent-teal to-transparent" />
              <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent-teal/10 border border-accent-teal/20">
                  <FileText className="w-4 h-4 text-accent-teal" />
                </div>
                <h3 className="text-lg font-semibold text-fg-porcelain">Recently Touched</h3>
              </div>
              <p className="text-sm text-fg-muted/70 leading-relaxed mb-5">
                Instantly resume where you left off. Your most recent files are always one click away.
              </p>
              <p className="mb-4 text-[11px] font-mono text-accent-teal/80">PRIMARY OUTCOME: Reopen the right file first try.</p>
              {RECENTLY_TOUCHED.map((file) => (
                <div
                  key={file.name}
                  className="group flex items-center gap-3 rounded-lg border border-white/5 bg-bg-graphite-0/50 px-3 py-2.5 transition-all duration-300 hover:border-accent-teal/30 hover:bg-bg-graphite-0/80 hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <file.icon className="w-3.5 h-3.5 text-fg-muted/35 group-hover:text-accent-teal/80 transition-colors shrink-0" />
                  <span className="text-[12px] text-fg-muted/70 truncate flex-1 font-mono group-hover:text-fg-porcelain transition-colors">{file.name}</span>
                  <span className="text-[10px] text-fg-muted/30 shrink-0 group-hover:text-fg-muted/50 transition-colors">{file.time}</span>
                </div>
              ))}
              <Link href="/download" className="mt-4 inline-block text-xs font-mono text-accent-teal hover:text-accent-teal-glow transition-colors">
                Jump to file context
              </Link>
            </article>
          </FadeInView>

          {/* Suggested Next */}
          <FadeInView direction="up" delay={300}>
            <article
              className="h-full rounded-sm border border-white/10 bg-bg-graphite-1/50 p-6 hover-glow-subtle"
              style={{ "--accent-rgb": "124,92,255" } as CSSProperties}
            >
              <div className="mb-4 h-[2px] rounded-full bg-gradient-to-r from-accent-teal to-transparent" />
              <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent-teal/10 border border-accent-teal/20">
                  <Zap className="w-4 h-4 text-accent-teal" />
                </div>
                <h3 className="text-lg font-semibold text-fg-porcelain">Suggested Next</h3>
              </div>
              <p className="text-sm text-fg-muted/70 leading-relaxed mb-5">
                Smart suggestions based on your recent activity and file relationships. Pick up right where context left off.
              </p>
              <p className="mb-4 text-[11px] font-mono text-accent-teal/80">PRIMARY OUTCOME: Know the next file before searching again.</p>
              <div className="space-y-2">
                {SUGGESTED_NEXT.map((item) => (
                  <div
                    key={item.action}
                    className="group flex items-start gap-3 rounded-lg border border-white/5 bg-bg-graphite-0/50 px-3 py-2.5 transition-all duration-300 hover:border-accent-teal/30 hover:bg-bg-graphite-0/80 hover:-translate-y-0.5 hover:shadow-sm"
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-fg-muted/25 mt-0.5 shrink-0 group-hover:text-accent-teal/80 transition-colors" />
                    <div className="min-w-0">
                      <span className="text-[12px] text-fg-muted/65 leading-relaxed group-hover:text-fg-porcelain transition-colors">{item.action}</span>
                      <span className={`ml-2 text-[9px] font-mono tracking-wider opacity-70 group-hover:opacity-100 transition-opacity ${item.color}`}>{item.tag}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-md border border-accent-violet/25 bg-accent-violet/8 px-3 py-2">
                <div className="flex items-center gap-2 text-[11px] font-mono text-accent-violet">
                  <MessageCircleQuestion className="w-3.5 h-3.5" />
                  ASK MODE (PRO)
                </div>
                <p className="mt-1 text-[11px] text-fg-muted/70">
                  Ask natural questions and get evidence-backed snippets from the same context graph.
                </p>
              </div>
              <div className="mt-3 rounded-sm border border-white/8 bg-bg-graphite-0/50 px-3 py-2">
                <div className="text-[10px] font-mono text-fg-muted/55 uppercase tracking-[0.16em]">signal_log</div>
                <div className="mt-1 text-[11px] font-mono text-fg-muted/70">
                  /today/recommend {"->"} files_opened_weight + semantic_overlap
                </div>
              </div>
            </article>
          </FadeInView>
        </div>

        <FadeInView direction="up" delay={400}>
          <p className="mx-auto mt-8 max-w-xl text-center text-[11px] text-fg-muted/40 font-mono">
            Today is a Pro feature &middot; Everything stays local &middot; Zero cloud sync
          </p>
        </FadeInView>
      </div>
    </div >
  );
}
