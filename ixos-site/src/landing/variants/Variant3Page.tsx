"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { DemoSurfaceShell } from "../DemoSurfaceShell";
import { VARIANT_DEMO_SCENARIOS } from "../demo/landingDemoAdapter";
import { RippleField, emitRippleFromElement } from "../ripple/RippleField";
import { VARIANT_THEME_TOKENS } from "./theme";
import styles from "./Variant3Page.module.css";

interface CockpitSection {
  id: string;
  eyebrow: string;
  title: string;
  copy: string;
}

const COCKPIT_SECTIONS: CockpitSection[] = [
  {
    id: "cockpit-demo",
    eyebrow: "01 / Surface",
    title: "Single cockpit, fully interactive.",
    copy:
      "The shared desktop surface stays responsive across Search, Today, and Workstreams. Query entry, mode toggles, and result selection all remain active.",
  },
  {
    id: "cockpit-calibration",
    eyebrow: "02 / Calibration",
    title: "Micro-states tuned for repeated use.",
    copy:
      "Hover, focus, and pressed states are intentionally quiet and short-lived. The interface rewards repetition without visual fatigue or noisy transitions.",
  },
  {
    id: "cockpit-lockin",
    eyebrow: "03 / Lock-In",
    title: "Scroll alignment anchors attention.",
    copy:
      "Instrument ticks align with section activation as you move. Each lock-in trigger emits a restrained pulse to keep rhythm while preserving calm.",
  },
];

export function Variant3Page() {
  const tokens = VARIANT_THEME_TOKENS["3"];
  const [isVisualMode, setIsVisualMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsVisualMode(params.get("visual") === "1");
  }, []);
  const [activeId, setActiveId] = useState(COCKPIT_SECTIONS[0].id);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  const activeIndex = useMemo(
    () => COCKPIT_SECTIONS.findIndex((section) => section.id === activeId),
    [activeId]
  );

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    COCKPIT_SECTIONS.forEach((section) => {
      const node = sectionRefs.current.get(section.id);
      if (!node) {
        return;
      }
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveId(section.id);
            emitRippleFromElement(node, { intensity: 0.32, hue: 0 });
          }
        },
        { threshold: 0.5, rootMargin: "-8% 0px -24% 0px" }
      );
      observer.observe(node);
      observers.push(observer);
    });
    return () => observers.forEach((observer) => observer.disconnect());
  }, []);

  return (
    <main
      className={styles.page}
      data-landing-variant="3"
      style={
        {
          "--v-accent-main": tokens.accentMain,
          "--v-accent-alt": tokens.accentAlt,
          "--v-shell-bg": tokens.shellBg,
        } as CSSProperties
      }
    >
      <RippleField />
      <div className={styles.ambient} />

      <div className={styles.content}>
        <header className={styles.top}>
          <p className={styles.wordmark}>Ixos / Quiet Luxury Cockpit</p>
          <nav className={styles.routes} aria-label="Landing variants">
            <Link className={styles.route} href="/1">
              /1
            </Link>
            <Link className={styles.route} href="/2">
              /2
            </Link>
            <Link className={`${styles.route} ${styles.routeActive}`} href="/3">
              /3
            </Link>
          </nav>
        </header>

        <section className={styles.hero}>
          <p className={styles.eyebrow}>Signature System / Precision Microinteraction</p>
          <h1 className={styles.title}>Calm Surface. Tight Feedback. High Retention.</h1>
          <p className={styles.lead}>
            This variant strips spectacle and doubles down on tactile confidence: deliberate states,
            instrument-grade alignment, and lock-in pulses that guide attention without noise.
          </p>
        </section>

        <div className={styles.mainGrid}>
          <section className={styles.sections}>
            <article
              className={`${styles.section} ${
                activeId === "cockpit-demo" ? styles.sectionActive : ""
              }`}
              id="cockpit-demo"
              ref={(node) => {
                if (node) {
                  sectionRefs.current.set("cockpit-demo", node);
                }
              }}
            >
              <span className={styles.pulse} />
              <p className={styles.sectionEyebrow}>01 / Surface</p>
              <h2 className={styles.sectionTitle}>Shared shell, zero mockup drift.</h2>
              <p className={styles.sectionCopy}>
                Search, Today, and Workstreams run through the same adapter-backed UI primitives used by
                desktop.
              </p>
              <DemoSurfaceShell
                title="Cockpit Demo Surface"
                subtitle="Quiet states, live search stream, deterministic adapters"
                scenarios={VARIANT_DEMO_SCENARIOS["3"]}
                defaultScenarioId="v3-refresh"
                autoRun={!isVisualMode}
              />
            </article>

            {COCKPIT_SECTIONS.slice(1).map((section) => (
              <article
                key={section.id}
                className={`${styles.section} ${activeId === section.id ? styles.sectionActive : ""}`}
                id={section.id}
                ref={(node) => {
                  if (node) {
                    sectionRefs.current.set(section.id, node);
                  }
                }}
              >
                <span className={styles.pulse} />
                <p className={styles.sectionEyebrow}>{section.eyebrow}</p>
                <h2 className={styles.sectionTitle}>{section.title}</h2>
                <p className={styles.sectionCopy}>{section.copy}</p>
              </article>
            ))}
          </section>

          <aside className={styles.rail} aria-label="Instrument ticks">
            <p className={styles.railLabel}>Instrument Ticks</p>
            <div className={styles.tickWrap}>
              <span
                className={styles.indicator}
                style={{
                  transform: `translateY(${Math.max(activeIndex, 0) * 37}px)`,
                }}
              />
              {COCKPIT_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={`${styles.tick} ${activeId === section.id ? styles.tickActive : ""}`}
                  onClick={() => {
                    const node = sectionRefs.current.get(section.id);
                    if (!node) {
                      return;
                    }
                    node.scrollIntoView({ behavior: "smooth", block: "center" });
                    emitRippleFromElement(node, { intensity: 0.3, hue: 0.33 });
                  }}
                >
                  {section.eyebrow.replace(" / ", " ")}
                </button>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
