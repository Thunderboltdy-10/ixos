"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { FadeInView } from "@/components/effects/FadeInView";

export function MeetingUseCaseV3() {
    return (
        <div className="relative">
            <SectionDivider accent="amber" label="SEMANTIC_RESOLUTION" />

            <div className="py-32 container mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

                    {/* Left: Content (Narrower) */}
                    <div className="lg:col-span-4 space-y-8">
                        <FadeInView direction="right" delay={100}>
                            <div>
                                <div className="inline-flex items-center gap-2 px-2 py-1 mb-6 border-l-2 border-accent-amber/50 pl-4">
                                    <span className="text-xs font-mono text-accent-amber tracking-widest uppercase">Query_Resolution</span>
                                </div>
                                <h2 className="text-3xl md:text-4xl font-semibold leading-tight text-fg-porcelain">
                                    &quot;Show all <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-amber to-orange-400">Rust structs</span> implementing the new Auth trait.&quot;
                                </h2>
                            </div>
                        </FadeInView>

                        <FadeInView direction="right" delay={200}>
                            <p className="text-lg text-fg-muted leading-relaxed">
                                Regular expressions fail on semantic boundaries. Ixos understands ASTs, traits, and modular boundaries out of the box.
                            </p>
                        </FadeInView>

                        <div className="space-y-4 pt-8 border-t border-white/5">
                            <FadeInView direction="up" delay={300}><FeatureRow text="AST-aware parsing (Languages: rs, ts, go, py)" /></FadeInView>
                            <FadeInView direction="up" delay={400}><FeatureRow text="Trait and Interface cross-referencing" /></FadeInView>
                            <FadeInView direction="up" delay={500}><FeatureRow text="Module boundary understanding" /></FadeInView>
                        </div>
                    </div>

                    {/* Right: Technical Card (Wider) */}
                    <div
                        className="lg:col-span-8 relative group"
                        data-trace-anchor="meeting-card-v3"
                        data-trace-color="amber"
                    >
                        <FadeInView direction="left" delay={200} className="w-full">
                            <div className="absolute -inset-1 bg-gradient-to-r from-accent-amber/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl" />

                            <div
                                className="relative rounded-sm border border-white/10 bg-bg-graphite-1/80 backdrop-blur-md overflow-hidden shadow-2xl hover-glow-subtle"
                                style={{ "--accent-rgb": "246,185,76" } as CSSProperties}
                            >
                                {/* Technical Header */}
                                <div className="h-10 border-b border-white/10 flex items-center justify-between px-6 bg-bg-graphite-2/50">
                                    <div className="flex gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-accent-amber rounded-sm animate-pulse" />
                                        <div className="text-[10px] font-mono text-accent-amber opacity-90 tracking-widest">RALPH_PIPELINE_ACTIVE</div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Query Column */}
                                    <div className="space-y-4">
                                        <div className="text-[10px] font-mono text-fg-muted uppercase tracking-wider opacity-50">Local_Query_Buffer</div>
                                        <div className="p-4 rounded border border-accent-amber/20 bg-accent-amber/5 font-mono text-sm text-accent-amber leading-relaxed">
                                            <span className="opacity-50 select-none mr-2">›</span>
                                            rust structs imp:Auth trait
                                            <span className="animate-pulse ml-1">_</span>
                                        </div>
                                        <div className="h-px w-full bg-gradient-to-r from-accent-amber/30 to-transparent my-4" />
                                        <div className="flex flex-wrap gap-2">
                                            <Tag label="LANG" value="RUST" />
                                            <Tag label="SYMBOL" value="STRUCT" />
                                            <Tag label="TRAIT" value="Auth" highlighted />
                                        </div>
                                    </div>

                                    {/* Extraction Column */}
                                    <div className="space-y-4 border-l border-white/5 pl-8 hidden md:block">
                                        <div className="text-[10px] font-mono text-fg-muted uppercase tracking-wider opacity-50">Score_Fusion</div>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between text-xs font-mono">
                                                <span className="text-fg-muted">auth_manager.rs</span>
                                                <span className="text-accent-amber font-bold">99.4%</span>
                                            </div>
                                            <div className="w-full bg-bg-graphite-2 h-1 rounded-full overflow-hidden">
                                                <div className="bg-accent-amber h-full w-[99.4%]" />
                                            </div>

                                            <div className="flex items-center justify-between text-xs font-mono mt-4">
                                                <span className="text-fg-muted">session_jwt.rs</span>
                                                <span className="text-accent-amber font-bold">96.1%</span>
                                            </div>
                                            <div className="w-full bg-bg-graphite-2 h-1 rounded-full overflow-hidden">
                                                <div className="bg-accent-amber h-full w-[96.1%] opacity-80" />
                                            </div>
                                        </div>
                                        {/* Visual extraction graph lines */}
                                        <div className="mt-8 relative h-8 w-full border-t border-b border-white/5 opacity-30">
                                            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                                                <path d="M0,16 Q50,0 100,16 T200,16" stroke="currentColor" fill="none" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Corner Accents */}
                                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-accent-amber opacity-30" />
                                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-accent-amber opacity-30" />
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
            <div className="w-1.5 h-1.5 bg-accent-amber/50 rotate-45 group-hover:bg-accent-amber transition-colors" />
            <span className="font-mono text-sm tracking-tight">{text}</span>
        </div>
    );
}

function Tag({ label, value, highlighted }: { label: string, value: string, highlighted?: boolean }) {
    return (
        <div className={cn(
            "flex justify-between items-center px-3 py-1.5 rounded border text-[10px] font-mono w-full",
            highlighted
                ? "border-accent-amber/30 bg-accent-amber/10 text-accent-amber"
                : "border-white/5 bg-bg-graphite-2 text-fg-muted"
        )}>
            <span className="opacity-50">{label}</span>
            <span className={highlighted ? "font-bold" : "opacity-80"}>{value}</span>
        </div>
    );
}
