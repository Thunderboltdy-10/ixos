"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { FileNodesBg } from "./FileNodesBg";

// ─── Data ─────────────────────────────────────────────────────────────────────
const FREE_FEATURES = [
  "Core semantic search",
  "Hybrid retrieval",
  "Progressive results",
  "Local-first privacy",
  "CLI + Desktop app",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Ask Mode",
  "Today context",
  "Workstreams",
  "Quality selector (Flash / Auto / Pro)",
  "Priority support",
];

// ─── Feature row ──────────────────────────────────────────────────────────────
function FeatureRow({
  label,
  delay,
  inView,
  highlight,
}: {
  label: string;
  delay: number;
  inView: boolean;
  highlight: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ delay, duration: 0.35 }}
      className="flex items-center gap-3 py-2"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={inView ? { scale: 1 } : { scale: 0 }}
        transition={{ delay: delay + 0.1, duration: 0.25 }}
        style={{
          width: 6,
          height: 6,
          backgroundColor: highlight ? "#2DD4BF" : "rgba(255,255,255,0.25)",
          flexShrink: 0,
        }}
      />
      <span
        className="font-mono text-[11px]"
        style={{ color: highlight ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.42)" }}
      >
        {label}
      </span>
    </motion.div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function PricingV4() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section
      ref={sectionRef}
      className="relative py-32 px-6 overflow-hidden"
      style={{
        backgroundColor: "#0C0E10",
        borderTop: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      {/* Blueprint grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.014) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.014) 1px, transparent 1px)
          `,
          backgroundSize: "72px 72px",
        }}
      />

      <FileNodesBg density={0.15} opacity={0.1} color="#2DD4BF" speed={0.4} />

      <div className="relative z-10 max-w-4xl mx-auto w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55 }}
          className="text-center mb-16"
        >
          <p className="font-mono text-[10px] tracking-[0.35em] uppercase mb-4" style={{ color: "rgba(255,255,255,0.2)" }}>
            Pricing · Plans
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
            Simple pricing.
          </h2>
          <p className="font-mono text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
            Start free. Upgrade when you&apos;re ready.
          </p>
        </motion.div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free tier */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1, duration: 0.55 }}
            className="flex flex-col p-8"
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              backgroundColor: "rgba(255,255,255,0.015)",
            }}
          >
            {/* Tier label */}
            <div className="mb-6">
              <p className="font-mono text-[9px] tracking-[0.3em] uppercase mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>
                Free forever
              </p>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-5xl font-bold text-white">$0</span>
              </div>
            </div>

            {/* Features */}
            <div className="flex-1 mb-8">
              {FREE_FEATURES.map((f, i) => (
                <FeatureRow
                  key={f}
                  label={f}
                  delay={0.2 + i * 0.06}
                  inView={inView}
                  highlight={false}
                />
              ))}
            </div>

            {/* CTA */}
            <Link
              href="/download"
              className="font-mono text-xs px-6 py-3 text-center tracking-[0.2em] uppercase transition-all duration-200 hover:border-white/30 active:scale-[0.98]"
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              Download Free
            </Link>
          </motion.div>

          {/* Pro tier */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.55 }}
            className="flex flex-col p-8 relative"
            style={{
              border: "1px solid rgba(45,212,191,0.25)",
              backgroundColor: "rgba(45,212,191,0.03)",
              boxShadow: "0 0 48px rgba(45,212,191,0.06), inset 0 0 32px rgba(45,212,191,0.02)",
            }}
          >
            {/* Ambient glow corners */}
            <div
              className="absolute top-0 left-0 w-16 h-16 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at top left, rgba(45,212,191,0.12), transparent 70%)",
              }}
            />
            <div
              className="absolute bottom-0 right-0 w-16 h-16 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at bottom right, rgba(45,212,191,0.08), transparent 70%)",
              }}
            />

            {/* Badge */}
            <div className="absolute -top-3 left-8">
              <span
                className="font-mono text-[8px] tracking-[0.25em] uppercase px-3 py-1"
                style={{ backgroundColor: "#2DD4BF", color: "#0C0E10" }}
              >
                Most Popular
              </span>
            </div>

            {/* Tier label */}
            <div className="mb-6">
              <p className="font-mono text-[9px] tracking-[0.3em] uppercase mb-2" style={{ color: "#2DD4BF" }}>
                For power users
              </p>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-5xl font-bold text-white">$9</span>
                <span className="font-mono text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>/mo</span>
              </div>
              <p className="font-mono text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                or $79/yr — save 27%
              </p>
            </div>

            {/* Features */}
            <div className="flex-1 mb-8">
              {PRO_FEATURES.map((f, i) => (
                <FeatureRow
                  key={f}
                  label={f}
                  delay={0.3 + i * 0.06}
                  inView={inView}
                  highlight={true}
                />
              ))}
            </div>

            {/* CTA */}
            <Link
              href="/pro"
              className="font-mono text-xs px-6 py-3 text-center font-semibold tracking-[0.2em] uppercase transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: "#2DD4BF", color: "#0C0E10" }}
            >
              Get Pro
            </Link>
          </motion.div>
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mt-8 text-center font-mono text-[9px] tracking-[0.15em]"
          style={{ color: "rgba(255,255,255,0.15)" }}
        >
          All plans include local-first architecture. No data ever leaves your device.
        </motion.p>
      </div>
    </section>
  );
}
