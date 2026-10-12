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

import * as React from "react";
const { useState, useEffect, useRef } = React;
import { AnimatePresence, motion } from "framer-motion";

// V4 visual shell — from /5's implementation (already independent of /4)
import { V4AmbientField } from "../app/5/_v4/V4AmbientField";
import { V4Loader } from "../app/5/_v4/V4Loader";
import { V4Nav } from "../app/5/_v4/V4Nav";
import { V4SpatialStage } from "../app/5/_v4/V4SpatialStage";
import { V4ResultNode } from "../app/5/_v4/V4ResultNode";
import { V4SectionDivider } from "../app/5/_v4/V4SectionDivider";
import { V4Footer } from "../app/5/_v4/V4Footer";
import { ResultDivider } from "@/components/ui/ResultDivider";

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
import { V4OpenSource } from "../app/5/_v4/V4OpenSource";
import { V4CTA } from "../app/5/_v4/V4CTA";

// Context + connector system
import { LandingProvider, useLandingContext } from "./LandingContext";
import type { ConnectorComponent } from "./connectors/types";
import { SECTION_MAP } from "./SECTION_MAP";

// ─── Section wrapper — registers with context + triggers ripple on entry ──────

interface TrackedResultNodeProps {
  index: number;
  sectionId: string;
  rank: string;
  file: string;
  tone: any;
  title: string;
  children: React.ReactNode;
  isRevealed?: boolean;
}

function TrackedResultNode({
  index,
  sectionId,
  rank,
  file,
  tone,
  title,
  children,
  isRevealed = false,
}: TrackedResultNodeProps) {
  const { registerSection, setSectionInView, pulseForSection, maxRevealedIndex, revealNextSection } = useLandingContext();
  const ref = useRef<HTMLDivElement>(null);
  const section = SECTION_MAP.find((s) => s.id === sectionId);
  const [isVisible, setIsVisible] = useState(false);

  // Registration is a one-time stable operation per ID
  useEffect(() => {
    if (!ref.current) return;
    registerSection(sectionId, ref.current);
  }, [sectionId, registerSection]);

  // Observer logic depends on current reveal state
  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        setSectionInView(sectionId, entry.isIntersecting);

        if (entry.isIntersecting && section) {
          pulseForSection(section);

          // If this is the next section to reveal (the divider), reveal it!
          // We trigger when it's entering from bottom
          if (index === maxRevealedIndex + 1) {
            revealNextSection();
          }
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px 0px 0px" }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [sectionId, setSectionInView, pulseForSection, section, index, maxRevealedIndex, revealNextSection]);

  // IMPORTANT: The section only EXPANDS if its index is <= maxRevealedIndex
  // If index === maxRevealedIndex + 1, it's the "waiting" section (only divider shown)
  const expanded = index <= maxRevealedIndex;

  // Track previous expanded state to trigger animation
  const wasExpanded = useRef(expanded);
  const [justRevealed, setJustRevealed] = useState(false);

  useEffect(() => {
    if (expanded && !wasExpanded.current) {
      setJustRevealed(true);
      const t = setTimeout(() => setJustRevealed(false), 600);
      return () => clearTimeout(t);
    }
    wasExpanded.current = expanded;
  }, [expanded]);

  // Don't render if it's too far down the pipeline
  if (index > maxRevealedIndex + 1) return null;

  return (
    <div
      ref={ref}
      data-section-id={sectionId}
      className="relative transition-all duration-300"
      style={{
        opacity: isVisible ? 1 : (expanded ? 1 : 0.6),
        borderLeft: justRevealed ? '2px solid rgba(246,185,76,0.8)' : '2px solid transparent',
        transition: 'opacity 0.8s ease-in-out, border-color 0.2s ease-out',
      }}
    >
      {justRevealed && (
        <motion.div
          initial={{ top: 0, opacity: 0.6 }}
          animate={{ top: "100%", opacity: 0 }}
          transition={{ duration: 0.6, ease: "linear" }}
          className="absolute left-0 right-0 h-1 bg-amber-400 z-50 pointer-events-none"
        />
      )}
      <V4ResultNode
        rank={rank}
        file={file}
        tone={tone}
        title={title}
        sectionId={sectionId}
        isRevealed={expanded}
      >
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
  const { maxRevealedIndex, revealNextSection } = useLandingContext();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (maxRevealedIndex === 0) {
        revealNextSection();
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [maxRevealedIndex, revealNextSection]);

  return (
    <>
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
            <V4SpatialStage>
              {/* Section 0: Hero (always index 0) */}
              <TrackedResultNode
                index={0}
                sectionId="hero"
                rank="01"
                file="src/ixos_rank/hybrid_engine.rs"
                tone="cyan"
                title="live search cockpit"
              >
                <V4Hero />
              </TrackedResultNode>

              {/* Sequential Sections */}
              {[
                { id: "filescan", rank: "02", file: "src/ixos_rank/lexical_engine.rs", tone: "amber", title: "filesystem sweep", content: <V4FileScan />, accent: "dim" },
                { id: "stats", rank: "03", file: "CLAUDE.md#benchmarks", tone: "amber", title: "performance cluster", content: <V4Stats />, accent: "amber" },
                { id: "progressive", rank: "04", file: "src/ixos_rank/progressive.rs", tone: "violet", title: "progressive lock", content: <V4Progressive />, accent: "dim" },
                { id: "pipeline", rank: "05", file: "src/ixos_rank/hybrid_engine.rs", tone: "violet", title: "pipeline map", content: <V4Pipeline />, accent: "violet" },
                { id: "benchmarks", rank: "06", file: "models/lab/CANONICAL_RESULTS.md", tone: "cyan", title: "bench board", content: <V4Benchmarks />, accent: "dim" },
                { id: "compute", rank: "07", file: "src/ixos_rank/hybrid_engine.rs#auto", tone: "cyan", title: "compute map", content: <V4ComputeBudget />, accent: "cyan" },
                { id: "comparison", rank: "08", file: "docs/product/DESKTOP_APP.md", tone: "cyan", title: "capability matrix", content: <V4Comparison />, accent: "dim" },
                { id: "techbento", rank: "09", file: "src/storage/validator.rs", tone: "cyan", title: "system internals", content: <V4TechBento />, accent: "cyan" },
              ].map((s, i) => {
                const globalIndex = i + 1;
                // Only render if it's already revealed OR it's the very next one to be revealed (as a divider)
                if (globalIndex > maxRevealedIndex + 1) return null;

                return (
                  <React.Fragment key={s.id}>
                    {globalIndex <= maxRevealedIndex + 1 && <V4SectionDivider accent={s.accent as any} />}
                    <TrackedResultNode
                      index={globalIndex}
                      sectionId={s.id}
                      rank={s.rank}
                      file={s.file}
                      tone={s.tone as any}
                      title={s.title}
                      isRevealed={maxRevealedIndex >= globalIndex}
                    >
                      {s.content}
                    </TrackedResultNode>

                    {/* Cinematic Dividers for Director's Cut vibe */}
                    {s.id === "pipeline" && maxRevealedIndex >= globalIndex && (
                      <ResultDivider
                        query="pipeline latency audit"
                        resultTitle="Core Ranking Pipeline"
                        resultPath="src/ixos_rank/hybrid_engine.rs"
                        resultSnippet="Stage 1: Rayon-parallelized Lexical Scan. Stage 2: Model2Vec Semantic Reranking. Stage 3: Deterministic Evidence Locking."
                        score={98}
                        accentColor="#2DD4BF"
                        variant="5"
                      />
                    )}

                    {s.id === "comparison" && maxRevealedIndex >= globalIndex && (
                      <ResultDivider
                        query="system architecture integrity"
                        resultTitle="Technical Capability Matrix"
                        resultPath="docs/ARCHITECTURE.md"
                        resultSnippet="Verified sub-second response times across 10k+ files. Hybrid engine maintains 0.92 MRR@10 while staying 100% local."
                        score={95}
                        accentColor="#2DD4BF"
                        variant="5"
                      />
                    )}
                  </React.Fragment>
                );
              })}

              {/* Scroll Buffer: Ensures the next divider is always reachable/scrollable even when collapsed */}
              <div aria-hidden style={{ height: '100vh', pointerEvents: 'none' }} />

              <TrackedResultNode
                index={9}
                sectionId="cli"
                rank="10"
                file="CLAUDE.md#cli"
                tone="amber"
                title="terminal commands"
                isRevealed={maxRevealedIndex >= 9}
              >
                <V4CLI />
              </TrackedResultNode>

              {maxRevealedIndex >= 10 && <V4SectionDivider accent="violet" />}

              <TrackedResultNode
                index={10}
                sectionId="ask-mode"
                rank="11"
                file="src/ixos_rank/ask_mode/intent_detector.rs"
                tone="violet"
                title="ask pathway"
                isRevealed={maxRevealedIndex >= 10}
              >
                <V4AskMode />
              </TrackedResultNode>

              {maxRevealedIndex >= 11 && <V4SectionDivider accent="cyan" />}

              <TrackedResultNode
                index={11}
                sectionId="local-first"
                rank="12"
                file="src/storage/local_first.rs"
                tone="cyan"
                title="edge sync"
                isRevealed={maxRevealedIndex >= 11}
              >
                <V4LocalFirst />
              </TrackedResultNode>

              {maxRevealedIndex >= 12 && <V4SectionDivider accent="cyan" />}

              <TrackedResultNode
                index={12}
                sectionId="pro"
                rank="13"
                file="docs/plans/pro.rs"
                tone="cyan"
                title="pro surface"
                isRevealed={maxRevealedIndex >= 12}
              >
                <V4ProValue />
              </TrackedResultNode>

              {maxRevealedIndex >= 13 && <V4SectionDivider accent="cyan" />}

              <TrackedResultNode
                index={13}
                sectionId="open-source"
                rank="14"
                file="docs/FEATURES.md"
                tone="cyan"
                title="free local access"
                isRevealed={maxRevealedIndex >= 13}
              >
                <V4OpenSource />
              </TrackedResultNode>

              {maxRevealedIndex >= 14 && <V4SectionDivider accent="cyan" />}

              <TrackedResultNode
                index={14}
                sectionId="cta"
                rank="15"
                file="git checkout -b IXOS_PROTOCOL"
                tone="cyan"
                title="deployment"
                isRevealed={maxRevealedIndex >= 14}
              >
                <V4CTA />
              </TrackedResultNode>
            </V4SpatialStage>

            <V4Footer />
          </motion.div>
        )}
      </AnimatePresence>
    </>
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
