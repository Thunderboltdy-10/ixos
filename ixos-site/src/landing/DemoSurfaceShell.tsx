"use client";

import { useEffect, useMemo, useState } from "react";

import { DemoSurface, type IxosView } from "./DemoSurface";
import styles from "./DemoSurfaceShell.module.css";

import type { DemoSurfaceScenario } from "./demo/types";

export type DemoHighlightRegion =
  | "search-input"
  | "search-results"
  | "pipeline-stats"
  | "today-signals"
  | "workstream-list";

interface DemoSurfaceShellProps {
  title?: string;
  subtitle?: string;
  scenarios: DemoSurfaceScenario[];
  defaultScenarioId?: string;
  className?: string;
  forcedView?: IxosView;
  highlightRegion?: DemoHighlightRegion | null;
  autoRun?: boolean;
}

interface HighlightRect {
  left: string;
  top: string;
  width: string;
  height: string;
}

const HIGHLIGHT_MAP: Record<DemoHighlightRegion, Partial<Record<IxosView, HighlightRect>>> = {
  "search-input": {
    search: { left: "33%", top: "16%", width: "58%", height: "15%" },
  },
  "search-results": {
    search: { left: "33%", top: "35%", width: "60%", height: "54%" },
  },
  "pipeline-stats": {
    search: { left: "33%", top: "26%", width: "60%", height: "14%" },
  },
  "today-signals": {
    today: { left: "34%", top: "20%", width: "58%", height: "20%" },
  },
  "workstream-list": {
    workstreams: { left: "34%", top: "23%", width: "58%", height: "65%" },
  },
};

export type { DemoSurfaceScenario };

export function DemoSurfaceShell({
  title = "Shared Desktop Surface",
  subtitle = "Interactive adapter-driven demo",
  scenarios,
  defaultScenarioId,
  className,
  forcedView,
  highlightRegion = null,
  autoRun = true,
}: DemoSurfaceShellProps) {
  if (scenarios.length === 0) {
    throw new Error("DemoSurfaceShell requires at least one scenario.");
  }

  const fallbackScenario = scenarios[0];
  const preferredScenario = scenarios.find((entry) => entry.id === defaultScenarioId);
  const [activeScenarioId, setActiveScenarioId] = useState<string>(
    preferredScenario?.id ?? fallbackScenario.id
  );
  const [runNonce, setRunNonce] = useState(0);
  const [currentView, setCurrentView] = useState<IxosView>(fallbackScenario.view);

  const activeScenario = useMemo(
    () => scenarios.find((entry) => entry.id === activeScenarioId) ?? fallbackScenario,
    [activeScenarioId, fallbackScenario, scenarios]
  );

  useEffect(() => {
    setCurrentView(forcedView ?? activeScenario.view);
  }, [activeScenario.view, forcedView]);

  const activeHighlight = highlightRegion
    ? HIGHLIGHT_MAP[highlightRegion]?.[forcedView ?? currentView]
    : null;

  return (
    <section className={`${styles.shell} ${className ?? ""}`}>
      <div className={styles.chrome}>
        <div className={styles.meta}>
          <p className={styles.title}>{title}</p>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
        <div className={styles.scenarioList}>
          {scenarios.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              className={`${styles.scenarioButton} ${
                scenario.id === activeScenario.id ? styles.scenarioActive : ""
              }`}
              onClick={() => {
                setActiveScenarioId(scenario.id);
                setRunNonce((value) => value + 1);
              }}
            >
              {scenario.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.surfaceWrap}>
        <DemoSurface
          key={`${activeScenario.id}-${runNonce}`}
          className={styles.surface}
          initialView={activeScenario.view}
          initialQuery={activeScenario.query}
          initialMode={activeScenario.mode}
          autoRun={autoRun}
          viewOverride={forcedView}
          onViewChange={setCurrentView}
        />
        {activeHighlight ? (
          <div
            className={styles.highlight}
            style={{
              left: activeHighlight.left,
              top: activeHighlight.top,
              width: activeHighlight.width,
              height: activeHighlight.height,
            }}
          />
        ) : null}
      </div>
    </section>
  );
}
