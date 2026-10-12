/**
 * Today Store - Phase 2 Second Brain
 *
 * Manages state for the Today Tab.
 * Combines data from activity ledger and workstreams.
 */

import { create } from 'zustand';
import type {
  TodayTabData,
  RecentFile,
  SuggestedFile,
  ResumeCandidate,
  MoveRecommendation,
  PinnedItem,
  Workstream,
} from '@/lib/types';
import * as tauri from '@/lib/tauri';

interface TodayState {
  // Data
  data: TodayTabData | null;
  resumeCandidates: ResumeCandidate[];
  isLoading: boolean;
  error: string | null;
  retryCount: number;

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
  resumeCandidates: [],
  isLoading: false,
  error: null,
  retryCount: 0,
  pinnedItems: [],
  showTodayTab: true, // Default to showing Today Tab
  lastBriefDate: null,

  // Load Today Tab data
  loadTodayData: async () => {
    set({ isLoading: true, error: null });

    try {
      const [resumption, workstreams, moveRecommendations] = await Promise.all([
        tauri.getResumptionData(10, 5).catch(() => ({
          recentlyTouched: [] as RecentFile[],
          resumeCandidates: [] as ResumeCandidate[],
          suggestedNext: [] as SuggestedFile[],
        })),
        tauri.listWorkstreams(5).catch(() => [] as Workstream[]),
        tauri.getMoveRecommendations(6, 3).catch(() => [] as MoveRecommendation[]),
      ]);

      const mostRelevantWorkstream = findMostRelevantWorkstream(workstreams, resumption.resumeCandidates);
      const topFiles: RecentFile[] = resumption.resumeCandidates.slice(0, 5).map((candidate) => ({
        path: candidate.path,
        fileId: candidate.fileId,
        lastTouched: candidate.lastTouched,
        touchCount: candidate.touchCount,
        actions: candidate.actions,
      }));

      // Get pinned items
      const pinnedItems = get().pinnedItems;

      const data: TodayTabData = {
        resume: {
          workstream: mostRelevantWorkstream,
          topFiles,
          lastActive: mostRelevantWorkstream?.lastActive ?? topFiles[0]?.lastTouched ?? 0,
        },
        recentlyTouched: resumption.recentlyTouched,
        suggestedNext: resumption.suggestedNext,
        moveRecommendations,
        pinned: pinnedItems,
      };

      set({ data, resumeCandidates: resumption.resumeCandidates, isLoading: false, retryCount: 0 });
    } catch (error) {
      const currentRetry = get().retryCount;
      if (currentRetry < 2) {
        // Auto-retry after 1.5s on first failures
        set({ retryCount: currentRetry + 1 });
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return get().loadTodayData();
      }
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
      resumeCandidates: [],
      isLoading: false,
      error: null,
      retryCount: 0,
      pinnedItems: [],
      showTodayTab: true,
      lastBriefDate: null,
    });
  },
}));

function findMostRelevantWorkstream(
  workstreams: Workstream[],
  resumeCandidates: ResumeCandidate[],
): Workstream | null {
  if (workstreams.length === 0) {
    return null;
  }

  const resumePaths = new Set(resumeCandidates.slice(0, 5).map((candidate) => candidate.path));
  const matching = workstreams.find((workstream) =>
    workstream.topFiles.some(([path]) => resumePaths.has(path)),
  );

  if (matching) {
    return matching;
  }

  return workstreams.reduce((latest, current) =>
    current.lastActive > latest.lastActive ? current : latest,
  );
}

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
