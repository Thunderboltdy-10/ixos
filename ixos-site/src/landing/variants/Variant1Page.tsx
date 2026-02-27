"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

import { DemoSurfaceShell } from "../DemoSurfaceShell";
import { VARIANT_DEMO_SCENARIOS } from "../demo/landingDemoAdapter";
import { RippleField, emitRippleFromElement, useRipplePhase } from "../ripple/RippleField";
import { VARIANT_THEME_TOKENS } from "./theme";
import styles from "./Variant1Page.module.css";

interface FoundrySection {
  id: string;
  rank: string;
  title: string;
  copy: string;
  tiles: Array<{ key: string; value: string }>;
}

const FOUNDRY_SECTIONS: FoundrySection[] = [
  {
    id: "scan",
    rank: "01 / Scan",
    title: "Wave Pass: Files Condense",
    copy:
      "As each pulse crosses the viewport, shell borders and metadata bands sharpen from the same pixel grid that powers the background field.",
    tiles: [
      { key: "Trigger", value: "Section entry pulse with center-weighted radius." },
      { key: "Look", value: "Square cells brighten first, card shell resolves second." },
      { key: "Input", value: "No index daemon, no stale cache assumptions." },
      { key: "Output", value: "Deterministic card state with explicit file path labels." },
    ],
  },
  {
    id: "rerank",
    rank: "02 / Rerank",
    title: "Phase-Bound Reveal Mask",
    copy:
      "Mask radius is phase-modulated from the ripple field. Sections do not fade in globally; they crystallize where the wavefront intersects content.",
    tiles: [
      { key: "Mask", value: "Clip-path radius follows field phase + section offset." },
      { key: "Depth", value: "No heavy 3D, only shell lift and line-work precision." },
      { key: "State", value: "Each card progresses from sparse grid to full fidelity." },
      { key: "Rhythm", value: "Tight spacing, editorial cadence, no dead plates." },
    ],
  },
  {
    id: "lock",
    rank: "03 / Lock",
    title: "Crystallized Evidence Surfaces",
    copy:
      "Once lock stage is reached, interaction remains live. Search tabs, mode toggles, and streaming results run on deterministic adapters without backend coupling.",
    tiles: [
      { key: "Shared UI", value: "Desktop Search, Today, Workstreams from one source." },
      { key: "Streaming", value: "Scripted scan > rerank > lock progression." },
      { key: "Control", value: "Query presets trigger full replay in-place." },
      { key: "Proof", value: "Source paths remain visible as first-class metadata." },
    ],
  },
];

function RippleRevealCard({
  section,
  index,
  freezeMotion,
}: {
  section: FoundrySection;
  index: number;
  freezeMotion: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const [isActive, setIsActive] = useState(false);
  const livePhase = useRipplePhase();
  const phase = freezeMotion ? 0 : livePhase;

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsActive(true);
          emitRippleFromElement(node, {
            intensity: 0.4,
            hue: index % 2 === 0 ? 0 : 0.33,
            phaseOffset: index * 0.75,
          });
        }
      },
      { threshold: 0.35, rootMargin: "-6% 0px -16% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [index]);

  const baseRadius = isActive ? 115 : 16;
  const maskRadius = baseRadius + Math.sin(phase + index * 0.8) * 3.5;
  const borderAlpha = isActive ? 0.5 : 0.24;

  return (
    <article
      ref={ref}
      className={styles.foundryCard}
      style={{
        clipPath: `circle(${maskRadius}% at 50% 50%)`,
        borderColor: `rgba(243,245,247,${borderAlpha})`,
        boxShadow: isActive
          ? "0 20px 54px rgba(0,0,0,0.45), 0 0 0 1px rgba(45,212,191,0.18) inset"
          : "0 16px 40px rgba(0,0,0,0.32)",
      }}
    >
      <div className={styles.foundryInner}>
        <div>
          <p className={styles.rank}>{section.rank}</p>
          <h2 className={styles.cardTitle}>{section.title}</h2>
          <p className={styles.cardCopy}>{section.copy}</p>
        </div>
        <div className={styles.tileGrid}>
          {section.tiles.map((tile) => (
            <div
              key={tile.key}
              className={styles.tile}
              style={{
                opacity: isActive ? 1 : 0.55,
                transform: isActive ? "translateY(0px)" : "translateY(10px)",
                transition: "opacity 320ms ease, transform 320ms ease",
              }}
            >
              <p className={styles.tileKey}>{tile.key}</p>
              <p className={styles.tileValue}>{tile.value}</p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

export function Variant1Page() {
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const tokens = VARIANT_THEME_TOKENS["1"];
  const [isVisualMode, setIsVisualMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsVisualMode(params.get("visual") === "1");
  }, []);

  return (
    <main
      className={styles.page}
      data-landing-variant="1"
      style={
        {
          "--v-accent-main": tokens.accentMain,
          "--v-accent-alt": tokens.accentAlt,
          "--v-shell-bg": tokens.shellBg,
        } as CSSProperties
      }
    >
      <RippleField />
      <div className={styles.grain} />

      <div className={styles.content}>
        <header className={styles.top}>
          <p className={styles.wordmark}>Ixos / Ripple Foundry</p>
          <nav className={styles.routes} aria-label="Landing variants">
            <Link className={`${styles.route} ${styles.routeActive}`} href="/1">
              /1
            </Link>
            <Link className={styles.route} href="/2">
              /2
            </Link>
            <Link className={styles.route} href="/3">
              /3
            </Link>
          </nav>
        </header>

        <section className={styles.hero}>
          <article className={styles.heroCopy}>
            <p className={styles.eyebrow}>Signature System / Ripple-Driven Layout</p>
            <h1 className={styles.title}>Pages Forged Directly From The Field.</h1>
            <p className={styles.lead}>
              The square ripple grid is the layout engine. As wavefronts propagate, each section shell
              condenses from low-signal pixels into stable, evidence-ready surfaces without swapping to a
              different visual language.
            </p>
            <div className={styles.heroActions}>
              {FOUNDRY_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  className={styles.action}
                  type="button"
                  onClick={() => {
                    const target = cardRefs.current.get(section.id);
                    if (!target) {
                      return;
                    }
                    target.scrollIntoView({ behavior: "smooth", block: "center" });
                    emitRippleFromElement(target, { intensity: 0.42, hue: 0.33 });
                  }}
                >
                  Focus {section.rank}
                </button>
              ))}
            </div>
          </article>

          <DemoSurfaceShell
            title="Foundry Demo Surface"
            subtitle="Shared desktop Search/Today/Workstreams shell"
            scenarios={VARIANT_DEMO_SCENARIOS["1"]}
            defaultScenarioId="v1-refresh"
            autoRun={!isVisualMode}
          />
        </section>

        <section className={styles.foundryGrid}>
          {FOUNDRY_SECTIONS.map((section, index) => (
            <div
              key={section.id}
              ref={(node) => {
                if (node) {
                  cardRefs.current.set(section.id, node);
                }
              }}
            >
              <RippleRevealCard section={section} index={index} freezeMotion={isVisualMode} />
            </div>
          ))}
        </section>

        <section className={styles.closing}>
          <h2 className={styles.closingTitle}>Ripple Foundry keeps interaction live while surfaces resolve.</h2>
          <p className={styles.closingCopy}>
            Mode switches, typed search, and streaming result rows remain interactive even during reveal
            transitions. The wow moment is the construction logic, not ornamental overlays.
          </p>
        </section>
      </div>
    </main>
  );
}
