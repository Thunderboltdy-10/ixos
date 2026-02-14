/**
 * Starred searches store with encrypted persistence
 * Stores user-starred search queries and results
 */

import { create } from 'zustand';
import type { StoredResult } from '@/lib/searchHistory';
import { saveEncrypted, loadEncrypted } from '@/lib/storage';

const HISTORY_FILE = 'search_history.encrypted';
const LEGACY_STARRED_FILE = 'starred_searches.encrypted';
const MAX_THREADS = 100;

function normalizeMode(mode: string): 'native-cache' | 'ephemeral' | 'journalist' {
  if (mode === 'journalist') return 'journalist';
  if (mode === 'ephemeral' || mode === 'jit') return 'ephemeral';
  if (mode === 'native-cache' || mode === 'cache' || mode === 'persistent') return 'native-cache';
  return 'native-cache';
}

/**
 * A search thread represents one search session
 */
export interface SearchThread {
  id: string;
  query: string;
  directory: string;
  results: StoredResult[];
  timestamp: number;
  mode: 'native-cache' | 'ephemeral' | 'journalist';
  resultCount: number;
  durationMs: number;
  starred: boolean;
}

export interface HistorySuggestion {
  id: string;
  query: string;
  directory: string;
  resultCount: number;
  timestamp: number;
  mode: 'native-cache' | 'ephemeral' | 'journalist';
  starred: boolean;
}

interface StarredState {
  threads: SearchThread[];
  activeThreadId: string | null;
  isLoaded: boolean;
  isLoading: boolean;

  // Actions
  addThread: (thread: Omit<SearchThread, 'id' | 'timestamp'> & { starred?: boolean; id?: string; timestamp?: number }) => string;
  recordThread: (thread: SearchThread) => void;
  selectThread: (id: string) => void;
  deleteThread: (id: string) => void;
  toggleStar: (id: string) => void;
  clearAll: () => Promise<void>;

  // Getters
  getStarredThreads: () => SearchThread[];
  getRecentThreads: () => SearchThread[];
  getSuggestions: (prefix: string, limit?: number) => HistorySuggestion[];
  getThreadById: (id: string) => SearchThread | undefined;

  // Persistence
  loadStarred: () => Promise<void>;
  saveStarred: () => Promise<void>;
}

export const useStarredStore = create<StarredState>((set, get) => ({
  threads: [],
  activeThreadId: null,
  isLoaded: false,
  isLoading: false,

  addThread: (threadData) => {
    const nextId = threadData.id ?? crypto.randomUUID();
    const nextTimestamp = threadData.timestamp ?? Date.now();
    const nextThread: SearchThread = {
      ...threadData,
      id: nextId,
      timestamp: nextTimestamp,
      starred: threadData.starred ?? false,
    };

    set(state => ({
      threads: [nextThread, ...state.threads.filter(t =>
        t.id !== nextId &&
        !(t.query === nextThread.query && t.directory === nextThread.directory && !t.starred)
      )].slice(0, MAX_THREADS),
      activeThreadId: nextId,
    }));

    get().saveStarred();
    return nextId;
  },

  recordThread: (thread) => {
    set(state => ({
      threads: [thread, ...state.threads.filter(t =>
        t.id !== thread.id &&
        !(t.query === thread.query && t.directory === thread.directory && !t.starred)
      )].slice(0, MAX_THREADS),
      activeThreadId: thread.id,
    }));

    get().saveStarred();
  },

  selectThread: (id) => {
    set({ activeThreadId: id });
  },

  deleteThread: (id) => {
    set(state => ({
      threads: state.threads.filter(t => t.id !== id),
      activeThreadId: state.activeThreadId === id ? null : state.activeThreadId,
    }));

    // Save after delete
    get().saveStarred();
  },

  toggleStar: (id) => {
    set(state => ({
      threads: state.threads.map(t =>
        t.id === id ? { ...t, starred: !t.starred } : t
      ),
    }));

    // Save after toggle
    get().saveStarred();
  },

  getStarredThreads: () => {
    return get().threads.filter(t => t.starred);
  },

  getRecentThreads: () => {
    return get().threads.filter(t => !t.starred);
  },

  getSuggestions: (prefix, limit = 5) => {
    const trimmed = prefix.trim().toLowerCase();
    if (!trimmed) return [];

    const suggestions: HistorySuggestion[] = [];
    const seen = new Set<string>();

    for (const thread of get().threads) {
      if (!thread.query.toLowerCase().startsWith(trimmed)) continue;
      const key = `${thread.query}::${thread.directory}`;
      if (seen.has(key)) continue;
      seen.add(key);
      suggestions.push({
        id: thread.id,
        query: thread.query,
        directory: thread.directory,
        resultCount: thread.resultCount,
        timestamp: thread.timestamp,
        mode: thread.mode,
        starred: thread.starred,
      });
      if (suggestions.length >= limit) break;
    }

    return suggestions;
  },

  getThreadById: (id) => get().threads.find(t => t.id === id),

  clearAll: async () => {
    set({ threads: [], activeThreadId: null });
    await get().saveStarred();
  },

  loadStarred: async () => {
    set({ isLoading: true });

    try {
      const loaded = await loadEncrypted<{ threads: SearchThread[] }>(HISTORY_FILE);

      if (loaded?.threads) {
        set({
          threads: loaded.threads.slice(0, MAX_THREADS).map((thread) => ({
            ...thread,
            mode: normalizeMode(thread.mode),
          })),
          isLoaded: true,
        });
      } else {
        const legacy = await loadEncrypted<{ threads: SearchThread[] }>(LEGACY_STARRED_FILE);
        if (legacy?.threads) {
          const normalized = legacy.threads.slice(0, MAX_THREADS).map((thread) => ({
            ...thread,
            mode: normalizeMode(thread.mode),
          }));
          set({
            threads: normalized,
            isLoaded: true,
          });
          await saveEncrypted(HISTORY_FILE, { threads: normalized });
        } else {
          set({ isLoaded: true });
        }
      }
    } catch (error) {
      console.error('Failed to load starred searches:', error);
      set({ isLoaded: true });
    } finally {
      set({ isLoading: false });
    }
  },

  saveStarred: async () => {
    const { threads } = get();

    try {
      await saveEncrypted(HISTORY_FILE, { threads });
    } catch (error) {
      console.error('Failed to save starred searches:', error);
    }
  },
}));
