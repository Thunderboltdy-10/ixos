"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { SectionDivider } from "@/components/ui/SectionDivider";
import benchmarkData from "@/data/benchmarks.json";

export function Benchmarks() {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const ttfr = useCountUp(benchmarkData.overview.ttfrP50Ms, 900, isVisible);

  return (
    <div ref={containerRef} className="relative">
      <SectionDivider accent="violet" label="System metrics" />

      <div className="container mx-auto px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 grid grid-cols-1 items-end gap-8 md:grid-cols-12">
            <div className="md:col-span-5">
              <h2 className="text-3xl font-semibold leading-tight md:text-4xl">
                Tier-gated performance, <br />
                <span className="heading-gradient bg-clip-text text-transparent">measured continuously.</span>
              </h2>
            </div>
            <div className="flex items-end justify-between border-b border-white/10 pb-2 md:col-span-7">
              <span className="font-mono text-xs text-accent-violet">Ralph benchmark snapshot</span>
              <span className="font-mono text-xs text-fg-muted opacity-50">
                {benchmarkData.corpus.files.toLocaleString()} files • Tier {benchmarkData.corpus.tier}
              </span>
            </div>
          </div>

          <div
            className="relative overflow-hidden rounded-sm border border-white/10 bg-bg-graphite-2/60 p-0 shadow-2xl backdrop-blur-md hover-glow-subtle"
            data-trace-anchor="bench-panel"
            data-trace-color="violet"
          >
            <div className="flex h-6 items-center justify-between border-b border-white/10 bg-white/5 px-3">
              <span className="text-[9px] font-mono uppercase text-fg-muted">Time_To_First_Result</span>
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-violet" />
            </div>

            <div className="grid grid-cols-1 divide-y divide-white/10 md:grid-cols-12 md:divide-x md:divide-y-0">
              <div className="flex min-h-[300px] flex-col justify-between bg-gradient-to-br from-accent-violet/5 to-transparent p-8 md:col-span-4">
                <div>
                  <div className="mb-2 text-xs font-mono uppercase tracking-wider text-fg-muted">TTFR (P50)</div>
                  <div className="text-7xl font-mono font-medium tracking-tighter text-fg-porcelain">
                    <span className="text-accent-violet">{ttfr}</span>ms
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-px w-full bg-white/10" />
                  <MetricRow label="CACHE_HIT_RATE" value={`${benchmarkData.overview.cacheHitRatePercent.toFixed(2)}%`} accent />
                  <MetricRow label="PEAK_RAM" value={`${benchmarkData.overview.peakRamMb} MB`} />
                  <MetricRow label="PERSISTENT_INDEX" value={`${benchmarkData.overview.persistentIndexKb} KB`} />
                </div>
              </div>

              <div className="space-y-8 p-8 md:col-span-8">
                {benchmarkData.comparison.map((bar, index) => (
                  <ChartBar
                    key={bar.label}
                    label={bar.label}
                    value={bar.valueMs}
                    maxValue={2000}
                    highlight={Boolean(bar.highlight)}
                    isVisible={isVisible}
                    delay={index * 100}
                    isOverflow={Boolean(bar.overflow)}
                  />
                ))}

                <div className="mt-4 border-t border-white/10 pt-4">
                  <p className="mb-2 text-[10px] font-mono text-fg-muted opacity-60">P95 stage waterfall (ms)</p>
                  <WaterfallRow label="walk" value={benchmarkData.waterfallP95Ms.walk} />
                  <WaterfallRow label="ripgrep" value={benchmarkData.waterfallP95Ms.ripgrep} />
                  <WaterfallRow label="embed" value={benchmarkData.waterfallP95Ms.embed} />
                  <WaterfallRow label="rank" value={benchmarkData.waterfallP95Ms.rank} />
                </div>

                <div className="mt-4 border-t border-white/10 pt-4 text-[10px] font-mono text-fg-muted opacity-60">
                  Source: {benchmarkData.source}
                  <br />
                  Modes shown as NativeCache and Ephemeral.
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {benchmarkData.tierBreakdown.map((tier) => (
              <div key={tier.tier} className="rounded-sm border border-white/10 bg-bg-graphite-1/50 p-4">
                <div className="text-xs font-mono text-accent-violet">Tier {tier.tier}</div>
                <div className="mt-1 text-sm text-fg-muted">{tier.target}</div>
                {"ttfrP50Ms" in tier ? (
                  <div className="mt-3 space-y-1 text-xs font-mono text-fg-muted">
                    <div>Target TTFR p50: {tier.ttfrP50Ms}ms</div>
                    <div>Target Total p95: {tier.totalP95Ms}ms</div>
                  </div>
                ) : (
                  <div className="mt-3 space-y-1 text-xs font-mono text-fg-muted">
                    <div>Cold TTFR p50: {tier.observedColdTtfrP50Ms}ms / target {tier.coldTtfrP50Ms}ms</div>
                    <div>Cold Total p95: {tier.observedColdTotalP95Ms}ms / target {tier.coldTotalP95Ms}ms</div>
                    <div>Warm Total p95: {tier.observedWarmTotalP95Ms}ms / target {tier.warmTotalP95Ms}ms</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between text-xs font-mono text-fg-muted">
      <span>{label}</span>
      <span className={accent ? "text-accent-violet" : "text-fg-porcelain"}>{value}</span>
    </div>
  );
}

function ChartBar({
  label,
  value,
  maxValue,
  highlight = false,
  isVisible,
  delay,
  isOverflow = false,
}: {
  label: string;
  value: number;
  maxValue: number;
  highlight?: boolean;
  isVisible: boolean;
  delay: number;
  isOverflow?: boolean;
}) {
  const percentage = Math.min((value / maxValue) * 100, 100);

  return (
    <div className="group">
      <div className="mb-2 flex justify-between text-xs font-mono text-fg-muted">
        <span className={highlight ? "font-bold text-accent-violet" : ""}>{label}</span>
        <span>{isOverflow ? ">5s" : `${value}ms`}</span>
      </div>
      <div className="flex h-3 gap-1 overflow-hidden">
        {Array.from({ length: 40 }).map((_, i) => {
          const active = (i / 40) * 100 < percentage;
          return (
            <div
              key={i}
              className={cn(
                "flex-1 rounded-[1px] transition-all duration-300",
                active
                  ? highlight
                    ? "bg-accent-violet"
                    : "bg-fg-muted/60"
                  : "bg-white/5"
              )}
              style={{
                opacity: isVisible && active ? 1 : 0.2,
                transitionDelay: `${delay + i * 5}ms`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function WaterfallRow({ label, value }: { label: string; value: number }) {
  const width = Math.min(100, value * 3);
  return (
    <div className="mb-2 flex items-center gap-3 text-xs font-mono text-fg-muted">
      <span className="w-16 uppercase">{label}</span>
      <div className="h-2 flex-1 rounded bg-white/5">
        <div className="h-2 rounded bg-accent-violet/70" style={{ width: `${Math.max(width, 2)}%` }} />
      </div>
      <span className="w-10 text-right">{value}ms</span>
    </div>
  );
}

function useCountUp(end: number, duration: number, isVisible: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration, isVisible]);

  return count;
}
