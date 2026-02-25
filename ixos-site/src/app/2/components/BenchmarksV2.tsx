"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { SectionDivider } from "@/components/ui/SectionDivider";
import benchmarkData from "@/data/benchmarks.json";

const TTFR_P95 = benchmarkData.tierBreakdown.find(t => t.tier === "C")?.observedColdTotalP95Ms ?? 51;

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

const COMPARISON_ROWS = [
  { label: "Index Build Time", legacy: "14m 23s", ixos: "0s (None)", delta: "-100%" },
  { label: "Idle RAM", legacy: "450MB+", ixos: "0MB", delta: "-100%" },
  { label: "Active RAM", legacy: "450MB+", ixos: `${benchmarkData.overview.peakRamMb}MB`, delta: `-${Math.round((450 - benchmarkData.overview.peakRamMb) / 450 * 100)}%` },
  { label: "Cold Query p50", legacy: "1,250ms", ixos: `${benchmarkData.overview.ttfrP50Ms}ms`, delta: `-${Math.round((1250 - benchmarkData.overview.ttfrP50Ms) / 1250 * 100)}%` },
  { label: "Disk Space", legacy: "~2.4GB", ixos: "0GB", delta: "-100%" },
];

export function BenchmarksV2() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });

  const { count: p50Count, ref: p50Ref } = useCounter(benchmarkData.overview.ttfrP50Ms);
  const { count: ramCount, ref: ramRef } = useCounter(benchmarkData.overview.peakRamMb);

  const statRows = [
    { label: "P50 Latency", value: `${p50Count}ms`, ref: p50Ref, amber: true },
    { label: "P95 Latency", value: `${TTFR_P95}ms`, ref: null, amber: false },
    { label: "Peak Memory", value: `${ramCount}MB`, ref: ramRef, amber: false },
  ];

  return (
    <section
      ref={sectionRef}
      className="py-32 bg-[#0E1117] border-b border-white/5"
    >
      <SectionDivider accent="amber" label="PERFORMANCE_TELEMETRY" />

      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-16 items-start">

          {/* Left */}
          <div className="w-full lg:w-72 shrink-0">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="text-4xl md:text-5xl font-display font-bold text-fg-porcelain leading-[1.05] mb-6"
            >
              Zero wasted
              <br />
              <span className="text-accent-amber italic">cycles.</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.07 }}
              className="font-mono text-fg-muted leading-relaxed mb-10"
            >
              Benchmark against {benchmarkData.corpus.files.toLocaleString()} files. Cold start, caches cleared.
            </motion.p>

            <div className="flex flex-col gap-1">
              {statRows.map((row, index) => (
                <motion.div
                  key={row.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.14 + index * 0.07 }}
                  className="flex justify-between items-center p-4 bg-bg-graphite-1/50 border border-white/5"
                >
                  <span className="font-mono text-xs text-fg-muted uppercase tracking-widest">{row.label}</span>
                  <div
                    ref={row.ref ?? undefined}
                    className={`font-mono text-xl font-semibold ${row.amber ? "text-accent-amber" : "text-fg-porcelain"}`}
                  >
                    {row.value}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right: Table */}
          <div className="flex-1 w-full border border-white/10 bg-bg-graphite-1/30 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[560px]">
              <thead>
                <tr className="bg-[#161B22] border-b border-white/10">
                  <th className="p-4 font-mono text-[10px] text-fg-muted uppercase tracking-widest font-normal">Metric ID</th>
                  <th className="p-4 font-mono text-[10px] text-fg-muted uppercase tracking-widest font-normal">Legacy Daemon</th>
                  <th className="p-4 font-mono text-[10px] text-accent-amber uppercase tracking-widest font-semibold">
                    <div className="flex items-center gap-2">
                      Ixos (JIT Sweep)
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-amber" />
                    </div>
                  </th>
                  <th className="p-4 font-mono text-[10px] text-fg-muted uppercase tracking-widest font-normal">Delta</th>
                </tr>
              </thead>
              <tbody className="font-mono text-sm">
                {COMPARISON_ROWS.map((row, index) => (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0, y: 16 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.2 + index * 0.07 }}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="p-4 text-fg-porcelain/80">{row.label}</td>
                    <td className="p-4 text-fg-muted">{row.legacy}</td>
                    <td className="p-4 text-accent-amber font-medium">{row.ixos}</td>
                    <td className="p-4 text-[#27C93F]">{row.delta}</td>
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
