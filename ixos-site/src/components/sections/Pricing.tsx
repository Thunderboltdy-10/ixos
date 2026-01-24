"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { SectionDivider } from "@/components/ui/SectionDivider";

import { FadeInView } from "@/components/effects/FadeInView";

export function Pricing() {
    const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

    return (
        <div className="relative">
            <SectionDivider accent="magenta" label="LICENSING_MODULE" />

            <div className="py-24 container mx-auto px-6">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <FadeInView direction="up">
                        <h2 className="text-3xl md:text-4xl font-semibold mb-6">
                            Simple, transparent <span className="heading-gradient-magenta">ownership</span>
                        </h2>
                    </FadeInView>

                    {/* Toggle Switch */}
                    <FadeInView direction="up" delay={100}>
                        <div
                            className="flex justify-center items-center gap-4"
                            data-trace-anchor="pricing-toggle"
                            data-trace-color="magenta"
                        >
                            <span className={cn("text-sm transition-colors", billing === "monthly" ? "text-fg-porcelain" : "text-fg-muted")}>Monthly</span>
                            <button
                                onClick={() => setBilling(b => b === "monthly" ? "annual" : "monthly")}
                                className="relative w-14 h-7 bg-white/5 rounded-full border border-white/10 p-1 transition-colors hover:border-accent-magenta/50"
                            >
                                <div className={cn(
                                    "w-4 h-4 rounded-full bg-accent-magenta shadow-glow-magenta transition-all duration-300",
                                    billing === "annual" ? "translate-x-7" : "translate-x-0"
                                )} />
                            </button>
                            <span className={cn("text-sm transition-colors", billing === "annual" ? "text-fg-porcelain" : "text-fg-muted")}>Annual <span className="text-accent-magenta text-xs font-mono ml-1">-20%</span></span>
                        </div>
                    </FadeInView>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch">
                    {/* Free Tier */}
                    <FadeInView direction="up" delay={200} className="h-full">
                        <PricingCard
                            title="COMMUNITY"
                            price="$0"
                            period="/ forever"
                            desc="Full semantic search. No index tax. No cloud."
                            features={[
                                "Complete semantic search",
                                "Zero index tax (JIT mode)",
                                "100% local processing",
                                "Standard file types (PDF, TXT, MD)",
                                "Community support"
                            ]}
                        />
                    </FadeInView>

                    {/* Pro Tier */}
                    <FadeInView direction="up" delay={300} className="h-full">
                        <div
                            className="relative group h-full"
                            data-trace-anchor="pricing-pro"
                            data-trace-color="magenta"
                        >
                            <div className="absolute -inset-0.5 bg-gradient-to-b from-accent-magenta/40 to-transparent rounded-lg opacity-50 blur-lg group-hover:opacity-80 transition-opacity duration-700" />
                            <PricingCard
                                title="PROFESSIONAL"
                                price={billing === "monthly" ? "$7.99" : "$6.35"}
                                period="/ month"
                                desc="Watch & Notify. Saved searches. Priority support."
                                highlighted
                                features={[
                                    "File watch & notifications",
                                    "Developer file types (TS, PY, RS, GO)",
                                    "Journalist Mode (max privacy)",
                                    "Priority model updates",
                                    "Direct support access"
                                ]}
                            />
                        </div>
                    </FadeInView>
                </div>
            </div>
        </div>
    );
}

function PricingCard({
    title,
    price,
    period,
    desc,
    features,
    highlighted
}: {
    title: string,
    price: string,
    period: string,
    desc: string,
    features: string[],
    highlighted?: boolean
}) {
    return (
        <div className={cn(
            "relative h-full flex flex-col p-8 rounded-sm border backdrop-blur-md overflow-hidden transition-all duration-300 hover-glow-subtle",
            highlighted
                ? "bg-bg-graphite-1/90 border-accent-magenta/40 shadow-glow-magenta/20"
                : "bg-bg-graphite-2/50 border-white/10 hover:border-white/20"
        )}>
            {/* Corner Accents */}
            {highlighted && (
                <>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-accent-magenta" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-accent-magenta/50" />
                </>
            )}

            <div className="mb-8">
                <div className={cn("text-xs font-mono tracking-wider mb-4 opacity-80", highlighted ? "text-accent-magenta" : "text-fg-muted")}>
                    {title}
                </div>
                <div className="flex items-baseline gap-1 h-12"> {/* Fixed height for no layout shift */}
                    <span className="text-5xl font-mono font-medium text-fg-porcelain tracking-tighter tabular-nums transition-all duration-300 transform">
                        {price}
                    </span>
                    <span className="text-sm text-fg-muted font-mono">{period}</span>
                </div>
                <p className="mt-6 text-sm text-fg-muted leading-relaxed border-t border-stroke-hairline pt-6">
                    {desc}
                </p>
            </div>

            <ul className="space-y-4 mb-10 flex-1">
                {features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm group/li">
                        <div className={cn(
                            "mt-1.5 w-1 h-1 rounded-full transition-colors",
                            highlighted ? "bg-accent-magenta group-hover/li:shadow-glow-magenta" : "bg-fg-muted"
                        )} />
                        <span className="text-fg-porcelain opacity-90">{feat}</span>
                    </li>
                ))}
            </ul>

            <Button
                className={cn(
                    "w-full font-mono text-xs uppercase tracking-widest h-12",
                    highlighted
                        ? "bg-accent-magenta hover:bg-accent-magenta-glow text-bg-graphite-0 font-bold shadow-glow-magenta hover:scale-[1.02] transition-all"
                        : "bg-accent-teal/10 hover:bg-accent-teal/20 border border-accent-teal/20 text-accent-teal font-medium hover:border-accent-teal/40"
                )}
            >
                {highlighted ? "INITIALIZE_LICENSE" : "DOWNLOAD_FREE"}
            </Button>
        </div>
    );
}
