"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { PageGlow } from "@/components/effects/PageGlow";
import { IxosDemoWindow, STEP_LABELS } from "@/components/hero/IxosDemoWindow";
import {
    MemoryWipe,
    QueryDecomposition,
    ScoreWaterfall,
    StreamWaterfall,
    VectorSpace,
} from "@/components/hero/diagrams";

if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Phase data — tells the actual search story                                */
/* ────────────────────────────────────────────────────────────────────────── */

interface PhaseBox {
    id: string;
    label: string;
    title: string;
    description: string;
}

const PHASES: PhaseBox[] = [
    {
        id: "01",
        label: "Parse",
        title: "Query Understanding",
        description:
            "Your words are parsed into semantic tokens — intent, entities, context. No special syntax needed.",
    },
    {
        id: "02",
        label: "Embed",
        title: "Vector Engine",
        description:
            "Each token maps to a 64-dim vector via a CPU-optimized micro-model. No GPU, no cloud.",
    },
    {
        id: "03",
        label: "Rank",
        title: "Score & Rank",
        description:
            "Cosine similarity meets keyword overlap. Multi-signal scoring surfaces what matters.",
    },
    {
        id: "04",
        label: "Wipe",
        title: "Zero Trace",
        description:
            "Every embedding, every buffer — wiped from memory the moment scoring completes.",
    },
    {
        id: "05",
        label: "Stream",
        title: "Instant Results",
        description:
            "Ranked files stream to screen in under 200ms. Click to open in your file manager.",
    },
];

type AccentColor = "amber" | "teal" | "violet";
const PHASE_ACCENTS: AccentColor[] = ["amber", "teal", "teal", "violet", "teal"];

const STATUS_MESSAGES = [
    "Parsing natural language query",
    "Computing vector embeddings",
    "Ranking by semantic similarity",
    "Wiping embeddings from memory",
    "Streaming ranked results",
];

function phaseDiagram(step: number, isActive: boolean, isComplete: boolean) {
    if (step === 0)
        return (
            <QueryDecomposition isActive={isActive} isComplete={isComplete} />
        );
    if (step === 1)
        return <VectorSpace isActive={isActive} isComplete={isComplete} />;
    if (step === 2)
        return <ScoreWaterfall isActive={isActive} isComplete={isComplete} />;
    if (step === 3)
        return <MemoryWipe isActive={isActive} isComplete={isComplete} />;
    return <StreamWaterfall isActive={isActive} isComplete={isComplete} />;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Main component                                                            */
/* ────────────────────────────────────────────────────────────────────────── */

export function HeroPipeline() {
    const containerRef = useRef<HTMLDivElement>(null);
    const heroTextRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLDivElement>(null);
    const bottomRowRef = useRef<HTMLDivElement>(null);
    const tileRefs = useRef<(HTMLDivElement | null)[]>([
        null,
        null,
        null,
        null,
        null,
    ]);

    const [activeStep, setActiveStep] = useState<number | null>(null);
    const [isDesktop, setIsDesktop] = useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
        if (typeof window === "undefined") return false;
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    });

    /* ── responsive + a11y listeners ─────────────────────────────────────── */
    useEffect(() => {
        if (typeof window === "undefined") return;
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        const onReduced = (e: MediaQueryListEvent) =>
            setPrefersReducedMotion(e.matches);
        const onResize = () => setIsDesktop(window.innerWidth >= 1024);
        onResize();
        mq.addEventListener("change", onReduced);
        window.addEventListener("resize", onResize);
        return () => {
            mq.removeEventListener("change", onReduced);
            window.removeEventListener("resize", onResize);
        };
    }, []);

    /* ── GSAP scroll-driven animations ───────────────────────────────────── */
    useEffect(() => {
        if (!containerRef.current || !isDesktop || prefersReducedMotion) return;

        const allTileEls = tileRefs.current.filter(Boolean) as HTMLDivElement[];
        const fadeTargets = [
            titleRef.current,
            bottomRowRef.current,
            ...allTileEls,
        ].filter(Boolean);

        const ctx = gsap.context(() => {
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: "top top",
                    end: "+=380%",
                    scrub: 0.5,
                    pin: true,
                    pinSpacing: true,
                    anticipatePin: 1,
                },
            });

            /* Stage 1  hero text fades up, tiles + title fade in */
            tl.to(
                heroTextRef.current,
                { autoAlpha: 0, y: -30, duration: 0.5, ease: "power2.in" },
                "intro",
            );
            tl.fromTo(
                fadeTargets,
                { autoAlpha: 0, y: 20 },
                {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.7,
                    stagger: 0.04,
                    ease: "power2.out",
                },
                "intro+=0.15",
            );

            /* Stage 2  hold for phase highlighting (scroll distance) */
            tl.to({}, { duration: 3 });

            /* Stage 3  exit — tiles fade up before unpin */
            tl.to(fadeTargets, {
                autoAlpha: 0,
                y: -15,
                duration: 0.3,
                ease: "power2.in",
            }, "exit");
        }, containerRef);

        /* Separate ScrollTrigger to drive activeStep highlighting */
        const st = ScrollTrigger.create({
            trigger: containerRef.current,
            start: "top top",
            end: "+=380%",
            onUpdate: (self) => {
                const p = self.progress;
                if (p < 0.16 || p > 0.88) {
                    setActiveStep(null);
                } else {
                    const norm = (p - 0.16) / (0.88 - 0.16);
                    setActiveStep(Math.min(4, Math.floor(norm * 5)));
                }
            },
            onLeave: () => setActiveStep(null),
            onLeaveBack: () => setActiveStep(null),
        });

        return () => {
            ctx.revert();
            st.kill();
        };
    }, [isDesktop, prefersReducedMotion]);

    /* ── mobile ──────────────────────────────────────────────────────────── */
    if (!isDesktop) {
        return (
            <section className="section-hero relative w-full min-h-screen overflow-hidden pt-20">
                <PageGlow color="amber" />
                <div className="relative z-10 container mx-auto flex flex-col px-6">
                    <div className="mx-auto max-w-3xl text-center mb-8">
                        <div className="mb-6 inline-flex items-center gap-3 rounded-sm border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-sm">
                            <div className="h-1.5 w-1.5 animate-pulse rounded-sm bg-accent-amber" />
                            <span className="text-[10px] font-mono uppercase tracking-widest text-fg-muted/80">
                                v1.0 Available
                            </span>
                        </div>
                        <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-fg-porcelain">
                            Find anything
                            <br />
                            <span className="text-fg-muted">on your computer.</span>
                        </h1>
                        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-fg-muted/80">
                            Ixos uses local-first semantic search to find your
                            files. Private, secure, fast.
                        </p>
                        <div className="mt-6 flex justify-center">
                            <Button
                                size="lg"
                                hasParticleMagnet
                                className="bg-accent-amber font-medium text-bg-graphite-0 hover:bg-accent-amber/90"
                                asChild
                            >
                                <Link href="/sign-up">Get Started</Link>
                            </Button>
                        </div>
                    </div>

                    <div className="flex w-full flex-col gap-5 pb-20">
                        <div className="overflow-hidden rounded-sm border border-white/10 bg-bg-graphite-0/85 h-[400px]">
                            <IxosDemoWindow />
                        </div>
                        <div className="grid gap-4">
                            {PHASES.map((phase, i) => (
                                <PhaseTile
                                    key={phase.id}
                                    phase={phase}
                                    isActive={false}
                                    isComplete={false}
                                    compact={i >= 3}
                                    accentColor={PHASE_ACCENTS[i]}
                                >
                                    {phaseDiagram(i, false, false)}
                                </PhaseTile>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    /* ── desktop ─────────────────────────────────────────────────────────── */
    return (
        <section
            ref={containerRef}
            className="section-hero relative h-screen w-full overflow-hidden"
        >
            <PageGlow color="amber" />

            {/* Bottom gradient for transition into next section */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 z-30 bg-gradient-to-b from-transparent to-bg-graphite-0" />

            {/* ─── HERO TEXT  absolute overlay, fades on scroll ─────────── */}
            <div
                ref={heroTextRef}
                className="absolute inset-x-0 top-0 z-30 flex justify-center pt-20 pointer-events-none"
            >
                <div className="text-center max-w-3xl pointer-events-auto px-6">
                    <div className="mb-5 inline-flex items-center gap-3 rounded-sm border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-sm">
                        <div className="h-1.5 w-1.5 animate-pulse rounded-sm bg-accent-amber" />
                        <span className="text-[10px] font-mono uppercase tracking-widest text-fg-muted/80">
                            v1.0 Available
                        </span>
                    </div>

                    <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-fg-porcelain md:text-6xl lg:text-7xl">
                        Find anything
                        <br />
                        <span className="text-fg-muted">on your computer.</span>
                    </h1>

                    <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-fg-muted/80">
                        Ixos uses local-first semantic search to find your
                        files. Private, secure, and lightning fast.
                    </p>

                    <div className="mt-5">
                        <Button
                            size="lg"
                            hasParticleMagnet
                            className="min-w-[160px] bg-accent-amber font-medium text-bg-graphite-0 hover:bg-accent-amber/90"
                            asChild
                        >
                            <Link href="/sign-up">Get Started</Link>
                        </Button>
                    </div>
                </div>
            </div>

            {/* ─── BENTO GRID  demo always visible, tiles animate in ───── */}
            <div className="absolute inset-0 z-10 flex items-center justify-center px-6 pt-4 pb-6">
                <div
                    className="w-full max-w-[1400px]"
                    style={{
                        display: "grid",
                        gridTemplateColumns: "320px 1fr 320px",
                        gridTemplateRows: "1fr 1fr auto",
                        gridTemplateAreas: `
              "p1    demo p2"
              "title demo p3"
              "bottom bottom bottom"
            `,
                        gap: "12px",
                        height: "min(78vh, 720px)",
                    }}
                >
                    {/* Phase 1  left top ─────────────────────────────── */}
                    <div
                        ref={(el) => {
                            tileRefs.current[0] = el;
                        }}
                        style={{
                            gridArea: "p1",
                            opacity: 0,
                            visibility: "hidden",
                        }}
                    >
                        <PhaseTile
                            phase={PHASES[0]}
                            isActive={activeStep === 0}
                            isComplete={activeStep !== null && activeStep > 0}
                            accentColor="amber"
                            className="h-full"
                        >
                            {phaseDiagram(
                                0,
                                activeStep === 0,
                                activeStep !== null && activeStep > 0,
                            )}
                        </PhaseTile>
                    </div>

                    {/* Title  left bottom ────────────────────────────── */}
                    <div
                        ref={titleRef}
                        style={{
                            gridArea: "title",
                            opacity: 0,
                            visibility: "hidden",
                        }}
                        className="flex flex-col justify-center px-1"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="h-px w-10 bg-gradient-to-r from-accent-teal to-accent-amber/40" />
                            <span className="text-xs font-mono uppercase tracking-[0.25em] text-accent-teal">
                                How It Works
                            </span>
                        </div>
                        <h2 className="text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05] font-display">
                            The Search
                            <br />
                            <span className="heading-gradient-teal">
                                Pipeline
                            </span>
                        </h2>
                        <p className="mt-3 text-base text-fg-muted/70 leading-relaxed max-w-sm">
                            Five stages, zero cloud. Watch each phase light up
                            as your query flows through.
                        </p>
                    </div>

                    {/* ─── DEMO WINDOW  center, ALWAYS visible ─────── */}
                    <div
                        style={{ gridArea: "demo" }}
                        className="z-20 relative"
                    >
                        <div className="h-full overflow-hidden rounded-sm border border-white/10 bg-bg-graphite-0/90 shadow-2xl flex flex-col">
                            {/* Teal glow behind demo when pipeline active */}
                            <div
                                className="absolute -inset-16 z-[-1] bg-accent-teal/5 blur-[80px] transition-opacity duration-700"
                                style={{
                                    opacity: activeStep !== null ? 0.5 : 0,
                                }}
                            />

                            {/* Titlebar */}
                            <div className="flex h-9 items-center justify-between border-b border-white/10 bg-white/5 px-4 shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-white/30" />
                                    <div className="h-1.5 w-1.5 rounded-full bg-white/30" />
                                </div>
                                <AnimatePresence mode="wait">
                                    <motion.span
                                        key={activeStep ?? "demo"}
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -4 }}
                                        transition={{ duration: 0.15 }}
                                        className={cn(
                                            "text-[11px] font-mono tracking-widest",
                                            activeStep === null
                                                ? "text-accent-amber/80"
                                                : "text-accent-teal/80",
                                        )}
                                    >
                                        //
                                        {activeStep === null
                                            ? "LIVE DEMO"
                                            : STEP_LABELS[activeStep]}
                                    </motion.span>
                                </AnimatePresence>
                            </div>

                            {/* Demo content */}
                            <div className="flex-1 min-h-0">
                                <IxosDemoWindow
                                    controlledStep={activeStep}
                                />
                            </div>

                            {/* Status bar — appears during pipeline mode */}
                            <AnimatePresence>
                                {activeStep !== null && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{
                                            height: "auto",
                                            opacity: 1,
                                        }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="flex items-center justify-between border-t border-white/10 px-5 py-2.5 text-[11px] font-mono text-fg-muted/50 bg-bg-graphite-1">
                                            <span>
                                                {STATUS_MESSAGES[activeStep]}
                                            </span>
                                            <span>Latency &lt;2ms</span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Phase 2  right top ────────────────────────────── */}
                    <div
                        ref={(el) => {
                            tileRefs.current[1] = el;
                        }}
                        style={{
                            gridArea: "p2",
                            opacity: 0,
                            visibility: "hidden",
                        }}
                    >
                        <PhaseTile
                            phase={PHASES[1]}
                            isActive={activeStep === 1}
                            isComplete={activeStep !== null && activeStep > 1}
                            accentColor="teal"
                            className="h-full"
                        >
                            {phaseDiagram(
                                1,
                                activeStep === 1,
                                activeStep !== null && activeStep > 1,
                            )}
                        </PhaseTile>
                    </div>

                    {/* Phase 3  right bottom ─────────────────────────── */}
                    <div
                        ref={(el) => {
                            tileRefs.current[2] = el;
                        }}
                        style={{
                            gridArea: "p3",
                            opacity: 0,
                            visibility: "hidden",
                        }}
                    >
                        <PhaseTile
                            phase={PHASES[2]}
                            isActive={activeStep === 2}
                            isComplete={activeStep !== null && activeStep > 2}
                            accentColor="teal"
                            className="h-full"
                        >
                            {phaseDiagram(
                                2,
                                activeStep === 2,
                                activeStep !== null && activeStep > 2,
                            )}
                        </PhaseTile>
                    </div>

                    {/* Bottom row  Phase 4 + Phase 5, 50/50 ──────────── */}
                    <div
                        ref={bottomRowRef}
                        style={{
                            gridArea: "bottom",
                            opacity: 0,
                            visibility: "hidden",
                        }}
                        className="flex gap-3 h-[140px]"
                    >
                        <PhaseTile
                            phase={PHASES[3]}
                            isActive={activeStep === 3}
                            isComplete={activeStep !== null && activeStep > 3}
                            compact
                            accentColor="violet"
                            className="flex-1"
                        >
                            {phaseDiagram(
                                3,
                                activeStep === 3,
                                activeStep !== null && activeStep > 3,
                            )}
                        </PhaseTile>
                        <PhaseTile
                            phase={PHASES[4]}
                            isActive={activeStep === 4}
                            isComplete={false}
                            compact
                            accentColor="teal"
                            className="flex-1"
                        >
                            {phaseDiagram(4, activeStep === 4, false)}
                        </PhaseTile>
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Accent style map                                                          */
/* ────────────────────────────────────────────────────────────────────────── */

const ACCENT_STYLES: Record<
    AccentColor,
    {
        borderActive: string;
        shadow: string;
        label: string;
        bracket: string;
        bracketAlt: string;
        glow: string;
        ring: string;
    }
> = {
    amber: {
        borderActive: "border-accent-amber/40",
        shadow: "shadow-[0_0_30px_rgba(246,185,76,0.15)]",
        label: "text-accent-amber",
        bracket: "border-accent-amber",
        bracketAlt: "border-accent-teal/50",
        glow: "bg-accent-amber/5",
        ring: "ring-accent-amber/20",
    },
    teal: {
        borderActive: "border-accent-teal/40",
        shadow: "shadow-[0_0_30px_rgba(20,184,166,0.15)]",
        label: "text-accent-teal",
        bracket: "border-accent-teal",
        bracketAlt: "border-accent-amber/50",
        glow: "bg-accent-teal/5",
        ring: "ring-accent-teal/20",
    },
    violet: {
        borderActive: "border-accent-violet/40",
        shadow: "shadow-[0_0_30px_rgba(124,92,255,0.15)]",
        label: "text-accent-violet",
        bracket: "border-accent-violet",
        bracketAlt: "border-accent-teal/50",
        glow: "bg-accent-violet/5",
        ring: "ring-accent-violet/20",
    },
};

/* ────────────────────────────────────────────────────────────────────────── */
/* PhaseTile                                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

function PhaseTile({
    className,
    phase,
    isActive,
    isComplete,
    children,
    compact = false,
    accentColor = "teal",
}: {
    className?: string;
    phase: PhaseBox;
    isActive: boolean;
    isComplete: boolean;
    children: ReactNode;
    compact?: boolean;
    accentColor?: AccentColor;
}) {
    const styles = ACCENT_STYLES[accentColor];

    return (
        <article
            className={cn(
                "relative min-h-0 overflow-hidden rounded-lg border bg-bg-graphite-2/80 backdrop-blur-sm transition-all duration-500",
                compact
                    ? "flex h-full items-center gap-5 p-5"
                    : "flex h-full flex-col p-6",
                isActive
                    ? cn(
                          styles.borderActive,
                          styles.shadow,
                          "scale-[1.02] z-10 opacity-100 ring-1",
                          styles.ring,
                      )
                    : isComplete
                      ? "border-white/10 opacity-70"
                      : "border-white/8 opacity-50",
                className,
            )}
        >
            {/* Corner brackets */}
            {isActive && (
                <>
                    <div
                        className={cn(
                            "absolute left-0 top-0 h-4 w-4 border-l-2 border-t-2",
                            styles.bracket,
                        )}
                    />
                    <div
                        className={cn(
                            "absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2",
                            styles.bracketAlt,
                        )}
                    />
                </>
            )}

            {/* Text */}
            <div
                className={cn(
                    "min-w-0 shrink-0",
                    compact ? "flex-1" : "mb-3",
                )}
            >
                <span
                    className={cn(
                        "text-[10px] font-mono uppercase tracking-widest block mb-1.5",
                        isActive ? styles.label : "text-fg-muted/50",
                    )}
                >
                    //{phase.label}
                </span>
                <h4
                    className={cn(
                        "font-semibold leading-tight",
                        compact ? "text-lg" : "text-xl",
                        isActive ? "text-white" : "text-fg-muted",
                    )}
                >
                    {phase.title}
                </h4>
                {!compact && (
                    <p className="mt-1.5 text-sm leading-relaxed text-fg-muted/60 line-clamp-3">
                        {phase.description}
                    </p>
                )}
            </div>

            {/* Diagram area */}
            <div
                className={cn(
                    "min-h-0 flex items-center justify-center relative",
                    compact
                        ? "w-[160px] shrink-0 h-[100px]"
                        : "mt-auto flex-1 w-full",
                )}
            >
                {isActive && (
                    <div
                        className={cn(
                            "absolute inset-0 blur-xl rounded-full",
                            styles.glow,
                        )}
                    />
                )}
                <div className="relative z-10 w-full h-full flex items-center justify-center">
                    {children}
                </div>
            </div>

            {/* Progress bar */}
            <div
                className={cn(
                    "h-1 overflow-hidden rounded-full bg-white/5",
                    compact
                        ? "absolute bottom-0 left-0 right-0 rounded-none h-0.5"
                        : "mt-4 shrink-0",
                )}
            >
                <div
                    className={cn(
                        "h-full rounded-full transition-all duration-500 ease-out",
                        isComplete
                            ? "bg-gradient-to-r from-accent-teal to-accent-amber/70"
                            : isActive
                              ? "bg-accent-teal"
                              : "",
                    )}
                    style={{
                        width: isComplete
                            ? "100%"
                            : isActive
                              ? "66%"
                              : "0%",
                    }}
                />
            </div>
        </article>
    );
}
