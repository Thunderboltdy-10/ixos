"use client";

import { cn } from "@/lib/utils";

/**
 * MetricStrip - Terminal Glass Design
 *
 * Horizontal strip of key metrics with:
 * - Vertical dividers between metrics
 * - Label (tiny, uppercase) over value (large monospace)
 * - Technical precision feel
 */

interface Metric {
    label: string;
    value: string;
    accent?: boolean;
}

interface MetricStripProps {
    metrics: Metric[];
    className?: string;
}

export function MetricStrip({ metrics, className }: MetricStripProps) {
    return (
        <div
            className={cn(
                "flex items-center justify-center gap-0 py-6 border-y border-white/[0.04] bg-surface-0/50",
                className
            )}
        >
            {metrics.map((metric, index) => (
                <div key={index} className="flex items-center">
                    {/* Divider (except first) */}
                    {index > 0 && (
                        <div className="w-px h-10 bg-white/[0.08] mx-8" />
                    )}

                    {/* Metric */}
                    <div className="flex flex-col items-center">
                        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-content-muted mb-1">
                            {metric.label}
                        </span>
                        <span
                            className={cn(
                                "font-mono text-2xl font-medium",
                                metric.accent ? "text-brand-teal" : "text-white"
                            )}
                        >
                            {metric.value}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default MetricStrip;
