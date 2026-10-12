import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearch } from '@/hooks/useSearch';
import { SearchInput } from './SearchInput';
import { SearchResults } from './SearchResults';
import { SearchDeck } from './SearchDeck';
import { KeyboardHints } from './KeyboardHints';
import type { SearchMode } from './ModeSwitcher';
import { SearchCorridor } from '@/components/visualization/SearchCorridor';
import { useSearchBarLayout } from '@/hooks/useLayoutSync';
import * as tauri from '@/lib/tauri';

export function SearchOverlay() {
  const search = useSearch();
  const searchBarRef = useSearchBarLayout();
  const mode: SearchMode = search.deepSearchMode ? 'journalist' : search.cacheMode;

  const handleModeChange = (newMode: SearchMode) => {
    if (newMode === 'journalist') {
      search.setDeepSearchMode(true);
    } else {
      search.setDeepSearchMode(false);
      search.setCacheMode(newMode);
    }
  };

  // Click outside to close
  const handleBackdropClick = async (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      search.reset();
      await tauri.hideOverlay();
    }
  };

  // Focus input on mount
  useEffect(() => {
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    if (input) {
      input.focus();
    }
  }, []);

  return (
    <div
      className="fixed inset-0 flex items-start justify-center pt-[10vh] bg-black/70 backdrop-blur-overlay"
      onClick={handleBackdropClick}
    >
      <SearchCorridor />
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-3xl bg-graphite-1/95 rounded-2xl shadow-lift border border-stroke-hairline overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div ref={searchBarRef} className="w-full">
          <SearchInput
            value={search.query}
            onChange={search.setQuery}
            directory={search.directory}
            onDirectoryChange={search.setDirectory}
            isSearching={search.phase === 'lexical' || search.phase === 'semantic' || search.phase === 'refining'}
            onCancel={search.cancelSearch}
            mode={mode}
            onModeChange={handleModeChange}
          />
        </div>

        {(search.query.trim().length >= 2 || search.phase !== 'idle') && (
          <div className="px-3">
            <SearchDeck />
          </div>
        )}

        <div className="max-h-[420px] overflow-y-auto scrollbar-hide">
          <AnimatePresence mode="popLayout">
            {search.errorMessage ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-8 text-center"
              >
                <p className="text-danger">{search.errorMessage}</p>
              </motion.div>
            ) : search.hasResults ? (
              <SearchResults
                results={search.currentResults}
                selectedIndex={search.selectedIndex}
                onSelect={search.setSelectedIndex}
                onOpen={search.openSelected}
                onReveal={search.revealSelected}
                phase={search.phase}
              />
            ) : search.query.length > 0 && search.phase === 'complete' ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-8 text-center"
              >
                <p className="text-fg-muted">No results found</p>
                <p className="text-fg-dim text-sm mt-1">Try a different search term</p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <KeyboardHints />
      </motion.div>
    </div>
  );
}
