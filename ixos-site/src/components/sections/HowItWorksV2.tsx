"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";
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
}

const PHASES: PhaseBox[] = [
  {
    id: "01",
    label: "INPUT_LAYER",
    title: "Natural Language Search",
    description: "Type exactly how you think. No query syntax required.",
  },
  {
    id: "02",
    label: "EMBED_ENGINE",
    title: "JIT Intelligence",
    description: "CPU-optimized micro-models compute embeddings on the fly.",
  },
  {
    id: "03",
    label: "RANK_ENGINE",
    title: "Semantic Scoring",
    description: "Multi-signal ranking with integrity verification.",
  },
  {
    id: "04",
    label: "PRIVACY_GUARD",
    title: "No Index Required",
    description: "Embeddings discarded after search. Zero persistence.",
  },
  {
    id: "05",
    label: "OUTPUT_STREAM",
    title: "Instant Access",
    description: "Click to open. Integrates with Explorer, Finder, terminal.",
  },
];

const STATUS_MESSAGES = [
  "Active: Natural Language Input",
  "Active: JIT Embedding Engine",
  "Active: Ranked Locally",
  "Active: Zero Persistence Mode",
  "Active: Streaming Results",
];

const GRID_CLASS =
  "grid h-[min(74vh,620px)] w-full max-w-[1180px] items-stretch grid-cols-[200px_minmax(0,1fr)_220px] grid-rows-[minmax(0,1fr)_112px] gap-x-8 gap-y-6";

function phaseDiagram(step: number, isActive: boolean, isComplete: boolean) {
  if (step === 0) return <QueryDecomposition isActive={isActive} isComplete={isComplete} />;
  if (step === 1) return <VectorSpace isActive={isActive} isComplete={isComplete} />;
  if (step === 2) return <ScoreWaterfall isActive={isActive} isComplete={isComplete} />;
  if (step === 3) return <MemoryWipe isActive={isActive} isComplete={isComplete} />;
  return <StreamWaterfall isActive={isActive} isComplete={isComplete} />;
}

export function HowItWorksV2() {
  const sectionRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reducedHandler = (event: MediaQueryListEvent) =>
      setPrefersReducedMotion(event.matches);
    const desktopHandler = () => setIsDesktop(window.innerWidth >= 1024);

    desktopHandler();
    mq.addEventListener("change", reducedHandler);
    window.addEventListener("resize", desktopHandler);
    return () => {
      mq.removeEventListener("change", reducedHandler);
      window.removeEventListener("resize", desktopHandler);
    };
  }, []);

  useEffect(() => {
    if (!sectionRef.current || !panelRef.current || !isDesktop || prefersReducedMotion) {
      setActiveStep(prefersReducedMotion ? PHASES.length - 1 : 0);
      return;
    }

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "+=340%",
        scrub: 1,
        pin: panelRef.current,
        pinSpacing: true,
        anticipatePin: 1,
        onUpdate: (self) => {
          const step = Math.min(PHASES.length - 1, Math.floor(self.progress * PHASES.length));
          setActiveStep(step);
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [isDesktop, prefersReducedMotion]);

  return (
    <section ref={sectionRef} className="section-how relative -mt-2 w-full bg-bg-graphite-0">
      <div
        ref={panelRef}
        className={cn(
          "container mx-auto flex h-screen flex-col px-6 py-4 lg:py-5",
          !isDesktop && "h-auto py-14"
        )}
      >
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-mono uppercase tracking-[0.22em] text-fg-muted/45">
              How It Works
            </p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight text-fg-porcelain md:text-4xl">
              Pipeline view, compact and live.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted/70 md:text-base">
              Scroll. The interface stays pinned while stages activate in order.
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-3 rounded-sm border border-white/10 bg-bg-graphite-1/70 px-3 py-2 text-[10px] font-mono text-fg-muted/45">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                prefersReducedMotion ? "bg-fg-muted/30" : "animate-pulse bg-accent-teal"
              )}
            />
            <span>{STATUS_MESSAGES[activeStep]}</span>
            <span className="text-accent-teal/60">
              {String(activeStep + 1).padStart(2, "0")}/05
            </span>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center">
          {isDesktop ? (
            <div className={GRID_CLASS}>
              <PhaseTile
                className="col-start-1 row-start-1"
                phase={PHASES[0]}
                isActive={activeStep === 0}
                isComplete={activeStep > 0}
              >
                {phaseDiagram(0, activeStep === 0, activeStep > 0)}
              </PhaseTile>

              <div className="col-start-2 row-start-1 min-h-0 overflow-hidden rounded-sm border border-white/10 bg-bg-graphite-0/85">
                <div className="flex h-full min-h-0 flex-col">
                  <div className="flex h-8 items-center justify-between border-b border-white/10 bg-white/5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-white/30" />
                      <div className="h-1.5 w-1.5 rounded-full bg-white/30" />
                    </div>
                    <span className="text-[9px] font-mono tracking-widest text-accent-teal/65">
                      {`// ${STEP_LABELS[activeStep] ?? "LIVE_DEMO"}`}
                    </span>
                  </div>
                  <div className="min-h-0 flex-1">
                    <IxosDemoWindow controlledStep={activeStep} />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-2 text-[10px] font-mono text-fg-muted/35">
                    <span>{STATUS_MESSAGES[activeStep]}</span>
                    <div className="flex items-center gap-3">
                      <span>Latency &lt;2ms</span>
                      <span className="text-fg-muted/20">&middot;</span>
                      <span>No persistent index</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-start-3 row-start-1 grid h-full min-h-0 grid-rows-2 gap-6">
                <PhaseTile
                  phase={PHASES[1]}
                  isActive={activeStep === 1}
                  isComplete={activeStep > 1}
                >
                  {phaseDiagram(1, activeStep === 1, activeStep > 1)}
                </PhaseTile>
                <PhaseTile
                  phase={PHASES[2]}
                  isActive={activeStep === 2}
                  isComplete={activeStep > 2}
                >
                  {phaseDiagram(2, activeStep === 2, activeStep > 2)}
                </PhaseTile>
              </div>

              <PhaseTile
                className="col-start-1 col-end-3 row-start-2"
                phase={PHASES[3]}
                isActive={activeStep === 3}
                isComplete={activeStep > 3}
                compact
              >
                {phaseDiagram(3, activeStep === 3, activeStep > 3)}
              </PhaseTile>

              <PhaseTile
                className="col-start-3 row-start-2"
                phase={PHASES[4]}
                isActive={activeStep === 4}
                isComplete={activeStep > 4}
                compact
              >
                {phaseDiagram(4, activeStep === 4, activeStep > 4)}
              </PhaseTile>
            </div>
          ) : (
            <div className="flex w-full flex-col gap-5">
              <div className="overflow-hidden rounded-sm border border-white/10 bg-bg-graphite-0/85">
                <div className="flex h-8 items-center justify-between border-b border-white/10 bg-white/5 px-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-white/30" />
                    <div className="h-1.5 w-1.5 rounded-full bg-white/30" />
                  </div>
                  <span className="text-[9px] font-mono tracking-widest text-accent-teal/65">
                    {`// ${STEP_LABELS[activeStep] ?? "LIVE_DEMO"}`}
                  </span>
                </div>
                <div className="h-[380px]">
                  <IxosDemoWindow controlledStep={activeStep} />
                </div>
              </div>

              <div className="grid gap-5">
                {PHASES.map((phase, index) => (
                  <PhaseTile
                    key={phase.id}
                    phase={phase}
                    isActive={activeStep === index}
                    isComplete={activeStep > index}
                    compact={index >= 3}
                  >
                    {phaseDiagram(index, activeStep === index, activeStep > index)}
                  </PhaseTile>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function PhaseTile({
  className,
  phase,
  isActive,
  isComplete,
  children,
  compact = false,
}: {
  className?: string;
  phase: PhaseBox;
  isActive: boolean;
  isComplete: boolean;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <article
      className={cn(
        "relative min-h-0 rounded-sm border bg-bg-graphite-2/60 p-3 transition-all duration-500",
        compact ? "flex h-full items-start gap-4" : "flex h-full flex-col",
        isActive
          ? "border-accent-teal/45 shadow-[0_0_20px_rgba(20,184,166,0.18)]"
          : isComplete
            ? "border-white/15"
            : "border-white/6 opacity-75",
        className
      )}
    >
      {isActive && (
        <>
          <div className="absolute left-0 top-0 h-2.5 w-2.5 border-l border-t border-accent-teal/50" />
          <div className="absolute bottom-0 right-0 h-2.5 w-2.5 border-b border-r border-accent-teal/50" />
        </>
      )}

      <div className={cn("min-w-0", compact ? "flex-1" : "")}>
        <span
          className={cn(
            "text-[9px] font-mono uppercase tracking-widest",
            isActive ? "text-accent-teal" : "text-fg-muted/50"
          )}
        >
          {`// ${phase.label.toUpperCase()}`}
        </span>
        <h4 className="mt-1.5 text-sm font-semibold leading-tight text-fg-porcelain">
          {phase.title}
        </h4>
        <p className="mt-1.5 text-[11px] leading-relaxed text-fg-muted/70">
          {phase.description}
        </p>
      </div>

      <div className={cn("min-h-0", compact ? "w-[128px] shrink-0" : "mt-2 flex-1")}>
        {children}
      </div>

      <div className={cn("h-1 overflow-hidden rounded-full bg-white/5", compact ? "absolute bottom-3 left-3 right-3" : "mt-3")}>
        <div
          className={cn(
            "h-full bg-accent-teal transition-all duration-500 ease-out",
            isComplete ? "w-full" : isActive ? "w-2/3" : "w-0"
          )}
        />
      </div>
    </article>
  );
}
