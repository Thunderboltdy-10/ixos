"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { ShieldAlert, DatabaseBackup, WifiOff, KeySquare } from "lucide-react";

const CARDS = [
  {
    icon: WifiOff,
    title: "Air-Gapped Core",
    description:
      "The primary semantic engine and all local embedding models operate entirely offline. No telemetry. No secret remote logging. Zero network calls during query execution.",
  },
  {
    icon: DatabaseBackup,
    title: "Ephemeral Memory",
    description:
      "Context is generated JIT (Just-In-Time) and immediately destroyed after ranking. No stagnant databases full of sensitive code snippets sitting on your drive.",
  },
  {
    icon: ShieldAlert,
    title: "Open Validation",
    description:
      "The chunking logic and file readers are open source. Audit exactly how we parse your files in real-time. Nothing is hidden, obfuscated, or server-side.",
  },
  {
    icon: KeySquare,
    title: "Ed25519 Attestation",
    description:
      "Every search result set is cryptographically signed with an Ed25519 keypair. Verify result integrity end-to-end — tampered rankings are provably detectable.",
  },
];

export function TrustV1() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      className="py-32 bg-[#0E1117] border-b border-white/5"
    >
      <SectionDivider accent="amber" label="SECURITY_POSTURE" />

      <div className="container mx-auto px-6 max-w-7xl">

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-display font-bold text-fg-porcelain tracking-tight mb-4">
            Your data stays
            <br />
            <span className="text-accent-amber italic">local.</span>
          </h2>
          <p className="font-mono text-fg-muted max-w-2xl mx-auto">
            Designed with an architecture that inherently precludes data
            exfiltration. Your code is yours alone.
          </p>
        </motion.div>

        {/* Animated top border line */}
        <div className="relative h-[1px] mb-0 overflow-hidden">
          <motion.div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-transparent via-accent-amber/50 to-transparent"
            initial={{ width: "0%", x: "0%" }}
            animate={isInView ? { width: "100%", x: "0%" } : { width: "0%" }}
            transition={{ duration: 1.5, delay: 0.2, ease: "easeInOut" }}
          />
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[1px] bg-white/10 border border-white/10 border-t-0">
          {CARDS.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 + index * 0.12 }}
                className="bg-[#0E1117] p-10 flex flex-col items-center text-center group hover:bg-bg-graphite-1/30 transition-all cursor-default relative overflow-hidden"
                whileHover={{
                  boxShadow:
                    "0 0 30px rgba(246,185,76,0.06), inset 0 0 20px rgba(246,185,76,0.03)",
                }}
              >
                {/* Amber border reveal on hover */}
                <motion.div className="absolute inset-0 border border-accent-amber/0 group-hover:border-accent-amber/20 transition-all duration-300 pointer-events-none" />

                <motion.div
                  whileHover={{ scale: 1.15 }}
                  transition={{ duration: 0.2 }}
                  className="mb-6"
                >
                  <Icon className="w-10 h-10 text-fg-muted group-hover:text-accent-amber transition-colors duration-300" />
                </motion.div>

                <h4 className="font-display text-xl text-fg-porcelain mb-3">
                  {card.title}
                </h4>
                <p className="font-mono text-sm text-fg-muted leading-relaxed">
                  {card.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
