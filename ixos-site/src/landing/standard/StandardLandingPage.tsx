"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { V4AmbientField } from "../../app/5/_v4/V4AmbientField";
import { DemoSurface, type IxosView } from "../DemoSurface";
import { VARIANT_DEMO_SCENARIOS } from "../demo/landingDemoAdapter";
import styles from "./StandardLandingPage.module.css";

type VariantPreset = "editorial" | "cinematic" | "quiet";

type RouteId = "/1" | "/2" | "/3";

type SectionId =
  | "hero"
  | "trust"
  | "speed"
  | "accuracy"
  | "privacy"
  | "pipeline"
  | "workflow"
  | "cli"
  | "proof"
  | "cta";

interface StandardLandingPageProps {
  preset: VariantPreset;
  activeRoute: RouteId;
  visualMode?: boolean;
}

interface AccuracyClaim {
  id: string;
  title: string;
  body: string;
  files: string[];
  proof: string[];
}

interface PipelineStep {
  id: string;
  stage: string;
  label: string;
  detail: string;
  region: {
    left: string;
    top: string;
    width: string;
    height: string;
  };
}

interface ProofItem {
  id: string;
  label: string;
  source: string;
  bullets: string[];
}

interface SectionMeta {
  id: SectionId;
  short: string;
  title: string;
}

const SECTION_META: SectionMeta[] = [
  { id: "hero", short: "01", title: "Hero" },
  { id: "trust", short: "02", title: "Trust" },
  { id: "speed", short: "03", title: "Speed" },
  { id: "accuracy", short: "04", title: "Accuracy" },
  { id: "privacy", short: "05", title: "Privacy" },
  { id: "pipeline", short: "06", title: "Pipeline" },
  { id: "workflow", short: "07", title: "Workflow" },
  { id: "cli", short: "08", title: "CLI" },
  { id: "proof", short: "09", title: "Proof" },
  { id: "cta", short: "10", title: "CTA" },
];

const SECTION_IDS = SECTION_META.map((section) => section.id);

const PRESET_COPY: Record<
  VariantPreset,
  {
    name: string;
    heroKicker: string;
    headline: string;
    subhead: string;
  }
> = {
  editorial: {
    name: "Ripple Foundry",
    heroKicker: "Editorial Premium",
    headline: "Search that materializes from the field.",
    subhead:
      "Ixos keeps search local, progressive, and source-grounded. Ripples trigger each section so product proof appears from the same signal layer.",
  },
  cinematic: {
    name: "Evidence Loom",
    heroKicker: "Cinematic Instrumentation",
    headline: "Precision signals, threaded into proof.",
    subhead:
      "Every claim is wired to a source badge, every transition behaves like an instrument panel, and the same shared desktop surface stays in control.",
  },
  quiet: {
    name: "Quiet Luxury Cockpit",
    heroKicker: "Quiet Luxury",
    headline: "Calm interface. Exacting behavior.",
    subhead:
      "The page is restrained, the interactions are deliberate, and every state change feels tactile while staying minimal and legible.",
  },
};

const TRUST_ITEMS = [
  "Local-first execution on your device",
  "No telemetry in core search flow",
  "Offline-capable after install",
  "Desktop + landing share one UI surface",
];

const TRUST_BADGES = ["macOS", "Windows", "Linux", "Local", "Offline"];

const SPEED_CARDS = [
  {
    id: "candidates",
    title: "Instant candidates",
    body: "Fast lexical scanning returns useful options immediately while deeper ranking continues.",
    meter: "76%",
    note: "TTFR-biased",
  },
  {
    id: "stream",
    title: "Progressive stream",
    body: "Result rows stream in stages so users can move before a full pass is complete.",
    meter: "69%",
    note: "Stage visible",
  },
  {
    id: "cache",
    title: "Cache hits",
    body: "Reusable context and prior signals reduce repeated work in familiar query neighborhoods.",
    meter: "63%",
    note: "Warm-path",
  },
];

const ACCURACY_CLAIMS: AccuracyClaim[] = [
  {
    id: "claim-1",
    title: "Rows retain why-matched context",
    body: "Search rows surface rationale snippets and source paths directly in the result experience.",
    files: [
      "packages/ixos-ui/src/components/SearchSurface.tsx",
      "ixos-site/src/landing/DemoSurface.tsx",
    ],
    proof: [
      "Result rows include title, path, snippet, and confidence state.",
      "Selection keeps rationale visible while stages update.",
      "No synthetic chart is required to explain match quality.",
    ],
  },
  {
    id: "claim-2",
    title: "Pipeline states are explicit",
    body: "SCANNING, RERANKING, and LOCKED states stream in sequence and remain inspectable.",
    files: [
      "packages/ixos-ui/src/adapters/demo.ts",
      "ixos-site/src/landing/demo/landingDemoAdapter.ts",
    ],
    proof: [
      "Progress events update stage labels with deterministic order.",
      "Mode toggles can rerun the same query through alternate paths.",
      "Pipeline stats update in lockstep with streamed rows.",
    ],
  },
  {
    id: "claim-3",
    title: "Transparency uses file-level references",
    body: "Landing proof sections attach claims to concrete repo paths instead of decorative metrics.",
    files: ["models/lab/CANONICAL_RESULTS.md", "reports/V2_FINAL_WRITEUP.md"],
    proof: [
      "Proof drawer displays file badges as primary anchors.",
      "References are shown as paths, not invented benchmark numbers.",
      "Transparency section remains source-first and reviewable.",
    ],
  },
];

const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: "scan",
    stage: "Step 01",
    label: "Scan candidate files",
    detail: "Fast file-system sweep identifies likely paths and token neighborhoods.",
    region: { left: "34%", top: "17%", width: "58%", height: "13%" },
  },
  {
    id: "lexical",
    stage: "Step 02",
    label: "Lexical ranking",
    detail: "Exact and near matches are scored before semantic ranking refines intent.",
    region: { left: "34%", top: "33%", width: "58%", height: "20%" },
  },
  {
    id: "semantic",
    stage: "Step 03",
    label: "Semantic rerank",
    detail: "Embedding similarity resolves ambiguous phrasing and related terminology.",
    region: { left: "34%", top: "55%", width: "58%", height: "20%" },
  },
  {
    id: "lock",
    stage: "Step 04",
    label: "Evidence lock",
    detail: "Locked stage stabilizes top results with rationale and path context still visible.",
    region: { left: "66%", top: "22%", width: "24%", height: "56%" },
  },
];

const CLI_COMMANDS = ["cargo build --release", "cargo test", "npm run tauri:dev"];

const PROOF_ITEMS: ProofItem[] = [
  {
    id: "proof-rank",
    label: "Ranking core",
    source: "src/ixos_rank/hybrid_engine.rs",
    bullets: [
      "Hybrid scoring combines lexical and semantic signals.",
      "Stage output supports progressive delivery.",
      "Search explanation remains path-addressable.",
    ],
  },
  {
    id: "proof-progressive",
    label: "Progressive search",
    source: "src/ixos_rank/progressive.rs",
    bullets: [
      "Streaming events expose stage transitions.",
      "Fast first-pass candidates reduce idle wait.",
      "Pipeline and results stay synchronized.",
    ],
  },
  {
    id: "proof-bench",
    label: "Bench references",
    source: "reports/V2_FINAL_WRITEUP.md",
    bullets: [
      "Bench details are published under reports/.",
      "Results can be cross-checked in repo artifacts.",
      "Landing avoids fabricated headline numbers.",
    ],
  },
];

const FAQ_ITEMS = [
  {
    id: "faq-1",
    q: "Can Ixos run without cloud indexing?",
    a: "Yes. Core search is local-first and designed to remain useful offline after installation.",
  },
  {
    id: "faq-2",
    q: "Is the landing demo separate from desktop UI?",
    a: "No. Landing routes use the shared Search, Today, and Workstreams surfaces from @ixos/ixos-ui.",
  },
  {
    id: "faq-3",
    q: "Where do proof references come from?",
    a: "Transparency sections cite repository files directly, including reports and canonical result docs.",
  },
];

function emitRipple(x: number, y: number, intensity = 0.3) {
  window.dispatchEvent(
    new CustomEvent("v4:pulse", {
      detail: { x, y, intensity },
    })
  );
}

function getSectionCenter(node: HTMLElement) {
  const rect = node.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    xPct: `${((rect.left + rect.width / 2) / window.innerWidth) * 100}%`,
    yPct: `${((rect.top + rect.height / 2) / window.innerHeight) * 100}%`,
  };
}

function styleForOrigin(origin?: { xPct: string; yPct: string }): CSSProperties | undefined {
  if (!origin) {
    return undefined;
  }

  return {
    ["--reveal-x" as string]: origin.xPct,
    ["--reveal-y" as string]: origin.yPct,
  };
}

export function StandardLandingPage({
  preset,
  activeRoute,
  visualMode = false,
}: StandardLandingPageProps) {
  const [revealed, setRevealed] = useState<Record<SectionId, boolean>>({
    hero: false,
    trust: false,
    speed: false,
    accuracy: false,
    privacy: false,
    pipeline: false,
    workflow: false,
    cli: false,
    proof: false,
    cta: false,
  });
  const [activeSection, setActiveSection] = useState<SectionId>("hero");
  const [sectionOrigins, setSectionOrigins] = useState<
    Partial<Record<SectionId, { xPct: string; yPct: string }>>
  >({});

  const [activeSpeedId, setActiveSpeedId] = useState(SPEED_CARDS[0].id);
  const [activeClaimId, setActiveClaimId] = useState(ACCURACY_CLAIMS[0].id);
  const [activePipelineId, setActivePipelineId] = useState(PIPELINE_STEPS[0].id);
  const [workflowView, setWorkflowView] = useState<IxosView>("today");
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [activeProofId, setActiveProofId] = useState(PROOF_ITEMS[0].id);
  const [openFaqId, setOpenFaqId] = useState<string | null>(FAQ_ITEMS[0].id);

  const variantKey = activeRoute.replace("/", "") as "1" | "2" | "3";
  const scenarios = VARIANT_DEMO_SCENARIOS[variantKey];
  const [heroScenarioId, setHeroScenarioId] = useState(scenarios[0].id);
  const [heroRunNonce, setHeroRunNonce] = useState(0);

  const sectionRefs = useRef<Map<SectionId, HTMLElement>>(new Map());

  const activeClaim = useMemo(
    () => ACCURACY_CLAIMS.find((claim) => claim.id === activeClaimId) ?? ACCURACY_CLAIMS[0],
    [activeClaimId]
  );
  const activeStep = useMemo(
    () => PIPELINE_STEPS.find((step) => step.id === activePipelineId) ?? PIPELINE_STEPS[0],
    [activePipelineId]
  );
  const activeProof = useMemo(
    () => PROOF_ITEMS.find((item) => item.id === activeProofId) ?? PROOF_ITEMS[0],
    [activeProofId]
  );
  const heroScenario =
    scenarios.find((scenario) => scenario.id === heroScenarioId) ?? scenarios[0];

  useEffect(() => {
    if (visualMode) {
      setRevealed({
        hero: true,
        trust: true,
        speed: true,
        accuracy: true,
        privacy: true,
        pipeline: true,
        workflow: true,
        cli: true,
        proof: true,
        cta: true,
      });
      setSectionOrigins((current) => {
        const next = { ...current };
        SECTION_IDS.forEach((id) => {
          if (!next[id]) {
            next[id] = { xPct: "50%", yPct: "50%" };
          }
        });
        return next;
      });
      return;
    }

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const id = entry.target.getAttribute("data-section-id") as SectionId | null;
          if (!id) {
            return;
          }

          const target = entry.target as HTMLElement;
          const center = getSectionCenter(target);

          setRevealed((current) => (current[id] ? current : { ...current, [id]: true }));
          setSectionOrigins((current) =>
            current[id] ? current : { ...current, [id]: { xPct: center.xPct, yPct: center.yPct } }
          );

          emitRipple(center.x, center.y, preset === "cinematic" ? 0.31 : 0.27);
          window.setTimeout(() => {
            emitRipple(center.x + 24, center.y - 12, preset === "quiet" ? 0.15 : 0.18);
          }, 150);
        });
      },
      { threshold: 0.34, rootMargin: "-8% 0px -20% 0px" }
    );

    const activeObserver = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visibleEntries.length === 0) {
          return;
        }

        const id = visibleEntries[0].target.getAttribute("data-section-id") as SectionId | null;
        if (!id) {
          return;
        }
        setActiveSection(id);
      },
      { threshold: [0.4, 0.65] }
    );

    sectionRefs.current.forEach((node) => {
      revealObserver.observe(node);
      activeObserver.observe(node);
    });

    return () => {
      revealObserver.disconnect();
      activeObserver.disconnect();
    };
  }, [preset, visualMode]);

  useEffect(() => {
    if (visualMode) {
      return;
    }
    const node = sectionRefs.current.get(activeSection);
    if (!node) {
      return;
    }

    const { x, y } = getSectionCenter(node);
    emitRipple(x, y, preset === "quiet" ? 0.14 : 0.19);
  }, [activeSection, preset, visualMode]);

  const registerSection = (id: SectionId, node: HTMLElement | null) => {
    if (node) {
      sectionRefs.current.set(id, node);
    }
  };

  const sectionClass = (id: SectionId) =>
    [
      styles.section,
      styles.revealSection,
      revealed[id] ? styles.revealVisible : "",
      activeSection === id ? styles.sectionActive : "",
      preset === "editorial" ? styles.rippleBuilt : "",
    ]
      .filter(Boolean)
      .join(" ");

  const pulseFromElement = (node: HTMLElement, intensity = 0.18) => {
    const { x, y } = getSectionCenter(node);
    emitRipple(x, y, intensity);
  };

  const copyCommand = async (cmd: string) => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopiedCmd(cmd);
      window.setTimeout(() => {
        setCopiedCmd((current) => (current === cmd ? null : current));
      }, 1300);
    } catch {
      setCopiedCmd(null);
    }
  };

  const jumpToSection = (id: SectionId) => {
    const node = sectionRefs.current.get(id);
    if (!node) {
      return;
    }
    node.scrollIntoView({ behavior: "smooth", block: "start" });
    pulseFromElement(node, 0.24);
  };

  return (
    <main className={styles.page} data-preset={preset}>
      <V4AmbientField />
      <div className={styles.ambientVeil} aria-hidden />

      <nav className={styles.instrumentRail} aria-label="Section progress">
        {SECTION_META.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`${styles.railButton} ${activeSection === item.id ? styles.railActive : ""}`}
            onClick={() => jumpToSection(item.id)}
          >
            <span className={styles.railIndex}>{item.short}</span>
            <span className={styles.railLabel}>{item.title}</span>
          </button>
        ))}
      </nav>

      <div className={styles.content}>
        <section
          id="hero"
          data-section-id="hero"
          ref={(node) => registerSection("hero", node)}
          className={sectionClass("hero")}
          style={styleForOrigin(sectionOrigins.hero)}
        >
          <div className={styles.sectionHeaderBar}>
            <p className={styles.brandLabel}>Ixos / {PRESET_COPY[preset].name}</p>
            <div className={styles.routeSwitch}>
              {(["/1", "/2", "/3"] as const).map((route) => (
                <Link
                  key={route}
                  href={route}
                  className={`${styles.routePill} ${activeRoute === route ? styles.routePillActive : ""}`}
                >
                  {route}
                </Link>
              ))}
            </div>
          </div>

          <div className={styles.heroLayout}>
            <div className={styles.heroCopyColumn}>
              <p className={styles.kicker}>Section 01 / {PRESET_COPY[preset].heroKicker}</p>
              <h1 className={styles.heroTitle}>{PRESET_COPY[preset].headline}</h1>
              <p className={styles.heroLead}>{PRESET_COPY[preset].subhead}</p>

              <div className={styles.ctaRow}>
                <Link href="/download" className={styles.primaryCta}>
                  Download
                </Link>
                <Link href="/docs/cli-reference" className={styles.secondaryCta}>
                  Docs / CLI
                </Link>
              </div>

              <div className={styles.heroFacts}>
                <span className={styles.factPill}>Search / Today / Workstreams shared</span>
                <span className={styles.factPill}>Local-first by default</span>
                <span className={styles.factPill}>Deterministic demo adapter</span>
              </div>
            </div>

            <div className={styles.heroDemoColumn}>
              <div className={styles.heroScenarioBar}>
                {scenarios.map((scenario) => (
                  <button
                    key={scenario.id}
                    type="button"
                    className={`${styles.scenarioButton} ${
                      heroScenarioId === scenario.id ? styles.scenarioActive : ""
                    }`}
                    onClick={(event) => {
                      setHeroScenarioId(scenario.id);
                      setHeroRunNonce((current) => current + 1);
                      pulseFromElement(event.currentTarget, 0.2);
                    }}
                  >
                    {scenario.label}
                  </button>
                ))}
              </div>

              <div className={styles.demoWrapLarge}>
                <DemoSurface
                  key={`${heroScenario.id}-${heroRunNonce}`}
                  className={styles.heroDemoSurface}
                  initialView={heroScenario.view}
                  initialQuery={heroScenario.query}
                  initialMode={heroScenario.mode}
                  autoRun={!visualMode}
                />
              </div>
            </div>
          </div>
        </section>

        <section
          id="trust"
          data-section-id="trust"
          ref={(node) => registerSection("trust", node)}
          className={sectionClass("trust")}
          style={styleForOrigin(sectionOrigins.trust)}
        >
          <p className={styles.kicker}>Section 02 / Trust Strip</p>
          <div className={styles.trustLayout}>
            <div className={styles.trustBullets}>
              {TRUST_ITEMS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={styles.trustBullet}
                  onMouseEnter={(event) => pulseFromElement(event.currentTarget, 0.16)}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className={styles.badgeRow}>
              {TRUST_BADGES.map((badge) => (
                <span key={badge} className={styles.badgePill}>
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section
          id="speed"
          data-section-id="speed"
          ref={(node) => registerSection("speed", node)}
          className={sectionClass("speed")}
          style={styleForOrigin(sectionOrigins.speed)}
        >
          <p className={styles.kicker}>Section 03 / Speed</p>
          <div className={styles.speedGrid}>
            {SPEED_CARDS.map((card) => (
              <button
                key={card.id}
                type="button"
                className={`${styles.speedCard} ${activeSpeedId === card.id ? styles.speedCardActive : ""}`}
                onMouseEnter={(event) => {
                  setActiveSpeedId(card.id);
                  pulseFromElement(event.currentTarget, 0.16);
                }}
              >
                <div className={styles.speedHeader}>
                  <h2 className={styles.speedTitle}>{card.title}</h2>
                  <span className={styles.speedTag}>{card.note}</span>
                </div>
                <p className={styles.speedBody}>{card.body}</p>
                <div className={styles.meterTrack}>
                  <span
                    className={styles.meterFill}
                    style={{ ["--meter-width" as string]: card.meter } as CSSProperties}
                  />
                </div>
              </button>
            ))}
          </div>
        </section>

        <section
          id="accuracy"
          data-section-id="accuracy"
          ref={(node) => registerSection("accuracy", node)}
          className={sectionClass("accuracy")}
          style={styleForOrigin(sectionOrigins.accuracy)}
        >
          <p className={styles.kicker}>Section 04 / Accuracy</p>
          <div className={styles.accuracyGrid}>
            <div className={styles.claimGrid}>
              {ACCURACY_CLAIMS.map((claim) => (
                <button
                  key={claim.id}
                  type="button"
                  className={`${styles.claimCard} ${activeClaimId === claim.id ? styles.claimCardActive : ""}`}
                  onMouseEnter={(event) => {
                    setActiveClaimId(claim.id);
                    pulseFromElement(event.currentTarget, 0.17);
                  }}
                  onClick={() => setActiveClaimId(claim.id)}
                >
                  <h3 className={styles.claimTitle}>{claim.title}</h3>
                  <p className={styles.claimBody}>{claim.body}</p>
                  <div className={styles.fileChipRow}>
                    {claim.files.map((file) => (
                      <span key={file} className={styles.fileChip}>
                        {file}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>

            <aside className={styles.proofDrawer}>
              <p className={styles.drawerLabel}>Mini Proof Drawer</p>
              {activeClaim.proof.map((line) => (
                <p key={line} className={styles.drawerLine}>
                  {line}
                </p>
              ))}
            </aside>
          </div>
        </section>

        <section
          id="privacy"
          data-section-id="privacy"
          ref={(node) => registerSection("privacy", node)}
          className={sectionClass("privacy")}
          style={styleForOrigin(sectionOrigins.privacy)}
          onMouseEnter={(event) => pulseFromElement(event.currentTarget, 0.2)}
        >
          <p className={styles.kicker}>Section 05 / Privacy</p>
          <div className={styles.privacyLayout}>
            <p className={styles.privacyText}>
              Local execution is a constant, not a temporary mode. Query processing, result rationale, and
              proof surfaces are built to remain on device in the core search path.
            </p>
            <div className={styles.privacyBadges}>
              <span className={styles.lockBadge}>Local Execution / Stable</span>
              <span className={styles.lockBadge}>No Forced Cloud Path</span>
            </div>
          </div>
        </section>

        <section
          id="pipeline"
          data-section-id="pipeline"
          ref={(node) => registerSection("pipeline", node)}
          className={sectionClass("pipeline")}
          style={styleForOrigin(sectionOrigins.pipeline)}
        >
          <p className={styles.kicker}>Section 06 / How It Works</p>
          <div className={styles.pipelineLayout}>
            <div className={styles.stepList}>
              {PIPELINE_STEPS.map((step) => (
                <button
                  key={step.id}
                  type="button"
                  className={`${styles.stepCard} ${activePipelineId === step.id ? styles.stepCardActive : ""}`}
                  onMouseEnter={(event) => {
                    setActivePipelineId(step.id);
                    pulseFromElement(event.currentTarget, 0.17);
                  }}
                  onFocus={() => setActivePipelineId(step.id)}
                >
                  <div className={styles.stepHead}>
                    <p className={styles.stepLabel}>{step.label}</p>
                    <span className={styles.stepStage}>{step.stage}</span>
                  </div>
                  <p className={styles.stepBody}>{step.detail}</p>
                </button>
              ))}
            </div>

            <div className={styles.pipelineDemoWrap}>
              <DemoSurface
                className={styles.pipelineDemo}
                initialView="search"
                initialQuery="How does token expiry work?"
                initialMode="auto"
                autoRun={!visualMode}
                viewOverride="search"
              />
              <div
                className={styles.pipelineHighlight}
                style={{
                  left: activeStep.region.left,
                  top: activeStep.region.top,
                  width: activeStep.region.width,
                  height: activeStep.region.height,
                }}
              />
            </div>
          </div>
        </section>

        <section
          id="workflow"
          data-section-id="workflow"
          ref={(node) => registerSection("workflow", node)}
          className={sectionClass("workflow")}
          style={styleForOrigin(sectionOrigins.workflow)}
        >
          <p className={styles.kicker}>Section 07 / Today + Workstreams</p>
          <div className={styles.workflowHeader}>
            <div className={styles.tabRow}>
              <button
                type="button"
                className={`${styles.tabButton} ${workflowView === "today" ? styles.tabButtonActive : ""}`}
                onClick={() => setWorkflowView("today")}
              >
                Today
              </button>
              <button
                type="button"
                className={`${styles.tabButton} ${workflowView === "workstreams" ? styles.tabButtonActive : ""}`}
                onClick={() => setWorkflowView("workstreams")}
              >
                Workstreams
              </button>
            </div>
            <p className={styles.workflowText}>
              Keep continuity across sessions without rebuilding context from scratch.
            </p>
          </div>

          <div className={styles.demoWrapLarge}>
            <DemoSurface
              className={styles.workflowDemo}
              initialView="today"
              initialQuery="workstream session recovery"
              initialMode="auto"
              autoRun={false}
              viewOverride={workflowView}
            />
          </div>
        </section>

        <section
          id="cli"
          data-section-id="cli"
          ref={(node) => registerSection("cli", node)}
          className={sectionClass("cli")}
          style={styleForOrigin(sectionOrigins.cli)}
        >
          <p className={styles.kicker}>Section 08 / CLI</p>
          <div className={styles.cliGrid}>
            {CLI_COMMANDS.map((cmd) => (
              <div key={cmd} className={styles.cliCommandRow}>
                <code className={styles.cliCommand}>{cmd}</code>
                <button
                  type="button"
                  className={`${styles.copyButton} ${copiedCmd === cmd ? styles.copyButtonDone : ""}`}
                  onClick={() => copyCommand(cmd)}
                >
                  {copiedCmd === cmd ? "Copied" : "Copy"}
                </button>
              </div>
            ))}
          </div>
          <div className={styles.cliOutput}>
            <p>$ cargo build --release</p>
            <p>&gt; compiling ixos core modules</p>
            <p>&gt; build complete: target/release</p>
          </div>
        </section>

        <section
          id="proof"
          data-section-id="proof"
          ref={(node) => registerSection("proof", node)}
          className={sectionClass("proof")}
          style={styleForOrigin(sectionOrigins.proof)}
        >
          <p className={styles.kicker}>Section 09 / Proof + Transparency</p>
          <div className={styles.proofLayout}>
            <div className={styles.proofSelector}>
              {PROOF_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.proofButton} ${activeProofId === item.id ? styles.proofButtonActive : ""}`}
                  onMouseEnter={(event) => {
                    setActiveProofId(item.id);
                    pulseFromElement(event.currentTarget, 0.14);
                  }}
                  onClick={() => setActiveProofId(item.id)}
                >
                  <span className={styles.proofButtonLabel}>{item.label}</span>
                  <span className={styles.proofButtonSource}>{item.source}</span>
                </button>
              ))}
            </div>

            <article className={styles.proofPanel}>
              <p className={styles.drawerLabel}>{activeProof.label}</p>
              <p className={styles.proofSource}>{activeProof.source}</p>
              {activeProof.bullets.map((line) => (
                <p key={line} className={styles.drawerLine}>
                  {line}
                </p>
              ))}
            </article>
          </div>
        </section>

        <section
          id="cta"
          data-section-id="cta"
          ref={(node) => registerSection("cta", node)}
          className={sectionClass("cta")}
          style={styleForOrigin(sectionOrigins.cta)}
        >
          <p className={styles.kicker}>Section 10 / Final CTA + Footer</p>
          <h2 className={styles.ctaTitle}>Install Ixos and keep search explainable.</h2>
          <p className={styles.ctaBody}>
            Desktop and CLI share the same core behavior, and this landing uses the same demo surfaces you
            will use in product.
          </p>

          <div className={styles.ctaRow}>
            <Link href="/download" className={styles.primaryCta}>
              Download Ixos
            </Link>
            <Link href="/docs/getting-started" className={styles.secondaryCta}>
              Getting Started
            </Link>
          </div>

          <div className={styles.faqList}>
            {FAQ_ITEMS.map((item) => (
              <div key={item.id} className={styles.faqItem}>
                <button
                  type="button"
                  className={styles.faqButton}
                  onClick={() => setOpenFaqId((current) => (current === item.id ? null : item.id))}
                >
                  {item.q}
                </button>
                {openFaqId === item.id ? <p className={styles.faqAnswer}>{item.a}</p> : null}
              </div>
            ))}
          </div>

          <footer className={styles.footerLinks}>
            <Link href="/docs">Docs</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </footer>
        </section>
      </div>
    </main>
  );
}
