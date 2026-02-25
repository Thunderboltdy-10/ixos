"use client";

import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { Terminal, Copy, Check } from "lucide-react";

type ActionType = "pull_request" | "debug" | "task";

type ActionItem = {
  id: string;
  type: ActionType;
  title: string;
  path: string;
  confidence: number;
  command: string;
};

const ACTIONS: ActionItem[] = [
  {
    id: "a1",
    type: "pull_request",
    title: "Review Auth Middleware PR",
    path: "src/auth/middleware.rs",
    confidence: 98,
    command: "gh pr checkout 442 && ixos view src/auth/",
  },
  {
    id: "a2",
    type: "debug",
    title: "Investigate OOM Error Log",
    path: "logs/daemon_crash.log",
    confidence: 85,
    command: "ixos search 'OOM memory' logs/ --tail 100",
  },
  {
    id: "a3",
    type: "task",
    title: "Update Dependencies",
    path: "Cargo.toml",
    confidence: 72,
    command: "cargo outdated",
  },
];

function CopyButton({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(command).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      onClick={handleCopy}
      className="bg-[#0A0D14] border border-white/10 px-4 py-2.5 font-mono text-xs flex items-center gap-3 cursor-copy hover:border-accent-amber/30 transition-colors group w-full md:w-auto text-left"
    >
      <span className="text-accent-amber shrink-0">$</span>
      <span className="text-fg-porcelain/80 truncate">{command}</span>
      {copied ? (
        <Check className="w-3.5 h-3.5 text-accent-amber shrink-0" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-fg-muted group-hover:text-accent-amber transition-colors shrink-0" />
      )}
    </button>
  );
}

export function WorkstreamsV1() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section
      ref={sectionRef}
      className="py-32 bg-[#0A0D14] border-b border-white/5"
    >
      <SectionDivider accent="amber" label="ACTIONABLE_QUEUE" />

      <div className="container mx-auto px-6 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold text-fg-porcelain leading-[1.05] mb-6">
            Triage,
            <br />
            <span className="text-accent-amber italic">automated.</span>
          </h2>
          <p className="font-mono text-fg-muted max-w-2xl leading-relaxed">
            Ixos cross-references your file changes, open PRs, and recent
            searches to surface exactly what needs attention.
          </p>
        </motion.div>

        <div className="flex flex-col gap-3">
          {ACTIONS.map((action, index) => (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.07 }}
              className="bg-bg-graphite-1 border border-white/5 p-5 flex flex-col md:flex-row justify-between gap-4 group hover:border-white/10 transition-colors"
            >
              {/* Left */}
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[10px] bg-bg-graphite-2 border border-white/10 px-2 py-0.5 uppercase text-fg-muted w-fit">
                  {action.type.replace("_", " ")}
                </span>
                <h4 className="font-display font-medium text-lg text-fg-porcelain">
                  {action.title}
                </h4>
                <div className="font-mono text-xs text-fg-muted flex items-center gap-1.5">
                  <Terminal className="w-3 h-3" />
                  {action.path}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1 bg-bg-graphite-2 overflow-hidden">
                    <motion.div
                      className="h-full bg-accent-amber"
                      initial={{ width: 0 }}
                      animate={
                        isInView ? { width: `${action.confidence}%` } : { width: 0 }
                      }
                      transition={{
                        duration: 0.8,
                        delay: 0.2 + index * 0.07,
                        ease: "easeOut",
                      }}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-accent-amber">
                    {action.confidence}% confidence
                  </span>
                </div>
              </div>

              {/* Right */}
              <div className="flex items-start md:items-center">
                <CopyButton command={action.command} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
