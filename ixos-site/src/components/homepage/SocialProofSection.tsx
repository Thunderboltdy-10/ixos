"use client";

import { FadeInView } from "@/components/effects/FadeInView";

const TESTIMONIALS = [
  {
    quote: "I finally stopped losing files. Ixos found a research paper I'd been hunting for two weeks — in under a second.",
    name: "Dr. Sarah Chen",
    role: "ML Researcher",
  },
  {
    quote: "We dropped it into our ops team's workflow. Runbook retrieval went from minutes to instant. During incidents, that matters.",
    name: "Marcus Webb",
    role: "SRE Lead",
  },
  {
    quote: "The privacy model sealed it for us. Zero cloud dependency means our contracts and legal docs stay on our machines.",
    name: "Anya Reeves",
    role: "Legal Counsel",
  },
];

export function SocialProofSection() {
  return (
    <section className="relative z-10 py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <FadeInView direction="up">
          <div className="text-center mb-12">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/25 mb-4">
              ▸ Early Adopters
            </p>
          </div>
        </FadeInView>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <FadeInView key={t.name} direction="up" delay={i * 100}>
              <div className="relative p-7 border border-white/8 bg-white/[0.01] h-full flex flex-col">
                {/* Quote mark */}
                <div className="text-3xl text-amber-400/15 font-display leading-none mb-4">
                  &ldquo;
                </div>
                <p className="text-sm text-white/50 leading-relaxed flex-1 italic">
                  {t.quote}
                </p>
                <div className="mt-6 pt-4 border-t border-white/6">
                  <p className="text-sm text-white/70 font-medium">{t.name}</p>
                  <p className="text-[11px] text-white/30 mt-0.5">{t.role}</p>
                </div>
              </div>
            </FadeInView>
          ))}
        </div>
      </div>
    </section>
  );
}
