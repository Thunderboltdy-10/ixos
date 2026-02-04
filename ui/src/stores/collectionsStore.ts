/**
 * Collections Store - Phase 3 Smart Features
 *
 * Manages saved search collections (smart folders):
 * - Save a search query + directory as a collection
 * - Quick re-run of previous searches
 * - Track result counts over time
 */

import { create } from 'zustand';
import { saveEncrypted, loadEncrypted } from '@/lib/storage';

const COLLECTIONS_FILE = 'collections.encrypted';

/**
 * Smart Collection - a saved search that can be re-run
 */
export interface SmartCollection {
  id: string;
  name: string;
  query: string;
  directory: string;
  createdAt: number;
  lastRefreshed: number;
  resultCount: number;
  /** Optional tags for organization */
  tags?: string[];
  /** Whether to show in sidebar */
  isPinned: boolean;
}

interface CollectionsState {
  collections: SmartCollection[];
  isLoaded: boolean;

  // Actions
  addCollection: (name: string, query: string, directory: string, resultCount?: number) => string;
  updateCollection: (id: string, updates: Partial<Omit<SmartCollection, 'id' | 'createdAt'>>) => void;
  removeCollection: (id: string) => void;
  pinCollection: (id: string, pinned: boolean) => void;
  refreshResultCount: (id: string, count: number) => void;

  // Getters
  getCollection: (id: string) => SmartCollection | undefined;
  getPinnedCollections: () => SmartCollection[];
  getRecentCollections: (limit?: number) => SmartCollection[];

  // Persistence
  loadCollections: () => Promise<void>;
  saveCollections: () => Promise<void>;
}

export const useCollectionsStore = create<CollectionsState>((set, get) => ({
  collections: [],
  isLoaded: false,

  addCollection: (name, query, directory, resultCount = 0) => {
    const id = `col-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();

    const newCollection: SmartCollection = {
      id,
      name,
      query,
      directory,
      createdAt: now,
      lastRefreshed: now,
      resultCount,
      isPinned: false,
    };

    set((state) => ({
      collections: [newCollection, ...state.collections],
    }));

    get().saveCollections();
    return id;
  },

  updateCollection: (id, updates) => {
    set((state) => ({
      collections: state.collections.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
    get().saveCollections();
  },

  removeCollection: (id) => {
    set((state) => ({
      collections: state.collections.filter((c) => c.id !== id),
    }));
    get().saveCollections();
  },

  pinCollection: (id, pinned) => {
    set((state) => ({
      collections: state.collections.map((c) =>
        c.id === id ? { ...c, isPinned: pinned } : c
      ),
    }));
    get().saveCollections();
  },

  refreshResultCount: (id, count) => {
    set((state) => ({
      collections: state.collections.map((c) =>
        c.id === id ? { ...c, resultCount: count, lastRefreshed: Date.now() } : c
      ),
    }));
    get().saveCollections();
  },

  getCollection: (id) => {
    return get().collections.find((c) => c.id === id);
  },

  getPinnedCollections: () => {
    return get().collections.filter((c) => c.isPinned);
  },

  getRecentCollections: (limit = 10) => {
    return get()
      .collections
      .sort((a, b) => b.lastRefreshed - a.lastRefreshed)
      .slice(0, limit);
  },

  loadCollections: async () => {
    try {
      const loaded = await loadEncrypted<{ collections: SmartCollection[] }>(COLLECTIONS_FILE);
      if (loaded?.collections) {
        set({ collections: loaded.collections, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch (error) {
      console.error('Failed to load collections:', error);
      set({ isLoaded: true });
    }
  },

  saveCollections: async () => {
    const { collections } = get();
    try {
      await saveEncrypted(COLLECTIONS_FILE, { collections });
    } catch (error) {
      console.error('Failed to save collections:', error);
    }
  },
}));
