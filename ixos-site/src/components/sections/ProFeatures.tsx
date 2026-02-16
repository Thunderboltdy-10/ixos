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
            initial={{ opacity: 0, y: -300, scale: 0.85, rotateX: 60 }}
            whileInView={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            style={{ transformPerspective: 1200 }}
            transition={{ type: "spring", stiffness: 120, damping: 18, mass: 1.1 }}
            className="relative rounded-sm border border-accent-magenta/40 bg-bg-graphite-1/90 p-8 shadow-glow-magenta/20 backdrop-blur-md"
          >
            {/* Corner Accents matching Pricing */}
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-accent-magenta" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-accent-magenta/50" />

            <div className="absolute -top-5 left-1/2 -translate-x-1/2 rounded-full border border-accent-magenta/35 bg-bg-graphite-0/95 px-3 py-1 text-[10px] font-mono tracking-[0.18em] text-accent-magenta/85 shadow-lg">
              DROP-IN PRO CARD
            </div>
            <div className="text-xs font-mono tracking-wider mb-4 opacity-80 text-accent-magenta">
              IXOS_PRO
            </div>
            {/* Height matched title area */}
            <div className="flex items-baseline gap-1 min-h-[48px] mb-2">
              <h3 className="text-3xl font-semibold text-fg-porcelain leading-tight">One upgrade, full loop</h3>
            </div>

            <p className="mt-6 text-sm text-fg-muted leading-relaxed border-t border-stroke-hairline pt-6">
              Pro combines Ask Mode answers, Today context memory, and Workstream clustering so users
              spend less time navigating and more time executing.
            </p>

            <ul className="space-y-4 mt-6">
              <li className="flex items-center gap-3 text-sm group/li">
                <div className="bg-accent-magenta w-1 h-1 rounded-full group-hover/li:shadow-glow-magenta transition-colors" />
                <span className="text-fg-porcelain opacity-90">Ask with evidence, not guesses</span>
              </li>
              <li className="flex items-center gap-3 text-sm group/li">
                <div className="bg-accent-magenta w-1 h-1 rounded-full group-hover/li:shadow-glow-magenta transition-colors" />
                <span className="text-fg-porcelain opacity-90">Resume projects from the right file immediately</span>
              </li>
              <li className="flex items-center gap-3 text-sm group/li">
                <div className="bg-accent-magenta w-1 h-1 rounded-full group-hover/li:shadow-glow-magenta transition-colors" />
                <span className="text-fg-porcelain opacity-90">Fix folder structure from behavior signals</span>
              </li>
            </ul>
          </motion.aside>
        </div>
      </div>
    </div>
  );
}
