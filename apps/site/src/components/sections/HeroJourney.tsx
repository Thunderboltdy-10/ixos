"use client";

import Link from "next/link";
import { ArcNoiseBackground } from "@/components/effects/ArcNoiseBackground";
import { IxosDemoWindow } from "@/components/hero/IxosDemoWindow";
import { Button } from "@/components/ui/Button";

const GRID_CLASS =
  "grid w-full max-w-[1180px] min-h-0 flex-1 grid-cols-[200px_minmax(0,1fr)_220px] grid-rows-[minmax(0,1fr)_112px] gap-x-8 gap-y-6";

export function HeroJourney() {
  return (
    <section
      id="hero-journey"
      className="section-hero relative h-screen min-h-screen w-full overflow-hidden bg-bg-graphite-0"
    >
      <ArcNoiseBackground />

      <div className="pointer-events-none absolute left-1/2 top-0 z-[1] h-[340px] w-[min(1100px,94vw)] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(246,185,76,0.32)_0%,rgba(246,185,76,0.12)_38%,transparent_75%)] blur-2xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 z-[1] h-24 w-px -translate-x-1/2 bg-gradient-to-b from-accent-amber/40 to-transparent" />

      <div className="relative z-10 container mx-auto flex h-full flex-col px-6 pb-5 pt-20 md:pt-24">
        <div className="mx-auto max-w-3xl flex-none text-center">
          <div className="mb-6 inline-flex items-center gap-3 rounded-sm border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-sm">
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

          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-fg-muted/80">
            Ixos uses local-first semantic search to index and retrieve your
            files. Private, secure, and lightning fast.
          </p>

          <div className="mt-6">
            <Button
              size="lg"
              hasParticleMagnet
              className="min-w-[160px] bg-accent-amber font-medium text-bg-graphite-0 hover:bg-accent-amber/90"
              data-trace-anchor="hero-cta"
              data-trace-color="amber"
              asChild
            >
              <Link href="/sign-up">Get Started</Link>
            </Button>
          </div>
        </div>

        <div className="mt-4 flex min-h-0 justify-center">
          <div className={GRID_CLASS}>
            <GhostBlock className="col-start-1 row-start-1" />

            <div className="col-start-2 row-start-1 min-h-0 overflow-hidden rounded-sm border border-white/10 bg-bg-graphite-0/85">
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex h-8 items-center justify-between border-b border-white/10 bg-white/5 px-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-white/30" />
                    <div className="h-1.5 w-1.5 rounded-full bg-white/30" />
                  </div>
                  <span className="text-[10px] font-mono tracking-widest text-accent-amber/70">
                    //LIVE DEMO
                  </span>
                </div>
                <div className="min-h-0 flex-1">
                  <IxosDemoWindow />
                </div>
              </div>
            </div>

            <div className="col-start-3 row-start-1 grid h-full min-h-0 grid-rows-2 gap-6">
              <GhostBlock />
              <GhostBlock />
            </div>

            <GhostBlock className="col-start-1 col-end-3 row-start-2" horizontal />
            <GhostBlock className="col-start-3 row-start-2" horizontal />
          </div>
        </div>
      </div>
    </section>
  );
}

function GhostBlock({
  className,
  horizontal = false,
}: {
  className?: string;
  horizontal?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-sm border border-white/8 bg-bg-graphite-2/22",
        horizontal ? "h-full" : "h-full",
        className ?? "",
      ].join(" ")}
    />
  );
}
