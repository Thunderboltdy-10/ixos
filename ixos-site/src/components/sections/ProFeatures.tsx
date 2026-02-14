"use client";

import { FadeInView } from "@/components/effects/FadeInView";
import { SectionDivider } from "@/components/ui/SectionDivider";

const FEATURES = [
  {
    title: "Deep Search Analysis",
    code: "PRO_DEEP_SEARCH",
    description:
      "Use Ixos Pro to decompose broad requests, collect evidence, and return ranked files with grounded snippets.",
  },
  {
    title: "Priority Model Channel",
    code: "MODEL_FASTLANE",
    description:
      "Pro seats receive early model updates and tuned defaults for faster recall on large mixed file roots.",
  },
  {
    title: "Advanced File Coverage",
    code: "FORMAT_EXPANSION",
    description:
      "Expanded support for code-heavy and research-heavy workflows including large markdown, docs, and mixed archives.",
  },
  {
    title: "Operational Controls",
    code: "TEAM_CONTROLS",
    description:
      "Dedicated controls for privacy posture, cache behavior, and release channels so teams can standardize local search policy.",
  },
];

export function ProFeatures() {
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
              Pro is built for heavier research and developer workflows where query understanding
              depth matters as much as raw speed.
            </p>
          </div>
        </FadeInView>

        <div className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-5 md:grid-cols-2">
          {FEATURES.map((feature, index) => (
            <FadeInView key={feature.code} direction="up" delay={index * 90}>
              <article className="h-full rounded-xl border border-white/10 bg-bg-graphite-1/55 p-7 backdrop-blur-sm transition-colors hover:border-accent-magenta/35 hover:bg-bg-graphite-1/75">
                <p className="text-[10px] font-mono tracking-[0.2em] text-accent-magenta/80">
                  {feature.code}
                </p>
                <h3 className="mt-3 text-2xl font-semibold text-fg-porcelain">{feature.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-fg-muted/80">{feature.description}</p>
              </article>
            </FadeInView>
          ))}
        </div>
      </div>
    </div>
  );
}
