"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import { useState, type ReactNode, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { ProCard } from "@/components/sections/ProCard";
import { ProUpgradeAction } from "@/components/sections/ProUpgradeAction";

import { FadeInView } from "@/components/effects/FadeInView";

export type BillingCycle = "monthly" | "annual";

export function Pricing({
    billing,
    onBillingChange,
    showProCard = true,
    proCardLayoutId = "pro-card",
    proCardSlotRef,
}: {
    billing?: BillingCycle;
    onBillingChange?: (next: BillingCycle) => void;
    showProCard?: boolean;
    proCardLayoutId?: string;
    proCardSlotRef?: RefObject<HTMLDivElement | null>;
}) {
    const [internalBilling, setInternalBilling] = useState<BillingCycle>("monthly");
    const effectiveBilling = billing ?? internalBilling;
    const setEffectiveBilling = (next: BillingCycle) => {
        if (onBillingChange) {
            onBillingChange(next);
            return;
        }
        setInternalBilling(next);
    };

    return (
        <div className="relative">
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
                            <span className={cn("text-sm transition-colors", effectiveBilling === "monthly" ? "text-fg-porcelain" : "text-fg-muted")}>Monthly</span>
                            <button
                                onClick={() => setEffectiveBilling(effectiveBilling === "monthly" ? "annual" : "monthly")}
                                className="relative w-14 h-7 bg-white/5 rounded-full border border-white/10 p-1 transition-colors hover:border-accent-magenta/50"
                            >
                                <div className={cn(
                                    "w-4 h-4 rounded-full bg-accent-magenta shadow-glow-magenta transition-all duration-300",
                                    effectiveBilling === "annual" ? "translate-x-7" : "translate-x-0"
                                )} />
                            </button>
                            <span className={cn("text-sm transition-colors", effectiveBilling === "annual" ? "text-fg-porcelain" : "text-fg-muted")}>Annual <span className="text-accent-magenta text-xs font-mono ml-1">-20%</span></span>
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
                            desc="Core search, fully local."
                            features={[
                                "Semantic file search",
                                "Zero index tax (Memory mode)",
                                "100% local processing",
                                "Community support"
                            ]}
                            actionNode={(
                                <div className="space-y-3">
                                    <Button
                                        className="w-full font-mono text-xs uppercase tracking-widest h-12 bg-accent-teal/10 hover:bg-accent-teal/20 border border-accent-teal/20 text-accent-teal font-medium hover:border-accent-teal/40"
                                        asChild
                                    >
                                        <Link href="/download">DOWNLOAD_FREE</Link>
                                    </Button>
                                    <div className="text-center">
                                        <Link href="/docs/cli-reference" className="text-[10px] text-fg-muted hover:text-fg-porcelain transition-colors border-b border-transparent hover:border-fg-muted/50 pb-0.5">
                                            OR INSTALL VIA CLI
                                        </Link>
                                    </div>
                                </div>
                            )}
                        />
                    </FadeInView>

                    {/* Pro Tier */}
                    <FadeInView direction="up" delay={300} className="h-full">
                        <div ref={proCardSlotRef} className="h-full">
                        {showProCard ? (
                            <motion.div
                                layoutId={proCardLayoutId}
                                transition={{ type: "spring", stiffness: 74, damping: 26, mass: 1.2 }}
                                className="relative group h-full lg:sticky lg:top-20"
                                data-trace-anchor="pricing-pro"
                                data-trace-color="magenta"
                            >
                                <div className="absolute -inset-0.5 bg-gradient-to-b from-accent-magenta/40 to-transparent rounded-lg opacity-50 blur-lg group-hover:opacity-80 transition-opacity duration-700" />
                                <ProCard
                                    price={effectiveBilling === "monthly" ? "$7.99" : "$6.35"}
                                    period="/ month"
                                    desc="Ask Mode evidence answers. Saved searches. Priority support."
                                    actionNode={<ProUpgradeAction />}
                                />
                            </motion.div>
                        ) : (
                            <div
                                aria-hidden="true"
                                className="h-full min-h-[640px] rounded-sm border border-transparent opacity-0 pointer-events-none"
                            >
                                <div className="h-full" />
                            </div>
                        )}
                        </div>
                    </FadeInView>
                </div>
            </div >
        </div >
    );
}

function PricingCard({
    title,
    price,
    period,
    desc,
    features,
    highlighted,
    onAction,
    actionLabel,
    actionNode,
}: {
    title: string,
    price: string,
    period: string,
    desc: string,
    features: string[],
    highlighted?: boolean,
    onAction?: () => void,
    actionLabel?: string,
    actionNode?: ReactNode
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

            {actionNode ? (
                actionNode
            ) : (
                <Button
                    className={cn(
                        "w-full font-mono text-xs uppercase tracking-widest h-12",
                        highlighted
                            ? "bg-accent-magenta hover:bg-accent-magenta-glow text-bg-graphite-0 font-bold shadow-glow-magenta hover:scale-[1.02] transition-all"
                            : "bg-accent-teal/10 hover:bg-accent-teal/20 border border-accent-teal/20 text-accent-teal font-medium hover:border-accent-teal/40"
                    )}
                    onClick={onAction}
                >
                    {actionLabel ?? (highlighted ? "INITIALIZE_LICENSE" : "DOWNLOAD_FREE")}
                </Button>
            )}
        </div>
    );
}
