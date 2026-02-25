"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { SectionDivider } from "@/components/ui/SectionDivider";

type TimelineEvent = {
  id: string;
  time: string;
  branch: string;
  title: string;
  description: string;
  isLeft: boolean;
};

const EVENTS: TimelineEvent[] = [
  {
    id: "e1",
    time: "09:42 AM",
    branch: "main",
    title: "Searched Auth Methods",
    description:
      "Checked for recent changes to token deserialization in middleware.",
    isLeft: true,
  },
  {
    id: "e2",
    time: "10:15 AM",
    branch: "fix/auth-token-dup",
    title: "Modified token.ts",
    description:
      "Removed duplicate trusted_device_pubkey_hash from JWT payload generation.",
    isLeft: false,
  },
  {
    id: "e3",
    time: "10:30 AM",
    branch: "fix/auth-token-dup",
    title: "Verified Entitlement Manager",
    description:
      "Searched across Rust backend to ensure pubkey hash was still mapped correctly.",
    isLeft: true,
  },
  {
    id: "e4",
    time: "11:05 AM",
    branch: "fix/auth-token-dup",
    title: "PR #442 Created",
    description: "Opened PR: Fix token duplicate field blocking validation.",
    isLeft: false,
  },
  {
    id: "e5",
    time: "11:32 AM",
    branch: "fix/auth-token-dup",
    title: "Merged to main",
    description: "CI passed. Vercel deploy triggered. Done.",
    isLeft: true,
  },
];

function EventCard({
  event,
  index,
  isInView,
}: {
  event: TimelineEvent;
  index: number;
  isInView: boolean;
}) {
  const cardContent = (
    <div className="bg-bg-graphite-1 border border-white/10 p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="font-mono text-xs text-fg-muted">{event.time}</span>
        <span className="font-mono text-[10px] bg-bg-graphite-2 border border-white/10 px-2 py-0.5 text-fg-muted whitespace-nowrap">
          {event.branch}
        </span>
      </div>
      <h4 className="font-display font-semibold text-fg-porcelain text-base mb-1.5">
        {event.title}
      </h4>
      <p className="font-mono text-xs text-fg-muted leading-relaxed">
        {event.description}
      </p>
    </div>
  );

  return (
    <>
      {/* Desktop: alternating */}
      <div className="hidden md:flex w-full items-center mb-10 last:mb-0">
        {/* Left slot */}
        <div className="w-[46%] flex justify-end pr-8">
          {event.isLeft ? (
            <motion.div
              className="w-full"
              initial={{ opacity: 0, x: -24 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + index * 0.07 }}
            >
              {cardContent}
            </motion.div>
          ) : (
            <div />
          )}
        </div>

        {/* Center dot */}
        <div className="flex-shrink-0 w-8 flex justify-center z-10">
          <div className="w-3 h-3 rounded-full bg-bg-graphite-0 border-2 border-accent-amber" />
        </div>

        {/* Right slot */}
        <div className="w-[46%] pl-8">
          {!event.isLeft ? (
            <motion.div
              className="w-full"
              initial={{ opacity: 0, x: 24 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + index * 0.07 }}
            >
              {cardContent}
            </motion.div>
          ) : (
            <div />
          )}
        </div>
      </div>

      {/* Mobile: stacked */}
      <motion.div
        className="md:hidden mb-4 last:mb-0 border-l-2 border-l-accent-amber"
        initial={{ opacity: 0, y: 16 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.1 + index * 0.07 }}
      >
        <div className="bg-bg-graphite-1 border border-white/10 border-l-0 p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="font-mono text-xs text-fg-muted">{event.time}</span>
            <span className="font-mono text-[10px] bg-bg-graphite-2 border border-white/10 px-2 py-0.5 text-fg-muted whitespace-nowrap">
              {event.branch}
            </span>
          </div>
          <h4 className="font-display font-semibold text-fg-porcelain text-base mb-1.5">
            {event.title}
          </h4>
          <p className="font-mono text-xs text-fg-muted leading-relaxed">
            {event.description}
          </p>
        </div>
      </motion.div>
    </>
  );
}

export function TodayV1() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section
      ref={sectionRef}
      className="py-32 bg-[#0E1117] border-b border-white/5"
    >
      <SectionDivider accent="amber" label="WORKSTREAM_HISTORY" />

      <div className="container mx-auto px-6 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="max-w-lg mb-20"
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold text-fg-porcelain leading-[1.05] mb-6">
            The history of a
            <br />
            <span className="text-accent-amber italic">thought.</span>
          </h2>
          <p className="font-mono text-fg-muted leading-relaxed">
            A chronological record of your work. Every search, every file edit,
            every branch switch — threaded automatically by Ixos.
          </p>
        </motion.div>

        {/* Timeline container */}
        <div className="relative">
          {/* Vertical center line — desktop only */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-white/10 -translate-x-1/2" />

          {/* Animated particle — desktop only */}
          <motion.div
            className="hidden md:block absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-accent-amber z-20 pointer-events-none"
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ duration: 8, ease: "linear", repeat: Infinity }}
          />

          {/* Events */}
          <div className="relative z-10">
            {EVENTS.map((event, index) => (
              <EventCard
                key={event.id}
                event={event}
                index={index}
                isInView={isInView}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
