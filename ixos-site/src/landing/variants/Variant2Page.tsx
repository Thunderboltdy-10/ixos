"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  DemoSurfaceShell,
  type DemoHighlightRegion,
} from "../DemoSurfaceShell";
import { VARIANT_DEMO_SCENARIOS } from "../demo/landingDemoAdapter";
import { RippleField, emitRippleFromElement } from "../ripple/RippleField";
import { type IxosView } from "../DemoSurface";
import { VARIANT_THEME_TOKENS } from "./theme";
import styles from "./Variant2Page.module.css";

interface Claim {
  id: string;
  title: string;
  statement: string;
  source: string;
  region: DemoHighlightRegion;
  view: IxosView;
  proof: string[];
}

const CLAIMS: Claim[] = [
  {
    id: "claim-progressive",
    title: "Progressive stages are explicit, not hidden.",
    statement:
      "The search pipeline exposes SCANNING, RERANKING, and LOCKED in live UI state as results stream.",
    source: "src/landing/DemoSurface.tsx",
    region: "pipeline-stats",
    view: "search",
    proof: [
      "Stage labels map directly from stream progress events.",
      "Pipeline stats update incrementally before completion.",
      "Mode toggles remain interactive while stream is active.",
    ],
  },
  {
    id: "claim-shared-ui",
    title: "Landing and desktop share one surface contract.",
    statement:
      "The same Search/Today/Workstreams primitives are used across marketing and product surfaces.",
    source: "packages/ixos-ui/src/components/AppWorldSurface.tsx",
    region: "search-results",
    view: "search",
    proof: [
      "Landing renders AppWorldSurface from @ixos/ixos-ui.",
      "No route-specific mockup replaces core Search/Today/Workstreams shell.",
      "Source-path badges remain visible in claim cards and drawers.",
    ],
  },
  {
    id: "claim-today",
    title: "Context continuity is visible in Today view.",
    statement:
      "The demo includes resume rows and recent activity, matching Pro workflow expectations.",
    source: "packages/ixos-ui/src/adapters/demo.ts",
    region: "today-signals",
    view: "today",
    proof: [
      "Signals and rows are deterministic demo adapter fixtures.",
      "Resume and recent buckets are rendered with stable labels.",
      "No backend is required to reproduce the interaction.",
    ],
  },
  {
    id: "claim-workstreams",
    title: "Workstreams remain first-class and selectable.",
    statement:
      "Rows carry status, file/action counts, and detail text; selection updates context immediately.",
    source: "packages/ixos-ui/src/components/WorkstreamsSurface.tsx",
    region: "workstream-list",
    view: "workstreams",
    proof: [
      "Each row includes status, files, actions, and last-active metadata.",
      "Selection state is wired through shared surface callbacks.",
      "Panel-level summary chips match row status distribution.",
    ],
  },
  {
    id: "claim-query",
    title: "Typed query entry drives the full script path.",
    statement:
      "Users can enter or select query presets and trigger a deterministic stream without API coupling.",
    source: "packages/ixos-ui/src/adapters/demo.ts",
    region: "search-input",
    view: "search",
    proof: [
      "Preset buttons call the same submit flow as manual typing.",
      "Search adapter emits progress and result events in sequence.",
      "Cancel logic resets in-flight stream before next submission.",
    ],
  },
];

const REGION_ANCHOR: Record<DemoHighlightRegion, { x: number; y: number }> = {
  "search-input": { x: 0.72, y: 0.24 },
  "search-results": { x: 0.74, y: 0.56 },
  "pipeline-stats": { x: 0.73, y: 0.33 },
  "today-signals": { x: 0.72, y: 0.31 },
  "workstream-list": { x: 0.73, y: 0.56 },
};

export function Variant2Page() {
  const tokens = VARIANT_THEME_TOKENS["2"];
  const [isVisualMode, setIsVisualMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsVisualMode(params.get("visual") === "1");
  }, []);
  const hostRef = useRef<HTMLDivElement>(null);
  const demoPanelRef = useRef<HTMLDivElement>(null);
  const claimRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const [selectedId, setSelectedId] = useState(CLAIMS[0].id);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [threadPath, setThreadPath] = useState("");

  const activeId = hoveredId ?? selectedId;
  const activeClaim = useMemo(
    () => CLAIMS.find((claim) => claim.id === activeId) ?? CLAIMS[0],
    [activeId]
  );
  const selectedClaim = useMemo(
    () => CLAIMS.find((claim) => claim.id === selectedId) ?? CLAIMS[0],
    [selectedId]
  );

  useEffect(() => {
    const redraw = () => {
      const host = hostRef.current;
      const demo = demoPanelRef.current;
      const claim = claimRefs.current.get(activeClaim.id);
      if (!host || !demo || !claim) {
        setThreadPath("");
        return;
      }

      const hostRect = host.getBoundingClientRect();
      const claimRect = claim.getBoundingClientRect();
      const demoRect = demo.getBoundingClientRect();
      const anchor = REGION_ANCHOR[activeClaim.region];

      const startX = claimRect.right - hostRect.left - 10;
      const startY = claimRect.top - hostRect.top + claimRect.height * 0.5;
      const endX = demoRect.left - hostRect.left + demoRect.width * anchor.x;
      const endY = demoRect.top - hostRect.top + demoRect.height * anchor.y;

      const curve = `M ${startX} ${startY} C ${startX + 90} ${startY}, ${endX - 90} ${endY}, ${endX} ${endY}`;
      setThreadPath(curve);
    };

    redraw();
    window.addEventListener("resize", redraw);
    window.addEventListener("scroll", redraw, { passive: true });
    return () => {
      window.removeEventListener("resize", redraw);
      window.removeEventListener("scroll", redraw);
    };
  }, [activeClaim.id, activeClaim.region]);

  return (
    <main
      className={styles.page}
      data-landing-variant="2"
      style={
        {
          "--v-accent-main": tokens.accentMain,
          "--v-accent-alt": tokens.accentAlt,
          "--v-shell-bg": tokens.shellBg,
        } as CSSProperties
      }
    >
      <RippleField />
      <div className={styles.aura} />

      <div className={styles.content}>
        <header className={styles.top}>
          <p className={styles.wordmark}>Ixos / Evidence Loom</p>
          <nav className={styles.routes} aria-label="Landing variants">
            <Link className={styles.route} href="/1">
              /1
            </Link>
            <Link className={`${styles.route} ${styles.routeActive}`} href="/2">
              /2
            </Link>
            <Link className={styles.route} href="/3">
              /3
            </Link>
          </nav>
        </header>

        <section className={styles.hero}>
          <p className={styles.eyebrow}>Signature System / Interactive Proof Routing</p>
          <h1 className={styles.title}>Every Claim Is Tied To A Source And A Surface Region.</h1>
          <p className={styles.lead}>
            Hover a claim to route the thread into the live demo panel. Click to open a proof drawer with
            concise evidence notes and source references. No decorative diagram layer is used.
          </p>
        </section>

        <section className={styles.grid} ref={hostRef}>
          <svg className={styles.threadLayer} aria-hidden>
            {threadPath ? <path className={styles.threadPath} d={threadPath} /> : null}
          </svg>

          <article className={styles.claimPanel}>
            {CLAIMS.map((claim) => (
              <button
                key={claim.id}
                ref={(node) => {
                  if (node) {
                    claimRefs.current.set(claim.id, node);
                  }
                }}
                type="button"
                className={`${styles.claimButton} ${
                  activeClaim.id === claim.id ? styles.claimActive : ""
                }`}
                onMouseEnter={() => {
                  setHoveredId(claim.id);
                  const node = claimRefs.current.get(claim.id);
                  if (node) {
                    emitRippleFromElement(node, { intensity: 0.3, hue: 0.66 });
                  }
                }}
                onMouseLeave={() => setHoveredId(null)}
                onFocus={() => setHoveredId(claim.id)}
                onBlur={() => setHoveredId(null)}
                onClick={() => {
                  setSelectedId(claim.id);
                  const node = claimRefs.current.get(claim.id);
                  if (node) {
                    emitRippleFromElement(node, { intensity: 0.38, hue: 0.33 });
                  }
                }}
              >
                <h2 className={styles.claimTitle}>{claim.title}</h2>
                <p className={styles.claimText}>{claim.statement}</p>
                <span className={styles.source}>{claim.source}</span>
              </button>
            ))}

            <div className={styles.drawer}>
              <p className={styles.drawerTitle}>Evidence Drawer / {selectedClaim.id}</p>
              {selectedClaim.proof.map((line) => (
                <p key={line} className={styles.proof}>
                  {line}
                </p>
              ))}
              <p className={styles.proof}>Source reference: {selectedClaim.source}</p>
            </div>
          </article>

          <div className={styles.demoPanel} ref={demoPanelRef}>
            <DemoSurfaceShell
              title="Evidence-Mapped Demo Surface"
              subtitle="Hover claim to highlight region, click to lock drawer context"
              scenarios={VARIANT_DEMO_SCENARIOS["2"]}
              defaultScenarioId="v2-proof"
              forcedView={activeClaim.view}
              highlightRegion={activeClaim.region}
              autoRun={!isVisualMode}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
