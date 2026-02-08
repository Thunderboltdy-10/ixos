"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { cn } from "@/lib/utils";
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

interface PhaseBox {
  id: string;
  label: string;
  title: string;
  description: string;
  checkpoint: string;
}

type AccentColor = "amber" | "teal" | "violet";

const PHASES: PhaseBox[] = [
  {
    id: "01",
    label: "QUERY_PARSE",
    title: "Intent Extraction",
    description:
      "Natural language gets decomposed into intent, entities, and useful constraints.",
    checkpoint: "QUERY TOKENS READY",
  },
  {
    id: "02",
    label: "VECTOR_MAP",
    title: "Embedding Pass",
    description:
      "A local micro-model maps meaning into vector space with zero cloud roundtrip.",
    checkpoint: "64D EMBEDDINGS COMPUTED",
  },
  {
    id: "03",
    label: "RANK_FUSION",
    title: "Multi-Signal Ranking",
    description:
      "Semantic and lexical evidence merge into one stable score per file.",
    checkpoint: "TOP RESULTS PRIORITIZED",
  },
  {
    id: "04",
    label: "MEMORY_WIPE",
    title: "Ephemeral Privacy",
    description:
      "Temporary vectors and buffers are zeroed after scoring to preserve zero-index operation.",
    checkpoint: "WORKING MEMORY SCRUBBED",
  },
  {
    id: "05",
    label: "LIVE_STREAM",
    title: "Result Delivery",
    description:
      "Ranked files stream immediately so you can open the right match with no index tax.",
    checkpoint: "OPEN IN EXPLORER/FINDER",
  },
];

const STATUS_MESSAGES = [
  "Interpreting the query and extracting entities",
  "Projecting meaning into local vector space",
  "Fusing semantic and lexical ranking signals",
  "Wiping transient buffers for privacy",
  "Streaming ranked files to the interface",
];

const PHASE_ACCENTS: AccentColor[] = ["amber", "teal", "teal", "violet", "teal"];

const CARD_ENTRY_CONFIG = [
  { delay: 0.04, x: 56, y: 28 }, // left-top
  { delay: 0.09, x: -54, y: 24 }, // right-top
  { delay: 0.14, x: -52, y: 12 }, // right-bottom
  { delay: 0.2, x: 44, y: -22 }, // bottom-left
  { delay: 0.25, x: 0, y: -24 }, // bottom-center
];

function phaseDiagram(step: number, isActive: boolean, isComplete: boolean) {
  if (step === 0) return <QueryDecomposition isActive={isActive} isComplete={isComplete} />;
  if (step === 1) return <VectorSpace isActive={isActive} isComplete={isComplete} />;
  if (step === 2) return <ScoreWaterfall isActive={isActive} isComplete={isComplete} />;
  if (step === 3) return <MemoryWipe isActive={isActive} isComplete={isComplete} />;
  return <StreamWaterfall isActive={isActive} isComplete={isComplete} />;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function mapProgress(value: number, start: number, end: number) {
  return clamp01((value - start) / Math.max(end - start, 0.0001));
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

export function HeroPipeline() {
  const sectionRef = useRef<HTMLElement>(null);
  const progressRafRef = useRef<number | null>(null);
  const latestProgressRef = useRef(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  const [progress, setProgress] = useState(0);
  const [mobileStep, setMobileStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reducedMotionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleReducedMotion = (event: MediaQueryListEvent) =>
      setPrefersReducedMotion(event.matches);
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);

    handleResize();
    reducedMotionMedia.addEventListener("change", handleReducedMotion);
    window.addEventListener("resize", handleResize);
    return () => {
      reducedMotionMedia.removeEventListener("change", handleReducedMotion);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (!sectionRef.current || !isDesktop || prefersReducedMotion) return;

    const publishProgress = (value: number) => {
      latestProgressRef.current = value;
      if (progressRafRef.current !== null) return;
      progressRafRef.current = window.requestAnimationFrame(() => {
        setProgress(latestProgressRef.current);
        progressRafRef.current = null;
      });
    };

    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top top",
      end: "+=430%",
      pin: true,
      pinSpacing: true,
      scrub: 0.42,
      anticipatePin: 1.5,
      fastScrollEnd: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        publishProgress(self.progress);
      },
      onRefresh: (self) => {
        publishProgress(self.progress);
      },
    });

    return () => {
      trigger.kill();
      if (progressRafRef.current !== null) {
        window.cancelAnimationFrame(progressRafRef.current);
        progressRafRef.current = null;
      }
    };
  }, [isDesktop, prefersReducedMotion]);

  useEffect(() => {
    if (isDesktop || !sectionRef.current) return;
    const sectionEl = sectionRef.current;
    const onScroll = () => {
      const rect = sectionEl.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 1;
      const visible = clamp01((viewportHeight - rect.top) / Math.max(rect.height, 1));
      const nextStep = Math.min(PHASES.length - 1, Math.floor(visible * PHASES.length));
      setMobileStep(nextStep);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [isDesktop]);

  const derived = useMemo(() => {
    const intro = prefersReducedMotion ? 1 : easeOutCubic(mapProgress(progress, 0.02, 0.24));
    const entry = prefersReducedMotion ? 1 : easeOutCubic(mapProgress(progress, 0.2, 0.46));
    const narrative = prefersReducedMotion ? 1 : mapProgress(progress, 0.46, 0.9);
    const exit = prefersReducedMotion ? 0 : easeOutCubic(mapProgress(progress, 0.92, 1));

    const heroOpacity = clamp01(1 - mapProgress(progress, 0.22, 0.4));
    const heroDrop = mapProgress(progress, 0.16, 0.46);
    const heroShiftY = -18 + intro * 12 + heroDrop * 170 - exit * 8;

    const demoLift = 214 - entry * 176 - mapProgress(progress, 0.62, 0.9) * 34;
    const demoScale = 0.986 + entry * 0.028;
    const headerOpacity = clamp01(mapProgress(progress, 0.26, 0.48));
    const heroMorph = mapProgress(progress, 0.16, 0.48);
    const titleMorph = mapProgress(progress, 0.24, 0.52);

    let activeStep: number | null = null;
    if (entry > 0.22) {
      if (narrative < 1) {
        activeStep = Math.min(PHASES.length - 1, Math.floor(narrative * PHASES.length));
      } else {
        activeStep = PHASES.length - 1;
      }
    }

    // When in hero stage (before pipeline cards appear), pass null to allow autonomous loop
    const demoStep = activeStep;

    return {
      entry,
      exit,
      heroOpacity,
      heroShiftY,
      demoLift,
      demoScale,
      headerOpacity,
      heroMorph,
      titleMorph,
      activeStep,
      demoStep,
    };
  }, [prefersReducedMotion, progress]);

  if (!isDesktop) {
    return (
      <section ref={sectionRef} className="section-hero relative w-full overflow-hidden pt-28">
        <PageGlow color="amber" />
        <div className="relative z-10 container mx-auto px-6 pb-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-3 rounded-sm border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-sm bg-accent-amber" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-fg-muted/80">
                V1.0 AVAILABLE
              </span>
            </div>

            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-fg-porcelain sm:text-5xl">
              Find anything
              <br />
              <span className="text-fg-muted">on your computer.</span>
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-fg-muted/80">
              Scroll through the search story: parse, embed, rank, wipe, and stream. Local-first
              from start to finish.
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

          <div className="mx-auto mt-10 w-full max-w-[860px] overflow-hidden rounded-xl border border-white/12 bg-bg-graphite-0/95 shadow-2xl">
            <div className="flex h-8 items-center justify-between border-b border-white/10 bg-white/5 px-4">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
                <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
              </div>
              <span className="text-[10px] font-mono tracking-widest text-accent-teal/75">
                {`// ${STEP_LABELS[mobileStep]}`}
              </span>
            </div>
            <div className="aspect-[16/9]">
              <IxosDemoWindow controlledStep={mobileStep} />
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {PHASES.map((phase, index) => (
              <PhaseTile
                key={phase.id}
                phase={phase}
                isActive={mobileStep === index}
                isComplete={mobileStep > index}
                accentColor={PHASE_ACCENTS[index]}
                compact={index >= 3}
              >
                {phaseDiagram(index, mobileStep === index, mobileStep > index)}
              </PhaseTile>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const activeStep = derived.activeStep;
  const statusText =
    activeStep === null ? "Priming the local search pipeline" : STATUS_MESSAGES[activeStep];
  const activeAccent: AccentColor = activeStep === null ? "amber" : PHASE_ACCENTS[activeStep];
  const demoStyles = ACCENT_STYLES[activeAccent];

  return (
    <section
      ref={sectionRef}
      className="section-hero relative h-screen w-full overflow-hidden"
      id="how-it-works"
    >
      <PageGlow color="amber" />

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-30 h-44 bg-gradient-to-b from-transparent to-bg-graphite-0" />

      <div
        className="absolute inset-x-0 top-0 z-10 flex justify-center px-6 pt-[12vh]"
        style={{
          opacity: derived.heroOpacity * (1 - derived.exit * 0.75),
          transform: `translate3d(0, ${derived.heroShiftY}px, 0)`,
          filter: `blur(${derived.heroMorph * 7}px)`,
        }}
      >
        <div className="pointer-events-auto max-w-4xl text-center">
          <div className="mb-5 inline-flex items-center gap-3 rounded-sm border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-sm bg-accent-amber" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-fg-muted/80">
              V1.0 AVAILABLE
            </span>
          </div>

          <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-fg-porcelain md:text-5xl lg:text-6xl">
            Find anything
            <br />
            <span className="text-fg-muted">on your computer.</span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-fg-muted/80">
            Type naturally. Ixos parses intent, ranks locally, and streams answers without cloud
            indexing.
          </p>

          <div className="mt-6">
            <Button
              size="lg"
              hasParticleMagnet
              className="min-w-[164px] bg-accent-amber font-medium text-bg-graphite-0 hover:bg-accent-amber/90"
              asChild
            >
              <Link href="/sign-up">Get Started</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 z-30 flex items-center justify-center px-6">
        <div
          className="relative w-full max-w-[1600px]"
          style={{
            transform: `translate3d(0, ${derived.demoLift}px, 0) scale(${derived.demoScale})`,
          }}
        >
          <div
            className="relative"
            style={{
              display: "grid",
              gridTemplateColumns: "350px minmax(0,1fr) 350px",
              gridTemplateRows: "164px minmax(260px,1fr) minmax(200px,0.9fr) 188px",
              gridTemplateAreas: `
                "title title title"
                "p1 demo p2"
                "p4 demo p3"
                "p4 p5 p3"
              `,
              gap: "20px",
              height: "min(90vh, 980px)",
            }}
          >
            <div
              className="flex flex-col items-center justify-end px-1 pb-8 text-center"
              style={{
                gridArea: "title",
                opacity: derived.headerOpacity,
                transform: `translate3d(0, ${(1 - derived.entry) * 18}px, 0)`,
                filter: `blur(${(1 - derived.titleMorph) * 6}px)`,
              }}
            >
              <div className="text-[10px] font-mono uppercase tracking-[0.28em] text-accent-teal/82">
                Pipeline Experience
              </div>
              <h2 className="mt-2 text-6xl font-semibold leading-[0.94] tracking-tight text-fg-porcelain">
                Search Pipeline
              </h2>
              <div className="mt-3 max-w-3xl text-sm text-fg-muted/75">
                Parse, embed, rank, wipe, and stream as one guided local-first flow.
              </div>
            </div>

            <PipelineCardWrapper
              area="p1"
              entry={derived.entry}
              exit={derived.exit}
              config={CARD_ENTRY_CONFIG[0]}
            >
              <PhaseTile
                phase={PHASES[0]}
                isActive={activeStep === 0}
                isComplete={activeStep !== null && activeStep > 0}
                accentColor={PHASE_ACCENTS[0]}
                className="h-full"
              >
                {phaseDiagram(0, activeStep === 0, activeStep !== null && activeStep > 0)}
              </PhaseTile>
            </PipelineCardWrapper>

            <div
              className={cn(
                "relative z-20 flex min-h-0 items-center justify-center",
                activeStep === null ? "pointer-events-auto" : "pointer-events-none"
              )}
              style={{ gridArea: "demo" }}
            >
              <div
                className={cn(
                  "relative flex h-full w-full max-w-[920px] flex-col overflow-hidden rounded-xl border bg-bg-graphite-0/95 shadow-2xl",
                  "transition-[border-color,box-shadow] duration-500",
                  demoStyles.borderActive,
                  demoStyles.shadow
                )}
                style={{
                  aspectRatio: "16 / 9",
                  maxHeight: "100%",
                }}
              >
                <div className={cn("absolute -inset-16 z-[-1] blur-[90px]", demoStyles.glow)} />

                <div className="flex h-10 items-center justify-between border-b border-white/10 bg-white/5 px-4">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
                    <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
                  </div>
                  <span className={cn("text-[11px] font-mono tracking-widest", demoStyles.label)}>
                    {`// ${activeStep === null ? "LIVE_DEMO" : STEP_LABELS[activeStep]}`}
                  </span>
                </div>

                <div className="min-h-0 flex-1">
                  <IxosDemoWindow controlledStep={derived.demoStep ?? null} />
                </div>

                <div className="flex items-center justify-between border-t border-white/12 bg-bg-graphite-1 px-5 py-2.5 text-[11px] font-mono text-fg-muted/72">
                  <span>{statusText}</span>
                  <span className={cn("text-[10px] uppercase tracking-[0.18em]", demoStyles.label)}>
                    LATENCY &lt; 2MS
                  </span>
                </div>
              </div>
            </div>

            <PipelineCardWrapper
              area="p2"
              entry={derived.entry}
              exit={derived.exit}
              config={CARD_ENTRY_CONFIG[1]}
            >
              <PhaseTile
                phase={PHASES[1]}
                isActive={activeStep === 1}
                isComplete={activeStep !== null && activeStep > 1}
                accentColor={PHASE_ACCENTS[1]}
                className="h-full"
              >
                {phaseDiagram(1, activeStep === 1, activeStep !== null && activeStep > 1)}
              </PhaseTile>
            </PipelineCardWrapper>

            <PipelineCardWrapper
              area="p4"
              entry={derived.entry}
              exit={derived.exit}
              config={CARD_ENTRY_CONFIG[3]}
            >
              <PhaseTile
                phase={PHASES[3]}
                isActive={activeStep === 3}
                isComplete={activeStep !== null && activeStep > 3}
                accentColor={PHASE_ACCENTS[3]}
                className="h-full"
              >
                {phaseDiagram(3, activeStep === 3, activeStep !== null && activeStep > 3)}
              </PhaseTile>
            </PipelineCardWrapper>

            <PipelineCardWrapper
              area="p5"
              entry={derived.entry}
              exit={derived.exit}
              config={CARD_ENTRY_CONFIG[4]}
            >
              <PhaseTile
                phase={PHASES[4]}
                isActive={activeStep === 4}
                isComplete={activeStep !== null && activeStep > 4}
                accentColor={PHASE_ACCENTS[4]}
                className="h-full"
              >
                {phaseDiagram(4, activeStep === 4, activeStep !== null && activeStep > 4)}
              </PhaseTile>
            </PipelineCardWrapper>

            <PipelineCardWrapper
              area="p3"
              entry={derived.entry}
              exit={derived.exit}
              config={CARD_ENTRY_CONFIG[2]}
            >
              <PhaseTile
                phase={PHASES[2]}
                isActive={activeStep === 2}
                isComplete={activeStep !== null && activeStep > 2}
                accentColor={PHASE_ACCENTS[2]}
                className="h-full"
              >
                {phaseDiagram(2, activeStep === 2, activeStep !== null && activeStep > 2)}
              </PhaseTile>
            </PipelineCardWrapper>
          </div>
        </div>
      </div>
    </section>
  );
}

function PipelineCardWrapper({
  area,
  entry,
  exit,
  config,
  children,
}: {
  area: string;
  entry: number;
  exit: number;
  config: { delay: number; x: number; y: number };
  children: ReactNode;
}) {
  const reveal = easeOutCubic(clamp01((entry - config.delay) / 0.42));
  return (
    <div
      style={{
        gridArea: area,
        zIndex: 35,
        opacity: reveal,
        transform: `translate3d(${(1 - reveal) * config.x}px, ${(1 - reveal) * config.y - exit * 20}px, 0) scale(${0.88 + reveal * 0.12})`,
        filter: `blur(${(1 - reveal) * 6}px)`,
        pointerEvents: reveal > 0.42 ? "auto" : "none",
      }}
    >
      {children}
    </div>
  );
}

const ACCENT_STYLES: Record<
  AccentColor,
  {
    borderActive: string;
    shadow: string;
    label: string;
    glow: string;
    ring: string;
  }
> = {
  amber: {
    borderActive: "border-accent-amber/55",
    shadow: "shadow-[0_0_34px_rgba(246,185,76,0.2)]",
    label: "text-accent-amber",
    glow: "bg-accent-amber/8",
    ring: "ring-accent-amber/20",
  },
  teal: {
    borderActive: "border-accent-teal/55",
    shadow: "shadow-[0_0_34px_rgba(20,184,166,0.2)]",
    label: "text-accent-teal",
    glow: "bg-accent-teal/8",
    ring: "ring-accent-teal/20",
  },
  violet: {
    borderActive: "border-accent-violet/55",
    shadow: "shadow-[0_0_34px_rgba(124,92,255,0.2)]",
    label: "text-accent-violet",
    glow: "bg-accent-violet/8",
    ring: "ring-accent-violet/20",
  },
};

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
        "relative flex min-h-0 overflow-hidden rounded-2xl border bg-bg-graphite-2/92 backdrop-blur-sm transition-all duration-500",
        compact ? "h-full items-start gap-4 p-5" : "grid h-full grid-rows-[auto_minmax(0,1fr)] gap-3 p-5",
        isActive
          ? cn(styles.borderActive, styles.shadow, "z-10 ring-1 opacity-100 scale-[1.01]", styles.ring)
          : isComplete
            ? "border-white/22 opacity-95"
            : "border-white/16 opacity-86",
        className
      )}
    >
      {isActive && (
        <>
          <div className={cn("absolute inset-0 blur-2xl", styles.glow)} />
          <div className="absolute left-4 top-4 h-2.5 w-2.5 rounded-full bg-white/70 shadow-[0_0_16px_rgba(255,255,255,0.55)]" />
        </>
      )}

      <div className={cn("relative z-10 min-w-0", compact ? "flex-1" : "")}>
        <span
          className={cn(
            "block text-[10px] font-mono uppercase tracking-[0.24em]",
            isActive ? styles.label : "text-fg-muted/72"
          )}
        >
          {`// ${phase.label}`}
        </span>
        <h4 className={cn("mt-2 font-semibold leading-[0.98]", compact ? "text-[1.95rem]" : "text-[1.6rem]")}>
          {phase.title}
        </h4>
        <p
          className={cn(
            "mt-2 leading-relaxed text-fg-muted/84",
            compact ? "text-sm" : "line-clamp-3 text-[0.9rem]"
          )}
        >
          {phase.description}
        </p>
        <div className="mt-2 text-[11px] font-mono uppercase tracking-[0.15em] text-fg-muted/64">
          {phase.checkpoint}
        </div>
      </div>

      <div
        className={cn(
          "relative z-10 min-h-0",
          compact ? "h-[112px] w-[184px] shrink-0" : "mt-1 flex h-[clamp(94px,36%,152px)] w-full items-center"
        )}
      >
        {children}
      </div>
    </article>
  );
}
