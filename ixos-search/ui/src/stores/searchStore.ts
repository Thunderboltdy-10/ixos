import { create } from 'zustand';
import type { SearchPhase, LexicalResult, RankedResult, SearchEvent, StreamStage, StreamStats, StreamEvent } from '@/lib/types';
import type { SearchThread } from '@/stores/starredStore';
import * as tauri from '@/lib/tauri';
import { useSettingsStore } from '@/stores/settingsStore';
import { sanitizeResults } from '@/lib/searchHistory';
import { useStarredStore } from '@/stores/starredStore';
import { useActivityStore } from '@/stores/activityStore';
const MAX_LEXICAL_DISPLAY = 50;
const MAX_SCAN_TRAIL = 24;
const DUPLICATE_EVENT_WINDOW_MS = 40;
let lastSearchEventDigest: string | null = null;
let lastSearchEventAt = 0;
function digestSearchEvent(event: SearchEvent): string {
    try {
        return JSON.stringify(event);
    }
    catch {
        return `${event.type}:${Date.now()}`;
    }
}
function shouldDeduplicateEvent(event: SearchEvent): boolean {
    // Stream and lexical batch updates can legitimately repeat frequently.
    // Deduping these makes the UI appear frozen.
    return event.type !== 'streamUpdate' && event.type !== 'lexicalBatch';
}
/// Translate backend error messages to user-friendly messages
function translateErrorMessage(error: string): string {

    return String(error);
}
function mergeLexicalResults(existing: LexicalResult[], incoming: LexicalResult[]): LexicalResult[] {
    if (incoming.length === 0)
        return existing;
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
    pendingSparkTargets: number[]; // Row indices awaiting spark animation
    hasSearchIntent: boolean; // True when query.length >= 2
    // Privacy
    deepSearchMode: boolean;
    // Timing
    searchStartTime: number | null;
    cacheMode: 'native-cache' | 'ephemeral';
    fileCount: number | null;
    // Ask Mode
    isAskModeActive: boolean; // Computed from query-level auto hinting
    // Actions
    setQuery: (query: string) => void;
    setDirectory: (directory: string) => void;
    setDeepSearchMode: (enabled: boolean) => void;
    setCacheMode: (mode: 'native-cache' | 'ephemeral') => void;
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
    deepSearchMode: false,
    searchStartTime: null,
    cacheMode: 'native-cache',
    fileCount: null,
    isAskModeActive: false,
    // Setters
    setQuery: (query) => set({ query, hasSearchIntent: query.trim().length >= 2 }),
    setDirectory: (directory) => set({ directory }),
    setDeepSearchMode: (enabled) => set({ deepSearchMode: enabled }),
    setCacheMode: (mode) => set({ cacheMode: mode }),
    setSelectedIndex: (index) => set({ selectedIndex: index }),
    clearResults: () => set({
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
        isAskModeActive: false,
    }),
    moveSelection: (direction) => {
        const state = get();
        const results = state.semanticResults.length > 0 ? state.semanticResults : state.lexicalResults;
        const maxIndex = results.length - 1;
        if (direction === 'up') {
            set({ selectedIndex: Math.max(0, state.selectedIndex - 1) });
        }
        else {
            set({ selectedIndex: Math.min(maxIndex, state.selectedIndex + 1) });
        }
    },
    // Search actions
    startSearch: async () => {
        const state = get();
        if (!state.query.trim() || !state.directory)
            return;
        const normalizedQuery = state.query.trim();
        if ((state.phase === 'lexical' || state.phase === 'semantic') && state.activeQuery === normalizedQuery) {
            return;
        }
        if (state.phase === 'lexical' || state.phase === 'semantic') {
            try {
                await tauri.cancelSearch();
            }
            catch (error) {
                console.warn('Failed to cancel previous search:', error);
            }
        }
        // Reset results and start search
        const nextThreadId = crypto.randomUUID();
        lastSearchEventDigest = null;
        lastSearchEventAt = 0;
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
            const modelType = settings?.modelType || 'ixos-flash-v2';
            const proModelType = settings?.proModelType || 'ixos-pro-v2';
            // Ask mode is backend-detected; UI sends only an automatic hint.
            set({ isAskModeActive: false });
            const searchMode = settings?.searchMode || 'auto';
            const timeoutSeconds = settings?.timeoutSeconds || 30;
            // Pass event handler via Channel API — events are scoped to this
            // command invocation with guaranteed ordering and no missed events.
            const handleEvent = get().handleSearchEvent;
            await tauri.searchProgressive(state.query, state.directory, {
                deepSearch: state.deepSearchMode,
                contextLines: 3,
                cacheMode: state.cacheMode,
                modelType: modelType,
                proModelType: proModelType,
                searchMode: searchMode,
                timeoutSeconds: timeoutSeconds,
                isAskMode: 'auto',
            }, handleEvent);
        }
        catch (error) {
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
        }
        catch (error) {
            console.error('Failed to cancel search:', error);
        }
    },
    handleSearchEvent: (event) => {
        if (shouldDeduplicateEvent(event)) {
            const digest = digestSearchEvent(event);
            const now = Date.now();
            if (digest === lastSearchEventDigest && now - lastSearchEventAt <= DUPLICATE_EVENT_WINDOW_MS) {
                return;
            }
            lastSearchEventDigest = digest;
            lastSearchEventAt = now;
        }
        switch (event.type) {
            case 'lexicalResults':
                set({
                    lexicalResults: event.results,
                    phase: 'lexical',
                    statusMessage: `Found ${event.count} quick results`,
                    streamStage: 'lexical',
                });
                break;
            case 'lexicalBatch':
                set((state) => {
                    const mergedLexical = mergeLexicalResults(state.lexicalResults, event.results);
                    const previousStats = state.streamStats ?? {
                        filesScanned: 0,
                        candidates: 0,
                        embedded: 0,
                        cacheHits: 0,
                    };
                    const batchFiles = event.results.length;
                    const scanTrail = [
                        ...state.scanTrail,
                        ...event.results.map((result) => result.path),
                    ].slice(-MAX_SCAN_TRAIL);
                    return {
                        lexicalResults: mergedLexical,
                        phase: 'lexical',
                        streamStage: 'lexical',
                        scanTrail,
                        streamStats: {
                            ...previousStats,
                            filesScanned: previousStats.filesScanned + batchFiles,
                            candidates: Math.max(previousStats.candidates, mergedLexical.length),
                        },
                        streamSequence: state.streamSequence + 1,
                        statusMessage: `Scanning ${previousStats.filesScanned + batchFiles} files`,
                    };
                });
                break;
            case 'status':
                set((state) => ({
                    ...(() => {
                        const lowered = event.message.toLowerCase();
                        const askModeActivated = lowered.includes('ask mode active') ||
                            lowered.includes('understanding your question');
                        const askModeLocked = lowered.includes('ask mode requires pro');
                        return {
                            isAskModeActive: askModeLocked
                                ? false
                                : state.isAskModeActive || askModeActivated,
                        };
                    })(),
                    statusMessage: event.message,
                    phase: (() => {
                        const lowered = event.message.toLowerCase();
                        if (lowered.includes('refining'))
                            return 'refining';
                        if (lowered.includes('understanding') || lowered.includes('collecting evidence')) {
                            return state.semanticResults.length > 0 ? state.phase : 'semantic';
                        }
                        return state.phase;
                    })(),
                    streamStage: (() => {
                        const lowered = event.message.toLowerCase();
                        if (lowered.includes('refining'))
                            return 'refining';
                        if (lowered.includes('understanding') || lowered.includes('semantic') || lowered.includes('collecting evidence')) {
                            return 'semantic';
                        }
                        return state.streamStage;
                    })(),
                }));
                break;
            case 'semanticResults': {
                const state = get();
                const previousSelectedPath = state.semanticResults[state.selectedIndex]?.path ??
                    state.lexicalResults[state.selectedIndex]?.path ??
                    null;
                const currentCount = state.semanticResults.length;
                const newCount = event.results.length;
                // Queue spark targets for new results
                const newTargets = Array.from({ length: Math.max(0, newCount - currentCount) }, (_, i) => currentCount + i);
                const nextSelectedIndex = (() => {
                    if (previousSelectedPath) {
                        const matchedIndex = event.results.findIndex((result) => result.path === previousSelectedPath);
                        if (matchedIndex >= 0)
                            return matchedIndex;
                    }
                    // Reset to first result when semantic results first arrive (no previous semantic selection)
                    if (currentCount === 0)
                        return 0;
                    return state.selectedIndex < newCount ? state.selectedIndex : 0;
                })();
                set((state) => ({
                    semanticResults: event.results,
                    phase: 'semantic',
                    statusMessage: `Found ${event.count} results`,
                    streamStage: 'semantic',
                    streamStats: {
                        filesScanned: state.streamStats?.filesScanned ?? 0,
                        candidates: Math.max(state.streamStats?.candidates ?? 0, event.count),
                        embedded: Math.max(state.streamStats?.embedded ?? 0, event.count),
                        cacheHits: state.streamStats?.cacheHits ?? 0,
                    },
                    selectedIndex: nextSelectedIndex,
                    pendingSparkTargets: [...state.pendingSparkTargets, ...newTargets],
                }));
                break;
            }
            case 'lateResult':
                get().addLateResult(event.result);
                break;
            case 'streamUpdate':
                set((state) => {
                    const stats = {
                        filesScanned: Number((event.stats as unknown as Record<string, number | undefined>).filesScanned ??
                            (event.stats as unknown as Record<string, number | undefined>).files_scanned ??
                            state.streamStats?.filesScanned ??
                            0),
                        candidates: Number((event.stats as unknown as Record<string, number | undefined>).candidates ??
                            state.streamStats?.candidates ??
                            0),
                        embedded: Number((event.stats as unknown as Record<string, number | undefined>).embedded ??
                            state.streamStats?.embedded ??
                            0),
                        cacheHits: Number((event.stats as unknown as Record<string, number | undefined>).cacheHits ??
                            (event.stats as unknown as Record<string, number | undefined>).cache_hits ??
                            state.streamStats?.cacheHits ??
                            0),
                    };
                    const scanEvents = event.events
                        .map((item) => {
                        const raw = item as unknown as Record<string, unknown>;
                        return raw.path ?? raw.pathHint;
                    })
                        .filter((path): path is string => typeof path === 'string' && path.length > 0);
                    const scanTrail = scanEvents.length > 0
                        ? [...state.scanTrail, ...scanEvents].slice(-MAX_SCAN_TRAIL)
                        : state.scanTrail;
                    let statusMessage = state.statusMessage;
                    if (event.stage === 'lexical') {
                        statusMessage = 'Scanning files';
                    }
                    else if (event.stage === 'semantic') {
                        statusMessage = 'Understanding matches';
                    }
                    else if (event.stage === 'refining') {
                        statusMessage = 'Refining matches';
                    }
                    else if (event.stage === 'tail') {
                        statusMessage = 'Finalizing results';
                    }
                    const phase = event.stage === 'lexical'
                        ? 'lexical'
                        : event.stage === 'semantic'
                            ? 'semantic'
                            : event.stage === 'refining'
                                ? 'refining'
                                : state.phase;
                    const nextStage = event.stage === 'echo' ? state.streamStage : event.stage;
                    return {
                        streamStage: nextStage,
                        streamStats: stats,
                        streamEvents: event.events,
                        streamSequence: state.streamSequence + 1,
                        scanTrail,
                        statusMessage,
                        phase,
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
                if (threadQuery && state.directory) {
                    useStarredStore.getState().recordThread({
                        id: threadId,
                        query: threadQuery,
                        directory: state.directory,
                        results: sanitized,
                        timestamp: Date.now(),
                        mode: state.deepSearchMode ? 'deep-search' : state.cacheMode,
                        isAskMode: state.isAskModeActive,
                        resultCount: results.length,
                        durationMs: state.searchStartTime ? Date.now() - state.searchStartTime : 0,
                        starred: existing?.starred ?? false,
                    });
                    // Also save to global history store for backend persistence
                    import('./historyStore').then(({ useHistoryStore }) => {
                        useHistoryStore.getState().addToHistory(threadQuery, state.directory, results.length);
                    });
                }
                // Log search activity (Phase 2: Second Brain)
                useActivityStore.getState().logSearchQuery(threadQuery).catch(() => {
                    // Silent failure - activity logging is non-critical
                });
                // Log top shown result paths for workstream clustering.
                const topResultPaths = results.slice(0, 5).map((result) => result.path);
                for (const resultPath of topResultPaths) {
                    useActivityStore.getState().logResultShown(resultPath, threadQuery).catch(() => {
                        // Silent failure - activity logging is non-critical
                    });
                }
                // Auto-recluster workstreams after search completes (Pro feature)
                // This ensures the Today Tab stays up-to-date without manual intervention
                tauri.reclusterWorkstreams().catch(() => {
                    // Reclustering is optional; search remains usable if it fails
                });
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
    reset: () => set({
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
        isAskModeActive: false,
    }),
    restoreFromHistory: (thread) => set(() => {
        const hasSemantic = thread.results.length > 0 && 'scoreBreakdown' in thread.results[0];
        const modeValue = String(thread.mode);
        const isDeepSearch = modeValue === 'deep-search' || modeValue === 'journalist';
        const restoredCacheMode = modeValue === 'native-cache' || modeValue === 'cache' || modeValue === 'persistent' || modeValue === 'local'
            ? 'native-cache'
            : 'ephemeral';
        return {
            query: thread.query,
            directory: thread.directory,
            activeQuery: thread.query,
            activeThreadId: thread.id,
            deepSearchMode: isDeepSearch,
            cacheMode: restoredCacheMode,
            isAskModeActive: thread.isAskMode ?? false,
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
                // Log result clicked BEFORE opening (Phase 2: Second Brain)
                // This captures the user's selection intent for co-occurrence analysis
                useActivityStore.getState().logResultClicked(result.path, query ?? '').catch(() => {
                    // Silent failure - activity logging is non-critical
                });
                await tauri.openFile(result.path);
                // Log file opened activity (Phase 2: Second Brain)
                useActivityStore.getState().logFileOpened(result.path, query ?? undefined).catch(() => {
                    // Silent failure - activity logging is non-critical
                });
            }
            catch (error) {
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
            }
            catch (error) {
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
        if (state.pendingSparkTargets.length === 0)
            return null;
        const [target, ...rest] = state.pendingSparkTargets;
        set({ pendingSparkTargets: rest });
        return target;
    },
    clearSparkTargets: () => set({ pendingSparkTargets: [] }),
}));
