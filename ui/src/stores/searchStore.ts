import { create } from 'zustand';
import type { SearchPhase, LexicalResult, RankedResult, SearchEvent, StreamStage, StreamStats, StreamEvent } from '@/lib/types';
import type { SearchThread } from '@/stores/starredStore';
import * as tauri from '@/lib/tauri';
import { useSettingsStore } from '@/stores/settingsStore';
import { sanitizeResults } from '@/lib/searchHistory';
import { useStarredStore } from '@/stores/starredStore';
import { useActivityStore } from '@/stores/activityStore';

const MAX_LEXICAL_DISPLAY = 50;
const MAX_SCAN_TRAIL = 6;

/// Translate backend error messages to user-friendly messages
function translateErrorMessage(error: string): string {
  const msg = String(error).toLowerCase();

  // Session/auth errors
  if (msg.includes('session expired') || msg.includes('unauthorized')) {
    return 'Your session has expired. Please sign in again to continue.';
  }
  if (msg.includes('authentication required') || msg.includes('no entitlement token')) {
    return 'Authentication required. Your session may have been transferred to another device.';
  }
  if (msg.includes('entitlement expired')) {
    return 'Your Pro subscription has expired. Please renew to continue searching.';
  }
  if (msg.includes('time change') || msg.includes('time suspect') || msg.includes('clock rollback')) {
    return 'We detected a device time change. Connect to the internet to refresh your Pro entitlement.';
  }
  if (msg.includes('entitlement token not issued for this device')) {
    return 'Your license is active on another device. Please transfer it to continue.';
  }

  // Model errors
  if (msg.includes('model') && msg.includes('not found')) {
    return 'Embedding model is not available. Please download a model in Settings.';
  }
  if (msg.includes('vocab.txt') || msg.includes('tokenizer')) {
    return 'Model files are incomplete. Please re-download the model.';
  }

  // Keep original message if no translation found
  return String(error);
}

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
  activeThreadId: string | null;
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
  restoreFromHistory: (thread: SearchThread) => void;

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
  activeThreadId: null,
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
      activeThreadId: null,
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
    const nextThreadId = crypto.randomUUID();
    set({
      lexicalResults: [],
      semanticResults: [],
      phase: 'lexical',
      statusMessage: 'Searching...',
      errorMessage: null,
      activeQuery: normalizedQuery,
      activeThreadId: nextThreadId,
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
      const modelType = settings?.modelType || 'ixos-flash-v1';
      const proModelType = settings?.proModelType || 'potion';

      // Ask Mode detection (question mark or question word)
      // Note: Ask Mode enhances query processing but does NOT force model selection
      // Users can use Ask Mode with Flash model for faster searches
      // Detection kept for future use (e.g., query enhancement)
      void (normalizedQuery.endsWith('?')
        || /^(who|what|when|where|how|why|find|show|whats|wheres|hows)\s/i.test(normalizedQuery));
      const settingsMode = settings?.searchMode || 'auto';
      // Respect user's selected search mode - don't force Pro for Ask Mode
      const searchMode = settingsMode;

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
        errorMessage: translateErrorMessage(String(error)),
      });
    }
  },

  cancelSearch: async () => {
    try {
      await tauri.cancelSearch();
      set({ phase: 'cancelled', activeThreadId: null });
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
        const results = state.semanticResults.length > 0 ? state.semanticResults : state.lexicalResults;
        const sanitized = sanitizeResults(results);
        const threadId = state.activeThreadId ?? crypto.randomUUID();
        const threadQuery = state.activeQuery ?? state.query;
        const existing = useStarredStore.getState().getThreadById(threadId);

        if (threadQuery && state.directory && !state.journalistMode) {
          useStarredStore.getState().recordThread({
            id: threadId,
            query: threadQuery,
            directory: state.directory,
            results: sanitized,
            timestamp: Date.now(),
            mode: state.journalistMode ? 'journalist' : state.cacheMode,
            resultCount: results.length,
            durationMs: state.searchStartTime ? Date.now() - state.searchStartTime : 0,
            starred: existing?.starred ?? false,
          });

          // Log search activity (Phase 2: Second Brain)
          useActivityStore.getState().logSearchQuery(threadQuery).catch(() => {
            // Silent failure - activity logging is non-critical
          });
        }

        // Increment search count safely
        get().setFileCount(state.fileCount || 0);

        set({ phase: 'complete', activeThreadId: threadId });
        break;
      }

      case 'cancelled':
        set({ phase: 'cancelled', activeThreadId: null });
        break;

      case 'error':
        set({
          phase: 'error',
          errorMessage: translateErrorMessage(event.message),
          activeThreadId: null,
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
      activeThreadId: null,
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

  restoreFromHistory: (thread) =>
    set(() => {
      const hasSemantic = thread.results.length > 0 && 'scoreBreakdown' in thread.results[0];
      const isJournalist = thread.mode === 'journalist';
      return {
        query: thread.query,
        directory: thread.directory,
        activeQuery: thread.query,
        activeThreadId: thread.id,
        journalistMode: isJournalist,
        cacheMode: isJournalist ? 'jit' : (thread.mode as 'cache' | 'jit'),
        lexicalResults: hasSemantic ? [] : thread.results as LexicalResult[],
        semanticResults: hasSemantic ? thread.results as RankedResult[] : [],
        lateResults: [],
        hasLateInsights: false,
        phase: 'complete' as SearchPhase,
        statusMessage: 'Loaded from history',
        errorMessage: null,
        selectedIndex: 0,
        searchStartTime: thread.durationMs > 0 ? Date.now() - thread.durationMs : null,
        streamStage: 'tail',
        streamStats: null,
        streamEvents: [],
        streamSequence: 0,
        scanTrail: [],
        pendingSparkTargets: [],
        hasSearchIntent: true,
      };
    }),

  // Result actions
  getSelectedResult: () => {
    const state = get();
    const results = state.semanticResults.length > 0 ? state.semanticResults : state.lexicalResults;
    return results[state.selectedIndex] || null;
  },

  openSelected: async () => {
    const result = get().getSelectedResult();
    const query = get().activeQuery;
    if (result) {
      try {
        await tauri.openFile(result.path);

        // Log file opened activity (Phase 2: Second Brain)
        useActivityStore.getState().logFileOpened(result.path, query ?? undefined).catch(() => {
          // Silent failure - activity logging is non-critical
        });
      } catch (error) {
        console.error('Failed to open file:', error);
        set({ errorMessage: `Failed to open file: ${result.filename}` });
      }
    }
  },

  revealSelected: async () => {
    const result = get().getSelectedResult();
    const query = get().activeQuery;
    if (result) {
      try {
        await tauri.revealInExplorer(result.path);

        // Log file revealed activity (Phase 2: Second Brain)
        useActivityStore.getState().logFileRevealed(result.path, query ?? undefined).catch(() => {
          // Silent failure - activity logging is non-critical
        });
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
