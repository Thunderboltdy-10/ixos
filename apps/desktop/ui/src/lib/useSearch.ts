import { useEffect, useRef, useState } from "react";
import { search, type Result, type SearchStats } from "./api";

export type Stage = "idle" | "keywords" | "meaning" | "done" | "error";

export interface SearchState {
  stage: Stage;
  results: Result[];
  parts: [number, number][];
  /** Milliseconds until the latest results arrived. */
  elapsedMs: number | null;
  files: number;
  corrections: SearchStats["queryCorrections"];
  message: string | null;
}

const idle: SearchState = {
  stage: "idle",
  results: [],
  parts: [],
  elapsedMs: null,
  files: 0,
  corrections: [],
  message: null,
};

/** Keyword results arrive first, then the same files re-ranked by meaning. */
export function useSearch(query: string, folder: string | null): SearchState {
  const [state, setState] = useState<SearchState>(idle);
  const latest = useRef(0);
  useEffect(() => {
    const text = query.trim();
    const request = ++latest.current;
    if (!text) {
      setState(idle);
      return;
    }
    const current = () => request === latest.current;
    const timer = window.setTimeout(() => {
      setState((previous) => ({ ...previous, stage: "keywords", message: null }));
      search(text, folder, (event) => {
        if (!current()) return;
        if (event.type === "lexicalResults" || event.type === "semanticResults") {
          setState((previous) => ({
            ...previous,
            stage: event.type === "lexicalResults" ? "meaning" : "done",
            results: event.results,
            parts: event.stats.scoreParts ?? [],
            elapsedMs: event.elapsedMs,
            files: event.stats.searchableFiles,
            corrections: event.stats.queryCorrections ?? [],
          }));
        } else if (event.type === "warning") {
          setState((previous) => ({ ...previous, message: event.message }));
        } else if (event.type === "complete") {
          setState((previous) => ({ ...previous, stage: "done" }));
        }
      }).catch((error) => {
        if (current()) setState({ ...idle, stage: "error", message: String(error) });
      });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [query, folder]);
  return state;
}

export function progressOf(stage: Stage) {
  return { idle: null, keywords: 0.2, meaning: 0.6, done: 1, error: null }[stage];
}
