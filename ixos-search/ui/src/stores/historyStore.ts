import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export interface HistorySuggestion {
  query: string;
  directory: string;
  result_count: number;
  timestamp: number;
}

interface HistoryState {
  suggestions: HistorySuggestion[];
  recentSearches: HistorySuggestion[];
  isLoading: boolean;
  fetchSuggestions: (prefix: string) => Promise<void>;
  fetchAllHistory: () => Promise<void>;
  addToHistory: (query: string, directory: string, resultCount: number) => Promise<void>;
  deleteFromHistory: (query: string) => Promise<void>;
  clearSuggestions: () => void;
  clearAllHistory: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  suggestions: [],
  recentSearches: [],
  isLoading: false,

  fetchSuggestions: async (prefix: string) => {
    if (prefix.length < 1) {
      set({ suggestions: [] });
      return;
    }

    set({ isLoading: true });
    try {
      const suggestions = await invoke<HistorySuggestion[]>('get_search_suggestions', {
        prefix,
        limit: 5,
      });
      set({ suggestions, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      set({ suggestions: [], isLoading: false });
    }
  },

  fetchAllHistory: async () => {
    set({ isLoading: true });
    try {
      const entries = await invoke<HistorySuggestion[]>('get_all_history');
      // Sort by timestamp descending (most recent first)
      const sorted = entries.sort((a, b) => b.timestamp - a.timestamp);
      set({ recentSearches: sorted.slice(0, 20), isLoading: false });
    } catch (error) {
      console.error('Failed to fetch history:', error);
      set({ recentSearches: [], isLoading: false });
    }
  },

  addToHistory: async (query: string, directory: string, resultCount: number) => {
    try {
      await invoke('add_to_history', { query, directory, resultCount });
    } catch (error) {
      console.error('Failed to add to history:', error);
    }
  },

  deleteFromHistory: async (query: string) => {
    try {
      // Optimistic update
      set(state => ({
        recentSearches: state.recentSearches.filter(item => item.query !== query)
      }));
      await invoke('delete_history_item', { query });
    } catch (error) {
      console.error('Failed to delete history item:', error);
      // Re-fetch on error to ensure consistency
      get().fetchAllHistory();
    }
  },

  clearSuggestions: () => set({ suggestions: [] }),

  clearAllHistory: async () => {
    try {
      await invoke('clear_history');
      set({ recentSearches: [], suggestions: [] });
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  },
}));
