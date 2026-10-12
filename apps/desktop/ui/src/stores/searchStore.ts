import { create } from "zustand";
import { useSettingsStore } from "./settingsStore";
import * as tauri from "@/lib/tauri";
import type {
  RecentSearch,
  SearchPhase,
  SearchResult,
  SearchStats,
} from "@/lib/types";
let generation = 0;
interface SearchState {
  query: string;
  activeQuery: string;
  activeDirectory: string;
  activeProfile: string;
  directory: string;
  results: SearchResult[];
  phase: SearchPhase;
  resultMode: "lexical" | "hybrid";
  selectedIndex: number;
  errorMessage: string | null;
  noticeMessage: string | null;
  streamStats: SearchStats | null;
  hasSearchIntent: boolean;
  searchStartTime: number | null;
  searchEndTime: number | null;
  pendingSparkTargets: number[];
  setQuery: (query: string) => void;
  setDirectory: (directory: string) => void;
  setSelectedIndex: (index: number) => void;
  startSearch: () => Promise<void>;
  cancelSearch: () => Promise<void>;
  reset: () => void;
  resume: (recent: RecentSearch) => void;
  openSelected: () => Promise<void>;
  revealSelected: () => Promise<void>;
  consumeSparkTarget: (index: number) => void;
}
export const useSearchStore = create<SearchState>((set, get) => ({
  query: "",
  activeQuery: "",
  activeDirectory: "",
  activeProfile: "",
  directory: "",
  results: [],
  phase: "idle",
  resultMode: "lexical",
  selectedIndex: 0,
  errorMessage: null,
  noticeMessage: null,
  streamStats: null,
  hasSearchIntent: false,
  searchStartTime: null,
  searchEndTime: null,
  pendingSparkTargets: [],
  setQuery: (query) => set({ query }),
  setDirectory: (directory) => set({ directory }),
  setSelectedIndex: (index) =>
    set({
      selectedIndex: Math.max(0, Math.min(index, get().results.length - 1)),
    }),
  startSearch: async () => {
    const { query, directory } = get();
    if (!query.trim()) return;
    const request = ++generation;
    set({
      activeQuery: query,
      activeDirectory: directory,
      activeProfile:
        useSettingsStore.getState().config?.search.profile ?? "code",
      phase: "discover",
      results: [],
      selectedIndex: 0,
      errorMessage: null,
      noticeMessage: null,
      hasSearchIntent: true,
      searchStartTime: Date.now(),
      searchEndTime: null,
      streamStats: null,
      pendingSparkTargets: [],
    });
    try {
      await tauri.searchProgressive(query, directory, (event) => {
        if (generation !== request) return;
        if (event.type === "phase") set({ phase: event.stage });
        else if (event.type === "warning")
          set({ noticeMessage: event.message });
        else if (event.type === "complete")
          set({ phase: "complete", searchEndTime: Date.now() });
        else {
          const previous = get().results[get().selectedIndex]?.path;
          const index = event.results.findIndex(
            (result) => result.path === previous,
          );
          set({
            results: event.results,
            streamStats: event.stats,
            phase: event.type === "lexicalResults" ? "lexical" : "semantic",
            resultMode: event.type === "lexicalResults" ? "lexical" : "hybrid",
            selectedIndex: Math.max(0, index),
            pendingSparkTargets: event.results
              .slice(0, 6)
              .map((_, index) => index),
          });
        }
      });
    } catch (error) {
      if (generation === request)
        set({
          phase: "error",
          errorMessage: String(error),
          searchEndTime: Date.now(),
        });
    }
  },
  cancelSearch: async () => {
    ++generation;
    set({
      phase: "cancelled",
      searchEndTime: Date.now(),
      pendingSparkTargets: [],
    });
    await tauri.cancelSearch();
  },
  reset: () => {
    ++generation;
    void tauri.cancelSearch();
    set({
      query: "",
      activeQuery: "",
      results: [],
      phase: "idle",
      selectedIndex: 0,
      errorMessage: null,
      noticeMessage: null,
      hasSearchIntent: false,
      streamStats: null,
      pendingSparkTargets: [],
      searchStartTime: null,
      searchEndTime: null,
    });
  },
  resume: (recent) => {
    set({ query: recent.query, directory: recent.directory || "" });
    void get().startSearch();
  },
  openSelected: async () => {
    const result = get().results[get().selectedIndex];
    if (result) await tauri.openFile(result.path);
  },
  revealSelected: async () => {
    const result = get().results[get().selectedIndex];
    if (result) await tauri.revealInExplorer(result.path);
  },
  consumeSparkTarget: (index) =>
    set((state) => ({
      pendingSparkTargets: state.pendingSparkTargets.filter(
        (target) => target !== index,
      ),
    })),
}));
