"use client";

import { cn } from "@/lib/utils";
import { SectionDivider } from "@/components/ui/SectionDivider";

import { FadeInView } from "@/components/effects/FadeInView";

export function Trust() {
    return (
        <div className="relative">
            <SectionDivider accent="amber" label="SECURITY_PROTOCOL" />

            <div className="py-24 container mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    <FadeInView direction="up" delay={0} className="h-full">
                        <TrustCard
                            title="100% On-Device"
                            code="MODE: LOCAL_ONLY"
                            desc="No cloud uploads. No telemetry. The AI inference runs strictly on your own hardware."
                        />
                    </FadeInView>
                    <FadeInView direction="up" delay={150} className="h-full">
                        <TrustCard
                            title="Ephemeral Memory"
                            code="CACHE: VOLATILE"
                            desc="Embeddings are computed just-in-time and flushed from memory after results are served."
                        />
                    </FadeInView>
                    <FadeInView direction="up" delay={300} className="h-full">
                        <TrustCard
                            title="Open Standards"
                            code="COMPAT: NATIVE"
                            desc="We use standard file watchers and respect .gitignore rules. No proprietary databases."
                        />
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
