/**
 * Today Store - Phase 2 Second Brain
 *
 * Manages state for the Today Tab (default view for Pro users).
 * Combines data from activity ledger and workstreams.
 */

import { create } from 'zustand';
import type {
  TodayTabData,
  RecentFile,
  SuggestedFile,
  PinnedItem,
  Workstream,
} from '@/lib/types';
import * as tauri from '@/lib/tauri';

interface TodayState {
  // Data
  data: TodayTabData | null;
  isLoading: boolean;
  error: string | null;

  // Pinned items (persisted separately)
  pinnedItems: PinnedItem[];

  // View state
  showTodayTab: boolean;
  lastBriefDate: string | null;

  // Actions
  loadTodayData: () => Promise<void>;
  refreshData: () => Promise<void>;

  // Pinning
  pinFile: (path: string, name: string) => void;
  unpinFile: (path: string) => void;
  pinWorkstream: (id: string, name: string) => void;
  unpinWorkstream: (id: string) => void;
  isPinned: (id: string) => boolean;

  // View management
  setShowTodayTab: (show: boolean) => void;
  markBriefSeen: () => void;
  shouldShowBrief: () => boolean;

  // Initialization
  initialize: () => Promise<void>;

  // Reset
  reset: () => void;
}

const PINNED_STORAGE_KEY = 'ixos_pinned_items';
const LAST_BRIEF_KEY = 'ixos_last_brief_date';

export const useTodayStore = create<TodayState>((set, get) => ({
  // Initial state
  data: null,
  isLoading: false,
  error: null,
  pinnedItems: [],
  showTodayTab: true, // Default to showing Today Tab
  lastBriefDate: null,

  // Load Today Tab data
  loadTodayData: async () => {
    set({ isLoading: true, error: null });

    try {
      // Load data in parallel
      const [recentlyTouched, workstreams] = await Promise.all([
        tauri.getRecentlyTouched(10).catch(() => [] as RecentFile[]),
        tauri.listWorkstreams(5).catch(() => [] as Workstream[]),
      ]);

      // Get most recent workstream
      const mostRecent = workstreams.length > 0
        ? workstreams.reduce((a, b) => a.lastActive > b.lastActive ? a : b)
        : null;

      // Get top files from most recent workstream
      const topFiles: RecentFile[] = mostRecent
        ? mostRecent.topFiles.slice(0, 5).map(([path, count]) => ({
            path,
            fileId: '', // Will be populated by backend
            lastTouched: mostRecent.lastActive,
            touchCount: count,
            actions: ['file_opened'],
          }))
        : [];

      // Generate suggestions based on co-occurrence
      // This is a simplified version - full implementation would query co-occurrence API
      const suggestedNext: SuggestedFile[] = [];

      // Get pinned items
      const pinnedItems = get().pinnedItems;

      const data: TodayTabData = {
        resume: {
          workstream: mostRecent,
          topFiles,
          lastActive: mostRecent?.lastActive ?? 0,
        },
        recentlyTouched,
        suggestedNext,
        pinned: pinnedItems,
      };

      set({ data, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message, isLoading: false });
    }
  },

  // Refresh data
  refreshData: async () => {
    await get().loadTodayData();
  },

  // Pin a file
  pinFile: (path, name) => {
    const pinnedItems = [...get().pinnedItems];
    const existing = pinnedItems.find((p) => p.path === path);

    if (!existing) {
      pinnedItems.push({
        id: `file:${path}`,
        type: 'file',
        path,
        name,
        pinnedAt: Date.now(),
      });
      set({ pinnedItems });
      savePinnedItems(pinnedItems);
    }
  },

  // Unpin a file
  unpinFile: (path) => {
    const pinnedItems = get().pinnedItems.filter((p) => p.path !== path);
    set({ pinnedItems });
    savePinnedItems(pinnedItems);
  },

  // Pin a workstream
  pinWorkstream: (id, name) => {
    const pinnedItems = [...get().pinnedItems];
    const wsId = `workstream:${id}`;
    const existing = pinnedItems.find((p) => p.id === wsId);

    if (!existing) {
      pinnedItems.push({
        id: wsId,
        type: 'workstream',
        name,
        pinnedAt: Date.now(),
      });
      set({ pinnedItems });
      savePinnedItems(pinnedItems);

      // Also pin in workstream store
      tauri.pinWorkstream(id, true).catch(console.error);
    }
  },

  // Unpin a workstream
  unpinWorkstream: (id) => {
    const wsId = `workstream:${id}`;
    const pinnedItems = get().pinnedItems.filter((p) => p.id !== wsId);
    set({ pinnedItems });
    savePinnedItems(pinnedItems);

    // Also unpin in workstream store
    tauri.pinWorkstream(id, false).catch(console.error);
  },

  // Check if item is pinned
  isPinned: (id) => {
    return get().pinnedItems.some((p) => p.id === id || p.path === id);
  },

  // Set Today Tab visibility
  setShowTodayTab: (show) => {
    set({ showTodayTab: show });
  },

  // Mark brief as seen today
  markBriefSeen: () => {
    const today = new Date().toDateString();
    localStorage.setItem(LAST_BRIEF_KEY, today);
    set({ lastBriefDate: today });
  },

  // Check if brief should be shown
  shouldShowBrief: () => {
    const lastBriefDate = localStorage.getItem(LAST_BRIEF_KEY);
    const today = new Date().toDateString();
    return lastBriefDate !== today;
  },

  // Initialize store
  initialize: async () => {
    // Load pinned items from storage
    const pinnedItems = loadPinnedItems();
    set({ pinnedItems });

    // Load last brief date
    const lastBriefDate = localStorage.getItem(LAST_BRIEF_KEY);
    set({ lastBriefDate });

    // Load Today Tab data
    await get().loadTodayData();
  },

  // Reset store
  reset: () => {
    set({
      data: null,
      isLoading: false,
      error: null,
      pinnedItems: [],
      showTodayTab: true,
      lastBriefDate: null,
    });
  },
}));

// Helper: Save pinned items to localStorage
function savePinnedItems(items: PinnedItem[]): void {
  try {
    localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Failed to save pinned items:', error);
  }
}

// Helper: Load pinned items from localStorage
function loadPinnedItems(): PinnedItem[] {
  try {
    const stored = localStorage.getItem(PINNED_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load pinned items:', error);
  }
  return [];
}
