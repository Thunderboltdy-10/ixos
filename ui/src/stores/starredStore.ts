/**
 * Starred searches store with encrypted persistence
 * Stores user-starred search queries and results
 */

import { create } from 'zustand';
import type { StoredResult } from '@/lib/searchHistory';
import { saveEncrypted, loadEncrypted } from '@/lib/storage';

const HISTORY_FILE = 'search_history.encrypted';
const LEGACY_STARRED_FILE = 'starred_searches.encrypted';
const HISTORY_MIRROR_KEY = 'ixos:search_history_mirror_v2';
const MAX_THREADS = 100;
let saveQueue: Promise<void> = Promise.resolve();

function normalizeMode(mode: string): 'native-cache' | 'ephemeral' | 'deep-search' {
  if (mode === 'deep-search' || mode === 'journalist') return 'deep-search';
  if (mode === 'ephemeral' || mode === 'jit') return 'ephemeral';
  if (mode === 'native-cache' || mode === 'cache' || mode === 'persistent') return 'native-cache';
  return 'native-cache';
}

function normalizeThreads(threads: SearchThread[]): SearchThread[] {
  return threads.slice(0, MAX_THREADS).map((thread) => ({
    ...thread,
    mode: normalizeMode(thread.mode),
    isAskMode: thread.isAskMode ?? false,
  }));
}

function getLatestTimestamp(threads: SearchThread[]): number {
  return threads.reduce((latest, thread) => Math.max(latest, thread.timestamp), 0);
}

function readHistoryMirror(): SearchThread[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_MIRROR_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { threads?: SearchThread[] };
    if (!parsed.threads || !Array.isArray(parsed.threads)) return [];
    return normalizeThreads(parsed.threads);
  } catch {
    return [];
  }
}

function writeHistoryMirror(threads: SearchThread[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HISTORY_MIRROR_KEY, JSON.stringify({
      savedAt: Date.now(),
      threads,
    }));
  } catch {
    // Mirror writes are best-effort only.
  }
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
  mode: 'native-cache' | 'ephemeral' | 'deep-search';
  isAskMode?: boolean;
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
  mode: 'native-cache' | 'ephemeral' | 'deep-search';
  isAskMode?: boolean;
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
      isAskMode: threadData.isAskMode ?? false,
      starred: threadData.starred ?? false,
    };

    set(state => ({
      threads: [nextThread, ...state.threads.filter(t =>
        t.id !== nextId &&
        !(t.query === nextThread.query && t.directory === nextThread.directory && !t.starred)
      )].slice(0, MAX_THREADS),
      activeThreadId: nextId,
    }));

    void get().saveStarred();
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

    void get().saveStarred();
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
    void get().saveStarred();
  },

  toggleStar: (id) => {
    set(state => ({
      threads: state.threads.map(t =>
        t.id === id ? { ...t, starred: !t.starred } : t
      ),
    }));

    // Save after toggle
    void get().saveStarred();
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
        isAskMode: thread.isAskMode ?? false,
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
      const mirrorThreads = readHistoryMirror();

      if (loaded?.threads) {
        const encryptedThreads = normalizeThreads(loaded.threads);
        const preferredThreads =
          getLatestTimestamp(mirrorThreads) > getLatestTimestamp(encryptedThreads)
            ? mirrorThreads
            : encryptedThreads;

        set({
          threads: preferredThreads,
          isLoaded: true,
        });
      } else {
        const legacy = await loadEncrypted<{ threads: SearchThread[] }>(LEGACY_STARRED_FILE);
        if (legacy?.threads) {
          const normalized = normalizeThreads(legacy.threads);
          set({
            threads: normalized,
            isLoaded: true,
          });
          await saveEncrypted(HISTORY_FILE, { threads: normalized });
          writeHistoryMirror(normalized);
        } else {
          set({
            threads: mirrorThreads,
            isLoaded: true,
          });
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
    const snapshot = [...get().threads];
    writeHistoryMirror(snapshot);
    saveQueue = saveQueue
      .catch(() => undefined)
      .then(async () => {
        await saveEncrypted(HISTORY_FILE, { threads: snapshot });
      });

    try {
      await saveQueue;
    } catch (error) {
      console.error('Failed to save starred searches:', error);
    }
  },
}));
