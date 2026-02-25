"use client";

import { motion } from "framer-motion";
import { SectionDivider } from "@/components/ui/SectionDivider";

type TaskCard = {
  type: string;
  title: string;
  path: string;
  cmd: string;
};

const UPCOMING: TaskCard[] = [
  { type: "review", title: "Review Auth Middleware PR", path: "src/auth/middleware.rs", cmd: "gh pr checkout 442" },
  { type: "test", title: "Write billing tests", path: "src/billing/stripe.rs", cmd: "cargo test billing::" },
];

const FOCUS: TaskCard[] = [
  { type: "debug", title: "Investigate OOM in daemon", path: "logs/daemon_crash.log", cmd: "ixos search 'OOM' logs/ --tail 100" },
];

const DONE: TaskCard[] = [
  { type: "deploy", title: "Deploy hotfix", path: "main", cmd: "git push origin main" },
  { type: "review", title: "Merge dep updates", path: "Cargo.toml", cmd: "cargo update" },
];

function Card({ task, dim, focus }: { task: TaskCard; dim?: boolean; focus?: boolean }) {
  return (
    <div className={`bg-bg-graphite-1 border p-4 ${focus ? "border-accent-amber/20" : "border-white/5"} ${dim ? "opacity-50" : ""}`}>
      <div className="bg-bg-graphite-2 border border-white/10 font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 inline-block mb-2">
        {task.type}
      </div>
      <h4 className="font-display font-medium text-sm text-fg-porcelain mt-2">{task.title}</h4>
      <p className="font-mono text-[10px] text-fg-muted mt-1">{task.path}</p>
      <div className="mt-3 bg-[#0D1117] border border-white/5 px-3 py-2 font-mono text-[10px] text-fg-muted/70">
        <span className="text-accent-amber">$ </span>{task.cmd}
      </div>
    </div>
  );
}

export function TodayV2() {
  return (
    <section className="py-32 bg-[#0E1117] border-b border-white/5">
      <SectionDivider accent="amber" label="TODAY_VIEW" />

      <div className="container mx-auto px-6 max-w-7xl">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-12 max-w-2xl"
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold text-fg-porcelain leading-[1.05] mb-4">
            Your day,
            <br />
            <span className="text-accent-amber italic">organized.</span>
          </h2>
          <p className="font-mono text-fg-muted leading-relaxed">
            Ixos synthesizes git activity, open PRs, and recent searches to surface what needs attention.
          </p>
        </motion.div>

        {/* 3-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* UPCOMING */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0 }}
          >
            <div className="font-mono text-[10px] text-fg-muted uppercase tracking-widest pb-3 border-b border-white/10 mb-4">
              Upcoming
            </div>
            <div className="flex flex-col gap-3">
              {UPCOMING.map(task => <Card key={task.title} task={task} />)}
            </div>
          </motion.div>

          {/* FOCUS */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.07 }}
            className="bg-accent-amber/[0.02] border border-accent-amber/10 p-4"
          >
            <div className="font-mono text-[10px] text-accent-amber uppercase tracking-widest pb-3 border-b border-accent-amber/30 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-amber animate-pulse" />
              Focus
            </div>
            <div className="flex flex-col gap-3">
              {FOCUS.map(task => <Card key={task.title} task={task} focus />)}
            </div>
          </motion.div>

          {/* DONE */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.14 }}
          >
            <div className="font-mono text-[10px] text-fg-muted uppercase tracking-widest pb-3 border-b border-white/10 mb-4">
              Done
            </div>
            <div className="flex flex-col gap-3">
              {DONE.map(task => <Card key={task.title} task={task} dim />)}
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
