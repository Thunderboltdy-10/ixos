"use client";

import { useState } from "react";
import { FadeInView } from "@/components/effects/FadeInView";
import { CornerBrackets } from "@/components/effects/CornerBrackets";

const ASK_EXAMPLES = [
  {
    question: "What are the key differences between our Q3 and Q4 forecasts?",
    answer: "Based on your files, the Q4 forecast increases APAC revenue targets by 12% while reducing EMEA by 3%. The main driver is the delayed product launch noted in your planning doc from October 15.",
    sources: ["forecast_v3.xlsx", "q4_planning.md", "apac_memo.pdf"],
  },
  {
    question: "Summarize the auth migration blockers",
    answer: "Three blockers remain: (1) legacy session tokens in Redis need migration, (2) OAuth2 scope changes break mobile clients, (3) JWT rotation policy conflicts with the CDN cache TTL.",
    sources: ["migration_plan.md", "auth_breaking_changes.md", "infra_notes.md"],
  },
];

function WorkstreamsPanel() {
  const streams = [
    { name: "Q4 Financial Review", files: 12, color: "#F6B94C", active: true },
    { name: "API v3 Migration", files: 24, color: "#14B8A6", active: false },
    { name: "Client Onboarding", files: 8, color: "#7C5CFF", active: false },
  ];

  return (
    <div className="border border-amber-400/15 bg-[#0E1218] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
        <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-amber-400/70">
          stream_switchboard
        </span>
        <span className="text-[10px] font-mono text-white/25">
          3 active
        </span>
      </div>
      <div className="p-3 space-y-2">
        {streams.map((s) => (
          <div
            key={s.name}
            className="flex items-center justify-between px-4 py-3 border transition-colors"
            style={{
              borderColor: s.active ? `${s.color}40` : "rgba(255,255,255,0.08)",
              background: s.active ? `${s.color}0C` : "transparent",
            }}
          >
            <div className="flex items-center gap-3">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: s.color, boxShadow: s.active ? `0 0 8px ${s.color}80` : "none" }}
              />
              <span className="text-sm text-white/75 font-medium">{s.name}</span>
            </div>
            <span className="text-[10px] font-mono text-white/30 border border-white/10 px-2 py-0.5">
              {s.files}
            </span>
          </div>
        ))}
      </div>
      <div className="px-5 py-3 border-t border-white/8">
        <p className="text-[11px] text-white/35 leading-relaxed">
          Workstreams auto-cluster from your file activity — repeated opens,
          edits, and co-access patterns, not folder names.
        </p>
      </div>
    </div>
  );
}

function AskModePanel() {
  const [active] = useState(0);
  const example = ASK_EXAMPLES[active];

  return (
    <div className="border border-teal-400/15 bg-[#0E1218] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
        <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-teal-400/70">
          ask_mode
        </span>
        <span className="text-[10px] font-mono text-teal-400/40 border border-teal-400/20 px-2 py-0.5">
          PRO
        </span>
      </div>

      {/* Question */}
      <div className="px-5 py-4 border-b border-white/6">
        <div className="flex items-start gap-3">
          <span className="text-teal-400/50 text-sm mt-0.5 shrink-0">Q</span>
          <p className="text-sm text-white/75 leading-relaxed">
            {example.question}
          </p>
        </div>
      </div>

      {/* Answer */}
      <div className="px-5 py-4 border-b border-white/6 bg-teal-400/[0.02]">
        <div className="flex items-start gap-3">
          <span className="text-teal-400 text-sm mt-0.5 shrink-0">A</span>
          <p className="text-sm text-white/60 leading-relaxed">
            {example.answer}
          </p>
        </div>
      </div>

      {/* Sources */}
      <div className="px-5 py-3">
        <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-white/25 mb-2">
          Evidence
        </p>
        <div className="flex flex-wrap gap-2">
          {example.sources.map((src) => (
            <span
              key={src}
              className="text-[11px] font-mono text-teal-400/60 border border-teal-400/15 px-2 py-1 bg-teal-400/[0.04]"
            >
              {src}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FeatureShowcaseSection() {
  return (
    <section id="features" className="relative z-10 py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <FadeInView direction="up">
          <div className="text-center mb-16">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-amber-400/60 mb-4">
              ▸ Features
            </p>
            <h2
              className="text-3xl md:text-5xl font-semibold font-display text-white"
              style={{ letterSpacing: "-0.02em", lineHeight: 1.1 }}
            >
              More than search.
            </h2>
            <p className="mt-4 text-white/45 text-sm max-w-xl mx-auto leading-relaxed">
              Workstreams organize your projects automatically. Ask Mode answers
              questions with cited evidence from your files.
            </p>
          </div>
        </FadeInView>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Workstreams */}
          <FadeInView direction="left" delay={0}>
            <div className="relative">
              <CornerBrackets size={16} color="rgba(246,185,76,0.15)" />
              <div className="mb-6 p-1">
                <h3 className="text-xl font-semibold font-display text-white mb-2">
                  Workstreams
                </h3>
                <p className="text-sm text-white/40 leading-relaxed">
                  Ixos watches how you work and clusters related files into
                  project threads — automatically. Resume any project with full
                  context.
                </p>
              </div>
              <WorkstreamsPanel />
            </div>
          </FadeInView>

          {/* Ask Mode */}
          <FadeInView direction="right" delay={120}>
            <div className="relative">
              <CornerBrackets size={16} color="rgba(20,184,166,0.15)" />
              <div className="mb-6 p-1">
                <h3 className="text-xl font-semibold font-display text-white mb-2">
                  Ask Mode
                </h3>
                <p className="text-sm text-white/40 leading-relaxed">
                  Ask questions in plain English. Ixos answers using your files
                  as evidence — with citations you can click through.
                </p>
              </div>
              <AskModePanel />
            </div>
          </FadeInView>
        </div>
      </div>
    </section>
  );
}
