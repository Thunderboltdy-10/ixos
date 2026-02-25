"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Copy, Terminal, Database, Shield, Zap } from "lucide-react";
import benchmarkData from "@/data/benchmarks.json";

function useCounter(target: number) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let c = 0; const step = target / 60;
    const t = setInterval(() => { c += step; if (c >= target) { setCount(target); clearInterval(t); } else setCount(Math.floor(c)); }, 16);
    return () => clearInterval(t);
  }, [inView, target]);
  return { count, ref };
}

const LOG_LINES = [
  { text: "INFO: Mapping intent vec(384)...", color: "#A5D6FF" },
  { text: "READ: src/components/ui/Button.tsx [2.4kb]", color: "" },
  { text: "READ: src/lib/utils.ts [1.1kb]", color: "" },
  { text: "MATCH (0.92): src/lib/auth.ts", color: "#FF7B72" },
  { text: "SCORE: hybrid=0.94, lex=0.31, sem=0.99", color: "#A5D6FF" },
  { text: "READ: src/pages/api/login.ts [4.5kb]", color: "" },
  { text: "MATCH (0.88): src/utils/tokens.ts", color: "#FF7B72" },
  { text: "DONE: 29ms total sweep", color: "#27C93F" },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function HeroV3() {
  const { count: p50Count, ref: p50Ref } = useCounter(benchmarkData.overview.ttfrP50Ms);
  const { count: ramCount, ref: ramRef } = useCounter(benchmarkData.overview.peakRamMb);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText("brew install --cask ixos").catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const nodes = [
    {
      icon: Database,
      title: "Ralph Embedding Model",
      status: "IDLE",
      statusColor: "#27C93F",
      desc: "Local 45MB intent mapping model loaded in memory.",
      border: "border-white/5",
      bg: "bg-white/[0.02]",
      iconBg: "bg-bg-graphite-2 border-white/10",
      iconColor: "text-accent-amber",
      isActive: false,
    },
    {
      icon: Zap,
      title: "JIT Memory Sweep",
      status: "ACTIVE_QUERY",
      statusColor: "",
      desc: "Parallelizing read streams across 8 CPU cores.",
      border: "border-accent-amber/20",
      bg: "bg-accent-amber/[0.03]",
      iconBg: "bg-accent-amber/10 border-accent-amber/20",
      iconColor: "text-accent-amber",
      isActive: true,
    },
    {
      icon: Shield,
      title: "Telemetry Egress",
      status: "DISABLED",
      statusColor: "",
      desc: "Network isolation enforced. Outbound traffic blocked.",
      border: "border-white/5",
      bg: "bg-white/[0.02]",
      iconBg: "bg-bg-graphite-2 border-white/10",
      iconColor: "text-fg-muted/50",
      isActive: false,
    },
  ];

  return (
    <section className="min-h-screen bg-[#0E1117] flex items-center pt-16">
      <div className="container mx-auto px-6 max-w-7xl py-16">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-stretch">

          {/* Left Column */}
          <motion.div
            className="flex-1 flex flex-col justify-center"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Badge */}
            <motion.div variants={itemVariants}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-bg-graphite-2 border border-white/10 font-mono text-xs text-fg-porcelain mb-8 w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-amber animate-pulse" />
                Ixos Engine v3.2 / Core
              </div>
            </motion.div>

            {/* Heading */}
            <motion.h1
              variants={itemVariants}
              className="text-5xl md:text-7xl font-display font-bold leading-[1.0] mb-6 text-fg-porcelain"
            >
              Instant context.
              <br />
              Zero{" "}
              <span className="text-accent-amber italic">indexing.</span>
            </motion.h1>

            {/* Subtext */}
            <motion.p
              variants={itemVariants}
              className="font-mono text-fg-muted max-w-lg text-base leading-relaxed mb-10"
            >
              A high-performance semantic memory engine that sweeps your filesystem entirely JIT.
              Replaces bloated daemon watchers with SIMD-accelerated read pipelines.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4 mb-12">
              <button className="bg-accent-amber text-black font-display font-semibold h-11 px-8 hover:bg-[#FCD34D] transition-colors">
                Download v3.2
              </button>
              <button
                onClick={handleCopy}
                className="bg-bg-graphite-1 border border-white/10 h-11 px-5 font-mono text-sm text-fg-porcelain flex items-center gap-3 hover:bg-bg-graphite-2 transition-colors cursor-copy"
              >
                <span className="text-fg-muted">$</span>
                brew install --cask ixos
                <Copy className="w-3.5 h-3.5 text-fg-muted ml-1" />
                {copied && <span className="text-accent-amber text-[10px] uppercase tracking-widest">Copied!</span>}
              </button>
            </motion.div>

            {/* Stats Row */}
            <motion.div
              variants={itemVariants}
              className="flex items-center gap-8 border-t border-white/10 pt-8"
            >
              <div ref={p50Ref}>
                <div className="font-mono text-[10px] uppercase tracking-widest text-fg-muted mb-1">P50 Latency</div>
                <div className="font-display text-2xl text-accent-amber font-medium">{p50Count}ms</div>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div ref={ramRef}>
                <div className="font-mono text-[10px] uppercase tracking-widest text-fg-muted mb-1">Memory Footprint</div>
                <div className="font-display text-2xl text-fg-porcelain font-medium">{ramCount}MB</div>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-fg-muted mb-1">Background CPU</div>
                <div className="font-display text-2xl text-fg-porcelain font-medium">0.0%</div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column: Terminal Panel */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full max-w-xl lg:max-w-2xl bg-[#0A0D14] border border-white/10 flex flex-col"
          >
            {/* Terminal Header */}
            <div className="h-10 bg-[#161B22] border-b border-white/10 flex items-center px-4 gap-3 shrink-0">
              <Terminal className="w-4 h-4 text-fg-muted" />
              <span className="font-mono text-xs text-fg-muted">ixos system status</span>
              <div className="ml-auto flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#27C93F]" />
                <span className="font-mono text-[10px] text-[#27C93F] uppercase tracking-wider">NOMINAL</span>
              </div>
            </div>

            {/* Nodes */}
            <div className="flex-1 p-6 flex flex-col gap-4">
              {nodes.map((node, index) => {
                const Icon = node.icon;
                return (
                  <motion.div
                    key={node.title}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.15, duration: 0.4 }}
                    className={`flex items-start gap-4 p-4 border ${node.border} ${node.bg}`}
                  >
                    <div className={`w-10 h-10 flex items-center justify-center shrink-0 border ${node.iconBg}`}>
                      <Icon className={`w-5 h-5 ${node.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1 gap-4">
                        <h4 className="font-mono text-sm text-fg-porcelain font-semibold">{node.title}</h4>
                        {node.isActive ? (
                          <span className="font-mono text-[10px] text-accent-amber animate-pulse whitespace-nowrap">{node.status}</span>
                        ) : node.status === "DISABLED" ? (
                          <span className="font-mono text-[10px] text-fg-muted/30 whitespace-nowrap">{node.status}</span>
                        ) : (
                          <span className="font-mono text-[10px] whitespace-nowrap" style={{ color: node.statusColor }}>{node.status}</span>
                        )}
                      </div>
                      <p className="font-mono text-xs text-fg-muted leading-relaxed">
                        {node.desc}
                      </p>

                      {/* Log box for active node */}
                      {node.isActive && (
                        <div className="bg-[#0D1117] p-3 border border-white/5 font-mono text-[10px] max-h-24 overflow-hidden relative mt-3">
                          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#0D1117] to-transparent z-10 pointer-events-none" />
                          <motion.div
                            animate={{ y: [0, -48] }}
                            transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                            className="flex flex-col gap-1"
                          >
                            {[...LOG_LINES, ...LOG_LINES].map((line, i) => (
                              <span key={i} style={{ color: line.color || "inherit" }} className="text-fg-muted">
                                {line.text}
                              </span>
                            ))}
                          </motion.div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
