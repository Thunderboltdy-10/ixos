"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { GitBranch } from "lucide-react";

type WorkstreamRow = {
  id: string;
  name: string;
  branch: string;
  status: "ACTIVE" | "DORMANT" | "ARCHIVED";
  queries: number;
  files: number;
  lastActive: string;
};

const WORKSTREAMS: WorkstreamRow[] = [
  { id: "w1", name: "OAuth V3 Migration", branch: "feature/oauth3", status: "ACTIVE", queries: 142, files: 12, lastActive: "12 mins ago" },
  { id: "w2", name: "Dashboard Performance", branch: "fix/dash-perf", status: "ACTIVE", queries: 89, files: 5, lastActive: "2 hours ago" },
  { id: "w3", name: "Stripe Billing Sync", branch: "feature/billing", status: "DORMANT", queries: 412, files: 24, lastActive: "3 days ago" },
  { id: "w4", name: "Initial Auth Setup", branch: "archived/auth-v1", status: "ARCHIVED", queries: 890, files: 45, lastActive: "2 months ago" },
];

export function WorkstreamsV3() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section
      ref={sectionRef}
      className="py-32 bg-[#0A0D14] border-b border-white/5"
    >
      <SectionDivider accent="amber" label="WORKSTREAM_INDEX" />

      <div className="container mx-auto px-6 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold text-fg-porcelain leading-[1.05] mb-4">
            Context,
            <br />
            <span className="text-accent-amber italic">preserved.</span>
          </h2>
          <p className="font-mono text-fg-muted max-w-xl">
            A completely searchable, chronological database of your past workstreams, automatically grouped by branch and semantic intent.
          </p>
        </motion.div>

        <div className="border border-white/10 overflow-x-auto w-full">
          <table className="w-full text-left font-mono whitespace-nowrap">
            <thead className="bg-[#161B22] border-b border-white/10">
              <tr>
                <th className="p-4 text-[10px] text-fg-muted font-normal uppercase tracking-widest">ID</th>
                <th className="p-4 text-[10px] text-fg-muted font-normal uppercase tracking-widest">Thread Name</th>
                <th className="p-4 text-[10px] text-fg-muted font-normal uppercase tracking-widest">Associated Branch</th>
                <th className="p-4 text-[10px] text-fg-muted font-normal uppercase tracking-widest text-center">Status</th>
                <th className="p-4 text-[10px] text-fg-muted font-normal uppercase tracking-widest text-right">Activity</th>
                <th className="p-4 text-[10px] text-fg-muted font-normal uppercase tracking-widest text-right">Last Action</th>
              </tr>
            </thead>
            <tbody>
              {WORKSTREAMS.map((row, index) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.1 + index * 0.07 }}
                  className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${row.status === "ARCHIVED" ? "opacity-40" : ""}`}
                >
                  <td className="p-4 text-xs text-fg-muted/50">{row.id.toUpperCase()}</td>
                  <td className="p-4 text-sm text-fg-porcelain">{row.name}</td>
                  <td className="p-4">
                    <div className="inline-flex items-center gap-2 px-2 py-1 bg-bg-graphite-2 text-xs text-fg-muted border border-white/5">
                      <GitBranch className="w-3 h-3 text-fg-muted/50" />
                      {row.branch}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`text-[10px] px-2 py-0.5 border uppercase tracking-widest inline-flex items-center gap-1.5 ${
                      row.status === "ACTIVE"
                        ? "bg-accent-amber/10 border-accent-amber/30 text-accent-amber"
                        : row.status === "DORMANT"
                        ? "bg-white/5 border-white/10 text-fg-muted"
                        : "bg-transparent border-transparent text-fg-muted/40"
                    }`}>
                      {row.status === "ACTIVE" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-amber" />
                      )}
                      {row.status}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-right text-fg-muted">
                    <span className="text-fg-porcelain">{row.queries}</span> queries / <span className="text-fg-porcelain">{row.files}</span> files
                  </td>
                  <td className="p-4 text-xs text-right text-fg-muted">{row.lastActive}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
