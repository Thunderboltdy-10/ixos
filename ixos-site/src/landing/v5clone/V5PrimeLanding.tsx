"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { DemoSurface, type IxosView } from "../DemoSurface";
import { VARIANT_DEMO_SCENARIOS } from "../demo/landingDemoAdapter";
import { LandingProvider, useLandingContext } from "../LandingContext";
import { SECTION_MAP } from "../SECTION_MAP";
import { V4AmbientField } from "../../app/5/_v4/V4AmbientField";
import { V4Loader } from "../../app/5/_v4/V4Loader";
import { V4Nav } from "../../app/5/_v4/V4Nav";
import { V4Footer } from "../../app/5/_v4/V4Footer";
import { V4FileScan } from "../../app/5/_v4/V4FileScan";
import { V4Stats } from "../../app/5/_v4/V4Stats";
import { V4Pipeline } from "../../app/5/_v4/V4Pipeline";
import { V4Benchmarks } from "../../app/5/_v4/V4Benchmarks";
import { V4ComputeBudget } from "../../app/5/_v4/V4ComputeBudget";
import { V4Comparison } from "../../app/5/_v4/V4Comparison";
import { V4TechBento } from "../../app/5/_v4/V4TechBento";
import { V4CLI } from "../../app/5/_v4/V4CLI";
import { V4LocalFirst } from "../../app/5/_v4/V4LocalFirst";
import { V4Pricing } from "../../app/5/_v4/V4Pricing";
import { V4CTA } from "../../app/5/_v4/V4CTA";
import styles from "./V5PrimeLanding.module.css";

type VariantPreset = "v1" | "v2" | "v3";
type Tone = "cyan" | "amber" | "violet";

interface V5PrimeLandingProps {
  preset: VariantPreset;
  activeRoute: "/1" | "/2" | "/3";
  visualMode?: boolean;
}

const PRESET_THEME: Record<
  VariantPreset,
  {
    name: string;
    accentMain: string;
    accentAlt: string;
    shellBg: string;
    heroTitle: string;
    heroBody: string;
  }
> = {
  v1: {
    name: "Flow Edition",
    accentMain: "#2DD4BF",
    accentAlt: "#F59E0B",
    shellBg: "rgba(10,14,16,0.8)",
    heroTitle: "Search movement you can feel.",
    heroBody:
      "Unified desktop surfaces now drive the hero flow. Type, toggle mode, and stream results in the same shared shell as product.",
  },
  v2: {
    name: "Proof Edition",
    accentMain: "#8B5CF6",
    accentAlt: "#2DD4BF",
    shellBg: "rgba(14,12,21,0.84)",
    heroTitle: "Evidence first, motion second.",
    heroBody:
      "This variant keeps /5 energy but emphasizes source-path learning in each section with stronger thread-like transitions.",
  },
  v3: {
    name: "Quiet Edition",
    accentMain: "#F3F5F7",
    accentAlt: "#2DD4BF",
    shellBg: "rgba(12,14,18,0.74)",
    heroTitle: "Calm UI. Serious retrieval.",
    heroBody:
      "Minimal framing, cleaner rhythm, and steady microinteractions while keeping interactive shared surfaces fully available.",
  },
};

const HERO_HINTS = [
  "Type your own query",
  "Switch Flash / Auto / Pro",
  "Inspect why-matched context",
];

const PROGRESSIVE_STAGES = [
  {
    id: "scan",
    label: "Local Scan",
    query: "authentication token refresh",
    mode: "flash" as const,
    detail: "A fast lexical pass emits candidates immediately.",
  },
  {
    id: "rerank",
    label: "Semantic Rerank",
    query: "where is token ttl handled",
    mode: "pro" as const,
    detail: "Intent-aligned files rise as embeddings settle.",
  },
  {
    id: "lock",
    label: "Evidence Lock",
    query: "refresh token implementation",
    mode: "auto" as const,
    detail: "Ranking stabilizes and why-matched context stays visible.",
  },
];

const ASK_PATTERNS = [
  {
    id: "jwt",
    query: "Which middleware refreshes JWT tokens and where is TTL handled?",
    source: "middleware/jwt.ts",
    note: "Refresh call and expiry write-back are cited in one place.",
  },
  {
    id: "session",
    query: "How does session expiration normalization work?",
    source: "auth/session.ts",
    note: "Session lifecycle policy is surfaced with surrounding context.",
  },
  {
    id: "tokens",
    query: "Where do token helpers mint and validate signatures?",
    source: "lib/tokens.ts",
    note: "Helpers and signature checks remain inspectable.",
  },
];

function cls(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

function toneColor(tone: Tone): string {
  if (tone === "amber") return "#F59E0B";
  if (tone === "violet") return "#7C3AED";
  return "#2DD4BF";
}

function pulseAtCenter(node: HTMLElement, intensity = 0.28) {
  const rect = node.getBoundingClientRect();
  window.dispatchEvent(
    new CustomEvent("v4:pulse", {
      detail: {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        intensity,
      },
    })
  );
}

function FlatSpatialStage({ children }: { children: ReactNode }) {
  return <div className={styles.flatStage}>{children}</div>;
}

function SideDivider({ accent, side }: { accent: Tone | "dim"; side: "left" | "right" }) {
  return (
    <div className={styles.divider} data-side={side} data-accent={accent}>
      <span className={styles.dividerSpark} />
    </div>
  );
}

function TrackedSideNode({
  sectionId,
  rank,
  file,
  tone,
  title,
  index,
  children,
}: {
  sectionId: string;
  rank: string;
  file: string;
  tone: Tone;
  title: string;
  index: number;
  children: ReactNode;
}) {
  const { registerSection, setSectionInView, pulseForSection } = useLandingContext();
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const section = SECTION_MAP.find((entry) => entry.id === sectionId);
  const color = toneColor(tone);
  const fromRight = index % 2 === 0;

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    registerSection(sectionId, node);

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setInView(visible);
        setSectionInView(sectionId, visible);
        if (visible) {
          if (section) {
            pulseForSection(section);
          } else {
            pulseAtCenter(node, 0.24);
          }
        }
      },
      { threshold: 0.26, rootMargin: "-8% 0px -20% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [pulseForSection, registerSection, section, sectionId, setSectionInView]);

  return (
    <section
      ref={ref}
      data-section-id={sectionId}
      className={styles.nodeWrap}
      data-active={inView ? "1" : "0"}
      data-tone={tone}
    >
      <motion.aside
        className={styles.marker}
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0.45, y: 6 }}
        transition={{ duration: 0.32 }}
      >
        <span className={styles.markerRank} style={{ color }}>
          {rank}
        </span>
        <span className={styles.markerFile}>{file}</span>
        <span className={styles.markerTitle}>{title}</span>
      </motion.aside>

      <motion.div
        className={styles.nodeContent}
        initial={{ opacity: 0, x: fromRight ? 28 : -28, y: 16 }}
        animate={inView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0.8, x: 0, y: 0 }}
        transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </section>
  );
}

function SurfaceHost({ children }: { children: ReactNode }) {
  return <div className={styles.surfaceHost}>{children}</div>;
}

function UnifiedHero({
  preset,
  activeRoute,
  visualMode,
}: {
  preset: VariantPreset;
  activeRoute: "/1" | "/2" | "/3";
  visualMode: boolean;
}) {
  const scenarioKey = activeRoute.replace("/", "") as "1" | "2" | "3";
  const scenarios = VARIANT_DEMO_SCENARIOS[scenarioKey];
  const [scenarioId, setScenarioId] = useState(scenarios[0].id);
  const [runNonce, setRunNonce] = useState(0);

  const scenario = scenarios.find((entry) => entry.id === scenarioId) ?? scenarios[0];
  const heroLayoutClass =
    preset === "v2"
      ? styles.heroProof
      : preset === "v3"
      ? styles.heroQuiet
      : styles.heroFlow;

  return (
    <div id="hero" className={cls(styles.heroSection, heroLayoutClass)}>
      <div className={styles.textShield}>
        <p className={styles.heroEyebrow}>{PRESET_THEME[preset].name}</p>
        <h1 className={styles.heroTitle}>{PRESET_THEME[preset].heroTitle}</h1>
        <p className={styles.heroBody}>{PRESET_THEME[preset].heroBody}</p>

        <div className={styles.heroActions}>
          <Link href="/download" className={styles.primaryCta}>
            Download
          </Link>
          <Link href="/docs/cli-reference" className={styles.secondaryCta}>
            CLI Docs
          </Link>
        </div>

        <div className={styles.hintRow}>
          {HERO_HINTS.map((hint) => (
            <span key={hint} className={styles.hintPill}>
              {hint}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.heroDemoBlock}>
        <div className={styles.scenarioRow}>
          {scenarios.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={`${styles.scenarioButton} ${entry.id === scenario.id ? styles.scenarioButtonActive : ""}`}
              onClick={(event) => {
                setScenarioId(entry.id);
                setRunNonce((count) => count + 1);
                pulseAtCenter(event.currentTarget, 0.2);
              }}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <SurfaceHost>
          <DemoSurface
            key={`${scenario.id}-${runNonce}`}
            className={styles.heroSurface}
            initialView={scenario.view}
            initialQuery={scenario.query}
            initialMode={scenario.mode}
            autoRun={!visualMode}
          />
        </SurfaceHost>
      </div>
    </div>
  );
}

function UnifiedProgressive({
  visualMode,
  preset,
}: {
  visualMode: boolean;
  preset: VariantPreset;
}) {
  const [stageId, setStageId] = useState(PROGRESSIVE_STAGES[0].id);
  const stage = PROGRESSIVE_STAGES.find((entry) => entry.id === stageId) ?? PROGRESSIVE_STAGES[0];

  return (
    <section
      id="progressive"
      className={cls(
        styles.sharedSection,
        preset === "v2" ? styles.sharedProof : "",
        preset === "v3" ? styles.sharedQuiet : styles.sharedFlow
      )}
    >
      <div className={styles.textShield}>
        <p className={styles.sectionKicker}>Progressive Retrieval</p>
        <h2 className={styles.sectionTitle}>One stage at a time, no hidden transitions.</h2>
        <p className={styles.sectionBody}>{stage.detail}</p>

        <div className={styles.stageList}>
          {PROGRESSIVE_STAGES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={`${styles.stageButton} ${entry.id === stage.id ? styles.stageButtonActive : ""}`}
              onClick={(event) => {
                setStageId(entry.id);
                pulseAtCenter(event.currentTarget, 0.2);
              }}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      <SurfaceHost>
        <DemoSurface
          key={stage.id}
          className={styles.sectionSurface}
          initialView="search"
          initialQuery={stage.query}
          initialMode={stage.mode}
          autoRun={!visualMode}
          viewOverride="search"
        />
      </SurfaceHost>
    </section>
  );
}

function UnifiedAsk({
  visualMode,
  preset,
}: {
  visualMode: boolean;
  preset: VariantPreset;
}) {
  const [activeId, setActiveId] = useState(ASK_PATTERNS[0].id);
  const active = ASK_PATTERNS.find((entry) => entry.id === activeId) ?? ASK_PATTERNS[0];

  return (
    <section
      id="ask-mode"
      className={cls(
        styles.sharedSection,
        preset === "v2" ? styles.sharedProofReverse : "",
        preset === "v3" ? styles.sharedQuiet : styles.sharedFlow
      )}
    >
      <div className={styles.textShield}>
        <p className={styles.sectionKicker}>Ask Mode</p>
        <h2 className={styles.sectionTitle}>Ask in plain language, review cited paths.</h2>
        <p className={styles.sectionBody}>
          Pick a prompt or type your own inside the shared search surface. Each prompt teaches one thing:
          answerable retrieval must stay inspectable.
        </p>

        <div className={styles.stageList}>
          {ASK_PATTERNS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={`${styles.stageButton} ${entry.id === active.id ? styles.stageButtonActive : ""}`}
              onClick={(event) => {
                setActiveId(entry.id);
                pulseAtCenter(event.currentTarget, 0.2);
              }}
            >
              {entry.source}
            </button>
          ))}
        </div>

        <div className={styles.proofBox}>
          <p className={styles.proofLabel}>Evidence Hint</p>
          <p className={styles.proofCopy}>{active.note}</p>
        </div>
      </div>

      <SurfaceHost>
        <DemoSurface
          key={active.id}
          className={styles.sectionSurface}
          initialView="search"
          initialQuery={active.query}
          initialMode="auto"
          autoRun={!visualMode}
          viewOverride="search"
        />
      </SurfaceHost>
    </section>
  );
}

function UnifiedProLoop({ preset }: { preset: VariantPreset }) {
  const [view, setView] = useState<IxosView>("today");

  return (
    <section
      id="pro-value"
      className={cls(
        styles.sharedSection,
        preset === "v2" ? styles.sharedProof : "",
        preset === "v3" ? styles.sharedQuiet : styles.sharedFlow
      )}
    >
      <div className={styles.textShield}>
        <p className={styles.sectionKicker}>Pro Workflow Loop</p>
        <h2 className={styles.sectionTitle}>Today and Workstreams keep momentum intact.</h2>
        <p className={styles.sectionBody}>
          Resume context, switch to clustered threads, then jump back into search without rebuilding state.
        </p>

        <div className={styles.stageList}>
          <button
            type="button"
            className={`${styles.stageButton} ${view === "today" ? styles.stageButtonActive : ""}`}
            onClick={() => setView("today")}
          >
            Today
          </button>
          <button
            type="button"
            className={`${styles.stageButton} ${view === "workstreams" ? styles.stageButtonActive : ""}`}
            onClick={() => setView("workstreams")}
          >
            Workstreams
          </button>
          <button
            type="button"
            className={`${styles.stageButton} ${view === "search" ? styles.stageButtonActive : ""}`}
            onClick={() => setView("search")}
          >
            Search
          </button>
        </div>
      </div>

      <SurfaceHost>
        <DemoSurface
          className={styles.sectionSurface}
          initialView="today"
          initialQuery="workstream session recovery"
          initialMode="auto"
          autoRun={false}
          viewOverride={view}
        />
      </SurfaceHost>
    </section>
  );
}

function PrimeLandingInner({ preset, activeRoute, visualMode = false }: V5PrimeLandingProps) {
  const [loaded, setLoaded] = useState(visualMode);

  useEffect(() => {
    if (visualMode) {
      setLoaded(true);
    }
  }, [visualMode]);

  return (
    <main
      className={styles.page}
      data-preset={preset}
      style={
        {
          "--v-accent-main": PRESET_THEME[preset].accentMain,
          "--v-accent-alt": PRESET_THEME[preset].accentAlt,
          "--v-shell-bg": PRESET_THEME[preset].shellBg,
        } as CSSProperties
      }
    >
      <V4AmbientField />
      <div className={styles.overlay} aria-hidden />

      {!visualMode ? <V4Loader onComplete={() => setLoaded(true)} /> : null}

      <AnimatePresence>
        {loaded ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45, ease: "easeOut" }}>
            <V4Nav />

            <FlatSpatialStage>
              <TrackedSideNode
                sectionId="hero"
                rank="01"
                file="src/landing/DemoSurface.tsx"
                tone="cyan"
                title="unified search surface"
                index={1}
              >
                <UnifiedHero preset={preset} activeRoute={activeRoute} visualMode={visualMode} />
              </TrackedSideNode>

              <SideDivider accent="dim" side="right" />

              <TrackedSideNode
                sectionId="filescan"
                rank="02"
                file="src/ixos_rank/lexical_engine.rs"
                tone="amber"
                title="filesystem sweep"
                index={2}
              >
                <V4FileScan />
              </TrackedSideNode>

              <SideDivider accent="amber" side="left" />

              <TrackedSideNode
                sectionId="stats"
                rank="03"
                file="CLAUDE.md#benchmarks"
                tone="amber"
                title="performance cluster"
                index={3}
              >
                <V4Stats />
              </TrackedSideNode>

              <SideDivider accent="dim" side="right" />

              <TrackedSideNode
                sectionId="progressive"
                rank="04"
                file="src/landing/DemoSurface.tsx"
                tone="violet"
                title="progressive lock"
                index={4}
              >
                <UnifiedProgressive visualMode={visualMode} preset={preset} />
              </TrackedSideNode>

              <SideDivider accent="violet" side="left" />

              <TrackedSideNode
                sectionId="pipeline"
                rank="05"
                file="src/ixos_rank/hybrid_engine.rs"
                tone="violet"
                title="pipeline map"
                index={5}
              >
                <V4Pipeline />
              </TrackedSideNode>

              <SideDivider accent="dim" side="right" />

              <TrackedSideNode
                sectionId="benchmarks"
                rank="06"
                file="models/lab/CANONICAL_RESULTS.md"
                tone="cyan"
                title="bench board"
                index={6}
              >
                <V4Benchmarks />
              </TrackedSideNode>

              <SideDivider accent="cyan" side="left" />

              <TrackedSideNode
                sectionId="compute"
                rank="07"
                file="src/ixos_rank/hybrid_engine.rs#auto"
                tone="cyan"
                title="compute map"
                index={7}
              >
                <V4ComputeBudget />
              </TrackedSideNode>

              <SideDivider accent="dim" side="right" />

              <TrackedSideNode
                sectionId="comparison"
                rank="08"
                file="docs/product/DESKTOP_APP.md"
                tone="cyan"
                title="capability matrix"
                index={8}
              >
                <V4Comparison />
              </TrackedSideNode>

              <SideDivider accent="cyan" side="left" />

              <TrackedSideNode
                sectionId="techbento"
                rank="09"
                file="src/storage/validator.rs"
                tone="cyan"
                title="system internals"
                index={9}
              >
                <V4TechBento />
              </TrackedSideNode>

              <SideDivider accent="dim" side="right" />

              <TrackedSideNode
                sectionId="cli"
                rank="10"
                file="CLAUDE.md#cli"
                tone="amber"
                title="terminal commands"
                index={10}
              >
                <V4CLI />
              </TrackedSideNode>

              <SideDivider accent="violet" side="left" />

              <TrackedSideNode
                sectionId="ask-mode"
                rank="11"
                file="src/landing/DemoSurface.tsx"
                tone="violet"
                title="ask pathway"
                index={11}
              >
                <UnifiedAsk visualMode={visualMode} preset={preset} />
              </TrackedSideNode>

              <SideDivider accent="cyan" side="right" />

              <TrackedSideNode
                sectionId="local"
                rank="12"
                file="CLAUDE.md#architecture"
                tone="cyan"
                title="local privacy"
                index={12}
              >
                <V4LocalFirst />
              </TrackedSideNode>

              <SideDivider accent="amber" side="left" />

              <TrackedSideNode
                sectionId="pro-value"
                rank="13"
                file="src/activity_ledger/mod.rs"
                tone="amber"
                title="pro loop"
                index={13}
              >
                <UnifiedProLoop preset={preset} />
              </TrackedSideNode>

              <SideDivider accent="violet" side="right" />

              <TrackedSideNode
                sectionId="pricing"
                rank="14"
                file="src/app/pricing/page.tsx"
                tone="violet"
                title="plan split"
                index={14}
              >
                <V4Pricing />
              </TrackedSideNode>

              <SideDivider accent="cyan" side="left" />

              <TrackedSideNode
                sectionId="cta"
                rank="15"
                file="src/lib/downloads.ts"
                tone="cyan"
                title="launch deck"
                index={15}
              >
                <V4CTA />
              </TrackedSideNode>
            </FlatSpatialStage>

            <V4Footer />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

export function V5PrimeLanding(props: V5PrimeLandingProps) {
  return (
    <LandingProvider>
      <PrimeLandingInner {...props} />
    </LandingProvider>
  );
}
