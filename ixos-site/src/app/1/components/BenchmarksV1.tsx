"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { SectionDivider } from "@/components/ui/SectionDivider";
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

const TTFR_P95 =
  benchmarkData.tierBreakdown.find((t) => t.tier === "C")
    ?.observedColdTotalP95Ms ?? 51;

const COMPARISON_ROWS = [
  {
    label: "Index Build Time",
    legacy: "14m 23s",
    ixos: "0s (None)",
    delta: "-100%",
  },
  {
    label: "Idle RAM Usage",
    legacy: "450MB+",
    ixos: "0MB",
    delta: "-100%",
  },
  {
    label: "Active RAM (Query)",
    legacy: "450MB+",
    ixos: `${benchmarkData.overview.peakRamMb}MB`,
    delta: `-${Math.round(
      ((450 - benchmarkData.overview.peakRamMb) / 450) * 100
    )}%`,
  },
  {
    label: "Cold Query p50",
    legacy: "1,250ms",
    ixos: `${benchmarkData.overview.ttfrP50Ms}ms`,
    delta: `-${Math.round(
      ((1250 - benchmarkData.overview.ttfrP50Ms) / 1250) * 100
    )}%`,
  },
  {
    label: "Disk Space Used",
    legacy: "~2.4GB",
    ixos: "0GB",
    delta: "-100%",
  },
];

export function BenchmarksV1() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const { count: p50Count, ref: p50Ref } = useCounter(
    benchmarkData.overview.ttfrP50Ms
  );
  const { count: p95Count, ref: p95Ref } = useCounter(TTFR_P95);
  const { count: ramCount, ref: ramRef } = useCounter(
    benchmarkData.overview.peakRamMb
  );

  return (
    <section
      ref={sectionRef}
      className="py-32 bg-[#0E1117] border-b border-white/5"
    >
      <SectionDivider accent="amber" label="PERFORMANCE_TELEMETRY" />

      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-16 items-start">

          {/* Left: Overview Stats */}
          <div className="w-full lg:w-1/3">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="text-3xl md:text-5xl font-display font-bold text-fg-porcelain tracking-tight mb-6"
            >
              The numbers
              <br />
              <span className="text-accent-amber italic">speak.</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="font-mono text-fg-muted mb-10 leading-relaxed"
            >
              Benchmark executed against a static corpus of{" "}
              {benchmarkData.corpus.files.toLocaleString()} files. Cold start,
              caches cleared.
            </motion.p>

            <div className="flex flex-col gap-1">
              {/* P50 */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="flex justify-between items-center p-4 bg-bg-graphite-1/50 border border-white/5 hover:border-accent-amber/20 transition-colors"
              >
                <span className="font-mono text-xs text-fg-muted uppercase tracking-widest">
                  P50 Latency
                </span>
                <div
                  ref={p50Ref}
                  className="font-mono text-lg text-accent-amber font-semibold"
                >
                  {p50Count}ms
                </div>
              </motion.div>

              {/* P95 */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="flex justify-between items-center p-4 bg-bg-graphite-1/50 border border-white/5 hover:border-accent-amber/20 transition-colors"
              >
                <span className="font-mono text-xs text-fg-muted uppercase tracking-widest">
                  P95 Latency
                </span>
                <div ref={p95Ref} className="font-mono text-lg text-fg-porcelain">
                  {p95Count}ms
                </div>
              </motion.div>

              {/* Memory */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="flex justify-between items-center p-4 bg-bg-graphite-1/50 border border-white/5 hover:border-accent-amber/20 transition-colors"
              >
                <span className="font-mono text-xs text-fg-muted uppercase tracking-widest">
                  Peak Memory (JIT)
                </span>
                <div ref={ramRef} className="font-mono text-lg text-fg-porcelain">
                  {ramCount}MB
                </div>
              </motion.div>

              {/* Cache hit */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.5 }}
                className="flex justify-between items-center p-4 bg-bg-graphite-1/50 border border-white/5 hover:border-accent-amber/20 transition-colors"
              >
                <span className="font-mono text-xs text-fg-muted uppercase tracking-widest">
                  Cache Hit Rate
                </span>
                <span className="font-mono text-lg text-[#27C93F]">
                  {benchmarkData.overview.cacheHitRatePercent}%
                </span>
              </motion.div>
            </div>
          </div>

          {/* Right: Data Table */}
          <div className="w-full lg:w-2/3 border border-white/10 bg-bg-graphite-1/30 overflow-x-auto">
            {/* Animated top border line */}
            <div className="relative h-[2px] overflow-hidden">
              <motion.div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-transparent via-accent-amber to-transparent"
                initial={{ x: "-100%" }}
                animate={isInView ? { x: "100%" } : { x: "-100%" }}
                transition={{ duration: 1.5, delay: 0.2, ease: "easeInOut" }}
                style={{ width: "60%" }}
              />
            </div>

            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-white/10 bg-[#161B22]">
                  <th className="p-4 font-mono text-[10px] text-fg-muted uppercase tracking-widest font-normal">
                    Metric ID
                  </th>
                  <th className="p-4 font-mono text-[10px] text-fg-muted uppercase tracking-widest font-normal">
                    Legacy Daemon (Indexed)
                  </th>
                  <th className="p-4 font-mono text-[10px] text-accent-amber uppercase tracking-widest font-semibold">
                    <div className="flex items-center gap-2">
                      Ixos (JIT Sweep)
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-amber" />
                    </div>
                  </th>
                  <th className="p-4 font-mono text-[10px] text-fg-muted uppercase tracking-widest font-normal">
                    Delta
                  </th>
                </tr>
              </thead>
              <tbody className="font-mono text-sm">
                {COMPARISON_ROWS.map((row, index) => (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="p-4 text-fg-porcelain/80">{row.label}</td>
                    <td className="p-4 text-fg-muted">{row.legacy}</td>
                    <td className="p-4 text-accent-amber font-medium">
                      {row.ixos}
                    </td>
                    <td className="p-4">
                      <motion.span
                        className="text-[#27C93F] inline-block"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={isInView ? { scale: 1, opacity: 1 } : {}}
                        transition={{
                          duration: 0.3,
                          delay: 0.5 + index * 0.1,
                        }}
                      >
                        {row.delta}
                      </motion.span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </section>
  );
}
