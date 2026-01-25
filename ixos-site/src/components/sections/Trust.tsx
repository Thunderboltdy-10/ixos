"use client";

import { SectionDivider } from "@/components/ui/SectionDivider";
import { FadeInView } from "@/components/effects/FadeInView";

export function Trust() {
    return (
        <div className="relative">
            <SectionDivider accent="amber" label="SECURITY_PROTOCOL" />

            <div className="py-24 container mx-auto px-6">
                <div
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto"
                    data-trace-anchor="trust-cards"
                    data-trace-color="amber"
                >
                    <FadeInView direction="up" delay={0} className="h-full">
                        <TrustCard
                            title="No Index Tax"
                            code="STORAGE: ZERO"
                            desc="Unlike traditional search tools, Ixos doesn't build a massive persistent index. Your disk space stays yours."
                        />
                    </FadeInView>
                    <FadeInView direction="up" delay={150} className="h-full">
                        <TrustCard
                            title="See Why It Matched"
                            code="EXPLAIN: ENABLED"
                            desc="Every result shows exactly why it matched your query. Full transparency, not black box magic."
                        />
                    </FadeInView>
                    <FadeInView direction="up" delay={300} className="h-full">
                        <TrustCard
                            title="Journalist Mode"
                            code="PRIVACY: MAXIMUM"
                            desc="Maximum privacy when you need it. No history, no traces, encrypted temporary storage that's wiped after every search."
                        />
                    </FadeInView>
                </div>

                {/* Additional trust signals */}
                <div className="mt-16 max-w-4xl mx-auto">
                    <FadeInView direction="up" delay={450}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                            <TrustSignal value="100%" label="Local compute" />
                            <TrustSignal value="0 KB" label="Cloud transfer" />
                            <TrustSignal value="Zero" label="Telemetry" />
                            <TrustSignal value="Open" label="Source audit" />
                        </div>
                    </FadeInView>
                </div>
            </div>
        </div>
    );
}

function TrustCard({
    title,
    code,
    desc
}: {
    title: string,
    code: string,
    desc: string
}) {
    return (
        <div className="relative group p-8 rounded-sm border border-white/10 bg-bg-graphite-1/50 backdrop-blur hover:bg-bg-graphite-1/80 transition-all duration-300 hover:border-accent-amber/30 h-full hover-glow-subtle">
            <div className="flex items-center justify-between mb-6">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-amber animate-pulse shadow-glow-amber" />
                <div className="text-[10px] font-mono text-accent-amber opacity-60 tracking-widest">{code}</div>
            </div>

            <h3 className="text-xl font-medium text-fg-porcelain mb-4 opacity-90 group-hover:opacity-100">{title}</h3>
            <p className="text-sm text-fg-muted leading-relaxed opacity-70 group-hover:opacity-90 transition-opacity">
                {desc}
            </p>

            {/* Corner Accent */}
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-accent-amber opacity-0 group-hover:opacity-50 transition-all duration-300" />
        </div>
    );
}

function TrustSignal({ value, label }: { value: string; label: string }) {
    return (
        <div className="group">
            <div className="text-2xl font-mono font-medium text-fg-porcelain group-hover:text-accent-amber transition-colors">
                {value}
            </div>
            <div className="text-xs text-fg-muted mt-1">{label}</div>
        </div>
    );
}
