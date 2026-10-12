"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { PageGlow } from "@/components/effects/PageGlow";
import { IxosDemoWindow, STEP_LABELS, type DemoMode } from "@/components/hero/IxosDemoWindow";
import {
  MemoryWipe,
  QueryDecomposition,
  ScoreWaterfall,
  StreamWaterfall,
  VectorSpace,
} from "@/components/hero/diagrams";

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
    title: "Memory Privacy",
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

const PHASE_ACCENTS: AccentColor[] = ["amber", "teal", "teal", "amber", "teal"];

const CARD_ENTRY_CONFIG = [
  { delay: 0.04, x: 56, y: 28 },
  { delay: 0.09, x: -54, y: 24 },
  { delay: 0.14, x: -52, y: 12 },
  { delay: 0.2, x: 44, y: -22 },
  { delay: 0.25, x: 0, y: -24 },
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

// Round to nearest pixel to prevent sub-pixel flickering
function px(value: number): number {
  return Math.round(value);
}

function modeToAccent(mode: DemoMode): AccentColor {
  if (mode === "memory") return "amber";
  if (mode === "deep-search") return "violet";
  return "teal";
}

// Derive all continuous values from raw progress.
function deriveFromProgress(progress: number, reducedFx: boolean) {
  const intro = reducedFx ? 1 : easeOutCubic(mapProgress(progress, 0.02, 0.24));
  const entry = reducedFx ? 1 : easeOutCubic(mapProgress(progress, 0.2, 0.46));
  const narrative = reducedFx ? mapProgress(progress, 0.04, 0.98) : mapProgress(progress, 0.46, 0.9);
  const exit = reducedFx ? 0 : easeOutCubic(mapProgress(progress, 0.92, 1));

  const heroOpacity = reducedFx ? 0 : clamp01(1 - mapProgress(progress, 0.08, 0.22));
  // Remove hero drift - only fade out, don't move vertically during scroll
  const heroShiftY = reducedFx ? 0 : -36 + intro * 10 - exit * 8;

  // Stabilize demo position during pinned state - less drift
  const demoLift = reducedFx ? 0 : 214 - entry * 176 - exit * 20;
  const demoScale = reducedFx ? 1 : 0.986 + entry * 0.028;
  const headerOpacity = reducedFx ? 1 : clamp01(mapProgress(progress, 0.26, 0.48));
  const activeStep = entry > 0.64
    ? Math.min(
        PHASES.length - 1,
        Math.max(0, Math.floor((narrative + 0.08 / PHASES.length) * PHASES.length))
      )
    : null;

  const demoStep = entry > 0.64 ? activeStep : null;

  return { entry, exit, heroOpacity, heroShiftY, demoLift, demoScale, headerOpacity, activeStep, demoStep };
}

export function HeroPipeline() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  const isLowPowered = useMemo(() => {
    if (typeof window === "undefined") return false;
    const nav = navigator as Navigator & { deviceMemory?: number };
    const deviceMemory = nav.deviceMemory;
    const hardwareConcurrency = nav.hardwareConcurrency;
    return (deviceMemory && deviceMemory < 4) || (hardwareConcurrency && hardwareConcurrency < 4);
  }, []);

  // Discrete state only — controls child props (active highlights, demo step).
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [demoStep, setDemoStep] = useState<number | null>(null);
  const [mobileStep, setMobileStep] = useState(0);
  const [demoMode, setDemoMode] = useState<DemoMode>("memory");

  // DOM refs for direct style manipulation (bypasses React render cycle).
  const heroTextRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null, null]);

  const reducedFxRef = useRef(false);

  useEffect(() => {
    reducedFxRef.current = prefersReducedMotion || !!isLowPowered;
  }, [prefersReducedMotion, isLowPowered]);

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

  // Desktop: JavaScript-based pin using the wrapper as a permanent spacer.
  // The wrapper div provides the scroll range. The section is toggled between
  // relative/fixed/absolute via ref — no GSAP, no spacer injection, no React re-renders.
  useEffect(() => {
    if (!isDesktop || !wrapperRef.current || !sectionRef.current) return;

    const wrapperEl = wrapperRef.current;
    const sectionEl = sectionRef.current;
    let rafId: number | null = null;
    let lastPinState: "before" | "pinned" | "after" = "before";

    const applyStyles = (progress: number) => {
      const d = deriveFromProgress(progress, reducedFxRef.current);

      if (heroTextRef.current) {
        heroTextRef.current.style.opacity = String(d.heroOpacity * (1 - d.exit * 0.2));
        heroTextRef.current.style.transform = `translate3d(0, ${px(d.heroShiftY)}px, 0)`;
      }

      if (gridContainerRef.current) {
        // Snap scale to 3 decimal places to avoid sub-pixel jitter
        const scale = Math.round(d.demoScale * 1000) / 1000;
        gridContainerRef.current.style.transform = `translate3d(0, ${px(d.demoLift)}px, 0) scale(${scale})`;
      }

      if (headerRef.current) {
        headerRef.current.style.opacity = String(d.headerOpacity);
        headerRef.current.style.transform = `translate3d(0, ${px((1 - d.entry) * 18)}px, 0)`;
      }

      for (let i = 0; i < CARD_ENTRY_CONFIG.length; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;
        const cfg = CARD_ENTRY_CONFIG[i];
        const reveal = easeOutCubic(clamp01((d.entry - cfg.delay) / 0.42));
        el.style.opacity = String(Math.round(reveal * 100) / 100);
        const tx = px((1 - reveal) * cfg.x);
        // Remove exit drift - keep cards stable during scroll
        const ty = px((1 - reveal) * cfg.y);
        el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
        el.style.pointerEvents = reveal > 0.42 ? "auto" : "none";
      }

      setActiveStep((prev) => (prev === d.activeStep ? prev : d.activeStep));
      setDemoStep((prev) => (prev === d.demoStep ? prev : d.demoStep));
    };

    const onFrame = () => {
      const rect = wrapperEl.getBoundingClientRect();
      const vh = window.innerHeight;
      const scrollRange = rect.height - vh;

      // Pin state: before (section scrolls normally), pinned (fixed), after (stuck at bottom)
      let pinState: "before" | "pinned" | "after";
      if (rect.top > 0) {
        pinState = "before";
      } else if (rect.bottom <= vh) {
        pinState = "after";
      } else {
        pinState = "pinned";
      }

      // Only touch the DOM when pin state actually changes
      if (pinState !== lastPinState) {
        if (pinState === "before") {
          sectionEl.style.position = "relative";
          sectionEl.style.top = "0";
          sectionEl.style.left = "";
          sectionEl.style.width = "";
        } else if (pinState === "pinned") {
          sectionEl.style.position = "fixed";
          sectionEl.style.top = "0";
          sectionEl.style.left = "0";
          sectionEl.style.width = "100%";
        } else {
          // "after" — park section at the bottom of the wrapper
          sectionEl.style.position = "absolute";
          sectionEl.style.top = `${scrollRange}px`;
          sectionEl.style.left = "0";
          sectionEl.style.width = "100%";
        }
        lastPinState = pinState;
      }

      const progress = clamp01(-rect.top / Math.max(scrollRange, 1));
      applyStyles(progress);
      rafId = null;
    };

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(onFrame);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
      // Reset section styles on cleanup
      sectionEl.style.position = "";
      sectionEl.style.top = "";
      sectionEl.style.left = "";
      sectionEl.style.width = "";
    };
  }, [isDesktop, isLowPowered]);

  // Mobile: step tracking via scroll position
  useEffect(() => {
    if (isDesktop || !sectionRef.current) return;
    const sectionEl = sectionRef.current;
    const onScroll = () => {
      const rect = sectionEl.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 1;
      const visible = clamp01((viewportHeight - rect.top) / Math.max(rect.height, 1));
      const nextStep = Math.min(PHASES.length - 1, Math.floor(visible * PHASES.length));
      setMobileStep((prev) => (prev === nextStep ? prev : nextStep));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [isDesktop]);

  if (!isDesktop) {
    return (
      <section ref={sectionRef} className="section-hero relative w-full overflow-hidden pt-[14vh]">
        <PageGlow color={(() => {
          const accent = modeToAccent(demoMode);
          return accent === "violet" ? "purple" : accent;
        })()} />
        <div className="relative z-10 container mx-auto px-6 pb-20">
          <div className="mx-auto max-w-3xl text-center select-text">
            <div className="mb-5 inline-flex items-center gap-3 rounded-sm border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-sm bg-accent-amber" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-fg-muted/80">
                ZERO-INDEX LOCAL SEARCH
              </span>
            </div>

            <h1 className="text-4xl font-semibold leading-[1.02] tracking-tight text-fg-porcelain sm:text-5xl">
              The{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-[1.08em] font-semibold heading-gradient-amber">Google Search</span>
                <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-accent-amber/40 rounded-full blur-[1px]" />
              </span>
              <br />
              <span className="text-fg-muted">of your computer.</span>
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-fg-muted/80">
              Ask naturally, find instantly. Ixos understands{" "}
              <span className="text-accent-teal font-medium">what you mean</span>, not just what you type &mdash;
              all running{" "}
              <span className="text-accent-amber font-medium">100% locally</span> on your machine.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button
                size="lg"
                variant="ghost"
                hasParticleMagnet
                className="bg-accent-amber font-medium text-bg-graphite-0 hover:bg-accent-amber/80 hover:text-bg-graphite-0 hover:scale-[1.02] transition-transform"
                asChild
              >
                <Link href="/download">Download Desktop</Link>
              </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/docs/cli-reference#install">View CLI Install</Link>
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
              <IxosDemoWindow controlledStep={mobileStep} onModeChange={setDemoMode} />
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

  const statusText =
    activeStep === null ? "Priming the local search pipeline" : STATUS_MESSAGES[activeStep];
  const demoStyles = ACCENT_STYLES[modeToAccent(demoMode)];
  const latencyLabel =
    demoMode === "deep-search"
      ? "LATENCY < 12MS"
      : demoMode === "memory"
        ? "LATENCY < 3MS"
        : "LATENCY < 2MS";

  const CARDS: [number, string, number][] = [
    [0, "p1", 0],
    [1, "p2", 1],
    [2, "p3", 2],
    [3, "p4", 3],
    [4, "p5", 4],
  ];

  // Wrapper height creates the scroll range: section (100vh) + scroll distance.
  const wrapperHeight = isLowPowered ? "275vh" : "300vh";

  return (
        <div ref={wrapperRef} style={{ height: wrapperHeight, position: "relative" }} id="how-it-works">
      <section
        ref={sectionRef}
        className="section-hero relative h-[100dvh] w-full overflow-hidden"
        style={{ transform: "translateZ(0)", backfaceVisibility: "hidden" }}
      >
        <PageGlow color={(modeToAccent(demoMode) === "violet" ? "purple" : modeToAccent(demoMode)) as "amber" | "teal" | "purple" | "pink"} />

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-30 h-44 bg-gradient-to-b from-transparent to-bg-graphite-0" />

        <div
          ref={heroTextRef}
          className="absolute inset-x-0 top-0 z-10 flex justify-center px-6 pt-[14vh]"
          style={{ 
            willChange: "transform, opacity",
            transform: "translate3d(0, 0, 0)",
            transformStyle: "preserve-3d",
            backfaceVisibility: "hidden"
          }}
        >
          <div className="pointer-events-auto max-w-4xl text-center select-text">
            <div className="mb-5 inline-flex items-center gap-3 rounded-sm border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-sm bg-accent-amber" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-fg-muted/80">
                ZERO-INDEX LOCAL SEARCH
              </span>
            </div>

            <h1 className="text-4xl font-semibold leading-[0.98] tracking-tight text-fg-porcelain md:text-5xl lg:text-6xl">
              The{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-[1.08em] font-semibold heading-gradient-amber selection:text-accent-amber selection:bg-accent-amber/20 hover:opacity-90 transition-opacity cursor-text">Google Search</span>
                <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-accent-amber/40 rounded-full blur-[1px]" />
              </span>
              <br />
              <span className="text-fg-muted">of your computer.</span>
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-fg-muted/80">
              Ask naturally, find instantly. Ixos understands{" "}
              <span className="text-accent-teal font-medium">what you mean</span>, not just what you type &mdash;
              all running{" "}
              <span className="text-accent-amber font-medium">100% locally</span> on your machine.
            </p>

            <div className="mt-6 flex justify-center gap-3">
              <Button
                size="lg"
                variant="ghost"
                hasParticleMagnet
                className="min-w-[164px] bg-accent-amber font-medium text-bg-graphite-0 hover:bg-accent-amber/80 hover:text-bg-graphite-0 hover:scale-[1.02] transition-transform"
                asChild
              >
                <Link href="/download">Download Desktop</Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/docs/cli-reference#install">CLI Install</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 z-30 flex items-center justify-center px-4 md:px-6 pointer-events-none">
          <div
            ref={gridContainerRef}
            className="relative w-full max-w-[1420px] xl:max-w-[1620px]"
            style={{ 
              willChange: "transform",
              transform: "translate3d(0, 0, 0)",
              transformStyle: "preserve-3d",
              backfaceVisibility: "hidden"
            }}
          >
            <div
              className="relative"
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(270px, 24%) minmax(0, 1fr) minmax(270px, 24%)",
                gridTemplateRows: "clamp(132px, 14vh, 190px) minmax(260px, 1.25fr) minmax(180px, 0.75fr) clamp(108px, 12vh, 156px)",
                gridTemplateAreas: `
                  "title title title"
                  "p1 demo p2"
                  "p4 demo p3"
                  "p4 p5 p3"
                `,
                gap: "clamp(14px, 1.7vw, 24px)",
                height: "min(88vh, 1020px)",
                contain: "layout paint",
                transform: "translate3d(0, 0, 0)",
              }}
            >
              <div
                ref={headerRef}
                className="flex flex-col items-center justify-center px-1 pb-2 text-center"
                style={{ gridArea: "title", willChange: "transform, opacity", transform: "translate3d(0, 0, 0)", transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
              >
                <div className="text-[10px] font-mono uppercase tracking-[0.28em] text-accent-amber/82">
                  Engine Walkthrough
                </div>
                <h2 className="mt-2 text-4xl md:text-5xl font-semibold leading-[0.94] tracking-tight text-fg-porcelain">
                  Search Pipeline
                </h2>
                <div className="mt-3 max-w-3xl text-sm text-fg-muted/75">
                  Parse, embed, rank, wipe, and stream as one guided local-first flow.
                </div>
              </div>

              {CARDS.map(([cfgIdx, area, phaseIdx]) => (
                <div
                  key={area}
                  ref={(el) => { cardRefs.current[cfgIdx] = el; }}
                  style={{
                    gridArea: area,
                    zIndex: 35,
                    willChange: "transform, opacity",
                    contain: "layout paint",
                    transform: "translate3d(0, 0, 0)",
                    transformStyle: "preserve-3d",
                    backfaceVisibility: "hidden",
                  }}
                >
                  <PhaseTile
                    phase={PHASES[phaseIdx]}
                    isActive={activeStep === phaseIdx}
                    isComplete={activeStep !== null && activeStep > phaseIdx}
                    accentColor={PHASE_ACCENTS[phaseIdx]}
                    className="h-full"
                  >
                    {phaseDiagram(phaseIdx, activeStep === phaseIdx, activeStep !== null && activeStep > phaseIdx)}
                  </PhaseTile>
                </div>
              ))}

              <div
                className={cn(
                  "relative z-20 flex min-h-0 items-center justify-center",
                  activeStep !== null ? "pointer-events-none" : "pointer-events-auto"
                )}
                style={{ gridArea: "demo", contain: "layout paint" }}
              >
                <div
                  className={cn(
                    "relative flex h-full w-full max-w-[920px] flex-col overflow-hidden rounded-xl border bg-bg-graphite-0 shadow-2xl",
                    "transition-[border-color,box-shadow] duration-500",
                    demoStyles.borderActive,
                    demoStyles.shadow
                  )}
                  style={{
                    aspectRatio: "16 / 9",
                    maxHeight: "100%",
                    willChange: "border-color, box-shadow",
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
                    <IxosDemoWindow controlledStep={demoStep} onModeChange={setDemoMode} />
                  </div>

                  <div className="flex items-center justify-between border-t border-white/12 bg-bg-graphite-1 px-5 py-2.5 text-[11px] font-mono text-fg-muted/72">
                    <span>{statusText}</span>
                    <span className={cn("text-[10px] uppercase tracking-[0.18em]", demoStyles.label)}>
                      {latencyLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
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
  }
> = {
  amber: {
    borderActive: "border-accent-amber/55",
    shadow: "shadow-[0_0_34px_rgba(246,185,76,0.2)]",
    label: "text-accent-amber",
    glow: "bg-accent-amber/8",
  },
  teal: {
    borderActive: "border-accent-teal/55",
    shadow: "shadow-[0_0_34px_rgba(20,184,166,0.2)]",
    label: "text-accent-teal",
    glow: "bg-accent-teal/8",
  },
  violet: {
    borderActive: "border-accent-violet/55",
    shadow: "shadow-[0_0_34px_rgba(124,92,255,0.2)]",
    label: "text-accent-violet",
    glow: "bg-accent-violet/8",
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
        "relative flex min-h-0 overflow-hidden rounded-2xl border-2 bg-bg-graphite-2 transition-[border-color,box-shadow] duration-280 ease-out",
        compact ? "h-full items-start gap-5 p-6" : "grid h-full grid-rows-[auto_minmax(0,1fr)] gap-4 p-6",
        isActive
          ? cn(styles.borderActive, styles.shadow, "z-10")
          : isComplete
            ? "border-white/22"
            : "border-white/16",
        className
      )}
    >
      {/* Always rendered overlays — opacity-toggled to avoid DOM insertion layout shifts */}
      <div
        className={cn("absolute inset-0 rounded-2xl border-2 transition-opacity duration-280 pointer-events-none", styles.borderActive)}
        style={{ opacity: isActive ? 1 : 0 }}
      />
      <div
        className={cn("absolute inset-0 pointer-events-none transition-opacity duration-280", styles.glow)}
        style={{ opacity: isActive ? 1 : 0 }}
      />
      <div
        className="absolute left-4 top-4 h-2.5 w-2.5 rounded-full bg-white/70 shadow-[0_0_16px_rgba(255,255,255,0.55)] pointer-events-none transition-opacity duration-280"
        style={{ opacity: isActive ? 1 : 0 }}
      />

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
            compact ? "text-[0.92rem]" : "line-clamp-3 text-[0.96rem]"
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
          compact ? "h-[126px] w-[214px] shrink-0" : "mt-1 flex h-[clamp(120px,45%,200px)] w-full items-center"
        )}
      >
        {children}
      </div>
    </article>
  );
}
