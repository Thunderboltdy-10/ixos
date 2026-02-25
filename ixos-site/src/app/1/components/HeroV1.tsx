"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Copy, Check, Terminal } from "lucide-react";
import benchmarkData from "@/data/benchmarks.json";

function useCounter(target: number) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let c = 0;
    const step = target / 60;
    const t = setInterval(() => {
      c += step;
      if (c >= target) {
        setCount(target);
        clearInterval(t);
      } else {
        setCount(Math.floor(c));
      }
    }, 16);
    return () => clearInterval(t);
  }, [inView, target]);
  return { count, ref };
}

const BENCHMARK_ROWS = [
  {
    metric: "COLD QUERY LATENCY",
    legacyLabel: "1,250ms",
    ixosLabel: "29ms",
    legacyPct: 88,
    ixosPct: 2,
  },
  {
    metric: "IDLE RAM USAGE",
    legacyLabel: "450MB+",
    ixosLabel: "0MB",
    legacyPct: 88,
    ixosPct: 0,
  },
  {
    metric: "INDEX BUILD TIME",
    legacyLabel: "14m 23s",
    ixosLabel: "0s",
    legacyPct: 88,
    ixosPct: 0,
  },
  {
    metric: "DISK SPACE",
    legacyLabel: "2.4GB",
    ixosLabel: "0GB",
    legacyPct: 88,
    ixosPct: 0,
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function HeroV1() {
  const { count: p50Count, ref: p50Ref } = useCounter(benchmarkData.overview.ttfrP50Ms);
  const [copied, setCopied] = useState(false);
  const barsRef = useRef<HTMLDivElement>(null);
  const barsInView = useInView(barsRef, { once: true });

  function handleCopy() {
    navigator.clipboard.writeText("brew install --cask ixos").catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="min-h-screen bg-[#0E1117] flex items-center pt-16">
      <div className="container mx-auto px-6 max-w-7xl py-16">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-stretch">

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
            <motion.div variants={itemVariants} className="mb-4">
              <h1 className="text-5xl md:text-7xl font-display font-bold leading-[1.0] text-fg-porcelain">
                Instant search.
                <br />
                Zero overhead.
              </h1>
              <p className="mt-4 font-mono text-base text-accent-amber italic">
                29ms. 0MB idle. 0 background threads.
              </p>
            </motion.div>

            {/* Subtext */}
            <motion.p
              variants={itemVariants}
              className="font-mono text-fg-muted max-w-lg text-base leading-relaxed mb-10"
            >
              A SIMD-accelerated JIT memory engine. No persistent daemon. No index to maintain.
              Query 180,000 files faster than your IDE loads a file.
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
                {copied && (
                  <span className="text-accent-amber text-[10px] uppercase tracking-widest">Copied!</span>
                )}
                {!copied && (
                  <Check className="w-3.5 h-3.5 text-fg-muted ml-1 opacity-0" />
                )}
              </button>
            </motion.div>

            {/* Stats Row */}
            <motion.div
              variants={itemVariants}
              className="flex items-center gap-8 border-t border-white/10 pt-8"
            >
              <div ref={p50Ref}>
                <div className="font-mono text-[10px] uppercase tracking-widest text-fg-muted mb-1">
                  P50 Latency
                </div>
                <div className="font-display text-2xl text-accent-amber font-medium">
                  {p50Count}ms
                </div>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-fg-muted mb-1">
                  Idle RAM
                </div>
                <div className="font-display text-2xl text-fg-porcelain font-medium">0MB</div>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-fg-muted mb-1">
                  Index Build
                </div>
                <div className="font-display text-2xl text-fg-porcelain font-medium">0s</div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column: Benchmark Panel */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full max-w-2xl bg-[#0A0D14] border border-white/10 flex flex-col"
          >
            {/* Header bar */}
            <div className="h-10 bg-[#161B22] border-b border-white/10 flex items-center px-4 gap-3 shrink-0">
              <Terminal className="w-4 h-4 text-fg-muted" />
              <span className="font-mono text-xs text-fg-muted">
                benchmark results — 179,964 files
              </span>
            </div>

            {/* Benchmark rows */}
            <div ref={barsRef} className="flex-1 p-8 flex flex-col gap-8">
              {BENCHMARK_ROWS.map((row) => (
                <div key={row.metric}>
                  {/* Metric label */}
                  <div className="font-mono text-[10px] text-fg-muted uppercase tracking-widest mb-3">
                    {row.metric}
                  </div>

                  {/* Legacy bar */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-[10px] text-fg-muted w-12 shrink-0">Legacy</span>
                    <div className="flex-1 h-2 bg-bg-graphite-2">
                      <motion.div
                        className="h-full bg-[#FF5F56]"
                        initial={{ width: 0 }}
                        animate={barsInView ? { width: `${row.legacyPct}%` } : { width: 0 }}
                        transition={{ duration: 0.9, delay: 0.5, ease: [0.25, 1, 0.5, 1] }}
                      />
                    </div>
                    <span className="font-mono text-xs text-fg-muted w-20 text-right shrink-0">
                      {row.legacyLabel}
                    </span>
                  </div>

                  {/* Ixos bar */}
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-accent-amber w-12 shrink-0">Ixos</span>
                    <div className="flex-1 h-2 bg-bg-graphite-2">
                      <motion.div
                        className="h-full bg-accent-amber"
                        style={{ minWidth: row.ixosPct === 0 ? "2px" : undefined }}
                        initial={{ width: 0 }}
                        animate={
                          barsInView
                            ? { width: row.ixosPct === 0 ? "2px" : `${row.ixosPct}%` }
                            : { width: 0 }
                        }
                        transition={{ duration: 0.9, delay: 0.7, ease: [0.25, 1, 0.5, 1] }}
                      />
                    </div>
                    <span className="font-mono text-xs text-accent-amber font-semibold w-20 text-right shrink-0">
                      {row.ixosLabel}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer note */}
            <div className="border-t border-white/10 pt-4 pb-6 px-8">
              <p className="font-mono text-[10px] text-fg-muted">
                Benchmarked against static corpus. Cold start, caches cleared. Apple M1 Pro.
              </p>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
