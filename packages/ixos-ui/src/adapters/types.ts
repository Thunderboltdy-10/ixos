/**
 * Adapter interfaces — the contract between UI surfaces and data sources.
 * Desktop provides real adapters. Landing provides demo adapters.
 * UI components are shared; data layer is swapped.
 */

import type { IxosSearchResult, IxosTodayRow, IxosTodaySignal, IxosWorkstreamRow } from "../types";

// ─── Search Adapter ──────────────────────────────────────────────────────────

export type SearchMode = "flash" | "auto" | "pro";
export type SearchStage = "idle" | "scan" | "lexical" | "semantic" | "refine" | "locked" | "scanning" | "reranking";

export interface SearchProgress {
  stage: SearchStage;
  scanned: number;
  candidates: number;
  embedded: number;
  cacheHits: number;
  elapsedMs: number;
}

export interface SearchStreamEvent {
  type: "progress" | "result" | "complete" | "error";
  progress?: SearchProgress;
  result?: IxosSearchResult;
  error?: string;
}

export interface SearchAdapter {
  /** Execute a search query. Yields streaming events. */
  search(
    query: string,
    mode: SearchMode,
    onEvent: (event: SearchStreamEvent) => void
  ): Promise<void>;
  /** Cancel an in-progress search */
  cancel(): void;
  /** Get available modes */
  getModes(): SearchMode[];
}

// ─── Today Adapter ────────────────────────────────────────────────────────────

export interface TodayAdapter {
  /** Get today's signals (performance/context metrics) */
  getSignals(): Promise<IxosTodaySignal[]>;
  /** Get recent activity rows */
  getRows(): Promise<IxosTodayRow[]>;
  /** Mark a row as active/resumed */
  resumeRow(id: string): Promise<void>;
}

// ─── Workstreams Adapter ──────────────────────────────────────────────────────

export interface WorkstreamsAdapter {
  /** Get all workstreams */
  getWorkstreams(): Promise<IxosWorkstreamRow[]>;
  /** Get details for a specific workstream */
  getDetail(id: string): Promise<IxosWorkstreamRow | null>;
  /** Open/activate a workstream */
  activateWorkstream(id: string): Promise<void>;
}

// ─── Combined App Adapter ─────────────────────────────────────────────────────

export interface AppAdapter {
  search: SearchAdapter;
  today: TodayAdapter;
  workstreams: WorkstreamsAdapter;
}
