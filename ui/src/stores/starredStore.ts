/**
 * Starred searches store with encrypted persistence
 * Stores user-starred search queries and results
 */

import { create } from 'zustand';
import type { RankedResult, LexicalResult } from '@/lib/types';
import { saveEncrypted, loadEncrypted } from '@/lib/storage';

const STARRED_FILE = 'starred_searches.encrypted';
const MAX_THREADS = 100;

/**
 * A search thread represents one search session
 */
export interface SearchThread {
  id: string;
  query: string;
  directory: string;
  results: RankedResult[] | LexicalResult[];
  timestamp: number;
  mode: 'cache' | 'jit' | 'journalist';
  resultCount: number;
  durationMs: number;
  starred: boolean;
}

interface StarredState {
  threads: SearchThread[];
  activeThreadId: string | null;
  isLoaded: boolean;
  isLoading: boolean;

  // Actions
  addThread: (thread: Omit<SearchThread, 'id' | 'timestamp' | 'starred'>) => void;
  selectThread: (id: string) => void;
  deleteThread: (id: string) => void;
  toggleStar: (id: string) => void;
  clearAll: () => Promise<void>;

  // Getters
  getStarredThreads: () => SearchThread[];

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
    const newThread: SearchThread = {
      ...threadData,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      starred: true, // Already starred when added via star button
    };

    set(state => ({
      threads: [newThread, ...state.threads].slice(0, MAX_THREADS),
      activeThreadId: newThread.id,
    }));

    // Save async (don't block UI)
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

  clearAll: async () => {
    set({ threads: [], activeThreadId: null });
    await get().saveStarred();
  },

  loadStarred: async () => {
    set({ isLoading: true });

    try {
      const loaded = await loadEncrypted<{ threads: SearchThread[] }>(STARRED_FILE);

      if (loaded?.threads) {
        set({
          threads: loaded.threads.slice(0, MAX_THREADS),
          isLoaded: true,
        });
      } else {
        set({ isLoaded: true });
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
      await saveEncrypted(STARRED_FILE, { threads });
    } catch (error) {
      console.error('Failed to save starred searches:', error);
    }
  },
}));
