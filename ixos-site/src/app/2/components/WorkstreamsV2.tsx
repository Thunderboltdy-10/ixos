"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { GitBranch, Search, FileEdit, GitPullRequest, Rocket } from "lucide-react";

type TimelineItem = {
  id: string;
  time: string;
  branch: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  side: "left" | "right";
};

const TIMELINE: TimelineItem[] = [
  {
    id: "t1",
    time: "09:42 AM",
    branch: "main",
    title: "Searched Auth Methods",
    description: "Checked for recent changes to token deserialization in middleware.",
    icon: <Search className="w-4 h-4" />,
    side: "left",
  },
  {
    id: "t2",
    time: "10:15 AM",
    branch: "fix/auth-token-dup",
    title: "Modified token.ts",
    description: "Removed duplicate trusted_device_pubkey_hash from JWT payload generation.",
    icon: <FileEdit className="w-4 h-4" />,
    side: "right",
  },
  {
    id: "t3",
    time: "10:30 AM",
    branch: "fix/auth-token-dup",
    title: "Verified Entitlement Manager",
    description: "Searched across Rust backend to ensure pubkey hash was still mapped correctly.",
    icon: <Search className="w-4 h-4" />,
    side: "left",
  },
  {
    id: "t4",
    time: "11:05 AM",
    branch: "fix/auth-token-dup",
    title: "PR #442 Created",
    description: "Opened PR: Fix token duplicate field blocking validation.",
    icon: <GitPullRequest className="w-4 h-4" />,
    side: "right",
  },
  {
    id: "t5",
    time: "11:32 AM",
    branch: "fix/auth-token-dup",
    title: "Deployed to Staging",
    description: "CI passed, merged to main, Vercel deploy complete.",
    icon: <Rocket className="w-4 h-4" />,
    side: "left",
  },
];

function TimelineCard({ item, index }: { item: TimelineItem; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <div ref={ref} className={`relative flex items-center gap-0 ${item.side === "left" ? "flex-row" : "flex-row-reverse"} w-full`}>
      {/* Card */}
      <motion.div
        initial={{ opacity: 0, x: item.side === "left" ? -48 : 48 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.55, delay: index * 0.12, ease: "easeOut" }}
        className="w-[calc(50%-28px)] group"
      >
        <div
          className="relative bg-bg-graphite-1 border border-white/[0.08] p-5 hover:border-accent-amber/30 transition-all duration-300"
          style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}
        >
          {/* Top row */}
          <div className={`flex items-center gap-2 mb-3 ${item.side === "right" ? "flex-row-reverse" : ""}`}>
            <span className="font-mono text-[10px] text-fg-muted uppercase tracking-widest">{item.time}</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-bg-graphite-2 border border-white/[0.08]">
              <GitBranch className="w-2.5 h-2.5 text-accent-amber/50" />
              <span className="font-mono text-[10px] text-fg-muted">{item.branch}</span>
            </div>
          </div>

          <h3 className="font-display font-semibold text-fg-porcelain text-lg mb-1.5 leading-snug">
            {item.title}
          </h3>

          <p className="font-mono text-sm text-fg-muted leading-relaxed">
            {item.description}
          </p>

          {/* Amber accent bar */}
          <div
            className={`absolute top-0 ${item.side === "left" ? "right-0" : "left-0"} w-[2px] h-full bg-accent-amber/15 group-hover:bg-accent-amber/50 transition-colors`}
          />
        </div>
      </motion.div>

      {/* Center dot + icon */}
      <div className="w-14 flex items-center justify-center shrink-0 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.4, delay: index * 0.12 + 0.1, type: "spring", stiffness: 300 }}
          className="w-10 h-10 bg-bg-graphite-2 border-2 border-accent-amber flex items-center justify-center text-accent-amber"
          style={{ boxShadow: "0 0 12px rgba(246,185,76,0.3), 0 0 28px rgba(246,185,76,0.1)" }}
        >
          {item.icon}
        </motion.div>
      </div>

      {/* Empty space on other side */}
      <div className="w-[calc(50%-28px)]" />
    </div>
  );
}

function CenterLine() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  return (
    <div ref={ref} className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-[2px] pointer-events-none">
      <motion.div
        className="w-full bg-gradient-to-b from-accent-amber/60 via-accent-amber/30 to-accent-amber/10"
        initial={{ height: 0 }}
        animate={isInView ? { height: "100%" } : {}}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }}
      />
      {/* Animated amber particle */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 w-1.5 h-8 bg-accent-amber/60 blur-[2px]"
        animate={{ top: ["0%", "100%", "0%"] }}
        transition={{ duration: 5, ease: "linear", repeat: Infinity }}
      />
    </div>
  );
}

export function WorkstreamsV2() {
  const sectionRef = useRef<HTMLDivElement>(null);

  return (
    <section ref={sectionRef} className="relative py-32 bg-[#0A0D14] border-b border-white/5 overflow-hidden">
      <SectionDivider accent="amber" label="WORKSTREAM_HISTORY" />

      <div className="container mx-auto px-6 max-w-5xl relative z-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-6xl font-display font-bold tracking-tight text-fg-porcelain mb-5 leading-tight">
            Every thought,
            <br />
            <span className="text-accent-amber italic">threaded.</span>
          </h2>
          <p className="font-mono text-fg-muted max-w-2xl mx-auto leading-relaxed">
            A beautiful, chronological narrative of your work. Every search, every code edit, every branch switch — threaded perfectly into a seamless workstream.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative flex flex-col gap-10">
          <CenterLine />

          {TIMELINE.map((item, i) => (
            <TimelineCard key={item.id} item={item} index={i} />
          ))}
        </div>

        {/* Footer hint */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-20 text-center"
        >
          <div className="inline-flex items-center gap-3 px-5 py-2.5 border border-accent-amber/20 bg-accent-amber/5 font-mono text-sm text-fg-muted">
            <span className="w-2 h-2 rounded-full bg-accent-amber animate-pulse" />
            Workstream tracking is automatic — zero configuration required.
          </div>
        </motion.div>
      </div>
    </section>
  );
}
