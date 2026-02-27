"use client";

/**
 * LandingCore — the shared renderer powering /5 and variants /1 /2 /3.
 *
 * This component:
 * 1. Wraps the V4 shell (ambient field, loader, nav, spatial stage, footer)
 * 2. Renders all 15 sections from SECTION_MAP
 * 3. Accepts a Connector component for the "crazy factor" layer
 * 4. Provides LandingProvider context for section tracking + ripple dispatch
 * 5. Integrates section-aware ripple origins with V4AmbientField
 *
 * Usage:
 *   <LandingCore connector={KineticQueryThread} />
 *   <LandingCore connector={PipelineRibbonFlyover} />
 *   <LandingCore connector={MinimalCalibration} />
 *   <LandingCore connector={SearchResultStackConnector} />  // /5 base
 */

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

// V4 visual shell — from /5's implementation (already independent of /4)
import { V4AmbientField } from "../app/5/_v4/V4AmbientField";
import { V4Loader } from "../app/5/_v4/V4Loader";
import { V4Nav } from "../app/5/_v4/V4Nav";
import { V4SpatialStage } from "../app/5/_v4/V4SpatialStage";
import { V4ResultNode } from "../app/5/_v4/V4ResultNode";
import { V4SectionDivider } from "../app/5/_v4/V4SectionDivider";
import { V4Footer } from "../app/5/_v4/V4Footer";

// Section content components
import { V4Hero } from "../app/5/_v4/V4Hero";
import { V4FileScan } from "../app/5/_v4/V4FileScan";
import { V4Stats } from "../app/5/_v4/V4Stats";
import { V4Progressive } from "../app/5/_v4/V4Progressive";
import { V4Pipeline } from "../app/5/_v4/V4Pipeline";
import { V4Benchmarks } from "../app/5/_v4/V4Benchmarks";
import { V4ComputeBudget } from "../app/5/_v4/V4ComputeBudget";
import { V4Comparison } from "../app/5/_v4/V4Comparison";
import { V4TechBento } from "../app/5/_v4/V4TechBento";
import { V4CLI } from "../app/5/_v4/V4CLI";
import { V4AskMode } from "../app/5/_v4/V4AskMode";
import { V4LocalFirst } from "../app/5/_v4/V4LocalFirst";
import { V4ProValue } from "../app/5/_v4/V4ProValue";
import { V4Pricing } from "../app/5/_v4/V4Pricing";
import { V4CTA } from "../app/5/_v4/V4CTA";

// Context + connector system
import { LandingProvider, useLandingContext } from "./LandingContext";
import type { ConnectorComponent } from "./connectors/types";
import { SECTION_MAP } from "./SECTION_MAP";

// ─── Section wrapper — registers with context + triggers ripple on entry ──────

function TrackedResultNode({
  sectionId,
  rank,
  file,
  tone,
  title,
  children,
}: {
  sectionId: string;
  rank: string;
  file: string;
  tone: "cyan" | "amber" | "violet";
  title: string;
  children: React.ReactNode;
}) {
  const { registerSection, setSectionInView, pulseForSection } = useLandingContext();
  const ref = useRef<HTMLDivElement>(null);
  const section = SECTION_MAP.find((s) => s.id === sectionId);

  useEffect(() => {
    if (!ref.current) return;
    registerSection(sectionId, ref.current);

    const observer = new IntersectionObserver(
      ([entry]) => {
        setSectionInView(sectionId, entry.isIntersecting);
        if (entry.isIntersecting && section) {
          pulseForSection(section);
        }
      },
      { threshold: 0.2, rootMargin: "-10% 0px -20% 0px" }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [sectionId, registerSection, setSectionInView, pulseForSection, section]);

  return (
    <div ref={ref} data-section-id={sectionId}>
      <V4ResultNode sectionId={sectionId} rank={rank} file={file} tone={tone} title={title}>
        {children}
      </V4ResultNode>
    </div>
  );
}

// ─── Connector overlay ─────────────────────────────────────────────────────────

function ConnectorOverlay({ Connector }: { Connector: ConnectorComponent }) {
  const { sections, activeSectionId, pulseAt } = useLandingContext();

  return (
    <Connector
      sections={sections}
      activeSectionId={activeSectionId}
      sectionMap={SECTION_MAP}
      pulseAt={pulseAt}
    />
  );
}

// ─── Inner page (needs LandingProvider) ───────────────────────────────────────

function LandingPageInner({ Connector }: { Connector: ConnectorComponent }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <main
      data-theme="desktop"
      className="min-h-screen text-white font-mono"
      style={{ backgroundColor: "#0C0E10", overflowX: "clip" }}
    >
      {/* Background — preserved identically from /5 */}
      <V4AmbientField />

      {/* Loader */}
      <V4Loader onComplete={() => setLoaded(true)} />

      {/* Connector overlay (always mounted, handles its own visibility) */}
      <ConnectorOverlay Connector={Connector} />

      <AnimatePresence>
        {loaded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ position: "relative", zIndex: 1 }}
          >
            <V4Nav />

            <V4SpatialStage>
              <TrackedResultNode
                sectionId="hero"
                rank="01"
                file="src/ixos_rank/hybrid_engine.rs"
                tone="cyan"
                title="live search cockpit"
              >
                <V4Hero />
              </TrackedResultNode>

              <V4SectionDivider accent="dim" />

              <TrackedResultNode
                sectionId="filescan"
                rank="02"
                file="src/ixos_rank/lexical_engine.rs"
                tone="amber"
                title="filesystem sweep"
              >
                <V4FileScan />
              </TrackedResultNode>

              <V4SectionDivider accent="amber" />

              <TrackedResultNode
                sectionId="stats"
                rank="03"
                file="CLAUDE.md#benchmarks"
                tone="amber"
                title="performance cluster"
              >
                <V4Stats />
              </TrackedResultNode>

              <V4SectionDivider accent="dim" />

              <TrackedResultNode
                sectionId="progressive"
                rank="04"
                file="src/ixos_rank/progressive.rs"
                tone="violet"
                title="progressive lock"
              >
                <V4Progressive />
              </TrackedResultNode>

              <V4SectionDivider accent="violet" />

              <TrackedResultNode
                sectionId="pipeline"
                rank="05"
                file="src/ixos_rank/hybrid_engine.rs"
                tone="violet"
                title="pipeline map"
              >
                <V4Pipeline />
              </TrackedResultNode>

              <V4SectionDivider accent="dim" />

              <TrackedResultNode
                sectionId="benchmarks"
                rank="06"
                file="models/lab/CANONICAL_RESULTS.md"
                tone="cyan"
                title="bench board"
              >
                <V4Benchmarks />
              </TrackedResultNode>

              <V4SectionDivider accent="cyan" />

              <TrackedResultNode
                sectionId="compute"
                rank="07"
                file="src/ixos_rank/hybrid_engine.rs#auto"
                tone="cyan"
                title="compute map"
              >
                <V4ComputeBudget />
              </TrackedResultNode>

              <V4SectionDivider accent="dim" />

              <TrackedResultNode
                sectionId="comparison"
                rank="08"
                file="docs/product/DESKTOP_APP.md"
                tone="cyan"
                title="capability matrix"
              >
                <V4Comparison />
              </TrackedResultNode>

              <V4SectionDivider accent="cyan" />

              <TrackedResultNode
                sectionId="techbento"
                rank="09"
                file="src/storage/validator.rs"
                tone="cyan"
                title="system internals"
              >
                <V4TechBento />
              </TrackedResultNode>

              <V4SectionDivider accent="dim" />

              <TrackedResultNode
                sectionId="cli"
                rank="10"
                file="CLAUDE.md#cli"
                tone="amber"
                title="terminal commands"
              >
                <V4CLI />
              </TrackedResultNode>

              <V4SectionDivider accent="violet" />

              <TrackedResultNode
                sectionId="ask-mode"
                rank="11"
                file="src/ixos_rank/ask_mode/intent_detector.rs"
                tone="violet"
                title="ask pathway"
              >
                <V4AskMode />
              </TrackedResultNode>

              <V4SectionDivider accent="cyan" />

              <TrackedResultNode
                sectionId="local"
                rank="12"
                file="CLAUDE.md#architecture"
                tone="cyan"
                title="local privacy"
              >
                <V4LocalFirst />
              </TrackedResultNode>

              <V4SectionDivider accent="amber" />

              <TrackedResultNode
                sectionId="pro-value"
                rank="13"
                file="src/activity_ledger/mod.rs"
                tone="amber"
                title="pro loop"
              >
                <V4ProValue />
              </TrackedResultNode>

              <V4SectionDivider accent="violet" />

              <TrackedResultNode
                sectionId="pricing"
                rank="14"
                file="src/app/pricing/page.tsx"
                tone="violet"
                title="plan split"
              >
                <V4Pricing />
              </TrackedResultNode>

              <V4SectionDivider accent="cyan" />

              <TrackedResultNode
                sectionId="cta"
                rank="15"
                file="src/lib/downloads.ts"
                tone="cyan"
                title="launch deck"
              >
                <V4CTA />
              </TrackedResultNode>
            </V4SpatialStage>

            <V4Footer />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

// ─── Public export ─────────────────────────────────────────────────────────────

export interface LandingCoreProps {
  /** The connector component — determines the "crazy factor" overlay */
  connector: ConnectorComponent;
}

export function LandingCore({ connector: Connector }: LandingCoreProps) {
  return (
    <LandingProvider>
      <LandingPageInner Connector={Connector} />
    </LandingProvider>
  );
}
