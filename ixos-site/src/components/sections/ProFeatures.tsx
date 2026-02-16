"use client";

import type { CSSProperties, RefObject } from "react";
import { motion } from "framer-motion";
import { FadeInView } from "@/components/effects/FadeInView";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { ProCard } from "@/components/sections/ProCard";
import { ProUpgradeAction } from "@/components/sections/ProUpgradeAction";
import type { BillingCycle } from "@/components/sections/Pricing";

const FEATURES = [
  {
    title: "Ask Mode Evidence Answers",
    code: "PRO_DEEP_SEARCH",
    description:
      "Get grounded answers with cited snippets, not keyword dumps.",
    accent: "violet",
    size: "large",
  },
  {
    title: "Today + Workstreams",
    code: "MODEL_FASTLANE",
    description:
      "Carry context from one action to the next without tab hunting.",
    accent: "teal",
    size: "normal",
  },
  {
    title: "Deep Search Analysis",
    code: "ASK_MODE_PLUS",
    description:
      "Break broad questions into evidence-backed ranked results.",
    accent: "amber",
    size: "normal",
  },
  {
    title: "Priority Model Channel",
    code: "SECOND_BRAIN",
    description:
      "Get faster tuned defaults and early model improvements.",
    accent: "magenta",
    size: "normal",
  },
];

export function ProFeatures({
  billing = "annual",
  showProCard = true,
  proCardLayoutId = "pro-card",
  cardAnchorRef,
}: {
  billing?: BillingCycle;
  showProCard?: boolean;
  proCardLayoutId?: string;
  cardAnchorRef?: RefObject<HTMLDivElement | null>;
}) {
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
    <div className="relative" id="pro-capabilities">
      <SectionDivider accent="magenta" label="PRO_CAPABILITIES" />

      <div className="container mx-auto px-6 py-24">
        <FadeInView direction="up">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-semibold md:text-4xl">
              What You Unlock With <span className="heading-gradient-magenta">Ixos Pro</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-fg-muted/80">
              Pro is for heavier workflows where Ask Mode, Today, and Workstreams stay in one loop.
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
                      "h-full rounded-lg border bg-bg-graphite-1/55 p-6 backdrop-blur-sm transition-all duration-300 hover:bg-bg-graphite-1/75 hover:scale-[1.01]",
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

          <div ref={cardAnchorRef} className="h-full">
            {showProCard ? (
              <motion.aside
                layoutId={proCardLayoutId}
                transition={{ type: "spring", stiffness: 56, damping: 29, mass: 1.34 }}
                className="relative group h-full"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-b from-accent-magenta/40 to-transparent rounded-lg opacity-50 blur-lg group-hover:opacity-80 transition-opacity duration-700" />
                <ProCard
                  price={billing === "monthly" ? "$7.99" : "$6.35"}
                  period="/ month"
                  desc="Ask Mode evidence answers. Saved searches. Priority support."
                  actionNode={<ProUpgradeAction />}
                />
              </motion.aside>
            ) : (
              <aside
                aria-hidden="true"
                className="relative h-full min-h-[640px] rounded-sm border border-transparent opacity-0 pointer-events-none"
              >
                <div className="h-full" />
              </aside>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
