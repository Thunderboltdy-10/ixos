"use client";

import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { FadeInView } from "@/components/effects/FadeInView";
import { SectionDivider } from "@/components/ui/SectionDivider";

const FEATURES = [
  {
    title: "Ask Mode Evidence Answers",
    code: "PRO_DEEP_SEARCH",
    description:
      "Question intent resolves into trusted snippets, answer cards, and citations instead of plain keyword matching.",
    accent: "violet",
    size: "large",
  },
  {
    title: "Today + Workstreams",
    code: "MODEL_FASTLANE",
    description:
      "Daily brief, suggested-next files, and activity-based workstreams keep context hot across folders.",
    accent: "teal",
    size: "normal",
  },
  {
    title: "Deep Search Analysis",
    code: "ASK_MODE_PLUS",
    description:
      "Decompose broad requests, collect evidence, and return ranked files with grounded snippets.",
    accent: "amber",
    size: "normal",
  },
  {
    title: "Priority Model Channel",
    code: "SECOND_BRAIN",
    description:
      "Pro seats receive early model updates and tuned defaults for faster recall on large mixed roots.",
    accent: "magenta",
    size: "normal",
  },
];

export function ProFeatures() {
  const accentStyles = {
    amber: {
      text: "text-accent-amber",
      border: "border-accent-amber/28",
      glow: "hover:shadow-[0_0_28px_rgba(246,185,76,0.16)]",
      bar: "from-accent-amber",
      rgb: "246,185,76",
    },
    teal: {
      text: "text-accent-teal",
      border: "border-accent-teal/28",
      glow: "hover:shadow-[0_0_28px_rgba(20,184,166,0.16)]",
      bar: "from-accent-teal",
      rgb: "20,184,166",
    },
    violet: {
      text: "text-accent-violet",
      border: "border-accent-violet/28",
      glow: "hover:shadow-[0_0_28px_rgba(124,92,255,0.16)]",
      bar: "from-accent-violet",
      rgb: "124,92,255",
    },
    magenta: {
      text: "text-accent-magenta",
      border: "border-accent-magenta/28",
      glow: "hover:shadow-[0_0_28px_rgba(244,114,182,0.16)]",
      bar: "from-accent-magenta",
      rgb: "244,114,182",
    },
  } as const;

  return (
    <div className="relative">
      <SectionDivider accent="magenta" label="PRO_CAPABILITIES" />

      <div className="container mx-auto px-6 py-24">
        <FadeInView direction="up">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-semibold md:text-4xl">
              What You Unlock With <span className="heading-gradient-magenta">Ixos Pro</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-fg-muted/80">
              Pro is built for heavier research and developer workflows where Ask Mode,
              Today, and Workstreams compound into a practical productivity loop.
            </p>
          </div>
        </FadeInView>

        <div className="mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-5 md:grid-cols-2">
            {FEATURES.map((feature, index) => {
              const accent = accentStyles[feature.accent as keyof typeof accentStyles];
              const isLarge = feature.size === "large";
              return (
                <FadeInView key={feature.code} direction="up" delay={index * 90}>
                  <article
                    className={[
                      "h-full rounded-lg border bg-bg-graphite-1/55 p-6 backdrop-blur-sm transition-all duration-300 hover:bg-bg-graphite-1/75",
                      accent.border,
                      accent.glow,
                      isLarge ? "md:col-span-2 min-h-[190px]" : "min-h-[160px]",
                    ].join(" ")}
                    style={{ "--accent-rgb": accent.rgb } as CSSProperties}
                  >
                    <div className={`mb-4 h-[2px] rounded-full bg-gradient-to-r ${accent.bar} to-transparent`} />
                    <p className={`text-[10px] font-mono tracking-[0.2em] ${accent.text}/80`}>{feature.code}</p>
                    <h3 className="mt-3 text-xl font-semibold text-fg-porcelain">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-fg-muted/80">{feature.description}</p>
                  </article>
                </FadeInView>
              );
            })}
          </div>

          <motion.aside
            initial={{ opacity: 0, y: -240, x: -120, rotate: -6, scale: 0.94 }}
            whileInView={{ opacity: 1, y: 0, x: 0, rotate: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ type: "spring", stiffness: 130, damping: 16, mass: 0.9 }}
            className="relative rounded-xl border border-accent-magenta/40 bg-bg-graphite-1/78 p-7 shadow-[0_0_34px_rgba(244,114,182,0.2)]"
          >
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 rounded-full border border-accent-magenta/35 bg-bg-graphite-0/95 px-3 py-1 text-[10px] font-mono tracking-[0.18em] text-accent-magenta/85">
              DROP-IN PRO CARD
            </div>
            <p className="text-[10px] font-mono tracking-[0.2em] text-accent-magenta/80">IXOS_PRO</p>
            <h3 className="mt-3 text-3xl font-semibold text-fg-porcelain">One upgrade, full context loop</h3>
            <p className="mt-3 text-sm leading-relaxed text-fg-muted/80">
              Pro combines Ask Mode answers, Today context memory, and Workstream clustering so users
              spend less time navigating and more time executing.
            </p>
            <div className="mt-5 space-y-2 text-xs text-fg-muted/80">
              <div className="rounded-md border border-white/8 bg-bg-graphite-0/45 px-3 py-2">Ask with evidence, not guesses.</div>
              <div className="rounded-md border border-white/8 bg-bg-graphite-0/45 px-3 py-2">Resume projects from the right file immediately.</div>
              <div className="rounded-md border border-white/8 bg-bg-graphite-0/45 px-3 py-2">Fix folder structure from repeated behavior signals.</div>
            </div>
          </motion.aside>
        </div>
      </div>
    </div>
  );
}
