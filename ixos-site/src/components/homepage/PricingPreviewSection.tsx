"use client";

import { useState } from "react";
import Link from "next/link";
import { FadeInView } from "@/components/effects/FadeInView";
import { motion, AnimatePresence } from "framer-motion";

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
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const monthlyPrice = 6.99;
  const annualPrice = 4.99;
  const savePct = Math.round((1 - annualPrice / monthlyPrice) * 100);
  const currentPrice = billing === "monthly" ? monthlyPrice : annualPrice;

  return (
    <section id="pricing-preview" className="relative z-10 py-32 px-6">
      <div className="max-w-4xl mx-auto">
        <FadeInView direction="up">
          <div className="text-center mb-16">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-amber-500/80 mb-4 font-bold">
              ▸ Licensing
            </p>
            <h2
              className="text-3xl md:text-5xl font-semibold font-display text-white mb-6"
              style={{ letterSpacing: "-0.02em", lineHeight: 1.1 }}
            >
              Simple <span className="text-amber-400">pricing.</span>
            </h2>
            <p className="mt-4 text-white/50 text-sm font-mono max-w-xl mx-auto leading-relaxed mb-10">
              Start free. Upgrade when your workstreams demand it.
            </p>

            {/* Toggle */}
            <div className="inline-flex bg-black/50 border border-amber-400/20 p-1 rounded-sm">
              {(["monthly", "annual"] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setBilling(b)}
                  className={`relative px-8 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all rounded-[2px] ${
                    billing === b
                      ? "bg-amber-400 text-[#0A0D0F]"
                      : "text-amber-400/40 hover:text-amber-400/70"
                  }`}
                >
                  {b === "monthly" ? "Monthly" : `Annual`}
                  {b === "annual" && (
                    <span
                      className={`ml-2 text-[8px] transition-colors ${
                        billing === "annual" ? "text-[#0A0D0F]" : "text-amber-400"
                      }`}
                    >
                      Save {savePct}%
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </FadeInView>

        <FadeInView direction="up" delay={150}>
          {/* Cards container like PricingMain */}
          <div className="w-full border border-white/5 bg-black/60 p-8 md:p-12 relative shadow-2xl">
            {/* Corner brackets */}
            <span className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-amber-400/12" />
            <span className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-amber-400/12" />
            <span className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-amber-400/12" />
            <span className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-amber-400/12" />

            {/* Community */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8 mb-10">
              <div>
                <div className="text-[10px] font-mono tracking-[0.3em] text-white/20 uppercase mb-1">[FREE_TIER]</div>
                <h3 className="text-xl font-bold text-white/60 mb-1">Community</h3>
                <div className="text-4xl font-bold font-mono">
                  $0
                  <span className="text-base font-normal text-white/20 ml-1">/ forever</span>
                </div>
              </div>
              <ul className="space-y-2 text-sm font-mono text-white/30">
                {FREE_FEATURES.map(feat => (
                  <li key={feat} className="flex items-center gap-2">
                    <span className="text-amber-400/20">▸</span>
                    {feat}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro card */}
            <div className="border border-amber-400/30 bg-amber-400/[0.04] p-8 md:p-10 relative overflow-hidden shadow-[0_0_50px_rgba(246,185,76,0.05)]">
              <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-400/50" />
              <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-400/50" />
              <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-400/50" />
              <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-400/50" />
              <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full pointer-events-none" style={{ background: 'rgba(246,185,76,0.06)', filter: 'blur(60px)' }} />

              <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8 mb-8">
                  <div>
                    <div className="text-[10px] font-mono tracking-[0.3em] text-amber-400/60 uppercase mb-1">[PRO_TIER]</div>
                    <h3 className="text-xl font-bold font-mono text-amber-500 mb-1">Pro</h3>
                    <div className="flex items-baseline gap-2">
                      <div className="flex items-baseline">
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={billing}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.18 }}
                            className="text-4xl font-bold font-mono text-white drop-shadow-md"
                          >
                            ${currentPrice.toFixed(2)}
                          </motion.span>
                        </AnimatePresence>
                        <span className="text-base font-normal text-white/30 ml-2">/ month</span>
                      </div>
                      {billing === 'annual' && (
                        <span className="text-[10px] font-mono bg-amber-400/10 text-amber-400 border border-amber-400/30 px-2 py-0.5 rounded-sm uppercase tracking-widest ml-2 font-bold shadow-[0_0_10px_rgba(246,185,76,0.2)]">
                          save {savePct}%
                        </span>
                      )}
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm font-mono text-white/60">
                    {PRO_FEATURES.map(feat => (
                      <li key={feat} className="flex items-center gap-2">
                        <span className="text-amber-400">▸</span>
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-8 border-t border-amber-500/10">
                  <Link
                    href="/download"
                    className="flex-1 px-6 py-4 border border-amber-500/30 text-amber-500 text-xs font-bold uppercase tracking-widest hover:bg-amber-500/10 transition-colors text-center font-mono"
                  >
                    Download Free
                  </Link>
                  <Link
                    href="/pricing"
                    className="flex-1 px-6 py-4 bg-amber-500 text-[#0A0D14] text-xs font-bold uppercase tracking-widest hover:bg-amber-400 transition-all shadow-[0_0_20px_rgba(246,185,76,0.3)] text-center font-mono"
                  >
                    Upgrade to Pro
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </FadeInView>

        <FadeInView direction="up" delay={200}>
          <div className="text-center mt-10">
            <Link
              href="/pricing"
              className="text-xs font-mono text-white/40 hover:text-white/70 transition-colors inline-flex items-center gap-2"
            >
              View full comparison matrix <span className="text-amber-500">→</span>
            </Link>
          </div>
        </FadeInView>
      </div>
    </section>
  );
}
