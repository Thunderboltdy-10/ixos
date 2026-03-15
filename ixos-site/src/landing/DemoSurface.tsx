"use client";

import { CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import {
  AppWorldSurface,
  type IxosSearchResult,
  type IxosTodayRow,
  type IxosTodaySignal,
  type IxosWorkstreamRow,
} from "@ixos/ixos-ui";

import { getLandingDemoAdapter } from "./demo/landingDemoAdapter";

export type IxosView = "search" | "today" | "workstreams";
export type SearchMode = "flash" | "auto" | "pro";

interface PipelineStats {
  filesScanned: number;
  candidates: number;
  embedded: number;
  cacheHits: number;
  stage: string;
}

const DEFAULT_PRESETS = [
  "company policy on remote work",
  "Q3 marketing campaign budget",
  "How do I setup my email signature?",
  "authentication token refresh",
  "design system components",
  "2025 financial projections"
];

const TODAY_SIGNALS: IxosTodaySignal[] = [
  { label: "Sessions today", value: "4", hint: "2 active, 2 warm" },
  { label: "Files touched", value: "31", hint: "across 3 workstreams" },
  { label: "Searches", value: "18", hint: "12 fast, 6 deep" },
  { label: "Cache efficiency", value: "94%", hint: "embeddings reused" },
];

const TODAY_ROWS: IxosTodayRow[] = [
  {
    id: "t1",
    title: "Auth system refactor",
    meta: "48 min ago | src/auth/ | 12 files",
    detail: "Left off at token-manager.ts. Next: implement rotation cleanup.",
  },
  {
    id: "t2",
    title: "API rate limiting",
    meta: "2 hr ago | src/api/ | 8 files",
    detail: "Added sliding window. Need to test burst scenarios.",
  },
  {
    id: "t3",
    title: "Database migration v3",
    meta: "Yesterday | db/migrations/ | 4 files",
    detail: "Migration 003_add_refresh_tokens.sql ready for review.",
  },
];

const WORKSTREAM_ROWS: IxosWorkstreamRow[] = [
  {
    id: "ws1",
    name: "Auth System",
    status: "active",
    files: 23,
    actions: 47,
    lastActive: "48 min ago",
    detail: "JWT refresh, token rotation, blacklist management. 3 PRs open.",
  },
  {
    id: "ws2",
    name: "API Layer",
    status: "active",
    files: 18,
    actions: 31,
    lastActive: "2 hr ago",
    detail: "Rate limiting, CORS, versioning. Targeting v2 release.",
  },
  {
    id: "ws3",
    name: "Database",
    status: "warm",
    files: 9,
    actions: 14,
    lastActive: "1 day ago",
    detail: "Migration scripts, index optimization, refresh token table.",
  },
  {
    id: "ws4",
    name: "Frontend",
    status: "warm",
    files: 31,
    actions: 22,
    lastActive: "1 day ago",
    detail: "Search UI, auth flows, component library updates.",
  },
  {
    id: "ws5",
    name: "Tests",
    status: "cold",
    files: 15,
    actions: 8,
    lastActive: "3 days ago",
    detail: "Unit + integration. Coverage at 71%.",
  },
];

const WORKSTREAM_SUMMARY = [
  { label: "Workstreams", value: "5", hint: "all time" },
  { label: "Active", value: "2", hint: "today" },
  { label: "Warm", value: "2", hint: "last 3 days" },
  { label: "Cold", value: "1", hint: "older" },
];

const FIXED_DATE_LABEL = "Thursday, Feb 26";
const adapter = getLandingDemoAdapter();

export interface DemoSurfaceProps {
  initialView?: IxosView;
  initialQuery?: string;
  initialMode?: SearchMode;
  presets?: string[];
  autoRun?: boolean;
  autoType?: boolean;
  className?: string;
  style?: CSSProperties;
  viewOverride?: IxosView;
  onViewChange?: (view: IxosView) => void;
  displayMode?: 'full' | 'search-only' | 'rail-only' | 'search-results-only';
  maxResults?: number;
  overrideResults?: IxosSearchResult[];
  overrideSelectedIndex?: number;
}

export function DemoSurface({
  initialView = "search",
  initialQuery = "authentication token refresh",
  initialMode = "auto",
  presets = DEFAULT_PRESETS,
  autoRun = true,
  autoType = false,
  className,
  style,
  viewOverride,
  onViewChange,
  displayMode = 'full',
  maxResults,
  overrideResults,
  overrideSelectedIndex,
}: DemoSurfaceProps) {
  const [view, setView] = useState<IxosView>(initialView);
  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState<SearchMode>(initialMode);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<IxosSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | undefined>();
  const [pipelineStats, setPipelineStats] = useState<PipelineStats>({
    filesScanned: 0,
    candidates: 0,
    embedded: 0,
    cacheHits: 0,
    stage: "",
  });
  const [stageLabel, setStageLabel] = useState<string>("");
  const [selectedWorkstream, setSelectedWorkstream] = useState<string | undefined>();

  const cancelRef = useRef<(() => void) | null>(null);
  const hasAutoRan = useRef(false);
  const lastInteractionRef = useRef<number>(Date.now());

  const handleInteraction = useCallback(() => {
    lastInteractionRef.current = Date.now();
  }, []);

  const runSearch = useCallback(async (nextQuery: string, nextMode: SearchMode) => {
    if (!nextQuery.trim()) {
      return;
    }

    if (cancelRef.current) {
      adapter.search.cancel();
      cancelRef.current = null;
    }

    setIsSearching(true);
    setResults([]);
    setSelectedIndex(undefined);
    setStageLabel("SCANNING");
    setPipelineStats({ filesScanned: 0, candidates: 0, embedded: 0, cacheHits: 0, stage: "scan" });

    let cancelled = false;
    cancelRef.current = () => {
      cancelled = true;
    };

    await adapter.search.search(nextQuery, nextMode, (event) => {
      if (cancelled) {
        return;
      }

      if (event.type === "progress" && event.progress) {
        const stageToLabel: Record<string, string> = {
          scan: "SCANNING",
          lexical: "LEXICAL",
          semantic: "SEMANTIC",
          refine: "REFINING",
          locked: "LOCKED",
          idle: "",
        };

        setStageLabel(stageToLabel[event.progress.stage] ?? "");
        setPipelineStats({
          filesScanned: event.progress.scanned,
          candidates: event.progress.candidates,
          embedded: event.progress.embedded,
          cacheHits: event.progress.cacheHits,
          stage: event.progress.stage,
        });
      }

      if (event.type === "result" && event.result) {
        setResults((current) => [...current, event.result!]);
      }

      if (event.type === "complete") {
        setIsSearching(false);
        setSelectedIndex(0);
        cancelRef.current = null;
      }
    });
  }, []);

  useEffect(() => {
    if (!autoType) return;

    let isCancelled = false;
    let currentPresetIndex = 0;

    const startTypingLoop = async () => {
      // initial wait before typing starts
      await new Promise(r => setTimeout(r, 1500));
      while (!isCancelled) {
        if (Date.now() - lastInteractionRef.current < 4000) {
          await new Promise(r => setTimeout(r, 500));
          continue;
        }

        // Clear user input and results before starting next sequence
        if (Date.now() - lastInteractionRef.current >= 4000) {
          setQuery("");
          runSearch("", mode);
        }
        
        // Brief pause after clear
        await new Promise(r => setTimeout(r, 400));
        if (isCancelled || Date.now() - lastInteractionRef.current < 4000) continue;

        const targetText = presets[currentPresetIndex % presets.length];

        for (let i = 0; i <= targetText.length; i++) {
          if (isCancelled || Date.now() - lastInteractionRef.current < 4000) break;
          setQuery(targetText.slice(0, i));
          await new Promise(r => setTimeout(r, 40 + Math.random() * 50));
        }

        if (isCancelled || Date.now() - lastInteractionRef.current < 4000) continue;

        runSearch(targetText, mode);

        // wait to show results
        await new Promise(r => setTimeout(r, 4500));

        if (isCancelled || Date.now() - lastInteractionRef.current < 4000) continue;

        // delete text
        for (let i = targetText.length; i >= 0; i--) {
          if (isCancelled || Date.now() - lastInteractionRef.current < 4000) break;
          setQuery(targetText.slice(0, i));
          await new Promise(r => setTimeout(r, 20));
        }

        currentPresetIndex++;
      }
    };

    startTypingLoop();

    return () => {
      isCancelled = true;
    };
  }, [autoType, mode, presets, runSearch]);

  useEffect(() => {
    if (viewOverride) {
      setView(viewOverride);
    }
  }, [viewOverride]);

  useEffect(() => {
    if (autoRun && !hasAutoRan.current) {
      hasAutoRan.current = true;
      const timer = setTimeout(() => {
        runSearch(initialQuery, initialMode);
      }, 700);
      return () => clearTimeout(timer);
    }
    return;
  }, [autoRun, initialMode, initialQuery, runSearch]);

  const handleSubmit = useCallback(() => {
    handleInteraction();
    runSearch(query, mode);
  }, [mode, query, runSearch, handleInteraction]);

  const handleModeChange = useCallback(
    (nextMode: SearchMode) => {
      handleInteraction();
      setMode(nextMode);
      if (results.length > 0 || isSearching) {
        runSearch(query, nextMode);
      }
    },
    [isSearching, query, results.length, runSearch, handleInteraction]
  );

  const handlePresetSelect = useCallback(
    (preset: string) => {
      handleInteraction();
      setQuery(preset);
      runSearch(preset, mode);
    },
    [mode, runSearch, handleInteraction]
  );

  const handleViewChange = useCallback(
    (nextView: IxosView) => {
      handleInteraction();
      setView(nextView);
      onViewChange?.(nextView);
    },
    [onViewChange, handleInteraction]
  );

  return (
    <AppWorldSurface
      view={view}
      onViewChange={handleViewChange}
      interactive={true}
      className={className}
      style={style}
      displayMode={displayMode}
      search={{
        query,
        onQueryChange: (q) => {
          handleInteraction();
          setQuery(q);
        },
        onSubmit: handleSubmit,
        presets: presets.length > 0 ? presets : DEFAULT_PRESETS,
        onPresetSelect: handlePresetSelect,
        mode,
        onModeChange: handleModeChange,
        stageLabel,
        isSearching,
        results: overrideResults ?? (maxResults ? results.slice(0, maxResults) : results),
        selectedIndex: overrideSelectedIndex ?? selectedIndex,
        onSelectResult: setSelectedIndex,
        hideSearchChrome: displayMode === 'search-results-only',
        pipelineStats: {
          filesScanned: pipelineStats.filesScanned,
          candidates: pipelineStats.candidates,
          embedded: pipelineStats.embedded,
          cacheHits: pipelineStats.cacheHits,
          stage: pipelineStats.stage,
        },
        interactive: true,
      }}
      today={{
        dateLabel: FIXED_DATE_LABEL,
        signals: TODAY_SIGNALS,
        resumeRows: TODAY_ROWS.slice(0, 1),
        recentRows: TODAY_ROWS.slice(1),
        suggestedRows: [],
      }}
      workstreams={{
        rows: WORKSTREAM_ROWS,
        summary: WORKSTREAM_SUMMARY,
        selectedId: selectedWorkstream,
        onSelectRow: setSelectedWorkstream,
      }}
    />
  );
}
