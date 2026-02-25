"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { WifiOff, DatabaseBackup, ShieldAlert, KeyRound } from "lucide-react";

const CARDS = [
  {
    icon: WifiOff,
    title: "Air-Gapped Core",
    description: "The primary semantic engine and all local embedding models operate entirely offline. No telemetry. No secret remote logging. Zero network calls during query execution.",
  },
  {
    icon: DatabaseBackup,
    title: "Ephemeral Memory",
    description: "Context is generated JIT and immediately destroyed after ranking. No stagnant databases full of sensitive code snippets sitting on your drive.",
  },
  {
    icon: ShieldAlert,
    title: "Open Validation",
    description: "The chunking logic and file readers are open source. Audit exactly how we parse your files in real-time. Nothing is hidden, obfuscated, or server-side.",
  },
  {
    icon: KeyRound,
    title: "Ed25519 Attestation",
    description: "Every search result set is cryptographically signed with an Ed25519 keypair. Verify result integrity end-to-end — tampered rankings are provably detectable.",
  },
];

export function TrustV3() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section
      ref={sectionRef}
      className="py-32 bg-[#0E1117] border-b border-white/5"
    >
      <SectionDivider accent="amber" label="SECURITY_POSTURE" />

      <div className="container mx-auto px-6 max-w-7xl">

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold text-fg-porcelain leading-[1.05] mb-4">
            Zero{" "}
            <span className="text-accent-amber italic">compromise.</span>
          </h2>
          <p className="font-mono text-fg-muted max-w-2xl mx-auto">
            Designed with an architecture that inherently precludes data exfiltration. Your code is yours alone.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/10 border border-white/10">
          {CARDS.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 16 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.07 }}
                className="bg-[#0E1117] p-8 flex flex-col gap-4 group hover:bg-bg-graphite-1/30 transition-colors cursor-default border border-transparent hover:border-white/10"
              >
                <Icon className="w-8 h-8 text-fg-muted group-hover:text-accent-amber transition-colors duration-300" />
                <h4 className="font-display text-xl text-fg-porcelain">{card.title}</h4>
                <p className="font-mono text-sm text-fg-muted leading-relaxed">{card.description}</p>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
