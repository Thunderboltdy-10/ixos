import { useCallback, useEffect } from 'react';
import { useSearchStore } from '@/stores/searchStore';
import { useSearchEvents } from './useTauriEvent';
import { useSearchKeyboard } from './useKeyboard';
import * as tauri from '@/lib/tauri';
import { debounce } from '@/lib/utils';

const LAST_FOLDER_KEY = 'ixos_last_folder';

/**
 * Main hook for search functionality
 * Combines store state with event handling and keyboard navigation
 */
export function useSearch() {
  // Setup event listener
  useSearchEvents();

  // Setup keyboard navigation
  useSearchKeyboard();

  // Get store state and actions
  const store = useSearchStore();

  // Initialize directory on mount - check localStorage first
  useEffect(() => {
    async function initDirectory() {
      if (!store.directory) {
        // Try to load from localStorage first
        const savedFolder = localStorage.getItem(LAST_FOLDER_KEY);
        if (savedFolder) {
          store.setDirectory(savedFolder);
        } else {
          // Fall back to default
          const defaultDir = await tauri.getDefaultSearchDirectory();
          store.setDirectory(defaultDir);
        }
      }
    }
    initDirectory();
  }, [store.directory, store.setDirectory]);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(() => {
      store.startSearch();
    }, 300),
    [store.startSearch]
  );

  // Handle query change with debounced search
  const handleQueryChange = useCallback(
    (query: string) => {
      store.setQuery(query);
      const trimmed = query.trim();

      if (trimmed.length >= 2) {
        debouncedSearch();
        return;
      }

      if (store.phase === 'lexical' || store.phase === 'semantic') {
        store.cancelSearch();
      }

      if (trimmed.length === 0) {
        store.reset();
      } else {
        store.clearResults();
      }
    },
    [store.setQuery, debouncedSearch, store.reset, store.cancelSearch, store.clearResults, store.phase]
  );

  // Handle directory change with persistence
  const handleDirectoryChange = useCallback(
    (directory: string) => {
      store.setDirectory(directory);
      localStorage.setItem(LAST_FOLDER_KEY, directory);
    },
    [store.setDirectory]
  );

  return {
    // State
    query: store.query,
    directory: store.directory,
    phase: store.phase,
    statusMessage: store.statusMessage,
    errorMessage: store.errorMessage,
    selectedIndex: store.selectedIndex,
    journalistMode: store.journalistMode,
    streamStage: store.streamStage,
    streamStats: store.streamStats,
    searchStartTime: store.searchStartTime,

    // Results
    lexicalResults: store.lexicalResults,
    semanticResults: store.semanticResults,
    currentResults: store.semanticResults.length > 0 ? store.semanticResults : store.lexicalResults,
    hasResults: store.semanticResults.length > 0 || store.lexicalResults.length > 0,

    // Actions
    setQuery: handleQueryChange,
    setDirectory: handleDirectoryChange,
    setJournalistMode: store.setJournalistMode,
    startSearch: store.startSearch,
    cancelSearch: store.cancelSearch,
    reset: store.reset,

    // Selection
    getSelectedResult: store.getSelectedResult,
    setSelectedIndex: store.setSelectedIndex,
    openSelected: store.openSelected,
    revealSelected: store.revealSelected,
  };
}
