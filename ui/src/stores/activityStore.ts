/**
 * Activity Store - Phase 2 Second Brain
 *
 * Manages activity tracking state for the Today Tab and Related Files features.
 */

import { create } from 'zustand';
import type {
  ActivityAction,
  ActivityEvent,
  ActivityStats,
  CoOccurrence,
  RecentFile,
  TimeRange,
} from '@/lib/types';
import * as tauri from '@/lib/tauri';

interface ActivityState {
  // State
  recentActivity: ActivityEvent[];
  recentlyTouched: RecentFile[];
  stats: ActivityStats | null;
  isLoading: boolean;
  error: string | null;

  // Co-occurrence cache
  coOccurrenceCache: Map<string, CoOccurrence[]>;

  // Actions
  logActivity: (filePath: string, actionType: ActivityAction, query?: string) => Promise<void>;
  loadRecentActivity: (limit?: number) => Promise<void>;
  loadRecentlyTouched: (limit?: number) => Promise<void>;
  getCoOccurrence: (filePath: string, windowMins?: number) => Promise<CoOccurrence[]>;
  clearActivity: (timeRange?: TimeRange) => Promise<void>;
  loadStats: () => Promise<void>;

  // Pro persistence
  saveToStorage: () => Promise<void>;
  loadFromStorage: () => Promise<void>;

  // Convenience methods for common actions
  logSearchQuery: (query: string) => Promise<void>;
  logFileOpened: (filePath: string, query?: string) => Promise<void>;
  logFileRevealed: (filePath: string, query?: string) => Promise<void>;
  logResultClicked: (filePath: string, query: string) => Promise<void>;

  // Reset
  reset: () => void;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  // Initial state
  recentActivity: [],
  recentlyTouched: [],
  stats: null,
  isLoading: false,
  error: null,
  coOccurrenceCache: new Map(),

  // Log an activity event
  logActivity: async (filePath, actionType, query) => {
    try {
      await tauri.logActivity(filePath, actionType, query);

      // Optimistically update recent activity (in production, we'd refresh from backend)
      // For now, just invalidate the cache
      get().coOccurrenceCache.clear();
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Don't set error state - activity logging failures are silent
    }
  },

  // Load recent activity events
  loadRecentActivity: async (limit = 50) => {
    set({ isLoading: true, error: null });
    try {
      const activity = await tauri.getActivity(undefined, undefined, limit);
      set({ recentActivity: activity, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message, isLoading: false });
    }
  },

  // Load recently touched files
  loadRecentlyTouched: async (limit = 20) => {
    set({ isLoading: true, error: null });
    try {
      const touched = await tauri.getRecentlyTouched(limit);
      set({ recentlyTouched: touched, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message, isLoading: false });
    }
  },

  // Get co-occurrence data with caching
  getCoOccurrence: async (filePath, windowMins = 30) => {
    const cacheKey = `${filePath}:${windowMins}`;
    const cache = get().coOccurrenceCache;

    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)!;
    }

    try {
      const coOccurrences = await tauri.getCoOccurrence(filePath, windowMins);
      cache.set(cacheKey, coOccurrences);
      set({ coOccurrenceCache: new Map(cache) });
      return coOccurrences;
    } catch (error) {
      console.error('Failed to get co-occurrence:', error);
      return [];
    }
  },

  // Clear activity data
  clearActivity: async (timeRange) => {
    set({ isLoading: true, error: null });
    try {
      await tauri.clearActivity(timeRange);
      set({
        recentActivity: [],
        recentlyTouched: [],
        coOccurrenceCache: new Map(),
        isLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message, isLoading: false });
    }
  },

  // Load statistics
  loadStats: async () => {
    try {
      const stats = await tauri.getActivityStats();
      set({ stats });
    } catch (error) {
      console.error('Failed to load activity stats:', error);
    }
  },

  // Save to encrypted storage (Pro)
  saveToStorage: async () => {
    try {
      await tauri.saveActivityLedger();
    } catch (error) {
      console.error('Failed to save activity ledger:', error);
      throw error;
    }
  },

  // Load from encrypted storage (Pro)
  loadFromStorage: async () => {
    try {
      const stats = await tauri.loadActivityLedger();
      set({ stats });
    } catch (error) {
      // Expected for free users
      console.debug('Activity ledger not available:', error);
    }
  },

  // Convenience: Log search query
  logSearchQuery: async (query) => {
    // For search queries, we use an empty file path and store the query
    await get().logActivity('', 'search_query', query);
  },

  // Convenience: Log file opened
  logFileOpened: async (filePath, query) => {
    await get().logActivity(filePath, 'file_opened', query);
  },

  // Convenience: Log file revealed
  logFileRevealed: async (filePath, query) => {
    await get().logActivity(filePath, 'file_revealed', query);
  },

  // Convenience: Log result clicked
  logResultClicked: async (filePath, query) => {
    await get().logActivity(filePath, 'result_clicked', query);
  },

  // Reset store
  reset: () => {
    set({
      recentActivity: [],
      recentlyTouched: [],
      stats: null,
      isLoading: false,
      error: null,
      coOccurrenceCache: new Map(),
    });
  },
}));
