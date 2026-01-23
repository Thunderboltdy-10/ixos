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
                                Instant results, <br />
                                <span className="heading-gradient text-transparent bg-clip-text">zero latency.</span>
                            </h2>
                        </div>
                        <div className="md:col-span-7 pb-2 border-b border-white/10 flex justify-between items-end">
                            <span className="font-mono text-xs text-accent-violet">PERFORMANCE_V3.0</span>
                            <span className="font-mono text-xs text-fg-muted opacity-50">Local Indexing Engine</span>
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
                            <span className="text-[9px] font-mono text-fg-muted uppercase">Latency_Check_Routine</span>
                            <div className="w-1.5 h-1.5 bg-accent-violet rounded-full animate-pulse" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-white/10">

                            {/* Metric Display (Left 4 cols) */}
                            <div className="md:col-span-4 p-8 flex flex-col justify-between min-h-[300px] bg-gradient-to-br from-accent-violet/5 to-transparent">
                                <div>
                                    <div className="text-xs font-mono text-fg-muted uppercase tracking-wider mb-2">Avg. Response</div>
                                    <div className="text-7xl font-mono font-medium text-fg-porcelain tracking-tighter">
                                        <span className="text-accent-violet">0.4</span>s
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="h-px w-full bg-white/10" />
                                    <div className="flex justify-between text-xs font-mono text-fg-muted">
                                        <span>STATUS</span>
                                        <span className="text-accent-violet">OPTIMAL</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-mono text-fg-muted">
                                        <span>TEST_SET</span>
                                        <span>500K FILES</span>
                                    </div>
                                </div>
                            </div>

                            {/* Comparison Chart (Right 8 cols) */}
                            <div className="md:col-span-8 p-8 space-y-8">
                                <ChartBar
                                    label="Ixos Semantic"
                                    value={98}
                                    highlight
                                    isVisible={isVisible}
                                    delay={0}
                                />
                                <ChartBar
                                    label="Windows Search"
                                    value={32}
                                    isVisible={isVisible}
                                    delay={200}
                                />
                                <ChartBar
                                    label="Explorer Browsing"
                                    value={12}
                                    isVisible={isVisible}
                                    delay={400}
                                />
                                <div className="pt-2 text-[10px] font-mono text-fg-muted text-right mt-4 opacity-50">
                                    * Tested on 1TB NVMe SSD, i7-13700K
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Additional stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                        <StatCard value="100%" label="LOCAL_COMPUTE" delay={100} isVisible={isVisible} />
                        <StatCard value="0 KB" label="CLOUD_TRANSFER" delay={200} isVisible={isVisible} />
                        <StatCard value="<50MB" label="RAM_USAGE" delay={300} isVisible={isVisible} />
                        <StatCard value="∞" label="PRIVACY" delay={400} isVisible={isVisible} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function ChartBar({
    label,
    value,
    highlight = false,
    isVisible,
    delay,
}: {
    label: string;
    value: number;
    highlight?: boolean;
    isVisible: boolean;
    delay: number;
}) {
    return (
        <div className="group">
            <div className="flex justify-between text-xs font-mono text-fg-muted mb-2">
                <span className={highlight ? "text-accent-violet font-bold" : ""}>{label}</span>
                <span>{value * 4}ms</span>
            </div>
            {/* Terminal Style Bar [//////....] */}
            <div className="flex gap-1 h-3 overflow-hidden">
                {Array.from({ length: 40 }).map((_, i) => {
                    const active = (i / 40) * 100 < value;
                    return (
                        <div
                            key={i}
                            className={cn(
                                "flex-1 rounded-[1px] transition-colors duration-500",
                                active
                                    ? (highlight ? "bg-accent-violet delay-[var(--delay)]" : "bg-fg-muted/60 delay-[var(--delay)]")
                                    : "bg-white/5"
                            )}
                            style={{
                                opacity: isVisible && active ? 1 : 0.2,
                                transitionDelay: `${delay + (i * 10)}ms`
                            } as any}
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
}: {
    value: string;
    label: string;
    isVisible: boolean;
    delay: number;
}) {
    return (
        <div
            className="p-4 rounded-sm border border-white/10 bg-bg-graphite-1/50 backdrop-blur hover:border-accent-violet/30 transition-colors group hover-glow-subtle"
            style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? "translateY(0)" : "translateY(10px)",
                transitionDelay: `${delay}ms`,
                transitionProperty: "opacity, transform"
            }}
        >
            <div className="text-xl font-mono font-medium text-fg-porcelain group-hover:text-accent-violet transition-colors">{value}</div>
            <div className="text-[10px] text-fg-muted tracking-widest mt-1 opacity-60">{label}</div>
        </div>
    );
}
