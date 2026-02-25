"use client";

import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { Copy, Terminal, Check } from "lucide-react";

type ActionItem = {
  id: string;
  type: "pull_request" | "debug" | "task" | "review" | "deploy";
  title: string;
  path: string;
  confidence: number;
  command: string;
};

const ACTIONS: ActionItem[] = [
  { id: "a1", type: "pull_request", title: "Review Auth Middleware PR", path: "src/auth/middleware.rs", confidence: 98, command: "gh pr checkout 442 && ixos view src/auth/middleware.rs" },
  { id: "a2", type: "debug", title: "Investigate OOM Error Log", path: "logs/daemon_crash.log", confidence: 85, command: "ixos search 'OOM' logs/ --tail 100" },
  { id: "a3", type: "review", title: "Unreviewed Semantic Changes", path: "src/rank/hybrid_engine.rs", confidence: 79, command: "ixos diff HEAD~3 src/rank/ --format json" },
  { id: "a4", type: "task", title: "Update Dependencies", path: "Cargo.toml", confidence: 72, command: "cargo outdated && cargo update" },
  { id: "a5", type: "deploy", title: "Stage v3.2 Release Build", path: "scripts/release.sh", confidence: 65, command: "cargo build --release && ./scripts/release.sh --dry-run" },
];

const TYPE_LABELS: Record<ActionItem["type"], string> = {
  pull_request: "pull request",
  debug: "debug",
  review: "review",
  task: "task",
  deploy: "deploy",
};

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
      className="w-full md:w-auto flex items-center gap-3 bg-[#0A0D14] p-3 border border-white/10 font-mono text-xs cursor-copy hover:border-white/20 transition-colors group/copy shrink-0"
    >
      <span className="text-accent-amber">$</span>
      <span className="text-fg-porcelain/90 truncate max-w-[200px] lg:max-w-xs">{command}</span>
      <div className="shrink-0 flex items-center gap-1 text-[10px] uppercase tracking-widest bg-white/5 px-2 py-1">
        {copied ? (
          <><Check className="w-3 h-3 text-accent-amber" /><span className="text-accent-amber">Copied!</span></>
        ) : (
          <><Copy className="w-3 h-3 text-fg-muted group-hover/copy:text-fg-porcelain transition-colors" /><span className="text-fg-muted group-hover/copy:text-fg-porcelain transition-colors">Copy</span></>
        )}
      </div>
    </button>
  );
}

export function TodayV3() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section
      ref={sectionRef}
      className="py-32 bg-[#0E1117] border-b border-white/5"
    >
      <SectionDivider accent="amber" label="ACTIONABLE_QUEUE" />

      <div className="container mx-auto px-6 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold text-fg-porcelain leading-[1.05] mb-4">
            Triage,
            <br />
            <span className="text-accent-amber italic">automated.</span>
          </h2>
          <p className="font-mono text-fg-muted max-w-2xl">
            Ixos synthesizes your local file changes, open PRs, and recent terminal commands to predict what you need to focus on right now.
          </p>
        </motion.div>

        <div className="flex flex-col gap-3">
          {ACTIONS.map((action, index) => (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.07 }}
              className="bg-bg-graphite-1 border border-white/5 p-6 flex flex-col md:flex-row justify-between gap-4"
            >
              {/* Left */}
              <div className="flex-1 flex flex-col gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono text-[10px] text-fg-muted uppercase tracking-widest border border-white/10 px-1.5 py-0.5 bg-white/5">
                    {TYPE_LABELS[action.type]}
                  </span>
                  <h4 className="font-display font-medium text-lg text-fg-porcelain">{action.title}</h4>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="flex items-center gap-1.5 font-mono text-xs text-fg-muted">
                    <Terminal className="w-3 h-3" />
                    {action.path}
                  </span>
                  <div className="flex items-center gap-2 font-mono text-xs text-fg-muted">
                    <span>Confidence: <span className="text-fg-porcelain">{action.confidence}%</span></span>
                    <div className="w-20 h-0.5 bg-bg-graphite-2 overflow-hidden hidden sm:block">
                      <motion.div
                        className="h-full bg-accent-amber"
                        initial={{ width: "0%" }}
                        animate={isInView ? { width: `${action.confidence}%` } : { width: "0%" }}
                        transition={{ duration: 0.8, delay: 0.2 + index * 0.07, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right */}
              <CopyButton command={action.command} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
