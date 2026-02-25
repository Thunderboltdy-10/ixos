"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { Check, Minus, ChevronDown } from "lucide-react";

const FREE_FEATURES = [
  { label: "Unlimited Local Search", included: true },
  { label: "Unlimited Workstreams Tracking", included: true },
  { label: "Command Line Interface", included: true },
  { label: "142k File Max Index Size", included: true },
  { label: "Desktop Overlay GUI", included: true },
  { label: "Cloud Backup & Sync", included: false },
  { label: "Ask Mode / Generative UI", included: false },
];

const PRO_FEATURES = [
  { label: "Everything in Local, plus:", included: true, header: true },
  { label: "Ask Mode (Generative UI)", included: true },
  { label: "Multi-device Cloud Sync", included: true },
  { label: "Unlimited File Tracking Size", included: true },
  { label: "Priority Support", included: true },
  { label: "Early Access to New Features", included: true },
];

const COMPARISON_ROWS = [
  { label: "JIT Memory Engine", free: true, pro: true },
  { label: "Max Indexed Files", free: "142,000", pro: "Unlimited" },
  { label: "Command Line Interface (CLI)", free: true, pro: true },
  { label: "Desktop Overlay GUI", free: true, pro: true },
  { label: "Ask Mode (Generative UI)", free: false, pro: true },
  { label: "Multi-device Cloud Sync", free: false, pro: true },
  { label: "Priority Support", free: false, pro: true },
  { label: "File Index Size", free: "142k", pro: "Unlimited" },
];

export function PricingV1() {
  const [annual, setAnnual] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const monthlyPrice = 7.99;
  const annualPrice = 6.35;
  const displayPrice = annual ? annualPrice : monthlyPrice;

  return (
    <section
      ref={sectionRef}
      className="py-32 bg-[#0E1117] border-b border-white/5"
    >
      <SectionDivider accent="magenta" label="LICENSING" />

      <div className="container mx-auto px-6 max-w-5xl">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-6xl font-display font-bold tracking-tight text-fg-porcelain mb-4 leading-tight">
            Predictable{" "}
            <span className="text-accent-magenta italic">power.</span>
          </h2>
          <p className="font-mono text-fg-muted max-w-lg mx-auto">
            High-performance local search is always free. Unlock generative
            synthesis and sync with Pro.
          </p>
        </motion.div>

        {/* Annual/Monthly Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex items-center justify-center gap-4 mb-12"
        >
          <span
            className={`font-mono text-sm transition-colors ${
              !annual ? "text-fg-porcelain" : "text-fg-muted"
            }`}
          >
            Monthly
          </span>
          <button
            onClick={() => setAnnual(!annual)}
            className="relative w-14 h-7 rounded-full bg-bg-graphite-2 border border-white/10 transition-colors hover:border-white/20 focus:outline-none"
            aria-label="Toggle annual billing"
          >
            <motion.div
              className="absolute top-1 w-5 h-5 rounded-full bg-accent-magenta shadow-[0_0_10px_rgba(244,114,182,0.5)]"
              animate={{ left: annual ? "calc(100% - 24px)" : "4px" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          </button>
          <span
            className={`font-mono text-sm transition-colors ${
              annual ? "text-fg-porcelain" : "text-fg-muted"
            }`}
          >
            Annual
            <span className="ml-2 text-[10px] bg-accent-magenta/20 text-accent-magenta border border-accent-magenta/30 px-1.5 py-0.5 rounded uppercase tracking-wider">
              Save 20%
            </span>
          </span>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">

          {/* Free Card */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative bg-bg-graphite-1 border border-white/10 p-8 flex flex-col"
          >
            <div className="absolute top-0 left-0 w-16 h-16 overflow-hidden pointer-events-none">
              <div className="absolute -top-8 -left-8 w-16 h-16 bg-white/5 rotate-45" />
            </div>

            <div className="mb-6">
              <div className="font-mono text-[10px] text-fg-muted uppercase tracking-widest mb-2">
                Ixos Local
              </div>
              <div className="font-display font-bold text-6xl text-fg-porcelain tracking-tight">
                $0
              </div>
              <div className="font-mono text-xs text-fg-muted mt-1">
                Free forever
              </div>
            </div>

            <button className="w-full h-11 border border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30 transition-all font-mono text-sm text-fg-porcelain uppercase tracking-widest mb-8">
              Download CLI Free
            </button>

            <div className="flex flex-col gap-3 flex-1">
              {FREE_FEATURES.map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  {feature.included ? (
                    <Check className="w-4 h-4 text-[#27C93F] shrink-0" />
                  ) : (
                    <Minus className="w-4 h-4 text-fg-muted/20 shrink-0" />
                  )}
                  <span
                    className={`font-mono text-sm ${
                      feature.included
                        ? "text-fg-porcelain/90"
                        : "text-fg-muted/30"
                    }`}
                  >
                    {feature.label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Pro Card */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="relative bg-bg-graphite-1 border border-accent-magenta/50 p-8 flex flex-col overflow-hidden"
            style={{
              boxShadow:
                "0 0 50px hsla(320, 90%, 60%, 0.12), inset 0 1px 0 rgba(244,114,182,0.1)",
            }}
          >
            {/* Top-right glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-accent-magenta/8 blur-[60px] pointer-events-none" />

            {/* Popular badge */}
            <div className="absolute top-6 right-6">
              <span className="font-mono text-[10px] uppercase tracking-widest bg-accent-magenta/15 border border-accent-magenta/40 text-accent-magenta px-2.5 py-1 rounded-full">
                Popular
              </span>
            </div>

            <div className="mb-6">
              <div className="font-mono text-[10px] text-accent-magenta uppercase tracking-widest mb-2">
                Ixos Pro
              </div>
              <div className="flex items-end gap-2">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={annual ? "annual" : "monthly"}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="font-display font-bold text-6xl text-fg-porcelain tracking-tight"
                  >
                    ${displayPrice.toFixed(2)}
                  </motion.div>
                </AnimatePresence>
                <div className="font-mono text-xs text-fg-muted mb-3">
                  / month
                </div>
              </div>
              {annual ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="font-mono text-xs text-accent-magenta"
                >
                  Billed ${(annualPrice * 12).toFixed(2)} annually
                </motion.div>
              ) : (
                <div className="font-mono text-xs text-fg-muted mt-1">
                  Billed monthly
                </div>
              )}
            </div>

            <button className="w-full h-11 bg-accent-magenta hover:bg-[#f585c2] transition-all font-mono text-sm text-white font-semibold uppercase tracking-widest mb-8 shadow-[0_0_20px_rgba(244,114,182,0.3)] hover:shadow-[0_0_30px_rgba(244,114,182,0.5)]">
              Start 14-Day Free Trial
            </button>

            <div className="flex flex-col gap-3 flex-1">
              {PRO_FEATURES.map((feature, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 ${
                    feature.header ? "border-t border-white/5 pt-1 mt-1" : ""
                  }`}
                >
                  {feature.header ? (
                    <div className="font-mono text-xs text-fg-muted italic">
                      {feature.label}
                    </div>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-accent-magenta shrink-0" />
                      <span className="font-mono text-sm text-fg-porcelain/90">
                        {feature.label}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Expand comparison */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="flex items-center gap-2 mx-auto font-mono text-sm text-fg-muted hover:text-fg-porcelain transition-colors group"
          >
            See the full comparison
            <motion.div
              animate={{ rotate: showComparison ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4 group-hover:text-accent-magenta transition-colors" />
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
                  <table className="w-full text-left font-mono min-w-[500px] border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-[#161B22]">
                        <th className="p-5 font-mono text-xs text-fg-muted uppercase tracking-widest font-normal w-1/2">
                          Feature
                        </th>
                        <th className="p-5 font-mono text-xs text-fg-porcelain uppercase tracking-widest font-semibold border-l border-white/10 w-1/4 text-center">
                          Local
                        </th>
                        <th className="p-5 font-mono text-xs text-accent-magenta uppercase tracking-widest font-semibold border-l border-white/10 w-1/4 text-center bg-accent-magenta/5">
                          Pro
                        </th>
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
                          <td className="p-5 text-fg-porcelain/80">
                            {row.label}
                          </td>
                          <td className="p-5 border-l border-white/10 text-center">
                            {typeof row.free === "boolean" ? (
                              row.free ? (
                                <Check className="w-4 h-4 text-[#27C93F] mx-auto" />
                              ) : (
                                <Minus className="w-4 h-4 text-fg-muted/20 mx-auto" />
                              )
                            ) : (
                              <span className="text-fg-muted">{row.free}</span>
                            )}
                          </td>
                          <td className="p-5 border-l border-white/10 text-center bg-accent-magenta/[0.02]">
                            {typeof row.pro === "boolean" ? (
                              row.pro ? (
                                <Check className="w-4 h-4 text-accent-magenta mx-auto" />
                              ) : (
                                <Minus className="w-4 h-4 text-fg-muted/20 mx-auto" />
                              )
                            ) : (
                              <span className="text-accent-magenta font-medium">
                                {row.pro}
                              </span>
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
