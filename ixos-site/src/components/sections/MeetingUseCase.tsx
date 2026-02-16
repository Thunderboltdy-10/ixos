"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { FadeInView } from "@/components/effects/FadeInView";

export function MeetingUseCase() {
    return (
        <div className="relative">
            <SectionDivider accent="violet" label="CONTEXT_AWARENESS_ENGINE" />

            <div className="py-32 container mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

                    {/* Left: Content (Narrower) */}
                    <div className="lg:col-span-4 space-y-8">
                        <FadeInView direction="right" delay={100}>
                            <div>
                                <div className="inline-flex items-center gap-2 px-2 py-1 mb-6 border-l-2 border-accent-violet/50 pl-4">
                                    <span className="text-xs font-mono text-accent-violet tracking-widest">USE_CASE_01</span>
                                </div>
                                <h2 className="text-3xl md:text-4xl font-semibold leading-tight text-fg-porcelain">
                                    &quot;Find the budget from <span className="heading-gradient-violet text-[1.07em]">last Tuesday&apos;s</span> meeting.&quot;
                                </h2>
                            </div>
                        </FadeInView>

                        <FadeInView direction="right" delay={200}>
                            <p className="text-lg text-fg-muted leading-relaxed">
                                Ixos resolves fuzzy time and partial context into exact files.
                            </p>
                        </FadeInView>

                        <div className="space-y-4 pt-8 border-t border-white/5">
                            <FadeInView direction="up" delay={300}><FeatureRow text="Semantic entity extraction" /></FadeInView>
                            <FadeInView direction="up" delay={400}><FeatureRow text="Time-aware filtering" /></FadeInView>
                            <FadeInView direction="up" delay={500}><FeatureRow text="OCR over screenshots" /></FadeInView>
                        </div>
                    </div>

                    {/* Right: Technical Card (Wider) */}
                    <div
                        className="lg:col-span-8 relative group"
                        data-trace-anchor="meeting-card"
                        data-trace-color="violet"
                    >
                        <FadeInView direction="left" delay={200} className="w-full">
                            {/* Glow underlay - Enhanced */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-accent-violet/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl" />

                            <div
                                className="relative rounded-sm border border-white/10 bg-bg-graphite-1/80 backdrop-blur-md overflow-hidden shadow-2xl hover-glow-subtle"
                                style={{ "--accent-rgb": "124,92,255" } as CSSProperties}
                            >
                                {/* Technical Header */}
                                <div className="h-10 border-b border-white/10 flex items-center justify-between px-6 bg-bg-graphite-2/50">
                                    <div className="flex gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                    </div>
                                    <div className="text-[10px] font-mono text-accent-violet opacity-70 tracking-widest">QUERY_PROCESSOR_V2</div>
                                </div>

                                {/* Content */}
                                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Query Column */}
                                    <div className="space-y-4">
                                        <div className="text-[10px] font-mono text-fg-muted uppercase tracking-wider opacity-50">Input_Buffer</div>
                                        <div className="p-4 rounded border border-accent-violet/20 bg-accent-violet/5 font-mono text-sm text-accent-violet leading-relaxed">
                                            <span className="opacity-50 select-none mr-2">›</span>
                                            budget from last Tuesday meeting
                                            <span className="animate-pulse ml-1">_</span>
                                        </div>
                                        <div className="h-px w-full bg-gradient-to-r from-accent-violet/30 to-transparent my-4" />
                                        <div className="flex flex-wrap gap-2">
                                            <Tag label="INTENT" value="FIND_FILE" />
                                            <Tag label="TOPIC" value="BUDGET" highlighted />
                                        </div>
                                    </div>

                                    {/* Extraction Column */}
                                    <div className="space-y-4 border-l border-white/5 pl-8 hidden md:block">
                                        <div className="text-[10px] font-mono text-fg-muted uppercase tracking-wider opacity-50">Filter_Synthesis</div>
                                        <div className="space-y-2">
                                            <Tag label="TIME_RANGE" value="2023-10-24" />
                                            <Tag label="FILE_TYPE" value="XLSX OR PDF" />
                                            <Tag label="CONFIDENCE" value="98.2%" highlighted />
                                        </div>
                                        {/* Visual extraction graph lines */}
                                        <div className="mt-8 relative h-12 w-full border-t border-b border-white/5 opacity-30">
                                            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                                                <path d="M0,24 Q50,0 100,24 T200,24" stroke="currentColor" fill="none" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Corner Accents */}
                                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-accent-violet opacity-30" />
                                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-accent-violet opacity-30" />
                            </div>
                        </FadeInView>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FeatureRow({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-4 text-fg-muted hover:text-fg-porcelain transition-colors group">
            <div className="w-1.5 h-1.5 bg-accent-violet/50 rotate-45 group-hover:bg-accent-violet transition-colors" />
            <span className="font-mono text-sm tracking-tight">{text}</span>
        </div>
    );
}

function Tag({ label, value, highlighted }: { label: string, value: string, highlighted?: boolean }) {
    return (
        <div className={cn(
            "flex justify-between items-center px-3 py-1.5 rounded border text-[10px] font-mono w-full",
            highlighted
                ? "border-accent-violet/30 bg-accent-violet/10 text-accent-violet"
                : "border-white/5 bg-bg-graphite-2 text-fg-muted"
        )}>
            <span className="opacity-50">{label}</span>
            <span className={highlighted ? "font-bold" : "opacity-80"}>{value}</span>
        </div>
    );
}
