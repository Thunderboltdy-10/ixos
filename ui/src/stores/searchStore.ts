import { create } from 'zustand';
import type { SearchPhase, LexicalResult, RankedResult, SearchEvent, StreamStage, StreamStats, StreamEvent } from '@/lib/types';
import * as tauri from '@/lib/tauri';
import { useSettingsStore } from '@/stores/settingsStore';

const MAX_LEXICAL_DISPLAY = 50;
const MAX_SCAN_TRAIL = 6;

function mergeLexicalResults(existing: LexicalResult[], incoming: LexicalResult[]): LexicalResult[] {
  if (incoming.length === 0) return existing;

  const byPath = new Map<string, LexicalResult>();
  for (const result of existing) {
    byPath.set(result.path, result);
  }
  for (const result of incoming) {
    byPath.set(result.path, result);
  }

  const merged = Array.from(byPath.values());
  merged.sort((a, b) => b.score - a.score);
  return merged.slice(0, MAX_LEXICAL_DISPLAY);
}

interface SearchState {
  // Query state
  query: string;
  directory: string;

  // Results
  lexicalResults: LexicalResult[];
  semanticResults: RankedResult[];
  lateResults: RankedResult[];
  hasLateInsights: boolean;

  // UI state
  phase: SearchPhase;
  statusMessage: string;
  errorMessage: string | null;
  activeQuery: string | null;
  selectedIndex: number;
  streamStage: StreamStage | null;
  streamStats: StreamStats | null;
  streamEvents: StreamEvent[];
  streamSequence: number;
  scanTrail: string[];

  // Animation state (Signal Rail)
  pendingSparkTargets: number[];  // Row indices awaiting spark animation
  hasSearchIntent: boolean;       // True when query.length >= 2

  // Privacy
  journalistMode: boolean;

  // Timing
  searchStartTime: number | null;
  cacheMode: 'cache' | 'jit';
  fileCount: number | null;

  // Actions
  setQuery: (query: string) => void;
  setDirectory: (directory: string) => void;
  setJournalistMode: (enabled: boolean) => void;
  setCacheMode: (mode: 'cache' | 'jit') => void;
  setSelectedIndex: (index: number) => void;
  moveSelection: (direction: 'up' | 'down') => void;
  clearResults: () => void;

  // Search actions
  startSearch: () => Promise<void>;
  cancelSearch: () => Promise<void>;
  handleSearchEvent: (event: SearchEvent) => void;
  reset: () => void;

  // Result actions
  getSelectedResult: () => RankedResult | LexicalResult | null;
  openSelected: () => Promise<void>;
  revealSelected: () => Promise<void>;

  // Late insights
  setLexicalResults: (results: LexicalResult[]) => void;
  setSemanticResults: (results: RankedResult[]) => void;
  addLateResult: (result: RankedResult) => void;
  revealLateResults: () => void;
  setFileCount: (count: number) => void;

  // Animation actions (Signal Rail)
  consumeSparkTarget: () => number | null;
  clearSparkTargets: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  // Initial state
  query: '',
  directory: '',
  lexicalResults: [],
  semanticResults: [],
  lateResults: [],
  hasLateInsights: false,
  phase: 'idle',
  statusMessage: '',
  errorMessage: null,
  activeQuery: null,
  selectedIndex: 0,
  streamStage: null,
  streamStats: null,
  streamEvents: [],
  streamSequence: 0,
  scanTrail: [],
  pendingSparkTargets: [],
  hasSearchIntent: false,
  journalistMode: false,
  searchStartTime: null,
  cacheMode: 'jit',
  fileCount: null,

  // Setters
  setQuery: (query) => set({ query, hasSearchIntent: query.trim().length >= 2 }),
  setDirectory: (directory) => set({ directory }),
  setJournalistMode: (enabled) => set({ journalistMode: enabled }),
  setCacheMode: (mode) => set({ cacheMode: mode }),
  setSelectedIndex: (index) => set({ selectedIndex: index }),
  clearResults: () =>
    set({
      lexicalResults: [],
      semanticResults: [],
      lateResults: [],
      hasLateInsights: false,
      phase: 'idle',
      statusMessage: '',
      errorMessage: null,
      activeQuery: null,
      selectedIndex: 0,
      streamStage: null,
      streamStats: null,
      streamEvents: [],
      streamSequence: 0,
      scanTrail: [],
      pendingSparkTargets: [],
      searchStartTime: null,
    }),

  moveSelection: (direction) => {
    const state = get();
    const results = state.semanticResults.length > 0 ? state.semanticResults : state.lexicalResults;
    const maxIndex = results.length - 1;

    if (direction === 'up') {
      set({ selectedIndex: Math.max(0, state.selectedIndex - 1) });
    } else {
      set({ selectedIndex: Math.min(maxIndex, state.selectedIndex + 1) });
    }
  },

  // Search actions
  startSearch: async () => {
    const state = get();
    if (!state.query.trim() || !state.directory) return;

    const normalizedQuery = state.query.trim();
    if ((state.phase === 'lexical' || state.phase === 'semantic') && state.activeQuery === normalizedQuery) {
      return;
    }

    if (state.phase === 'lexical' || state.phase === 'semantic') {
      try {
        await tauri.cancelSearch();
      } catch (error) {
        console.warn('Failed to cancel previous search:', error);
      }
    }

    // Reset results and start search
    set({
      lexicalResults: [],
      semanticResults: [],
      phase: 'lexical',
      statusMessage: 'Searching...',
      errorMessage: null,
      activeQuery: normalizedQuery,
      selectedIndex: 0,
      searchStartTime: Date.now(),
      streamStage: 'lexical',
      streamStats: {
        filesScanned: 0,
        candidates: 0,
        embedded: 0,
        cacheHits: 0,
      },
      streamEvents: [],
      streamSequence: 0,
      scanTrail: [],
    });

    try {
      // Get model type from settings store (using static import)
      const settings = useSettingsStore.getState().config?.search;
      const modelType = settings?.modelType || 'ixos-flash-v2';
      const proModelType = settings?.proModelType || 'ixos-pro-v1';
      const searchMode = settings?.searchMode || 'auto';
      const timeoutSeconds = settings?.timeoutSeconds || 30;

      await tauri.searchProgressive(state.query, state.directory, {
        journalistMode: state.journalistMode,
        contextLines: 3,
        cacheMode: state.cacheMode,
        modelType: modelType,
        proModelType: proModelType,
        searchMode: searchMode,
        timeoutSeconds: timeoutSeconds,
      });
    } catch (error) {
      set({
        phase: 'error',
        errorMessage: String(error),
      });
    }
  },

  cancelSearch: async () => {
    try {
      await tauri.cancelSearch();
      set({ phase: 'cancelled' });
    } catch (error) {
      console.error('Failed to cancel search:', error);
    }
  },

  handleSearchEvent: (event) => {
    switch (event.type) {
      case 'lexicalResults':
        set({
          lexicalResults: event.results,
          phase: 'lexical',
          statusMessage: `Found ${event.count} quick results`,
        });
        break;

      case 'lexicalBatch':
        set((state) => ({
          lexicalResults: mergeLexicalResults(state.lexicalResults, event.results),
          phase: 'lexical',
        }));
        break;

      case 'status':
        set((state) => ({
          statusMessage: event.message,
          phase: event.message.toLowerCase().includes('refining') ? 'refining' : state.phase,
        }));
        break;

      case 'semanticResults': {
        const currentCount = get().semanticResults.length;
        const newCount = event.results.length;
        // Queue spark targets for new results
        const newTargets = Array.from(
          { length: Math.max(0, newCount - currentCount) },
          (_, i) => currentCount + i
        );
        set((state) => ({
          semanticResults: event.results,
          phase: 'semantic',
          statusMessage: `Found ${event.count} results`,
          selectedIndex: 0,
          pendingSparkTargets: [...state.pendingSparkTargets, ...newTargets],
        }));
        break;
      }

      case 'lateResult':
        get().addLateResult(event.result);
        break;

      case 'streamUpdate':
        set((state) => {
          const scanEvents = event.events
            .filter((item) => item.kind === 'scan' && item.path)
            .map((item) => item.path as string);
          const scanTrail = scanEvents.length > 0
            ? [...state.scanTrail, ...scanEvents].slice(-MAX_SCAN_TRAIL)
            : state.scanTrail;

          let statusMessage = state.statusMessage;
          if (event.stage === 'lexical') {
            statusMessage = 'Scanning files';
          } else if (event.stage === 'semantic') {
            statusMessage = 'Understanding matches';
          } else if (event.stage === 'refining') {
            statusMessage = 'Refining matches';
          } else if (event.stage === 'tail') {
            statusMessage = 'Finalizing results';
          }

          return {
            streamStage: event.stage,
            streamStats: event.stats,
            streamEvents: event.events,
            streamSequence: state.streamSequence + 1,
            scanTrail,
            statusMessage,
            phase: event.stage === 'refining' ? 'refining' : state.phase,
          };
        });
        break;

      case 'complete': {
        const state = get();
        // Increment search count safely
        get().setFileCount(state.fileCount || 0);

        set({ phase: 'complete' });
        break;
      }

      case 'cancelled':
        set({ phase: 'cancelled' });
        break;

      case 'error':
        set({
          phase: 'error',
          errorMessage: event.message,
        });
        break;
    }
  },

  reset: () =>
    set({
      query: '',
      lexicalResults: [],
      semanticResults: [],
      lateResults: [],
      hasLateInsights: false,
      phase: 'idle',
      statusMessage: '',
      errorMessage: null,
      activeQuery: null,
      selectedIndex: 0,
      fileCount: null,
      streamStage: null,
      streamStats: null,
      streamEvents: [],
      streamSequence: 0,
      scanTrail: [],
      pendingSparkTargets: [],
      hasSearchIntent: false,
    }),

  // Result actions
  getSelectedResult: () => {
    const state = get();
    const results = state.semanticResults.length > 0 ? state.semanticResults : state.lexicalResults;
    return results[state.selectedIndex] || null;
  },

  openSelected: async () => {
    const result = get().getSelectedResult();
    if (result) {
      try {
        await tauri.openFile(result.path);
      } catch (error) {
        console.error('Failed to open file:', error);
        set({ errorMessage: `Failed to open file: ${result.filename}` });
      }
    }
  },

  revealSelected: async () => {
    const result = get().getSelectedResult();
    if (result) {
      try {
        await tauri.revealInExplorer(result.path);
      } catch (error) {
        console.error('Failed to reveal file:', error);
        set({ errorMessage: `Failed to reveal file: ${result.filename}` });
      }
    }
  },

  // Late insights actions
  setLexicalResults: (results) => set({ lexicalResults: results }),

  setSemanticResults: (results) => set({ semanticResults: results }),

  addLateResult: (result) => {
    const state = get();
    // Only add if search is complete and result isn't already in semantic results
    if (state.phase === 'complete' || state.phase === 'semantic') {
      const existingPaths = new Set(state.semanticResults.map(r => r.path));
      if (!existingPaths.has(result.path)) {
        set({
          lateResults: [...state.lateResults, result],
          hasLateInsights: true,
        });
      }
    }
  },

  revealLateResults: () => {
    const state = get();
    // Merge late results into semantic results and clear late results
    set({
      semanticResults: [...state.semanticResults, ...state.lateResults],
      lateResults: [],
      hasLateInsights: false,
    });
  },

  setFileCount: (count) => set({ fileCount: count }),

  // Animation actions (Signal Rail)
  consumeSparkTarget: () => {
    const state = get();
    if (state.pendingSparkTargets.length === 0) return null;
    const [target, ...rest] = state.pendingSparkTargets;
    set({ pendingSparkTargets: rest });
    return target;
  },

  clearSparkTargets: () => set({ pendingSparkTargets: [] }),
}));
