"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { Check, X, ChevronDown } from "lucide-react";

const FREE_FEATURES = [
  { label: "Unlimited Local Search", included: true },
  { label: "Unlimited Workstreams Tracking", included: true },
  { label: "Command Line Interface", included: true },
  { label: "142k File Max Index Size", included: true },
  { label: "Cloud Backup & Sync", included: false },
  { label: "Ask Mode / Generative UI", included: false },
];

const PRO_FEATURES = [
  { label: "Everything in Local, plus:", header: true },
  { label: "Ask Mode (Generative UI)", included: true },
  { label: "Multi-device Cloud Sync", included: true },
  { label: "Unlimited File Tracking Size", included: true },
  { label: "Priority Support", included: true },
];

const COMPARISON_ROWS = [
  { label: "JIT Memory Engine", free: true, pro: true },
  { label: "Max Indexed Files", free: "142,000", pro: "Unlimited" },
  { label: "Command Line Interface (CLI)", free: true, pro: true },
  { label: "Desktop Overlay GUI", free: true, pro: true },
  { label: "Ask Mode (Generative UI)", free: false, pro: true },
  { label: "Multi-device Cloud Sync", free: false, pro: true },
  { label: "Priority Support", free: false, pro: true },
];

export function PricingV3() {
  const [annual, setAnnual] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });

  const monthlyPrice = 7.99;
  const annualPrice = +(monthlyPrice * 0.8).toFixed(2);
  const displayPrice = annual ? annualPrice : monthlyPrice;

  return (
    <section
      ref={sectionRef}
      className="py-32 bg-[#0E1117] border-b border-white/5"
    >
      <SectionDivider accent="magenta" label="LICENSING" />

      <div className="container mx-auto px-6 max-w-4xl">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-6xl font-display font-bold text-fg-porcelain leading-[1.05] mb-4">
            Predictable{" "}
            <span className="text-accent-magenta italic">power.</span>
          </h2>
          <p className="font-mono text-fg-muted max-w-lg mx-auto">
            High-performance local search is always free. Unlock generative synthesis and sync with Pro.
          </p>
        </motion.div>

        {/* Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.07 }}
          className="flex items-center justify-center gap-4 mb-12"
        >
          <span className={`font-mono text-sm transition-colors ${!annual ? "text-fg-porcelain" : "text-fg-muted"}`}>
            Monthly
          </span>
          <button
            onClick={() => setAnnual(!annual)}
            className="relative w-14 h-7 bg-bg-graphite-2 border border-white/10 transition-colors hover:border-white/20 focus:outline-none"
            aria-label="Toggle annual billing"
          >
            <motion.div
              className="absolute top-1 w-5 h-5 bg-accent-magenta"
              animate={{ left: annual ? "calc(100% - 24px)" : "4px" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          </button>
          <span className={`font-mono text-sm transition-colors ${annual ? "text-fg-porcelain" : "text-fg-muted"}`}>
            Annual
            <span className="ml-2 text-[10px] bg-accent-magenta/20 text-accent-magenta border border-accent-magenta/30 px-1.5 py-0.5 uppercase tracking-wider">
              Save 20%
            </span>
          </span>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">

          {/* Free Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.14 }}
            className="bg-bg-graphite-1 border border-white/10 p-8 flex flex-col"
          >
            <div className="font-display text-2xl text-fg-porcelain mb-2">Ixos Local</div>
            <p className="font-mono text-xs text-fg-muted mb-6">Unrestricted local semantic search and workflow history.</p>
            <div className="font-display text-5xl font-bold text-fg-porcelain mt-2 mb-6">$0</div>
            <button className="w-full h-11 bg-white/5 border border-white/20 hover:bg-white/10 transition-colors font-mono text-sm text-fg-porcelain uppercase tracking-widest mb-8">
              Download CLI Free
            </button>
            <div className="border-t border-white/10 pt-6 flex flex-col gap-3 flex-1">
              {FREE_FEATURES.map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  {feature.included ? (
                    <Check className="w-4 h-4 text-[#27C93F] shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-fg-muted/20 shrink-0" />
                  )}
                  <span className={`font-mono text-sm ${feature.included ? "text-fg-porcelain/90" : "text-fg-muted/40"}`}>
                    {feature.label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Pro Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.21 }}
            className="bg-bg-graphite-1 border border-accent-magenta/50 p-8 flex flex-col relative"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="font-display text-2xl text-fg-porcelain">Ixos Pro</div>
              <span className="bg-accent-magenta/10 border border-accent-magenta/30 text-accent-magenta font-mono text-[10px] uppercase tracking-widest px-2 py-0.5">
                Popular
              </span>
            </div>
            <p className="font-mono text-xs text-fg-muted mb-6">Expand your context with intelligence features and cross-device sync.</p>

            <div className="flex items-end gap-2 mt-2 mb-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={annual ? "annual" : "monthly"}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                  className="font-display text-5xl font-bold text-fg-porcelain"
                >
                  ${displayPrice.toFixed(2)}
                </motion.div>
              </AnimatePresence>
              <span className="font-mono text-xs text-fg-muted mb-2">/month</span>
            </div>
            {annual && (
              <p className="font-mono text-xs text-accent-magenta mb-4">
                Billed ${(annualPrice * 12).toFixed(2)} annually
              </p>
            )}
            {!annual && <p className="font-mono text-xs text-fg-muted mb-4">Billed monthly</p>}

            <button className="w-full h-11 bg-accent-magenta hover:bg-[#f585c2] transition-colors font-mono text-sm text-white uppercase tracking-widest mb-8">
              Start 14-Day Free Trial
            </button>

            <div className="border-t border-white/10 pt-6 flex flex-col gap-3 flex-1">
              {PRO_FEATURES.map((feature, i) => (
                <div key={i} className={feature.header ? "mb-1" : "flex items-center gap-3"}>
                  {feature.header ? (
                    <span className="font-mono text-xs text-fg-muted italic">{feature.label}</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-accent-magenta shrink-0" />
                      <span className="font-mono text-sm text-fg-porcelain/90">{feature.label}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Comparison toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="flex items-center gap-2 mx-auto font-mono text-sm text-fg-muted hover:text-fg-porcelain transition-colors"
          >
            See full comparison →
            <motion.div animate={{ rotate: showComparison ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </button>

          <AnimatePresence>
            {showComparison && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="mt-8 w-full overflow-x-auto border border-white/10 bg-bg-graphite-1/30">
                  <table className="w-full text-left font-mono min-w-[460px] border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-[#161B22]">
                        <th className="p-4 font-mono text-[10px] text-fg-muted uppercase tracking-widest font-normal w-1/2">Feature</th>
                        <th className="p-4 font-mono text-[10px] text-fg-porcelain uppercase tracking-widest font-semibold border-l border-white/10 w-1/4 text-center">Local</th>
                        <th className="p-4 font-mono text-[10px] text-accent-magenta uppercase tracking-widest font-semibold border-l border-white/10 w-1/4 text-center">Pro</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {COMPARISON_ROWS.map((row, index) => (
                        <motion.tr
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.05 }}
                          className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="p-4 text-fg-porcelain/80">{row.label}</td>
                          <td className="p-4 border-l border-white/10 text-center">
                            {typeof row.free === "boolean" ? (
                              row.free
                                ? <Check className="w-4 h-4 text-[#27C93F] mx-auto" />
                                : <X className="w-4 h-4 text-fg-muted/20 mx-auto" />
                            ) : (
                              <span className="font-mono text-sm text-fg-muted">{row.free}</span>
                            )}
                          </td>
                          <td className="p-4 border-l border-white/10 text-center bg-accent-magenta/[0.02]">
                            {typeof row.pro === "boolean" ? (
                              row.pro
                                ? <Check className="w-4 h-4 text-accent-magenta mx-auto" />
                                : <X className="w-4 h-4 text-fg-muted/20 mx-auto" />
                            ) : (
                              <span className="font-mono text-sm text-accent-magenta font-medium">{row.pro}</span>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

      </div>
    </section>
  );
}
