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
  isLoading: boolean;
  fetchSuggestions: (prefix: string) => Promise<void>;
  addToHistory: (query: string, directory: string, resultCount: number) => Promise<void>;
  clearSuggestions: () => void;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  suggestions: [],
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

  addToHistory: async (query: string, directory: string, resultCount: number) => {
    try {
      await invoke('add_to_history', { query, directory, resultCount });
    } catch (error) {
      console.error('Failed to add to history:', error);
    }
  },

  clearSuggestions: () => set({ suggestions: [] }),
}));
