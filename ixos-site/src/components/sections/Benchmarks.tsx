"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { SectionDivider } from "@/components/ui/SectionDivider";

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

    return (
        <div ref={containerRef} className="relative">
            <SectionDivider accent="violet" label="SYSTEM_METRICS" />

            <div className="py-24 container mx-auto px-6">
                <div className="max-w-6xl mx-auto">
                    {/* Asymmetric Header */}
                    <div className="grid grid-cols-1 md:grid-cols-12 mb-16 items-end gap-8">
                        <div className="md:col-span-5">
                            <h2 className="text-3xl md:text-4xl font-semibold leading-tight">
                                Zero index tax, <br />
                                <span className="heading-gradient text-transparent bg-clip-text">instant results.</span>
                            </h2>
                        </div>
                        <div className="md:col-span-7 pb-2 border-b border-white/10 flex justify-between items-end">
                            <span className="font-mono text-xs text-accent-violet">BENCHMARK_v1.0</span>
                            <span className="font-mono text-xs text-fg-muted opacity-50">1,036 files • 2.46 MB corpus</span>
                        </div>
                    </div>

                    {/* Main Technical Panel */}
                    <div
                        className="relative rounded-sm border border-white/10 bg-bg-graphite-2/60 backdrop-blur-md p-0 overflow-hidden shadow-2xl hover-glow-subtle"
                        data-trace-anchor="bench-panel"
                        data-trace-color="violet"
                    >
                        {/* Status Bar */}
                        <div className="h-6 bg-white/5 border-b border-white/10 flex items-center justify-between px-3">
                            <span className="text-[9px] font-mono text-fg-muted uppercase">Time_To_First_Result</span>
                            <div className="w-1.5 h-1.5 bg-accent-violet rounded-full animate-pulse" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-white/10">

                            {/* Metric Display (Left 4 cols) - Using actual benchmark data */}
                            <div className="md:col-span-4 p-8 flex flex-col justify-between min-h-[300px] bg-gradient-to-br from-accent-violet/5 to-transparent">
                                <div>
                                    <div className="text-xs font-mono text-fg-muted uppercase tracking-wider mb-2">TTFR (P50)</div>
                                    <div className="text-7xl font-mono font-medium text-fg-porcelain tracking-tighter">
                                        <span className="text-accent-violet">199</span>ms
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="h-px w-full bg-white/10" />
                                    <div className="flex justify-between text-xs font-mono text-fg-muted">
                                        <span>CACHE_HIT_RATE</span>
                                        <span className="text-accent-violet">80%</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-mono text-fg-muted">
                                        <span>PEAK_RAM</span>
                                        <span>194 MB</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-mono text-fg-muted">
                                        <span>PERSISTENT_INDEX</span>
                                        <span className="text-accent-teal">0 KB</span>
                                    </div>
                                </div>
                            </div>

                            {/* Comparison Chart (Right 8 cols) */}
                            <div className="md:col-span-8 p-8 space-y-8">
                                <ChartBar
                                    label="Ixos (Cache Mode)"
                                    value={199}
                                    maxValue={2000}
                                    highlight
                                    isVisible={isVisible}
                                    delay={0}
                                />
                                <ChartBar
                                    label="Ixos (JIT Mode)"
                                    value={198}
                                    maxValue={2000}
                                    isVisible={isVisible}
                                    delay={200}
                                />
                                <ChartBar
                                    label="Windows Search"
                                    value={1500}
                                    maxValue={2000}
                                    isVisible={isVisible}
                                    delay={400}
                                />
                                <ChartBar
                                    label="Manual Browsing"
                                    value={2000}
                                    maxValue={2000}
                                    isVisible={isVisible}
                                    delay={600}
                                    isOverflow
                                />
                                <div className="pt-2 text-[10px] font-mono text-fg-muted text-right mt-4 opacity-50">
                                    * Tested on 1,036 files (2.46 MB), i7 CPU, NVMe SSD
                                    <br />
                                    * JIT Mode: Zero persistent storage
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Additional stats - Using actual data */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                        <StatCard value="199ms" label="FIRST_RESULT" delay={100} isVisible={isVisible} />
                        <StatCard value="80%" label="CACHE_HIT" delay={200} isVisible={isVisible} />
                        <StatCard value="194MB" label="PEAK_RAM" delay={300} isVisible={isVisible} />
                        <StatCard value="0 KB" label="INDEX_SIZE" delay={400} isVisible={isVisible} highlight />
                    </div>
                </div>
            </div>
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
            <div className="flex justify-between text-xs font-mono text-fg-muted mb-2">
                <span className={highlight ? "text-accent-violet font-bold" : ""}>{label}</span>
                <span>{isOverflow ? ">5s" : `${value}ms`}</span>
            </div>
            {/* Terminal Style Bar */}
            <div className="flex gap-1 h-3 overflow-hidden">
                {Array.from({ length: 40 }).map((_, i) => {
                    const active = (i / 40) * 100 < percentage;
                    return (
                        <div
                            key={i}
                            className={cn(
                                "flex-1 rounded-[1px] transition-all duration-500",
                                active
                                    ? (highlight ? "bg-accent-violet" : "bg-fg-muted/60")
                                    : "bg-white/5"
                            )}
                            style={{
                                opacity: isVisible && active ? 1 : 0.2,
                                transitionDelay: `${delay + (i * 10)}ms`
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
}

function StatCard({
    value,
    label,
    isVisible,
    delay,
    highlight = false,
}: {
    value: string;
    label: string;
    isVisible: boolean;
    delay: number;
    highlight?: boolean;
}) {
    return (
        <div
            className={cn(
                "p-4 rounded-sm border bg-bg-graphite-1/50 backdrop-blur transition-all group hover-glow-subtle",
                highlight
                    ? "border-accent-teal/30 hover:border-accent-teal/50"
                    : "border-white/10 hover:border-accent-violet/30"
            )}
            style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? "translateY(0)" : "translateY(10px)",
                transitionDelay: `${delay}ms`,
                transitionProperty: "opacity, transform"
            }}
        >
            <div className={cn(
                "text-xl font-mono font-medium transition-colors",
                highlight
                    ? "text-accent-teal group-hover:text-accent-teal"
                    : "text-fg-porcelain group-hover:text-accent-violet"
            )}>
                {value}
            </div>
            <div className="text-[10px] text-fg-muted tracking-widest mt-1 opacity-60">{label}</div>
        </div>
    );
}
