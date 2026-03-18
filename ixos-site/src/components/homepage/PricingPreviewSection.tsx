"use client";

import Link from "next/link";
import { FadeInView } from "@/components/effects/FadeInView";
import { CornerBrackets } from "@/components/effects/CornerBrackets";

const FREE_FEATURES = [
  "Local semantic search with Flash mode",
  "VS Code extension and standard CLI",
  "Up to 3 active workstreams",
  "Tamper-proof file verification",
];

const PRO_FEATURES = [
  "Deep search models for better results",
  "Unlimited workstreams with session recovery",
  "Maximum privacy mode — nothing saved",
  "Cryptographic proof of search results",
  "Priority support and early access",
];

export function PricingPreviewSection() {
  return (
    <section id="pricing-preview" className="relative z-10 py-28 px-6">
      <div className="max-w-5xl mx-auto">
        <FadeInView direction="up">
          <div className="text-center mb-14">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-amber-400/60 mb-4">
              ▸ Pricing
            </p>
            <h2
              className="text-3xl md:text-5xl font-semibold font-display text-white"
              style={{ letterSpacing: "-0.02em", lineHeight: 1.1 }}
            >
              Simple pricing.
            </h2>
            <p className="mt-4 text-white/45 text-sm max-w-xl mx-auto leading-relaxed">
              Start free. Upgrade when your workstreams demand it.
            </p>
          </div>
        </FadeInView>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Community */}
          <FadeInView direction="left" delay={0}>
            <div className="relative border border-white/10 bg-white/[0.01] p-8 md:p-10 h-full flex flex-col">
              <CornerBrackets size={14} color="rgba(255,255,255,0.1)" />
              <div className="mb-6">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30 mb-1">
                  Community
                </p>
                <div className="text-4xl font-bold font-display text-white">
                  $0
                  <span className="text-base font-normal text-white/25 ml-1">
                    / forever
                  </span>
                </div>
              </div>

              <ul className="space-y-3 text-sm text-white/45 flex-1">
                {FREE_FEATURES.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5">
                    <span className="text-white/20 mt-0.5 shrink-0">▸</span>
                    {feat}
                  </li>
                ))}
              </ul>

              <Link
                href="/download"
                className="mt-8 inline-flex items-center justify-center w-full px-6 py-3.5 border border-amber-400/25 text-amber-400/80 text-sm font-medium hover:bg-amber-400/5 transition-colors"
              >
                Download Free
              </Link>
            </div>
          </FadeInView>

          {/* Pro */}
          <FadeInView direction="right" delay={120}>
            <div className="relative border border-amber-400/25 bg-amber-400/[0.03] p-8 md:p-10 h-full flex flex-col overflow-hidden">
              <CornerBrackets size={14} color="rgba(246,185,76,0.3)" />

              {/* Glow */}
              <div
                className="absolute -top-20 -right-20 w-60 h-60 rounded-full pointer-events-none"
                style={{
                  background: "rgba(246,185,76,0.04)",
                  filter: "blur(80px)",
                }}
              />

              <div className="relative z-10 flex flex-col h-full">
                <div className="mb-6">
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-400/60 mb-1">
                    Pro
                  </p>
                  <div className="text-4xl font-bold font-display text-white">
                    $6.99
                    <span className="text-base font-normal text-white/25 ml-1">
                      / month
                    </span>
                  </div>
                </div>

                <ul className="space-y-3 text-sm text-white/55 flex-1">
                  {PRO_FEATURES.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5">
                      <span className="text-amber-400 mt-0.5 shrink-0">▸</span>
                      {feat}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/pricing"
                  className="mt-8 inline-flex items-center justify-center w-full px-6 py-3.5 bg-amber-400 text-[#0A0D0F] text-sm font-semibold hover:bg-amber-300 transition-colors"
                >
                  Get Pro
                </Link>
              </div>
            </div>
          </FadeInView>
        </div>

        <FadeInView direction="up" delay={200}>
          <div className="text-center mt-6">
            <Link
              href="/pricing"
              className="text-xs font-mono text-white/30 hover:text-white/50 transition-colors"
            >
              View full pricing details →
            </Link>
          </div>
        </FadeInView>
      </div>
    </section>
  );
}
